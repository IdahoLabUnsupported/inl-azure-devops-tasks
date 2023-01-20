'use strict';

import * as path from 'path';
import * as tl from 'azure-pipelines-task-lib/task';
import * as config from './Configuration';
import * as st from './ScriptTemplates';
import * as aza from './AzureArtifacts';

/**
 * This will allow generating deployment.sql and associated sql scripts for
 * the database configuration
 */
export class ConfigurationScriptGenerator {

    /**
     * Create a new ConfigurationScriptGenerator for the specified runtime database configurations
     * @param runtimeDatabaseConfigs The array of runtime database configs that should be applied
     * @param scriptRoot The path where the scripts will be generated
     * @param deploymentScript The path to the top level deployment script
     * @param repos The git repositories associated with the deployment.
     */
    constructor(runtimeDatabaseConfigs: config.DatabaseConfiguration[], scriptRoot: string, deploymentScript: string, repos: aza.IAzureArtifactRepo[], defaultWorkingDirectory: string, configFiles: aza.IRepoFiles[]) {
        this.runtimeConfigs = runtimeDatabaseConfigs;
        this.templateEngine = new st.ScriptTemplateEngine();
        this.scriptRoot = scriptRoot;
        this.deploymentScript = deploymentScript;
        this.repos = repos;
        this.DefaultWorkingDirectory = defaultWorkingDirectory;
        this.configFiles = configFiles;
    }

    private repos: aza.IAzureArtifactRepo[]
    private runtimeConfigs: config.DatabaseConfiguration[];
    private templateEngine: st.ScriptTemplateEngine;
    private scriptRoot: string;
    private deploymentScript: string;
    private DefaultWorkingDirectory: string;
    private configFiles: aza.IRepoFiles[];

    /**
     * Build the deployment.sql script that will be used to apply the database configuration
     */
    public buildDeploymentSqlScript(): void {
        // Remove branches from the config on the database that have been deleted
        
        for (const r of this.repos) {
            this._createRemoveBranchesScript(r);
            // Remove all files that have been deleted from the config_database table
            this._createRemoveFilesScript(this.configFiles, r);
        }
        
        
        
        
        // Build the needed sql scripts for the configurations
        for (const dbConfig of this.runtimeConfigs) {

            this._createConfigScript(dbConfig)
            this._createTablespaceScript(dbConfig);
            this._createUserScript(dbConfig);
            this._createRoleScript(dbConfig);
            this._createDBLinkScript(dbConfig);
        }
        // Run Those scripts that don't require passwords and will be run from loaded config
        this._createProfileScript();
        this._alterUserScript();
        this._userQuota();
        this._dropRoleScript();
        this._dropDBLinkScript();
        this._createDirectoryScript();
        this._createNetworkAclScript();
        this._createPrivilegesScript();
        this._createMViewRefreshScript();

        // Create the deployment script
        this._createDeploymentScript();
    }

    public prepareDirectoryStructure(): void {
        // Remove existing structure if it exists
        if (tl.exist(this.scriptRoot)) {
            tl.rmRF(this.scriptRoot);
        }

        tl.mkdirP(path.join(this.scriptRoot, 'tablespaces'));
        tl.mkdirP(path.join(this.scriptRoot, 'profiles'));
        tl.mkdirP(path.join(this.scriptRoot, 'directories'));
        tl.mkdirP(path.join(this.scriptRoot, 'databaseLinks'));
        tl.mkdirP(path.join(this.scriptRoot, 'roles'));
        tl.mkdirP(path.join(this.scriptRoot, 'users'));
        tl.mkdirP(path.join(this.scriptRoot, 'networkAcls'));
        tl.mkdirP(path.join(this.scriptRoot, 'privileges'));
        tl.mkdirP(path.join(this.scriptRoot, 'refreshmview'));
        tl.mkdirP(path.join(this.scriptRoot, 'configs'));
        tl.mkdirP(path.join(this.scriptRoot, 'remove'));
    }

    private _createRemoveBranchesScript(repo: aza.IAzureArtifactRepo) {
        const branches: string = `coalesce('${repo.remoteBranches.join(`', '<NULL>'), coalesce('`)}', '<NULL>')` ;

        // build branches array from: repo.remoteBranches
        const tokens: Map<string, string> = new Map([
            ['<repo_data>', repo.repoUrl],
            ['<branch_array>', branches]
        ]); 
        const scriptFile = path.join(this.scriptRoot, 'remove', `remove_branches_${repo.name}.sql`);
        this.templateEngine.createScriptFromTemplate(st.SqlScriptTemplateType.RemoveDatabaseBranches, scriptFile, tokens);
    }

    private _createRemoveFilesScript(files: aza.IRepoFiles[], repo: aza.IAzureArtifactRepo) {
        const fileArray = new Array<string>();
        let repoFiles: string = '';
        for (const f of files) {
            if (f.repo === repo.repoUrl  && f.branch === repo.branchName) {
                fileArray.push(f.fileName)
            }
        }

        if (fileArray.length > 0) {
            repoFiles = `and config_file not in (coalesce('${fileArray.join(`', '<NULL>')\n, coalesce('`)}', '<NULL>'))`;
            }
        
            const tokens: Map<string, string> = new Map([
                ['<repo>', repo.repoUrl],
                ['<branch>', repo.branchName],
                ['<files>', repoFiles]
            ]);

            const scriptFile = path.join(this.scriptRoot, 'remove', `remove_files_${repo.name}.sql`);
            this.templateEngine.createScriptFromTemplate(st.SqlScriptTemplateType.RemoveDatabaseFiles, scriptFile, tokens);
        
    }

    private _createConfigScript(config: config.DatabaseConfiguration) {

        const dbConfig = this._convertToDBDatabaseConfiguration(config);

        // Sqlplus can't load more than 32000 characters at once, if there are more characters, load it into multiple files.
        const dbConfig_Print = JSON.stringify(dbConfig, null, 2);
        const dbConfig_loop = 32000;
        const dbConfig_length = Math.ceil(dbConfig_Print.length / dbConfig_loop);
        
        for (let i = 1; i <= dbConfig_length; i++ ) {
            // Need to pad the number for sorting to run large scripts
            let pad_i = String(i);
            if (pad_i.length === 1 ) {
                pad_i = `00${pad_i}`;
            }
            else if (pad_i.length === 2 ) {
                pad_i = `0${pad_i}`;
            }

            const configScript = path.join(this.scriptRoot, 'configs', `database_config_${config.configFileScriptName}_${pad_i}.sql`)
            const configTokens: Map<string, string | undefined> = new Map([
                ['<repo_data>', config.repo.repoUrl],
                ['<branch_value>', config.repo.branchName],
                ['<config_values>', dbConfig_Print.substring((i * dbConfig_loop) - dbConfig_loop, (i * dbConfig_loop) )],
                ['<number>', String(i)],
                ['<commit>', config.repo.latestCommit],
                ['<config_file_path>', config.configFilePath],
                ['<config_file>', config.configFilePath],
            ])
            this.templateEngine.createScriptFromTemplate(st.SqlScriptTemplateType.WriteDatabaseConfig, configScript, configTokens)
        }
    }

    private _convertToDBDatabaseConfiguration(configs: config.DatabaseConfiguration) {

        const roles = new Array<config.IDBRoleConfiguration>();
        if (configs && configs.roles) {
            configs.roles.forEach(
                u => roles.push(
                        <config.IDBRoleConfiguration>{
                        name: u.name,
                        roleDN: u.roleDN,
                        environments: u.environments,
                        excludeEnvironments: u.excludeEnvironments
                    }
                )
            )
        }

        const users = new Array<config.IDBUserConfiguration>();
        if (configs && configs.users) {
            configs.users.forEach(
                u => users.push(
                    <config.IDBUserConfiguration> {
                        name: u.name,
                        gatekeeperProxyFlag: u.gatekeeperProxyFlag,
                        quota: u.quota,
                        tablespace: u.tablespace,
                        profile: u.profile,
                        accountStatus: u.accountStatus,
                        environments: u.environments,
                        excludeEnvironments: u.excludeEnvironments,
                        passwordDN: u.passwordDN,
                        passwordType: u.passwordType
                    }
                )
            )
        }

        const databaseLinks = new Array<config.IDBDatabaseLinkConfiguration> ();
        if (configs && configs.databaseLinks) {
            configs.databaseLinks.forEach(
                u => databaseLinks.push(
                    <config.IDBDatabaseLinkConfiguration>{
                        name: u.name,
                        owner: u.owner,
                        connectionString: u.connectionString,
                        sourceUserName: u.sourceUserName,
                        environments: u.environments,
                        excludeEnvironments: u.excludeEnvironments
                    }
                )
            )
        }

        const toReturn = <config.IDBDatabaseConfiguration> {
            dataOwner: configs.dataOwner,
            profiles: configs.profiles,
            directories: configs.directories,
            roles: roles.length !== 0 ? roles : undefined,
            privileges: configs.privileges,
            networkAcls: configs.networkAcls,
            databaseLinks: databaseLinks.length !== 0 ? databaseLinks : undefined,
            users: users.length !== 0 ? users : undefined,
            excludedObjects: configs.excludedObjects
        }

        return toReturn;
    }
    
    private _createTablespaceScript(config: config.DatabaseConfiguration): void {

        if (config && config.tableSpaces) {
            let fabricateSql = '';

            for (let u of config.tableSpaces) {
                const tablespaceName = u.name ? `'${u.name}'` : `null`
                const autoextend = u.autoextend ? `'${u.autoextend}'` : `null`
                const blocksize = u.blocksize ? `'${u.blocksize}'` : `8`
                const bigfile = u.bigfile ? `'${u.bigfile}'` : `'true'`
                const instance = u.instance ? `'${u.instance}'` : `null`
                const initialsize = u.initialsize ? `'${u.initialsize}'` : `null`
                const maxsize = u.maxsize ? `'${u.maxsize}'` : `null`
                const temp = u.temp ? `'${u.temp}'` : `'false'`
                const encrypted = u.encrypt ? `'${u.encrypt}'` : `'false'`

                fabricateSql += `select\n  ${tablespaceName} tablespace_name\n, ${autoextend} autoextnd\n, ${blocksize} block_size\n, ${bigfile} bigfile\n, ${initialsize} initialsize\n, ${maxsize} max_size\n, ${temp} temp\n, ${encrypted} encrypted\n, ${instance} instance\n, '${config.repo.repoUrl}' repo\n, '${config.repo.branchName}' branch\n, '${config.configFilePath}' config_file\n, '${config.repo.latestCommit}' commit\nfrom\n  dual\nunion\n`
            }

            if (fabricateSql.length > 0) {

                const configScript = path.join(this.scriptRoot, 'tablespaces', `tablespace_${config.configFileScriptName}.sql`)
                const configTokens: Map<string, string | undefined> = new Map([
                    ['<replace>', fabricateSql.substring(0, fabricateSql.length - 7)],
                    ['<replace2>', fabricateSql.substring(0, fabricateSql.length - 7)],
                    ['<config_file_path>', config.configFilePath]
                ])
                this.templateEngine.createScriptFromTemplate(st.SqlScriptTemplateType.Tablespaces, configScript, configTokens)
            }
        }
        
    }

    private _createUserScript(config: config.DatabaseConfiguration): void {
        if (config && config.users) {
            let fabricateSql = '';

            for (let u of config.users) {
                const environments = new Array();
                const username = u.name ? `'${u.name}'` : `null`;
                const passwordType = u.passwordType ? `'${u.passwordType}'` : `null`;
                const password = u.password ? `'${u.password}'` : `null`;
                const passwordDN = u.passwordDN ? `${JSON.stringify(u.passwordDN, null, 2)}` : `null`;
                const gatekeeperProxyFlag = u.gatekeeperProxyFlag ? `'${u.gatekeeperProxyFlag}'` : `null`;
                const expirePasswordFlag = u.expirePasswordFlag ? `'${u.expirePasswordFlag}'` : `null`;
                const profile = u.profile ? `${JSON.stringify(u.profile, null, 2)}` : `null`;
                const tablespace = u.tablespace ? `${JSON.stringify(u.tablespace, null, 2)}` : `null`;
                const accountStatus = u.accountStatus ? `${JSON.stringify(u.accountStatus, null, 2)}` : `'LOCKED'`;
                const reg = new RegExp(/\"/, 'gi')
                if (u.environments){
                    for (let i of u.environments){
                        environments.push(JSON.stringify(i.environment).replace(reg, '').toUpperCase())
                    }
                }
                const environment = u.environments ? `'${environments.join(`','`)}'` : null;
                const excludeEnvironments = new Array();
                if (u.excludeEnvironments){
                    for (let i of u.excludeEnvironments){
                        excludeEnvironments.push(JSON.stringify(i.excludeEnvironment).replace(reg, '').toUpperCase())
                    }
                }
                const excludeEnvironment = u.excludeEnvironments ? `'${excludeEnvironments.join(`','`)}'` : null;

                const sqlConfigTokens: Map<string, string | undefined | null> = new Map([
                    ['<username>', username],
                    ['<passwordType>', passwordType],
                    ['<password>', password],
                    ['<gatekeeperProxyFlag>', gatekeeperProxyFlag],
                    ['<expirePasswordFlag>', expirePasswordFlag],
                    ['<repoUrl>', config.repo.repoUrl],
                    ['<branchName>', config.repo.branchName],
                    ['<configFilePath>', config.configFilePath],
                    ['<latestCommit>', config.repo.latestCommit],
                    ['<passwordDN>', passwordDN],
                    ['<profile>', profile],
                    ['<tablespace>', tablespace],
                    ['<accountStatus>', accountStatus],
                    ['<environment>', environment],
                    ['<environment2>', environment],
                    ['<excludeEnvironments>', excludeEnvironment]
                ])

                fabricateSql += this.templateEngine.createScriptFromTemplate(st.SqlScriptTemplateType.UserFabrication, undefined, sqlConfigTokens)
            }

            if (fabricateSql.length > 0) {
                const configScript = path.join(this.scriptRoot, 'users', `create_user_${config.configFileScriptName}.sql`)
                const configTokens: Map<string, string | undefined> = new Map([
                    ['<replace>', fabricateSql.substring(0, fabricateSql.length - 7)],
                    ['<repo_file>', config.configFilePath]
                ])
                this.templateEngine.createScriptFromTemplate(st.SqlScriptTemplateType.CreateUser, configScript, configTokens)
            }
        }
    }

    private _alterUserScript(): void {
        const configScript = path.join(this.scriptRoot, 'users', `drop_alter_user.sql`)
        this.templateEngine.createScriptFromTemplate(st.SqlScriptTemplateType.AlterUser, configScript)
    }

    private _userQuota(): void {
        const configScript = path.join(this.scriptRoot, 'users', `user_quota.sql`)
        this.templateEngine.createScriptFromTemplate(st.SqlScriptTemplateType.Quota, configScript)
    }

    private _createRoleScript(config: config.DatabaseConfiguration): void {
        if (config && config.roles) {
            let fabricateSql = '';

            for (let u of config.roles) {
                const rolename = `''${u.name}''`;
                const roleDN = u.roleDN ? `${JSON.stringify(u.roleDN, null, 2)}` : `null`;
                const password = u.password ? `''${u.password}''` : `null`;
                const environments = new Array();
                const reg = new RegExp(/\"/, 'gi')
                if (u.environments){
                    for (let i of u.environments){
                        environments.push(JSON.stringify(i.environment).replace(reg, '').toUpperCase())
                    }
                }
                const environment = u.environments ? `''${environments.join(`'',''`)}''` : null;
                const excludeEnvironments = new Array();
                if (u.excludeEnvironments){
                    for (let i of u.excludeEnvironments){
                        excludeEnvironments.push(JSON.stringify(i.excludeEnvironment).replace(reg, '').toUpperCase())
                    }
                }
                const excludeEnvironment = u.excludeEnvironments ? `'${excludeEnvironments.join(`','`)}'` : null;

                const sqlConfigTokens: Map<string, string | undefined | null> = new Map([
                    ['<rolename>', rolename],
                    ['<roleDN>', roleDN],
                    ['<password>', password],
                    ['<environment>', environment],
                    ['<repoUrl>', config.repo.repoUrl],
                    ['<branchName>', config.repo.branchName],
                    ['<configFilePath>', config.configFilePath],
                    ['<latestCommit>', config.repo.latestCommit],
                    ['<environment>', environment],
                    ['<environment2>', environment],
                    ['<excludeEnvironment>', excludeEnvironment]
                ])

                fabricateSql += this.templateEngine.createScriptFromTemplate(st.SqlScriptTemplateType.RoleFabrication, undefined, sqlConfigTokens)
            }

            if (fabricateSql.length > 0) {
                const configScript = path.join(this.scriptRoot, 'roles', `create_role_${config.configFileScriptName}.sql`)
                const configTokens: Map<string, string | undefined> = new Map([
                    ['<replace>', fabricateSql.substring(0, fabricateSql.length - 7)],
                    ['<config_file_path>', config.configFilePath]
                ])
                this.templateEngine.createScriptFromTemplate(st.SqlScriptTemplateType.CreateRole, configScript, configTokens)
            }
        }
    }

    private _dropRoleScript() {
        const configScript = path.join(this.scriptRoot, 'roles', `drop_roles.sql`)
        this.templateEngine.createScriptFromTemplate(st.SqlScriptTemplateType.DropRole, configScript)
    }

    private _createDBLinkScript(config: config.DatabaseConfiguration): void {
        if (config && config.databaseLinks) {
            let fabricateSql = '';
            
            for (let u of config.databaseLinks) {
                const owner = `'${u.owner}'`;
                const name = `'${u.name}'`;
                const connectionString = u.connectionString ? `${JSON.stringify(u.connectionString, null, 2)}` : 'null';
                const sourceUserName = u.sourceUserName ? `${JSON.stringify(u.sourceUserName, null, 2)}` : 'null';
                const sourceUserPassword = u.sourceUserPassword ? `'${u.sourceUserPassword}'` : 'null';
                const environments = new Array();
                const reg = new RegExp(/\"/, 'gi')
                if (u.environments){
                    for (let i of u.environments){
                        environments.push(JSON.stringify(i.environment).replace(reg, '').toUpperCase())
                    }
                }
                const environment = u.environments ? `'${environments.join(`','`)}'` : null;
                const excludeEnvironments = new Array();
                if (u.excludeEnvironments){
                    for (let i of u.excludeEnvironments){
                        excludeEnvironments.push(JSON.stringify(i.excludeEnvironment).replace(reg, '').toUpperCase())
                    }
                }
                const excludeEnvironment = u.excludeEnvironments ? `'${excludeEnvironments.join(`','`)}'` : null;

                const sqlConfigTokens: Map<string, string | undefined | null> = new Map([
                    ['<owner>', owner],
                    ['<name>', name],
                    ['<connectionstring>', connectionString],
                    ['<sourceUserName>', sourceUserName],
                    ['<sourceUserPassword>', sourceUserPassword],
                    ['<repoUrl>', config.repo.repoUrl],
                    ['<branchName>', config.repo.branchName],
                    ['<configFilePath>', config.configFilePath],
                    ['<latestCommit>', config.repo.latestCommit],
                    ['<environment>', environment],
                    ['<environment2>', environment],
                    ['<excludeEnvironment>', excludeEnvironment]
                ])

                fabricateSql += this.templateEngine.createScriptFromTemplate(st.SqlScriptTemplateType.DBLinkFabrication, undefined, sqlConfigTokens)
            }

            if (fabricateSql.length > 0) {
                const configScript = path.join(this.scriptRoot, 'databaseLinks', `create_db_link_${config.configFileScriptName}.sql`)
                const configTokens: Map<string, string | undefined> = new Map([
                    ['<replace>', fabricateSql.substring(0, fabricateSql.length - 7)],
                    ['<config_file_path>', config.configFilePath]
                ])
                this.templateEngine.createScriptFromTemplate(st.SqlScriptTemplateType.DatabaseLinks, configScript, configTokens)
            }
        }
    }

    private _dropDBLinkScript() {
        const configScript = path.join(this.scriptRoot, 'databaseLinks', `drop_db_links.sql`);
        this.templateEngine.createScriptFromTemplate(st.SqlScriptTemplateType.DropDatabaseLinks, configScript);
    }

    private _createProfileScript() {
        const configScript = path.join(this.scriptRoot, 'profiles', `profiles.sql`);
        this.templateEngine.createScriptFromTemplate(st.SqlScriptTemplateType.Profile, configScript);
    }

    private _createDirectoryScript() {
        const configScript = path.join(this.scriptRoot, 'directories', `directories.sql`);
        this.templateEngine.createScriptFromTemplate(st.SqlScriptTemplateType.Directories, configScript);
    }

    private _createNetworkAclScript() {
        const configScript = path.join(this.scriptRoot, 'networkAcls', `network_acls.sql`);
        this.templateEngine.createScriptFromTemplate(st.SqlScriptTemplateType.NetworkAcls, configScript);
    }

    private _createPrivilegesScript() {
        const configScript = path.join(this.scriptRoot, 'privileges', `privileges.sql`);
        this.templateEngine.createScriptFromTemplate(st.SqlScriptTemplateType.Privileges, configScript);
    }

    private _createMViewRefreshScript() {
        const configScript = path.join(this.scriptRoot, 'refreshmview', `RefreshMView.sql`);
        this.templateEngine.createScriptFromTemplate(st.SqlScriptTemplateType.RefreshMView, configScript);
    }

    private _createDeploymentScript(): void {
        let scriptContent: string = '\n';

        const sqlFiles = tl.findMatch(this.scriptRoot, '**/*.sql');
        const runOrder = ['remove', 'configs', 'refreshmview', 'tablespaces', 'profiles', 'users', 'roles', 'directories', 'networkAcls', 'privileges', 'databaseLinks']

        for (const dir of runOrder) {
            const folderPath =  path.join(this.scriptRoot, dir)
            for (const sqlFile of sqlFiles) {
                if (path.dirname(sqlFile) === folderPath) {
                    scriptContent += `@${sqlFile.substring(this.DefaultWorkingDirectory.length+1)}\n`
                }
            }
        }
        
        let newScriptContent: string = '';
        for (let u of scriptContent) {
            newScriptContent += u.replace('\\', '/');
        }

        tl.writeFile(this.deploymentScript, newScriptContent);

        // validate the file exists
        if (!tl.exist(this.deploymentScript)) {
            throw new Error(tl.loc('ScriptFileNotFoundError', this.deploymentScript));
        }
    }
}