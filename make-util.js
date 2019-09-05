var check = require('validator');
var fs = require('fs');
var makeOptions = require('./make-options.json');
var minimatch = require('minimatch');
var ncp = require('child_process');
var os = require('os');
var path = require('path');
var process = require('process');
var semver = require('semver');
var shell = require('shelljs');
var syncRequest = require('sync-request');

// global paths
var downloadPath = path.join(__dirname, '_download');

// list of .NET culture names
var cultureNames = ['cs', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'pt-BR', 'ru', 'tr', 'zh-Hans', 'zh-Hant'];

//------------------------------------------------------------------------------
// shell functions
//------------------------------------------------------------------------------
var shellAssert = function () {
    var errMsg = shell.error();
    if (errMsg) {
        throw new Error(errMsg);
    }
}

var cd = function (dir) {
    var cwd = process.cwd();
    if (cwd != dir) {
        console.log('');
        console.log(`> cd ${path.relative(cwd, dir)}`);
        shell.cd(dir);
        shellAssert();
    }
}
exports.cd = cd;

var cp = function (options, source, dest) {
    if (dest) {
        shell.cp(options, source, dest);
    }
    else {
        shell.cp(options, source);
    }

    shellAssert();
}
exports.cp = cp;

var mkdir = function (options, target) {
    if (target) {
        shell.mkdir(options, target);
    }
    else {
        shell.mkdir(options);
    }

    shellAssert();
}
exports.mkdir = mkdir;

var rm = function (options, target) {
    if (target) {
        shell.rm(options, target);
    }
    else {
        shell.rm(options);
    }

    shellAssert();
}
exports.rm = rm;

var ls = function (p) {
    var result = shell.ls(p);
    shellAssert();
    return result;
}
exports.ls = ls;

var test = function (options, p) {
    var result = shell.test(options, p);
    shellAssert();
    return result;
}
exports.test = test;
//------------------------------------------------------------------------------

var assert = function (value, name) {
    if (!value) {
        throw new Error('"' + name + '" cannot be null or empty.');
    }
}
exports.assert = assert;

var banner = function (message, noBracket) {
    console.log();
    if (!noBracket) {
        console.log('------------------------------------------------------------');
    }
    console.log(message);
    if (!noBracket) {
        console.log('------------------------------------------------------------');
    }
}
exports.banner = banner;

var rp = function (relPath) {
    return path.join(pwd() + '', relPath);
}
exports.rp = rp;

var fail = function (message) {
    console.error('ERROR: ' + message);
    process.exit(1);
}
exports.fail = fail;

var ensureExists = function (checkPath) {
    assert(checkPath, 'checkPath');
    var exists = test('-d', checkPath) || test('-f', checkPath);

    if (!exists) {
        fail(checkPath + ' does not exist');
    }
}
exports.ensureExists = ensureExists;

var pathExists = function (checkPath) {
    return test('-d', checkPath) || test('-f', checkPath);
}
exports.pathExists = pathExists;

/**
 * Given a module path, gets the info used for generating a pack file
 */
var getCommonPackInfo = function (modOutDir) {
    // assert the module has a package.json
    var packageJsonPath = path.join(modOutDir, 'package.json');
    if (!test('-f', packageJsonPath)) {
        fail(`Common module package.json does not exist: '${packageJsonPath}'`);
    }

    // assert the package name and version
    var packageJson = JSON.parse(fs.readFileSync(packageJsonPath));
    if (!packageJson || !packageJson.name || !packageJson.version) {
        fail(`The common module's package.json must define a name and version: ${packageJsonPath}`);
    }

    var packFileName = `${packageJson.name}-${packageJson.version}.tgz`;
    return {
        "packageName": packageJson.name,
        "packFilePath": path.join(path.dirname(modOutDir), packFileName)
    };
}
exports.getCommonPackInfo = getCommonPackInfo;

var buildNodeTask = function (taskPath, outDir) {
    var originalDir = pwd();
    cd(taskPath);
    var packageJsonPath = rp('package.json');
    if (test('-f', packageJsonPath)) {
        run('npm install');
    }

    if (test('-f', rp(path.join('Tests', 'package.json')))) {
        cd(rp('Tests'));
        run('npm install');
        cd(taskPath);
    }

    run('tsc --outDir ' + outDir + ' --rootDir ' + taskPath);
    cd(originalDir);
}
exports.buildNodeTask = buildNodeTask;

var taskBuildCleanup = function (outDir) {
    assert(outDir, 'outDir');

    var toClean = makeOptions['taskClean'];
    toClean.forEach(function (item) {
        matchFind(item, outDir, { noRecurse: true, matchBase: true })
            .forEach(function (toRemove) {
                rm('-Rf', toRemove);
            });
    });
}
exports.taskBuildCleanup = taskBuildCleanup;

var copyTaskResources = function (taskMake, srcPath, destPath) {
    assert(taskMake, 'taskMake');
    assert(srcPath, 'srcPath');
    assert(destPath, 'destPath');

    // copy the globally defined set of default task resources
    var toCopy = makeOptions['taskResources'];
    toCopy.forEach(function (item) {
        matchCopy(item, srcPath, destPath, { noRecurse: true, matchBase: true });
    });

    // copy the locally defined set of resources
    if (taskMake.hasOwnProperty('cp')) {
        copyGroups(taskMake.cp, srcPath, destPath);
    }

    // remove the locally defined set of resources
    if (taskMake.hasOwnProperty('rm')) {
        removeGroups(taskMake.rm, destPath);
    }
}
exports.copyTaskResources = copyTaskResources;

var matchFind = function (pattern, root, options) {
    assert(pattern, 'pattern');
    assert(root, 'root');

    // create a copy of the options
    var clone = {};
    Object.keys(options || {}).forEach(function (key) {
        clone[key] = options[key];
    });
    options = clone;

    // determine whether to recurse
    var noRecurse = options.hasOwnProperty('noRecurse') && options.noRecurse;
    delete options.noRecurse;

    // normalize first, so we can substring later
    root = path.resolve(root);

    // determine the list of items
    var items;
    if (noRecurse) {
        items = fs.readdirSync(root)
            .map(function (name) {
                return path.join(root, name);
            });
    }
    else {
        items = find(root)
            .filter(function (item) { // filter out the root folder
                return path.normalize(item) != root;
            });
    }

    return minimatch.match(items, pattern, options);
}
exports.matchFind = matchFind;

var matchCopy = function (pattern, sourceRoot, destRoot, options) {
    assert(pattern, 'pattern');
    assert(sourceRoot, 'sourceRoot');
    assert(destRoot, 'destRoot');

    console.log(`copying ${pattern}`);

    // normalize first, so we can substring later
    sourceRoot = path.resolve(sourceRoot);
    destRoot = path.resolve(destRoot);

    matchFind(pattern, sourceRoot, options)
        .forEach(function (item) {
            // create the dest dir based on the relative item path
            var relative = item.substring(sourceRoot.length + 1);
            assert(relative, 'relative'); // should always be filterd out by matchFind
            var dest = path.dirname(path.join(destRoot, relative));
            mkdir('-p', dest);

            cp('-Rf', item, dest + '/');
        });
}
exports.matchCopy = matchCopy;

var run = function (cl, inheritStreams, noHeader) {
    if (!noHeader) {
        console.log();
        console.log('> ' + cl);
    }

    var options = {
        stdio: inheritStreams ? 'inherit' : 'pipe'
    };
    var rc = 0;
    var output;
    try {
        output = ncp.execSync(cl, options);
    }
    catch (err) {
        if (!inheritStreams) {
            console.error(err.output ? err.output.toString() : err.message);
        }

        process.exit(1);
    }

    return (output || '').toString().trim();
}
exports.run = run;

var ensureTool = function (name, versionArgs, validate) {
    console.log(name + ' tool:');
    var toolPath = which(name);
    if (!toolPath) {
        fail(name + ' not found.  might need to run npm install');
    }

    if (versionArgs) {
        var result = exec(name + ' ' + versionArgs);
        if (typeof validate == 'string') {
            if (result.output.trim() != validate) {
                fail('expected version: ' + validate);
            }
        }
        else {
            validate(result.output.trim());
        }
    }

    console.log(toolPath + '');
}
exports.ensureTool = ensureTool;

var filterNpmVerbose = function (output) {
    if (output && output.startsWith('npm info it worked if it ends with ok')) {
        var index = output.indexOf('npm info ok');
        if (index > 0) {
            return output.substr(index + 11).trim();
        }
    }

    return output;
}
exports.filterNpmVerbose = filterNpmVerbose;

var installNode = function (nodeVersion) {
    switch (nodeVersion || '') {
        case '':
        case '6':
            nodeVersion = 'v6.10.3';
            break;
        case '5':
            nodeVersion = 'v5.10.1';
            break;
        default:
            fail(`Unexpected node version '${nodeVersion}'. Expected 5 or 6.`);
    }

    if (nodeVersion === run('node -v')) {
        console.log('skipping node install for tests since correct version is running');
        return;
    }

    // determine the platform
    var platform = os.platform();
    if (platform != 'darwin' && platform != 'linux' && platform != 'win32') {
        throw new Error('Unexpected platform: ' + platform);
    }

    var nodeUrl = 'https://nodejs.org/dist';
    switch (platform) {
        case 'darwin':
            var nodeArchivePath = downloadArchive(nodeUrl + '/' + nodeVersion + '/node-' + nodeVersion + '-darwin-x64.tar.gz');
            addPath(path.join(nodeArchivePath, 'node-' + nodeVersion + '-darwin-x64', 'bin'));
            break;
        case 'linux':
            var nodeArchivePath = downloadArchive(nodeUrl + '/' + nodeVersion + '/node-' + nodeVersion + '-linux-x64.tar.gz');
            addPath(path.join(nodeArchivePath, 'node-' + nodeVersion + '-linux-x64', 'bin'));
            break;
        case 'win32':
            var nodeDirectory = path.join(downloadPath, `node-${nodeVersion}`);
            var marker = nodeDirectory + '.completed';
            if (!test('-f', marker)) {
                var nodeExePath = downloadFile(nodeUrl + '/' + nodeVersion + '/win-x64/node.exe');
                var nodeLibPath = downloadFile(nodeUrl + '/' + nodeVersion + '/win-x64/node.lib');
                rm('-Rf', nodeDirectory);
                mkdir('-p', nodeDirectory);
                cp(nodeExePath, path.join(nodeDirectory, 'node.exe'));
                cp(nodeLibPath, path.join(nodeDirectory, 'node.lib'));
                fs.writeFileSync(marker, '');
            }

            addPath(nodeDirectory);
            break;
    }
}
exports.installNode = installNode;

var downloadFile = function (url) {
    // validate parameters
    if (!url) {
        throw new Error('Parameter "url" must be set.');
    }

    // skip if already downloaded
    var scrubbedUrl = url.replace(/[/\:?]/g, '_');
    var targetPath = path.join(downloadPath, 'file', scrubbedUrl);
    var marker = targetPath + '.completed';
    if (!test('-f', marker)) {
        console.log('Downloading file: ' + url);

        // delete any previous partial attempt
        if (test('-f', targetPath)) {
            rm('-f', targetPath);
        }

        // download the file
        mkdir('-p', path.join(downloadPath, 'file'));
        var result = syncRequest('GET', url);
        fs.writeFileSync(targetPath, result.getBody());

        // write the completed marker
        fs.writeFileSync(marker, '');
    }

    return targetPath;
}
exports.downloadFile = downloadFile;

var downloadArchive = function (url, omitExtensionCheck) {
    // validate parameters
    if (!url) {
        throw new Error('Parameter "url" must be set.');
    }

    var isZip;
    var isTargz;
    if (omitExtensionCheck) {
        isZip = true;
    }
    else {
        if (url.match(/\.zip$/)) {
            isZip = true;
        }
        else if (url.match(/\.tar\.gz$/) && (process.platform == 'darwin' || process.platform == 'linux')) {
            isTargz = true;
        }
        else {
            throw new Error('Unexpected archive extension');
        }
    }

    // skip if already downloaded and extracted
    var scrubbedUrl = url.replace(/[/\:?]/g, '_');
    var targetPath = path.join(downloadPath, 'archive', scrubbedUrl);
    var marker = targetPath + '.completed';
    if (!test('-f', marker)) {
        // download the archive
        var archivePath = downloadFile(url);
        console.log('Extracting archive: ' + url);

        // delete any previously attempted extraction directory
        if (test('-d', targetPath)) {
            rm('-rf', targetPath);
        }

        // extract
        mkdir('-p', targetPath);
        if (isZip) {
            if (process.platform == 'win32') {
                let escapedFile = archivePath.replace(/'/g, "''").replace(/"|\n|\r/g, ''); // double-up single quotes, remove double quotes and newlines
                let escapedDest = targetPath.replace(/'/g, "''").replace(/"|\n|\r/g, '');

                let command = `$ErrorActionPreference = 'Stop' ; try { Add-Type -AssemblyName System.IO.Compression.FileSystem } catch { } ; [System.IO.Compression.ZipFile]::ExtractToDirectory('${escapedFile}', '${escapedDest}')`;
                run(`powershell -Command "${command}"`);
            } else {
                run(`unzip ${archivePath} -d ${targetPath}`);
            }
        }
        else if (isTargz) {
            var originalCwd = process.cwd();
            cd(targetPath);
            try {
                run(`tar -xzf "${archivePath}"`);
            }
            finally {
                cd(originalCwd);
            }
        }

        // write the completed marker
        fs.writeFileSync(marker, '');
    }

    return targetPath;
}
exports.downloadArchive = downloadArchive;

var copyGroup = function (group, sourceRoot, destRoot) {
    // example structure to copy a single file:
    // {
    //   "source": "foo.dll"
    // }
    //
    // example structure to copy an array of files/folders to a relative directory:
    // {
    //   "source": [
    //     "foo.dll",
    //     "bar",
    //   ],
    //   "dest": "baz/",
    //   "options": "-R"
    // }
    //
    // example to multiply the copy by .NET culture names supported by TFS:
    // {
    //   "source": "<CULTURE_NAME>/foo.dll",
    //   "dest": "<CULTURE_NAME>/"
    // }
    //

    // validate parameters
    assert(group, 'group');
    assert(group.source, 'group.source');
    if (typeof group.source == 'object') {
        assert(group.source.length, 'group.source.length');
        group.source.forEach(function (s) {
            assert(s, 'group.source[i]');
        });
    }

    assert(sourceRoot, 'sourceRoot');
    assert(destRoot, 'destRoot');

    // multiply by culture name (recursive call to self)
    if (group.dest && group.dest.indexOf('<CULTURE_NAME>') >= 0) {
        cultureNames.forEach(function (cultureName) {
            // culture names do not contain any JSON-special characters, so this is OK (albeit a hack)
            var localizedGroupJson = JSON.stringify(group).replace(/<CULTURE_NAME>/g, cultureName);
            copyGroup(JSON.parse(localizedGroupJson), sourceRoot, destRoot);
        });

        return;
    }

    // build the source array
    var source = typeof group.source == 'string' ? [group.source] : group.source;
    source = source.map(function (val) { // root the paths
        return path.join(sourceRoot, val);
    });

    // create the destination directory
    var dest = group.dest ? path.join(destRoot, group.dest) : destRoot + '/';
    dest = path.normalize(dest);
    mkdir('-p', dest);

    // copy the files
    if (group.hasOwnProperty('options') && group.options) {
        cp(group.options, source, dest);
    }
    else {
        cp(source, dest);
    }
}

var copyGroups = function (groups, sourceRoot, destRoot) {
    assert(groups, 'groups');
    assert(groups.length, 'groups.length');
    groups.forEach(function (group) {
        copyGroup(group, sourceRoot, destRoot);
    })
}
exports.copyGroups = copyGroups;

var removeGroup = function (group, pathRoot) {
    // example structure to remove an array of files/folders:
    // {
    //   "items": [
    //     "foo.dll",
    //     "bar",
    //   ],
    //   "options": "-R"
    // }

    // validate parameters
    assert(group, 'group');
    assert(group.items, 'group.items');
    if (typeof group.items != 'object') {
        throw new Error('Expected group.items to be an array');
    } else {
        assert(group.items.length, 'group.items.length');
        group.items.forEach(function (p) {
            assert(p, 'group.items[i]');
        });
    }

    assert(group.options, 'group.options');
    assert(pathRoot, 'pathRoot');

    // build the rooted items array
    var rootedItems = group.items.map(function (val) { // root the paths
        return path.join(pathRoot, val);
    });

    // remove the items
    rm(group.options, rootedItems);
}

var removeGroups = function (groups, pathRoot) {
    assert(groups, 'groups');
    assert(groups.length, 'groups.length');
    groups.forEach(function (group) {
        removeGroup(group, pathRoot);
    })
}
exports.removeGroups = removeGroups;

var addPath = function (directory) {
    console.log('');
    console.log(`> prepending PATH ${directory}`);

    var separator;
    if (os.platform() == 'win32') {
        separator = ';';
    }
    else {
        separator = ':';
    }

    var existing = process.env['PATH'];
    if (existing) {
        process.env['PATH'] = directory + separator + existing;
    }
    else {
        process.env['PATH'] = directory;
    }
}
exports.addPath = addPath;

var getExternals = function (externals, destRoot) {
    assert(externals, 'externals');
    assert(destRoot, 'destRoot');

    // .zip files
    if (externals.hasOwnProperty('archivePackages')) {
        var archivePackages = externals.archivePackages;
        archivePackages.forEach(function (archive) {
            assert(archive.url, 'archive.url');
            assert(archive.dest, 'archive.dest');

            // download and extract the archive package
            var archiveSource = downloadArchive(archive.url);

            // copy the files
            var archiveDest = path.join(destRoot, archive.dest);
            mkdir('-p', archiveDest);
            cp('-R', path.join(archiveSource, '*'), archiveDest)
        });
    }

    // external NuGet V2 packages
    if (externals.hasOwnProperty('nugetv2')) {
        var nugetPackages = externals.nugetv2;
        nugetPackages.forEach(function (package) {
            // validate the structure of the data
            assert(package.name, 'package.name');
            assert(package.version, 'package.version');
            assert(package.repository, 'package.repository');
            assert(package.cp, 'package.cp');
            assert(package.cp, 'package.cp.length');

            // download and extract the NuGet V2 package
            var url = package.repository.replace(/\/$/, '') + '/package/' + package.name + '/' + package.version;
            var packageSource = downloadArchive(url, /*omitExtensionCheck*/true);

            // copy specific files
            copyGroups(package.cp, packageSource, destRoot);
        });
    }

    // for any file type that has to be shipped with task
    if (externals.hasOwnProperty('files')) {
        var files = externals.files;
        files.forEach(function (file) {
            assert(file.url, 'file.url');
            assert(file.dest, 'file.dest');

            // download the file from url
            var fileSource = downloadFile(file.url);
            // copy the files
            var fileDest = path.join(destRoot, file.dest);
            mkdir('-p', path.dirname(fileDest));
            cp(fileSource, fileDest);
        });
    }
}
exports.getExternals = getExternals;

//------------------------------------------------------------------------------
// task.json functions
//------------------------------------------------------------------------------
var fileToJson = function (file) {
    var jsonFromFile = JSON.parse(fs.readFileSync(file).toString());
    return jsonFromFile;
}
exports.fileToJson = fileToJson;

var createResjson = function (task, taskPath) {
    var resources = {};
    if (task.hasOwnProperty('friendlyName')) {
        resources['loc.friendlyName'] = task.friendlyName;
    }

    if (task.hasOwnProperty('helpMarkDown')) {
        resources['loc.helpMarkDown'] = task.helpMarkDown;
    }

    if (task.hasOwnProperty('description')) {
        resources['loc.description'] = task.description;
    }

    if (task.hasOwnProperty('instanceNameFormat')) {
        resources['loc.instanceNameFormat'] = task.instanceNameFormat;
    }

    if (task.hasOwnProperty('releaseNotes')) {
        resources['loc.releaseNotes'] = task.releaseNotes;
    }

    if (task.hasOwnProperty('groups')) {
        task.groups.forEach(function (group) {
            if (group.hasOwnProperty('name')) {
                resources['loc.group.displayName.' + group.name] = group.displayName;
            }
        });
    }

    if (task.hasOwnProperty('inputs')) {
        task.inputs.forEach(function (input) {
            if (input.hasOwnProperty('name')) {
                resources['loc.input.label.' + input.name] = input.label;

                if (input.hasOwnProperty('helpMarkDown') && input.helpMarkDown) {
                    resources['loc.input.help.' + input.name] = input.helpMarkDown;
                }
            }
        });
    }

    if (task.hasOwnProperty('messages')) {
        Object.keys(task.messages).forEach(function (key) {
            resources['loc.messages.' + key] = task.messages[key];
        });
    }

    var resjsonPath = path.join(taskPath, 'Strings', 'resources.resjson', 'en-US', 'resources.resjson');
    mkdir('-p', path.dirname(resjsonPath));
    var resjsonContent = JSON.stringify(resources, null, 2);
    if (process.platform == 'win32') {
        resjsonContent = resjsonContent.replace(/\n/g, os.EOL);
    }
    fs.writeFileSync(resjsonPath, resjsonContent);
};
exports.createResjson = createResjson;

var createTaskLocJson = function (taskPath) {
    var taskJsonPath = path.join(taskPath, 'task.json');
    var taskLoc = JSON.parse(fs.readFileSync(taskJsonPath));
    taskLoc.friendlyName = 'ms-resource:loc.friendlyName';
    taskLoc.helpMarkDown = 'ms-resource:loc.helpMarkDown';
    taskLoc.description = 'ms-resource:loc.description';
    taskLoc.instanceNameFormat = 'ms-resource:loc.instanceNameFormat';
    if (taskLoc.hasOwnProperty('releaseNotes')) {
        taskLoc.releaseNotes = 'ms-resource:loc.releaseNotes';
    }

    if (taskLoc.hasOwnProperty('groups')) {
        taskLoc.groups.forEach(function (group) {
            if (group.hasOwnProperty('name')) {
                group.displayName = 'ms-resource:loc.group.displayName.' + group.name;
            }
        });
    }

    if (taskLoc.hasOwnProperty('inputs')) {
        taskLoc.inputs.forEach(function (input) {
            if (input.hasOwnProperty('name')) {
                input.label = 'ms-resource:loc.input.label.' + input.name;

                if (input.hasOwnProperty('helpMarkDown') && input.helpMarkDown) {
                    input.helpMarkDown = 'ms-resource:loc.input.help.' + input.name;
                }
            }
        });
    }

    if (taskLoc.hasOwnProperty('messages')) {
        Object.keys(taskLoc.messages).forEach(function (key) {
            taskLoc.messages[key] = 'ms-resource:loc.messages.' + key;
        });
    }

    var taskLocContent = JSON.stringify(taskLoc, null, 2);
    if (process.platform == 'win32') {
        taskLocContent = taskLocContent.replace(/\n/g, os.EOL);
    }
    fs.writeFileSync(path.join(taskPath, 'task.loc.json'), taskLocContent);
};
exports.createTaskLocJson = createTaskLocJson;

var getNpmRegistryOverride = function (taskPath) {
    var npmrcPath = path.join(taskPath, '.npmrc');
    var registry = '';  // Default to nothing

    // Load the file if we have it
    if (test('-f', npmrcPath)) {
        var npmrc = fs.readFileSync(npmrcPath).toString();
        if (npmrc) {
            var lines = npmrc.split('\n');
            for (var line of lines) {
                if (line.toLowerCase().includes('registry=')) {
                    registry = ' --registry ' + line.trim().substr(9);
                    break;
                }
            }
        }
    }

    return registry;
}
exports.getNpmRegistryOverride = getNpmRegistryOverride;

// Validates the structure of a task.json file.
var validateTask = function (task) {
    if (!task.id || !check.isUUID(task.id)) {
        fail('id is a required guid');
    };

    if (!task.name || !check.isAlphanumeric(task.name)) {
        fail('name is a required alphanumeric string');
    }

    if (!task.friendlyName || !check.isLength(task.friendlyName, 1, 40)) {
        fail('friendlyName is a required string <= 40 chars');
    }

    if (!task.instanceNameFormat) {
        fail('instanceNameFormat is required');
    }
};
exports.validateTask = validateTask;
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
// Generate docs functions
//------------------------------------------------------------------------------
// Outputs a YAML snippet file for the specified task.
var createYamlSnippetFile = function (taskJson, docsDir, yamlOutputFilename) {
    var outFilePath = path.join(docsDir, yamlOutputFilename);
    fs.writeFileSync(outFilePath, getTaskYaml(taskJson));
}
exports.createYamlSnippetFile = createYamlSnippetFile;

var createMarkdownDocFile = function(taskJson, taskJsonPath, docsDir, mdDocOutputFilename) {
    var outFilePath = path.join(docsDir, taskJson.category.toLowerCase(), mdDocOutputFilename);
    if (!test('-e', path.dirname(outFilePath))) {
        fs.mkdirSync(path.dirname(outFilePath));
        fs.mkdirSync(path.join(path.dirname(outFilePath), '_img'));
    }

    var iconPath = path.join(path.dirname(taskJsonPath), 'icon.png');
    if (test('-f', iconPath)) {
        var docIconPath = path.join(path.dirname(outFilePath), '_img', cleanString(taskJson.name).toLowerCase() + '.png');
        fs.copyFileSync(iconPath, docIconPath);
    }

    fs.writeFileSync(outFilePath, getTaskMarkdownDoc(taskJson, mdDocOutputFilename));
}
exports.createMarkdownDocFile = createMarkdownDocFile;

// Returns a copy of the specified string with its first letter as a lowercase letter.
// Example: 'NachoLibre' -> 'nachoLibre'
function camelize(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function(match, index) {
        return index == 0 ? match.toLowerCase() : match.toUpperCase();
    });
}

var getAliasOrNameForInputName = function(inputs, inputName) {
    var returnInputName = inputName;
    inputs.forEach(function(input) {
        if (input.name == inputName) {
            if (input.aliases && input.aliases.length > 0) {
                returnInputName = input.aliases[0];
            }
            else {
                returnInputName = input.name;
            }
        }
    });
    return camelize(returnInputName);
};

var getInputAliasOrName = function(input) {
    var returnInputName;
    if (input.aliases && input.aliases.length > 0) {
        returnInputName = input.aliases[0];
    }
    else {
        returnInputName = input.name;
    }
    return camelize(returnInputName);
};

var cleanString = function(str) {
    if (str) {
        return str
            .replace(/\r/g, '')
            .replace(/\n/g, '')
            .replace(/\"/g, '');
    }
    else {
        return str;
    }
}

var getTaskMarkdownDoc = function(taskJson, mdDocOutputFilename) {
    var taskMarkdown = '';

    taskMarkdown += '---' + os.EOL;
    taskMarkdown += 'title: ' + cleanString(taskJson.friendlyName) + os.EOL;
    taskMarkdown += 'description: ' + cleanString(taskJson.description) + os.EOL;
    taskMarkdown += 'ms.topic: reference' + os.EOL;
    taskMarkdown += 'ms.prod: devops' + os.EOL;
    taskMarkdown += 'ms.technology: devops-cicd' + os.EOL;
    taskMarkdown += 'ms.assetid: ' + taskJson.id + os.EOL;
    taskMarkdown += 'ms.manager: ' + os.userInfo().username + os.EOL;
    taskMarkdown += 'ms.author: ' + os.userInfo().username + os.EOL;
    taskMarkdown += 'ms.date: ' +
                    new Intl.DateTimeFormat('en-US', {year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date()) +
                    os.EOL;
    taskMarkdown += 'monikerRange: \'vsts\'' + os.EOL;
    taskMarkdown += '---' + os.EOL + os.EOL;

    taskMarkdown += '# ' + cleanString(taskJson.category) + ': ' + cleanString(taskJson.friendlyName) + os.EOL + os.EOL;
    taskMarkdown += '![](_img/' + cleanString(taskJson.name).toLowerCase() + '.png) ' + cleanString(taskJson.description) + os.EOL + os.EOL;

    taskMarkdown += '::: moniker range="> tfs-2018"' + os.EOL + os.EOL;
    taskMarkdown += '## YAML snippet' + os.EOL + os.EOL;
    taskMarkdown += '[!INCLUDE [temp](../_shared/yaml/' + mdDocOutputFilename + ')]' + os.EOL + os.EOL;
    taskMarkdown += '::: moniker-end' + os.EOL + os.EOL;

    taskMarkdown += '## Arguments' + os.EOL + os.EOL;
    taskMarkdown += '<table><thead><tr><th>Argument</th><th>Description</th></tr></thead>' + os.EOL;
    taskJson.inputs.forEach(function(input) {
        var requiredOrNot = input.required ? 'Required' : 'Optional';
        var label = cleanString(input.label);
        var description = input.helpMarkDown; // Do not clean white space from descriptions
        taskMarkdown += '<tr><td>' + label + '</td><td>(' + requiredOrNot + ') ' + description + '</td></tr>' + os.EOL;
    });

    taskMarkdown += '[!INCLUDE [temp](../_shared/control-options-arguments.md)]' + os.EOL;
    taskMarkdown += '</table>' + os.EOL + os.EOL;

    taskMarkdown += '## Q&A' + os.EOL + os.EOL;
    taskMarkdown += '<!-- BEGINSECTION class="md-qanda" -->' + os.EOL + os.EOL;
    taskMarkdown += '<!-- ENDSECTION -->' + os.EOL;

    return taskMarkdown;
}

var getTaskYaml = function(taskJson) {
    var taskYaml = '';
    taskYaml += '```YAML' + os.EOL;
    taskYaml += '# ' + cleanString(taskJson.friendlyName) + os.EOL;
    taskYaml += '# ' + cleanString(taskJson.description) + os.EOL;
    taskYaml += '- task: ' + taskJson.name + '@' + taskJson.version.Major + os.EOL;
    taskYaml += '  inputs:' + os.EOL;

    taskJson.inputs.forEach(function(input) {
        // Is the input required?
        var requiredOrNot = input.required ? '' : '# Optional';
        if (input.required && input.visibleRule && input.visibleRule.length > 0) {
            var spaceIndex = input.visibleRule.indexOf(' ');
            var visibleRuleInputName = input.visibleRule.substring(0, spaceIndex);
            var visibleRuleInputNameCamel = camelize(visibleRuleInputName);
            requiredOrNot += '# Required when ' + camelize(input.visibleRule)
            .replace(/ = /g, ' == ')
            .replace(visibleRuleInputNameCamel, getAliasOrNameForInputName(taskJson.inputs, visibleRuleInputName));
        }

        // Does the input have a default value?
        var isDefaultValueAvailable = input.defaultValue && (input.defaultValue.length > 0 || input.type == 'boolean');
        var defaultValue = isDefaultValueAvailable ? input.defaultValue.toString() : null;

        // Comment out the input?
        if (!input.required ||
            (input.required && isDefaultValueAvailable) ||
            (input.visibleRule && input.visibleRule.length > 0)) {
            taskYaml += '    #';
        }
        else {
            taskYaml += '    ';
        }

        // Append input name
        taskYaml += getInputAliasOrName(input) + ': ';

        // Append default value
        if (defaultValue) {
            if (input.type == 'boolean') {
                taskYaml += cleanString(defaultValue) + ' ';
            }
            else {
                taskYaml += '\'' + cleanString(defaultValue) + '\' ';
            }
        }

        // Append required or optional
        taskYaml += requiredOrNot;

        // Append options?
        if (input.options) {
            var isFirstOption = true;
            Object.keys(input.options).forEach(function(key) {
                if (isFirstOption) {
                    taskYaml += (input.required ? '# ' : '. ') + 'Options: ' + camelize(cleanString(key));
                    isFirstOption = false;
                }
                else {
                    taskYaml += ', ' + camelize(cleanString(key));
                }
            });
        }

        // Append end-of-line for the input
        taskYaml += os.EOL;
    });

    // Append endings
    taskYaml += '```' + os.EOL;

    return taskYaml;
};
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
// package functions
//------------------------------------------------------------------------------
var getRefs = function () {
    console.log();
    console.log('> Getting branch/commit info')
    var info = {};
    var branch;
    if (process.env.TF_BUILD) {
        // during CI agent checks out a commit, not a branch.
        // $(build.sourceBranch) indicates the branch name, e.g. releases/m108
        branch = process.env.BUILD_SOURCEBRANCH;
    }
    else {
        // assumes user has checked out a branch. this is a fairly safe assumption.
        // this code only runs during "package" and "publish" build targets, which
        // is not typically run locally.
        branch = run('git symbolic-ref HEAD', /*inheritStreams*/false, /*noHeader*/true);
    }

    assert(branch, 'branch');
    var commit = run('git rev-parse --short=8 HEAD', /*inheritStreams*/false, /*noHeader*/true);
    var release;
    if (branch.match(/^(refs\/heads\/)?releases\/m[0-9]+$/)) {
        release = parseInt(branch.split('/').pop().substr(1));
    }

    // get the ref info for HEAD
    var info = {
        head: {
            branch: branch,  // e.g. refs/heads/releases/m108
            commit: commit,  // leading 8 chars only
            release: release // e.g. 108 or undefined if not a release branch
        },
        releases: {}
    };

    // get the ref info for each release branch within range
    run('git branch --list --remotes "origin/releases/m*"', /*inheritStreams*/false, /*noHeader*/true)
        .split('\n')
        .forEach(function (branch) {
            branch = branch.trim();
            if (!branch.match(/^origin\/releases\/m[0-9]+$/)) {
                return;
            }

            var release = parseInt(branch.split('/').pop().substr(1));

            // filter out releases less than 108 and greater than HEAD
            if (release < 108 ||
                release > (info.head.release || 999)) {

                return;
            }

            branch = 'refs/remotes/' + branch;
            var commit = run(`git rev-parse --short=8 "${branch}"`, /*inheritStreams*/false, /*noHeader*/true);
            info.releases[release] = {
                branch: branch,
                commit: commit,
                release: release
            };
        });

    return info;
}
exports.getRefs = getRefs;
//------------------------------------------------------------------------------
