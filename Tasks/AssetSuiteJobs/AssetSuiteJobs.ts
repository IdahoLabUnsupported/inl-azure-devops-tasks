'use strict';

import * as path from 'path';
import * as tl from 'azure-pipelines-task-lib/task';
import * as as from 'inl-assetsuite-lib/AssetSuiteApi';

tl.setResourcePath(path.join(__dirname, 'task.json'));

enum TaskActionType {
    LaunchJob = 'LaunchJob',
    JobStatus = 'JobStatus',
    WaitForAsync = 'WaitForAsync'
}

async function run(): Promise<void> {
    try {
        // Read the task inputs
        const actionType = parseTaskActionType(tl.getInput('ActionType', true));
        const apiRootUrl = tl.getInput('ApiRootUri', true);
        const username = tl.getInput('UserName', true);
        const password = tl.getInput('UserPassword', true);
        const ignoreInvalidSSL = tl.getBoolInput('IgnoreInvalidSSL', false);


        const asJobApi = new as.AssetSuitetApi(apiRootUrl, username, password, ignoreInvalidSSL);
        let jobSuccessResult: boolean = true;

        switch (actionType) {
            case TaskActionType.LaunchJob: {
                const jobName = tl.getInput('JobName', true);
                const jobParams = tl.getInput('JobParams', true);
                const launchMode = tl.getInput('LaunchMode', true);
                const jobOutputVariable = tl.getInput('JobOutputVariable', true);

                console.log(`Kicking off job: ${jobName} (${jobParams})  (${launchMode})`);
                console.log();
                const jobLaunch = await asJobApi.launchJob(jobName, jobParams, launchMode);
                if (jobLaunch) {
                    tl.debug(`Response Object: ${JSON.stringify(jobLaunch)}`);

                    if (!jobLaunch.jobExecId) {
                        tl.error('Failed to get Job ExecId');
                        tl.error(jobLaunch.result);
                        jobSuccessResult = false;
                    } else {
                        console.log(`Started Job ID: ${jobLaunch.jobExecId} Log at: ${jobLaunch.jobExecLog}`);
                        tl.setVariable(jobOutputVariable, String(jobLaunch.jobExecId));
                    }
                }

                break;
            }
            case TaskActionType.JobStatus: {
                const jobExecId = +(tl.getInput('JobExecId', true));
                validateJobExcId(jobExecId);

                console.log(`Find current job status for exec Id ${jobExecId}`);
                console.log();
                const jobStatus = await asJobApi.jobStatus(jobExecId);

                if (jobStatus) {
                    tl.debug(`Response Object: ${JSON.stringify(jobStatus)}`);
                    const message = `Job Status: ${jobStatus.exitStatus}, ReturnCode: ${jobStatus.returnCode}`;
                    if (jobStatus.exitStatus === 'FAILED') {
                        throw (new Error(message));
                    } else {
                        console.log(message);
                    }
                }

                break;
            }

            case TaskActionType.WaitForAsync: {
                const jobExecId = +(tl.getInput('JobExecId', true));
                const timeout = +(tl.getInput('Timeout', true));

                validateJobExcId(jobExecId);

                console.log(`Waiting for job with exec Id ${jobExecId}`);
                console.log();
                await asJobApi.waitForAsync(jobExecId, timeout);

                console.log(`Job exec Id ${jobExecId} is finished`);

                break;
            }
        }

        if (jobSuccessResult) {
            tl.setResult(tl.TaskResult.Succeeded, tl.loc('Success'));
        } else {
            tl.setResult(tl.TaskResult.Failed, 'Task Failed', true);
        }
        
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, tl.loc('UnhandledProcessFailure', err), true);
    }
}

function parseTaskActionType(input: string): TaskActionType {
    const type = <TaskActionType>input;
    if (type === undefined) {
        return TaskActionType.JobStatus;
    }

    return type;
}

function validateJobExcId(id: number) : void {
    if (!id) {
        throw new Error(`Not a valid JobExecId: ${id}`);
    }
}

// For testing.
if (process.env.NODE_ENV !== 'TEST') {
    console.log('Running');
    run();
}

// For use in the test script.
export { run };