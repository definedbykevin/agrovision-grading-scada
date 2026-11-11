-- ═══════════════════════════════════════════════════════════════════════
-- DATABASE 1: agrovision_auth & agrovision_config
-- Owner Service: main-service
-- Domain       : IAM & System Configuration
-- Mill         : KIP
-- ═══════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

-- ─────────────────────────────────────────────────────────────
-- 1. Database Auth (agrovision_auth)
-- ─────────────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS `agrovision_auth`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `agrovision_auth`;

CREATE USER IF NOT EXISTS 'kip_auth'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
CREATE USER IF NOT EXISTS 'kip_reporting_ro'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';

CREATE TABLE IF NOT EXISTS `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `roles` (`id`, `name`, `description`) VALUES
(1, 'admin',      'Administrator with full access'),
(2, 'supervisor', 'Supervisor access'),
(3, 'operator',   'Operator access'),
(4, 'developer',  'Developer by PT Premier Engineering Indonesia');

CREATE TABLE IF NOT EXISTS `permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `slug` varchar(100) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `permissions` (`id`, `slug`, `name`, `description`) VALUES
(1, 'view_dashboard',   'View Dashboard',       'Ability to view live monitoring data'),
(2, 'control_plc',      'Control PLC',          'Ability to send commands to PLC'),
(3, 'manage_users',     'Manage Users',         'Ability to create and edit user accounts'),
(4, 'maintenance_edit', 'Edit Maintenance',     'Ability to update maintenance logs'),
(5, 'view_reports',     'View Reports',         'Ability to view reports'),
(6, 'manage_settings',  'Manage Settings',      'Ability to change system settings'),
(7, 'logsheet_input',   'Logsheet Input',       'Ability to submit logsheet forms'),
(8, 'grading_review',   'Grading Review',       'Ability to review AI grading results');

CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `fk_rp_permission` (`permission_id`),
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),
(4,1),(4,2),(4,3),(4,4),(4,5),(4,6),(4,7),(4,8),
(2,1),(2,5),(2,7),(2,8),
(3,1),(3,7);

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` varchar(191) NOT NULL,
  `password_hash` varchar(191) NOT NULL,
  `position_title` varchar(100) NOT NULL DEFAULT '',
  `company_name` varchar(150) NOT NULL DEFAULT '',
  `role_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `fk_users_role` (`role_id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `users` (`id`, `username`, `password_hash`, `position_title`, `company_name`, `role_id`) VALUES
(1, 'admin',      '$2b$10$IRLIiDmSbvV3qFXoYvWb1utzorHkhaeQaW2b1hw1k8iXevAZlB6wO', 'System Administrator',     'AgroVision Internal',                  1),
(2, 'premier',    '$2b$10$IRLIiDmSbvV3qFXoYvWb1utzorHkhaeQaW2b1hw1k8iXevAZlB6wO', 'Premier Engineering',       'PT Premier Engineering Indonesia', 1),
(3, 'operator',   '$2b$10$IRLIiDmSbvV3qFXoYvWb1utzorHkhaeQaW2b1hw1k8iXevAZlB6wO', 'Station Operator',          'Smart Oil Mill',                   3),
(4, 'supervisor', '$2b$10$IRLIiDmSbvV3qFXoYvWb1utzorHkhaeQaW2b1hw1k8iXevAZlB6wO', 'Shift Supervisor',          'Smart Oil Mill',                   2),
(5, 'dev',        '$2b$10$IRLIiDmSbvV3qFXoYvWb1utzorHkhaeQaW2b1hw1k8iXevAZlB6wO', 'Lead Developer',            'PT Premier Engineering Indonesia', 4);

CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` varchar(128) NOT NULL,
  `expires` int(10) UNSIGNED NOT NULL,
  `data` mediumtext DEFAULT NULL,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `username` varchar(191) DEFAULT NULL,
  `activity_type` enum('login','setting_change','logsheet','maintenance','plc_command') NOT NULL,
  `description` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_al_user` (`user_id`),
  KEY `idx_al_type` (`activity_type`),
  KEY `idx_al_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 2. Database Config (agrovision_config)
-- ─────────────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS `agrovision_config`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `agrovision_config`;

CREATE USER IF NOT EXISTS 'kip_config'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';

CREATE TABLE IF NOT EXISTS `mills` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(10) NOT NULL COMMENT 'AV-01|AV-02|AV-03|AV-04',
  `name` varchar(100) NOT NULL,
  `location` varchar(200) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `mills` (`id`, `code`, `name`, `location`) VALUES
(1, 'AV-01', 'AgroVision Mill Alpha', 'Industrial Estate Zone A'),
(2, 'AV-02', 'AgroVision Mill Beta',  'Industrial Estate Zone B'),
(3, 'AV-03', 'AgroVision Mill Gamma', 'Industrial Estate Zone C'),
(4, 'AV-04', 'AgroVision Mill Delta', 'Industrial Estate Zone D');

CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `setting_group` varchar(50) DEFAULT 'general' COMMENT 'notification|shift|display|plc',
  `description` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_by` varchar(191) DEFAULT NULL,
  PRIMARY KEY (`setting_key`),
  KEY `idx_ss_group` (`setting_group`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `system_settings` (`setting_key`, `setting_value`, `setting_group`, `description`) VALUES
('mill_name',              'AgroVision Mill Alpha',               'general',      'Display name of this mill'),
('mill_id',                'AV-01',                               'general',      'Mill code identifier'),
('mill_timezone',          'Asia/Jakarta',                         'general',      'Timezone for timestamp display'),
('shift_config',           '{"A":{"start":7,"end":15},"B":{"start":15,"end":23},"C":{"start":23,"end":7}}', 'shift', 'Shift schedule JSON'),
('shift_duration_hours',   '8',                                    'shift',        'Hours per shift'),
('notif_enabled',          '0',                                    'notification', '1=enabled 0=disabled'),
('notif_severity_level',   'ALARM',                                'notification', 'Minimum severity to notify: INFO|WARNING|ALARM'),
('notif_telegram_token',   '',                                     'notification', 'Telegram bot token'),
('notif_telegram_chatid',  '',                                     'notification', 'Comma-separated Telegram chat IDs'),
('notif_email_user',       '',                                     'notification', 'SMTP email user'),
('notif_email_pass',       '',                                     'notification', 'SMTP email password (encrypted)'),
('notif_email_target',     '',                                     'notification', 'Target email address'),
('notif_email_smtp',       'smtp.gmail.com',                       'notification', 'SMTP server host'),
('notif_email_port',       '587',                                  'notification', 'SMTP port'),
('plc_poll_interval_ms',   '200',                                  'plc',          'PLC polling interval in milliseconds'),
('plc_reconnect_delay_s',  '5',                                    'plc',          'Seconds to wait before PLC reconnect'),
('plc_heartbeat_interval_ms','300000',                             'plc',          'Heartbeat log interval (5 min default)'),
('dashboard_refresh_ms',   '1000',                                 'display',      'Frontend dashboard refresh rate'),
('data_retention_days',    '90',                                   'display',      'Days to retain time-series PLC data'),
('event_retention_days',   '180',                                  'display',      'Days to retain station event logs');

-- ── Station Registry (plug-and-play lock/unlock) ──
CREATE TABLE IF NOT EXISTS `station_registry` (
  `slug`          VARCHAR(50) NOT NULL,
  `title`         VARCHAR(100) NOT NULL,
  `tag_prefixes`  JSON DEFAULT NULL,
  `db_name`       VARCHAR(100) DEFAULT NULL,
  `port`          INT DEFAULT NULL,
  `is_active`     TINYINT(1) DEFAULT 1 COMMENT '1=unlocked, 0=locked',
  `sort_order`    INT DEFAULT 0,
  `created_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `station_registry` (`slug`, `title`, `tag_prefixes`, `db_name`, `port`, `is_active`, `sort_order`) VALUES
('security',           'Security',             '["SEC_"]',         'agrovision_security',           3101, 0, 1),
('weighbridge',       'Weighbridge',           '["WEIGH_"]',       'agrovision_weighbridge',        3102, 0, 2),
('grading-ramp',      'Grading Ramp',          '["GRADING_"]',     'agrovision_grading_ramp',       3103, 0, 3),
('loading-ramp',      'Loading Ramp',          '["LOADING_"]',     'agrovision_loading_ramp',       3104, 0, 4),
('sterilizer',        'Sterilizer Station',    '["STERI_"]',       'agrovision_sterilizer',         3105, 1, 5),
('threshing',         'Threshing Station',     '["THRESH_"]',      'agrovision_threshing',          3106, 1, 6),
('efb-plant',         'EFB Plant',             '["EFB_"]',         'agrovision_efb_plant',          3107, 0, 7),
('press',             'Press Station',         '["PRESS_"]',       'agrovision_press',              3108, 1, 8),
('kernel-plant',      'Kernel Plant',          '["KERNEL_"]',      'agrovision_kernel_plant',       3109, 1, 9),
('oil-clarification', 'Oil Clarification Room','["CLAR_"]',        'agrovision_oil_clarification',  3110, 0, 10),
('boiler-house',      'Boiler House',          '["BOILER_"]',      'agrovision_boiler_house',       3111, 1, 11),
('engine-room',       'Engine Room',           '["ENGINE_"]',      'agrovision_engine_room',        3112, 1, 12),
('raw-water-treatment','Raw Water Treatment',  '["WATER_"]',       'agrovision_raw_water_treatment',3113, 0, 13),
('daf-osr',           'DAF / OSR',             '["DAF_"]',         'agrovision_daf_osr',            3114, 0, 14),
('cmrs',              'CMRS',                  '["CMRS_"]',        'agrovision_cmrs',               3115, 0, 15),
('effluent-treatment','Effluent Treatment',    '["EFFLUENT_"]',    'agrovision_effluent_treatment', 3116, 0, 16);

SET FOREIGN_KEY_CHECKS = 1;

-- ── GRANTs ──
GRANT ALL PRIVILEGES ON agrovision_auth.* TO 'kip_auth'@'localhost';
GRANT SELECT ON agrovision_auth.users TO 'kip_reporting_ro'@'localhost';
GRANT ALL PRIVILEGES ON agrovision_config.* TO 'kip_config'@'localhost';
GRANT SELECT ON agrovision_config.system_settings TO 'kip_reporting_ro'@'localhost';
GRANT SELECT ON agrovision_config.station_registry TO 'kip_reporting_ro'@'localhost';
GRANT SELECT ON agrovision_config.station_registry TO 'kip_realtime'@'localhost';
GRANT SELECT ON agrovision_config.mills TO 'kip_reporting_ro'@'localhost';
FLUSH PRIVILEGES;
