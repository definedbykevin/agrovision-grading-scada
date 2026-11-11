-- DATABASE FOR STATION: agrovision_kernel_plant
-- Domain: Kernel Plant Station - Monitoring & Logsheets

SET NAMES utf8mb4;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `agrovision_kernel_plant`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `agrovision_kernel_plant`;

-- ── DB Users (Application-Level access) ──
CREATE USER IF NOT EXISTS 'kip_station_user'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON agrovision_kernel_plant.* TO 'kip_station_user'@'localhost';

-- User untuk plc-collector (Snap7) membaca device & tag
CREATE USER IF NOT EXISTS 'kip_snap7'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
GRANT SELECT ON agrovision_kernel_plant.plc_devices TO 'kip_snap7'@'localhost';
GRANT SELECT ON agrovision_kernel_plant.plc_tags TO 'kip_snap7'@'localhost';
GRANT SELECT, INSERT, UPDATE ON agrovision_kernel_plant.plc_tag_values TO 'kip_snap7'@'localhost';
GRANT SELECT, INSERT, UPDATE ON agrovision_kernel_plant.plc_tag_latest TO 'kip_snap7'@'localhost';
GRANT SELECT, UPDATE ON agrovision_kernel_plant.plc_commands TO 'kip_snap7'@'localhost';
GRANT SELECT, INSERT, UPDATE ON agrovision_kernel_plant.plc_desired_state TO 'kip_snap7'@'localhost';
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
-- 4. PLC Devices (PLC Integration — self-contained per station)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `plc_devices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `ip_address` VARCHAR(45) NOT NULL UNIQUE,
  `rack` TINYINT NOT NULL DEFAULT 0,
  `slot` TINYINT NOT NULL DEFAULT 1,
  `status` ENUM('CONNECTED','DISCONNECTED','DISABLED') DEFAULT 'DISCONNECTED',
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `last_seen_at` DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 5. PLC Tags (address mapping)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `plc_tags` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `plc_id` INT NOT NULL,
  `db_number` INT NOT NULL,
  `byte_offset` INT NOT NULL,
  `bit_offset` INT DEFAULT NULL,
  `data_type` ENUM('BOOL','INT','DINT','REAL') NOT NULL,
  `tag_name` VARCHAR(150) NOT NULL UNIQUE,
  `access` ENUM('READ','WRITE') NOT NULL DEFAULT 'READ',
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  KEY `idx_plc_tags_plc` (`plc_id`),
  KEY `idx_plc_tags_enabled` (`enabled`),
  CONSTRAINT `fk_plc_tags_plc` FOREIGN KEY (`plc_id`) REFERENCES `plc_devices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 6. PLC Tag Latest (shadow table — nilai terkini per tag)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `plc_tag_latest` (
  `tag_id` INT PRIMARY KEY,
  `value` VARCHAR(255) NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_plc_tag_latest_tag` FOREIGN KEY (`tag_id`) REFERENCES `plc_tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 7. PLC Tag Values (time-series historis)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `plc_tag_values` (
  `tag_id` INT NOT NULL,
  `value` VARCHAR(255) NOT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_plc_tag_values_tag_time` (`tag_id`,`timestamp`),
  CONSTRAINT `fk_plc_tag_values_tag` FOREIGN KEY (`tag_id`) REFERENCES `plc_tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 8. PLC Commands (command queue: frontend → PLC)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `plc_commands` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tag_id` INT NOT NULL,
  `value` VARCHAR(255) NOT NULL,
  `status` ENUM('PENDING','SENT','DONE','ERROR','EXPIRED') NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `error_message` VARCHAR(255) DEFAULT NULL,
  KEY `idx_plc_commands_status` (`status`),
  KEY `idx_plc_commands_created` (`created_at`),
  CONSTRAINT `fk_plc_commands_tag` FOREIGN KEY (`tag_id`) REFERENCES `plc_tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 9. PLC Desired State (target nilai yang harus dicapai)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `plc_desired_state` (
  `tag_id` INT PRIMARY KEY,
  `desired_value` VARCHAR(255) NOT NULL,
  `is_synced` TINYINT(1) NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_plc_desired_state_tag` FOREIGN KEY (`tag_id`) REFERENCES `plc_tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 10. Station Tag Mappings (UI mapping to PLC tags)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `station_tag_mappings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `station` VARCHAR(50) NOT NULL,
  `equipment` VARCHAR(100) NOT NULL,
  `signal_key` VARCHAR(50) NOT NULL,
  `tag_id` INT DEFAULT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_mapping` (`station`, `equipment`, `signal_key`),
  CONSTRAINT `fk_mapping_tag` FOREIGN KEY (`tag_id`) REFERENCES `plc_tags` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
