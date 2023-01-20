'use strict';

import * as tmrn from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';

const taskPath = path.join(__dirname, '..', 'ExecuteSqlPlus.js');
const tr: tmrn.TaskMockRunner = new tmrn.TaskMockRunner(taskPath);

// Variables needed for the task
process.env['AGENT_TEMPDIRECTORY'] = __dirname;
process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = 'C:\\Users\\HAWKBG\\Documents\\EDMS_Git_Repo';

// Task inputs
tr.setInput('SQLRunType', 'Script');
tr.setInput('SQLScript', 'select 1 from dual;');
tr.setInput('FailOnSqlError', 'true');
tr.setInput('DebugSQL', 'false');
tr.setInput('Parameters', '');
tr.setInput('SubstitutionCharacter', '`');
tr.setInput('UserName', 'GATEKEEPER');
tr.setInput('UserPassword', 'asdfgasdfgasdfgasdfgASDFG1234%');
tr.setInput('HostName', 'devops-dev-db.inl.gov');
tr.setInput('PortNumber', '1521');
tr.setInput('ServiceName', 'DB1');
// tr.setInput('SqlProxyUser', 'DATABASE_UP');
tr.setInput('SqlProxyUser', '$(DatabaseProxyUser)');
tr.setInput('ShowWarnings', 'true');
tr.setInput('DefineEscape', 'true');
tr.setInput('UseSubstitutionVariables', 'true');
tr.setInput('SQLTestConnectionTimeoutSeconds', '3');
tr.setInput('SetServeroutput', 'true');

// Run as not mocked so we will actually run
tr.run(true);

