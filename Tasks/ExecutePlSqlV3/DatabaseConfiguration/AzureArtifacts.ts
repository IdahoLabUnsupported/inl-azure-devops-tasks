'use strict';

import * as path from 'path';
import * as fs from 'fs';
import * as tl from 'azure-pipelines-task-lib/task';
import * as tr from 'azure-pipelines-task-lib/toolrunner';

/** Contains information about a git repo that is used as an Artifact for the pipeline */
export interface IAzureArtifactRepo {
    /** The name of the repository */
    name: string;

    /** The path to the git repo */
    repoPath: string;

    /** The name of the current branch */
    branchName: string;

    /** The origin url for the repository */
    repoUrl: string;

    /** The list of remote  branches for the repo */
    remoteBranches: string[];

    /** The list of current files for the repo */
    currentFiles: IRepoFiles[];

    /** The Commit that is being deployed */
    latestCommit: string;
}

interface IgitRepoData {
    repoURL: string,
    remoteBranches: string[],
    repoName: string,
    latestCommit: string,
    branch: string
}

export interface IRepoFiles {
    repo: string;
    branch: string;
    fileName: string;
}

/**
 * Get the list of git repositories that have been configured as artifacts for the pipeline.
 * @param basePath The path that will be searched for repositories
 */
export function getAzureArtifactRepos(basePath: string): IAzureArtifactRepo[] {
    const toReturn = new Array<IAzureArtifactRepo>();

    // We assume that the repositories are directories off the base path.
    // So we get that list and use it as a starting point
    const directories = getDirectories(basePath);

    for (const r of directories) {
        const repo = getRepositoryData(r);
        if (repo) {
            toReturn.push(repo);
        }
    }

    return toReturn;
}

/**
 * Get the list of directories under the specified root
 * @param root The directory that sub directories will be returned
 */
function getDirectories(root: string): string[] {
    return fs.readdirSync(root)
                .map(function (name) {
                    return path.join(root, name);
                });
}

function getRepositoryData(repoDirectory: string): IAzureArtifactRepo | undefined {
    // Gather the needed information for the repo then populate the object to return
    // If we find we are not a repo ie: git failed then we assume not a repo and
    // returned undefined

    

    if (!tl.stats(repoDirectory).isDirectory()) {
        return undefined;
    }

    const options = <tr.IExecOptions>{
        failOnStdErr: true
    };

    // Change into the directory to run GIT commands
    tl.cd(repoDirectory);

    if (createGitCheck(options)) {
        // const branch: string = branchRunner(options);
        const gitRepo: IgitRepoData = gitRepoRunner(options);

        const toReturn = <IAzureArtifactRepo>{
            name: gitRepo.repoName,
            branchName: gitRepo.branch,
            repoPath: repoDirectory,
            repoUrl: gitRepo.repoURL,
            remoteBranches: gitRepo.remoteBranches,
            latestCommit: gitRepo.latestCommit

        };

        return toReturn;
    }
    else {
        return undefined;
    }
}

function createGitCheck(options: tr.IExecOptions): boolean {
    const gitBranchArguments = `status`;
    const gitBranch = tl.tool('git').line(gitBranchArguments);
    const gitBranchResults = gitBranch.execSync(options);
    if (gitBranchResults.code !== 0) {
        return false;
    }
    else {
        return true;
    }
}

function createGitRepoRunner(gitArgs: string): tr.ToolRunner {
    const gitRepoArguments = gitArgs;
    const gitRepo = tl.tool('git').line(gitRepoArguments);
    return gitRepo;
}

function gitRepoRunner(options: tr.IExecOptions): IgitRepoData {
    // Get the latest commit for the Branch
    const repoCommit = createGitRepoRunner('log -n 1 --pretty=format:"%H"')
    const repoCommit_result = repoCommit.execSync(options)
    const repoCommitResult = repoCommit_result.stdout;

    const repo = createGitRepoRunner('remote show origin');
    const repo_result = repo.execSync(options);
    const repoArray = repo_result.stdout.split('\n');
    const repoRegex = new RegExp('Fetch URL:', 'gi');
    const branchRegexStart = new RegExp('Remote branch', 'gi');
    const branchRegexEnd = new RegExp('Local branches configured for|Local branch configured for', 'gi');
    let branchFlag: boolean= false;
    let repoURL = '';
    let branchArray: Array<string>= [];

    repoArray.forEach(function (element: string) {
        if (repoRegex.test(element)) {
            repoURL = element.substring('  Fetch URL: '.length);
        }
        if (branchRegexEnd.test(element)) {
            branchFlag = false;
        }

        if (branchFlag) {
            let elementBranch = element.trim();
            elementBranch = elementBranch.substring(0, elementBranch.indexOf(' '));
            elementBranch = elementBranch.trim();
            branchArray.push(elementBranch);
        } 

        if (branchRegexStart.test(element)) {
            branchFlag = true;
        }
    });

    // Get the branch from Origin from the commit
    const branch = createGitRepoRunner(`show -s --pretty=%D HEAD`)
    const branch_result = branch.execSync(options)
    let branchResult = branch_result.stdout;
    tl.debug(`-- Branch Output: ${branchResult}`)
    branchResult = branchResult.replace('HEAD, origin/', '').replace('HEAD -> ', '').trim();
    const ixBranch = branchResult.indexOf(',')
    if (ixBranch > 0){
        branchResult = branchResult.substring(0, ixBranch)
    }
    tl.debug(`-- Formatted Branch Output: ${branchResult}`)
    if (branchResult === 'HEAD') {
        tl.debug(`The Commit was not a Head commit, retrying to get proper branch ...`)
        const branch2 = createGitRepoRunner(`branch -r --contains ${repoCommitResult}`)
        const branch2_result = branch2.execSync(options)
        let branchResult2 = branch2_result.stdout;
        branchResult = branchResult2.replace('origin/', '').trim()
    }

    const repoName = repoURL.substring(repoURL.lastIndexOf('\/') + 1);

    // Make sure git ran successfully
    if (repo_result.code !== 0) {
        throw new Error(tl.loc('GitExitCodeError', repo_result.code));
    }

    return <IgitRepoData>{
            repoURL: repoURL, 
            remoteBranches: branchArray,
            repoName: repoName,
            latestCommit: repoCommitResult,
            branch: branchResult ? branchResult : 'unknown'
        };
}