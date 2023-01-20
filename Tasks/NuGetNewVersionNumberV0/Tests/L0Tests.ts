'use strict';

import * as ttm from 'azure-pipelines-task-lib/mock-test';
import * as assert from 'assert';
import * as path from 'path';

describe('Execute NuGetNewVersionNumberV0 Suite', function () {
    const timeout: number = process.env.TASK_TEST_TIMEOUT ? parseInt(process.env.TASK_TEST_TIMEOUT) : 20000;
    this.timeout(timeout);
    before(() => {

    });
    after(() => {

    });

    it('NuGet Generate Major Version', (done: Mocha.Done) => {
        this.timeout(1000);

        const tp: string = path.join(__dirname, 'L0TestMajorVersion.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run(); 

        assert.strictEqual(tr.stderr.length, 0, 'should not have written to stderr');
        assert.strictEqual(tr.succeeded, true, 'task should have succeeded');

        done();
    });

    it('NuGet Generate Minor Version', (done: Mocha.Done) => {
        this.timeout(1000);

        const tp: string = path.join(__dirname, 'L0TestMinorVersion.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run(); 

        assert.strictEqual(tr.stderr.length, 0, 'should not have written to stderr');
        assert.strictEqual(tr.succeeded, true, 'task should have succeeded');

        done();
    });

    it('NuGet Generate Patch Version', (done: Mocha.Done) => {
        this.timeout(1000);

        const tp: string = path.join(__dirname, 'L0TestPatchVersion.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run(); 

        assert.strictEqual(tr.stderr.length, 0, 'should not have written to stderr');
        assert.strictEqual(tr.succeeded, true, 'task should have succeeded');

        done();
    });

    it('NuGet Generate Version for New Package', (done: Mocha.Done) => {
        this.timeout(1000);

        const tp: string = path.join(__dirname, 'L0TestNewPackage.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run(); 

        assert.strictEqual(tr.stderr.length, 0, 'should not have written to stderr');
        assert.strictEqual(tr.succeeded, true, 'task should have succeeded');

        done();
    });
});