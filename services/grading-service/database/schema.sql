-- ═══════════════════════════════════════════════════════════════════════
-- DATABASE 6: agrovision_grading
-- Owner Service: grading-service (port 3006)
-- Domain       : AI Grading / Computer Vision — FFB Classification
-- Mill         : KIP
-- ═══════════════════════════════════════════════════════════════════════
-- Import: mysql -u root -p < database/agrovision_grading.sql
-- ═══════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `agrovision_grading`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `agrovision_grading`;

-- ── DB Users ──
CREATE USER IF NOT EXISTS 'kip_grading'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
CREATE USER IF NOT EXISTS 'kip_reporting_ro'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';

-- ─────────────────────────────────────────────────────────────
-- AI Detection Results
-- Diisi oleh kamera/grading AI. Setiap row = satu tangkapan gambar.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `grading_ai` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category` enum('ripe','unripe','overripe','underripe','abnormal','empty','unknown') NOT NULL,
  `confidence` decimal(5,2) NOT NULL COMMENT 'Nilai confidence AI 0-100',
  `image_url` varchar(255) DEFAULT NULL COMMENT 'Path ke file gambar FFB',
  `camera_id` varchar(50) DEFAULT NULL,
  `reviewed_by` varchar(191) DEFAULT NULL COMMENT 'Operator yang review/koreksi',
  `reviewed_at` datetime DEFAULT NULL,
  `is_corrected` tinyint(1) DEFAULT 0 COMMENT '1 = operator sudah koreksi hasil AI',
  `corrected_category` enum('ripe','unripe','overripe','underripe','abnormal','empty','unknown') DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ga_category` (`category`),
  KEY `idx_ga_created` (`created_at`),
  KEY `idx_ga_camera` (`camera_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- Grading Session (per truk / per batch)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `grading_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_ref` varchar(50) NOT NULL COMMENT 'Nomor referensi truk/batch',
  `supplier_name` varchar(100) DEFAULT NULL,
  `total_items` int(11) DEFAULT 0,
  `ripe_count` int(11) DEFAULT 0,
  `unripe_count` int(11) DEFAULT 0,
  `overripe_count` int(11) DEFAULT 0,
  `avg_confidence` decimal(5,2) DEFAULT NULL,
  `grader_id` varchar(191) DEFAULT NULL,
  `started_at` datetime DEFAULT current_timestamp(),
  `ended_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_ref` (`session_ref`),
  KEY `idx_gs_started` (`started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── GRANT ──
GRANT ALL PRIVILEGES ON agrovision_grading.* TO 'kip_grading'@'localhost';
GRANT SELECT ON agrovision_grading.grading_ai TO 'kip_reporting_ro'@'localhost';
GRANT SELECT ON agrovision_grading.grading_sessions TO 'kip_reporting_ro'@'localhost';
FLUSH PRIVILEGES;

SELECT 'agrovision_grading created OK' AS status;
