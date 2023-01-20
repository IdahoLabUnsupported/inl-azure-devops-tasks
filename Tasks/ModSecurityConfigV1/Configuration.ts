
import * as tl from 'azure-pipelines-task-lib/task';
import * as fs from 'fs';
import * as path from 'path';
// tslint:disable-next-line: no-require-imports
import stripJsonComments = require('strip-json-comments');

/**
 * The ssl configuration for an Nginx server as stored in a json config file
 */
export interface IFileSslConfiguration {
    ssl_certificate?: string;
    ssl_certificate_key?: string;
    ssl_protocols?: string;
    ssl_prefer_server_ciphers?: string;
    ssl_ciphers?: string;

    [key: string]: string | undefined;
}

/** Interface for a header that will be added to the response */
export interface IFileHeaderValue {
    /** The header name */
    name?: string;

    /** The value of the header */
    value?: string;
}

/** Represents a scoped value in the config file */
export interface IFileScopedValue {
    /** The id of the WAF the configuration should be applied to. */
    wafId?: string;

    /** what vip frontend should the value be applied to. */
    vipFrontend?: string;

    /** The value for the scope */
    value?: string;
}

/**
 * The WAF configuration as stored in a json config file
 */
export interface IFileWafConfiguration {
    /** The ID of the WAF */
    id?: string;

    /** The name of the WAF derived from the file name */
    name?: string;

    /** The ssl configuration for the WAF */
    ssl_config?: IFileSslConfiguration;
}

/** A content replacement pattern from the config file */
export interface IFileContentReplacePattern {
    /** What string should be matched in the content */
    match?: string;

    /** What string should replace the matched value in the content */
    replacement?: string;
}

/** Content replacement rules for the Nginx configuration */
export interface IFileContentReplaceConfiguration {
    /** What MIME content types should be examined and have contents replaced */
    types?: string[];

    /** Array of patterns that should be applied to the content */
    patterns?: IFileContentReplacePattern[];
}

/** The base backend configuration for a vip/path */
export interface IFileBackendConfiguration {
    /** The backend hostname */
    backend?: string;

    /** Optional host header to use for the backend target */
    backendHostHeader?: string;

    /** Optional backend port the request should be sent to. defaults to 443 */
    backendPort?: number;

    /** Optionally determines if the backend is ssl. defaults to true when the port is 443 */
    backendIsSSL?: boolean;

    /** Optionally defines what the redirect replacement should be instead of the backend/frontend hostname */
    backendRedirectReplacements?: IFileContentReplacePattern[];

    /** The content replacement configuration that should be applied */
    contentReplace?: IFileContentReplaceConfiguration;

    /** The ip address rules that should apply to this backend instance only */
    ipRules?: IFileIpRulesConfiguration;

    /** Headers that should be added to the response for the vip */
    response_headers?: IFileHeaderValue[];
}

/** Configuration for a backend path */
export interface IFileBackendPathConfiguration extends IFileBackendConfiguration {
    /** The url that should be mapped like /path */
    url?: string;

    /** Optional value that indicates if the path should be removed on the backend target. */
    removePathOnBackend?: boolean;
}

export interface IFileRedirectConfiguration {
    /** The url that should be redirected on the path like /path */
    url?: string;

    /** Regular expression to match on the source path like ^/path/(.*)$ */
    sourcePathRegEx?: string;

    /** The redirect target can be url and use regex groups it https://somesite.domain.com/$1 */
    target?: string;
}

/** The vip configuration as stored in an Application json config file */
export interface IFileVipConfiguration extends IFileBackendConfiguration {
    /** The frontend hostname */
    frontend?: string;

    /** Path configurations for different backends */
    paths?: IFileBackendPathConfiguration[];

    /** Optional redirect configurations for the vip */
    redirects?: IFileRedirectConfiguration[];

    /** The ssl configuration for the vip to override the app and WAF */
    ssl_config?: IFileSslConfiguration;
}

/** The IP rules configuration section of the file */
export interface IFileIpRulesConfiguration {
    /** What ip addresses or ranges should be allowed */
    allow?: string | string[];

    /** What ip addresses or ranges should be denied */
    deny?: string | string[];

}

/** The WAF/NGINX vip configuration for a single WAF instance in an Application json config file */
export interface IFileWafVipConfiguration {
    /** The ID of the WAF the configuration should apply to */
    wafId?: string;

    /** The individual VIP configurations for the application. */
    vips?: IFileVipConfiguration[];

    /** The ip address rules that should apply to this WAF instance only */
    ipRules?: IFileIpRulesConfiguration;

    /** Headers that should be added to the response for all vips on the WAF */
    response_headers?: IFileHeaderValue[];
}

/** The custom WAF rules section from an Application json config file */
export interface IFileApplicationCustomWafRules {
    /** What should be inspected by the rule */
    inspect?: string;

    /** What should be matched by the rule */
    match?: string;

    /** What are the settings of the rule */
    settings?: string;

    /** WAF or list of WAF's the rule applies to.  When null applies to all */
    wafId?: string | string[];
}

/** The request size configuration for the WAF in the json config file */
export interface IFileWafRequestSizeConfiguration {
    /** The number of bytes to limit the body size to */
    bodyLimit?: number;

    /** The number of bytes to limit the body size to when no files are present */
    bodyNoFilesLimit?: number;
}

/** The base WAF configuration interface for a file */
export interface IFileWafConfigurationBase {
    /** What mode should the waf be in */
    mode?: string | IFileScopedValue[];

    /** The list of disabled WAF rules by ID */
    disabledById?: Array<number>;
}

/** A single rule definition for the pivot by rules */
export interface IFileWafPivotRuleByDefinition extends IFileWafConfigurationBase {
    /** What should be matched by the rule */
    match?: string | string[];

    /** Should the lowercase transform be applied */
    lowercase?: boolean;

    /** WAF or list of WAF's the rule applies to.  When null applies to all */
    wafId?: string | string[];
}

/** A single pivotRulesBy Configuration item from the Application json config file */
export interface IFileWafPivotRuleByConfiguration {
    /** What should be inspected by the rule */
    inspect?: string;

    /** What phase should the rules be applied to */
    phase?: number;

    /** The list of defined rules for the pivot rules by operation */
    rules?: IFileWafPivotRuleByDefinition[];
}

/** The WAF configuration from an Application json config file */
export interface IFileWafApplicationConfiguration extends IFileWafConfigurationBase {
    /** What should the request size limits be.  Max of 1GB */
    requestSize?: IFileWafRequestSizeConfiguration;

    /** The list of WAF rules by ID that should be placed in Detection Only mode for the entire site */
    detectById?: Array<number>;

    /** Array of pivot rules by configured for the application */
    pivotRulesBy?: IFileWafPivotRuleByConfiguration[];

    /** The custom WAF rules that should be added for the application */
    customRules?: IFileApplicationCustomWafRules[];
}

/** Settings to allow cache bypass */
export interface IFileCacheBypassSettings {
    /** The name of the cookie that can bypass the cache when present */
    cookieName?: string;

    /** The name of the query argument that can bypass the cache when present */
    argumentName?: string;
}

/** The listener settings for the application */
export interface IFileListenerSettings {
     /** A value that indicates if http2 should be enabled for the application */
     isHttp2Enabled?: boolean; 

     /** When provided will override the default timeout waiting for a request from the backend.  Uses nginx format like 600s. */
     requestTimeout?: string;

     /** Optional value that determines if gzip should be enabled.  Defaults to true. */
     isGzipEnabled?: boolean;

     /** Should underscores be allowed in headers - default is false */
     isUnderscoresInHeaders?: boolean;

     /** What should the maximum requests per second be.  One of 1000,1200,1400,1800,2000.  Defaults to 1000 when not supplied */
     maxRequestsPerSecond?: number;

     /** The Caching zone name that should be used by the application */
    cacheZone?: string | IFileScopedValue[];

    /** The cache bypass settings */
    cacheBypass?: IFileCacheBypassSettings;
}

/** The configuration for an Application as stored in a json config file */
export interface IFileApplicationConfiguration {
    /** The name of the application derived from the file name */
    name?: string;

    /** When true the config generation is disabled for the application */
    disabled?: boolean;

    /** Optional name of the NGINX template that should be used.  When not supplied the default will be used.*/
    nginxTemplate?: string | IFileScopedValue[];

    /** Optional name of the ModSec template that should be used.  When not supplied the default will be used. */
    modsecTemplate?: string;

    /** The ip address rules for the entire application applies to all WAF instances */
    ipRules?: IFileIpRulesConfiguration;

    /** Headers that should be added to the response for all WAFs and vips of the application */
    response_headers?: IFileHeaderValue[];

    /** The vip Configurations for the different WAF instances */
    vipConfigs?: IFileWafVipConfiguration[];

    /** The WAF configuration for the application */
    wafConfig?: IFileWafApplicationConfiguration;

    /** The ssl configuration for the application that can override the environment */
    ssl_config?: IFileSslConfiguration;

    /** Optional settings for the listener */
    listener?: IFileListenerSettings;
}

/** The configuration needed for the Task to do its work. */
export interface IConfiguration {
    /** The top level path to the environment and application configuration json files */
    configurationRootPath?: string;

    /** The directory where the NGINX configuration files should be placed */
    nginxConfigDirectory?: string;

    /** The directory where the modsec configuration files should be placed */
    modsecConfigDirectory?: string;

    /** The id of the WAF the configuration should be generated for. */
    wafId?: string;
}

export class ConfigurationLoader {
    /** The WAF configuration that was found and loaded */
    public wafs?: Map<string, IFileWafConfiguration>;

    /** The list of application configurations that were found and loaded */
    public applications?: Array<IFileApplicationConfiguration>;

    /** The configuration for the Task/Process */
    public config?: IConfiguration;

    /** A value that indicates if the configuration has been loaded */
    public isLoaded: boolean = false;

    constructor(config: IConfiguration) {
        this.wafs = new Map<string, IFileWafConfiguration>();
        this.applications = new Array<IFileApplicationConfiguration>();
        this.config = config;
        this.validRequestPerSecond = [1000, 1200, 1400, 1600, 1600, 2000];
        this.validWafModes = ['Off', 'On', 'DetectionOnly'];

        this._debugConfiguration();
        this._validate();
    }

    private validRequestPerSecond: number[];
    private validWafModes: string[];

    private _debugConfiguration(): void {
        if (this.config) {
            tl.debug('------------ Configuration ------------');
            tl.debug(`config.wafId=${this.config.wafId}`);
            tl.debug(`config.configurationRootPath=${this.config.configurationRootPath}`);
            tl.debug(`config.nginxConfigDirectory=${this.config.nginxConfigDirectory}`);
            tl.debug(`config.modsecConfigDirectory=${this.config.modsecConfigDirectory}`);
            tl.debug('-----------------------------------------------------');
        }
    }

    private _validate(): void {
        const errors = new Array<string>();

        if (!this.config) {
            errors.push('No configuration Supplied!');
        }

        if (this.config && !this.config.wafId) {
            errors.push('No WAF ID specified!');
        }

        if (this.config && !this.config.configurationRootPath) {
            errors.push('No configuration Root Path specified!');
        }

        if (this.config && this.config.configurationRootPath && !fs.existsSync(this.config.configurationRootPath)) {
            errors.push('The configuration Root Path does not exist!');
        }

        if (this.config && !this.config.nginxConfigDirectory) {
            errors.push('No NGINX Configuration Directory specified!');
        }

        if (this.config && !this.config.modsecConfigDirectory) {
            errors.push('No modsec Configuration Directory specified!');
        }

        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
        }
    }

    private _loadJsonObject(file: string): any {
        const fileContents = fs.readFileSync(file).toString();
        const cleanJson = stripJsonComments(fileContents);
        return JSON.parse(cleanJson);
    }

    /** 
     * Load the WAF configuration files from the specified path
     * @param directory The directory to search and load WAF config files.
     * */
    private _loadWafs(directory: string): void {
        console.log(`Loading WAF config from ${directory}`);
        const configFiles = tl.findMatch(directory, ['**/*.json', '**/*.jsonc']);

        for (const f of configFiles) {
            console.log(`Loading ... ${f}`);
            const waf = <IFileWafConfiguration>this._loadJsonObject(f);
            waf.name = path.basename(f, '.json');
            if (this.wafs) {
                if (waf.id) {
                    this.wafs.set(waf.id, waf);
                } else {
                    tl.warning(`No WAF id specified in "${f}"`);
                }
            }
        }
    }

    /** 
     * Load the application configuration files from the specified path
     * @param directory The directory to search and load application config files.
     * */
    private _loadApplications(directory: string): void {
        console.log(`Loading Application config from ${directory}`);
        const configFiles = tl.findMatch(directory, ['**/*.json', '**/*.jsonc']);
        const errors = new Array<string>();

        for (const f of configFiles) {
            console.log(`Loading ... ${f}`);
            const app = <IFileApplicationConfiguration>this._loadJsonObject(f);
            app.name = path.basename(f, '.json');

            // Apply any defaults to the application
            if (!app.nginxTemplate) {
                app.nginxTemplate = 'default';
            }
            if (!app.modsecTemplate) {
                app.modsecTemplate = 'default';
            }
            if (!app.listener) {
                app.listener = <IFileListenerSettings>{
                    isHttp2Enabled: true,
                    isGzipEnabled: true
                };
            }
            if (app.listener && app.listener.isHttp2Enabled === undefined) {
                app.listener.isHttp2Enabled = true;
            }
            if (app.listener && app.listener.isGzipEnabled === undefined) {
                app.listener.isGzipEnabled = true;
            }
            if (app.listener && app.listener.maxRequestsPerSecond && !this.validRequestPerSecond.includes(app.listener.maxRequestsPerSecond)) {
                errors.push(`${f}: The value ${app.listener.maxRequestsPerSecond} is not a valid value for listener.maxRequestsPerSecond. Must be one of [${this.validRequestPerSecond}]`);
            }
            if (app.vipConfigs) {
                for (const c of app.vipConfigs) {
                    if (c.vips) {
                        for (const vip of c.vips) {
                            if (!vip.backendPort) {
                                vip.backendPort = 443;
                            }
                            if (vip.backendIsSSL === undefined) {
                                vip.backendIsSSL = vip.backendPort === 443 ? true : false;
                            }
                            if (vip.paths) {
                                for (const p of vip.paths) {
                                    if (p.backend === undefined) {
                                        p.backend = vip.backend;
                                    }
                                    if (p.backendHostHeader === undefined) {
                                        p.backendHostHeader = vip.backendHostHeader;
                                    }
                                    if (p.backendIsSSL === undefined) {
                                        p.backendIsSSL = p.backendPort === 443 ? true : false;
                                    }
                                    if (p.backendPort === undefined) {
                                        p.backendPort = vip.backendPort;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (app.wafConfig && !app.wafConfig.mode) {
                errors.push(`${f}: No WAF Mode Specified`);
            } else {
                let mode: string | undefined;
                if (app.wafConfig && Array.isArray(app.wafConfig.mode)) {
                    const defaultScope = app.wafConfig.mode.find(x => !x.wafId && !x.vipFrontend);
                    if (defaultScope) {
                        mode = defaultScope.value;
                    }
                } else if (app.wafConfig && typeof(app.wafConfig.mode) === 'string') {
                    mode = app.wafConfig.mode;
                }
                if (!mode || (mode && !this.validWafModes.includes(mode))) {
                    errors.push(`${f}: The value ${mode} is not a valid value for wafConfig.mode. Must be one of [${this.validWafModes}]`);
                }
            }

            if (this.applications) {
                this.applications.push(app);
            }

            if (errors.length > 0) {
                throw new Error(errors.join('\n'));
            }
        }
    }

    /** Load the configuration from the Configuration Root path */
    public load(): void {
        if (this.config && this.config.configurationRootPath) {
            const wafDir = path.join(this.config.configurationRootPath, 'wafs');
            const appDir = path.join(this.config.configurationRootPath, 'apps');

            this._loadWafs(wafDir);
            this._loadApplications(appDir);
            this.isLoaded = true;
        }
    }
}