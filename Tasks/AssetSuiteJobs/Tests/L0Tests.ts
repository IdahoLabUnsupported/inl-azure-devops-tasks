'use strict';

import * as ttm from 'azure-pipelines-task-lib/mock-test';
import * as assert from 'assert';
import * as path from 'path';


describe('Asset Suite Jobs Suite', function () {
    const timeout: number = process.env.TASK_TEST_TIMEOUT ? parseInt(process.env.TASK_TEST_TIMEOUT) : 20000;
    this.timeout(timeout);
    before(() => {

    });
    after(() => {

    });

    it('Get Job Status Success Job', (done: MochaDone) => {
        this.timeout(1000);

        const tp: string = path.join(__dirname, 'L0TestJobStatusSuccess.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();

        assert.equal(tr.invokedToolCount, 0, 'should invoke no tool runners');
        assert.equal(tr.stderr.length, 0, 'should not have written to stderr');
        assert.equal(tr.succeeded, true, 'task should have succeeded');

        done();
    });

    it('Get Job Status Failed Job', (done: MochaDone) => {
        this.timeout(1000);

        const tp: string = path.join(__dirname, 'L0TestJobStatusFailed.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();

        assert.equal(tr.invokedToolCount, 0, 'should invoke no tool runners');
        assert.equal(tr.stderr.length,0, 'should not have written to stderr');
        assert.equal(tr.failed, false, 'task should have failed');

        done();
    });

    it('Launch Job Synchronously', (done: MochaDone) => {
        this.timeout(1000);

        const tp: string = path.join(__dirname, 'L0TestLaunchJobSync.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();

        assert.equal(tr.invokedToolCount, 0, 'should invoke no tool runners');
        assert.equal(tr.stderr.length, 0, 'should not have written to stderr');
        assert.equal(tr.succeeded, true, 'task should have succeeded');

        done();
    });

    it('Launch Job Asynchronously', (done: MochaDone) => {
        this.timeout(1000);

        const tp: string = path.join(__dirname, 'L0TestLaunchJobAsync.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();

        assert.equal(tr.invokedToolCount, 0, 'should invoke no tool runners');
        assert.equal(tr.stderr.length, 0, 'should not have written to stderr');
        assert.equal(tr.succeeded, true, 'task should have succeeded');

        done();
    });

    it('Launch Job Asynchronously - Failure', (done: MochaDone) => {
        this.timeout(1000);

        const tp: string = path.join(__dirname, 'L0TestLaunchJobAsyncFailed.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();

        assert.equal(tr.invokedToolCount, 0, 'should invoke no tool runners');
        assert.equal(tr.stderr.length, 0, 'should not have written to stderr');
        assert.equal(tr.succeeded, false, 'task should have failed');

        done();
    });

    it('Wait for Async Job', (done: MochaDone) => {
        this.timeout(1000);

        const tp: string = path.join(__dirname, 'L0TestWaitForJob.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();

        assert.equal(tr.invokedToolCount, 0, 'should invoke no tool runners');
        assert.equal(tr.stderr.length, 0, 'should not have written to stderr');
        assert.equal(tr.succeeded, true, 'task should have succeeded');

        done();
    });

    it('Wait for Async Job Bad Job Id', (done: MochaDone) => {
        this.timeout(1000);

        const tp: string = path.join(__dirname, 'L0TestWaitForJobBadJobId.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();

        assert.equal(tr.invokedToolCount, 0, 'should invoke no tool runners');
        assert.equal(tr.stderr.length, 0, 'should not have written to stderr');
        assert.equal(tr.succeeded, false, 'task should have failed');

        done();
    });
});