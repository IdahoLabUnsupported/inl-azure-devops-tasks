'use strict';

import * as tmrn from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';

const taskPath = path.join(__dirname, '..', 'AssetSuiteJobs.js');
const tr: tmrn.TaskMockRunner = new tmrn.TaskMockRunner(taskPath);

// Task inputs
tr.setInput('ActionType', 'LaunchJob');
tr.setInput('ApiRootUri', 'https://as-dev.inl.gov/as/fa/rest/batch');
tr.setInput('UserName', 'asbatch');
tr.setInput('UserPassword', 'dkBM8PH$mVeFnSRaf79!JvcT2');
tr.setInput('IgnoreInvalidSSL', 'true');
tr.setInput('JobName', 'tibpbkin');
tr.setInput('JobParams', 'userId=ASBATCH');
tr.setInput('LaunchMode', 'async');
tr.setInput('JobOutputVariable', 'AssetSuite.JobId');


tr.run();