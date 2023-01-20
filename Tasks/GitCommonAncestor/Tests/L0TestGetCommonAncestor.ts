'use strict';

import * as tmrn from 'azure-pipelines-task-lib/mock-run';
//import * as ma from 'azure-pipelines-task-lib/mock-answer';
import * as path from 'path';

const taskPath = path.join(__dirname, '..', 'GitAncestor.js');
const tr: tmrn.TaskMockRunner = new tmrn.TaskMockRunner(taskPath);

// Task inputs
tr.setInput('FirstCommit', '3747aa554fc71d94f60ff28706348c6df71ab259');
tr.setInput('SecondCommit', 'a9308fe74d511206f8dbbb6c8590a1aa346dfcc1');
tr.setInput('RepoLocation', 'D:\\Git\\BusinessSystems\\AssetSuite-Interfaces');
tr.setInput('OutputVariable', 'Artifact.CommonAncestor');

// Provide Answers for mocked test
/*
const a: ma.TaskLibAnswers = <ma.TaskLibAnswers>{
    checkPath: {
        "D:\\Git\\BusinessSystems\\AssetSuite-Interfaces": true
    },
    exec: {
        "git merge-base 3747aa554fc71d94f60ff28706348c6df71ab259 a9308fe74d511206f8dbbb6c8590a1aa346dfcc1": {
            code: 1,
            stdout: "test",
            stderr: undefined
        }
    }
}
tr.setAnswers(a);
*/

// The tool runner in the task is not using mocked answers so just run normally for now
tr.run(true);