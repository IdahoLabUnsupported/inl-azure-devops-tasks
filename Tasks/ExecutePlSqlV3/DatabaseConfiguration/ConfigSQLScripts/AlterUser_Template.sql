BEGIN
  GATEKEEPER.CONFIG_USER.alter_schema();
  GATEKEEPER.CONFIG_USER.drop_schema();
END;
/