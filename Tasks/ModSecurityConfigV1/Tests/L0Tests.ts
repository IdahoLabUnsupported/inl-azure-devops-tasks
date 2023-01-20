'use strict';

import * as ttm from 'azure-pipelines-task-lib/mock-test';
//import * as assert from 'assert';
import * as path from 'path';

describe('ModSecurityConfigV1 Suite', function () {
    const timeout: number = process.env.TASK_TEST_TIMEOUT ? parseInt(process.env.TASK_TEST_TIMEOUT) : 20000;
    this.timeout(timeout);
    before(() => {

    });
    after(() => {

    });

    it('Generate Environment Config', (done: MochaDone) => {
        this.timeout(1000);

        const tp: string = path.join(__dirname, 'L0TestGenerateEnvironmentConfig.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run(); 

        // assert.equal(tr.invokedToolCount, 3, 'should invoke 3 tools');
        // assert.equal(tr.stderr.length, 0, 'should not have written to stderr');
        // assert.equal(tr.succeeded, true, 'task should have succeeded');

        done();
    });
});