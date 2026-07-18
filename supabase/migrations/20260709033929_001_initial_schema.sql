
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "unaccent";

CREATE TYPE user_role AS ENUM ('family', 'professional', 'residence', 'admin');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
CREATE TYPE document_type AS ENUM (
  'national_id','background_check','professional_title',
  'complementary_cert','professional_registry','work_reference','other'
);
CREATE TYPE service_modality AS ENUM ('home_visit', 'online', 'center', 'one_time');
CREATE TYPE request_status AS ENUM (
  'created','reviewing','sent_to_professionals','professional_interested',
  'accepted','scheduled','completed','cancelled','evaluated'
);
CREATE TYPE match_status AS ENUM ('suggested','viewed','contacted','accepted','rejected');
CREATE TYPE booking_status AS ENUM ('pending','confirmed','completed','cancelled');
CREATE TYPE payment_status AS ENUM ('pending','paid','refunded','failed');
CREATE TYPE urgency_level AS ENUM ('low','medium','high');
CREATE TYPE day_of_week AS ENUM ('monday','tuesday','wednesday','thursday','friday','saturday','sunday');
CREATE TYPE risk_level AS ENUM ('low','medium','high');

CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id   TEXT UNIQUE NOT NULL,
  email      TEXT UNIQUE NOT NULL,
  phone      TEXT,
  role       user_role NOT NULL DEFAULT 'family',
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE comunas (
  id     SERIAL PRIMARY KEY,
  name   TEXT UNIQUE NOT NULL,
  region TEXT NOT NULL DEFAULT 'Región Metropolitana',
  active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO comunas (name) VALUES
  ('Providencia'),('Las Condes'),('Vitacura'),('Lo Barnechea'),
  ('La Reina'),('Ñuñoa'),('Peñalolén'),('Macul'),
  ('Santiago Centro'),('Independencia'),('Recoleta'),('Estación Central'),
  ('Maipú'),('La Florida'),('Puente Alto'),('San Bernardo'),
  ('Pudahuel'),('Quilicura'),('Cerrillos'),('El Bosque');

CREATE TABLE professions (
  id                           SERIAL PRIMARY KEY,
  name                         TEXT UNIQUE NOT NULL,
  category                     TEXT NOT NULL,
  requires_degree              BOOLEAN NOT NULL DEFAULT FALSE,
  requires_document_validation BOOLEAN NOT NULL DEFAULT TRUE,
  risk_level                   risk_level NOT NULL DEFAULT 'low',
  active                       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO professions (name, category, requires_degree, requires_document_validation, risk_level) VALUES
  ('Kinesiólogo','Salud',TRUE,TRUE,'medium'),
  ('Terapeuta Ocupacional','Salud',TRUE,TRUE,'medium'),
  ('Enfermera/o','Salud',TRUE,TRUE,'high'),
  ('TENS','Salud',TRUE,TRUE,'medium'),
  ('Fonoaudiólogo','Salud',TRUE,TRUE,'medium'),
  ('Nutricionista','Salud',TRUE,TRUE,'low'),
  ('Psicólogo','Salud Mental',TRUE,TRUE,'medium'),
  ('Podólogo Clínico','Salud',FALSE,TRUE,'low'),
  ('Médico General','Salud',TRUE,TRUE,'high'),
  ('Trabajador Social','Social',TRUE,TRUE,'low'),
  ('Profesional Gerontológico','Gerontología',TRUE,TRUE,'low'),
  ('Cuidador/a de Adulto Mayor','Cuidado',FALSE,TRUE,'low');

CREATE TABLE services (
  id               SERIAL PRIMARY KEY,
  profession_id    INTEGER NOT NULL REFERENCES professions(id),
  name             TEXT NOT NULL,
  description      TEXT,
  base_price_min   INTEGER,
  base_price_max   INTEGER,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO services (profession_id, name, description, base_price_min, base_price_max, duration_minutes) VALUES
  (1,'Kinesiología domiciliaria','Sesión de kinesioterapia en domicilio',28000,35000,60),
  (1,'Evaluación funcional','Evaluación del estado funcional del adulto mayor',30000,40000,90),
  (2,'Terapia ocupacional domiciliaria','Sesión de terapia ocupacional en casa',28000,35000,60),
  (2,'Adaptación del entorno','Evaluación y recomendaciones de adaptación del hogar',35000,50000,90),
  (3,'Enfermería domiciliaria','Atención de enfermería básica en domicilio',45000,55000,60),
  (3,'Curación y manejo de heridas','Curación y seguimiento de heridas',40000,50000,45),
  (4,'Cuidados técnicos básicos','Atención técnica de nivel TENS en domicilio',30000,38000,60),
  (5,'Fonoaudiología domiciliaria','Sesión de fonoaudiología en domicilio',28000,35000,60),
  (6,'Consulta nutricional','Evaluación y plan nutricional para adulto mayor',28000,35000,60),
  (7,'Psicología domiciliaria','Sesión de psicología en domicilio',30000,40000,60),
  (8,'Podología clínica domiciliaria','Atención podológica en domicilio',22000,30000,45),
  (12,'Cuidado personal básico','Apoyo en actividades básicas de la vida diaria',15000,22000,120),
  (12,'Acompañamiento','Acompañamiento y compañía para adulto mayor',12000,18000,120),
  (12,'Reemplazo puntual','Reemplazo de cuidador por horas o días',12000,18000,240);

CREATE TABLE family_profiles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name             TEXT NOT NULL,
  comuna_id             INTEGER REFERENCES comunas(id),
  phone                 TEXT,
  relationship_to_elder TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE professional_profiles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  profession_id       INTEGER NOT NULL REFERENCES professions(id),
  bio                 TEXT,
  years_experience    INTEGER DEFAULT 0,
  profile_photo_url   TEXT,
  base_comuna_id      INTEGER REFERENCES comunas(id),
  verification_status verification_status NOT NULL DEFAULT 'pending',
  average_rating      NUMERIC(3,2) DEFAULT 0,
  total_reviews       INTEGER DEFAULT 0,
  active              BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE professional_services (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  service_id      INTEGER NOT NULL REFERENCES services(id),
  price           INTEGER NOT NULL,
  modality        service_modality NOT NULL DEFAULT 'home_visit',
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (professional_id, service_id, modality)
);

CREATE TABLE professional_coverage (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  comuna_id       INTEGER NOT NULL REFERENCES comunas(id),
  UNIQUE (professional_id, comuna_id)
);

CREATE TABLE professional_availability (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  day_of_week     day_of_week NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_time CHECK (start_time < end_time)
);

CREATE TABLE professional_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professional_profiles(id) ON DELETE CASCADE,
  document_type   document_type NOT NULL,
  file_url        TEXT NOT NULL,
  status          verification_status NOT NULL DEFAULT 'pending',
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE service_requests (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_user_id UUID NOT NULL REFERENCES users(id),
  service_id     INTEGER NOT NULL REFERENCES services(id),
  comuna_id      INTEGER NOT NULL REFERENCES comunas(id),
  description    TEXT,
  urgency_level  urgency_level NOT NULL DEFAULT 'medium',
  preferred_date DATE,
  frequency      TEXT,
  budget_min     INTEGER,
  budget_max     INTEGER,
  gender_pref    TEXT,
  status         request_status NOT NULL DEFAULT 'created',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE matches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id      UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professional_profiles(id),
  score           INTEGER NOT NULL DEFAULT 0,
  status          match_status NOT NULL DEFAULT 'suggested',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, professional_id)
);

CREATE TABLE bookings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id       UUID REFERENCES service_requests(id),
  professional_id  UUID NOT NULL REFERENCES professional_profiles(id),
  family_user_id   UUID NOT NULL REFERENCES users(id),
  service_id       INTEGER NOT NULL REFERENCES services(id),
  scheduled_at     TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price            INTEGER NOT NULL,
  platform_fee     INTEGER NOT NULL DEFAULT 0,
  status           booking_status NOT NULL DEFAULT 'pending',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reviews (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id       UUID UNIQUE NOT NULL REFERENCES bookings(id),
  reviewer_user_id UUID NOT NULL REFERENCES users(id),
  professional_id  UUID NOT NULL REFERENCES professional_profiles(id),
  rating           SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE residences (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id   UUID REFERENCES users(id),
  name            TEXT NOT NULL,
  description     TEXT,
  address         TEXT NOT NULL,
  comuna_id       INTEGER NOT NULL REFERENCES comunas(id),
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  price_from      INTEGER,
  price_to        INTEGER,
  capacity        INTEGER,
  available_slots INTEGER,
  verified        BOOLEAN NOT NULL DEFAULT FALSE,
  soma_integrated BOOLEAN NOT NULL DEFAULT FALSE,
  active          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE residence_images (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  residence_id UUID NOT NULL REFERENCES residences(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  caption      TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE residence_services (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  residence_id UUID NOT NULL REFERENCES residences(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT
);

CREATE TABLE payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id          UUID UNIQUE NOT NULL REFERENCES bookings(id),
  amount              INTEGER NOT NULL,
  platform_fee        INTEGER NOT NULL DEFAULT 0,
  status              payment_status NOT NULL DEFAULT 'pending',
  provider            TEXT,
  provider_payment_id TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  type       TEXT NOT NULL,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_professional_profiles_verification ON professional_profiles(verification_status);
CREATE INDEX idx_professional_profiles_active ON professional_profiles(active);
CREATE INDEX idx_professional_profiles_profession ON professional_profiles(profession_id);
CREATE INDEX idx_professional_coverage_comuna ON professional_coverage(comuna_id);
CREATE INDEX idx_professional_availability_day ON professional_availability(professional_id, day_of_week);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_service_requests_familia ON service_requests(family_user_id);
CREATE INDEX idx_matches_request ON matches(request_id);
CREATE INDEX idx_matches_professional ON matches(professional_id);
CREATE INDEX idx_bookings_professional ON bookings(professional_id);
CREATE INDEX idx_bookings_familia ON bookings(family_user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_residences_comuna ON residences(comuna_id);
CREATE INDEX idx_residences_active ON residences(active, verified);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_family_updated_at BEFORE UPDATE ON family_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_professional_updated_at BEFORE UPDATE ON professional_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON professional_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_requests_updated_at BEFORE UPDATE ON service_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_residences_updated_at BEFORE UPDATE ON residences FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION update_professional_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE professional_profiles SET
    average_rating = (SELECT ROUND(AVG(rating)::NUMERIC,2) FROM reviews WHERE professional_id = NEW.professional_id),
    total_reviews  = (SELECT COUNT(*) FROM reviews WHERE professional_id = NEW.professional_id)
  WHERE id = NEW.professional_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalculate_rating
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_professional_rating();

CREATE OR REPLACE FUNCTION calculate_platform_fee(price INTEGER, fee_pct NUMERIC DEFAULT 0.06)
RETURNS INTEGER AS $$
BEGIN RETURN ROUND(price * fee_pct); END;
$$ LANGUAGE plpgsql;
