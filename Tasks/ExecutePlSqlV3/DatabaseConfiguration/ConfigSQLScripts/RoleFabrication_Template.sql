select
  <rolename> rolename
, a.value roleDN
, <password> rolePW
, case
    when upper(a.environment) = (select upper(value) from gatekeeper.database_values where key = ''DATABASE_ENVIRONMENT'')
      then 1
    when  upper(a.environment) = ''DEFAULT'' 
      then 2
  end env_a
, ''<repoUrl>'' repo
, ''<branchName>'' branch
, ''<configFilePath>'' config_file
, ''<latestCommit>'' commit
from
  dual,
  json_table (''{"values" : <roleDN>
}'', ''$.values[*]''
columns ("ENVIRONMENT" varchar2(1024) path ''$.environment''
         , "VALUE" varchar2(4000) path ''$.value'')) a
where (select value from gatekeeper.database_values where key = ''DATABASE_ENVIRONMENT'') in (<environment>)
or ''DEFAULT'' in (<environment2>)         
union