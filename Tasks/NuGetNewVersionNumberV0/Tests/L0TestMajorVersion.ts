'use strict';

// npm run build-test-single -- -TestName L0TestMajorVersion

import * as tmrn from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';
import { UpdateType } from '../Common';

const taskPath = path.join(__dirname, '..', 'NuGetNewVersionNumber.js')
const tr: tmrn.TaskMockRunner = new tmrn.TaskMockRunner(taskPath);

// Variables needed for the task
process.env['BUILD_SOURCEBRANCHNAME'] = 'test';
process.env['SYSTEM_COLLECTIONURI'] = 'https://tfs.inl.gov/tfs/DefaultCollection/';
process.env['SYSTEM_ACCESSTOKEN'] = 'ue56nro4w7o2y3z7cp6apnyyo6xhez7rkvtbwg3rcmhodio6kcca';

// Task inputs
tr.setInput('PackageId', 'Inl.Bs4.MvcHelper');
tr.setInput('UpdateType', UpdateType.Major);
tr.setInput('FeedPublish', '38b1ef7a-2da8-4a91-85e8-7d061033307e');
tr.setInput('OutputVariableNameReleaseVersion', 'ReleaseVersion');
tr.setInput('OutputVariableNamePrereleaseVersion', 'PrereleaseVersion');
tr.setInput('UpdateBuildNumber', 'true');

// Run as not mocked so we will actually run
tr.run(true);