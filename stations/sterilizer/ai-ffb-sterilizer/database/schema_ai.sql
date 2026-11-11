-- ═══════════════════════════════════════════════════════════════════════
-- DATABASE: agrovision_sterilizer_ai_ffb
-- MODULE: AI FFB STERILIZER STATION
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_cameras (
  id SERIAL PRIMARY KEY,
  camera_code VARCHAR(50) UNIQUE NOT NULL,
  rtsp_url TEXT NOT NULL,
  location VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  roi_redline JSONB DEFAULT '{"x1": 0, "y1": 780, "x2": 720, "y2": 780}'::jsonb,
  roi_greenline JSONB DEFAULT '{"x1": 0, "y1": 780, "x2": 720, "y2": 1280}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Note: Industrial RTSP IP Camera Profile (720x1280 Corridor Mode)
INSERT INTO ai_cameras (
  camera_code,
  rtsp_url,
  location,
  is_active,
  roi_redline,
  roi_greenline
) VALUES (
  'XNO102',
  'rtsp://admin:password@10.0.0.10:554/profile2/media.smp',
  'Inlet Sterilizer Line 1',
  TRUE,
  '{"x1": 0, "y1": 780, "x2": 720, "y2": 780}'::jsonb,
  '{"x1": 0, "y1": 780, "x2": 720, "y2": 1280}'::jsonb
)
ON CONFLICT (camera_code) DO UPDATE 
SET rtsp_url = EXCLUDED.rtsp_url,
    updated_at = CURRENT_TIMESTAMP;

-- ═══════════════════════════════════════════════════════════════════════
-- 1. TABLE: ai_models (Model Registry & Parameters)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ai_models (
  id SERIAL PRIMARY KEY,
  model_name VARCHAR(100) NOT NULL,
  model_file VARCHAR(255) NOT NULL,
  model_type VARCHAR(50) DEFAULT 'YOLO_SEGMENTATION',
  classes JSONB NOT NULL DEFAULT '{"0": "overripe", "1": "ripe", "2": "underripe"}'::jsonb,
  conf_threshold NUMERIC(4, 2) DEFAULT 0.45,
  iou_threshold NUMERIC(4, 2) DEFAULT 0.45,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO ai_models (
  model_name,
  model_file,
  model_type,
  classes,
  conf_threshold,
  iou_threshold,
  is_active
) VALUES (
  'v0.0.1_polygon_ffb_grading',
  'models/v0.0.1_polygon_ffb_grading.pt',
  'YOLO_SEGMENTATION',
  '{"0": "overripe", "1": "ripe", "2": "underripe"}'::jsonb,
  0.45,
  0.45,
  TRUE
) ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. TABLE: ai_ffb_raw_detections (Deteksi Mentahan Per-Tandan)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ai_ffb_raw_detections (
  id SERIAL PRIMARY KEY,
  cycle_code VARCHAR(100) NOT NULL,
  line_no INT NOT NULL DEFAULT 1,
  camera_code VARCHAR(50) NOT NULL DEFAULT 'XNO102',
  track_id VARCHAR(50) NOT NULL,
  class_name VARCHAR(50) NOT NULL,
  confidence NUMERIC(5, 2) NOT NULL,
  trigger_condition VARCHAR(30) DEFAULT 'NORMAL',
  has_stalk BOOLEAN DEFAULT FALSE,
  color_segar_pct NUMERIC(5, 2) DEFAULT 0,
  color_gelap_pct NUMERIC(5, 2) DEFAULT 0,
  color_ratio NUMERIC(5, 2) DEFAULT 0,
  image_path TEXT NOT NULL,
  inlet_door_status VARCHAR(20) DEFAULT 'OPEN',
  detected_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_raw_cycle ON ai_ffb_raw_detections(cycle_code);
CREATE INDEX IF NOT EXISTS idx_raw_line ON ai_ffb_raw_detections(line_no);
CREATE INDEX IF NOT EXISTS idx_raw_camera ON ai_ffb_raw_detections(camera_code);

-- ═══════════════════════════════════════════════════════════════════════
-- 3. TABLE: ai_ffb_cycle_summaries (Rekapitulasi Generate dari Mentahan)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ai_ffb_cycle_summaries (
  id SERIAL PRIMARY KEY,
  cycle_code VARCHAR(100) UNIQUE NOT NULL,
  line_no INT NOT NULL DEFAULT 1,
  camera_code VARCHAR(50) NOT NULL DEFAULT 'XNO102',
  total_bunches INT DEFAULT 0,
  ripe_count INT DEFAULT 0,
  overripe_count INT DEFAULT 0,
  underripe_count INT DEFAULT 0,
  ripe_pct NUMERIC(5, 2) DEFAULT 0,
  overripe_pct NUMERIC(5, 2) DEFAULT 0,
  underripe_pct NUMERIC(5, 2) DEFAULT 0,
  majority_category VARCHAR(50),
  majority_pct NUMERIC(5, 2) DEFAULT 0,
  recommended_recipe_name VARCHAR(100),
  recommended_recipe_code VARCHAR(100),
  status VARCHAR(20) DEFAULT 'COMPLETED',
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  duration_seconds INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_summary_cycle ON ai_ffb_cycle_summaries(cycle_code);
CREATE INDEX IF NOT EXISTS idx_summary_line ON ai_ffb_cycle_summaries(line_no);



