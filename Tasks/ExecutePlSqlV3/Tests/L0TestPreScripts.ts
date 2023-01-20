'use strict';

import * as tmrn from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';

const taskPath = path.join(__dirname, '..', 'ExecuteSqlPlus.js');
const tr: tmrn.TaskMockRunner = new tmrn.TaskMockRunner(taskPath);

// Variables needed for the task
process.env['AGENT_TEMPDIRECTORY'] = __dirname;
process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = 'C:\\Users\\HAWKBG\\Documents\\Repos\\DMX_IMP-DMX';

// Task inputs
tr.setInput('SQLRunType', 'AutoMagic');
tr.setInput('StartCommit', '175a9b7930fe08d10248d32e3ddb790c66c0da36');
tr.setInput('EndCommit', '6489ceee3dd6f0c375a276a1a98c2e627db24c18');
tr.setInput('RepoLocation', 'C:\\Users\\HAWKBG\\Documents\\Repos\\DMX_IMP-DMX');
tr.setInput('FailOnSqlError', 'true');
tr.setInput('DebugSQL', 'true');
tr.setInput('Parameters', '');
tr.setInput('LaunchMode', 'sync');
tr.setInput('JobOutputVariable', '');
tr.setInput('SubstitutionCharacter', '`');
tr.setInput('UserName', 'GATEKEEPER');
tr.setInput('UserPassword', 'u#Ad65*hny?X=fVBhT#R%G=Z#');
tr.setInput('SqlProxyUser', 'INTERFACES');
tr.setInput('HostName', 'devops-dev-db.inl.gov');
tr.setInput('PortNumber', '1521');
tr.setInput('ServiceName', 'DB1');
tr.setInput('ShowWarnings', 'true');
tr.setInput('DefineEscape', 'true');
tr.setInput('UseSubstitutionVariables', 'true');
tr.setInput('SQLTestConnectionTimeoutSeconds', '5');
tr.setInput('SetServeroutput', 'true');
tr.setInput('RunPostPrivilegesConfiguration', 'true');


// Run as not mocked so we will actually run
tr.run(true);

