-- ═══════════════════════════════════════════════════════════════════════
-- DATABASE: agrovision_alarm
-- Owner Service: alarm (port 3300)
-- Domain       : Aggregated Alarms & System Notifications
-- ═══════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `agrovision_alarm`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `agrovision_alarm`;

-- ── DB Users ──
CREATE USER IF NOT EXISTS 'scada_alarm'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON agrovision_alarm.* TO 'scada_alarm'@'localhost';
FLUSH PRIVILEGES;

-- ─────────────────────────────────────────────────────────────
-- Aggregated Alarm Events
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `alarm_events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL COMMENT 'ALM-XXXX',
  `category` enum('System Error','Internet Error','Instrument Error','Power Error','Breakdown','Process Disturbance') NOT NULL,
  `station` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `severity` enum('Info','Warning','Critical') NOT NULL DEFAULT 'Info',
  `status` enum('Active','Acknowledged','Resolved') NOT NULL DEFAULT 'Active',
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `acknowledged_at` timestamp NULL DEFAULT NULL,
  `acknowledged_by` varchar(100) DEFAULT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `occurrence_count` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_ae_category` (`category`),
  KEY `idx_ae_status` (`status`),
  KEY `idx_ae_severity` (`severity`),
  KEY `idx_ae_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert some initial mock/starter alarms to populate the system
INSERT INTO `alarm_events` (`code`, `category`, `station`, `description`, `severity`, `status`) VALUES
('ALM-1001', 'System Error', 'Control Room', 'PLC communication timeout — Unit 3 controller unresponsive', 'Critical', 'Active'),
('ALM-1002', 'Instrument Error', 'Sterilizer', 'TT-318 thermocouple broken wire — temperature reading invalid', 'Critical', 'Active'),
('ALM-1003', 'Process Disturbance', 'Oil Clarification', 'CPO FFA level 5.8% — exceeds 5% process specification', 'Warning', 'Active');

-- ─────────────────────────────────────────────────────────────
-- Notification Settings
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `notification_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `notification_settings` (`setting_key`, `setting_value`) VALUES
('notif_enabled', '1'),
('notif_telegram_token', 'YOUR_TELEGRAM_BOT_TOKEN'),
('notif_telegram_chatid', 'YOUR_CHAT_ID')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

SET FOREIGN_KEY_CHECKS = 1;
