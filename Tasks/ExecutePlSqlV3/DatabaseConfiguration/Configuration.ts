
import * as fs from 'fs';
import stripJsonComments = require('strip-json-comments');
import * as tl from 'azure-pipelines-task-lib/task';
import * as aza from './AzureArtifacts';

/**
 * Database Configuration is done with three models. File, Runtime, and Database.
 * 
 * The file configuration is what is defined in the json files.  This is structured to make it easier
 * for the developer and will be translated to the runtime configuration.
 * 
 * The runtime configuration is what is needed to use and apply the configuration on the databases.
 * Thus, the structure will be setup for easy use when applying to the database.
 * 
 * The database configuration will be a subset of the runtime configuration and is setup to only store
 * what is needed in the database for later use.  Thus, passwords will not be stored in the database.
 */

/*****************************************************************************
 * Define the database configuration first as this can be used in both runtime and file
 */

 export interface IDBDatabaseConfiguration {
     /** The user ID of the data owner for the application.  Required when deploying privileges. */
    dataOwner?: string;

    profiles?: IDBProfilesConfiguration[];

    /** The Directories that should exist on the database */
    directories?: IDBDirectoryConfiguration[];

    /** The Database Links that should exist on the database */
    databaseLinks?: IDBDatabaseLinkConfiguration[];

    /** The users that should exist on the server and their associated configuration */
    users?: IDBUserConfiguration[];

    /** The privileges that should be applied to the server  */
    privileges?: IDBPrivilegeConfiguration[];

    /** The network acl's that should be applied to the server */
    networkAcls?: IDBNetworkAclConfiguration[];
    
    roles?: IDBRoleConfiguration[];

    excludedObjects?: Array<string>;
 }

 /**
  * The database privilege configuration only allows single item
  * for grant, on, and to which will make it easier when working with
  * permissions
  */
export interface IDBPrivilegeConfiguration {
    /** What privilege to grant i.e. insert, update, execute ect.*/
    grant: string;

    /** The object to grant the privilege, when not supplied we have a system grant */
    on?: string;

    /** The user/role that the privilege is being granted to */
    to: string;

    envrionment?: IEnvrionment[];
    excludeEnvironments?: IEnvrionment[];
    grantOption?: boolean;
}

export interface IDBRoleConfiguration {
    name: string;
    roleDN?: string | IEnvrionment[];
    environments?: IEnvrionment[];
    excludeEnvironments?: IEnvrionment[];
}

export interface IDBUserConfiguration {
    /** The ID/username of the user */
    name: string;

    /** Indicates if Gatekeeper can Proxy to the User defaults to False*/
    gatekeeperProxyFlag?: boolean;

    /** Expires the Users password after creation */
    expirePasswordFlag?: boolean;

    /** The password type for the user i.e. password, global, external */
    passwordType: string;

    /** The DN for both Global and External Authenticated Users */
    passwordDN?: string | IEnvrionment[];

    /** The quota for the user on different schemas */
    quota?: IQuota[];

    /** The profile assigned to the user */
    profile: UserProfileType | IEnvrionment[];

    /** Optional: Tablespace the user is assigned to */
    tablespace?: string | IEnvrionment[];

    /** Optional: Determines if the account is locked or unlocked */
    accountStatus?: string | IEnvrionment[];

    environments?: IEnvrionment[];

    excludeEnvironments?: IEnvrionment[];
}

export interface IDBProfilesConfiguration {
    name: string;
    password_parameters: [{name: string; value: string;}];
    resource_parameters: [{name: string; value: string;}];
}

export interface IDBDirectoryConfiguration {
    name: string;
    path: string | IEnvrionment[];
    environments?: IEnvrionment[];
    excludeEnvironments?: IEnvrionment[];
}

export interface IDBDatabaseLinkConfiguration {
    name: string;
    owner: string;
    sourceUserName?: string | IEnvrionment[];
    connectionString: string | IEnvrionment[];
    environments?: IEnvrionment[]; 
    excludeEnvironments?: IEnvrionment[];
}

export interface IEnvrionment {
    environment: string | Array<string>;
    value: string;
    excludeEnvironment: string | Array<string>;
}

export interface IDBNetworkAclConfiguration {
    host: string;
    username: string;
    port: string;
    upperport?: string;
    privilegeType: string;
    environment?: IEnvrionment[];
    excludeEnvironment?: IEnvrionment[];
}

/*****************************************************************************
 * Define the runtime configuration which will mostly be based on the database configuration
 */

  /**
  * The runtime privilege configuration only allows single item
  * for grant, on, and to which will make it easier when working with
  * permissions
  */

  /** The profile type for a user */
export enum UserProfileType {
    INL_LUA = 'INL_LUA',
    INL_INTERFACE = 'INL_INTERFACE',
    INL_ELEVATED = 'INL_ELEVATED',
    INL_PFEXEMPT = 'INL_PFEXEMPT'
}

/** The password source type for a user/schema */
export enum PasswordSourceType {
    Unknown = 'Unknown',
    PipelineVariable = 'PipelineVariable',
    Global = 'Global',
    External = 'External',
    NoAuthentication = 'No_Authentication'
}

export interface IDatabaseConfiguration {
    /** The user ID of the data owner for the application.  Required when deploying privileges. */
   dataOwner?: string;

   /** The tablespaces that should exist on the database */
   tableSpaces?: ITablespaceConfiguration[];

   profiles?: IProfilesConfiguration[];

   /** The Directories that should exist on the database */
   directories?: IDirectoryConfiguration[];

   /** The Database Links that should exist on the database */
   databaseLinks?: IDatabaseLinkConfiguration[];

   /** The users that should exist on the server and their associated configuration */
   users?: IUserConfiguration[];

   /** The privileges that should be applied to the server */
   privileges?: IPrivilegeConfiguration[];

   /** The network acl's that should be applied to the server */
   networkAcls?: INetworkAclConfiguration[];
   
   roles?: IRoleConfiguration[];

   /** The path to the file that was used to generate the configuration */
   filePath?: string;
   
   /** Objects to exclude from configs.  Roles and Users */
   excludedObjects?: Array<string>;
}

export interface IPrivilegeConfiguration extends IDBPrivilegeConfiguration {
    // Currently the same as the database
}

export interface IRoleConfiguration extends IDBRoleConfiguration {
    passwordType: PasswordSourceType;
    password?: string;
}

interface IQuota {
    size: string | IEnvrionment[];
    tablespace: string | IEnvrionment[];
}

/** A user configuration item that has been defined */
export interface IUserConfiguration extends IDBUserConfiguration {
    /** The password for the user */
    password?: string;
}

export interface IProfilesConfiguration extends IDBProfilesConfiguration {
    // Currently the same as the database
}

export interface IDirectoryConfiguration extends IDBDirectoryConfiguration {
    // Currently the same as the database
}

export interface IDatabaseLinkConfiguration extends IDBDatabaseLinkConfiguration {
    sourceUserName?: string | IEnvrionment[];
    connectionString: string | IEnvrionment[];
    sourceUserPassword?: string;
}

export interface ITablespaceConfiguration {
    name: string;
    blocksize?: number;
    autoextend?: string;
    initialsize?: string;
    maxsize?: string;
    instance?: string;
    bigfile?: string;
    temp?: string;
    encrypt?: string;
}

export interface INetworkAclConfiguration extends IDBNetworkAclConfiguration {
    // currently the same as the database
}


/*****************************************************************************
 * Define the file configuration which will be structured for JSON files
 */

  /**
  * The file privilege configuration for roles and schemas allow arrays of items
  * for grant and on in addition to single strings which to allow defining multiple
  * permissions easy.
  */

 enum DatabaseLinkPasswordSourceType {
    Unknown = 'Unknown',
    PipelineVariable = 'PipelineVariable',
    CurrentUser = 'CurrentUser'
}

 interface IFileRoleSchemaPrivilegesConfiguration {
    /** What privilege to grant */
    grant: Array<string> | string;

    /** The objects to grant the privilege */
    on?: Array<string> | string;

    grantOption?: boolean;
 }

  /**
  * The file privilege configuration allows arrays of items for grant, on, 
  * and to in addition to single strings which to allow defining multiple
  * permissions easy.  This is used separate from roles/schemas thus the to
  * is required.
  */
interface IFilePrivilegesConfiguration extends IFileRoleSchemaPrivilegesConfiguration {
    /** The user that the privilege is being granted to */
    to: Array<string> | string;
    /** The Environments that the permissions are deployable to */
    environment?: Array<string> | string | IEnvrionment[];
    excludeEnvironment?: Array<string> | string | IEnvrionment[];
}

/**
 * The network acl configuration that can be standalone or configured for a user
 */
interface IFileNetworkAclConfiguration {
    host: Array<string> | string;
    username: Array<string> | string;
    port: string;
    upperport?: string;
    privilegeType: string;
    environment?: Array<string> | string | IEnvrionment[];
    excludeEnvironment?: Array<string> | string | IEnvrionment[];
}

interface IFileRoleConfiguration extends IDBRoleConfiguration {
    passwordType: PasswordSourceType;
    privileges?: IFilePrivilegesConfiguration[];
    environment?: string | Array<string> | IEnvrionment[];
    excludeEnvironment?: Array<string> | string;
}

/**
 * The schema configuration for a user in the config file
 */
interface IFileUserConfiguration extends IDBUserConfiguration {
    /** System and Object privileges for the user */
    privileges?: IFilePrivilegesConfiguration[];

    /** Network Acls for the user */
    networkAcls?: IFileNetworkAclConfiguration[];

    /** Environment to deploy code to */
    environment?: Array<string> | string;

    /** Environments to Exclude deployment to */
    excludeEnvironment?: Array<string> | string;
}

export interface IFileProfilesConfiguration extends IDBProfilesConfiguration {
    // Currently the same as the database
}

export interface IFileDirectoryConfiguration extends IDBDirectoryConfiguration {
    // Currently the same as the database
    environment?: string | Array<string>;
    excludeEnvironment?: Array<string> | string;
}

export interface IFileDatabaseLinkConfiguration extends IDBDatabaseLinkConfiguration {
    sourcePasswordType: DatabaseLinkPasswordSourceType;
    sourcePasswordVariableName?: string;
    environment?: Array<string> | string | IEnvrionment[];
    excludeEnvironment?: Array<string> | string;
}

export interface IFileTablespaceConfiguration extends ITablespaceConfiguration {
    // Currently the same as the runtime
}

/** The database configuration as defined in the config file */
export interface IFileDatabaseConfiguration {
    /** The userId of the data owner. Required when privileges are being applied. */
    dataOwnerUserId?: string;

    /** The list of tablespaces that should be created */
    tableSpaces?: IFileTablespaceConfiguration[];

    /** The list of profiles for the database */
    profiles?: IFileProfilesConfiguration[];

    /** The list of directories for the database */
    directories?: IFileDirectoryConfiguration[];

    /** The list of Database Links for the database */
    databaseLinks?: IFileDatabaseLinkConfiguration[];

    roles?: IFileRoleConfiguration[];

    /** The list of user schemas that should be created/configured */
    userSchemas?: IFileUserConfiguration[];

    /** The list of privileges for the database */
    privileges?: IFilePrivilegesConfiguration[];

    /** The list of network acls for the database */
    networkAcls?: IFileNetworkAclConfiguration[];

    excludedObjects?: Array<string>;
}

export interface IDatabaseConfigurationReturn {
    config: DatabaseConfiguration[];
    repoFiles: aza.IRepoFiles[]
}

/*****************************************************************************
 * Code to handle the database configuration
 */

/** The results of validation */
export interface IValidationResult {
    /** Value that indicates if validation was successful */
    success: boolean;

    /** Validation errors that occurred when not successful */
    errors?: string[];
}

/** The Database Configuration to drive the use of some Oracle Micro Services */
export class DatabaseConfiguration implements IDatabaseConfiguration {
    /** The path to the file that was used to generate the configuration */
    public filePath: string;

    /** The user ID of the data owner for the application.  Required when deploying privileges. */
    public dataOwner?: string;

    /** The git hash that is being released */
    public gitHash?: string;

    /** The tablespaces that should exist on the database */
    public tableSpaces?: ITablespaceConfiguration[];

    /** The profiles that should exist on the database */
    public profiles?: IProfilesConfiguration[];

    /** The Directories that should exist on the database */
    public directories?: IDirectoryConfiguration[];

    /** The Database Links that should exist on the database */
    public databaseLinks?: IDatabaseLinkConfiguration[];

    /** The users that should exist on the server and their associated configuration */
    public users?: IUserConfiguration[];

    /** The privileges that should be applied to the server that are not directly tied to user configuration */
    public privileges?: IPrivilegeConfiguration[];

    /** The network acls that should be applied to the server */
    public networkAcls?: INetworkAclConfiguration[];

    /** The roles for the server */
    public roles?: IRoleConfiguration[];

    /** The git repository associated with the configuration */
    public repo: aza.IAzureArtifactRepo;
    
    /** Roles and Users to Exclude from changing config for (Defaulted users and COTS schemas*/
    public excludedObjects?: Array<string>;

    /** Relative Path the the file used for configuration */
    public configFilePath?: string;
    
    /** Name of file for script */
    public configFileScriptName?: string;

    constructor(filePath: string, repo: aza.IAzureArtifactRepo, dataOwner?: string, gitHash?: string, tableSpaces?: ITablespaceConfiguration[], profiles?: IProfilesConfiguration[]
        , directories?: IDirectoryConfiguration[], databaseLinks?: IDatabaseLinkConfiguration[], users?: IUserConfiguration[], privileges?: IPrivilegeConfiguration[], 
        networkAcls?: INetworkAclConfiguration[], roles?: IRoleConfiguration[], excludedObjects?: Array<string>, configFilePath?: string, configFileScriptName?: string
        ) {
        this.dataOwner = dataOwner;
        this.gitHash = gitHash;
        this.tableSpaces = tableSpaces;
        this.profiles = profiles;
        this.directories = directories;
        this.databaseLinks = databaseLinks;
        this.users = users;
        this.privileges = privileges;
        this.networkAcls = networkAcls;
        this.roles = roles;
        this.filePath = filePath;
        this.repo = repo;
        this.excludedObjects = excludedObjects;
        this.configFilePath = configFilePath;
        this.configFileScriptName = configFileScriptName;
    }

    /** Validate the configuration */
    public validate(): IValidationResult {
        const toReturn = <IValidationResult>{success: true};
        const errors = new Array<string>();

        // Do we require a data owner
        if (this.hasPrivileges() && !this.dataOwner) {
            errors.push('Data Owner user ID required when managing privileges.  Set dataOwnerUserId in the configuration.');
        }

        // Do we require a git hash
        if (this.hasPrivileges() && !this.gitHash) {
            errors.push('Commit is required when managing privileges.');
        }

        // Validate users
        if (this.users) {
            this.users.forEach(u => this._appendAnyErrors(errors, this._validateUserConfiguration(u)));
        }

        if (errors.length > 0) {
            toReturn.success = false;
            toReturn.errors = errors;
        }

        return toReturn;
    }

    /**
     * Gets a value that determines if there are any privilege configuration items
     */
    public hasPrivileges(): boolean {
        // Check for any general privilege configuration
        if (this.privileges && this.privileges.length > 0) {
            return true;
        }

        // We do not have any if we make it here
        return false;
    }

    /**
     * Add any errors specified in toAdd to the addTo array
     * @param addTo Array that will be added to
     * @param toAdd The array that will be added to the first
     */
    private _appendAnyErrors(addTo: string[], toAdd?: string[]): void {
        if (toAdd) {
            toAdd.forEach(i => addTo.push(i));
        }
    }

    /**
     * Validate that the specified user configuration is valid. Returns any errors.
     * @param user The user configuration to validate
     */
    private _validateUserConfiguration(user: IUserConfiguration): string[] | undefined {
        const errors = new Array<string>();

        // Ensure valid profile aka userType
        switch (user.profile) {
            case UserProfileType.INL_LUA:
            case UserProfileType.INL_INTERFACE:
            case UserProfileType.INL_ELEVATED:
            case UserProfileType.INL_PFEXEMPT:
                // Valid do nothing
                break;
            
            default:
                errors.push(`User: ${user.name} Invalid User Type '${user.profile}'`);
        }

        return errors.length > 0 ? errors : undefined;
    }
}

/**
 * The DatabaseConfigurationBuild is uses to search repositories for json files and
 * build a DatabaseConfiguration object for each file that was found.
 */
export class DatabaseConfigurationBuilder {
    /**
     * Create a new DatabaseConfigurationBuilder for the specified list of repositories
     * @param repositories The list of repositories to build database configuration from
     */
    constructor(repositories: aza.IAzureArtifactRepo[], defaultWorkingDirectory: string) {
        this.repositories = repositories;
        this.defaultWorkingDirectory = defaultWorkingDirectory;
    }

    private repositories: Array<aza.IAzureArtifactRepo>;
    private defaultWorkingDirectory: string;

    /**
     * Build the list of database configurations that were found for the repositories
     */
    public build(): IDatabaseConfigurationReturn {
        const toReturn = Array<DatabaseConfiguration>();
        const files = Array<aza.IRepoFiles>(); 
        // Examine each repository for JSON files and build a configuration object for each file found in the repo
        for (const repo of this.repositories) {
            const configFiles = tl.findMatch(repo.repoPath, '**/*.json');
            
            // We use a file naming convention to determine what part of the configuration it may contain
            for (const f of configFiles) {
                const fileTest = f.toLowerCase();
                let config: DatabaseConfiguration;
                if (fileTest.endsWith('.tablespace.json')) {
                    config = this._buildTablespaceConfig(f, repo);
                }
                else if (fileTest.endsWith('.profile.json')) {
                    config = this._buildProfileConfig(f, repo);
                }
                else if (fileTest.endsWith('.directory.json')) {
                    config = this._buildDirectoryConfig(f, repo);
                }
                else if (fileTest.endsWith('.databaselink.json')) {
                    config = this._buildDatabaseLinkConfig(f, repo);
                }
                else if (fileTest.endsWith('.role.json')) {
                    config = this._buildRoleConfig(f, repo);
                }
                else if (fileTest.endsWith('.user.json')) {
                    config = this._buildUserConfig(f, repo);
                }
                else if (fileTest.endsWith('.privileges.json')) {
                    config = this._buildPrivilegesConfig(f, repo);
                }
                else if (fileTest.endsWith('.networkacls.json')) {
                    config = this._buildNetworkAclConfig(f, repo);
                }
                else if (fileTest.endsWith('.excludedobjects.json')) {
                    config = this._buildExcludedObjectsConfig(f, repo);
                }
                else {
                    // We did not match an expected convention so assume it contains whole config
                    config = this._buildDatabaseConfig(f, repo);
                }

                const reg = new RegExp(/\.|\\|\//, 'gi')
                const regBack = new RegExp(/\\/, 'gi')

                config.configFilePath = config.filePath.replace(regBack, '/').substring(this.defaultWorkingDirectory.length)
                config.configFileScriptName =  config.configFilePath.substring(1, config.configFilePath.length - 5).replace(reg, '_').replace(/ /g, '')
                files.push({repo: config.repo.repoUrl, branch: config.repo.branchName ,fileName: config.configFilePath})
                toReturn.push(config);             
            }
        }

        return {config: toReturn, repoFiles: files};
    }

    private _loadJsonObject(file: string): any {
        const fileContents = fs.readFileSync(file).toString();
        const cleanJson = stripJsonComments(fileContents);
        return JSON.parse(cleanJson);
        }

    private _buildTablespaceConfig(file: string, repo: aza.IAzureArtifactRepo, config?: IFileTablespaceConfiguration): DatabaseConfiguration {
        try {
            // @ts-ignore
            const tablespace = config ? config : <IFileTablespaceConfiguration>this._loadJsonObject(file);
        }
        catch (e) {
            console.error(`Error parsing JSON in file: ${file.replace(tl.getVariable('System.DefaultWorkingDirectory'),'')}`);
            throw(e)
        }
        
        const tablespace = config ? config : <IFileTablespaceConfiguration>this._loadJsonObject(file);
        const runtime = <ITablespaceConfiguration>{
            name: tablespace.name,
            blocksize: tablespace.blocksize,
            initialsize: tablespace.initialsize,
            maxsize: tablespace.maxsize,
            autoextend: tablespace.autoextend,
            instance: tablespace.instance,
            bigfile: tablespace.bigfile,
            temp: tablespace.temp,
            encrypt: tablespace.encrypt
        };

        return new DatabaseConfiguration(
            file,
            repo,
            undefined,
            undefined,
            new Array<ITablespaceConfiguration>(runtime),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined
        );
        
    }

    private _buildRoleConfig(file: string, repo: aza.IAzureArtifactRepo, config?: IFileRoleConfiguration): DatabaseConfiguration {
        try {
            // @ts-ignore
            const role = config ? config : <IFileRoleConfiguration>this._loadJsonObject(file);
        }
        catch (e) {
            console.error(`Error parsing JSON in file: ${file.replace(tl.getVariable('System.DefaultWorkingDirectory'),'')}`);
            throw(e)
        }

        const role = config ? config : <IFileRoleConfiguration>this._loadJsonObject(file);
        
        const runtime = <IRoleConfiguration>{
            name: role.name,
            passwordType: role.passwordType,
            roleDN: this._envrionmentConfig(role.roleDN),
            password: this._getRolePassword(role),
            environments: this._envrionmentArray(role.environment),
            excludeEnvironments: this._excludeEnvrionmentArray(role.excludeEnvironment)
            
        };

        let privs = undefined;
        if (role && role.privileges) {
            privs = this._buildDBPrivilegesConfiguration(role.privileges, role.name)
        }

        return new DatabaseConfiguration(
            file,
            repo,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            privs,
            undefined,
            new Array<IRoleConfiguration>(runtime),
            undefined
        );
    }

    private _getRolePassword(role: IFileRoleConfiguration): string | undefined {
        if (role.passwordType === undefined && role.roleDN === undefined) {
            return undefined;
        }

        if ((role.passwordType === 'Global' && role.roleDN === undefined) || (role.passwordType === undefined && role.roleDN)) {
            throw new Error(`Must have both a RoleDN and a passwordType of Global, you cannot only have one or the other!!!`);
        }

        switch (role.passwordType) {
            case PasswordSourceType.PipelineVariable:
                const password = this._getPassword('Role', role)

                if (!password) {
                    throw new Error(`No password found for Role Link '${role.name}' using ${role.passwordType}`);
                }

                return password;
            case PasswordSourceType.Global:
                return undefined;          
            
            default:
                throw new Error(`Invalid Role Password Source Type for Role: ${role.name} using ${role.passwordType}.  The valid values are ${PasswordSourceType}`);
        }
    }

    private _getPassword(pwType: string, pwSource: IFileRoleConfiguration | IFileUserConfiguration | IFileDatabaseLinkConfiguration, DBLinkOwner?: string, DBLinkPasswordVariable?: string) {
        const name = pwSource.name.toUpperCase();
        let passwordVariableName = '';
    
        if (pwType === 'Role') {
                passwordVariableName = `${name}.RolePassword`
            }
        else if (pwType === 'DBLink' && DBLinkPasswordVariable != null) {
                passwordVariableName = `${DBLinkPasswordVariable}.DBLinkPassword`
            }
        else if (pwType === 'DBLink' && DBLinkPasswordVariable == null) {
                passwordVariableName = `${DBLinkOwner}.${name}.DBLinkPassword`
            }
        else if (pwType === 'User') {
                passwordVariableName = `${name}.Password`
            }
        
        const password = tl.getVariable(passwordVariableName);

        return password
    }

    private _buildProfileConfig(file: string, repo: aza.IAzureArtifactRepo, config?: IFileProfilesConfiguration): DatabaseConfiguration {
        try {
            // @ts-ignore
            const profile = config ? config : <IFileProfilesConfiguration>this._loadJsonObject(file);
        }
        catch (e) {
            console.error(`Error parsing JSON in file: ${file.replace(tl.getVariable('System.DefaultWorkingDirectory'),'')}`);
            throw(e)
        }

        const profile = config ? config : <IFileProfilesConfiguration>this._loadJsonObject(file);

        const runtime = <IProfilesConfiguration>{
            name: profile.name,
            password_parameters: profile.password_parameters,
            resource_parameters: profile.resource_parameters
        };

        return new DatabaseConfiguration(
            file,
            repo,
            undefined,
            undefined,
            undefined,
            new Array<IProfilesConfiguration>(runtime),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined
        );
    }

    private _buildDirectoryConfig(file: string, repo: aza.IAzureArtifactRepo, config?: IFileDirectoryConfiguration): DatabaseConfiguration {
        try {
            // @ts-ignore
            const directory = config ? config : <IFileDirectoryConfiguration>this._loadJsonObject(file);
        }
        catch (e) {
            console.error(`Error parsing JSON in file: ${file.replace(tl.getVariable('System.DefaultWorkingDirectory'),'')}`);
            throw(e)
        }

        const directory = config ? config : <IFileDirectoryConfiguration>this._loadJsonObject(file);

        const runtime = <IDirectoryConfiguration>{
            name: directory.name,
            path: this._envrionmentConfig(directory.path),
            environments: this._envrionmentArray(directory.environment),
            excludeEnvironments: this._excludeEnvrionmentArray(directory.excludeEnvironment)
        };

        return new DatabaseConfiguration(
            file,
            repo,
            undefined,
            undefined,
            undefined,
            undefined,
            new Array<IDirectoryConfiguration>(runtime),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined
        );
    }

    private _buildDatabaseLinkConfig(file: string, repo: aza.IAzureArtifactRepo, config?: IFileDatabaseLinkConfiguration): DatabaseConfiguration {
        try {
            // @ts-ignore
            const databaselink = config ? config : <IFileDatabaseLinkConfiguration>this._loadJsonObject(file);
        }
        catch (e) {
            console.error(`Error parsing JSON in file: ${file.replace(tl.getVariable('System.DefaultWorkingDirectory'),'')}`);
            throw(e)
        }

        const databaselink = config ? config : <IFileDatabaseLinkConfiguration>this._loadJsonObject(file);

        const runtime = <IDatabaseLinkConfiguration>{
            name: databaselink.name,
            owner: databaselink.owner,
            connectionString: this._envrionmentConfig(databaselink.connectionString),
            sourceUserName: this._envrionmentConfig(databaselink.sourceUserName),
            sourceUserPassword: this._getDBLinkPassword(databaselink),
            environments: this._envrionmentArray(databaselink.environment),
            excludeEnvironments: this._excludeEnvrionmentArray(databaselink.excludeEnvironment)
        };

        return new DatabaseConfiguration(
            file,
            repo,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            new Array<IDatabaseLinkConfiguration>(runtime),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined
        );
    }

    private _getDBLinkPassword(databaseLink: IFileDatabaseLinkConfiguration): string | undefined {
        switch (databaseLink.sourcePasswordType) {
            case DatabaseLinkPasswordSourceType.PipelineVariable:
                const password = this._getPassword('DBLink', databaseLink, databaseLink.owner,databaseLink.sourcePasswordVariableName)

                if (!password) {
                    throw new Error(`No password found for Database Link '${databaseLink.owner}.${databaseLink.name}' using ${databaseLink.sourcePasswordType}`);
                }

                return password;

            case DatabaseLinkPasswordSourceType.CurrentUser:

                return 'CURRENT_USER';
            
            default:
                throw new Error(`Invalid Database Link Password Source Type for Database Link: ${databaseLink.name}`);
        }
    }

    private _buildUserConfig(file: string, repo: aza.IAzureArtifactRepo, config?: IFileUserConfiguration): DatabaseConfiguration {
        try {
            // @ts-ignore
            const user = config ? config : <IFileUserConfiguration>this._loadJsonObject(file);
        }
        catch (e) {
            console.error(`Error parsing JSON in file: ${file.replace(tl.getVariable('System.DefaultWorkingDirectory'),'')}`);
            throw(e)
        }

        const user = config ? config : <IFileUserConfiguration>this._loadJsonObject(file);
        const runtime = <IUserConfiguration>{
            name: user.name,
            password: this._getUserPassword(user),
            passwordDN: this._envrionmentConfig(user.passwordDN),
            passwordType: user.passwordType,
            gatekeeperProxyFlag: user.gatekeeperProxyFlag,
            expirePasswordFlag: user.expirePasswordFlag,
            quota: user.quota,
            profile: this._envrionmentConfig(user.profile),
            tablespace: this._envrionmentConfig(user.tablespace),
            accountStatus: this._envrionmentConfig(user.accountStatus),
            environments: this._envrionmentArray(user.environment),
            excludeEnvironments: this._excludeEnvrionmentArray(user.excludeEnvironment)
        };       

        let privs = undefined;
        if (user && user.privileges) {
            privs = this._buildDBPrivilegesConfiguration(user.privileges, user.name)
        }

        let acls = undefined;
        if (user && user.networkAcls) {
            acls = this._buildDBNetworkAclConfiguration(user.networkAcls);
        }

        return new DatabaseConfiguration(
            file,
            repo,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            new Array<IUserConfiguration>(runtime),
            privs,
            acls,
            undefined,
            undefined
        );
    }

    private _getUserPassword(user: IFileUserConfiguration): string | undefined | IEnvrionment[]{
            switch (user.passwordType) {
                case PasswordSourceType.PipelineVariable:
                    const password = this._getPassword('User', user)
    
                    if (!password && !user.passwordDN && user.expirePasswordFlag != true) {
                        throw new Error(`No password or PasswordDN found for user '${user.name}' using ${user.passwordType}`);
                    }
                    return password;
                case PasswordSourceType.Global:
                    if (user.passwordDN === undefined) {
                        throw new Error(`No PasswordDN found for user '${user.name}' when using ${user.passwordType}`);
                    }
                    return user.passwordDN;
                case PasswordSourceType.External:
                    if (user.passwordDN === undefined) {
                        throw new Error(`No PasswordDN found for user '${user.name}' when using ${user.passwordType}`);
                    }
                    return user.passwordDN;
                case PasswordSourceType.NoAuthentication:
                    return '<no_authentication>';
                default:
                    throw new Error(`Invalid Password Source Type: ${user.passwordType}`);
            }
        }

    private _buildPrivilegesConfig(file: string, repo: aza.IAzureArtifactRepo): DatabaseConfiguration {
        try {
            // @ts-ignore
            const privileges = new Array<IFilePrivilegesConfiguration>(this._loadJsonObject(file));
        }
        catch (e) {
            console.error(`Error parsing JSON in file: ${file.replace(tl.getVariable('System.DefaultWorkingDirectory'),'')}`);
            throw(e)
        }

        const privileges = new Array<IFilePrivilegesConfiguration>(this._loadJsonObject(file));

        const privs = this._buildDBPrivilegesConfiguration(privileges)

        return new DatabaseConfiguration(
            file,
            repo,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            privs,
            undefined,
            undefined,
            undefined
        );
    }

    private _buildNetworkAclConfig(file: string, repo: aza.IAzureArtifactRepo): DatabaseConfiguration {
        try {
            // @ts-ignore
            const fileAcls = new Array<IFileNetworkAclConfiguration>(this._loadJsonObject(file));
        }
        catch (e) {
            console.error(`Error parsing JSON in file: ${file.replace(tl.getVariable('System.DefaultWorkingDirectory'),'')}`);
            throw(e)
        }

        const fileAcls = new Array<IFileNetworkAclConfiguration>(this._loadJsonObject(file));

        const acls = this._buildDBNetworkAclConfiguration(fileAcls)

        return new DatabaseConfiguration(
            file,
            repo,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            acls,
            undefined,
            undefined
        );
    }


    private _buildDBPrivilegesConfiguration(config: IFilePrivilegesConfiguration[], owner?: string | undefined): IDBPrivilegeConfiguration[] {
        
        const allPrivileges = new Array<IDBPrivilegeConfiguration>();

        for (let u of config) {
            u.grant = u.grant || "null";
            u.on = u.on || "null";
            u.to = u.to || owner || "null";
            u.environment = this._envrionmentArray(u.environment) || "null";
            u.excludeEnvironment = this._excludeEnvrionmentArray(u.excludeEnvironment) || "null";
            u.grantOption = u.grantOption || false;

            // Check that the value is an array, otherwise convert to an array
            u.grant = Array.isArray(u.grant) ? u.grant : new Array(u.grant);
            u.on = Array.isArray(u.on) ? u.on : new Array(u.on);
            u.to = Array.isArray(u.to) ? u.to : new Array(u.to);
            u.environment =  Array.isArray(u.environment) ? u.environment : new Array(u.environment);
            u.excludeEnvironment = Array.isArray(u.excludeEnvironment) ? u.excludeEnvironment : new Array(u.excludeEnvironment);

            for (let g of u.grant) {
                for (let o of u.on) {
                    for (let t of u.to) {
                        allPrivileges.push(<IDBPrivilegeConfiguration>{grant: g, on: o, to: t, envrionment: u.environment, excludeEnvironment: u.excludeEnvironment, grantOption: u.grantOption })
                    }
                }
            }
        }
        return allPrivileges;
    }

    private _buildDBNetworkAclConfiguration(config: IFileNetworkAclConfiguration[]): IDBNetworkAclConfiguration[] {
        const allAcls = new Array<IDBNetworkAclConfiguration>();

        for (let a of config) {
            a.host = a.host || "null";
            a.port = a.port || "null";
            a.upperport = a.upperport || a.port || "null";
            a.username = a.username || "null";
            a.privilegeType = a.privilegeType || "null";
            a.environment = this._envrionmentArray(a.environment) || "null";
            a.excludeEnvironment = this._excludeEnvrionmentArray(a.excludeEnvironment) || "null";

            // Check that the value is an array, otherwise convert to an array
            a.host = Array.isArray(a.host) ? a.host : new Array(a.host);
            a.username = Array.isArray(a.username) ? a.username : new Array(a.username);
            a.environment =  Array.isArray(a.environment) ? a.environment : new Array(a.environment);
            a.excludeEnvironment = Array.isArray(a.excludeEnvironment) ? a.excludeEnvironment : new Array(a.excludeEnvironment);

            for (let host of a.host) {
                for (let user of a.username) {
                    allAcls.push(<IDBNetworkAclConfiguration>{host: host, username: user, port: a.port, upperport: a.upperport, privilegeType: a.privilegeType, envrionment: a.environment, excludeEnvironment: a.excludeEnvironment });
                }
            }
        }
        return allAcls;
    }

    private _buildExcludedObjectsConfig(file: string, repo: aza.IAzureArtifactRepo): DatabaseConfiguration {
        const excludedObjects = this._loadJsonObject(file);

        return new DatabaseConfiguration(
            file,
            repo,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            excludedObjects
        );
    }
    private _buildDatabaseConfig(file: string, repo: aza.IAzureArtifactRepo): DatabaseConfiguration {
        const configs = <IFileDatabaseConfiguration>(this._loadJsonObject(file));

        let tableSpaces = new Array<ITablespaceConfiguration>(); 
        if (configs && configs.tableSpaces) {
            for (let u of configs.tableSpaces) {
                const obj = this._buildTablespaceConfig(file, repo, u)
                if (obj && obj.tableSpaces) {
                    for (let v of obj.tableSpaces) {
                        tableSpaces.push(v)
                    }   
                }
            }
        }

        let profiles = new Array<IProfilesConfiguration>(); 
        if (configs && configs.profiles) {
            for (let u of configs.profiles) {
                const obj = this._buildProfileConfig(file, repo, u)
                if (obj && obj.profiles) {
                    for (let v of obj.profiles) {
                        profiles.push(v)
                    }   
                }
            }
        }

        let directories = new Array<IDirectoryConfiguration>(); 
        if (configs && configs.directories) {
            for (let u of configs.directories) {
                const obj = this._buildDirectoryConfig(file, repo, u)
                if (obj && obj.directories) {
                    for (let v of obj.directories) {
                        directories.push(v)
                    }   
                }
            }
        }

        let databaseLinks = new Array<IDatabaseLinkConfiguration>(); 
        if (configs && configs.databaseLinks) {
            for (let u of configs.databaseLinks) {
                const dbLink = this._buildDatabaseLinkConfig(file, repo, u)
                if (dbLink && dbLink.databaseLinks) {
                    for (let v of dbLink.databaseLinks) {
                        databaseLinks.push(v)
                    }   
                }
            }
        }

        let userSchemas = new Array<IUserConfiguration>(); 
        if (configs && configs.userSchemas) {
            for (let u of configs.userSchemas) {
                const obj = this._buildUserConfig(file, repo, u)
                if (obj && obj.users) {
                    for (let v of obj.users) {
                        userSchemas.push(v)
                    }   
                }
            }
        }

        let roles = new Array<IRoleConfiguration>(); 
        if (configs && configs.roles) {
            for (let u of configs.roles) {
                const obj = this._buildRoleConfig(file, repo, u)
                if (obj && obj.roles) {
                    for (let v of obj.roles) {
                        roles.push(v)
                    }   
                }
            }
        }

        let privs = new Array<IDBPrivilegeConfiguration>();
        if (configs && configs.privileges) {
            const filePrivs = this._buildDBPrivilegesConfiguration(configs.privileges)
            filePrivs.forEach(
                u => privs.push(u)
            )
        }

        let networkAcls = new Array<IDBNetworkAclConfiguration>();
        if (configs && configs.networkAcls) {
            const fileAcls = this._buildDBNetworkAclConfiguration(configs.networkAcls);
            fileAcls.forEach(
                a => networkAcls.push(a)
            );
        }

        if (configs && configs.roles) {
            for (let i of configs.roles) {
                if (i.privileges) {
                    const filePrivs = this._buildDBPrivilegesConfiguration(i.privileges)
                    filePrivs.forEach(
                        u => privs.push(u)
                    )
                }
            }
        }
        
        if (configs && configs.userSchemas) {
            for (let i of configs.userSchemas) {
                if (i.privileges) {
                    const filePrivs = this._buildDBPrivilegesConfiguration(i.privileges)
                    filePrivs.forEach(
                        u => privs.push(u)
                    )
                }
            }
        }
        
        return new DatabaseConfiguration(
            file,
            repo,
            configs.dataOwnerUserId,
            undefined,
            tableSpaces,
            profiles,
            directories,
            databaseLinks,
            userSchemas,
            privs.length !== 0 ? privs : undefined,
            networkAcls.length !== 0 ? networkAcls : undefined,
            roles,
            configs.excludedObjects
        )
    }

    private _envrionmentConfig(input: string | IEnvrionment[] | undefined): IEnvrionment[]{
        const toReturn = new Array<IEnvrionment>();
        if(typeof(input) === 'string') {
            toReturn.push(<IEnvrionment>{
                environment: 'DEFAULT',
                value: input
            })
            return toReturn 
        }
        else if (typeof(input) === 'undefined'){
            toReturn.push(<IEnvrionment>{
                environment: 'DEFAULT',
                value: '<NULL>'
            })
            return toReturn
        }
        else if (Array.isArray(input)){
            for (let u of input){
                if (Array.isArray(u.environment)){
                    for (let i of u.environment){
                        toReturn.push(<IEnvrionment>{
                            environment: i,
                            value: u.value
                        })
                    }
                }
                else {
                    toReturn.push(u)
                }
            }
            return toReturn
        }
        return input
    }

    private _envrionmentArray(input: string | Array<string> | undefined | IEnvrionment[]): Array<IEnvrionment>{
        const toReturn = new Array<IEnvrionment>();
        if(typeof(input) === 'string') {
            toReturn.push(<IEnvrionment>{environment: input})
        }
        else if (typeof(input) === 'undefined') {
            toReturn.push(<IEnvrionment>{environment: 'DEFAULT'})
        }
        else if (Array.isArray(input)){
            for (let u of input) {
                toReturn.push(<IEnvrionment>{environment: u})
            }
        }
        else {
            return input
        }
        return toReturn
    }

    private _excludeEnvrionmentArray(input: string | Array<string> | undefined | IEnvrionment[]): Array<IEnvrionment>{
        const toReturn = new Array<IEnvrionment>();
        if(typeof(input) === 'string') {
            toReturn.push(<IEnvrionment>{excludeEnvironment: input})
        }
        else if (typeof(input) === 'undefined') {
            toReturn.push(<IEnvrionment>{excludeEnvironment: 'NONE'})
        }
        else if (Array.isArray(input)){
            for (let u of input) {
                toReturn.push(<IEnvrionment>{excludeEnvironment: u})
            }
        }
        else {
            return input
        }
        return toReturn
    }
}