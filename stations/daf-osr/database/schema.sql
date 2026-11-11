-- ═══════════════════════════════════════════════════════════════════════
-- DATABASE SCHEMA: agrovision_daf_osr (PostgreSQL Version)
-- Station: DAF / OSR (Dissolved Air Flotation & Oil Sludge Recovery)
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- LANGKAH 0: Buat Database (Jalankan terpisah jika belum ada)
-- ─────────────────────────────────────────────────────────────
-- Jalankan perintah ini di PostgreSQL (misal via psql atau pgAdmin):
--
--   CREATE DATABASE agrovision_daf_osr
--     WITH ENCODING 'UTF8' LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8'
--     TEMPLATE template0;
--
-- Hubungkan ke database tersebut:
--   \c agrovision_daf_osr
--
-- Setelah terhubung, jalankan seluruh query di bawah ini.

-- ─────────────────────────────────────────────────────────────
-- User / Roles (Application-Level access)
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
-- Helper Trigger Function: Auto-update kolom updated_at
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- 1. PLC Devices (Koneksi Hardware PLC / OPC UA)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plc_devices (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  rack SMALLINT DEFAULT 0 NOT NULL,
  slot SMALLINT DEFAULT 1 NOT NULL,
  status VARCHAR(20) DEFAULT 'DISCONNECTED',
  enabled BOOLEAN DEFAULT TRUE NOT NULL,
  protocol VARCHAR(50) DEFAULT 'SNAP7',
  last_seen_at TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- 2. PLC Tags (Daftar Tag Pembacaan OT / PLC)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plc_tags (
  id SERIAL PRIMARY KEY,
  plc_id INT NOT NULL REFERENCES plc_devices(id) ON DELETE CASCADE,
  db_number INT NOT NULL,
  byte_offset INT NOT NULL,
  bit_offset INT,
  data_type VARCHAR(20) NOT NULL,            -- e.g. 'REAL', 'BOOL', 'INT', 'DINT'
  tag_name VARCHAR(150) NOT NULL UNIQUE,
  access VARCHAR(10) DEFAULT 'READ' NOT NULL, -- 'READ' | 'WRITE'
  enabled BOOLEAN DEFAULT TRUE NOT NULL,
  node_id VARCHAR(255) DEFAULT NULL          -- NodeId untuk protokol OPC UA
);

CREATE INDEX IF NOT EXISTS idx_plc_tags_enabled ON plc_tags(enabled);
CREATE INDEX IF NOT EXISTS idx_plc_tags_plc ON plc_tags(plc_id);

-- ─────────────────────────────────────────────────────────────
-- 3. Station Tag Mappings (Pemetaan Tag ke Komponen UI/SCADA)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS station_tag_mappings (
  id SERIAL PRIMARY KEY,
  station VARCHAR(50) NOT NULL,
  equipment VARCHAR(100) NOT NULL,
  signal_key VARCHAR(50) NOT NULL,
  tag_id INT NOT NULL REFERENCES plc_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_daf_station_mapping UNIQUE(station, signal_key, equipment)
);

CREATE INDEX IF NOT EXISTS idx_stm_station ON station_tag_mappings(station);
CREATE INDEX IF NOT EXISTS idx_stm_tag ON station_tag_mappings(tag_id);

CREATE OR REPLACE TRIGGER trg_station_tag_mappings_updated_at
  BEFORE UPDATE ON station_tag_mappings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 4. Threshold Settings (Batas Nilai Normal, Warning, Danger)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS threshold_settings (
  id SERIAL PRIMARY KEY,
  parameter_key VARCHAR(100) NOT NULL UNIQUE, -- e.g. DAF_skimmer_rpm, DAF_air_pressure
  lower_val DOUBLE PRECISION DEFAULT 0,
  warning_val DOUBLE PRECISION DEFAULT 50,
  danger_val DOUBLE PRECISION DEFAULT 80,
  unit VARCHAR(20) DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE TRIGGER trg_threshold_settings_updated_at
  BEFORE UPDATE ON threshold_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 5. Logsheet Entries (Input Form Logsheet Harian Shift)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS logsheet_entries (
  id SERIAL PRIMARY KEY,
  shift VARCHAR(10) NOT NULL,                 -- '1', '2', '3'
  log_date DATE NOT NULL,
  operator_id INT NOT NULL,
  operator_name VARCHAR(100) NOT NULL,
  data_json JSONB NOT NULL,                   -- Parameter dinamis tersimpan format JSONB
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_date_shift UNIQUE(shift, log_date)
);

CREATE OR REPLACE TRIGGER trg_logsheet_entries_updated_at
  BEFORE UPDATE ON logsheet_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 6. Station Event / Alarm Logs (Riwayat Alarm & Kejadian)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS station_event_logs (
  id BIGSERIAL PRIMARY KEY,
  tag_name VARCHAR(150) NOT NULL,
  old_value VARCHAR(255) DEFAULT NULL,
  new_value VARCHAR(255) DEFAULT NULL,
  quality VARCHAR(50) DEFAULT 'GOOD',
  severity VARCHAR(20) DEFAULT 'INFO',        -- 'INFO' | 'WARNING' | 'ALARM'
  source VARCHAR(50) DEFAULT 'PLC',
  timestamp TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
  shift VARCHAR(10) DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_severity ON station_event_logs(severity);
CREATE INDEX IF NOT EXISTS idx_event_timestamp ON station_event_logs("timestamp");

-- ─────────────────────────────────────────────────────────────
-- 7. PLC Commands (Antrean Kontrol Write ke PLC)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plc_commands (
  id SERIAL PRIMARY KEY,
  tag_id INT NOT NULL REFERENCES plc_tags(id) ON DELETE CASCADE,
  value VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' NOT NULL, -- 'PENDING' | 'SENT' | 'DONE' | 'ERROR'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  error_message VARCHAR(255) DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_plc_commands_created ON plc_commands(created_at);
CREATE INDEX IF NOT EXISTS idx_plc_commands_status ON plc_commands(status);

CREATE OR REPLACE TRIGGER trg_plc_commands_updated_at
  BEFORE UPDATE ON plc_commands
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 8. PLC Desired State (Status Target Setpoint PLC)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plc_desired_state (
  tag_id INT PRIMARY KEY REFERENCES plc_tags(id) ON DELETE CASCADE,
  desired_value VARCHAR(255) NOT NULL,
  is_synced BOOLEAN DEFAULT FALSE NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- 9. PLC Tag Latest (Cache Nilai Terakhir Tag untuk UI Realtime)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plc_tag_latest (
  tag_id INT PRIMARY KEY REFERENCES plc_tags(id) ON DELETE CASCADE,
  value VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- 10. PLC Tag Values (Histori Nilai Telemetri Time-Series)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plc_tag_values (
  tag_id INT NOT NULL REFERENCES plc_tags(id) ON DELETE CASCADE,
  value VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plc_tag_values_tag_time ON plc_tag_values(tag_id, "timestamp");
