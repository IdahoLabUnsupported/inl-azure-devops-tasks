'use strict';

import * as tmrn from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';

const taskPath = path.join(__dirname, '..', 'AssetSuiteJobs.js');
const tr: tmrn.TaskMockRunner = new tmrn.TaskMockRunner(taskPath);

// Task inputs
tr.setInput('ActionType', 'JobStatus');
tr.setInput('ApiRootUri', 'https://as-dev.inl.gov/as/fa/rest/batch');
tr.setInput('UserName', 'asbatch');
tr.setInput('UserPassword', 'dkBM8PH$mVeFnSRaf79!JvcT2');
tr.setInput('IgnoreInvalidSSL', 'true');
tr.setInput('JobExecId', '131');


tr.run();