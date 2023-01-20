'use strict';

import * as ttm from 'azure-pipelines-task-lib/mock-test';
import * as assert from 'assert';
import * as path from 'path';

describe('ReleaseStepStatus Suite', function () {
    const timeout: number = process.env.TASK_TEST_TIMEOUT ? parseInt(process.env.TASK_TEST_TIMEOUT) : 20000;
    this.timeout(timeout);
    before(() => {

    });
    after(() => {

    });

    it('Get Release Step Status', (done: MochaDone) => {
        this.timeout(1000);

        const tp: string = path.join(__dirname, 'L0TestGetStepStatus.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();

        assert.equal(tr.invokedToolCount, 0, 'should invoke 0 tools');
        assert.equal(tr.stderr.length > 0, true, 'should have node warnings written to stderr');
        assert.equal(tr.warningIssues.length, 0, 'should have 0 warnings');
        assert.equal(tr.succeeded, true, 'task should have succeeded');

        done();
    });
});