'use strict';

import * as path from 'path';
import * as tl from 'azure-pipelines-task-lib/task';
import * as cm from './PlSqlCommon';
import { _getFindInfoFromPattern } from 'azure-pipelines-task-lib/internal';

tl.setResourcePath(path.join(__dirname, 'task.json'));

async function run(): Promise<void> {
    try {
        // Read the task inputs
        const portNumber = tl.getInput('PortNumber', true);
        const inputType: cm.InputType = cm.parseInputType(tl.getInput('SQLRunType', true));
        const sqlScript = cm.getSqlScript(inputType);
        const sqlConnectionTimeoutNumber = tl.getInput('SQLTestConnectionTimeoutSeconds', false);
        const proxyUser = inputType !== cm.InputType.DatabaseConfiguration ? tl.getInput('SqlProxyUser', false) : undefined;
        const config = <cm.ISqlPlusConfiguration>{
            userName: tl.getInput('UserName', true),
            userPassword: tl.getInput('UserPassword', true),
            hostname: tl.getInput('HostName', true),
            port: parseInt(portNumber !== undefined ? portNumber : '1521'),
            serviceName: tl.getInput('ServiceName', true),
            isFailOnSqlError: tl.getBoolInput('FailOnSqlError', true),
            isShowWarnings: tl.getBoolInput('ShowWarnings', true),
            isDebug: tl.getBoolInput('DebugSQL', true),
            isDefineEscape: tl.getBoolInput('DefineEscape', true),
            isUseSubstitutionVariables: tl.getBoolInput('UseSubstitutionVariables', true),
            substitutionCharacter: tl.getInput('SubstitutionCharacter', true),
            sqlConnectionTimeout: parseInt(sqlConnectionTimeoutNumber !== undefined ? sqlConnectionTimeoutNumber : '15'),
            isServerOutput: tl.getBoolInput('SetServeroutput', true),
            sqlProxyUser: proxyUser,
            runPostConfig: tl.getBoolInput('RunPostPrivilegesConfiguration', true),

        };



        // Create and execute the runner
        const sqlplus: cm.SqlPlusRunner = new cm.SqlPlusRunner(config);
        const code: number = await sqlplus.exec(sqlScript);
        if (code !== 0) {
            throw new Error(tl.loc('SqlPlusExitCodeError', code));
        } else if (code === 0 && !sqlplus.isSuccess) {
            throw new Error(tl.loc('SqlPlusError'));
        }

        console.log('sqlPlusRan ' + new Date().getSeconds() + new Date().getMilliseconds());

        tl.setResult(tl.TaskResult.Succeeded, tl.loc('Success'));
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, tl.loc('UnhandledProcessFailure', err), true);
        process.exit(1); // Force exit to kill any async methods
    }
}

// For testing.
if (process.env.NODE_ENV !== 'TEST') {
    console.log('Running');
    run();
}

// For use in the test script.
export { run };