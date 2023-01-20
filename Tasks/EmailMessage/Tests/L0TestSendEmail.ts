'use strict';

import * as tmrn from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';

const taskPath = path.join(__dirname, '..', 'SendEmail.js');
const tr: tmrn.TaskMockRunner = new tmrn.TaskMockRunner(taskPath);

// Variables needed for the task
process.env['AGENT_TEMPDIRECTORY'] = __dirname;

// Task inputs
tr.setInput('To', 'patrick.gunerud@inl.gov');
//tr.setInput('CC', 'kaleb.houck@inl.gov');
//tr.setInput('BCC', 'patrick.gunerud@inl.gov');
tr.setInput('From', 'no-reply@inl.gov');
tr.setInput('Subject', '[Testing]: Task Test');
tr.setInput('Body', 'Test Message from New Task');
tr.setInput('BodyAsHtml', 'false');
tr.setInput('Attachment', 'C:\\Temp\\chart.jpg');
tr.setInput('SmtpServer', 'mailhost.inl.gov');
tr.setInput('SmtpPort', '25');
//tr.setInput('SmtpUsername', '');
//tr.setInput('SmtpPassword', '');
tr.setInput('UseSSL', 'false');

// Run as not mocked so we will actually run
tr.run(true);