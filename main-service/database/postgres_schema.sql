-- ═══════════════════════════════════════════════════════════════════════
-- PostgreSQL Schema for agrovision_main (Core Auth, Config, Registry)
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255) DEFAULT NULL
);

INSERT INTO roles (id, name, description) VALUES
(1, 'admin', 'Administrator with full access'),
(2, 'supervisor', 'Supervisor access'),
(3, 'operator', 'Operator access'),
(4, 'developer', 'Developer by PT Premier Engineering Indonesia'),
(5, 'mill_manager', 'Mill Manager with operational access'),
(6, 'general_manager', 'General Manager with operational access')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));

-- 2. Permissions
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) DEFAULT NULL
);

-- 3. Role Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 4. Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(191) NOT NULL,
  position_title VARCHAR(100) NOT NULL DEFAULT '',
  company_name VARCHAR(150) NOT NULL DEFAULT '',
  role_id INT REFERENCES roles(id) ON DELETE SET NULL,
  role VARCHAR(50) DEFAULT NULL,
  must_change_password SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. User Permissions
CREATE TABLE IF NOT EXISTS user_permissions (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, permission_id)
);

-- 6. Sessions
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) PRIMARY KEY,
  expires BIGINT NOT NULL,
  data TEXT DEFAULT NULL
);

-- 7. Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INT DEFAULT NULL,
  username VARCHAR(191) DEFAULT NULL,
  activity_type VARCHAR(50) NOT NULL,
  description TEXT DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Mills
CREATE TABLE IF NOT EXISTS mills (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  location VARCHAR(200) DEFAULT NULL,
  is_active SMALLINT DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO mills (id, code, name, location) VALUES
(1, 'AV-01', 'AgroVision Mill Alpha', 'Industrial Estate Zone A'),
(2, 'AV-02', 'AgroVision Mill Beta', 'Industrial Estate Zone B'),
(3, 'AV-03', 'AgroVision Mill Gamma', 'Industrial Estate Zone C'),
(4, 'AV-04', 'AgroVision Mill Delta', 'Industrial Estate Zone D')
ON CONFLICT (id) DO NOTHING;

-- 9. System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  setting_value TEXT DEFAULT NULL,
  setting_group VARCHAR(50) DEFAULT 'general',
  description VARCHAR(255) DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(191) DEFAULT NULL
);

INSERT INTO system_settings (setting_key, setting_value, setting_group, description) VALUES
('mill_name', 'AgroVision Mill Alpha', 'general', 'Display name of this mill'),
('mill_id', 'AV-01', 'general', 'Mill code identifier'),
('mill_timezone', 'Asia/Jakarta', 'general', 'Timezone for timestamp display'),
('shift_config', '{"A":{"start":7,"end":15},"B":{"start":15,"end":23},"C":{"start":23,"end":7}}', 'shift', 'Shift schedule JSON'),
('shift_duration_hours', '8', 'shift', 'Hours per shift'),
('dashboard_refresh_ms', '1000', 'display', 'Frontend dashboard refresh rate')
ON CONFLICT (setting_key) DO NOTHING;

-- 10. Station Registry
CREATE TABLE IF NOT EXISTS station_registry (
  slug VARCHAR(50) PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  tag_prefixes JSONB DEFAULT NULL,
  db_name VARCHAR(100) DEFAULT NULL,
  port INT DEFAULT NULL,
  is_active SMALLINT DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO station_registry (slug, title, tag_prefixes, db_name, port, is_active, sort_order) VALUES
('security', 'Security', '["SEC_"]', 'agrovision_security', 3101, 0, 1),
('weighbridge', 'Weighbridge', '["WEIGH_"]', 'agrovision_weighbridge', 3102, 0, 2),
('grading-ramp', 'Grading Ramp', '["GRADING_"]', 'agrovision_grading_ramp', 3103, 0, 3),
('loading-ramp', 'Loading Ramp', '["LOADING_"]', 'agrovision_loading_ramp', 3104, 0, 4),
('sterilizer', 'Sterilizer Station', '["STERI_"]', 'agrovision_sterilizer', 3105, 1, 5),
('threshing', 'Threshing Station', '["THRESH_"]', 'agrovision_threshing', 3106, 1, 6),
('efb-plant', 'EFB Plant', '["EFB_"]', 'agrovision_efb_plant', 3107, 0, 7),
('press', 'Press Station', '["PRESS_"]', 'agrovision_press', 3108, 1, 8),
('kernel-plant', 'Kernel Plant', '["KERNEL_"]', 'agrovision_kernel_plant', 3109, 1, 9),
('oil-clarification', 'Oil Clarification Room', '["CLAR_"]', 'agrovision_oil_clarification', 3110, 0, 10),
('boiler-house', 'Boiler House', '["BOILER_"]', 'agrovision_boiler_house', 3111, 1, 11),
('engine-room', 'Engine Room', '["ENGINE_"]', 'agrovision_engine_room', 3112, 1, 12),
('raw-water-treatment', 'Raw Water Treatment', '["WATER_"]', 'agrovision_raw_water_treatment', 3113, 0, 13),
('daf-osr', 'DAF / OSR', '["DAF_"]', 'agrovision_daf_osr', 3114, 0, 14),
('cmrs', 'CMRS', '["CMRS_"]', 'agrovision_cmrs', 3115, 0, 15),
('effluent-treatment', 'Effluent Treatment', '["EFFLUENT_"]', 'agrovision_effluent_treatment', 3116, 0, 16)
ON CONFLICT (slug) DO NOTHING;

