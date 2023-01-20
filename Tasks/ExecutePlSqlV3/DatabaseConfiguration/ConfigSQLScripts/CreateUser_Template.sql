set echo off
set serveroutput on
begin
  dbms_output.put_line('Copying User Config File: <repo_file>');
end;
/

declare

  cursor new_users(cv_type varchar2) is
  with config_users as (
      <replace>
    )
    , config_sort as (
    select 
      a.name
    , a.password
    , a.passwordtype
    , a.gatekeeperproxyflag
    , a.expirepasswordflag
    , a.passworddn
    , a.profile
    , a.tablespace
    , a.accountstatus
    , a.repo
    , a.branch
    , a.config_file
    , a.commit
    from 
      config_users a
    join
  (select
    name
  , min(env_a) env_a_min
  , min(env_b) env_b_min
  , min(env_c) env_c_min
  , min(env_d) env_d_min
  from
    config_users
  group by name) b
    on a.name = b.name
   and a.env_a = b.env_a_min
   and a.env_b = b.env_b_min
   and a.env_c = b.env_c_min
   and a.env_d = b.env_d_min
    )
    , new_users as (
    select
      upper(name) name
    from
      config_sort
    minus
    select
      username
    from
      dba_users)
    select
      cu.name 
    , cu.password
    , cu.passwordType
    , cu.passwordDN
    , cu.gatekeeperProxyFlag
    , cu.expirepasswordflag
    , cu.profile
    , cu.tablespace
    , cu.accountStatus
    , cu.repo
    , cu.branch
    , cu.config_file
    , cu.commit
    from
      config_sort cu
    left join 
      new_users nu
        on upper(cu.name) = nu.name
    where case 
            when nu.name is not null 
              then 'CREATE'
            when nu.name is null and cu.passwordType = 'PipelineVariable' and coalesce(lower(cu.expirepasswordflag), '<NULL>') <> 'true'
              then 'CHECK_PW'
          end = cv_type
    ;

begin

  for i in new_users('CREATE') loop 
  
    GATEKEEPER.CONFIG_USER.create_schema(
      i.name
    , i.password
    , i.passwordType
    , i.passwordDN
    , i.gatekeeperProxyFlag
    , i.expirepasswordflag
    , i.profile
    , i.tablespace
    , i.accountStatus
    , i.repo
    , i.branch
    , i.config_file
    , i.commit);
  
  end loop;

  for i in new_users('CHECK_PW') loop 
  
    GATEKEEPER.CONFIG_USER.check_pw(
      i.name
    , i.password);
  
  end loop;

end;
/

set echo on
set serveroutput on