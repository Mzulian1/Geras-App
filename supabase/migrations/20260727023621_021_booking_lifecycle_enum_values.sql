
-- ============================================================
-- NUEVOS ESTADOS DE booking_status PARA EL CICLO DE EJECUCIÓN
--
-- Se agregan en un archivo propio, separado de la migración que los
-- va a usar (022), porque Postgres no permite usar un valor de enum
-- recién agregado dentro de la MISMA transacción en la que se agregó
-- (ALTER TYPE ... ADD VALUE). Cada ALTER TYPE de acá abajo se
-- auto-commitea como sentencia individual; para cuando corra la
-- migración 022 ya están disponibles.
--
-- No se tocan/reordenan los valores existentes ('pending','confirmed',
-- 'completed','cancelled') ni se duplica el enum — se reutiliza el
-- mismo booking_status de la migración 001.
-- ============================================================
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'en_route';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'professional_completed';
