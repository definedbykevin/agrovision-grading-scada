-- ═══════════════════════════════════════════════════════════════════
-- DATABASE FOR STATION: agrovision_sterilizer (PostgreSQL version)
-- Domain: Sterilizer Station - Monitoring & Logsheets
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- STEP 0: Buat database & role di luar script ini
-- ─────────────────────────────────────────────────────────────
-- PostgreSQL TIDAK mendukung "CREATE DATABASE IF NOT EXISTS" dan tidak
-- bisa dijalankan di dalam transaksi yang sama dengan CREATE TABLE.
-- Jalankan baris ini TERPISAH lebih dulu (misalnya via psql / superuser):
--
--   CREATE DATABASE agrovision_sterilizer
--     WITH ENCODING 'UTF8' LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8'
--     TEMPLATE template0;
--
-- Setelah database dibuat, connect ke database tersebut:
--   \c agrovision_sterilizer
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

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'kip_snap7') THEN
    CREATE ROLE kip_snap7 LOGIN PASSWORD 'CHANGE_THIS_PASSWORD';
  END IF;
END
$$;

-- kip_station_user: full access ke schema public (setara ALL PRIVILEGES)
GRANT ALL PRIVILEGES ON SCHEMA public TO kip_station_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kip_station_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kip_station_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO kip_station_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO kip_station_user;

-- Catatan: GRANT untuk kip_snap7 dipindah ke BAWAH file ini (setelah
-- tabel-tabel dibuat), karena PostgreSQL tidak bisa GRANT ke tabel yang
-- belum ada — beda dengan MySQL yang boleh GRANT lebih dulu.

-- ─────────────────────────────────────────────────────────────
-- Custom ENUM types
-- ─────────────────────────────────────────────────────────────
-- Catatan: ENUM di PostgreSQL adalah tipe terpisah yang harus dibuat
-- dulu. Alternatif yang lebih fleksibel (lebih gampang tambah value
-- baru tanpa ALTER TYPE) adalah VARCHAR + CHECK constraint — dipakai
-- di beberapa kolom di bawah sebagai contoh.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_enum') THEN
    CREATE TYPE shift_enum AS ENUM ('1','2','3');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'severity_enum') THEN
    CREATE TYPE severity_enum AS ENUM ('INFO','WARNING','ALARM');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plc_status_enum') THEN
    CREATE TYPE plc_status_enum AS ENUM ('CONNECTED','DISCONNECTED','DISABLED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plc_data_type_enum') THEN
    CREATE TYPE plc_data_type_enum AS ENUM ('BOOL','INT','DINT','REAL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plc_access_enum') THEN
    CREATE TYPE plc_access_enum AS ENUM ('READ','WRITE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plc_command_status_enum') THEN
    CREATE TYPE plc_command_status_enum AS ENUM ('PENDING','SENT','DONE','ERROR','EXPIRED');
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────
-- Helper trigger function untuk menggantikan "ON UPDATE CURRENT_TIMESTAMP"
-- ─────────────────────────────────────────────────────────────
-- PostgreSQL tidak punya fitur ini secara native. Solusinya: satu
-- fungsi trigger generik yang dipasang ke setiap tabel yang butuh
-- auto-update kolom updated_at.
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
  parameter_key VARCHAR(100) NOT NULL UNIQUE,
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
  data_json JSONB NOT NULL,
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
-- 3. Station Event / Alarm Logs
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

-- ─────────────────────────────────────────────────────────────
-- 4. PLC Devices
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plc_devices (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  rack SMALLINT NOT NULL DEFAULT 0,
  slot SMALLINT NOT NULL DEFAULT 1,
  status plc_status_enum DEFAULT 'DISCONNECTED',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_at TIMESTAMP DEFAULT NULL
);

-- ─────────────────────────────────────────────────────────────
-- 5. PLC Tags (address mapping)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plc_tags (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plc_id INT NOT NULL,
  db_number INT NOT NULL,
  byte_offset INT NOT NULL,
  bit_offset INT DEFAULT NULL,
  data_type plc_data_type_enum NOT NULL,
  tag_name VARCHAR(150) NOT NULL UNIQUE,
  access plc_access_enum NOT NULL DEFAULT 'READ',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  node_id VARCHAR(255) DEFAULT 'DB',
  CONSTRAINT fk_plc_tags_plc FOREIGN KEY (plc_id) REFERENCES plc_devices (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plc_tags_plc ON plc_tags (plc_id);
CREATE INDEX IF NOT EXISTS idx_plc_tags_enabled ON plc_tags (enabled);

-- ─────────────────────────────────────────────────────────────
-- 6. PLC Tag Latest (shadow table — nilai terkini per tag)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plc_tag_latest (
  tag_id INT PRIMARY KEY,
  value VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_plc_tag_latest_tag FOREIGN KEY (tag_id) REFERENCES plc_tags (id) ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS trg_plc_tag_latest_updated_at ON plc_tag_latest;
CREATE TRIGGER trg_plc_tag_latest_updated_at
  BEFORE UPDATE ON plc_tag_latest
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 7. PLC Tag Values (time-series historis)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plc_tag_values (
  tag_id INT NOT NULL,
  value VARCHAR(255) NOT NULL,
  "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_plc_tag_values_tag FOREIGN KEY (tag_id) REFERENCES plc_tags (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plc_tag_values_tag_time ON plc_tag_values (tag_id, "timestamp");

-- ─────────────────────────────────────────────────────────────
-- 8. PLC Commands (command queue: frontend → PLC)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plc_commands (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tag_id INT NOT NULL,
  value VARCHAR(255) NOT NULL,
  status plc_command_status_enum NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NULL,
  error_message VARCHAR(255) DEFAULT NULL,
  CONSTRAINT fk_plc_commands_tag FOREIGN KEY (tag_id) REFERENCES plc_tags (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plc_commands_status ON plc_commands (status);
CREATE INDEX IF NOT EXISTS idx_plc_commands_created ON plc_commands (created_at);

DROP TRIGGER IF EXISTS trg_plc_commands_updated_at ON plc_commands;
CREATE TRIGGER trg_plc_commands_updated_at
  BEFORE UPDATE ON plc_commands
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 9. PLC Desired State (target nilai yang harus dicapai)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plc_desired_state (
  tag_id INT PRIMARY KEY,
  desired_value VARCHAR(255) NOT NULL,
  is_synced BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_plc_desired_state_tag FOREIGN KEY (tag_id) REFERENCES plc_tags (id) ON DELETE CASCADE
);

DROP TRIGGER IF EXISTS trg_plc_desired_state_updated_at ON plc_desired_state;
CREATE TRIGGER trg_plc_desired_state_updated_at
  BEFORE UPDATE ON plc_desired_state
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 10. Station Tag Mappings
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS station_tag_mappings (
  id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  station VARCHAR(50) NOT NULL,
  equipment VARCHAR(100) NOT NULL,
  signal_key VARCHAR(50) NOT NULL,
  tag_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_station_mapping UNIQUE (station, equipment, signal_key)
);

CREATE INDEX IF NOT EXISTS idx_stm_station ON station_tag_mappings (station);
CREATE INDEX IF NOT EXISTS idx_stm_tag ON station_tag_mappings (tag_id);

DROP TRIGGER IF EXISTS trg_station_tag_mappings_updated_at ON station_tag_mappings;
CREATE TRIGGER trg_station_tag_mappings_updated_at
  BEFORE UPDATE ON station_tag_mappings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 11. Recipe Settings
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipe_settings (
  category VARCHAR(50) NOT NULL,
  line_number INT NOT NULL,
  step_number INT NOT NULL,
  unf INT DEFAULT 0,
  nrm INT DEFAULT 0,
  wet INT DEFAULT 0,
  inl SMALLINT DEFAULT 0,
  con SMALLINT DEFAULT 0,
  exh SMALLINT DEFAULT 0,
  bar VARCHAR(20) DEFAULT '0.00',
  mode VARCHAR(20) DEFAULT 'OFF',
  door_in VARCHAR(20) DEFAULT 'Close',
  door_out VARCHAR(20) DEFAULT 'Close',
  inl1 SMALLINT DEFAULT 0,
  inl2 SMALLINT DEFAULT 0,
  dinl SMALLINT DEFAULT 0,
  rcon SMALLINT DEFAULT 0,
  dcon SMALLINT DEFAULT 0,
  PRIMARY KEY (category, line_number, step_number)
);

-- ─────────────────────────────────────────────────────────────
-- 12. Station Parameters
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS station_parameters (
  param_key VARCHAR(100) PRIMARY KEY,
  param_value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_station_parameters_updated_at ON station_parameters;
CREATE TRIGGER trg_station_parameters_updated_at
  BEFORE UPDATE ON station_parameters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 13. Sterilizer Cycle Logs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sterilizer_cycle_logs (
  id BIGINT PRIMARY KEY,
  device_id INT NOT NULL,
  cycle_number INT NOT NULL DEFAULT 1,
  start_time TIMESTAMP DEFAULT NULL,
  end_time TIMESTAMP DEFAULT NULL,
  door_details JSONB DEFAULT NULL,
  step_details JSONB DEFAULT NULL,
  cycle_data JSONB DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scl_device_end ON sterilizer_cycle_logs (device_id, end_time);
CREATE INDEX IF NOT EXISTS idx_scl_start ON sterilizer_cycle_logs (start_time);

-- ─────────────────────────────────────────────────────────────
-- GRANT untuk kip_snap7 & kip_station_user
-- ─────────────────────────────────────────────────────────────
GRANT SELECT ON plc_devices TO kip_snap7;
GRANT SELECT ON plc_tags TO kip_snap7;
GRANT SELECT, INSERT, UPDATE ON plc_tag_values TO kip_snap7;
GRANT SELECT, INSERT, UPDATE ON plc_tag_latest TO kip_snap7;
GRANT SELECT, UPDATE ON plc_commands TO kip_snap7;
GRANT SELECT, INSERT, UPDATE ON plc_desired_state TO kip_snap7;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kip_snap7;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kip_station_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kip_station_user;

