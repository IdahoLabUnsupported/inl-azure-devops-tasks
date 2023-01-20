'use strict';

import * as path from 'path';
import * as fs from 'fs';
import * as tl from 'azure-pipelines-task-lib/task';

/**
 * The supported sql script templates
 */
export enum SqlScriptTemplateType {
    DatabaseLinks,
    DropDatabaseLinks,
    Tablespaces,
    Profile,
    CreateUser,
    AlterUser,
    CreateRole,
    DropRole,
    RemoveDatabaseBranches,
    RemoveDatabaseFiles,
    WriteDatabaseConfig,
    Directories,
    Privileges,
    NetworkAcls,
    Quota,
    UserFabrication,
    RoleFabrication,
    DBLinkFabrication,
    RefreshMView
}

/**
 * Class for creating instances of sql scripts based on a template.
 */
export class ScriptTemplateEngine {
    constructor() {
        // Define our script templates that we have
        const sourcePath = 'ConfigSQLScripts';
        this.scriptTemplates = new Map<SqlScriptTemplateType, string>();
        this.scriptTemplates.set(SqlScriptTemplateType.DatabaseLinks, path.join(sourcePath, 'DBLink_Template.sql'));
        this.scriptTemplates.set(SqlScriptTemplateType.DropDatabaseLinks, path.join(sourcePath, 'DropDBLink_Template.sql'));
        this.scriptTemplates.set(SqlScriptTemplateType.Tablespaces, path.join(sourcePath, 'Tablespace_Template.sql'));
        this.scriptTemplates.set(SqlScriptTemplateType.Profile, path.join(sourcePath, 'Profiles_Template.sql'));
        this.scriptTemplates.set(SqlScriptTemplateType.CreateUser, path.join(sourcePath, 'CreateUser_Template.sql'));
        this.scriptTemplates.set(SqlScriptTemplateType.AlterUser, path.join(sourcePath, 'AlterUser_Template.sql'));
        this.scriptTemplates.set(SqlScriptTemplateType.CreateRole, path.join(sourcePath, 'CreateRole_Template.sql'));
        this.scriptTemplates.set(SqlScriptTemplateType.DropRole, path.join(sourcePath, 'DropRole_Template.sql'));
        this.scriptTemplates.set(SqlScriptTemplateType.RemoveDatabaseBranches, path.join(sourcePath, 'RemoveDatabaseConfigBranches.sql'));
        this.scriptTemplates.set(SqlScriptTemplateType.RemoveDatabaseFiles, path.join(sourcePath, 'RemoveDatabaseConfigFiles.sql'));
        this.scriptTemplates.set(SqlScriptTemplateType.WriteDatabaseConfig, path.join(sourcePath, 'WriteDatabaseConfigPermissions.sql'));
        this.scriptTemplates.set(SqlScriptTemplateType.Directories, path.join(sourcePath, 'CreateDirectories.sql'));
        this.scriptTemplates.set(SqlScriptTemplateType.Privileges, path.join(sourcePath, 'CreatePrivileges.sql'));
        this.scriptTemplates.set(SqlScriptTemplateType.NetworkAcls, path.join(sourcePath, 'CreateNetworkAcls.sql'));
        this.scriptTemplates.set(SqlScriptTemplateType.Quota, path.join(sourcePath, 'CreateQuota.sql'));
        this.scriptTemplates.set(SqlScriptTemplateType.UserFabrication, path.join(sourcePath, 'UserFabrication_Template.sql'));
        this.scriptTemplates.set(SqlScriptTemplateType.RoleFabrication, path.join(sourcePath, 'RoleFabrication_Template.sql'));
        this.scriptTemplates.set(SqlScriptTemplateType.DBLinkFabrication, path.join(sourcePath, 'DatabaseLinkFabrication_Template.sql'));
        this.scriptTemplates.set(SqlScriptTemplateType.RefreshMView, path.join(sourcePath, 'RefreshMViews.sql'));
    }

    private scriptTemplates: Map<SqlScriptTemplateType, string>;

    /**
     * Get the full path of the specified sql script template file.
     * @param type The type of SQL Script Template to get the full path for
     */
    public getScriptPath(type: SqlScriptTemplateType): string | undefined {
        const relativePath = this.scriptTemplates.get(type);

        return relativePath ? path.join(__dirname, relativePath) : undefined;
    }

    /**
     * Create a new SQL Script using the specified template.
     * @param type The type of SQL Script Template that will be used to create the script.
     * @param filePath The path of where the script will be created.
     * @param tokens The tokens and values that will be substituted in the template.
     */
    public createScriptFromTemplate(type: SqlScriptTemplateType, filePath?: string, tokens?: Map<string, string | undefined | null>): void | string {
        const sourceFile = this.getScriptPath(type);
        
        if (!sourceFile) {
            throw new Error(`No template found for type: ${type}`);
        }

        // Read in the template file replace tokens and then write out the script
        let content = fs.readFileSync(sourceFile, 'utf-8');
        if (tokens) {
            for (const key of tokens.keys()) {
                content = content.replace(key, function() {return tokens.get(key) || '';});
            }
        }
        
        if (filePath) {
            tl.writeFile(filePath, content);
        }
        else {
            return content
        }
    }
}