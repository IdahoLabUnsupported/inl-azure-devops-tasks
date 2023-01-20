'use strict';

import * as path from 'path';
import * as fs from 'fs';
import * as tl from 'azure-pipelines-task-lib/task';
import * as sqrl from 'squirrelly';
import { TemplateFunction } from 'squirrelly/dist/types/compile';
import * as config from './Configuration';

/**
 * The supported configuration Templates
 */
export enum ConfigurationTemplateType {
    NginxProxy,
    ModsecConfig
}

/**
 * The data needed for the NGINX template
 */
export interface INginxTemplateData {
    /** The vip configuration for the application */
    vip: config.IFileVipConfiguration;

    /** The ip rules configuration for the app */
    ipRules?: config.IFileIpRulesConfiguration;

    /** The ssl configuration for the application */
    sslConfig?: config.IFileSslConfiguration;

    /** Optional settings for the listener */
    listener?: config.IFileListenerSettings;
}

/**
 * Represents a compiled template file
 */
interface ICompiledPartialTemplate {
    /** The name of the template */
    name: string;

    /** The actual compiled template */
    value: TemplateFunction;
}

/**
 * Class for creating instances of configuration based on a template.
 */
export class ConfigurationTemplateEngine {
    /**
     * Create a new Configuration Template Engine
     * @param nginxTemplateDirectory The directory where thr NGINX config templates are located.
     */
    constructor(nginxTemplateDirectory: string, modsecConfigDirectory: string) {
        this.templates = new Map<ConfigurationTemplateType, string | Map<string, string>>();
        this.partialTemplateFiles = new Map<ConfigurationTemplateType, string[]>();
        this._indexNginxTemplates(nginxTemplateDirectory);
        this._indexModSecTemplates(modsecConfigDirectory);
        this.templateCache = new Map<string, Map<string, TemplateFunction>>();
    }

    private templates: Map<ConfigurationTemplateType, string | Map<string, string>>;
    private partialTemplateFiles: Map<ConfigurationTemplateType, string[]>;
    private templateCache: Map<string, Map<string, TemplateFunction>>;

    /**
     * Index any NGINX templates that we find in the specified directory
     * @param directory The directory where the NGINX templates should be located
     */
    private _indexNginxTemplates(directory: string): void {
        const templateFiles = tl.findMatch(directory, '**/*.template');

        const map = new Map<string, string>();
        for (const tf of templateFiles) {
            const name = path.basename(tf, '.template');
            map.set(name, tf);
        }
        this.templates.set(ConfigurationTemplateType.NginxProxy, map);

        // Find the partial template files
        this.partialTemplateFiles.set(ConfigurationTemplateType.NginxProxy, tl.findMatch(directory, '**/*.sqrl'));
    }

    /**
     * Index any ModSec templates that we find in the specified directory
     * @param directory The directory where the ModSec templates should be located
     */
     private _indexModSecTemplates(directory: string): void {
        const templateFiles = tl.findMatch(directory, '**/*.template');

        const map = new Map<string, string>();
        for (const tf of templateFiles) {
            const name = path.basename(tf, '.template');
            map.set(name, tf);
        }
        this.templates.set(ConfigurationTemplateType.ModsecConfig, map);

        // Find the partial template files
        this.partialTemplateFiles.set(ConfigurationTemplateType.ModsecConfig, tl.findMatch(directory, '**/*.sqrl'));
    }

    /**
     * Create a new Configuration File using the specified template.
     * @param type The type of Configuration Template that will be used to create the file.
     * @param filePath The path of where the file will be created, optional.
     * @param data The data for the template.
     * @param templateName Optional name of the template that should be used when there are multiple templates.
     */
    public createConfigurationFromTemplate(type: ConfigurationTemplateType, filePath?: string, data?: object, templateName?: string): void | string {
        const sourceFile = this._getTemplatePath(type, templateName);
        tl.debug(`Found: ${sourceFile}`);

        if (!sourceFile) {
            throw new Error(`No template found for type: ${type}${templateName ? `[${templateName}]` : ''}`);
        }

        // Read in the template file replace tokens and then write out the script
        let content = fs.readFileSync(sourceFile, 'utf-8');
        if (data && sourceFile) {
            const templateRoot = path.dirname(sourceFile);
            console.log(`-- Template Root: ${templateRoot}`);
            if (!this.templateCache.has(templateRoot)) {
                console.log('-- Building Template Cache');
                // Compile the partials and cache them
                const partials = this._compilePartialTemplates(type, templateRoot);
                this.templateCache.set(templateRoot, partials);

                // Define the partials for templating engine
                for (const partialName of partials.keys()) {
                    const cp = partials.get(partialName);
                    if (cp) {
                        sqrl.templates.define(partialName, cp);
                    }
                }
            }
            
            // Render the template to get the result
            const engineConfig = sqrl.getConfig( {} );
            engineConfig.autoEscape = false;
            console.log(`-- Pre-Render Content:\n${content}`);
            content = sqrl.render(content, data, engineConfig);
            
        }
        
        console.log(`-- New Content:\n${content}`);
        if (filePath) {
            tl.writeFile(filePath, content);
        } else {
            return content;
        }
    }

    /**
     * Get the path of the template specified.
     * @param type The type of template to get the path for.
     * @param name Optional template name when the template contains multiple named templates.
     */
    private _getTemplatePath(type: ConfigurationTemplateType, name?: string): string | undefined {
        tl.debug(`Find Template for: ${type}, ${name}`);
        const value = this.templates.get(type);

        if (value && Object.getPrototypeOf(value) === Map.prototype) {
            const map = <Map<string, string>>value;
            if (name) {
                return map.get(name);
            } else {
                return undefined;
            }
        }
        return <string | undefined>value;
    }

    /**
     * Compiles the partial templates based on the specified root path which should be relative to the parent template
     * @param type The template type to compile partial templates for
     * @param rootPath The root path relative to the partial templates which will be used to determine the name
     */
    private _compilePartialTemplates(type: ConfigurationTemplateType, rootPath: string): Map<string, TemplateFunction> {
        const toReturn = new Map<string, TemplateFunction>();

        if (this.partialTemplateFiles) {
            const partials = this.partialTemplateFiles.get(type);
            if (partials) {
                for (const part of partials) {
                    this._compileRecursiveTemplate(type, part, rootPath, toReturn);
                }
            }
        }

        return toReturn;
    }

    /**
     * Recursively compile this template and any references of the template.
     * @param type The template type to compile partial templates for.
     * @param templatePath The path of the template file to compile.
     * @param rootPath The root path that should be used for relative paths.
     * @param list The combined list of compiled templates.  Will be populated as we find templates.
     */
    private _compileRecursiveTemplate(type: ConfigurationTemplateType, templatePath: string, rootPath: string, list: Map<string, TemplateFunction>): void {
        
        // Load the contents of the template file and get includes
        const template = fs.readFileSync(templatePath, 'utf-8');
        const templateIncludes = this._getTemplateIncludes(template);

        if (templateIncludes) {
            for (const n of templateIncludes) {
                if (!list.has(n) && this.partialTemplateFiles) {
                    const partials = this.partialTemplateFiles.get(type);
                    if (partials) {
                        const referencePath = partials.find(x => x.includes(n));
                        if (referencePath) {
                            this._compileRecursiveTemplate(type, referencePath, path.dirname(templatePath), list);
                        }
                    }
                }
            }
        }

        const compiledTemplate = this._compileTemplateFile(templatePath, rootPath, template);
        list.set(compiledTemplate.name, compiledTemplate.value);
    }

    /**
     * Compile the specified template file
     * @param templatePath The path to the template file.
     * @param rootPath The root path that should be used for relative path references.
     * @param templateContents The actual contents of the template.
     * @returns 
     */
    private _compileTemplateFile(templatePath: string, rootPath: string, templateContents: string): ICompiledPartialTemplate {

        // The name should basically be a relative path from rootPath with / for separators
        let name = templatePath.replace(rootPath, '').replace('.sqrl', '');
        if (name.startsWith('\\') || name.startsWith('/')) {
            name = name.substring(1);
        }
        name = name.replace(new RegExp('\\\\', 'g'), '/');

        // Compile and return the template
        return <ICompiledPartialTemplate>{
            name: name,
            value: sqrl.compile(templateContents)
        };
    }

    /**
     * Get the included names for the template.  Returns undefined if there is none.
     * @param templateContents The actual contents of the template.
     */
    private _getTemplateIncludes(templateContents: string): Array<string> | undefined {
        
        // looking for something like {{@include('proxy_headers_x_forwarded', it) /}}
        const includePattern = new RegExp('@include\\(\'([^\']*)\',', 'g');
        let matches = includePattern.exec(templateContents);

        // Just return if we did not find a match at all
        if (!matches) {
            return undefined;
        }

        const toReturn = new Array<string>();
        
        // Add our first match
        toReturn.push(matches[1]);

        // Find any other matches that might be in the template
        // tslint:disable-next-line: no-conditional-assignment
        while ((matches = includePattern.exec(templateContents)) !== null) {
            toReturn.push(matches[1]);
        }

        return toReturn;
    }

    
}