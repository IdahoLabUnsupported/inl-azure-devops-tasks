set serveroutput on
begin
  dbms_output.put_line('Copying Role Config File: <config_file_path>');
end;
/

set echo off
set serveroutput on
declare

  type cur_type is ref cursor;
  cv cur_type;
  lv_sql varchar2(32767);
  lv_OracleMaintained int;
  lv_ExcludeVW int;
  lv_rolename varchar2(30);
  lv_roleDN varchar2(1024);
  lv_rolePW varchar2(1024);
  lv_repo varchar2(1024);
  lv_branch varchar2(1024);
  lv_config_file varchar2(1024);
  lv_commit varchar2(1024);
  
begin

  select
    count(*) into lv_OracleMaintained
  from
    dba_tab_columns
  where column_name = 'ORACLE_MAINTAINED';
  
  select
    count(*) into lv_ExcludeVW
  from
    user_views where
  view_name = 'CONFIG_EXCLUDED_OBJECTS_VW';
  
lv_sql := 'with config_roles as (
       <replace>
    ), config_sort as (
    select 
      a.rolename
    , a.roleDN
    , a.rolePW
    , a.env_a
    , a.repo
    , a.branch
    , a.config_file
    , a.commit
    from 
      config_roles a
    join
  (select
    rolename
  , min(env_a) env_a_min
  from
    config_roles
  group by rolename) b
    on a.rolename = b.rolename
   and a.env_a = b.env_a_min
    )
    , new_role as (
    select
      upper(rolename) rolename
    from
      config_sort
    minus
    select
      role
    from
      dba_roles)
    select
      cr.rolename 
    , cr.roleDN
    , cr.rolePW
    , cr.repo
    , cr.branch
    , cr.config_file
    , cr.commit
    from
      config_sort cr
    join 
      new_role nr
        on upper(cr.rolename) = upper(nr.rolename)
    where 1 = 1';
    
    if lv_ExcludeVW > 0 then
    
      lv_sql := lv_sql || chr(10) || '  and cr.rolename not in (select EXCLUDED_OBJECTS from CONFIG_EXCLUDED_OBJECTS_VW)';
    
    elsif lv_OracleMaintained > 0 then
    
      lv_sql := lv_sql || chr(10) || '  and cr.rolename not in (select role from dba_roles where oracle_maintained = ''Y'')';
    
    end if;
        
  open cv for lv_sql;
    loop
    fetch cv into lv_rolename, lv_roleDN, lv_rolePW, lv_repo, lv_branch, lv_config_file, lv_commit;
    exit when cv%NOTFOUND;  
    
      GATEKEEPER.CONFIG_ROLE.create_role(
        lv_rolename
      , lv_roleDN
      , lv_rolePW
      , lv_repo
      , lv_branch
      , lv_config_file
      , lv_commit
      );
    
    end loop;
  close cv;
  
end;
/
set echo on
set serveroutput on