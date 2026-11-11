-- ═══════════════════════════════════════════════════════════════════════
-- DATABASE FOR STATION: agrovision_weighbridge (Relational Schema)
-- ═══════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `agrovision_weighbridge`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `agrovision_weighbridge`;

-- ── DB Users (Application-Level access) ──
CREATE USER IF NOT EXISTS 'kip_station_user'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON agrovision_weighbridge.* TO 'kip_station_user'@'localhost';
FLUSH PRIVILEGES;

-- ─────────────────────────────────────────────────────────────
-- 1. Weighbridge Transactions Table (Clean Relational Schema)
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS `weighbridge_transactions`;

CREATE TABLE IF NOT EXISTS `weighbridge_transactions` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `queue_id` BIGINT DEFAULT NULL COMMENT 'Relasi ke Pos Security (truck_queues.id)',
  `queue_code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Kode Tiket Antrian (contoh: U-001)',
  `scale_in_id` VARCHAR(20) DEFAULT 'SCALE_1',
  `scale_out_id` VARCHAR(20) DEFAULT 'SCALE_2',
  `gross_weight` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Berat Kotor (KG)',
  `tare_weight` DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Berat Kosong (KG)',
  `net_weight` DECIMAL(10,2) GENERATED ALWAYS AS (ABS(`gross_weight` - `tare_weight`)) STORED COMMENT 'Berat Netto Otomatis (KG)',
  `weigh_in_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `weigh_out_at` DATETIME DEFAULT NULL,
  `status` ENUM('WEIGH_IN', 'COMPLETED', 'CANCELLED') DEFAULT 'WEIGH_IN',
  `operator_name` VARCHAR(100) DEFAULT 'Operator Timbangan',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_queue_id` (`queue_id`),
  KEY `idx_queue_code` (`queue_code`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 2. Threshold Settings (Alarm Limits)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `threshold_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `parameter_key` VARCHAR(100) NOT NULL UNIQUE,
  `lower_val` DOUBLE DEFAULT 0,
  `warning_val` DOUBLE DEFAULT 50,
  `danger_val` DOUBLE DEFAULT 80,
  `unit` VARCHAR(20) DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 3. Logsheet Entries
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `logsheet_entries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `shift` ENUM('1','2','3') NOT NULL,
  `log_date` DATE NOT NULL,
  `operator_id` INT NOT NULL,
  `operator_name` VARCHAR(100) NOT NULL,
  `data_json` JSON NOT NULL,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_date_shift` (`log_date`, `shift`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- 4. Station Event / Alarm Logs
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
-- SEED SAMPLE TRANSACTIONS (Relational Sample Data)
-- ─────────────────────────────────────────────────────────────
INSERT INTO `weighbridge_transactions` 
  (`queue_id`, `queue_code`, `scale_in_id`, `scale_out_id`, `gross_weight`, `tare_weight`, `weigh_in_at`, `weigh_out_at`, `status`)
VALUES
  (1, 'U-7821', 'SCALE_1', 'SCALE_2', 28450.00, 8120.00, NOW() - INTERVAL 2 HOUR, NOW() - INTERVAL 1 HOUR, 'COMPLETED'),
  (2, 'M-7820', 'SCALE_1', 'SCALE_2', 25100.00, 7800.00, NOW() - INTERVAL 3 HOUR, NOW() - INTERVAL 2 HOUR, 'COMPLETED'),
  (3, 'C-7819', 'SCALE_1', 'SCALE_2', 32400.00, 11200.00, NOW() - INTERVAL 4 HOUR, NOW() - INTERVAL 3 HOUR, 'COMPLETED'),
  (4, 'K-7818', 'SCALE_1', 'SCALE_2', 18400.00, 6500.00, NOW() - INTERVAL 5 HOUR, NOW() - INTERVAL 4 HOUR, 'COMPLETED'),
  (5, 'S-7817', 'SCALE_1', 'SCALE_2', 22300.00, 7100.00, NOW() - INTERVAL 6 HOUR, NOW() - INTERVAL 5 HOUR, 'COMPLETED')
ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

SET FOREIGN_KEY_CHECKS = 1;
