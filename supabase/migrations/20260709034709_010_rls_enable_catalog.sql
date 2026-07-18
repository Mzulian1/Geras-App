
-- Habilitar RLS en tablas de catálogo que faltaban en migración 002
ALTER TABLE comunas ENABLE ROW LEVEL SECURITY;
ALTER TABLE professions ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
