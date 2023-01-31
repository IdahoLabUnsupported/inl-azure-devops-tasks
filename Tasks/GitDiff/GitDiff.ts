'use strict';

import * as path from 'path';
import * as tl from 'azure-pipelines-task-lib/task';
import * as git from 'inl-azure-devops-lib/GitClient';
import {EOL} from 'os';

tl.setResourcePath(path.join(__dirname, 'task.json'));

const VARIABLE_PREFIX: string = 'Git.Diff';
const HEADER = '-----------';

export async function run(): Promise<void> {
    try {
        const startCommit = tl.getInput('StartCommit', true);
        const endCommit = tl.getInput('EndCommit', true);
        const repoPath = tl.getPathInput('RepoLocation', true, true);
        const resultsJsonFile = tl.getPathInput('JsonResultsFile', false, false);
        const setOutputVariables = tl.getBoolInput('SetOutputVariables', true);

        const client = new git.GitClient(repoPath);
        const result = client.diff(startCommit, endCommit, true);

        if (!result.success) {
            tl.setResult(tl.TaskResult.Failed, tl.loc('', result.error), true);
            return;
        }

        // We were successful so write out the variables
        if (result.changes && setOutputVariables) {
            if (result.changes.added) {
                processToVariable(result.changes.added, 'Added');
            }
            if (result.changes.modified) {
                processToVariable(result.changes.modified, 'Modified');
            }
            if (result.changes.deleted) {
                processToVariable(result.changes.deleted, 'Deleted');
            }
            if (result.changes.copied) {
                processToVariable(result.changes.copied, 'Copied');
            }
            if (result.changes.renamed) {
                processToVariable(result.changes.renamed, 'Renamed');
            }
            if (result.changes.typeChanged) {
                processToVariable(result.changes.typeChanged, 'TypeChanged');
            }
        }

        // We write the file here so we do not have to run the git diff again
        if (resultsJsonFile) {
            console.log();
            console.log(`Writing to file ${resultsJsonFile}`);
            const json = JSON.stringify(result);
            tl.writeFile(resultsJsonFile, json);
        }
        

        tl.setResult(tl.TaskResult.Succeeded, 'Success');
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, tl.loc('UnhandledProcessFailure', err), true);
    }
}

run();

function processToVariable(fileArray: string[], name: string): void {
    const value = fileArray.join(EOL);
    const variableName = `${VARIABLE_PREFIX}.${name}`;

    logFilesToConsole(variableName, value);
    tl.setVariable(variableName, value);
}

function logFilesToConsole(name: string, value: string): void {
    console.log(`${HEADER} ${name} ${HEADER}`);
    console.log(value);
}