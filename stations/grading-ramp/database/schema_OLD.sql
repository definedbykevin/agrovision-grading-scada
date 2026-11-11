-- ═══════════════════════════════════════════════════════════════════════
-- DATABASE TEMPLATE FOR STATION: agrovision_grading_ramp
-- Replace grading_ramp with the station slug (e.g. sterilizer, threshing)
-- ═══════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `agrovision_grading_ramp`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `agrovision_grading_ramp`;

-- ── DB Users (Application-Level access) ──
CREATE USER IF NOT EXISTS 'kip_station_user'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON agrovision_grading_ramp.* TO 'kip_station_user'@'localhost';
FLUSH PRIVILEGES;

-- ─────────────────────────────────────────────────────────────
-- 1. Threshold Settings (Alarm Limits)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `threshold_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `parameter_key` VARCHAR(100) NOT NULL UNIQUE, -- e.g. STERI_press, STERI_temp
  `lower_val` DOUBLE DEFAULT 0,
  `warning_val` DOUBLE DEFAULT 50,
  `danger_val` DOUBLE DEFAULT 80,
  `unit` VARCHAR(20) DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 2. Logsheet Entries (Manual input via form, JSON field for flexibility)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `logsheet_entries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `shift` ENUM('1','2','3') NOT NULL,
  `log_date` DATE NOT NULL,
  `operator_id` INT NOT NULL,
  `operator_name` VARCHAR(100) NOT NULL,
  `data_json` JSON NOT NULL, -- Flexible parameters per station
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_date_shift` (`log_date`, `shift`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 3. Station Event / Alarm Logs (Specific to this station)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `station_event_logs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `tag_name` VARCHAR(150) NOT NULL,
  `old_value` VARCHAR(255) DEFAULT NULL,
  `new_value` VARCHAR(255) DEFAULT NULL,
  `quality` VARCHAR(50) DEFAULT 'GOOD',
  `severity` ENUM('INFO','WARNING','ALARM') DEFAULT 'INFO',
  `source` VARCHAR(50) DEFAULT 'PLC',
  `timestamp` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  `shift` VARCHAR(10) DEFAULT NULL,
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_severity` (`severity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
