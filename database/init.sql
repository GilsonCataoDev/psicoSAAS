-- PsicoSaaS — Schema inicial PostgreSQL
-- Conforme LGPD: dados sensíveis criptografados na camada de aplicação

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- USERS (psicólogos)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  crp             TEXT NOT NULL,
  specialty       TEXT,
  avatar_url      TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  preferences     JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- PATIENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  psychologist_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  birth_date        DATE,
  pronouns          TEXT,
  status            TEXT DEFAULT 'active' CHECK (status IN ('active','paused','discharged')),
  session_price     DECIMAL(10,2) DEFAULT 0,
  session_duration  INT DEFAULT 50,
  start_date        DATE,
  avatar_color      TEXT,

  -- Criptografado com AES-256-GCM na aplicação antes de salvar
  private_notes     TEXT,

  tags              TEXT[] DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patients_psychologist ON patients(psychologist_id);
CREATE INDEX idx_patients_status ON patients(status);

-- ─────────────────────────────────────────────
-- APPOINTMENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  psychologist_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date              DATE NOT NULL,
  time              TIME NOT NULL,
  duration          INT DEFAULT 50,
  status            TEXT DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  modality          TEXT DEFAULT 'presencial' CHECK (modality IN ('presencial','online')),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_psychologist_date ON appointments(psychologist_id, date);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);

-- ─────────────────────────────────────────────
-- SESSIONS (registros clínicos)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  psychologist_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id    UUID REFERENCES appointments(id),
  date              DATE NOT NULL,
  duration          INT DEFAULT 50,
  mood              SMALLINT CHECK (mood BETWEEN 1 AND 5),

  -- Criptografados na aplicação
  summary           TEXT,
  private_notes     TEXT,
  next_steps        TEXT,

  tags              TEXT[] DEFAULT '{}',
  payment_status    TEXT DEFAULT 'pending' CHECK (payment_status IN ('paid','pending','waived')),
  payment_id        UUID,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_psychologist ON sessions(psychologist_id);
CREATE INDEX idx_sessions_patient ON sessions(patient_id);
CREATE INDEX idx_sessions_date ON sessions(date DESC);

-- ─────────────────────────────────────────────
-- FINANCIAL RECORDS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_records (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  psychologist_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id        UUID REFERENCES patients(id),
  session_id        UUID REFERENCES sessions(id),
  type              TEXT NOT NULL CHECK (type IN ('income','expense')),
  amount            DECIMAL(10,2) NOT NULL,
  description       TEXT NOT NULL,
  status            TEXT DEFAULT 'pending' CHECK (status IN ('paid','pending','overdue')),
  due_date          DATE,
  paid_at           TIMESTAMPTZ,
  method            TEXT CHECK (method IN ('pix','credit_card','debit_card','cash','transfer')),
  receipt_url       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_financial_psychologist ON financial_records(psychologist_id);
CREATE INDEX idx_financial_status ON financial_records(status);

-- ─────────────────────────────────────────────
-- CONSENT RECORDS (LGPD)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consent_records (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  psychologist_id   UUID NOT NULL REFERENCES users(id),
  consent_type      TEXT NOT NULL,  -- 'data_processing', 'audio_transcription', etc.
  granted           BOOLEAN NOT NULL,
  ip_address        INET,
  granted_at        TIMESTAMPTZ DEFAULT NOW(),
  revoked_at        TIMESTAMPTZ
);

-- ─────────────────────────────────────────────
-- Auto-update updated_at
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
