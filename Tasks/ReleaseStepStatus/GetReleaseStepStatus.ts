'use strict';

import * as path from 'path';
import * as tl from 'azure-pipelines-task-lib/task';
import * as rm from 'inl-azure-devops-lib/ReleaseManagement';

const TASK_ID: string = '2d8b0d20-2bea-11e9-8adc-effb86a5c71c';

async function run(): Promise<void> {
    tl.setResourcePath(path.join(__dirname, 'task.json'));

    try {
        const stepToLookup: string = tl.getInput('StepToLookup', true);
        const outputVariableName: string = tl.getInput('OutputVariable', true);
        const config = <rm.IRelaseManagementConfiguration>{
            ignoreInvalidSSL: tl.getBoolInput('IgnoreInvalidSSL', false)
        };
        const releaseMagement = new rm.ReleaseManagement(config);
        
        await releaseMagement.connect();

        const stepStatus = await releaseMagement.getStepStatus(stepToLookup, TASK_ID);

        tl.setVariable(outputVariableName, stepStatus);

        tl.setResult(tl.TaskResult.Succeeded, tl.loc('Success'));
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, tl.loc('UnhandledProcessFailure', err), true);
    }
}

// For testing.
if (process.env.NODE_ENV !== 'TEST') {
    console.log('Running');
    run();
}

// For use in the test script.
export { run };