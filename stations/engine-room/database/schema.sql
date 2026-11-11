-- ═══════════════════════════════════════════════════════════════════════
-- DATABASE TEMPLATE FOR STATION: agrovision_engine_room
-- Replace engine_room with the station slug (e.g. sterilizer, threshing)
-- ═══════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `agrovision_engine_room`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `agrovision_engine_room`;

-- ── DB Users (Application-Level access) ──
CREATE USER IF NOT EXISTS 'kip_station_user'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON agrovision_engine_room.* TO 'kip_station_user'@'localhost';

-- ── PLC Collector User (for snap7 collector service) ──
CREATE USER IF NOT EXISTS 'kip_snap7'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
GRANT SELECT, INSERT, UPDATE ON agrovision_engine_room.* TO 'kip_snap7'@'localhost';
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

-- ─────────────────────────────────────────────────────────────
-- 4. PLC Devices (Siemens S7 PLCs)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `plc_devices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `ip_address` VARCHAR(50) NOT NULL,
  `rack` INT DEFAULT 0,
  `slot` INT DEFAULT 1,
  `enabled` TINYINT(1) DEFAULT 1,
  `status` VARCHAR(50) DEFAULT 'DISCONNECTED',
  `last_seen_at` TIMESTAMP NULL,
  `stale` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 5. PLC Tags (Memory addresses to read/write)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `plc_tags` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `plc_id` INT NOT NULL,
  `db_number` INT NOT NULL,
  `byte_offset` INT NOT NULL,
  `bit_offset` INT DEFAULT NULL,
  `data_type` ENUM('BOOL','INT','DINT','REAL') NOT NULL,
  `tag_name` VARCHAR(100) NOT NULL,
  `access` ENUM('READ','WRITE') DEFAULT 'READ',
  `enabled` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`plc_id`) REFERENCES `plc_devices`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_tag_name` (`tag_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 6. PLC Tag Latest Values (Current value for each tag)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `plc_tag_latest` (
  `tag_id` INT PRIMARY KEY,
  `value` DOUBLE,
  `quality` VARCHAR(50) DEFAULT 'GOOD',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`tag_id`) REFERENCES `plc_tags`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 7. PLC Tag Values History (Time-series data)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `plc_tag_values` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `tag_id` INT NOT NULL,
  `value` DOUBLE,
  `quality` VARCHAR(50) DEFAULT 'GOOD',
  `timestamp` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (`tag_id`) REFERENCES `plc_tags`(`id`) ON DELETE CASCADE,
  KEY `idx_tag_timestamp` (`tag_id`, `timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 8. PLC Commands (Write commands pending execution)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `plc_commands` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `tag_id` INT NOT NULL,
  `value` DOUBLE NOT NULL,
  `status` ENUM('PENDING','SENT','FAILED') DEFAULT 'PENDING',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`tag_id`) REFERENCES `plc_tags`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 9. PLC Desired State (Target values for control tags)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `plc_desired_state` (
  `tag_id` INT PRIMARY KEY,
  `desired_value` DOUBLE,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`tag_id`) REFERENCES `plc_tags`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
