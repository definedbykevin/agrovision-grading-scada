-- ═══════════════════════════════════════════════════════════════════════
-- DATABASE TEMPLATE FOR STATION: agrovision_loading_ramp (PostgreSQL version)
-- Replace loading_ramp with the station slug (e.g. sterilizer, threshing)
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- STEP 0: Buat database di luar script ini
-- ─────────────────────────────────────────────────────────────
-- PostgreSQL TIDAK mendukung "CREATE DATABASE IF NOT EXISTS" dan tidak
-- bisa dijalankan di dalam transaksi yang sama dengan CREATE TABLE.
-- Jalankan baris ini TERPISAH lebih dulu (misalnya via psql / superuser):
--
--   CREATE DATABASE agrovision_loading_ramp
--     WITH ENCODING 'UTF8' LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8'
--     TEMPLATE template0;
--
-- Setelah database dibuat, connect ke database tersebut:
--   \c agrovision_loading_ramp
--
-- Baru jalankan sisa script ini.

-- ─────────────────────────────────────────────────────────────
-- DB Roles (Application-Level access)
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'kip_station_user') THEN
    CREATE ROLE kip_station_user LOGIN PASSWORD 'CHANGE_THIS_PASSWORD';
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON SCHEMA public TO kip_station_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kip_station_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kip_station_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO kip_station_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO kip_station_user;

-- ─────────────────────────────────────────────────────────────
-- Custom ENUM types
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_enum') THEN
    CREATE TYPE shift_enum AS ENUM ('1','2','3');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'severity_enum') THEN
    CREATE TYPE severity_enum AS ENUM ('INFO','WARNING','ALARM');
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────
-- Helper trigger function untuk menggantikan "ON UPDATE CURRENT_TIMESTAMP"
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- 1. Threshold Settings (Alarm Limits)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS threshold_settings (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  parameter_key VARCHAR(100) NOT NULL UNIQUE, -- e.g. STERI_press, STERI_temp
  lower_val DOUBLE PRECISION DEFAULT 0,
  warning_val DOUBLE PRECISION DEFAULT 50,
  danger_val DOUBLE PRECISION DEFAULT 80,
  unit VARCHAR(20) DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_threshold_settings_updated_at ON threshold_settings;
CREATE TRIGGER trg_threshold_settings_updated_at
  BEFORE UPDATE ON threshold_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 2. Logsheet Entries (Manual input via form, JSONB untuk performa)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS logsheet_entries (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shift shift_enum NOT NULL,
  log_date DATE NOT NULL,
  operator_id INT NOT NULL,
  operator_name VARCHAR(100) NOT NULL,
  data_json JSONB NOT NULL, -- Flexible parameters per station
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_date_shift UNIQUE (log_date, shift)
);

DROP TRIGGER IF EXISTS trg_logsheet_entries_updated_at ON logsheet_entries;
CREATE TRIGGER trg_logsheet_entries_updated_at
  BEFORE UPDATE ON logsheet_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3. Station Event / Alarm Logs (Specific to this station)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS station_event_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tag_name VARCHAR(150) NOT NULL,
  old_value VARCHAR(255) DEFAULT NULL,
  new_value VARCHAR(255) DEFAULT NULL,
  quality VARCHAR(50) DEFAULT 'GOOD',
  severity severity_enum DEFAULT 'INFO',
  source VARCHAR(50) DEFAULT 'PLC',
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  shift VARCHAR(10) DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_timestamp ON station_event_logs ("timestamp");
CREATE INDEX IF NOT EXISTS idx_severity ON station_event_logs (severity);
