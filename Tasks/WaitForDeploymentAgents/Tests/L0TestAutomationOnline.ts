'use strict';

import * as tmrn from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';

const taskPath = path.join(__dirname, '..', 'WaitForAgents.js');
const tr: tmrn.TaskMockRunner = new tmrn.TaskMockRunner(taskPath);

// Variables needed for the task
process.env['SYSTEM_TEAMFOUNDATIONCOLLECTIONURI'] = 'https://tfs.inl.gov/tfs/DefaultCollection/';
process.env['SYSTEM_TEAMPROJECT'] = 'BusinessSystems';

// Task inputs
tr.setInput('PoolName', 'Automation');
tr.setInput('StatusType', 'Online');
tr.setInput('IgnoreInvalidSSL', 'False');
tr.setInput('Token', 'os2j7ug3grblwj7g6o3hsnxqochnruqleh2nvxc4h5lofjrtdw7q');


tr.run(true);