
-- ============================================================
-- PERMISOS DE FUNCIONES: Restringir acceso vía API REST
--
-- Problema: Por defecto PostgreSQL otorga EXECUTE a PUBLIC.
-- Esto expone funciones SECURITY DEFINER como endpoints RPC.
--
-- Estrategia:
-- - auth_user_id / auth_user_role: DEBEN ser ejecutables por
--   authenticated (las políticas RLS las invocan). Se revoca
--   solo de anon. El warning del linter para authenticated
--   es esperado e intencional.
-- - generate_matches / process_request_matches: Solo service_role.
--   Se revoca de PUBLIC, anon y authenticated.
-- ============================================================

-- Funciones de matching: solo ejecutables por service_role
REVOKE ALL ON FUNCTION generate_matches(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION process_request_matches(UUID) FROM PUBLIC;

-- Helpers RLS: revocar de anon (no autenticados no deben invocarlas)
REVOKE EXECUTE ON FUNCTION auth_user_id() FROM anon;
REVOKE EXECUTE ON FUNCTION auth_user_role() FROM anon;

-- Revocar también de anon para matching (por si PUBLIC ya re-otorgó)
REVOKE EXECUTE ON FUNCTION generate_matches(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION generate_matches(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION process_request_matches(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION process_request_matches(UUID) FROM authenticated;
