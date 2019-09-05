'use strict';

import * as cm from './PlSqlCommon';
import * as path from 'path';
import * as os from 'os';
import * as tl from 'azure-pipelines-task-lib/task';
import * as tr from 'azure-pipelines-task-lib/toolrunner';

const SQL_PLUS_VERSION_PATH = 'instantclient_18_3';
const SQL_PLUS_DIRECTORY = path.join(__dirname, SQL_PLUS_VERSION_PATH, `${os.platform().replace('32', '')}-${os.arch()}`);
const EXTRACT_SCRIPT = 'extract.sh';

export class PackagedSqlPlusSource implements cm.ISqlPlusToolSource {
    public path: string;
    public binaryName: string;
    public isValid: boolean;

    constructor() {
        this.path = '';
        this.binaryName = 'sqlplus';
        this.isValid = false;
    }

    public prepareAndValidate(): void {
        this._prepareSqlPlus();
        this.path = os.platform() === 'linux' ? tl.which('sqlplus') : tl.which('sqlplus', true);
        
        /** For some reason after modifying path on linux it may not find the binary, thus we will manually set the path if that happens */
        if (!this.path) {
            this.path = path.join(SQL_PLUS_DIRECTORY, 'sqlplus');
            if (tl.find(this.path).length < 1) {
                throw new Error(tl.loc('SqlPlusNotFoundError'));
            }
        }
        this.binaryName = path.basename(this.path);
        this.isValid = true;
    }

    private _prepareSqlPlus() {
        const platform = os.platform();

        // Do we need to extract the zip files?
        if (platform === 'linux' && tl.find(path.join(SQL_PLUS_DIRECTORY, EXTRACT_SCRIPT)).length > 0) {
            this._extractSqlPlus();
        }

        // Add our packaged sqlplus to the current PATH environment variable
        const currentPath = process.env.PATH;
        tl.debug(`Current PATH = ${currentPath}`);
        if (currentPath && !currentPath.includes(SQL_PLUS_DIRECTORY)) {
            process.env.PATH = `${SQL_PLUS_DIRECTORY};${process.env.PATH}`;
            tl.debug(`Updated PATH = ${process.env.PATH}`);
        }

        // Path to search for LOGIN.sql
        tl.debug(`Current SQLPATH = ${process.env.SQLPATH}`);
        process.env.SQLPATH = SQL_PLUS_DIRECTORY;
        tl.debug(`Set SQLPATH = ${process.env.SQLPATH}`);
        tl.debug(`Current ORACLE_PATH = ${process.env.ORACLE_PATH}`);
        process.env.ORACLE_PATH = SQL_PLUS_DIRECTORY;
        tl.debug(`Set ORACLE_PATH = ${process.env.ORACLE_PATH}`);

        // When on Linux we need the LD_LIBRARY_PATH environment variable set
        if (platform === 'linux') {
            tl.debug(`Current LD_LIBRARY_PATH = ${process.env.LD_LIBRARY_PATH}`);
            process.env.LD_LIBRARY_PATH = SQL_PLUS_DIRECTORY;
            tl.debug(`Updated LD_LIBRARY_PATH = ${process.env.LD_LIBRARY_PATH}`);
        }
    }

    private _extractSqlPlus() {
        console.log('Extracting sqlplus...');
        const bash: string = tl.which('bash', true);

        // Make sure our working directory is where the script is
        tl.cd(SQL_PLUS_DIRECTORY);
        const tool = tl.tool(bash).arg(`./${EXTRACT_SCRIPT}`);
        const result: tr.IExecSyncResult = tool.execSync();
        
        if (result.code !== 0) {
            console.log(result.stdout);
            tl.error(result.stderr);
            throw new Error(tl.loc('ExtractError', result.code));
        } else {
            tl.debug(result.stdout);
        }
    }
}

