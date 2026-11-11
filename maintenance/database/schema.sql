-- ═══════════════════════════════════════════════════════════════════════
-- DATABASE: agrovision_maintenance
-- Owner Service: maintenance (port 3200)
-- Domain       : Machinery, Spare Parts, Inventory, Schedules, Documents
-- Mill         : KIP
-- ═══════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `agrovision_maintenance`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `agrovision_maintenance`;

-- ── DB Users ──
CREATE USER IF NOT EXISTS 'kip_maintenance'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
CREATE USER IF NOT EXISTS 'kip_reporting_ro'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';

-- ─────────────────────────────────────────────────────────────
-- Machinery Registry (daftar mesin dengan QR code)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `maintenance_machines` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `qr_token` varchar(100) DEFAULT NULL COMMENT 'UUID for QR code scan',
  `station_name` varchar(100) NOT NULL,
  `machine_name` varchar(100) NOT NULL,
  `category` varchar(50) NOT NULL DEFAULT 'spare-part',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_service` date DEFAULT NULL,
  `status` enum('optimal','warning','breakdown') DEFAULT 'optimal',
  PRIMARY KEY (`id`),
  UNIQUE KEY `qr_token` (`qr_token`),
  KEY `idx_mm_station` (`station_name`),
  KEY `idx_mm_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- Spare Part & Material Inventory
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `maintenance_inventory` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `item_name` varchar(150) NOT NULL,
  `category` enum('spare-part','og','calibration') NOT NULL,
  `stock_qty` int(11) DEFAULT 0,
  `unit` varchar(20) DEFAULT 'PCS',
  `min_stock` int(11) DEFAULT 5 COMMENT 'Alert saat stock < min_stock',
  `unit_price` decimal(15,2) DEFAULT NULL,
  `last_update` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `item_name` (`item_name`),
  KEY `idx_mi_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- Work Order / Maintenance Log
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `maintenance_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `machine_id` int(11) NOT NULL,
  `work_type` varchar(50) NOT NULL COMMENT 'PM|CM|Inspection',
  `description` text NOT NULL,
  `technician_name` varchar(100) DEFAULT NULL,
  `parts_used` longtext DEFAULT NULL COMMENT 'JSON array of parts used',
  `work_date` datetime DEFAULT current_timestamp(),
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `approved_by` varchar(100) DEFAULT NULL,
  `approval_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ml_machine` (`machine_id`),
  KEY `idx_ml_work_type` (`work_type`),
  KEY `idx_ml_date` (`work_date`),
  CONSTRAINT `fk_ml_machine` FOREIGN KEY (`machine_id`) REFERENCES `maintenance_machines` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- Machine Parts (parts yang terpasang di mesin tertentu)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `maintenance_parts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `machine_id` int(11) NOT NULL,
  `part_name` varchar(150) NOT NULL,
  `category` enum('spare-part','og','calibration') DEFAULT 'spare-part',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_mp_machine` (`machine_id`),
  CONSTRAINT `fk_mp_machine` FOREIGN KEY (`machine_id`) REFERENCES `maintenance_machines` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- PM Schedule (Preventive Maintenance)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `maintenance_schedules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `machine_id` int(11) NOT NULL,
  `category` varchar(50) NOT NULL,
  `task_name` varchar(200) NOT NULL,
  `frequency_days` int(11) NOT NULL,
  `next_due_date` date NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_ms_machine` (`machine_id`),
  KEY `idx_ms_due_date` (`next_due_date`),
  CONSTRAINT `fk_ms_machine` FOREIGN KEY (`machine_id`) REFERENCES `maintenance_machines` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- Documents & Manuals
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `maintenance_documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `machine_id` int(11) DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `doc_type` enum('manual','sop','drawing') NOT NULL,
  `file_url` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_md_machine` (`machine_id`),
  CONSTRAINT `fk_md_machine` FOREIGN KEY (`machine_id`) REFERENCES `maintenance_machines` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ── GRANT ──
GRANT ALL PRIVILEGES ON agrovision_maintenance.* TO 'kip_maintenance'@'localhost';
GRANT SELECT ON agrovision_maintenance.maintenance_logs TO 'kip_reporting_ro'@'localhost';
GRANT SELECT ON agrovision_maintenance.maintenance_schedules TO 'kip_reporting_ro'@'localhost';
FLUSH PRIVILEGES;
