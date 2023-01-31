'use strict';

import * as path from 'path';
import * as fs from 'fs';
import * as tl from 'azure-pipelines-task-lib/task';

tl.setResourcePath(path.join(__dirname, 'task.json'));

async function run(): Promise<void> {
    try {
        // Read inputs
        const sourceFolder: string = tl.getPathInput('SourceFolder', true, true);
        const files: string[] = tl.getDelimitedInput('Files', '\n', true);
        const continueProcessingOnError: boolean = tl.getBoolInput('ContinueProcessingOnError', true);
        const removeCarriageReturns: boolean = tl.getBoolInput('RemoveCarriageReturns', true);
        const removeTabs: boolean = tl.getBoolInput('RemoveTabs', true);

        //Log inputs
        console.log(tl.loc('LogInputs', 'SourceFolder', sourceFolder));
        console.log(tl.loc('LogInputs', 'ContinueProcessingOnError', continueProcessingOnError));
        console.log(tl.loc('LogInputs', 'RemoveCarriageReturns', removeCarriageReturns));
        console.log(tl.loc('LogInputs', 'RemoveTabs', removeTabs));
        files.forEach(file => {
            console.log(tl.loc('LogInputs', 'Files', file));
        });

        // If no actions will take place then we can return
        if (!removeCarriageReturns && !removeTabs) {
            return;
        }

        // Find all files that match the source folder and file criteria.
        const allPaths: string[] = tl.find(sourceFolder); // default find options (follow sym links)
        const matchedPaths: string[] = tl.match(allPaths, files, sourceFolder); // default match options
        const matchedFiles: string[] = matchedPaths.filter((itemPath: string) => !tl.stats(itemPath).isDirectory()); // filter-out directories

        // Log the count of files found and the file names.
        console.log(tl.loc('FoundFileCount', matchedFiles.length));
        matchedFiles.forEach(filePath => {
            console.log(tl.loc('FoundFile', filePath));
        });

        //Process the files
        await matchedFiles.forEach(async filePath => {
            await ProcessFile(filePath, removeCarriageReturns, removeTabs);
        });

        tl.setResult(tl.TaskResult.Succeeded, tl.loc('Success'));
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, tl.loc('UnhandledProcessFailure', err), true);
    }
}

// For testing. When the import is ran the sanitize would immediately execute.
if (process.env.NODE_ENV !== 'TEST') {
    console.log('Running');
    run();
}

// For use in the test script.
export { run as processFiles};

async function ProcessFile(filePath: string, removeCarriageReturns: boolean, removeTabs: boolean) {
    console.log(tl.loc('ProcessingFile', filePath));

    try {
        let contents = fs.readFileSync(filePath, 'utf8');
        console.log('File read');

        if (removeCarriageReturns) {
            contents = MatchAndReplace(contents, '\r', '');
        }

        if (removeTabs) {
            contents = MatchAndReplace(contents, '\t', '');
        }

        fs.writeFileSync(filePath, contents, 'utf8');
        console.log('File saved');
    } catch (err) {
        tl.setResult(tl.TaskResult.SucceededWithIssues, tl.loc('UnhandledFileFailure', filePath, err), false);
    }
}

function MatchAndReplace(content: string, expression: string, valueToReplace: string): string {
    const regExModifier: string = 'g';

    const regEx: RegExp = new RegExp(expression, regExModifier);

    return content.replace(regEx, valueToReplace);
}