'use strict';

import * as path from 'path';
import * as tl from 'azure-pipelines-task-lib/task';
import * as rc from './ReleaseCommon'


async function run(): Promise<void> {
    tl.setResourcePath(path.join(__dirname, 'task.json'));

    try {
        const artifactAliasName: string = tl.getInput('ArtifactAliasName', true);
        const config = <rc.IRelaseManagementConfiguration>{
            ignoreInvalidSSL: tl.getBoolInput('IgnoreInvalidSSL', false)
        };
        const releaseMagement = new rc.ReleaseManagement(config);
        
        await releaseMagement.connect();

        console.log(tl.loc('FindPreviousCommit', artifactAliasName));
        const commitId = await releaseMagement.getPreviousArtifactCommitId(artifactAliasName);
        console.log(tl.loc('FoundPreviousCommit', commitId, artifactAliasName));

        // Set our variable even if we did not really find the id.
        tl.setVariable('Artifact.Previous.Commit', commitId);

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