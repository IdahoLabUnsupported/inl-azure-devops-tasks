'use strict';

import * as tmrn from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';

const taskPath = path.join(__dirname, '..', 'AssetSuiteJobs.js');
const tr: tmrn.TaskMockRunner = new tmrn.TaskMockRunner(taskPath);

// Task inputs
tr.setInput('ActionType', 'WaitForAsync');
tr.setInput('ApiRootUri', 'https://as-dev.inl.gov/as/fa/rest/batch');
tr.setInput('UserName', 'asbatch');
tr.setInput('UserPassword', 'dkBM8PH$mVeFnSRaf79!JvcT2');
tr.setInput('IgnoreInvalidSSL', 'true');
tr.setInput('JobExecId', 'null');
tr.setInput('Timeout', '10000');


tr.run();