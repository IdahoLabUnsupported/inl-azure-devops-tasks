set serveroutput on
begin
  dbms_output.put_line('Copying Tablespace Config File: <config_file_path>');
end;
/

declare

  lv_cnt int;
  lv_temp_param_cnt int;
  lv_encrypt_param_cnt int;
  lv_sql varchar2(32767);

  cursor new_tablespace is
  with config_tablespaces as (
      <replace>
    ) 
    , tablespaces as (
    select 
      dt.tablespace_name
    , dt.block_size
    , case
        when df.autoextensible = 'YES'
          then 'ON'
        else 'OFF'
      end autoextnd
    , case
        when sum(bytes) / 1024 / 1024 / 1024 < 1
          then to_char(ceil(sum(bytes) / 1024 / 1024)) || 'M'
        else to_char(sum(bytes) / 1024 / 1024 / 1024) || 'G'
      end initialsize
    , case
        when dt.bigfile = 'NO'
          then 'false'
        when dt.bigfile = 'YES'
          then 'true'
      end bigfile
    , case
        when dt.contents = 'TEMPORARY'
          then 'true'
        else 'false'
      end temp
    , case
        when dt.encrypted = 'NO'
          then 'false'
        when dt.encrypted = 'YES'
          then 'true'
      end encrypted
    from 
      dba_tablespaces dt
    left join
      dba_data_files df
        on dt.tablespace_name = df.tablespace_name
    group by dt.tablespace_name
      , dt.block_size
      , df.autoextensible
      , dt.bigfile
      , dt.contents
      , dt.encrypted)
    , new_tablespaces as (
    select
      upper(tablespace_name) tablespace_name
    from
      config_tablespaces
    minus
    select
      tablespace_name
    from
      tablespaces)
    select
      ct.tablespace_name
    , ct.block_size
    , ct.autoextnd
    , ct.initialsize
    , ct.bigfile
    , ct.instance
    , ct.max_size
    , ct.temp
    , ct.encrypted
    , ct.repo
    , ct.branch
    , ct.config_file
    , ct.commit
    from
      config_tablespaces ct
    join 
      new_tablespaces nt
        on ct.tablespace_name = nt.tablespace_name
    ;

  cursor alter_tablespace is
  with config_tablespaces as (
      <replace2>
    ) 
    , tablespaces as (
    select 
      dt.tablespace_name
    , dt.block_size
    , case
        when df.autoextensible = 'YES'
          then 'ON'
        else 'OFF'
      end autoextnd
    , case
        when sum(coalesce(df.bytes, tf.bytes)) / 1024 / 1024 / 1024 < 1
          then to_char(ceil(sum(coalesce(df.bytes, tf.bytes)) / 1024 / 1024)) || 'M'
        else to_char(sum(coalesce(df.bytes, tf.bytes)) / 1024 / 1024 / 1024) || 'G'
      end initialsize
    , sum(coalesce(df.bytes, tf.bytes)) total_bytes
    , case
        when dt.bigfile = 'NO'
          then 'false'
        when dt.bigfile = 'YES'
          then 'true'
      end bigfile
    , case
        when dt.contents = 'TEMPORARY'
          then 'true'
        else 'false'
      end temp
    from 
      dba_tablespaces dt
    left join
      dba_data_files df
        on dt.tablespace_name = df.tablespace_name
    left join
      dba_temp_files tf
        on dt.tablespace_name = tf.tablespace_name
    group by dt.tablespace_name
      , dt.block_size
      , df.autoextensible
      , dt.bigfile
      , dt.contents)
    , alter_tablespaces as (
    select
      upper(tablespace_name) tablespace_name
    , case 
        when substr(initialsize, -1) = 'M'
          then cast(replace(initialsize, 'M', '') as int) * 1024 * 1024
        else cast(replace(initialsize, 'G', '') as int) * 1024 * 1024 * 1024
      end total_bytes
    , autoextnd
    from
      config_tablespaces
    minus
    select
      tablespace_name
    , total_bytes
    , autoextnd
    from
      tablespaces)
    select
      ct.tablespace_name
    , ct.block_size
    , ct.autoextnd
    , ct.initialsize
    , ct.max_size
    , ct.bigfile
    , ct.instance
    , ct.temp
    , ct.encrypted
    , ct.repo
    , ct.branch
    , ct.config_file
    , ct.commit
    from
      config_tablespaces ct
    join 
      alter_tablespaces at
        on ct.tablespace_name = at.tablespace_name
    left join
      tablespaces ts
        on ct.tablespace_name = ts.tablespace_name
    where at.total_bytes > ts.total_bytes
    ;

begin

  select
    count(*) into lv_cnt
  from
    dba_procedures
  where owner = 'GATEKEEPER'
    and object_name = 'CONFIG_TABLESPACE'
    and procedure_name = 'ALTER_TABLESPACE';

  select 
    count(*) into lv_temp_param_cnt 
  from 
    dba_arguments
  where owner = 'GATEKEEPER'
    and package_name = 'CONFIG_TABLESPACE'
    and object_name = 'CREATE_TABLESPACE'
    and argument_name = 'P_TEMP';

  if lv_temp_param_cnt = 0 and lv_encrypt_param_cnt = 0 then
    for i in new_tablespace loop 
    
      GATEKEEPER.CONFIG_TABLESPACE.create_tablespace(
        p_tablespace_name => i.tablespace_name
      , p_size => i.initialsize
      , p_autoextend => i.autoextnd
      , p_blocksize => i.block_size
      , p_bigfile => i.bigfile
      , p_instance => i.instance
      , p_repo => i.repo
      , p_branch => i.branch
      , p_config_file => i.config_file
      , p_commit => i.commit);

    end loop;
  elsif lv_temp_param_cnt = 1 and lv_encrypt_param_cnt = 0 then
    for i in new_tablespace loop 
    lv_sql := 'begin
    GATEKEEPER.CONFIG_TABLESPACE.create_tablespace(
        p_tablespace_name => ''' || i.tablespace_name || '''
      , p_size =>  ''' || i.initialsize || '''
      , p_max_size =>  ''' || i.max_size || '''
      , p_autoextend =>  ''' || i.autoextnd || '''
      , p_blocksize =>  ''' || i.block_size || '''
      , p_bigfile =>  ''' || i.bigfile || '''
      , p_instance =>  ''' || i.instance || '''
      , p_temp =>  ''' || i.temp || '''
      , p_repo =>  ''' || i.repo || '''
      , p_branch =>  ''' || i.branch || '''
      , p_config_file =>  ''' || i.config_file || '''
      , p_commit =>  ''' || i.commit || '''); end;';
      execute immediate lv_sql;
    end loop;
  elsif lv_temp_param_cnt = 0 and lv_encrypt_param_cnt = 1 then
    for i in new_tablespace loop 
    lv_sql := 'begin
    GATEKEEPER.CONFIG_TABLESPACE.create_tablespace(
        p_tablespace_name => ''' || i.tablespace_name || '''
      , p_size =>  ''' || i.initialsize || '''
      , p_max_size =>  ''' || i.max_size || '''
      , p_autoextend =>  ''' || i.autoextnd || '''
      , p_blocksize =>  ''' || i.block_size || '''
      , p_bigfile =>  ''' || i.bigfile || '''
      , p_instance =>  ''' || i.instance || '''
      , p_encrypted =>  ''' || i.encrypted || '''
      , p_repo =>  ''' || i.repo || '''
      , p_branch =>  ''' || i.branch || '''
      , p_config_file =>  ''' || i.config_file || '''
      , p_commit =>  ''' || i.commit || '''); end;';
      execute immediate lv_sql;
    end loop;
  else
    for i in new_tablespace loop 
    lv_sql := 'begin
    GATEKEEPER.CONFIG_TABLESPACE.create_tablespace(
        p_tablespace_name => ''' || i.tablespace_name || '''
      , p_size =>  ''' || i.initialsize || '''
      , p_max_size =>  ''' || i.max_size || '''
      , p_autoextend =>  ''' || i.autoextnd || '''
      , p_blocksize =>  ''' || i.block_size || '''
      , p_bigfile =>  ''' || i.bigfile || '''
      , p_instance =>  ''' || i.instance || '''
      , p_temp =>  ''' || i.temp || '''
      , p_encrypted =>  ''' || i.encrypted || '''
      , p_repo =>  ''' || i.repo || '''
      , p_branch =>  ''' || i.branch || '''
      , p_config_file =>  ''' || i.config_file || '''
      , p_commit =>  ''' || i.commit || '''); end;';
      execute immediate lv_sql;
    end loop;
  end if;

  if lv_cnt > 0 then

    for i in alter_tablespace loop

      lv_sql := 'begin GATEKEEPER.CONFIG_TABLESPACE.alter_tablespace(
        p_tablespace_name => ''' || i.tablespace_name || '''
      , p_size => ''' || i.initialsize || '''
      , p_max_size => ''' || i.max_size || '''
      , p_autoextend => ''' || i.autoextnd || '''
      , p_blocksize => ''' || i.block_size || '''
      , p_bigfile => ''' || i.bigfile || '''
      , p_instance => ''' || i.instance || '''
      , p_temp => ''' || i.temp || '''
      , p_encrypted => ''' || i.encrypted || '''
      , p_repo => ''' || i.repo || '''
      , p_branch => ''' || i.branch || '''
      , p_config_file => ''' || i.config_file || '''
      , p_commit => ''' || i.commit || '''); end;';
      
      execute immediate lv_sql;

    end loop;

  end if;
  
end;
/