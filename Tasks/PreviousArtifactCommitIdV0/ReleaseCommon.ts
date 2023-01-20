'use strict';

import * as tl from 'azure-pipelines-task-lib/task';
import * as azDevOpsBase from 'azure-devops-node-api/interfaces/common/VsoBaseInterfaces';
import * as webApi from 'azure-devops-node-api/WebApi';
import * as rmApi from 'azure-devops-node-api/ReleaseApi';
import { Release, Deployment, DeploymentStatus, ReleaseQueryOrder, Artifact } from 'azure-devops-node-api/interfaces/ReleaseInterfaces';

/**
 * Interface for Configuring Release Management
*/
export interface IRelaseManagementConfiguration {
    /** optional.  Should an invalid SSL Certificate be ignored */
    ignoreInvalidSSL: boolean;

    /** optional.  The URI for the TeamFoundation Server. Will default to the URI for the current release. */
    tfsUri: string;

    /** optional. The team project for the Release Hub.  Will default to the current release team project. */
    teamProject: string;

    /** optional. The access token that will be used to call TFS/Azure DevOps.  Will default to $(System.AccessToken). */
    accessToken: string;
}

/**
 * Interface for the Current Release
 */
export interface ICurrentRelease {
    /** The ReleaseId of the current release */
    readonly releaseId: number;

    /** The ReleaseDefinitionId of the current release */
    readonly releaseDefinitionId: number;

    /** The ReleaseDefinitionEnvironmentId of the current release */
    readonly releaseDefinitionEnvironmentId: number;

    /** Details of current release when populated on connect */
    details: Release | undefined;
}

/** Provides funtionality for working with Release Management in TFS/Azure DevOps Server */
export class ReleaseManagement {
    /** The configuration options */
    public config: IRelaseManagementConfiguration;

    /** Details for the current release */
    public readonly currentRelease: ICurrentRelease;

    /** A value that determines if we have connected to TFS/Azure DevOps Server */
    public isConnected: boolean | undefined;

    constructor(configuration: IRelaseManagementConfiguration) {
        if (!configuration) {
            throw new Error('Parameter \'configuration\' cannot be null or empty');
        }

        this.config = configuration;
        this.currentRelease = <ICurrentRelease>{
            releaseId: parseInt(tl.getVariable('Release.ReleaseId')),
            releaseDefinitionId: parseInt(tl.getVariable('Release.DefinitionId')),
            releaseDefinitionEnvironmentId: parseInt(tl.getVariable('Release.DefinitionEnvironmentId'))
        };
        this._validateOrDefaultConfig();
        this._debugConfiguration();

        // Used for local debugging.  Allows switching between PAT token and Bearer Token for debugging
        this.credHandler = this.config.accessToken.length === 52 ? webApi.getPersonalAccessTokenHandler(this.config.accessToken) :
            webApi.getBearerHandler(this.config.accessToken);
        this.tfs = new webApi.WebApi(this.config.tfsUri, this.credHandler);

        // Do we need to ignore Invalid SSL Certs
        if (this.config.ignoreInvalidSSL) {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        }
    }

    /**
     * Connect to the TFS/Azure DevOps server and get the Release API and details of current release
     */
    public async connect(): Promise<void> {
        console.log(tl.loc('ConnectingTo', this.config.tfsUri));
        this.releaseApi = await this.tfs.getReleaseApi();

        console.log(tl.loc('GetCurrentRelease'));
        this.currentRelease.details = await this.releaseApi.getRelease(this.config.teamProject, this.currentRelease.releaseId);
        console.log(`Current Release: ${this.currentRelease.details.name}, id: ${this.currentRelease.details.id}`);

        this.isConnected = true;
    }

    /**
     * Gets the commit id from the Git artifact that matches the specified alias name from the previous release
     * for the current environment.
     * @param artifactAliasName The alias name for the artifiact the commit id will be returned for
     */
    public async getPreviousArtifactCommitId(artifactAliasName: string): Promise<string> {
        let toReturn: string = '';
        await this._ensureConnected();

        const lastDeployment = await this._getCurrentEnvironmentLastDeployment();

        // Get matching artifact from the last deployment
        if (lastDeployment && lastDeployment.release && lastDeployment.release.artifacts) {
            console.log(`Found Previous Deployment: ${lastDeployment.release.name}, id: ${lastDeployment.release.id}`);

            const artifact = lastDeployment.release.artifacts.find(function (a: Artifact) { return a.type === 'Git' && a.alias === artifactAliasName; });
            if (artifact && artifact.definitionReference && artifact.definitionReference.version && artifact.definitionReference.version.id) {
                toReturn = artifact.definitionReference.version.id;
            }
        }

        return toReturn;
    }

    private credHandler: azDevOpsBase.IRequestHandler;
    private tfs: webApi.WebApi;
    private releaseApi: rmApi.IReleaseApi | undefined;

    private _validateOrDefaultConfig() {
        // Default missing values
        if (this.config.tfsUri === undefined) {
            this.config.tfsUri = tl.getVariable('System.TeamFoundationCollectionUri');
        }
        if (this.config.teamProject === undefined) {
            this.config.teamProject = tl.getVariable('System.TeamProject');
        }
        if (this.config.accessToken === undefined){
            this.config.accessToken = tl.getVariable('System.AccessToken');
        }

        // Validate our configuration
        if (!this.config.accessToken || this.config.accessToken.length === 0) {
            throw new Error(tl.loc('NoAccessToken'));
        }
    }

    private _debugConfiguration() {
        tl.debug('------------ RelaseManagement Configuration ------------');
        tl.debug(`config.ignoreInvalidSSL=${this.config.ignoreInvalidSSL}`);
        tl.debug(`config.tfsUri=${this.config.tfsUri}`);
        tl.debug(`config.teamProject=${this.config.teamProject}`);
        tl.debug(`config.accessToken=${this.config.accessToken}`);
        tl.debug('');
        tl.debug('Properties:');
        tl.debug(`currentRelease.releaseId=${this.currentRelease.releaseId}`);
        tl.debug(`currentRelease.releaseDefinitionId=${this.currentRelease.releaseDefinitionId}`);
        tl.debug(`currentRelease.releaseDefinitionEnvironmentId=${this.currentRelease.releaseDefinitionEnvironmentId}`);
        tl.debug('-----------------------------------------------------');
    }

    private async _ensureConnected() : Promise<void> {
        if (!this.isConnected) {
            await this.connect();
        }
    }

    private async _getCurrentReleaseSucccesfulDeployments(releaseDefinitionEnvironmentId: number) : Promise<Deployment[]> {
        return (this.releaseApi) ? await this.releaseApi.getDeployments(
            this.config.teamProject,
            this.currentRelease.releaseDefinitionId,
            releaseDefinitionEnvironmentId,
            undefined, undefined, undefined,
            DeploymentStatus.Succeeded,
            undefined, undefined,
            ReleaseQueryOrder.Descending) : new Array<Deployment>();
    }

    private async _getCurrentEnvironmentLastDeployment() : Promise<Deployment | undefined> {
        const succesfulDeployments = await this._getCurrentReleaseSucccesfulDeployments(this.currentRelease.releaseDefinitionEnvironmentId);
        const currentReleaseId: number = this.currentRelease.releaseId;

        return succesfulDeployments.find(function (d: Deployment) {
            return d.release !== undefined && d.release.id !== undefined && d.release.id < currentReleaseId;
        });
    }
}