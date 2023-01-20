'use strict';

import * as tmrn from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';

const taskPath = path.join(__dirname, '..', 'ExecuteSqlPlus.js');
const tr: tmrn.TaskMockRunner = new tmrn.TaskMockRunner(taskPath);

// Variables needed for the task
process.env['AGENT_TEMPDIRECTORY'] = __dirname;
process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = 'D:\\Git\\BusinessSystems\\AssetSuite-INL';

// Task inputs
tr.setInput('SQLRunType', 'AutoMagic');
tr.setInput('StartCommit', '73ac7865d48ad0974d37bac940c9803cf9e85dad');
tr.setInput('EndCommit', '473584d4396a20e468c8092f2646547d5e7f518c');
tr.setInput('RepoLocation', 'D:\\Git\\BusinessSystems\\AssetSuite-INL');
tr.setInput('FailOnSqlError', 'true');
tr.setInput('DebugSQL', 'true');
tr.setInput('Parameters', '-USER_PASSWORD "SomeR#34_text!" -SomeParam Test -Third 4 -Forth "text with space"');
tr.setInput('LaunchMode', 'sync');
tr.setInput('JobOutputVariable', 'AssetSuite.JobId');
tr.setInput('SubstitutionCharacter', '`');
tr.setInput('UserName', 'INL');
tr.setInput('UserPassword', 'inl123');
tr.setInput('HostName', 'osmd21.inl.gov');
tr.setInput('PortNumber', '1532');
tr.setInput('ServiceName', 'IACP');
tr.setInput('ShowWarnings', 'true');
tr.setInput('DefineEscape', 'true');
tr.setInput('UseSubstitutionVariables', 'true');

// Run as not mocked so we will actually run
tr.run(true);