'use strict';

import * as ttm from 'azure-pipelines-task-lib/mock-test';
import * as assert from 'assert';
import * as path from 'path';

describe('ExecutePlSqlV3 Suite', function () {
    const timeout: number = process.env.TASK_TEST_TIMEOUT ? parseInt(process.env.TASK_TEST_TIMEOUT) : 20000;
    this.timeout(timeout);
    before(() => {

    });
    after(() => {

    });

    it('Automagic Script', (done: MochaDone) => {
        this.timeout(1000);

        const tp: string = path.join(__dirname, 'L0TestAutomagicScript.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run(); 

        assert.equal(tr.invokedToolCount, 3, 'should invoke 3 tools');
        assert.equal(tr.stderr.length, 0, 'should not have written to stderr');
        assert.equal(tr.succeeded, true, 'task should have succeeded');

        done();
    });

    it('Inline Script', (done: MochaDone) => {
        this.timeout(1000);

        const tp: string = path.join(__dirname, 'L0TestInlineSqlScript.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();

        assert.equal(tr.invokedToolCount, 2, 'should invoke 2 tools');
        assert.equal(tr.stderr.length, 0, 'should not have written to stderr');
        assert.equal(tr.succeeded, true, 'task should have succeeded');

        done();
    });

    it('Bad Sql Errors Script', (done: MochaDone) => {
        this.timeout(1000);

        const tp: string = path.join(__dirname, 'L0TestBadSQLScriptErrors.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();

        assert.equal(tr.invokedToolCount, 2, 'should invoke 2 tools');
        assert.equal(tr.stderr.length, 0, 'should not have written to stderr');
        assert.equal(tr.errorIssues.length, 2, 'should have 2 error issues, have ' + tr.errorIssues.length);
        assert.equal(tr.errorIssues[0].includes('ORA-01756'), true, 'expected error issue of \'ORA-01756: quoted string not properly terminated\'');
        assert.equal(tr.failed, true, 'task should have failed');

        done();
    });

    it('Error Regex', (done: MochaDone) => {
        this.timeout(1000);

        const tp: string = path.join(__dirname, 'L0TestErrorRegex.js');
        const tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();

        assert.equal(tr.invokedToolCount, 0, 'should invoke 0 tools');
        assert.equal(tr.stderr.length, 0, 'should have nothing written to stderr');
        assert.equal(tr.errorIssues.length, 0, 'should have 0 error issues, have ' + tr.errorIssues.length);
        assert.equal(tr.succeeded, true, 'task should have succeeded');

        done();
    });
});