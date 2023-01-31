'use strict';

import * as path from 'path';
import * as tl from 'azure-pipelines-task-lib/task';

const LENGTH_OF_NAME: number = 4;

async function run(): Promise<void> {
    tl.setResourcePath(path.join(__dirname, 'task.json'));

    try {
        const firstCommit = tl.getInput('FirstCommit', true);
        const secondCommit = tl.getInput('SecondCommit');
        const repoLocation = tl.getPathInput('RepoLocation', true, true);
        const outVariableName = tl.getInput('OutputVariable', true);

        // Make sure we are in our repo location before running the git commands
        tl.pushd(repoLocation);

        // When a second commit is not supplied then we will set the common ancestor to the start of the repository to essentially grab everything
        let commonAncestor: string = '<not found>';
        if (!secondCommit || secondCommit === '') {
            console.log(tl.loc('MissingSecondCommit'));

            commonAncestor = getBranchFirstCommit();
        } else {
            // Determine common ancestor if possible
            const result = getCommonAncestor(firstCommit, secondCommit);

            // One of the commits may not be valid which if that is the case then we will revert to the HEAD Commit of master to allow finding a common Ancestor
            if (!result.success && result.isNotValidCommitError) {
                const notFound = result.hash;
                tl.warning(result.output);
                tl.warning(tl.loc('CommitNotValid', notFound));

                // Locate the HEAD commit of master then try to find common ancestor
                const masterHeadCommit = getMasterHeadCommit();
                const secondAttempt = getCommonAncestor(
                    (firstCommit === notFound) ? masterHeadCommit : firstCommit,
                    (secondCommit === notFound) ? masterHeadCommit : secondCommit,
                    true );  // Fail  this time if we get invalid commit

                if (secondAttempt.success) {
                    commonAncestor = secondAttempt.hash;
                }

            } else {
                commonAncestor = result.hash;
            }
        }

        // We should have a valid commit at this point
        console.log(tl.loc('FoundCommonAncestor', commonAncestor));

        // Go back to previous directory (mainly for testing)
        tl.popd();

        // Set the output variable
        tl.setVariable(outVariableName, commonAncestor);

        tl.setResult(tl.TaskResult.Succeeded, tl.loc('Success'));
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, tl.loc('UnhandledProcessFailure', err), true);
    }
}

interface IGitCommonAncestorResult {
    /** The hash from the git command */
    hash: string;

    /** A value that indicates if the hash was successfully found. */
    success: boolean;

    /** The output of the git command */
    output: string;

    /** A value that indicates if the failure was due to one of the commits not being valid */
    isNotValidCommitError?: boolean;
}

function isNotValidCommit(exitCode: Number, gitOutput: string): boolean {
    if (exitCode === 128 && gitOutput.includes('Not a valid commit name')) {
        return true;
    }

    return false;
}

function getNotFoundCommit(gitOutput: string): string {
    const start = gitOutput.indexOf('name') + LENGTH_OF_NAME;
    return gitOutput.substring(start).trim();
}

function getBranchFirstCommit(): string {
    const git = tl.tool('git').line('rev-list --max-parents=0 HEAD');
    const result = git.execSync();

    if (result.code !== 0) {
        throw new Error(tl.loc('GitErrorCode', result.code));
    }

    return result.stdout.trim();
}

function getCommonAncestor(firstCommit: string, secondCommit: string, failOnNotValid?: boolean): IGitCommonAncestorResult {
    const git = tl.tool('git').line(`merge-base ${firstCommit} ${secondCommit}`);
    const result = git.execSync();
    const gitOutput = result.stdout.trim();
    
    if (result.code !== 0) {
        if ((failOnNotValid === undefined || !failOnNotValid) && isNotValidCommit(result.code, result.stderr.trim())) {
            return <IGitCommonAncestorResult>{
                hash: getNotFoundCommit(result.stderr.trim()),
                output: result.stderr,
                success: false,
                isNotValidCommitError: true
            };
        } else {
            throw new Error(tl.loc('GitErrorCode', result.code));
        }
    } else {
        return <IGitCommonAncestorResult>{
            hash: gitOutput,
            output: result.stdout,
            success: true
        };
    }
}

function getMasterHeadCommit(): string {
    const git = tl.tool('git').line('show-ref --head --verify --hash refs/remotes/origin/master');
    const result = git.execSync();
    
    if (result.code !== 0) {
        throw new Error(tl.loc('GitErrorCode', result.code));
    }

    return result.stdout.trim();
}

// For testing.
if (process.env.NODE_ENV !== 'TEST') {
    console.log('Running');
    run();
}

// For use in the test script.
export { run };