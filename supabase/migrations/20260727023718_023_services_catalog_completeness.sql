
-- ============================================================
-- FASE 1 — CATÁLOGO DE SERVICIOS: COMPLETITUD PARA VITRINA PÚBLICA
--
-- `services` (migración 001) ya cubría nombre/descripción/rango de
-- precio sugerido/duración/activo. Faltaba lo que pide la vitrina de
-- Mobile Familia: orden de aparición e ícono. No se crea una tabla de
-- categorías separada — `services.profession_id -> professions.category`
-- ya categoriza cada servicio (reutilizado tal cual, sin duplicar).
-- ============================================================
ALTER TABLE services
  ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN icon TEXT;

CREATE INDEX idx_services_display_order ON services(display_order, name);
