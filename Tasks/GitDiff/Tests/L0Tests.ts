'use strict';

import * as ttm from 'azure-pipelines-task-lib/mock-test';
import * as assert from 'assert';
import * as path from 'path';

describe('GitDiff Suite', function () {
    const timeout: number = process.env.TASK_TEST_TIMEOUT ? parseInt(process.env.TASK_TEST_TIMEOUT) : 20000;
    this.timeout(timeout);
    before(() => {

    });
    after(() => {

    });

    it('Set Variables', (done: MochaDone) => {
        this.timeout(1000);

        const tp: string = path.join(__dirname, 'L0TestSetVariables.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();

        assert.equal(tr.invokedToolCount, 1, 'should invoke 1 tools');
        assert.equal(tr.stderr.length, 0, 'should have no warnings written to stderr');
        assert.equal(tr.succeeded, true, 'task should have succeeded');

        done();
    });

    it('JSON File', (done: MochaDone) => {
        this.timeout(1000);

        const tp: string = path.join(__dirname, 'L0TestJsonFile.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();

        assert.equal(tr.invokedToolCount, 1, 'should invoke 1 tools');
        assert.equal(tr.stderr.length, 0, 'should have no warnings written to stderr');
        assert.equal(tr.succeeded, true, 'task should have succeeded');

        done();
    });
});