import * as fs from 'fs';
import * as assert from 'assert';
import { isNull } from 'util';

export function VerifyFileContents(testFilePath: string, carriageReturnsShouldExist: boolean, tabsShouldExist: boolean) {
    const fileContents = fs.readFileSync(testFilePath, 'utf8');

    console.log(`Ensure that carriage returns ${carriageReturnsShouldExist ? '' : 'do not '}exist and that tabs ${tabsShouldExist ? '' : 'do not '}exist.`);
    console.log('Check for existence of carriage returns');
    const carriageReturns = Find(fileContents, '\r');

    if (carriageReturnsShouldExist) {
        assert.equal(isNull(carriageReturns), false, 'The carriage return search results must not be null');
        assert.equal(carriageReturns!.length > 0, true, 'There must be at least one carriage return. Actual Count: ');
    } else {
        assert.equal(isNull(carriageReturns) || carriageReturns!.length === 0, true, 'There must be no carriage returns');
    }

    console.log('Check for existence of tabs');
    const tabs = Find(fileContents, '\t');

    if (tabsShouldExist) {
        assert.equal(isNull(tabs), false, 'The tab search results must not be null');
        assert.equal(tabs!.length > 0, true, 'There must be at least one tab');
    } else {
        assert.equal(isNull(tabs) || tabs!.length === 0, true, 'There must be no tabs');
    }
}

// Helper function for searching file contents.
function Find(content: string, expression: string): RegExpMatchArray | null {
    const regExModifier: string = 'g';

    const regEx = new RegExp(expression, regExModifier);

    return content.match(regEx);
}