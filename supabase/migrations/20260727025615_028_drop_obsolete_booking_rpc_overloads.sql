
-- ============================================================
-- LIMPIEZA: sobrecargas obsoletas de accept_booking/reject_booking/
-- cancel_booking dejadas por la migración 020
--
-- La migración 022 "redefine" estas tres RPCs agregando un tercer
-- parámetro (p_actor_user_id). CREATE OR REPLACE FUNCTION solo
-- reemplaza cuando la firma (tipos de parámetros) es idéntica — al
-- cambiar la aridad, Postgres creó una función NUEVA sobrecargada en
-- vez de reemplazar la de la migración 020, dejando ambas versiones
-- coexistiendo (2 parámetros y 3 parámetros).
--
-- Verificado contra el remoto: ningún endpoint actual del server llama
-- a estas RPCs sin p_actor_user_id, así que la ambigüedad no se
-- dispara en producción hoy. Pero es un estado inconsistente real: un
-- llamador futuro (u otra ruta) que invoque con exactamente
-- (p_booking_id, p_note) por nombre falla con
-- "function ... is not unique" (42725) — comprobado en vivo. La
-- intención original (comentario de la migración 022: "no se duplica
-- ninguna tabla ni RPC nueva para lo mismo") era reemplazar, no
-- duplicar. Se eliminan las versiones de 2 parámetros, dejando solo
-- las de 3 (las que además ya recibieron el REVOKE de PUBLIC en 020 y
-- 022, así que esto no cambia permisos).
-- ============================================================

DROP FUNCTION IF EXISTS public.accept_booking(UUID, TEXT);
DROP FUNCTION IF EXISTS public.reject_booking(UUID, TEXT);
DROP FUNCTION IF EXISTS public.cancel_booking(UUID, TEXT);
