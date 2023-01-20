declare
  lv_cnt int;
begin
  select
    count(*) into lv_cnt
  from
    dba_mviews
  where owner = 'GATEKEEPER'
    and mview_name = upper('config_privileges_environment_vw');
  if lv_cnt > 0 then
    dbms_mview.refresh('config_privileges_environment_vw');
  end if;
  
  select
    count(*) into lv_cnt
  from
    dba_mviews
  where owner = 'GATEKEEPER'
    and mview_name = upper('config_privileges_exclude_environment_vw');
  if lv_cnt > 0 then
    dbms_mview.refresh('config_privileges_exclude_environment_vw');
  end if;
 
  dbms_mview.refresh('config_privileges_vw');
end;
/