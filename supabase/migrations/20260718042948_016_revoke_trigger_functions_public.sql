
-- ============================================================
-- FIX: las funciones de trigger log_platform_config_change() y
-- log_professional_status_change() seguían apareciendo como
-- ejecutables por anon/authenticated en el linter después de la
-- migración 014. Motivo: `REVOKE EXECUTE ... FROM anon, authenticated`
-- no alcanza si la función todavía tiene el grant implícito a PUBLIC
-- que Postgres otorga por defecto al crear una función — hay que
-- revocar de PUBLIC explícitamente (mismo patrón ya usado en la
-- migración 012 para generate_matches/process_request_matches).
-- Estas dos son funciones de trigger puras: nadie debería invocarlas
-- por RPC directo, ni siquiera admin.
-- ============================================================
REVOKE ALL ON FUNCTION log_platform_config_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION log_professional_status_change() FROM PUBLIC;
