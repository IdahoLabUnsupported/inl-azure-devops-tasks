'use strict';

import * as tmrn from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';

const taskPath = path.join(__dirname, '..', 'GitDiff.js');
const tr: tmrn.TaskMockRunner = new tmrn.TaskMockRunner(taskPath);

// Task inputs
tr.setInput('StartCommit', 'b65cd0de1843d63f2d0db82cefb0f8d830ca1e60');
tr.setInput('EndCommit', '799ecb78860daafdda2218e2c0ff394770aa2d8b');
tr.setInput('RepoLocation', 'D:\\Git\\BusinessSystems\\ECR-SIMS');

// Run as not mocked so we actually try it
tr.run(true);