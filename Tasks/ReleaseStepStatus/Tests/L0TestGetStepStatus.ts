'use strict';

import * as tmrn from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';

const taskPath = path.join(__dirname, '..', 'GetReleaseStepStatus.js');
const tr: tmrn.TaskMockRunner = new tmrn.TaskMockRunner(taskPath);

// Variables needed for the task
process.env['SYSTEM_ACCESSTOKEN'] = 'l72xdihjiedg324jsph4qull7mt4lnfgkzheo4wg2nbhvwr4tova';
process.env['SYSTEM_TEAMFOUNDATIONCOLLECTIONURI'] = 'https://tfs.inl.gov/tfs/DefaultCollection/';
process.env['SYSTEM_TEAMPROJECT'] = 'BusinessSystems';
process.env['SYSTEM_JOBID'] = '08fabad8-2267-453f-b82b-0567f5d25a47';
process.env['RELEASE_RELEASEID'] = '1867';
process.env['RELEASE_DEFINITIONID'] = '19';
process.env['RELEASE_DEFINITIONENVIRONMENTID'] = '52';
process.env['RELEASE_ENVIRONMENTID'] = '5283';
process.env['RELEASE_ATTEMPTNUMBER'] = '1';
process.env['RELEASE_DEPLOYPHASEID'] = '3608';

// Task inputs
tr.setInput('StepToLookup', 'Previous');
tr.setInput('OutputVariable', 'Release.Step.Status');
tr.setInput('IgnoreInvalidSSL', 'False');


tr.run(true);