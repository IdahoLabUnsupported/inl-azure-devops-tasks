select
  <owner> owner
, <name> name
, upper(a.environment) connection_string_env
, a.value connection_string
, upper(b.environment) source_user_name_env
, b.value source_user_name
, <sourceUserPassword> source_user_password
, '<repoUrl>' repo
, '<branchName>' branch
, '<configFilePath>' config_file
, '<latestCommit>' commit
from
  dual,
  json_table ('{"values" : <connectionstring>
}', '$.values[*]'
columns ("ENVIRONMENT" varchar2(1024) path '$.environment'
         , "VALUE" varchar2(4000) path '$.value')) a,
json_table ('{"values": <sourceUserName>
}', '$.values[*]'   
columns ("ENVIRONMENT" varchar2(1024) path '$.environment'
         , "VALUE" varchar2(4000) path '$.value')) b    
where ((select value from gatekeeper.database_values where key = 'DATABASE_ENVIRONMENT') in (<environment>)
   or 'DEFAULT' in (<environment2>))
  and (select value from gatekeeper.database_values where key = 'DATABASE_ENVIRONMENT') not in (<excludeEnvironment>)
union 