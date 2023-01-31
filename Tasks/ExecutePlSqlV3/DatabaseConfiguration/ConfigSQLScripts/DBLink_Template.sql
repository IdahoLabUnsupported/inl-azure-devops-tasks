set serveroutput on
begin
  dbms_output.put_line('Copying DB_Link Config File: <config_file_path>');
end;
/

set echo off
set serveroutput on
declare

  cursor c1 is 
  with config as (
<replace>)
, environment_rank as (
  select
    owner
  , name
  , connection_string
  , source_user_name
  , source_user_password
  , repo
  , branch 
  , config_file
  , commit
  , case
      when upper(c.connection_string_env) = a.value
        then 1
      when coalesce(a.value, '<NULL>') not in (select upper(connection_string_env) from config) and upper(c.connection_string_env) = 'DEFAULT'
        then 2
    end con_rank
  , case
      when upper(c.source_user_name_env) = b.value
        then 1
      when coalesce(b.value, '<NULL>') not in (select upper(source_user_name_env) from config) and upper(c.source_user_name_env) = 'DEFAULT'
        then 2
    end sun_rank
  from
    config c
  left join
    database_values a
      on upper(c.connection_string_env) = a.VALUE
     and a.KEY = 'DATABASE_ENVIRONMENT'
  left join
    database_values b
      on upper(c.source_user_name_env) = a.VALUE
     and a.KEY = 'DATABASE_ENVIRONMENT'
)
, environment_config as (
select 
  * 
from 
  environment_rank
where con_rank = (select min(con_rank) from environment_rank)
  and sun_rank = (select min(sun_rank) from environment_rank)
)
, new_config as (
  select 
    owner
  , name
  , connection_string
  , source_user_name
  from
    environment_config
  where upper(owner) not in (select upper(substr(excluded_objects, 0, instr(excluded_objects, '.') - 1)) excluded_objects from CONFIG_EXCLUDED_OBJECTS_VW
                               where substr(excluded_objects, 0, instr(excluded_objects, '.') - 1) is not null
                                 and substr(excluded_objects, instr(excluded_objects, '.') + 1, length(excluded_objects)) = 'DB_LINKS')
    and case when 'ALL.DB_LINKS' in (select excluded_objects from CONFIG_EXCLUDED_OBJECTS_VW) then 0 else 1 end = 1
  minus
  select
    owner
  , db_link
  , host
  , username
  from
    dba_db_links)
  select
    c.owner
  , c.name
  , c.connection_string
  , c.source_user_name
  , c.source_user_password
  , c.repo
  , c.branch
  , c.config_file
  , c.commit
  from
    environment_config c
  join
    new_config nc
      on c.owner = nc.owner
     and c.name = nc.name;
     
begin

  for i in c1 loop
  
    GATEKEEPER.CONFIG_DB_LINK.CREATE_DB_LINK(
      i.name
    , i.owner
    , i.source_user_name
    , i.connection_string
    , i.source_user_password
    , i.repo
    , i.branch
    , i.config_file
    , i.commit
    );
  
  end loop;
  
end;
/
set echo on
set serveroutput on