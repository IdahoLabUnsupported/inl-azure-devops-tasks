'use strict';

import * as path from 'path';
import * as tl from 'azure-pipelines-task-lib/task';
import * as restHandlers from 'typed-rest-client/Handlers';
import { IRestResponse, RestClient } from 'typed-rest-client/RestClient';
import { JsonObject, NuGetPackage } from './NuGetPackage';
import { UpdateType } from './Common';
import { IRequestHandler } from 'typed-rest-client/Interfaces';
import moment from 'moment';

tl.setResourcePath(path.join(__dirname, 'task.json'));

async function GetNugetPackage(collectionUri: string, feedPublish: string, packageId: string, accessToken: string): Promise<JsonObject<NuGetPackage> | null> {
    const nuGetFeedQueryUrl = `${collectionUri.replace(/\/$/g, '')}/_apis/packaging/Feeds/${feedPublish}/packages?api-version=5.0-preview.1`;
    const uri = `${nuGetFeedQueryUrl}&packageNameQuery=${packageId}&includeAllVersions=true`;

    console.log(tl.loc('CallingUri', uri));

    const host: string = uri.substring(0, uri.indexOf('.gov\/') + 4);

    const path: string = uri.substring(uri.indexOf('.gov\/') + 4);

    var accessTokenHandler: IRequestHandler;

    if (accessToken.length === 52) {
        accessTokenHandler = new restHandlers.PersonalAccessTokenCredentialHandler(accessToken, false);
    }
    else {
        accessTokenHandler = new restHandlers.BearerCredentialHandler(accessToken, false);
    }

    const client: RestClient = new RestClient('node-Packaging-api', host, [accessTokenHandler], {});

    const response: IRestResponse<JsonObject<NuGetPackage>> = await client.get<JsonObject<NuGetPackage>>(path);

    console.log(tl.loc('CallCompleted', response.statusCode));

    return response.result;
}

async function GetCurrentPackageVersion(collectionUri: string, feedPublish: string, packageId: string, accessToken: string): Promise<string | undefined> {
    const jsonObject: JsonObject<NuGetPackage> | null = await GetNugetPackage(collectionUri, feedPublish, packageId, accessToken);

    if (!jsonObject) {
        return undefined;
    }

    const packageObject = jsonObject.value[0];

    const versions = packageObject?.versions;

    var publishedVersionNumber: string | undefined;

    if (versions) {
        console.log(tl.loc('CountPublishedVersionsFound', versions?.length));
        
        console.log('');

        versions.forEach(version => {
            console.log(tl.loc('VersionPublishedDate', version.version, version.publishDate));
            if (!publishedVersionNumber && !version.version.includes('-')) {
                publishedVersionNumber = version.version;
            }
        });
    }

    return publishedVersionNumber;
}

function GetNewVersionNumber(publishedVersionNumber: string | undefined, updateType: UpdateType): string {
    var major: number;
    var minor: number;
    var patch: number;

    if (publishedVersionNumber) {
        console.log(tl.loc('LatestPublishedVersion', publishedVersionNumber));

        const publishedMajor: number = <number><unknown>(publishedVersionNumber as string).replace(/([0-9]+)\.([0-9]+)\.([0-9]+)/, '$1');

        if (updateType === UpdateType.Major) {
            console.log(tl.loc('SettingMinorPatch0'));
            major = +publishedMajor + +1;
            minor = 0;
            patch = 0;
        }
        else {
            const publishedMinor: number = <number><unknown>(publishedVersionNumber as string).replace(/([0-9]+)\.([0-9]+)\.([0-9]+)/, '$2');

            if (updateType === UpdateType.Minor) {
                console.log(tl.loc('SettingPatch0'));
                major = publishedMajor;
                minor = +publishedMinor + +1;
                patch = 0;
            }
            else {
                const publishedPatch: number = <number><unknown>(publishedVersionNumber as string).replace(/([0-9]+)\.([0-9]+)\.([0-9]+)/, '$3');
                console.log(tl.loc('IncrementingPatch'));
                major = publishedMajor;
                minor = publishedMinor;
                patch = +publishedPatch + +1;
            }
        }
    }
    else {
        console.log(tl.loc('NoReleasedPackage'));
        major = 0;
        minor = 0;
        patch = 1;
    }

    return `${major}.${minor}.${patch}`;
}

async function GenerateVersionNumber(): Promise<void> {
    try {
        // Read inputs
        const packageId: string = tl.getInput('PackageId', true) ?? '';
        const updateType: UpdateType = <UpdateType>tl.getInput('UpdateType', true) ?? '';
        const feedPublish: string = tl.getInput('FeedPublish', true) ?? '';
        const outputVariableNameReleaseVersion: string = tl.getInput('OutputVariableNameReleaseVersion', true) ?? '';
        const outputVariableNamePrereleaseVersion: string = tl.getInput('OutputVariableNamePrereleaseVersion', true) ?? '';
        const updateBuildNumber: boolean = tl.getBoolInput('UpdateBuildNumber', true) ?? '';

        const branchName: string | undefined = tl.getVariable('Build.SourceBranchName');
        const collectionUri: string | undefined = tl.getVariable('System.CollectionUri');
        const accessToken: string | undefined = tl.getVariable('System.AccessToken');

        //Log inputs
        console.log(tl.loc('LogInput', 'PackageId', packageId));
        console.log(tl.loc('LogInput', 'UpdateType', updateType));
        console.log(tl.loc('LogInput', 'FeedPublish', feedPublish));
        console.log(tl.loc('LogInput', 'OutputVariableNameReleaseVersion', outputVariableNameReleaseVersion));
        console.log(tl.loc('LogInput', 'OutputVariableNamePrereleaseVersion', outputVariableNamePrereleaseVersion));
        console.log(tl.loc('LogInput', 'UpdateBuildNumber', updateBuildNumber));

        console.log('');

        console.log(tl.loc('LogPredefinedVariable', 'Build.SourceBranchName', branchName));
        console.log(tl.loc('LogPredefinedVariable', 'System.CollectionUri', collectionUri));
        console.log(tl.loc('LogPredefinedVariable', 'System.AccessToken', accessToken));

        console.log('');

        if (branchName === undefined) {
            throw new Error("Missing Branch Name");
        }

        if (collectionUri === undefined) {
            throw new Error("Missing Collection Uri");
        }

        if (accessToken === undefined) {
            throw new Error("Missing Access Token");
        }

        var publishedVersionNumber: string | undefined = await GetCurrentPackageVersion(collectionUri, feedPublish, packageId, accessToken);

        const versionNumber = GetNewVersionNumber(publishedVersionNumber, updateType);

        console.log(tl.loc('NewVersionNumber', versionNumber));

        const prereleaseVersion = `${versionNumber}-${branchName}-${moment().format('YYYYMMDDTHHmmssSSSS')}`;

        console.log(tl.loc('NewPrereleaseVersionNumber', prereleaseVersion));

        console.log('');

        if (updateBuildNumber) {
            console.log(`##vso[build.updatebuildnumber]${prereleaseVersion}`)
        }

        tl.setVariable(outputVariableNameReleaseVersion, versionNumber);

        tl.setVariable(outputVariableNamePrereleaseVersion, prereleaseVersion);

        tl.setResult(tl.TaskResult.Succeeded, tl.loc('Success'));
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, tl.loc('UnhandledProcessFailure', err), true);
    }
}

// For testing. When the import is ran the sanitize would immediately execute.
if (process.env.NODE_ENV !== 'TEST') {
    console.log('Running');
    GenerateVersionNumber();
}

// For use in the test script.
export { GenerateVersionNumber };