set serveroutput on

declare
cursor c1 is 
  select * from
    GATEKEEPER.DATABASE_CONFIG
  where repo = '<repo_data>'
    and branch not in (<branch_array>);

lv_cnt int := 0;

begin 
  for i in c1 loop
    lv_cnt := lv_cnt + 1;
  end loop;

  dbms_output.put_line('There are ' || lv_cnt || ' files in branches that need to be deleted.');
  for i in c1 loop

    delete from GATEKEEPER.DATABASE_CONFIG 
    where repo = i.repo
      and branch = i.branch
      and commit_hash = i.commit_hash
      and config_file = i.config_file;
      
    dbms_output.put_line('DELETE from GATEKEEPER.DATABASE_CONFIG repo: "' || i.repo || '", branch: "' || i.branch || '", commit: "' || i.commit_hash || '", config_file: "' || i.config_file || '"');
    
  end loop;

  lv_cnt := 0;

  for i in c1 loop
    lv_cnt := lv_cnt + 1;
  end loop;

  dbms_output.put_line('There are ' || lv_cnt || ' files in deprecated branches that have not been deleted.');

  commit;
end;
/