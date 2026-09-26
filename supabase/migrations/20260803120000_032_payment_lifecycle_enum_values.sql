-- ============================================================
-- NUEVOS ESTADOS PARA EL CICLO DE PAGO DE UNA RESERVA
--
-- Mismo motivo que la migración 021 para separar este archivo del que
-- los usa (033): Postgres no permite usar un valor de enum recién
-- agregado dentro de la MISMA transacción en la que se agregó
-- (ALTER TYPE ... ADD VALUE). Cada sentencia de acá se auto-commitea;
-- para cuando corra la 033 ya están disponibles.
--
-- No se toca ni se reordena ningún valor existente de booking_status
-- ('pending','confirmed','completed','cancelled','en_route',
-- 'in_progress','professional_completed') ni de payment_status
-- ('pending','paid','refunded','failed') — se amplían los mismos enums
-- de la migración 001. El flujo anterior (match -> create_booking_from_match
-- -> 'pending' -> accept_booking) sigue funcionando sin cambios: los
-- estados nuevos son un camino ADICIONAL, no un reemplazo.
--
-- booking_status:
--   awaiting_payment ............. reserva provisional creada, ocupa el
--                                  horario, esperando el pago.
--   paid_awaiting_confirmation ... pago retenido, falta que el
--                                  profesional acepte.
--   disputed ..................... la familia o el profesional
--                                  objetaron una atención ya realizada.
--
-- payment_status:
--   held ......... fondos retenidos (autorizados, no capturados).
--   released ..... liberados al profesional al completarse el servicio.
--
-- 'paid' se mantiene por compatibilidad con filas existentes, pero el
-- flujo nuevo usa held -> released. No se elimina: Postgres no permite
-- borrar valores de un enum.
-- ============================================================
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'awaiting_payment';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'paid_awaiting_confirmation';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'disputed';

ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'held';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'released';
