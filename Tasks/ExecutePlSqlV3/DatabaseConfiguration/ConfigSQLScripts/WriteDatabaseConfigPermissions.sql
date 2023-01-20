set echo off
set serveroutput on
begin
  dbms_output.put_line('Copying Permission Config File: <config_file_path>');
end;
/

declare

  lv_repo varchar2(32767) := '<repo_data>';
  lv_branch_value varchar2(32767) := '<branch_value>';
  lv_config_values varchar2(32767) := '<config_values>';
  lv_commit varchar2(256) := '<commit>';
  lv_config_file varchar2(256) := '<config_file>';
  lv_number int := <number>;

begin
  -- Merge Database Config Values  
  if lv_number = 1 then
    merge into GATEKEEPER.DATABASE_CONFIG a
    using (select
      lv_repo repo
    , lv_branch_value branch
    , lv_config_values config_values
    , lv_commit commit_hash
    , lv_config_file config_file
    from dual) b
    on ( coalesce(a.repo, '<null>') = coalesce(b.repo, '<null>')
    and coalesce(a.branch, '<null>') = coalesce(b.branch, '<null>')
    and coalesce(a.config_file, '<null>') = coalesce(b.config_file, '<null>')
    and b.branch is not null)
    when matched 
    then update
    set config_values = b.config_values
      , commit_hash = b.commit_hash
      , last_updated_time = sysdate
    when not matched
    then insert
    ( repo
    , branch
    , commit_hash
    , config_file
    , config_values
    , last_updated_time)
    values
    ( b.repo
    , b.branch
    , b.commit_hash
    , b.config_file
    , b.config_values
    , sysdate);

  else

    update GATEKEEPER.DATABASE_CONFIG
    set config_values = config_values || lv_config_values
    where coalesce(repo, '<null>') = coalesce(lv_repo, '<null>')
      and coalesce(branch, '<null>') = coalesce(lv_branch_value, '<null>')
      and coalesce(config_file, '<null>') = coalesce(lv_config_file, '<null>')
      and branch is not null;

  end if;

  commit;

end;
/
set echo on