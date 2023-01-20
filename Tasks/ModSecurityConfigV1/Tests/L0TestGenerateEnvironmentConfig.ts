'use strict';

import * as tmrn from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';

const taskPath = path.join(__dirname, '..', 'GenerateConfig.js');
const tr: tmrn.TaskMockRunner = new tmrn.TaskMockRunner(taskPath);
const repoPath = 'C:\\Git\\AzureAdministration\\ModSecurityConfig\\';

// Variables needed for the task
process.env['AGENT_TEMPDIRECTORY'] = __dirname;
process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = repoPath;

// Task inputs
tr.setInput('WafID', 'acc');
tr.setInput('ConfigurationRootPath', path.join(repoPath, 'config'));
tr.setInput('NginxConfigDirectory', path.join(repoPath, 'etc/nginx/conf.d'));
tr.setInput('ModsecConfigDirectory', path.join(repoPath, 'etc/nginx/modsec_includes.d'));

// Run as not mocked so we will actually run
tr.run(true);