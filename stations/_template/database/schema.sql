-- ═══════════════════════════════════════════════════════════════════════
-- DATABASE TEMPLATE FOR STATION: agrovision_{station}
-- Replace {station} with the station slug (e.g. sterilizer, threshing)
-- ═══════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `agrovision_{station}`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `agrovision_{station}`;

-- ── DB Users (Application-Level access) ──
CREATE USER IF NOT EXISTS 'kip_station_user'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON agrovision_{station}.* TO 'kip_station_user'@'localhost';
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
-- 4. PLC Device Registry
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
-- 5. Tag Map (DB address → symbolic name)
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
-- 6. Shadow Table: latest value per tag
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `plc_tag_latest` (
  `tag_id` INT PRIMARY KEY,
  `value` VARCHAR(255) NOT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_plc_tag_latest_tag` FOREIGN KEY (`tag_id`) REFERENCES `plc_tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 7. Time-Series: history of values
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `plc_tag_values` (
  `tag_id` INT NOT NULL,
  `value` VARCHAR(255) NOT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_plc_tag_values_tag_time` (`tag_id`,`timestamp`),
  CONSTRAINT `fk_plc_tag_values_tag` FOREIGN KEY (`tag_id`) REFERENCES `plc_tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 8. Command Queue: frontend → PLC
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
-- 9. Desired State: target value to reconcile
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `plc_desired_state` (
  `tag_id` INT PRIMARY KEY,
  `desired_value` VARCHAR(255) NOT NULL,
  `is_synced` TINYINT(1) NOT NULL DEFAULT 0,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_plc_desired_state_tag` FOREIGN KEY (`tag_id`) REFERENCES `plc_tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 10. Station Tag Mapping: tag_id → station/equipment/signal_key
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `station_tag_mappings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `station` VARCHAR(50) NOT NULL,
  `equipment` VARCHAR(100) NOT NULL,
  `signal_key` VARCHAR(50) NOT NULL,
  `tag_id` INT NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_station_mapping` (`station`,`equipment`,`signal_key`),
  KEY `idx_stm_station` (`station`),
  KEY `idx_stm_tag` (`tag_id`),
  CONSTRAINT `fk_stm_tag` FOREIGN KEY (`tag_id`) REFERENCES `plc_tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
