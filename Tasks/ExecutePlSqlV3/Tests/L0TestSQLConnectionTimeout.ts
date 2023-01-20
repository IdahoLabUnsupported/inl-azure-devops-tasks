'use strict';

import * as tmrn from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';

const taskPath = path.join(__dirname, '..', 'ExecuteSqlPlus.js');
const tr: tmrn.TaskMockRunner = new tmrn.TaskMockRunner(taskPath);

// Variables needed for the task
process.env['AGENT_TEMPDIRECTORY'] = __dirname;
process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = __dirname;

// Task inputs
tr.setInput('SQLRunType', 'Script');
tr.setInput('SQLScript', 'select 1 from dual;');
tr.setInput('FailOnSqlError', 'true');
tr.setInput('DebugSQL', 'false');
tr.setInput('Parameters', '');
tr.setInput('SubstitutionCharacter', 'OFF');
tr.setInput('UserName', 'DMX_IMP');
tr.setInput('UserPassword', 'dmx_imp');
tr.setInput('HostName', 'olmd5.inl.gov');
tr.setInput('PortNumber', '1526');
tr.setInput('ServiceName', 'dmx.inl.gov');
tr.setInput('ShowWarnings', 'true');
tr.setInput('DefineEscape', 'true');
tr.setInput('UseSubstitutionVariables', 'true');
tr.setInput('SQLTestConnectionTimeoutSeconds', '20');
tr.setInput('SetServeroutput', 'true');
tr.setInput('RunPostPrivilegesConfiguration', 'false');

// Run as not mocked so we will actually run
tr.run(true);