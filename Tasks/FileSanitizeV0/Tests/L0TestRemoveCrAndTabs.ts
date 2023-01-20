'use strict';

import * as tmrn from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';
import * as fs from 'fs';
import * as th from './TestHelpers';

const taskPath = path.join(__dirname, '..', 'FileSanitize.js');
const tr: tmrn.TaskMockRunner = new tmrn.TaskMockRunner(taskPath);
const testSourceFolder = path.join(__dirname, 'TestSourceFolder');
const testFilePath = path.join(testSourceFolder, 'testfile.txt');
const specificTestFilePath = path.join(testSourceFolder, 'RemoveCrAndTabs.txt')

// copy test file to working test file
fs.copyFileSync(testFilePath, specificTestFilePath);

// Task inputs
tr.setInput('SourceFolder', testSourceFolder);
tr.setInput('Files', 'RemoveCrAndTabs.txt');
tr.setInput('ContinueProcessingOnError', 'true');
tr.setInput('RemoveCarriageReturns', 'true');
tr.setInput('RemoveTabs', 'true');

// Run as not mocked so we will actually run
tr.run(true);

th.VerifyFileContents(specificTestFilePath, false, false);