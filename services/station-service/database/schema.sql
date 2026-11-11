-- ═══════════════════════════════════════════════════════════════════════
-- DATABASE 3: agrovision_station
-- Owner Service: station-service (port 3003)
-- Domain       : Station Events, Alarms, Thresholds
-- Mill         : KIP
-- ═══════════════════════════════════════════════════════════════════════
-- NOTE: station-service subscribes Redis, evaluates thresholds, dan
--       menyimpan semua event ke tabel ini.
-- Import: mysql -u root -p < database/agrovision_station.sql
-- ═══════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `agrovision_station`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `agrovision_station`;

-- ── DB Users ──
CREATE USER IF NOT EXISTS 'kip_station'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
CREATE USER IF NOT EXISTS 'kip_reporting_ro'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';

-- ─────────────────────────────────────────────────────────────
-- Threshold Settings
-- Dikonfigurasi oleh admin melalui config-service / settings page
-- Dibaca oleh station-service untuk evaluasi alarm
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `threshold_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `station` varchar(50) NOT NULL,
  `parameter_key` varchar(50) NOT NULL,
  `lower_val` double DEFAULT 0,
  `warning_val` double DEFAULT 50,
  `danger_val` double DEFAULT 80,
  `unit` varchar(20) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_station_param` (`station`,`parameter_key`),
  KEY `idx_ts_station` (`station`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default thresholds KIP
INSERT INTO `threshold_settings` (`station`, `parameter_key`, `warning_val`, `danger_val`, `unit`) VALUES
('THRESHING', 'temperature',  65.0, 80.0, '°C'),
('THRESHING', 'speed_rpm',    450.0, 500.0, 'RPM'),
('PRESS',     'pressure_bar', 35.0, 45.0, 'Bar'),
('PRESS',     'temperature',  60.0, 75.0, '°C'),
('BOILER',    'pressure_bar', 30.0, 40.0, 'Bar'),
('BOILER',    'temperature',  160.0, 180.0, '°C'),
('KLARIFIKASI','temperature', 85.0, 95.0, '°C'),
('KERNEL',    'moisture_pct', 7.0, 9.0, '%');

-- ─────────────────────────────────────────────────────────────
-- Station Event Logs
-- Diisi otomatis oleh station-service saat nilai PLC berubah
-- atau threshold terlampaui. Append-only, auto-purge 180 hari.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `station_event_logs` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `station_name` varchar(255) NOT NULL,
  `tag_name` varchar(255) NOT NULL,
  `old_value` varchar(255) DEFAULT NULL,
  `new_value` varchar(255) DEFAULT NULL,
  `quality` varchar(50) DEFAULT 'GOOD',
  `severity` enum('INFO','WARNING','ALARM') DEFAULT 'INFO',
  `source` varchar(50) DEFAULT 'PLC_RELAY',
  `timestamp` datetime(3) DEFAULT current_timestamp(3),
  `shift` varchar(10) DEFAULT NULL,
  `mill_id` varchar(10) NOT NULL DEFAULT 'KIP',
  PRIMARY KEY (`id`),
  KEY `idx_sel_station` (`station_name`),
  KEY `idx_sel_tag` (`tag_name`),
  KEY `idx_sel_severity` (`severity`),
  KEY `idx_sel_timestamp` (`timestamp`),
  KEY `idx_sel_mill_date` (`mill_id`,`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- Auto-purge event logs > 180 hari
-- ─────────────────────────────────────────────────────────────
-- SET GLOBAL event_scheduler = ON;
-- 
-- CREATE EVENT IF NOT EXISTS `purge_old_station_event_logs`
--   ON SCHEDULE EVERY 1 DAY
--   STARTS CURRENT_TIMESTAMP
--   DO
--     DELETE FROM `station_event_logs`
--     WHERE `timestamp` < DATE_SUB(NOW(), INTERVAL 180 DAY);

SET FOREIGN_KEY_CHECKS = 1;

-- ── GRANT ──
GRANT ALL PRIVILEGES ON agrovision_station.* TO 'kip_station'@'localhost';
GRANT SELECT ON agrovision_station.station_event_logs TO 'kip_reporting_ro'@'localhost';
GRANT SELECT ON agrovision_station.threshold_settings TO 'kip_reporting_ro'@'localhost';
FLUSH PRIVILEGES;

SELECT 'agrovision_station created OK' AS status;
