
import * as path from 'path';
import * as tl from 'azure-pipelines-task-lib/task';
import * as config from './Configuration';
import * as g from './Generator';

tl.setResourcePath(path.join(__dirname, 'task.json'));

export async function run(): Promise<void> {
    try {
        // Read the task inputs
        const configuration = <config.IConfiguration>{
            configurationRootPath: tl.getPathInput('ConfigurationRootPath', true),
            wafId: tl.getInput('WafID', true),
            nginxConfigDirectory: tl.getPathInput('NginxConfigDirectory', true),
            modsecConfigDirectory: tl.getPathInput('ModsecConfigDirectory', true)
        };
        const loader = new config.ConfigurationLoader(configuration);
        loader.load();

        // Now generate the configuration
        const generator = new g.ConfigurationFileGenerator(loader);
        generator.exec();

        tl.setResult(tl.TaskResult.Succeeded, tl.loc('Success'));
    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, tl.loc('UnhandledProcessFailure', err), true);
        process.exit(1); // Force exit to kill any async methods
    }
}

run();