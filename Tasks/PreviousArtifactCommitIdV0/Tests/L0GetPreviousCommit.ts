'use strict';

import * as tmrn from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';

const taskPath = path.join(__dirname, '..', 'GetArtifactCommitId.js');
const tr: tmrn.TaskMockRunner = new tmrn.TaskMockRunner(taskPath);

// Variables needed for the task
process.env['SYSTEM_ACCESSTOKEN'] = 'l72xdihjiedg324jsph4qull7mt4lnfgkzheo4wg2nbhvwr4tova';
process.env['SYSTEM_TEAMFOUNDATIONCOLLECTIONURI'] = 'https://tfs.inl.gov/tfs/DefaultCollection/';
process.env['SYSTEM_TEAMPROJECT'] = 'BusinessSystems';
process.env['RELEASE_RELEASEID'] = '4917';
process.env['RELEASE_DEFINITIONID'] = '19';
process.env['RELEASE_DEFINITIONENVIRONMENTID'] = '108';

// Task inputs
tr.setInput('IgnoreInvalidSSL', 'False');
tr.setInput('ArtifactAliasName', 'AssetSuite-INL');


tr.run(true);