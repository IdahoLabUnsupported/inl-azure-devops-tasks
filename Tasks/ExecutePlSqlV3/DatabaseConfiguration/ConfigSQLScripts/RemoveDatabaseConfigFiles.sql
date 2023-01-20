delete from gatekeeper.database_config
where repo = '<repo>'
  and branch = '<branch>'
  <files>;

  commit;