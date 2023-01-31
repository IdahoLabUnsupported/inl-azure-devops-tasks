select
  <username> name
, <password> password
, <passwordType> passwordType
, <gatekeeperProxyFlag> gatekeeperProxyFlag
, <expirePasswordFlag> expirePasswordFlag
, a.value passwordDN
, b.value profile
, c.value tablespace
, d.value accountStatus
, '<repoUrl>' repo
, '<branchName>' branch
, '<configFilePath>' config_file
, '<latestCommit>' commit
, case
    when upper(a.environment) = (select upper(value) from gatekeeper.database_values where key = 'DATABASE_ENVIRONMENT')
      then 1
    when  upper(a.environment) = 'DEFAULT' 
      then 2
  end env_a
, case
    when upper(b.environment) = (select upper(value) from gatekeeper.database_values where key = 'DATABASE_ENVIRONMENT')
      then 1
    when  upper(b.environment) = 'DEFAULT' 
      then 2
  end env_b
, case
    when upper(c.environment) = (select upper(value) from gatekeeper.database_values where key = 'DATABASE_ENVIRONMENT')
      then 1
    when  upper(c.environment) = 'DEFAULT' 
      then 2
  end env_c
, case
    when upper(d.environment) = (select upper(value) from gatekeeper.database_values where key = 'DATABASE_ENVIRONMENT')
      then 1
    when  upper(d.environment) = 'DEFAULT' 
      then 2
  end env_d
from
  dual
, json_table ('{"values" : <passwordDN>
}', '$.values[*]'
columns ("ENVIRONMENT" varchar2(1024) path '$.environment'
         , "VALUE" varchar2(4000) path '$.value')) a
, json_table ('{"values" : <profile>
}', '$.values[*]'
columns ("ENVIRONMENT" varchar2(1024) path '$.environment'
        , "VALUE" varchar2(4000) path '$.value')) b   
, json_table ('{"values" : <tablespace>
}', '$.values[*]'
columns ("ENVIRONMENT" varchar2(1024) path '$.environment'
        , "VALUE" varchar2(4000) path '$.value')) c
, json_table ('{"values" : <accountStatus>
}', '$.values[*]'
columns ("ENVIRONMENT" varchar2(1024) path '$.environment'
        , "VALUE" varchar2(4000) path '$.value')) d                    
where ((select value from gatekeeper.database_values where key = 'DATABASE_ENVIRONMENT') in (<environment>)
or 'DEFAULT' in (<environment2>))
  and (select value from gatekeeper.database_values where key = 'DATABASE_ENVIRONMENT') not in (<excludeEnvironments>)
union
