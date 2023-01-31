'use strict';

import * as path from 'path';
import * as tl from 'azure-pipelines-task-lib/task';
import * as config from './Configuration';
import * as ct from './ConfigurationTemplates';
import { cloneDeep } from '@patomation/clone-deep';

/**
 * This will allow generating the needed configuration files based on the json source files for Nginx running modsec.
 */
export class ConfigurationFileGenerator {
    constructor(loader: config.ConfigurationLoader) {
        this.loader = loader;

        if (loader.config && loader.config.nginxConfigDirectory && loader.config.modsecConfigDirectory) {
            this.templateEngine = new ct.ConfigurationTemplateEngine(loader.config.nginxConfigDirectory, loader.config.modsecConfigDirectory);
        } else {
            throw new Error('Failed to create Template Engine');
        }
    }

    private loader: config.ConfigurationLoader;
    private templateEngine: ct.ConfigurationTemplateEngine;
    private currentWaf?: config.IFileWafConfiguration;

    /** Execute the generate to create the needed configuration files */
    public exec(): void {
        if (this.loader.config) {
            console.log(`Generating configuration for '${this.loader.config.wafId}'...`);

            // Make sure we have loaded the configuration
            if (!this.loader.isLoaded) {
                this.loader.load();
            }

            // Get the WAF configuration for the current WAF ID we are processing
            if (!this.loader.wafs) {
                throw new Error('No WAF configurations loaded!');
            } else {
                const wafId = this.loader.config.wafId ? this.loader.config.wafId : 'unknown';
                this.currentWaf = this.loader.wafs.get(wafId);

                if (!this.currentWaf) {
                    throw new Error(`Failed to find configuration for wafId: '${wafId}'`);
                }
            }

            // Process each application to create the needed configuration
            if (this.loader.applications) {
                const total = this.loader.applications.length;
                let current = 0;
                console.log(`Found ${total} application(s)`);

                for (const app of this.loader.applications) {
                    const isDisabled = app.disabled !== undefined ? app.disabled : false;
                    console.log(`${current + 1} of ${total}: ${app.name} templates: nginx(${app.nginxTemplate}), modsec(${app.modsecTemplate})${isDisabled ? ' (Disabled)' : ''}`);
                    if (!isDisabled) {
                        this._generateApplicationFiles(app);
                    }
                    current++;
                }
            }
        } else {
            tl.error('The loaders configuration is null');
        }
    }

    /**
     * Generate the needed configuration files for the specified application
     * @param app The application configuration
     */
    private _generateApplicationFiles(app: config.IFileApplicationConfiguration): void {
        let vipConfig = this._getWafVipConfiguration(app);
        if (vipConfig) {
            vipConfig = this._rollDownConfiguration(app, vipConfig);
        }
        
        app = this._inheritSslConfiguration(app);
        this._generateNginxConfiguration(app, vipConfig);
        this._generateModsecConfiguration(app, vipConfig);
    }

    /**
     * Inherit the SSL Configuration from the WAF if the application does not override
     * @param app The application configuration
     */
    private _inheritSslConfiguration(app: config.IFileApplicationConfiguration): config.IFileApplicationConfiguration {
        const toReturn = cloneDeep(app);

        if (this.currentWaf) {
            if (!this.currentWaf.ssl_config) {
                throw new Error('The WAF configuration does not contain ssl configuration');
            }

            // Just use the whole configuration if the application does not override
            if (!app.ssl_config) {
                toReturn.ssl_config = this.currentWaf.ssl_config;
            }

            // Inherit any config from the waf config if we do not override
            if (toReturn.ssl_config) {
                for (const prop in this.currentWaf.ssl_config) {
                    if (!toReturn.ssl_config[prop]) {
                        toReturn.ssl_config[prop] = this.currentWaf.ssl_config[prop];
                    }
                }
            }
        }

        return toReturn;
    }

    /**
     * Apply the VIP SSL Configuration to the application
     * @param app The application configuration
     * @param vip The vip configuration
     * 
     */
     private _applySslConfiguration(app: config.IFileApplicationConfiguration, vip: config.IFileVipConfiguration): config.IFileApplicationConfiguration {
        const toReturn = cloneDeep(app);

        if (toReturn.ssl_config && vip.ssl_config) {
            // Override the app ssl configuration from the vip
            // tslint:disable-next-line: forin
            for (const prop in vip.ssl_config) {
                toReturn.ssl_config[prop] = vip.ssl_config[prop];
            }
        }

        return toReturn;
    }

    /**
     * Apply the application level configuration to the vip configuration sections if needed.
     * @param app The application configuration
     * @param vipConfig The vip configuration section containing all the listeners
     */
    private _rollDownConfiguration(app: config.IFileApplicationConfiguration, vipConfig: config.IFileWafVipConfiguration): config.IFileWafVipConfiguration {
        const toReturn = cloneDeep(vipConfig);

        // roll down the app ip rules to the vips config if needed
        if (!toReturn.ipRules && app.ipRules) {
            toReturn.ipRules = app.ipRules;
        } else if (toReturn.ipRules && app.ipRules) {
            if (!toReturn.ipRules.allow && app.ipRules.allow) {
                toReturn.ipRules.allow = app.ipRules.allow;
            }
            if (!toReturn.ipRules.deny && app.ipRules.deny) {
                toReturn.ipRules.deny = app.ipRules.deny;
            }
        }

        // Roll down headers
        if (!toReturn.response_headers && app.response_headers) {
            toReturn.response_headers = cloneDeep(app.response_headers);
        } else if (toReturn.response_headers && app.response_headers) {
            // Both have been defined so add any missing ones
            for (const header of app.response_headers) {
                const match = toReturn.response_headers.find(x => x.name === header.name && x.value === header.value);
                if (!match) {
                    toReturn.response_headers.push(cloneDeep(header));
                }
            }
        }

        // Roll down from the vip configs to each vip
        if (toReturn.vips) {
            for (const vip of toReturn.vips) {
                if (!vip.ipRules && toReturn.ipRules) {
                    vip.ipRules = toReturn.ipRules;
                } else if (vip.ipRules && toReturn.ipRules ) {
                    if (!vip.ipRules.allow && toReturn.ipRules.allow) {
                        vip.ipRules.allow = toReturn.ipRules.allow;
                    }
                    if (!vip.ipRules.deny && toReturn.ipRules.deny) {
                        vip.ipRules.deny = toReturn.ipRules.deny;
                    }
                }

                // Roll down headers
                if (!vip.response_headers && toReturn.response_headers) {
                    vip.response_headers = cloneDeep(toReturn.response_headers);
                } else if (vip.response_headers && toReturn.response_headers) {
                    // Both have been defined so add any missing ones
                    for (const header of toReturn.response_headers) {
                        // Find all matching headers with same name
                        const match = vip.response_headers.find(x => x.name === header.name && x.value === header.value);
                        if (!match) {
                            vip.response_headers.push(cloneDeep(header));
                        }
                    }
                }
            }
        }

        return toReturn;
    }

    /**
     * Generate the NGINX config file for the application
     * @param app The application configuration
     * @param vipConfig The vip configuration for the application
     */
    private _generateNginxConfiguration(app: config.IFileApplicationConfiguration, vipConfig?: config.IFileWafVipConfiguration): void {
        // Build a configuration file for each frontend hostname
        if (vipConfig && vipConfig.vips) {
            for (const vip of vipConfig.vips) {
                let currentApp = cloneDeep(app);
                currentApp = this._applySslConfiguration(app, vip);

                
                const data = <ct.INginxTemplateData>{
                    vip: vip,
                    ipRules: vip.ipRules,
                    sslConfig: currentApp.ssl_config,
                    listener: currentApp.listener
                };

                const configFile = this._getNginxConfigFilePath(vip);
                let nginxTemplate: string | undefined;
                let cacheZone: string | undefined;
                if (typeof(currentApp.nginxTemplate) === 'string') {
                    nginxTemplate = <string>currentApp.nginxTemplate;
                } else if (Array.isArray(currentApp.nginxTemplate)) {
                    nginxTemplate = this._getScopedValue(<config.IFileScopedValue[]>currentApp.nginxTemplate, vip, 'app.nginxTemplate');
                }
                if (currentApp.listener && typeof(currentApp.listener.cacheZone) === 'string') {
                    cacheZone = <string>currentApp.listener.cacheZone;
                } else if (currentApp.listener && Array.isArray(currentApp.listener.cacheZone)) {
                    cacheZone = this._getScopedValue(<config.IFileScopedValue[]>currentApp.listener.cacheZone, vip, 'app.listener.cacheZone');
                }
                if (currentApp.listener) {
                    currentApp.listener.cacheZone = cacheZone;
                }

                console.log(`--Selected Nginx Template: ${nginxTemplate}`);
                console.log(`creating ${configFile}`);
                this.templateEngine.createConfigurationFromTemplate(ct.ConfigurationTemplateType.NginxProxy, configFile, data, nginxTemplate);
                
            }
        }
        
    }

    /**
     * Generate the modsec config file for the application
     * @param app The application configuration
     * @param vipConfig The vip configuration for the application
     */
     private _generateModsecConfiguration(app: config.IFileApplicationConfiguration, vipConfig?: config.IFileWafVipConfiguration): void {

        // Build a configuration file for each frontend hostname
        if (vipConfig && vipConfig.vips) {
            for (const vip of vipConfig.vips) {
                const currentApp = cloneDeep(app);
                //tl.debug(`path Config: ${vip.paths}`);
                //tl.debug(`${vip.redirects}`)

                // Only allow rules scoped to the current WAF
                if (currentApp.wafConfig) {
                    this._removeRulesNotScopedToWaf(currentApp.wafConfig);
                }

                // We will take the pivotRulesBy and convert them to custom rules
                if (currentApp.wafConfig && currentApp.wafConfig.pivotRulesBy) {
                    const maxCustomRuleId = this._getMaxCustomRuleId(currentApp.wafConfig);
                    tl.debug(`-- existing max custom rule Id = ${maxCustomRuleId} --`);
                    const rules = this._generateCustomRules(currentApp.wafConfig.pivotRulesBy, (maxCustomRuleId + 1));

                    // Add the generated rules to the custom rules array for the template
                    if (currentApp.wafConfig.customRules) {
                        for (const r of rules) {
                            currentApp.wafConfig.customRules.push(r);
                        }
                    } else {
                        currentApp.wafConfig.customRules = rules;
                    }
                }

                // Clone the WAF config so we can change the mode if it has a scoped value
                const wafConfig = cloneDeep(currentApp.wafConfig);
                let wafMode: string | undefined;
                if (wafConfig && wafConfig.mode && typeof(wafConfig.mode) === 'string') {
                    wafMode = wafConfig.mode;
                } else if (wafConfig && wafConfig.mode && Array.isArray(wafConfig.mode)) {
                    wafMode = this._getScopedValue(<config.IFileScopedValue[]>wafConfig.mode, vip, 'app.wafConfig.modeApp.wafConfig');
                }
                if (wafConfig) {
                    wafConfig.mode = wafMode;
                }

                const configFile = this._getModSecConfigFilePath(vip);
                console.log(`--Selected WAF Mode: ${wafMode}, Template: ${app.modsecTemplate}`);
                console.log(`creating ${configFile}`);
                this.templateEngine.createConfigurationFromTemplate(ct.ConfigurationTemplateType.ModsecConfig, configFile, wafConfig, app.modsecTemplate);
            }
        }
    }

    /**
     * Get the value of the specified scoped value
     * @param scoped The scoped value to resolved what value applies
     * @param vip The vip that is being processed
     * @returns 
     */
    private _getScopedValue(scoped: config.IFileScopedValue[], vip: config.IFileVipConfiguration, propertyName: string) : string {

        if (this.currentWaf) {
            tl.debug(`Find Scoped Value of '${propertyName}' for wafID=${this.currentWaf.id} vip=${vip.frontend}`);
        }
        const defaultValue = scoped.find(x => !x.wafId && !x.vipFrontend);

        // Find the scope override value ie if the waf and frontend match or one or the other.  We do not rely on sorting as
        // Node.js change which argument was left vs right at some point so sorting breaks on the agent which uses and older version
        // of node.  We do  this which will not matter for sorting and node versions
        let scopeOverride: config.IFileScopedValue | undefined  = undefined;
        for (let i = 0; i < scoped.length; i++) {
            const current = scoped[i];
            
            // Consider the current value if it has a WafId or vipFontend and is not the default value
            if (current !== defaultValue && (current.wafId || current.vipFrontend)) {
                
                // For the scoped value if it has both wafId and vipFrontend and they match use it
                // otherwise we will consider wafid match with no vipFrontend
                // We take a vip frontend match over just wafid match
                if ((current.wafId && current.vipFrontend) && this.currentWaf && current.wafId === this.currentWaf.id
                    && current.vipFrontend === vip.frontend) {
                    scopeOverride = current;
                } else if ((current.wafId && !current.vipFrontend) && this.currentWaf && current.wafId === this.currentWaf.id) {
                    scopeOverride = current;
                } else if ((!current.wafId && current.vipFrontend) && current.vipFrontend === vip.frontend) {
                    scopeOverride = current;
                }
            }
        }
        
        let toReturn = ''; // something is wrong with the scoped value if this is returned.
        
        if (scopeOverride) {
            tl.debug(`Found override: ${JSON.stringify(scopeOverride)}`);
            toReturn = <string>scopeOverride.value;
        } else if (defaultValue) {
            tl.debug(`No override, default: ${JSON.stringify(defaultValue)}`);
            toReturn = <string>defaultValue.value;
        }

        tl.debug(`Using Scoped Value: ${toReturn}`);
        
        return toReturn;
    }

    /**
     * Gets the maximum id that has been defined in the custom rules.
     * @param wafConfig The WAF configuration for the Application
     */
    private _getMaxCustomRuleId(wafConfig: config.IFileWafApplicationConfiguration): number {
        let maxID = 0;  // We will start at zero when there are no custom rules defined
        const idRegEx = new RegExp('id:(\\d+)', 'gi');
        
        // Examine the custom rules to find the maximum rule id
        if (wafConfig.customRules) {
            // We start with the length of the custom rules, but we still examine in-case they are different
            maxID = wafConfig.customRules.length;
            
            for (const r of wafConfig.customRules) {
                if (r.settings) {
                    const match = idRegEx.exec(r.settings);
                    if (match) {
                        const ruleId = parseInt(match[1]);
                        if (ruleId > maxID) {
                            maxID = ruleId;
                        }
                    }
                }
            }
        }

        return maxID;
    }

    /**
     * Generate custom WAF rules based on the pivotRulesBy configuration
     * @param pivotRulesBy The pivotRulesBy that will be used to generate the custom WAF rules
     * @param startRuleId The first id that should be used for the custom rules
     */
    private _generateCustomRules(pivotRulesBy: config.IFileWafPivotRuleByConfiguration[], startRuleId: number): config.IFileApplicationCustomWafRules[] {
        const toReturn = new Array<config.IFileApplicationCustomWafRules>();
        let ruleId = startRuleId;

        tl.debug(`--- START: Generate Custom rules from pivotRulesBy, startRuleId = ${startRuleId} ---`);

        // loop over each configuration to build the rules
        for (const plan of pivotRulesBy) {

            // We cannot build the rules if we do not have the inspect, phase, and rules
            if (plan.inspect && plan.phase && plan.rules) {
                tl.debug(`inspect: ${plan.inspect}, phase: ${plan.phase}`);

                for (const r of plan.rules) {
                    if (r.match) {
                        if (Array.isArray(r.match)) {
                            for (const match of r.match) {
                                tl.debug(`match: ${match}, mode: ${r.mode}, lowercase: ${r.lowercase}, disabledById: ${r.disabledById}`);

                                if (r.disabledById) {
                                    for (const disableRuleId of r.disabledById) {
                                        tl.debug(`disable ruleId: ${disableRuleId}`);

                                        const rule = this._createCustomRule(plan.inspect, match, plan.phase, ruleId, r, disableRuleId);
                                        toReturn.push(rule);
                                        ruleId++;
                                    }
                                } else {
                                    const rule = this._createCustomRule(plan.inspect, match, plan.phase, ruleId, r);
                                    toReturn.push(rule);
                                    ruleId++;
                                }
                            }
                        } else {
                            tl.debug(`match: ${r.match}, mode: ${r.mode}, lowercase: ${r.lowercase}, disabledById: ${r.disabledById}`);

                            if (r.disabledById) {
                                for (const disableRuleId of r.disabledById) {
                                    tl.debug(`disable ruleId: ${disableRuleId}`);

                                    const rule = this._createCustomRule(plan.inspect, r.match, plan.phase, ruleId, r, disableRuleId);
                                    toReturn.push(rule);
                                    ruleId++;
                                }
                            } else {
                                const rule = this._createCustomRule(plan.inspect, r.match, plan.phase, ruleId, r);
                                toReturn.push(rule);
                                ruleId++;
                            }
                        }
                    }
                }
            }
        }

        tl.debug('--- END: Generate Custom rules from pivotRulesBy ---');

        return toReturn;
    }

    /**
     * Create a new custom rule based on the supplied information for the rule.
     * @param inspect What the rule should inspect.
     * @param match What the rule should match.
     * @param phase The phase number for the rule.
     * @param ruleId The id of the rule.
     * @param ruleDef The rule definition for lowercase and mode of the rule.
     * @param disableRuleId Optional ruleId that should be disabled as a result of this rule.
     * @returns 
     */
    private _createCustomRule(inspect: string, match: string, phase: number, ruleId: number, ruleDef: config.IFileWafPivotRuleByDefinition, disableRuleId?: number): config.IFileApplicationCustomWafRules {
        let settings = `phase:${phase},nolog,pass,id:${ruleId}`;

        if (ruleDef.lowercase) {
            settings += ',t:lowercase';
        }
        if (ruleDef.mode) {
            settings += `,ctl:ruleEngine=${ruleDef.mode}`;
        }
        if (disableRuleId) {
            settings += `,ctl:ruleRemoveById=${disableRuleId}`;
        }

        return <config.IFileApplicationCustomWafRules>{
            inspect: inspect,
            match: match,
            settings: settings
        };
    }

    /**
     * Get the current WAF VIP configuration for the current WAF from the application configuration
     * @param app The application configuration
     */
    private _getWafVipConfiguration(app: config.IFileApplicationConfiguration): config.IFileWafVipConfiguration | undefined {
        if (!app.vipConfigs) {
            throw new Error('No WAF VIP configurations found');
        }

        const vipConfig = app.vipConfigs.find(x => this.currentWaf !== undefined && x.wafId === this.currentWaf.id);

        if (!vipConfig) {
            tl.warning(`Could not find WAF VIP configuration for '${this.currentWaf ? this.currentWaf.id : 'unknown'}'`);
        }

        return vipConfig;
    }

    /**
     * Gets the path to the NGINX file that should be generated
     * @param vipConfig The VIP Configuration to use for naming the file
     */
     private _getNginxConfigFilePath(vipConfig: config.IFileVipConfiguration): string {
        if (this.loader.config && this.loader.config.nginxConfigDirectory) {
            return path.join(this.loader.config.nginxConfigDirectory, `${vipConfig.frontend}.conf`);
        }
        // We should not get here
        return `${vipConfig.frontend}.conf`;
    }

    /**
     * Gets the path to the ModSec Config file that should be generated
     * @param vipConfig The VIP Configuration to use for naming the file
     */
     private _getModSecConfigFilePath(vipConfig: config.IFileVipConfiguration): string {
        if (this.loader.config && this.loader.config.modsecConfigDirectory) {
            return path.join(this.loader.config.modsecConfigDirectory, `${vipConfig.frontend}.conf`);
        }
        // We should not get here
        return `${vipConfig.frontend}.conf`;
    }

    /**
     * Remove any rules from the config that are not scoped to current WAF
     * @param wafConfig The application WAF Configuration
     */
    private _removeRulesNotScopedToWaf(wafConfig: config.IFileWafApplicationConfiguration): void {
        if (wafConfig.customRules) {
            const filteredCustomRules = new Array<config.IFileApplicationCustomWafRules>();

            for (const rule of wafConfig.customRules) {
                if (rule.wafId && this.currentWaf && this.currentWaf.id) {
                    tl.debug(`-- ${rule.settings}, Scoped to ${rule.wafId} --`);

                    if (Array.isArray(rule.wafId)) {
                        if (rule.wafId.includes(this.currentWaf.id)) {
                            tl.debug(`keeping scoped rule: ${rule.settings}`);
                            filteredCustomRules.push(rule);
                        }
                    } else {
                        if (rule.wafId === this.currentWaf.id) {
                            tl.debug(`keeping scoped rule: ${rule.settings}`);
                            filteredCustomRules.push(rule);
                        }
                    }
                } else {
                    filteredCustomRules.push(rule);
                }
            }

            // Replace with the filtered rules
            wafConfig.customRules = filteredCustomRules;
        }

        if (wafConfig.pivotRulesBy) {
            const filteredPivotByRules = new Array<config.IFileWafPivotRuleByConfiguration>();

            for (const plan of wafConfig.pivotRulesBy) {
                const filteredRules = new Array<config.IFileWafPivotRuleByDefinition>();

                if (plan.rules) {
                    for (const rule of plan.rules) {
                        if (rule.wafId && this.currentWaf && this.currentWaf.id) {
                            tl.debug(`-- Scoped to ${rule.wafId} --`);

                            if (Array.isArray(rule.wafId)) {
                                if (rule.wafId.includes(this.currentWaf.id)) {
                                    filteredRules.push(rule);
                                }
                            } else {
                                if (rule.wafId === this.currentWaf.id) {
                                    filteredRules.push(rule);
                                }
                            }
                        } else {
                            filteredRules.push(rule);
                        }
                    }
                }

                filteredPivotByRules.push(<config.IFileWafPivotRuleByConfiguration>{
                    inspect: plan.inspect,
                    phase: plan.phase,
                    rules: filteredRules
                });

                // Replace with the filtered rules
                wafConfig.pivotRulesBy = filteredPivotByRules;
            }
        }
    }
}