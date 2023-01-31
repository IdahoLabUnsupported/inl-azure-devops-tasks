'use strict';

import * as os from 'os';
import * as path from 'path';
import * as tl from 'azure-pipelines-task-lib/task';
import * as tr from 'azure-pipelines-task-lib/toolrunner';
import * as gd from './GitCommon';
import * as gen from './DatabaseConfiguration/SqlScriptGeneration';
import * as config from './DatabaseConfiguration/Configuration';
import { isNumber } from 'util';
import * as aza from './DatabaseConfiguration/AzureArtifacts';

/**
 * Input Type enum
 */
export enum InputType {
    Script = 'Script',
    File = 'ScriptFile',
    AutoMagic = 'AutoMagic',
    DatabaseConfiguration = 'DatabaseConfiguration'
}

/** SqlPlus Output type enum */
export enum SqlPlusOutputType {
    Standard,
    Warning,
    Error
}

/**
 * Interface for sqlplus Input
 */
export interface ISqlPlusInput {
    /** The type of input for sqlplus */
    type: InputType;

    /** The content for the input */
    content: string | undefined;

    /** optional. Array of substitution variables that will be passed to sqlplus */
    substitutionVariables: Array<ISubstitutionVariable>;

    /** Prepare the input if needed and validate that we have what we need.  If the input is not valid an error will be thrown.
     * @param isUseSubstitutionVariables Optional Is substitution variables enabled.
    */
    prepareAndValidate(isUseSubstitutionVariables?: boolean): void;
}

/** Interface for substitution variables */
export interface ISubstitutionVariable {
    /** The Name of the substitution variable */
    name: string;

    /** The Value of the substitution variable */
    value: string;
}

/** Interface for setup/sourcing sqlplus binary */
export interface ISqlPlusToolSource {
    /** The path to the sqlplus binary */
    path: string;

    /** The name of the sqlplus binary ie: sqlplus.exe */
    binaryName: string;

    /** A value that indicates if this is a valid source for sqlplus */
    isValid: boolean;

    /** Prepare sqlplus if needed and validate that it is available.  If the tool is not available an error will be thrown. */
    prepareAndValidate(): void;
}

export interface IAppConfigurationOptions {
    /** The path to the application configuration file. */
    configFilePath: string;

    /** The path to where the micro services are located */
    microServicesRootPath?: string;

    /** The git hash that is being released */
    gitHash?: string;
}

/**
 * Interface for sqlplus configuration
 */
export interface ISqlPlusConfiguration {
    /** User name that will be used for the connection */
    userName: string;

    /** Password that will be used for the connection */
    userPassword: string;

    /** The Hostname that will be used for the connection */
    hostname: string;

    /** The Port that will be used for the connection */
    port: number;

    /** The Service name that will be used for the connection */
    serviceName: string;

    /** optional. The path the temporary script will be written to when executing sqlplus.  defaults to System.DefaultWorkingDirectory variable. */
    tempScriptPath?: string;

    /** optional. Where should sqlplus be used/sourced from.  defaults to installed on agent machine in path. */
    toolSource: ISqlPlusToolSource;

    /** optional. Fail execution if a sql error is encountered. defaults to true */
    isFailOnSqlError: boolean;

    /** optional. Should sqlplus output the statements being executed. defaults to false */
    isDebug: boolean;

    /** optional. Should warnings actually be warnings in the pipeline.  defaults to true. */
    isShowWarnings?: boolean;

    /** The character that will be used to identify substitution variables */
    substitutionCharacter: string;

    /** optional.  Should substitution variables be used in the script.  defaults to true. */
    isUseSubstitutionVariables?: boolean;

    /** optional.  Should we define the escape character for the script.  defaults to true. */
    isDefineEscape?: boolean;

    /** optional. The number of seconds used to test the connection for the deployment.  defaults to 15 seconds */
    sqlConnectionTimeout?: number;

    /** optional. Will turn on SERVEROUTPUT, defaults to false */
    isServerOutput?: boolean;
    
    /** optional Will allow to login as proxy user */
    sqlProxyUser?: string;

    /** optional Will allow for database privileges to be run after developer code */
    runPostConfig?: boolean;
}

/** Represents sqlplus installed on the agent machine */
export class InstalledSqlPlusSource implements ISqlPlusToolSource {
    public path: string;
    public binaryName: string;
    public isValid: boolean;

    constructor() {
        this.path = '';
        this.binaryName = 'sqlplus';
        this.isValid = false;
    }

    public prepareAndValidate(): void {
        this.path = tl.which('sqlplus', true);
        this.binaryName = path.basename(this.path);
        this.isValid = true;
    }
}

/** Represents the standard input that will be used for sqlplus */
export class StandardSqlPlusInput implements ISqlPlusInput {
    public type: InputType;
    public content: string | undefined;
    public substitutionVariables: Array<ISubstitutionVariable>;

    constructor() {
        this.type = InputType.File;
        this.content = '';
        this.substitutionVariables = new Array();
    }

    public prepareAndValidate(isUseSubstitutionVariables?: boolean): void {
        if ((this.type === InputType.File || this.type === InputType.Script) && (this.content === '' || this.content === undefined)) {
            throw new Error(tl.loc('NoInputContentError'));
        }
        if (this.type === InputType.File && this.content && !tl.exist(this.content)) {
            throw new Error(tl.loc('ScriptFileNotFoundError', this.content));
        }
        if (!isUseSubstitutionVariables && this.substitutionVariables.length > 0) {
            throw new Error(tl.loc('SubstitutionError'));
        }
    }
}

/** Represents a auto generated input file for sqlplus */
export class AutoMagicSqlPlusInput implements ISqlPlusInput {
    public type: InputType;
    public content: string | undefined;
    public substitutionVariables: Array<ISubstitutionVariable>;
    public gitConfig: gd.IGitConfiguration;

    constructor() {
        const repoLocation = tl.getInput('RepoLocation', true)
        this.type = InputType.AutoMagic;
        this.content = path.join(repoLocation !== undefined ? repoLocation : '' , 'deployment.sql');
        this.substitutionVariables = new Array();
        this.gitConfig = <gd.IGitConfiguration>{
            startCommit: tl.getInput('StartCommit', true),
            endCommit: tl.getInput('EndCommit', true),
            directory: tl.getInput('RepoLocation', true),
            excludeExtension: '.json' // We will exclude json files for now
        };
    }

    public prepareAndValidate(isUseSubstitutionVariables?: boolean): void {
        if (this.type !== InputType.AutoMagic) {
            throw new Error(tl.loc('InputTypeError'));
        }

        if (!isUseSubstitutionVariables && this.substitutionVariables.length > 0) {
            throw new Error(tl.loc('SubstitutionError'));
        }

        // Generate the deployment.sql file
        tl.cd(this.gitConfig.directory);
        const gitdiff: gd.GitDiffRunner = new gd.GitDiffRunner(this.gitConfig);
        gitdiff.exec();

        // validate the file exists
        if (this.content && !tl.exist(this.content)) {
            throw new Error(tl.loc('ScriptFileNotFoundError', this.content));
        }
    }
}

export class DatabaseConfigurationInput implements ISqlPlusInput {
    public type: InputType;
    public content: string | undefined;
    public substitutionVariables: Array<ISubstitutionVariable>;
    public DatabaseGitConfig: gd.IGitConfiguration;
    public repoLocation: string;
    sqlFile: string = 'deployment.sql'

    constructor() {
        this.repoLocation = tl.getVariable('System.DefaultWorkingDirectory')
        this.type = InputType.DatabaseConfiguration;
        this.content = path.join(this.repoLocation !== undefined ? this.repoLocation : '' , this.sqlFile);
        this.substitutionVariables = new Array();
        this.DatabaseGitConfig = <gd.IGitConfiguration>{
            directory: this.repoLocation
        };
    }

    public prepareAndValidate(isUseSubstitutionVariables?: boolean): void {
        if (this.type !== InputType.DatabaseConfiguration) {
            throw new Error(tl.loc('InputTypeError'));
        }

        if (!isUseSubstitutionVariables && this.substitutionVariables.length > 0) {
            throw new Error(tl.loc('SubstitutionError'));
        }

        // Do the work needed to generate our deployment.sql file
        this._generateDeploymentSqlScript();
    }

    private _generateDeploymentSqlScript(): void {
        const artifactBase = this.repoLocation;
        const configScriptRoot = path.join(artifactBase, 'configDeployment');
        const deploymentScript = path.join(artifactBase, this.sqlFile);
        const repos = aza.getAzureArtifactRepos(artifactBase);
        const configBuilder = new config.DatabaseConfigurationBuilder(repos, this.repoLocation);
        const dbConfigs = configBuilder.build();
        const scriptBuilder = new gen.ConfigurationScriptGenerator(dbConfigs.config, configScriptRoot, deploymentScript, repos, this.repoLocation, dbConfigs.repoFiles);
        scriptBuilder.prepareDirectoryStructure();
        scriptBuilder.buildDeploymentSqlScript();
    }
}

/** Provides the ability to execute sqlplus */
export class SqlPlusRunner {
    /** The configuration for the sqlplus runner */
    public config: ISqlPlusConfiguration;

    /** A value that indicates if the last execute was successful. */
    public isSuccess: boolean;

    constructor(configuration: ISqlPlusConfiguration) {
        if (!configuration) {
            throw new Error('Parameter \'configuration\' cannot be null or empty');
        }

        this.config = configuration;
        this.isSuccess = false;
        this._validateOrDefaultConfig();
        this._debugConfiguration();
        this.toolOptions = <tr.IExecOptions>{ failOnStdErr: true, silent: true };
        this.currentInput = <ISqlPlusInput>{};
        this.tempScriptFile = path.join(<string>this.config.tempScriptPath, 'SqlplusTempScript.sql');
    }

    /**
     * Execute the script on the configured connection
     * @param sqlScript The sql script that will be executed
     */
    public async exec(sqlScript: ISqlPlusInput): Promise<number> {
        this._debugScript(sqlScript);
        sqlScript.prepareAndValidate(this.config.isUseSubstitutionVariables);
        this.currentInput = sqlScript;

        // Make sure we can run sqlplus.  An error will be thrown if we cannot
        if (!this.config.toolSource.isValid) {
            this.config.toolSource.prepareAndValidate();
        }

        // Make sure the working directory is where the temp script is located
        const scriptDir: string = path.dirname(this._getTempScriptPath());
        if (tl.cwd() !== scriptDir) {
            tl.cd(scriptDir);
        }
       
        await this._testSqlConnection();

        console.log('\n------------- Begin Script Execution -------------\n');

        this.isSuccess = true;  // Default to true unless there is a reason to fail
        this._writeTempScript();
        const tool = this._createSqlPlusRunner();
        const code: number = await tool.exec(this.toolOptions);

        console.log('\n------------- End Script Execution -------------\n');
        
        if (code !== 0) {
            this.isSuccess = false;
        }

        return code;
    }

    private toolOptions: tr.IExecOptions;
    private currentInput: ISqlPlusInput;
    private tempScriptFile: string;

    private async _testSqlConnection() : Promise<void> {
        console.log('\n------------- Begin SQL Connection Test -------------\n');

        const connCheck = this._testSqlConnectionRunner();

        const exitCode = await connCheck;

        if (exitCode !== 0) {
            this.isSuccess = false;
            throw new Error(`ORA-00000: Initial Test Connection Timeout occurred after ${this.config.sqlConnectionTimeout} second(s).`);
        }

        console.log(`\nSQL Connection Exit Code: ${exitCode}`);
        console.log('\n------------- End SQL Connection Test -------------\n');
    }

    private async _testSqlConnectionRunner(): Promise<number> {
        if (this.config.sqlConnectionTimeout) {
            console.log(`Connection Timeout Threshold: ${this.config.sqlConnectionTimeout} Second(s)\n`);

            let id:any

            const timeout = new Promise<number>((resolve, reject) => {
                id = setTimeout(() => {
                    clearTimeout(id);
                    resolve(-1);
                    reject(new Error(`Error!!! Initial Connection Test had an error.`));
                }, this.config.sqlConnectionTimeout! * 1000);
            });
        
            const tool = this._createSqlPlusConnectionTester();
            
            let toolExec = await tool.exec(this.toolOptions)

            const run = new Promise<number>((resolve,reject) => {
                const toolRun = toolExec
                clearTimeout(id);
                resolve(toolRun);
                reject(new Error(`Error!!! in running tool`));
            })

            // Returns a race between our timeout and the passed in promise
            const sqlConnCode = Promise.race([
                run,
                timeout
            ]);

            return sqlConnCode;
        }

        throw new Error('No Connection Timeout defined');
    }

    private _validateOrDefaultConfig() {
        if (this.config.tempScriptPath === undefined || this.config.tempScriptPath === '') {
            this.config.tempScriptPath = tl.getVariable('System.DefaultWorkingDirectory');
        }
        if (this.config.isFailOnSqlError === undefined) {
            this.config.isFailOnSqlError = true;
        }
        if (this.config.isShowWarnings === undefined) {
            this.config.isShowWarnings = true;
        }
        if (this.config.isDebug === undefined) {
            this.config.isDebug = false;
        }
        if (this.config.isUseSubstitutionVariables === undefined) {
            this.config.isUseSubstitutionVariables = true;
        }
        if (this.config.isDefineEscape) {
            this.config.isDefineEscape = true;
        }
        if (this.config.toolSource === undefined) {
            this.config.toolSource = new InstalledSqlPlusSource();
        }
        /* Default setting for sqlConnectionTimeout set to 15 seconds*/
        if (Number.isNaN(this.config.sqlConnectionTimeout!) || !isNumber(this.config.sqlConnectionTimeout)) {
            this.config.sqlConnectionTimeout = 15;
        }
        if(this.config.isServerOutput === undefined) {
           this.config.isServerOutput = false
        }
        if(this.config.runPostConfig === undefined) {
            this.config.runPostConfig = false
        }
    }

    private _debugConfiguration() {
        tl.debug('------------ SqlPlusRunner Configuration ------------');
        tl.debug(`config.userName=${this.config.userName}`);
        tl.debug(`config.userPassword=${this.config.userPassword}`);
        tl.debug(`config.hostname=${this.config.hostname}`);
        tl.debug(`config.port=${this.config.port}`);
        tl.debug(`config.serviceName=${this.config.serviceName}`);
        tl.debug(`config.sqlProxyUser=${this.config.sqlProxyUser}`);
        tl.debug(`config.tempScriptPath=${this.config.tempScriptPath}`);
        tl.debug(`config.isFailOnSqlError=${this.config.isFailOnSqlError}`);
        tl.debug(`config.isShowWarnings=${this.config.isShowWarnings}`);
        tl.debug(`config.isDebug=${this.config.isDebug}`);
        tl.debug(`config.isDefineEscape=${this.config.isDefineEscape}`);
        tl.debug(`config.isUseSubstitutionVariables=${this.config.isUseSubstitutionVariables}`);
        tl.debug(`config.substitutionCharacter=${this.config.substitutionCharacter}`);
        tl.debug(`config.sqlConnectionTimeout=${this.config.sqlConnectionTimeout}`);
        tl.debug(`config.isServerOutput=${this.config.isServerOutput}`);
        tl.debug(`config.runPostConfig=${this.config.runPostConfig}`);
        tl.debug('-----------------------------------------------------');
    }

    private _debugScript(sqlScript: ISqlPlusInput) {
        tl.debug(`script.type=${sqlScript.type.toString()}`);
        tl.debug(`script.content=${sqlScript.content}`);
        let subVars = '';
        sqlScript.substitutionVariables.forEach((x) => {
            subVars += `{${x.name}=${x.value}},`;
        });
        tl.debug(`script.substitutionVariables=[${subVars}]`);
    }

    private _getConnection() {
        const proxyUser = this._sqlProxyUser();
        const sysdba = this._sysdbaUser();
        return `${this.config.userName}${proxyUser}/"${this.config.userPassword}"@${this.config.hostname}:${this.config.port}/${this.config.serviceName}${sysdba}`;
    }

    private _sqlProxyUser() {
        
        let proxyUser: string|undefined;
        if (this.config.sqlProxyUser == '$(DatabaseProxyUser)' || this.config.sqlProxyUser == undefined) {
            proxyUser = "";
        }

        else {
            proxyUser = `[${this.config.sqlProxyUser}]`;
        }

        return proxyUser;
    }

    private _sysdbaUser() {

        let sysdba: string|undefined;
        const username: string = this.config.userName;
        if (username.toUpperCase() == 'SYS') {
            sysdba = ' as sysdba';
        } else {
            sysdba = '';
        }

        return sysdba;
    }

    private _createSqlPlusRunner(): tr.ToolRunner {
        const silentOption = this.config.isDebug ? '' : '-s';
        const dbConnection = this._getConnection();
        const sqlPlusArguments = `${silentOption} ${dbConnection} @${path.basename(this.tempScriptFile)}`;
        const sqlplus = tl.tool(this.config.toolSource.path).line(sqlPlusArguments);
        sqlplus.on('stdout', data => {
            this._processStandardOut(data);
        });
        sqlplus.on('stderr', data => {
            this._processStandardError(data);
        });

        // Log the command since we are using silent options the tool runner will not do it
        console.log(`[command] ${this.config.toolSource.path} ${sqlPlusArguments}`);

        return sqlplus;
    }

    private _createSqlPlusConnectionTester(): tr.ToolRunner {
        // @ts-ignore
        const silentOption = this.config.isDebug ? '' : '-s';
        const dbConnection = this._getConnection();
        const failOnError = ' -l';
        
        // This tells sqlplus where the initialConnection.sql file is located using an absolute path to avoid errors.
        const testConnectionLocation = path.join(__dirname, 'Sql_Scripts', 'initialConnection.sql');
        const sqlPlusArguments = `${silentOption}${failOnError} ${dbConnection} @${testConnectionLocation}`;
        const sqlplus = tl.tool(this.config.toolSource.path).line(sqlPlusArguments);
        sqlplus.on('stdout', data => {
            this._processStandardOut(data);
        });
        sqlplus.on('stderr', data => {
            this._processStandardError(data);
        });

        // Log the command since we are using silent options the tool runner will not do it
        console.log(`[command] ${this.config.toolSource.path} ${sqlPlusArguments}`);

        return sqlplus;
    }

    private _getTempScriptPath(): string {
        // If we have input that is a script file we will use that path otherwise use temp script path
        let filePath = this.tempScriptFile;
        if (this.currentInput !== undefined && this.currentInput.content !== undefined && (this.currentInput.type === InputType.File || this.currentInput.type === InputType.AutoMagic || this.currentInput.type === InputType.DatabaseConfiguration)) {
            filePath = path.join(path.dirname(this.currentInput.content), path.basename(this.tempScriptFile));
        }

        return filePath;
    }

    private _getSqlScript(): string {
        // When a script make sure we end with a semi-colon
        if (this.currentInput.type === InputType.Script && this.currentInput.content && !this.currentInput.content.endsWith(';')) {
            this.currentInput.content += ';';
        }

        // Build out the parts to the script we will need to feed sqlPlus
        const sqlEscape: string = this.config.isDefineEscape ? 'SET ESCAPE \\' : '';
        const sqlExitOnError: string = this.config.isFailOnSqlError ? 'WHENEVER SQLERROR EXIT SQL.SQLCODE;' : '';
        const sqlSetDefine: string = this._defineSubstitutionCharacter();
        const sqlSubVariables: string = this._defineSubstitutionVariables();
        const sqlServerOutput: string = this._defineServerOutput();
        const sqlScript: string | undefined = (this.currentInput.content && (this.currentInput.type === InputType.File || this.currentInput.type === InputType.AutoMagic || this.currentInput.type === InputType.DatabaseConfiguration)) 
                                                    ? `@${path.basename(this.currentInput.content)}` : this.currentInput.content;
        const postConfig: string = this._runPostConfig();

        // Now build the script
        const sql: string = `SET ECHO ON
SET LINESIZE 9999;
SET PAGESIZE 9999;
${sqlServerOutput}
${sqlEscape}
${sqlSetDefine}
${sqlExitOnError}
${sqlSubVariables}
SET SQLBLANKLINES ON

select to_char(systimestamp, 'dd-MON-yyyy hh:mm:ss.FF3 AM') DEPLOYMENT_START_TIME from dual;

${sqlScript}

select to_char(systimestamp, 'dd-MON-yyyy hh:mm:ss.FF3 AM') DEPLOYMENT_FINISH_TIME from dual;

${postConfig}
exit;`;
        console.log('----------------- Deployment Script -----------------\n')
        console.log(sql)
        console.log('\n--------------- End Deployment Script ---------------\n')

        return sql;
    }

    private _defineSubstitutionCharacter(): string {
        let result: string = 'SET DEFINE OFF';

        if ((this.config.isUseSubstitutionVariables)&&(this.config.substitutionCharacter != 'OFF')){
            result = `SET DEFINE "${this.config.substitutionCharacter}"`;
        }

        return result;
    }

    private _defineServerOutput(): string {
        let result: string = 'SET SERVEROUTPUT OFF';

        if (this.config.isServerOutput) {
            result = 'SET SERVEROUTPUT ON';
        }

        return result;
    }

    private _defineSubstitutionVariables(): string {
        let result: string = '';

        this.currentInput.substitutionVariables.forEach(v => {
            /**
             * Note: We are escaping all & in the values to not treat them as a substitution variable name.
             * That will prevent chaining in the values, but can be solved by variables in the task inputs.
             */
            const value = this.config.isDefineEscape ? v.value.replace('&', '\\&') : v.value;
            result += `DEFINE ${v.name} = ${value};
`;
        });

        return result;
    }
    

    private _writeTempScript() {
        const sql = this._getSqlScript();
        const filePath: string = this._getTempScriptPath();
        console.log(`${sql} ==> ${filePath}`);
        tl.writeFile(filePath, sql);

        // Write blank login.sql to try an get rid of the error that it cannot load the file
        const loginSqlPath = path.join(path.dirname(filePath), 'login.sql');
        tl.writeFile(loginSqlPath, ' ');
    }

    private _processStandardOut(data: any) {
        const lines = this._parseToLines(data);
        lines.forEach(l => {
            const type: SqlPlusOutputType = getOutputType(l);
            if (type === SqlPlusOutputType.Error && this.config.isFailOnSqlError) {
                tl.error(l);
                this.isSuccess = false;  // Flag incase sqlplus exits with code 0
            } else if (type === SqlPlusOutputType.Warning && this.config.isShowWarnings) {
                tl.warning(l);
            } else {
                console.log(l);
            }
        });
    }

    private _processStandardError(data: any) {
        const lines = this._parseToLines(data);
        lines.forEach(l => {
            tl.error(l);
            this.isSuccess = false;  // Flag incase sqlplus exits with code 0
        });
    }

    private _parseToLines(data: any): Array<string> {
        const result: Array<string> = new Array();

        try {
            let s: string = data.toString();
            let n: number = s.indexOf(os.EOL);

            while (n > -1) {
                const line = s.substring(0, n);
                result.push(line);

                // Parse the rest of the string
                s = s.substring(n + os.EOL.length);
                n = s.indexOf(os.EOL);
            }

            if (s) {
                result.push(s);
            }
        } catch (err) {
            tl.debug(`Error processing line: ${err}`);
        }

        return result;
    }

    private _runPostConfig(): string{
        if (this.config.runPostConfig) {
            return `BEGIN\nGATEKEEPER.RUN_CONFIG_PRIVILEGES();\nEND;\n\/`
        }
        else {
            return '';
        }
    }
}

/** Parse InputType string to enum */
export function parseInputType(input: string | undefined): InputType {
    const type = <InputType>input;
    if (type === undefined) {
        return InputType.File;
    }

    return type;
}


/** Get the SqlPlusInput based on the input type */
export function getSqlScript(inputType: InputType): ISqlPlusInput {
    let toReturn: ISqlPlusInput;

    if (inputType === parseInputType('ScriptFile')) {
        toReturn = new StandardSqlPlusInput();
        toReturn.content = tl.getPathInput('SQLScriptPath', true, true);
    } else if (inputType === parseInputType('Script')) {
        toReturn = new StandardSqlPlusInput();
        toReturn.content = tl.getInput('SQLScript', true);
    } else if (inputType === parseInputType('AutoMagic')) {
        toReturn = new AutoMagicSqlPlusInput();
    } else if (inputType === parseInputType('DatabaseConfiguration')) {
        toReturn = new DatabaseConfigurationInput();
    } else {
        throw Error(tl.loc('UnknownInputTypeError', inputType));
    }

    // Set common properties
    toReturn.type = inputType;
    toReturn.substitutionVariables = parseSubstitutionVariables(tl.getInput('Parameters'));

    return toReturn;
}

/** Parse parameterized substitution variables into an Array<ISubstitutionVariable> */
export function parseSubstitutionVariables(variables: string | undefined): Array<ISubstitutionVariable> {
    const list: Array<ISubstitutionVariable> = new Array();

    // Do not continue if there is nothing to parse
    if (!variables) {
        return list;
    }

    // Helper variables
    const paramRegEx = new RegExp(`[^\\s"']+|"([^"]*)"|'([^']*)'`, 'gi');
    let match;
    let matchCount: number = 0;
    let name: string = '';

    // Match variables in pairs from a parameterized input
    while ((match = paramRegEx.exec(variables)) !== null) {
        matchCount++;
        if (matchCount === 1) {
            name = match[0].substr(1); // Remove the "-" from the name
        }
        if (matchCount === 2) {
            const subVar = <ISubstitutionVariable>{ name: name, value: match[0] };
            matchCount = 0;
            list.push(subVar);
        }
    }

    return list;
}

export function getOutputType(line: string): SqlPlusOutputType {
    // Determine what should be an error. Everything with the error regex will always be considered an error.
    // The possible error regex will be considered errors, but examined to see if it should be a warning
    // like SP2-0804: Procedure created with compilation warnings which is just a warning
    // SP2-0310: unable to open file "LOGIN.SQL"    will be ignored as it does not prevent the script from executing.
    const errorRegEx = new RegExp('(?!ORA-28002:)ORA-\\d+:|PLS-\\d+:|ERROR at line|created with compilation errors', 'gi');
    const possibleErrorRegEx = new RegExp('SP2-(?!(?:08[0-1][0-9]|082[0-6]|0556))\\d+:', 'gi');
    const warningRegEx = new RegExp('PLW-\\d+:|SP2-(08[0-1][0-9]|082[0-6]|0556):|created with compilation warnings|ORA-28002:', 'gi');

    if (errorRegEx.test(line)) {
        return SqlPlusOutputType.Error;
    }
    if (possibleErrorRegEx.test(line)) {
        // Login.sql error is getting wrapped to the next line so handle that with sp2-0310 having nothing after it
        if (line.toLowerCase().includes('sp2-0310: unable to open file "login.sql"')
            || line.trim().toLowerCase() === "sp2-0310:") {
            return SqlPlusOutputType.Standard;
        }
        if (line.toLowerCase().includes('created with compilation warnings')) {
            return SqlPlusOutputType.Warning;
        }

        return SqlPlusOutputType.Error;
    }
    if (warningRegEx.test(line)) {
        return SqlPlusOutputType.Warning;
    }


    // We have standard output when we make it here
    return SqlPlusOutputType.Standard;
}