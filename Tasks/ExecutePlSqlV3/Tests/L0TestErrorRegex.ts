'use strict';

import * as sql from '../PlSqlCommon';
import * as assert from 'assert';

assert.equal(sql.getOutputType('some text ORA-1234: Some error here'), sql.SqlPlusOutputType.Error, 'Expected ORA-1234: to be an error');
assert.equal(sql.getOutputType('some text ORA-text: Some error here'), sql.SqlPlusOutputType.Standard, 'Expected ORA-text: to not be an error');
assert.equal(sql.getOutputType('some text PLS-4232: Some error here'), sql.SqlPlusOutputType.Error, 'Expected PLS-4232: to be an error');
assert.equal(sql.getOutputType('some text PLS-text: Some error here'), sql.SqlPlusOutputType.Standard, 'Expected PLS-text: to not be an error');
assert.equal(sql.getOutputType('some text SP2-4232: Some error here'), sql.SqlPlusOutputType.Error, 'Expected SP2-4232: to be an error');
assert.equal(sql.getOutputType('some text SP2-text: Some error here'), sql.SqlPlusOutputType.Standard, 'Expected SP2-text: to not be an error');
assert.equal(sql.getOutputType('2019-06-27T18:17:25.6730719Z SP2-0804: Procedure created with compilation warnings'), sql.SqlPlusOutputType.Warning, 'Expected SP2-0804 to not be a warning');
assert.equal(sql.getOutputType('some text SP2-0310: unable to open file "LOGIN.SQL"'), sql.SqlPlusOutputType.Standard, 'Expected SP2-0310 to not be ignored');
assert.equal(sql.getOutputType('2019-06-25T22:06:24.9402812Z Warning: Package Body created with compilation errors.'), sql.SqlPlusOutputType.Error, 'Expected compilation errors to be an error');