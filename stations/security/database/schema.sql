-- ═══════════════════════════════════════════════════════════════════════
-- DATABASE DDL FOR STATION: agrovision_security (POSTGRESQL NATIVE)
-- ═══════════════════════════════════════════════════════════════════════

-- Ensure database exists (Run in psql client / DBeaver):
-- CREATE DATABASE agrovision_security;

CREATE EXTENSION IF NOT EXISTS dblink;

-- ─────────────────────────────────────────────────────────────
-- 1. Threshold Settings (Alarm Limits)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS threshold_settings (
  id SERIAL PRIMARY KEY,
  parameter_key VARCHAR(100) NOT NULL UNIQUE,
  lower_val DOUBLE PRECISION DEFAULT 0,
  warning_val DOUBLE PRECISION DEFAULT 50,
  danger_val DOUBLE PRECISION DEFAULT 80,
  unit VARCHAR(20) DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- 2. Logsheet Entries (Manual input via form, JSONB field)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS logsheet_entries (
  id SERIAL PRIMARY KEY,
  shift VARCHAR(10) NOT NULL CHECK (shift IN ('1','2','3')),
  log_date DATE NOT NULL,
  operator_id INT NOT NULL,
  operator_name VARCHAR(100) NOT NULL,
  data_json JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_date_shift UNIQUE (log_date, shift)
);

-- ─────────────────────────────────────────────────────────────
-- 3. Station Event / Alarm Logs (Specific to this station)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS station_event_logs (
  id BIGSERIAL PRIMARY KEY,
  tag_name VARCHAR(150) NOT NULL,
  old_value VARCHAR(255) DEFAULT NULL,
  new_value VARCHAR(255) DEFAULT NULL,
  quality VARCHAR(50) DEFAULT 'GOOD',
  severity VARCHAR(20) DEFAULT 'INFO' CHECK (severity IN ('INFO','WARNING','ALARM')),
  source VARCHAR(50) DEFAULT 'PLC',
  timestamp TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
  shift VARCHAR(10) DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_station_event_timestamp ON station_event_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_station_event_severity ON station_event_logs (severity);

-- ─────────────────────────────────────────────────────────────
-- 4. CCTV Cameras (Dynamic RTSP links for monitoring)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cctv_cameras (
  id SERIAL PRIMARY KEY,
  camera_code VARCHAR(50) DEFAULT NULL UNIQUE,
  camera_name VARCHAR(100) NOT NULL,
  location VARCHAR(100) DEFAULT NULL,
  station_slug VARCHAR(100) DEFAULT 'security',
  rtsp_url VARCHAR(255) NOT NULL,
  is_active SMALLINT DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- 5. Security Guards Status
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_guards_status (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL,
  fullName VARCHAR(150) NOT NULL,
  position VARCHAR(100) NOT NULL DEFAULT 'Security Officer',
  current_station_key VARCHAR(100) DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'standby' CHECK (status IN ('active','standby','sos')),
  color VARCHAR(10) NOT NULL DEFAULT '#00FF00',
  latitude DECIMAL(10,8) DEFAULT NULL,
  longitude DECIMAL(11,8) DEFAULT NULL,
  last_update TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sgs_status ON security_guards_status (status);

-- ─────────────────────────────────────────────────────────────
-- 6. Security Incidents
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_incidents (
  id SERIAL PRIMARY KEY,
  incident_code VARCHAR(20) NOT NULL UNIQUE,
  incident_type VARCHAR(150) NOT NULL,
  location VARCHAR(150) NOT NULL,
  reported_by INT NOT NULL,
  reported_by_name VARCHAR(100) NOT NULL,
  reported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','REVIEWED','RESOLVED')),
  priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  description TEXT NOT NULL,
  photo_path VARCHAR(255) DEFAULT NULL,
  resolved_at TIMESTAMP DEFAULT NULL,
  resolved_by INT DEFAULT NULL,
  resolved_by_name VARCHAR(100) DEFAULT NULL,
  resolved_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_si_status ON security_incidents (status);
CREATE INDEX IF NOT EXISTS idx_si_priority ON security_incidents (priority);
CREATE INDEX IF NOT EXISTS idx_si_reporter ON security_incidents (reported_by);

-- ─────────────────────────────────────────────────────────────
-- 7. Security Patrol Sessions
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_patrol_sessions (
  id SERIAL PRIMARY KEY,
  session_code VARCHAR(50) NOT NULL UNIQUE,
  guard_id INT NOT NULL,
  guard_name VARCHAR(100) NOT NULL,
  shift VARCHAR(50) NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sps_guard ON security_patrol_sessions (guard_id);
CREATE INDEX IF NOT EXISTS idx_sps_status ON security_patrol_sessions (status);

-- ─────────────────────────────────────────────────────────────
-- 8. Security Queue Classifications
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_queue_classifications (
  id SERIAL PRIMARY KEY,
  code CHAR(1) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  requires_grading SMALLINT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  is_active SMALLINT NOT NULL DEFAULT 1
);

-- ─────────────────────────────────────────────────────────────
-- 9. Security Queue Counters
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_queue_counters (
  id SERIAL PRIMARY KEY,
  queue_date DATE NOT NULL,
  classification_code CHAR(1) NOT NULL REFERENCES security_queue_classifications(code),
  last_sequence INT NOT NULL DEFAULT 0,
  current_sequence INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_sqcnt_date_class UNIQUE (queue_date, classification_code)
);

-- ─────────────────────────────────────────────────────────────
-- 10. Security Session Checkpoints
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_session_checkpoints (
  id SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES security_patrol_sessions(id) ON DELETE CASCADE,
  checkpoint_code VARCHAR(20) DEFAULT NULL,
  station_name VARCHAR(150) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','secure')),
  verified_at TIMESTAMP DEFAULT NULL,
  verified_by INT DEFAULT NULL,
  verified_by_name VARCHAR(100) DEFAULT NULL,
  verification_photo VARCHAR(255) DEFAULT NULL,
  verification_notes TEXT,
  latitude DECIMAL(10,8) DEFAULT NULL,
  longitude DECIMAL(11,8) DEFAULT NULL,
  gps_accuracy DECIMAL(5,2) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ssc_session ON security_session_checkpoints (session_id);
CREATE INDEX IF NOT EXISTS idx_ssc_code ON security_session_checkpoints (checkpoint_code);

-- ─────────────────────────────────────────────────────────────
-- 11. Security Stations (Patrol Map Master)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_stations (
  id SERIAL PRIMARY KEY,
  station_key VARCHAR(100) NOT NULL UNIQUE,
  checkpoint_code VARCHAR(20) DEFAULT NULL UNIQUE,
  label VARCHAR(150) NOT NULL,
  operator_station VARCHAR(100) DEFAULT NULL,
  normalized_x DECIMAL(5,4) NOT NULL,
  normalized_y DECIMAL(5,4) NOT NULL,
  latitude DECIMAL(10,8) DEFAULT NULL,
  longitude DECIMAL(11,8) DEFAULT NULL,
  is_active SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_sgs_station') THEN
        ALTER TABLE security_guards_status ADD CONSTRAINT fk_sgs_station FOREIGN KEY (current_station_key) REFERENCES security_stations(station_key) ON DELETE SET NULL;
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 12. Security Truck Queues
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_truck_queues (
  id SERIAL PRIMARY KEY,
  queue_code VARCHAR(30) NOT NULL UNIQUE,
  classification_code CHAR(1) NOT NULL DEFAULT 'U' REFERENCES security_queue_classifications(code),
  queue_date DATE NOT NULL,
  sequence_number INT NOT NULL,
  driver_name VARCHAR(150) NOT NULL,
  no_sim VARCHAR(30) DEFAULT NULL,
  license_plate VARCHAR(20) NOT NULL,
  no_do VARCHAR(50) DEFAULT NULL,
  transporter_company VARCHAR(150) DEFAULT NULL,
  perusahaan VARCHAR(150) DEFAULT NULL,
  driver_photo VARCHAR(255) DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING','WEIGH_IN','GRADING','PENDING','COMPLETED','CANCELLED')),
  check_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  pending_reason VARCHAR(255) DEFAULT NULL,
  registered_by INT NOT NULL,
  registered_by_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_stq_date_class_seq UNIQUE (queue_date, classification_code, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_stq_date_seq ON security_truck_queues (queue_date, sequence_number);
CREATE INDEX IF NOT EXISTS idx_stq_status ON security_truck_queues (status);
CREATE INDEX IF NOT EXISTS idx_stq_plate ON security_truck_queues (license_plate);

-- ─────────────────────────────────────────────────────────────
-- DB TRIGGER: Auto-Sync cctv_cameras to security_ai_cctv_configs
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_cctv_to_ai()
RETURNS TRIGGER AS $$
DECLARE
  target_code VARCHAR(50);
  target_slug VARCHAR(50);
  sql_stmt TEXT;
  conn_str TEXT := 'dbname=agrovision_security_ai user=postgres password=kip2026 host=127.0.0.1 port=5432';
BEGIN
  IF (TG_OP = 'DELETE') THEN
    target_code := COALESCE(OLD.camera_code, 'CAM_' || OLD.id);
    sql_stmt := format('DELETE FROM security_ai_cctv_configs WHERE camera_code = %L', target_code);
    PERFORM dblink_exec(conn_str, sql_stmt);
    RETURN OLD;
  END IF;

  target_code := COALESCE(NEW.camera_code, 'CAM_' || NEW.id);
  target_slug := COALESCE(NEW.station_slug, 'security');

  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    sql_stmt := format(
      'INSERT INTO security_ai_cctv_configs (camera_code, camera_name, station_slug, rtsp_url, is_active, updated_at) ' ||
      'VALUES (%L, %L, %L, %L, %L, CURRENT_TIMESTAMP) ' ||
      'ON CONFLICT (camera_code) DO UPDATE SET ' ||
      'camera_name = EXCLUDED.camera_name, station_slug = EXCLUDED.station_slug, ' ||
      'rtsp_url = EXCLUDED.rtsp_url, is_active = EXCLUDED.is_active, updated_at = CURRENT_TIMESTAMP',
      target_code, NEW.camera_name, target_slug, NEW.rtsp_url, (NEW.is_active = 1)
    );
    PERFORM dblink_exec(conn_str, sql_stmt);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_cctv_to_ai ON cctv_cameras;
CREATE TRIGGER trg_sync_cctv_to_ai
AFTER INSERT OR UPDATE OR DELETE ON cctv_cameras
FOR EACH ROW EXECUTE FUNCTION sync_cctv_to_ai();

-- ─────────────────────────────────────────────────────────────
-- SEED DATA FOR MASTER CLASSIFICATIONS & STATIONS
-- ─────────────────────────────────────────────────────────────
INSERT INTO security_queue_classifications (id, code, label, requires_grading, sort_order, is_active) VALUES
(1, 'U', 'FFB Umum', 1, 1, 1),
(2, 'M', 'FFB Mitra', 1, 2, 1),
(3, 'C', 'Crude Palm Oil', 0, 3, 1),
(4, 'K', 'Palm Kernel', 0, 4, 1),
(5, 'S', 'Palm Kernel Shell', 0, 5, 1)
ON CONFLICT DO NOTHING;

INSERT INTO security_stations (id, station_key, checkpoint_code, label, operator_station, normalized_x, normalized_y, latitude, longitude, is_active, created_at, updated_at) VALUES
(1, 'main_gate', 'CP-01', 'Main Gate', NULL, 0.0720, 0.9000, 3.68229200, 98.70377200, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'boiler_house', 'CP-02', 'Boiler House', 'Boiler House', 0.3520, 0.4400, 3.68412000, 98.70420000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'sterilizer', 'CP-03', 'Sterilizer', 'Sterilizer Station', 0.7800, 0.5300, 3.68350000, 98.70510000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'loading_ramp', 'CP-04', 'Loading Ramp', 'Loading Ramp', 0.6900, 0.6400, 3.68380000, 98.70490000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 'engine_room', 'CP-05', 'Engine Room', 'Engine Room', 0.2450, 0.5600, 3.68430000, 98.70410000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(7, 'water_treatment', 'CP-07', 'Water Treatment', 'Raw Water Treatment', 0.6500, 0.4600, 3.68390000, 98.70470000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(8, 'kernel_station', 'CP-08', 'Kernel Station', 'Kernel Plant', 0.3520, 0.5600, 3.68420000, 98.70440000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(9, 'clarification', 'CP-09', 'Clarification', 'Oil Clarification Room', 0.4800, 0.5600, 3.68405000, 98.70450000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(15, 'grading_ramp', NULL, 'Grading Ramp', 'Grading Ramp', 0.5020, 0.8800, 3.68395000, 98.70455000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(17, 'threshing', NULL, 'Threshing Station', 'Threshing Station', 0.5200, 0.4400, 3.68402000, 98.70458000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(18, 'efb_plant', NULL, 'EFB Plant', 'EFB Plant', 0.6100, 0.4400, 3.68392000, 98.70478000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(19, 'press_station', NULL, 'Press Station', 'Press Station', 0.4200, 0.4800, 3.68415000, 98.70435000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(20, 'anaerobic_pond', NULL, 'Anaerobic Pond', 'Effluent Treatment', 0.7800, 0.3200, 3.68340000, 98.70520000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(21, 'aerobic_pond', NULL, 'Aerobic Pond', 'Effluent Treatment', 0.8500, 0.3200, 3.68320000, 98.70535000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(22, 'effluent', NULL, 'Final Discharge', 'Effluent Treatment', 0.9200, 0.3200, 3.68305000, 98.70548000, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
