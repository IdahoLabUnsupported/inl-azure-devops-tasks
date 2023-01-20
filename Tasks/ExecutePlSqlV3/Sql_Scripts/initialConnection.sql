set ECHO on;
set LINESIZE 32767
col test_connection_time head TEST_CONNECTION_TIME for a27
col INSTANCE_NAME head INSTANCE_NAME for a30
col SERVER_HOST head SERVER_HOST for a30
col DATABASE_NAME head DATABASE_NAME for a30
col SESSION_USER head SESSION_USER for a30
col PROXY_USER head PROXY_USER for a30

select 
  to_char(systimestamp, 'dd-MON-yyyy hh:mm:ss.FF3 AM') test_connection_time
, sys_context('USERENV','INSTANCE_NAME') INSTANCE_NAME
, sys_context('USERENV','SERVER_HOST') SERVER_HOST
, sys_context('USERENV','DB_NAME') DATABASE_NAME
, sys_context('USERENV','SESSION_USER') SESSION_USER
, nvl(sys_context('USERENV','PROXY_USER'), 'N/A') PROXY_USER 
from 
  dual;

exit;
/
