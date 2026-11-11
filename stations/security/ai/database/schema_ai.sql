-- ═══════════════════════════════════════════════════════════════════════
-- DATABASE TEMPLATE FOR STATION AI: agrovision_security_ai (POSTGRESQL)
-- ═══════════════════════════════════════════════════════════════════════
-- Database khusus terisolasi untuk Modul AI Stasiun Security di PostgreSQL.
-- Menampung log deteksi 5 fitur AI Vision (APD, FIRE, HUMAN, LPR, OILDISPATCH),
-- konfigurasi kamera RTSP, area ROI, dan telemetry.

-- Ensure database exists (Run in psql client / DBeaver):
-- CREATE DATABASE agrovision_security_ai;

-- ─────────────────────────────────────────────────────────────
-- 1. CCTV RTSP Stream Configurations
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_ai_cctv_configs (
  id SERIAL PRIMARY KEY,
  camera_code VARCHAR(50) NOT NULL UNIQUE,          -- e.g. CAM_101, CAM_SECURITY_01
  camera_name VARCHAR(100) NOT NULL,                 -- e.g. CCTV Pos Security Gate 1
  station_slug VARCHAR(50) NOT NULL,                -- e.g. security, weighbridge, sterilizer, etc.
  rtsp_url VARCHAR(255) NOT NULL,                    -- e.g. rtsp://user:pass@10.0.0.10:554/live
  stream_fps INT DEFAULT 15,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- 2. Region of Interest (ROI) Configurations
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_ai_roi_configs (
  id SERIAL PRIMARY KEY,
  camera_code VARCHAR(50) NOT NULL,
  roi_name VARCHAR(100) NOT NULL,
  roi_type VARCHAR(50) NOT NULL,                     -- e.g. APD_ZONE, FIRE_ZONE, HUMAN_ZONE, LPR_ZONE, OILDISPATCH_ZONE
  coordinates_json TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (camera_code) REFERENCES security_ai_cctv_configs(camera_code) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────
-- 3. AI Master Detection Logs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_ai_detection_logs (
  id BIGSERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,                      -- APD, FIRE, HUMAN, LPR, OILDISPATCH
  camera_code VARCHAR(50) NOT NULL,
  camera_name VARCHAR(100) DEFAULT NULL,
  station_slug VARCHAR(50) NOT NULL,
  plate_no VARCHAR(50) DEFAULT NULL,                 -- Plate No for LPR, NULL for others
  detection_detail VARCHAR(255) DEFAULT NULL,        -- Detection message
  confidence_score REAL DEFAULT NULL,                 -- Confidence float (0.00 - 1.00)
  bounding_box_json JSONB DEFAULT NULL,
  snapshot_path VARCHAR(255) DEFAULT NULL,          -- Relative snapshot path (/snapshots/...)
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- 4. Feature Specific Telemetry Sub-tables
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_ai_apd_logs (
  id BIGSERIAL PRIMARY KEY,
  camera_code VARCHAR(50) NOT NULL,
  camera_name VARCHAR(100) DEFAULT NULL,
  station_slug VARCHAR(50) NOT NULL,
  detection_detail VARCHAR(255) DEFAULT NULL,
  snapshot_path VARCHAR(255) DEFAULT NULL,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_ai_fire_logs (
  id BIGSERIAL PRIMARY KEY,
  camera_code VARCHAR(50) NOT NULL,
  camera_name VARCHAR(100) DEFAULT NULL,
  station_slug VARCHAR(50) NOT NULL,
  detection_detail VARCHAR(255) DEFAULT NULL,
  snapshot_path VARCHAR(255) DEFAULT NULL,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_ai_human_logs (
  id BIGSERIAL PRIMARY KEY,
  camera_code VARCHAR(50) NOT NULL,
  camera_name VARCHAR(100) DEFAULT NULL,
  station_slug VARCHAR(50) NOT NULL,
  detection_detail VARCHAR(255) DEFAULT NULL,
  snapshot_path VARCHAR(255) DEFAULT NULL,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_ai_lpr_logs (
  id BIGSERIAL PRIMARY KEY,
  camera_code VARCHAR(50) NOT NULL,
  camera_name VARCHAR(100) DEFAULT NULL,
  station_slug VARCHAR(50) NOT NULL,
  plate_no VARCHAR(50) DEFAULT NULL,
  detection_detail VARCHAR(255) DEFAULT NULL,
  snapshot_path VARCHAR(255) DEFAULT NULL,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_ai_oildispatch_logs (
  id BIGSERIAL PRIMARY KEY,
  camera_code VARCHAR(50) NOT NULL,
  camera_name VARCHAR(100) DEFAULT NULL,
  station_slug VARCHAR(50) NOT NULL,
  detection_detail VARCHAR(255) DEFAULT NULL,
  snapshot_path VARCHAR(255) DEFAULT NULL,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_ai_recommendations (
  id BIGSERIAL PRIMARY KEY,
  station_slug VARCHAR(50) NOT NULL,
  recommendation_type VARCHAR(50) NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  action_payload_json JSONB DEFAULT NULL,
  is_applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);