'use strict';

import * as tl from 'azure-pipelines-task-lib/task';
import * as tr from 'azure-pipelines-task-lib/toolrunner';

/**
 * Interface for Git configuration
 */
export interface IGitConfiguration {
    /** User name that will be used for the connection */
    startCommit: string;

    /** Password that will be used for the connection */
    endCommit: string;

    /** The Hostname that will be used for the connection */
    directory: string;
}

/** Provides the ability to execute sqlplus */
export class GitDiffRunner {
    /** The configuration for the sqlplus runner */
    public config: IGitConfiguration;

    /** A value that indicates if the last execute was successful. */
    public isSuccess: boolean;

    constructor(configuration: IGitConfiguration) {
        if (!configuration) {
            throw new Error('Parameter \'configuration\' cannot be null or empty');
        }

        this.config = configuration;
        this.isSuccess = false;
        this._validateOrDefaultConfig();
    }

    /**
     * Execute the script on the configured connection
     * @param sqlScript The sql script that will be executed
     */
    public exec(): void {

        console.log('------------- Begin Git diff Execution -------------');

        this.isSuccess = true;  // Default to true unless there is a reason to fail
        const tool = this._createGitDiffRunner();
        const options = <tr.IExecOptions>{
            failOnStdErr: true
        };
        const result = tool.execSync(options);
        // Make sure git ran successfully
        if (result.code !== 0) {
            throw new Error(tl.loc('GitExitCodeError', result.code));
        }
        const gitDiff = result.stdout;
        const diffArray = gitDiff.split('\n');
        /*Prepare items into executable format*/
        diffArray.forEach(function (element: string, index: number, array: string[]) {

            array[index] = '@' + element + ';';

        });

        /*Reorder items into safe run order */
        const functionsArray: Array<string> = [];
        const packagesArray: Array<string> = [];
        const proceduresArray: Array<string> = [];
        const rolesArray: Array<string> = [];
        const scriptsArray: Array<string> = [];
        const sequencesArray: Array<string> = [];
        const tablesArray: Array<string> = [];
        const typesArray: Array<string> = [];
        const triggersArray: Array<string> = [];
        const usersArray: Array<string> = [];
        const viewsArray: Array<string> = [];
        const profilesArray: Array<string> = [];
        let outputString: string = '';
        diffArray.forEach(function (element: string) {

            if (element.toUpperCase().startsWith('@PROFILES')) {
                profilesArray.push(element);
            }

            if (element.toUpperCase().startsWith('@USERS')) {
                usersArray.push(element);
            }

            if (element.toUpperCase().startsWith('@SEQUENCES')) {
                sequencesArray.push(element);
            }

            if (element.toUpperCase().startsWith('@FUNCTIONS')) {
                functionsArray.push(element);
            }
            if (element.toUpperCase().startsWith('@PACKAGES')) {
                packagesArray.push(element);
            }
            if (element.toUpperCase().startsWith('@PROCEDURES')) {
                proceduresArray.push(element);
            }
            if (element.toUpperCase().startsWith('@ROLES')) {
                rolesArray.push(element);
            }
            if (element.toUpperCase().startsWith('@SCRIPTS')) {
                scriptsArray.push(element);
            }
            if (element.toUpperCase().startsWith('@TYPES')) {
                typesArray.push(element);
            }
            if (element.toUpperCase().startsWith('@TABLES')) {
                tablesArray.push(element);
            }
            if (element.toUpperCase().startsWith('@TRIGGERS')) {
                triggersArray.push(element);
            }

            if (element.toUpperCase().startsWith('@VIEWS')) {
                viewsArray.push(element);
            }

            if (element.toUpperCase().startsWith('@MATERIALIZED VIEWS')) {
                viewsArray.push(element.replace('@', '@"').replace(';', '\";'));
            }

        });

        if (profilesArray.length > 0) { outputString += profilesArray.join('\n') + '\n'; }

        if (usersArray.length > 0) { outputString += usersArray.join('\n') + '\n'; }

        if (sequencesArray.length > 0) { outputString += sequencesArray.join('\n') + '\n'; }

        if (tablesArray.length > 0) { outputString += tablesArray.join('\n') + '\n'; }

        if (typesArray.length > 0) { outputString += typesArray.join('\n') + '\n'; }

        if (viewsArray.length > 0) { outputString += viewsArray.join('\n') + '\n'; }

        if (functionsArray.length > 0) { outputString += functionsArray.join('\n') + '\n'; }

        if (proceduresArray.length > 0) { outputString += proceduresArray.join('\n') + '\n'; }
        packagesArray.sort((a: string, b: string): number => {


            if (a.substr(a.length - 3) > b.substr(b.length - 3)) {
                return -1;
            }
            if (a.substr(a.length - 3) < b.substr(b.length - 3)) {
                return 1;
            }

            return 0;
        });
        if (packagesArray.length > 0) { outputString += packagesArray.join('\n') + '\n'; }

        if (triggersArray.length > 0) { outputString += triggersArray.join('\n') + '\n'; }

        if (rolesArray.length > 0) { outputString += rolesArray.join('\n') + '\n'; }

        if (scriptsArray.length > 0) { outputString += scriptsArray.join('\n') + '\n'; }

        try {
            tl.writeFile('deployment.sql', outputString);
        } catch (err) {
            throw new Error(tl.loc('AutoMagicFileFailure', err));
        }
        console.log('------------- End Git diff Execution -------------');
    }

    private _validateOrDefaultConfig() {
        if (this.config.directory === undefined || this.config.directory === '') {
            this.config.directory = tl.getVariable('System.DefaultWorkingDirectory');
        }
    }

    private _createGitDiffRunner(): tr.ToolRunner {
        const gitDiffArguments = `diff ${this.config.startCommit} ${this.config.endCommit} --no-commit-id --name-only --diff-filter=ACMRT`;
        const gitDiff = tl.tool('git').line(gitDiffArguments);

        return gitDiff;
    }
}