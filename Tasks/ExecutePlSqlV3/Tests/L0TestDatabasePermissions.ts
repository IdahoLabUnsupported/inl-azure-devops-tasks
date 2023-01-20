'use strict';

import * as tmrn from 'azure-pipelines-task-lib/mock-run';
import * as path from 'path';

const taskPath = path.join(__dirname, '..', 'ExecuteSqlPlus.js');
const tr: tmrn.TaskMockRunner = new tmrn.TaskMockRunner(taskPath);

// Variables needed for the task
process.env['AGENT_TEMPDIRECTORY'] = __dirname;
process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = 'C:\\Users\\HAWKBG\\Documents\\OracleConfig';
process.env['TEST_DB_LINK_1_DBLinkPassword'] = 'DBLinkPassword1';
process.env['TEST1_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['TEST2_Password'] = 'Password2#asdfarewrasdsdfsdf';
process.env['TEST13_Password'] = 'Password2#asdfarewrasdsdfsdf';
process.env['ASBATCH_Password'] = 'abc123!#supersafe$$$passS';
process.env['ADSFILESHARE_Password'] = 'abc123!#supersafe$$$passS';
process.env['CNMRS_Password'] = 'abc123!#supersafe$$$passS';
process.env['MARKETINTEGRATOR_Password'] = 'abc123!#supersafe$$$passS';
process.env['AS_POWERBI_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['ASCONFIG_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['ASSETSUITEREPORTS_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['BASE_Password'] = 'Password2#asdfarewrasdsdfsdf';
process.env['BASE_FA_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['BI_WAREHOUSE_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['CUSTOM_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['EMAIL_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['ERSUITE_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['ESOMS_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['FLEET_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['IBUY_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['INTERFACES_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['LABWAY_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['LIVE_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['MWPNXA_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['NEXTAXIOM_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['ORA_ETL_READ_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['QRIR_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['SAS_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['SECURITY_KEYS_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['SRBT_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['SSIS_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['SWO_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['HOURS_WORKED_REPORTS_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['INVENTORY_SNAPSHOT_REPORT_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['PROPERTY_INVENTORY_REPORT_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['VENDOR_PORTAL_Password'] = 'Password1#asdfarewrasdsdfsdf';
process.env['INTERFACES_EBS_INL_GOV_DBLinkPassword'] = 'Password1#asdfarewrasdsdfsdf';
process.env['INTERFACES_IPS_INL_GOV_DBLinkPassword'] = 'Password1#asdfarewrasdsdfsdf';
process.env['INTERFACES_PEOPLESOFT_INL_GOV_DBLinkPassword'] = 'Password1#asdfarewrasdsdfsdf';
process.env['INTERFACES_SITEPEOPLEORACLE_INL_GOV_DBLinkPassword'] = 'Password1#asdfarewrasdsdfsdf';
process.env['INTERFACES_TIMS_INL_GOV_DBLinkPassword'] = 'Password1#asdfarewrasdsdfsdf';
process.env['NET_SITEPEOPLEORACLE_INL_GOV_DBLinkPassword'] = 'Password1#asdfarewrasdsdfsdf';

// Task inputs
tr.setInput('SQLRunType', 'DatabaseConfiguration');
tr.setInput('StartCommit', '9cfcb166f6f36baf858400cd5330b0bd352729b3');
tr.setInput('EndCommit', 'a075b1ac9ac2d5d38a2fb410a9b57788b6b520f6');
tr.setInput('RepoLocation', 'C:\\Users\\HAWKBG\\Documents\\OracleConfig\\DMX-Database');
tr.setInput('FailOnSqlError', 'true');
tr.setInput('DebugSQL', 'true');
tr.setInput('Parameters', '');
tr.setInput('LaunchMode', 'sync');
tr.setInput('JobOutputVariable', '');
tr.setInput('SubstitutionCharacter', '`');
tr.setInput('UserName', 'GATEKEEPER');
tr.setInput('UserPassword', '<pass>');
tr.setInput('HostName', 'devops-dev-db.inl.gov');
tr.setInput('PortNumber', '1521');
tr.setInput('ServiceName', 'DB1');
tr.setInput('ShowWarnings', 'true');
tr.setInput('DefineEscape', 'true');
tr.setInput('UseSubstitutionVariables', 'true');
tr.setInput('SQLTestConnectionTimeoutSeconds', '10');
tr.setInput('SetServeroutput', 'true');
tr.setInput('RunPostPrivilegesConfiguration', 'false');

// Run as not mocked so we will actually run
tr.run(true);