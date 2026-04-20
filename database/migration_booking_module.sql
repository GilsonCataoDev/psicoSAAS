-- PsicoSaaS — Migração: Módulo de Agendamento Público
-- Execute após init.sql

-- ─────────────────────────────────────────────
-- BOOKING_PAGES (configuração do link público)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_pages (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  psychologist_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug                    TEXT UNIQUE NOT NULL,
  is_active               BOOLEAN DEFAULT TRUE,
  title                   TEXT,
  description             TEXT,
  avatar_url              TEXT,
  session_price           DECIMAL(10,2) DEFAULT 0,
  session_duration        INT DEFAULT 50,
  slot_interval           INT DEFAULT 60,
  allow_presencial        BOOLEAN DEFAULT TRUE,
  allow_online            BOOLEAN DEFAULT TRUE,
  min_advance_days        INT DEFAULT 1,
  max_advance_days        INT DEFAULT 60,
  require_payment_upfront BOOLEAN DEFAULT FALSE,
  pix_key                 TEXT,
  confirmation_message    TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- AVAILABILITY_SLOTS (disponibilidade semanal)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS availability_slots (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  psychologist_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday           SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time        TIME NOT NULL,
  end_time          TIME NOT NULL,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (psychologist_id, weekday, start_time)
);

CREATE INDEX idx_availability_psychologist ON availability_slots(psychologist_id);

-- ─────────────────────────────────────────────
-- BLOCKED_DATES (férias, feriados)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_dates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  psychologist_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  reason            TEXT,
  UNIQUE (psychologist_id, date)
);

-- ─────────────────────────────────────────────
-- BOOKINGS (solicitações via link público)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  psychologist_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Dados do paciente (não exige cadastro prévio)
  patient_name          TEXT NOT NULL,
  patient_email         TEXT NOT NULL,
  patient_phone         TEXT,

  date                  DATE NOT NULL,
  time                  TIME NOT NULL,
  duration              INT DEFAULT 50,

  status                TEXT DEFAULT 'pending'
                        CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),

  -- Token único para confirmação/cancelamento via link
  confirmation_token    TEXT UNIQUE NOT NULL,
  confirmed_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  cancellation_reason   TEXT,

  -- Pagamento
  payment_status        TEXT DEFAULT 'pending'
                        CHECK (payment_status IN ('pending','paid','waived','refunded')),
  amount                DECIMAL(10,2) DEFAULT 0,
  payment_method        TEXT,
  payment_id            TEXT,
  paid_at               TIMESTAMPTZ,

  -- Referência ao appointment interno (criado após confirmação)
  appointment_id        UUID REFERENCES appointments(id),

  patient_notes         TEXT,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_psychologist       ON bookings(psychologist_id);
CREATE INDEX idx_bookings_date               ON bookings(date);
CREATE INDEX idx_bookings_status             ON bookings(status);
CREATE INDEX idx_bookings_confirmation_token ON bookings(confirmation_token);

-- Trigger de updated_at
CREATE TRIGGER trg_bookings_updated
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_booking_pages_updated
  BEFORE UPDATE ON booking_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
