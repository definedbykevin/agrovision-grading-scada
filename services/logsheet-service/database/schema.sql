-- ═══════════════════════════════════════════════════════════════════════
-- DATABASE 5: agrovision_logsheet
-- Owner Service: logsheet-service (port 3005)
-- Domain       : Manual Operator Logsheet Input
-- Mill         : KIP
-- ═══════════════════════════════════════════════════════════════════════
-- Import: mysql -u root -p < database/agrovision_logsheet.sql
-- ═══════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `agrovision_logsheet`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `agrovision_logsheet`;

-- ── DB Users ──
CREATE USER IF NOT EXISTS 'kip_logsheet'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
CREATE USER IF NOT EXISTS 'kip_reporting_ro'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';

-- ─────────────────────────────────────────────────────────────
-- Logsheet Entries
-- Diisi manual oleh operator per shift per stasiun.
-- data_json berisi form fields yang bervariasi per stasiun.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `logsheet_entries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `station` varchar(100) NOT NULL COMMENT 'THRESHING|PRESS|BOILER|KLARIFIKASI|KERNEL',
  `shift` enum('A','B','C') NOT NULL,
  `log_date` date NOT NULL,
  `operator_id` int(10) UNSIGNED DEFAULT NULL COMMENT 'FK ke agrovision_auth.users (app-level only)',
  `operator_name` varchar(191) DEFAULT NULL,
  `data_json` longtext DEFAULT NULL COMMENT 'JSON: { "field": value, ... }',
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_le_station_date` (`station`,`log_date`),
  KEY `idx_le_shift` (`shift`),
  KEY `idx_le_operator` (`operator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- Logsheet Template (definisi form fields per station)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `logsheet_templates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `station` varchar(100) NOT NULL,
  `field_key` varchar(50) NOT NULL,
  `field_label` varchar(100) NOT NULL,
  `field_type` enum('number','text','select','boolean') NOT NULL DEFAULT 'number',
  `unit` varchar(20) DEFAULT NULL,
  `options_json` text DEFAULT NULL COMMENT 'JSON array for select type',
  `is_required` tinyint(1) DEFAULT 1,
  `sort_order` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_station_field` (`station`,`field_key`),
  KEY `idx_lt_station` (`station`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default templates untuk stasiun KIP
INSERT INTO `logsheet_templates` (`station`, `field_key`, `field_label`, `field_type`, `unit`, `is_required`, `sort_order`) VALUES
('THRESHING', 'rpm', 'Kecepatan Drum', 'number', 'RPM', 1, 1),
('THRESHING', 'temp', 'Suhu', 'number', '°C', 1, 2),
('THRESHING', 'loading_ramp_ton', 'Tonase Loading Ramp', 'number', 'Ton', 1, 3),
('PRESS',     'pressure_bar', 'Tekanan Screw Press', 'number', 'Bar', 1, 1),
('PRESS',     'temp_press', 'Suhu Press', 'number', '°C', 1, 2),
('PRESS',     'oil_loss_pct', 'Losses Minyak', 'number', '%', 0, 3),
('BOILER',    'steam_pressure', 'Tekanan Uap', 'number', 'Bar', 1, 1),
('BOILER',    'steam_temp', 'Suhu Uap', 'number', '°C', 1, 2),
('BOILER',    'water_level_pct', 'Level Air Boiler', 'number', '%', 1, 3),
('KLARIFIKASI','cpo_temp', 'Suhu CPO', 'number', '°C', 1, 1),
('KLARIFIKASI','moisture_pct', 'Kadar Air CPO', 'number', '%', 1, 2),
('KERNEL',    'moisture_pct', 'Kadar Air Kernel', 'number', '%', 1, 1),
('KERNEL',    'kernel_loss_pct', 'Kernel Loss', 'number', '%', 0, 2);

-- ── GRANT ──
GRANT ALL PRIVILEGES ON agrovision_logsheet.* TO 'kip_logsheet'@'localhost';
GRANT SELECT ON agrovision_logsheet.logsheet_entries TO 'kip_reporting_ro'@'localhost';
FLUSH PRIVILEGES;

SELECT 'agrovision_logsheet created OK' AS status;
