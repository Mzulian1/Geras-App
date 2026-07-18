
-- ============================================================
-- FUNCIONES HELPER PARA RLS
-- Propósito: Resolver identidad y rol del usuario autenticado
-- vía Clerk (auth.uid() retorna el clerk_id del JWT).
-- Estas funciones se usan en TODAS las políticas RLS.
-- Se marcan SECURITY DEFINER para que puedan leer la tabla
-- users sin verse afectadas por las políticas RLS de esa tabla.
-- Se marcan STABLE porque no modifican datos y su resultado
-- es constante dentro de una misma transacción.
-- ============================================================

-- Retorna el UUID interno del usuario a partir del clerk_id del JWT
CREATE OR REPLACE FUNCTION auth_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE clerk_id = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Retorna el rol (user_role) del usuario autenticado
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE clerk_id = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
