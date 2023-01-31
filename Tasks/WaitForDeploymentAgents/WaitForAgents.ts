'use strict';

import * as path from 'path';
import * as tl from 'azure-pipelines-task-lib/task';
import * as azDevOpsBase from 'azure-devops-node-api/interfaces/common/VsoBaseInterfaces';
import * as webApi from 'azure-devops-node-api/WebApi';
import { DeploymentGroupExpands, TaskAgentStatus, DeploymentGroup, DeploymentMachine } from 'azure-devops-node-api/interfaces/TaskAgentInterfaces';


tl.setResourcePath(path.join(__dirname, 'task.json'));

enum StatusType {
    Online = 'Online',
    Offline = 'Offline'
}

export async function run(): Promise<void> {
    try {
        const poolName: string = tl.getInput('PoolName', true);
        const poolStatusType = parseStatusType(tl.getInput('StatusType', true));
        const ignoreInvalidSSL = tl.getBoolInput('IgnoreInvalidSSL', false);
        const tfsUri = tl.getVariable('System.TeamFoundationCollectionUri');
        const accessToken = tl.getInput('Token', true);
        const teamProject = tl.getVariable('System.TeamProject');
        const statusText = poolStatusType === StatusType.Online ? 'online' : 'offline';

        // Do we need to ignore Invalid SSL Certs
        if (ignoreInvalidSSL) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        }

        // Used for local debugging.  Allows switching between PAT token and Bearer Token for debugging
        const credHandler: azDevOpsBase.IRequestHandler = accessToken.length === 52 ? webApi.getPersonalAccessTokenHandler(accessToken) :
            webApi.getBearerHandler(accessToken);
        const tfs = new webApi.WebApi(tfsUri, credHandler);

        console.log(tl.loc('ConnectingTo', tfsUri));
        const taskAgentApi = await tfs.getTaskAgentApi();
        let isAgentsAtStatus: boolean = false;

        while (!isAgentsAtStatus) {
            process.stdout.write(`Checking status for ${poolName}...`);
            const deploymentGroups = await taskAgentApi.getDeploymentGroups(teamProject, poolName);
            if (deploymentGroups.length !== 1) {
                throw new Error(`Failed to find Deployment Group '${poolName}' in project '${teamProject}'`);
            }

            // Use the deployment group reference to determine number of machines
            const summary = deploymentGroups[0];
            const poolSize: number = summary.pool && summary.pool.size ? summary.pool.size : 0;

            // We now need the details to know machines online and offline
            if (summary.id) {
                const detail = await taskAgentApi.getDeploymentGroup(teamProject, summary.id, undefined, DeploymentGroupExpands.Machines);
                const countInStatus = poolStatusType === StatusType.Online ? countMachinesInStatus(detail, TaskAgentStatus.Online) : countMachinesInStatus(detail, TaskAgentStatus.Offline);
                console.log(` ${countInStatus} ${statusText} of ${poolSize}`);

                if (countInStatus === poolSize) {
                    isAgentsAtStatus = true;
                } else {
                    // List agents not in the status
                    const notInStatus = poolStatusType === StatusType.Online ? getMachinesInStatus(detail, TaskAgentStatus.Offline) : getMachinesInStatus(detail, TaskAgentStatus.Online);
                    console.log(`   Not ${statusText}:`);
                    for (const m of notInStatus) {
                        if (m.agent) {
                            console.log(`   ${m.agent.name}`);
                        }
                    }
                    
                    // Sleep 5 seconds until the next check
                    await sleep(5 * 1000);
                }
            } else {
                throw new Error('No id for deployment group');
            }
        }

        tl.setResult(tl.TaskResult.Succeeded, 'Success');
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, tl.loc('UnhandledProcessFailure', err), true);
    }
}

run();

/** Parse StatusType string to enum */
function parseStatusType(input: string): StatusType {
    const type = <StatusType>input;
    if (type === undefined) {
        return StatusType.Online;
    }

    return type;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function countMachinesInStatus(group: DeploymentGroup, status: TaskAgentStatus): number {
    let toReturn: number = 0;

    if (group.machines) {
        for (const m of group.machines) {
            if (m.agent && m.agent.status === status) {
                toReturn++;
            }
        }
    }

    return toReturn;
}

function getMachinesInStatus(group: DeploymentGroup, status: TaskAgentStatus): DeploymentMachine[] {
    const toReturn: Array<DeploymentMachine> = new Array<DeploymentMachine>();

    if (group.machines) {
        for (const m of group.machines) {
            if (m.agent && m.agent.status === status) {
                toReturn.push(m);
            }
        }
    }

    return toReturn;
}