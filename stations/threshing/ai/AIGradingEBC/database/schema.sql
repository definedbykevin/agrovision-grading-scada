CREATE DATABASE IF NOT EXISTS `agrovision_threshing_ai_ebc` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `agrovision_threshing_ai_ebc`;

CREATE TABLE IF NOT EXISTS `ebc_detections` (
 `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `line_no` SMALLINT UNSIGNED NOT NULL, `camera_code` VARCHAR(64) NOT NULL,
 `category` ENUM('USB','PSB','EB') NOT NULL, `confidence` DECIMAL(6,5) NOT NULL, `bounding_box_json` JSON DEFAULT NULL,
 `model_version` VARCHAR(100) DEFAULT NULL, `detected_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`),
 KEY `idx_ebc_detection_line_time` (`line_no`,`detected_at`), KEY `idx_ebc_detection_category_time` (`category`,`detected_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ebc_decision_history` (
 `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `line_no` SMALLINT UNSIGNED NOT NULL, `camera_code` VARCHAR(64) NOT NULL,
 `window_started_at` DATETIME(3) NOT NULL, `window_ended_at` DATETIME(3) NOT NULL, `usb_count` INT UNSIGNED NOT NULL DEFAULT 0,
 `psb_count` INT UNSIGNED NOT NULL DEFAULT 0, `eb_count` INT UNSIGNED NOT NULL DEFAULT 0, `total_count` INT UNSIGNED NOT NULL DEFAULT 0,
 `majority_category` ENUM('USB','PSB','EB','INSUFFICIENT_DATA') NOT NULL, `majority_percentage` DECIMAL(6,3) NOT NULL DEFAULT 0,
 `recommended_action_code` VARCHAR(64) DEFAULT NULL, `recommended_action_name` VARCHAR(160) DEFAULT NULL,
 `action_parameters_json` JSON DEFAULT NULL, `model_version` VARCHAR(100) DEFAULT NULL,
 `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`), KEY `idx_ebc_history_line_time` (`line_no`,`window_ended_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ebc_line_results` (
 `line_no` SMALLINT UNSIGNED NOT NULL, `camera_code` VARCHAR(64) NOT NULL, `window_started_at` DATETIME(3) NOT NULL,
 `window_ended_at` DATETIME(3) NOT NULL, `usb_count` INT UNSIGNED NOT NULL DEFAULT 0, `psb_count` INT UNSIGNED NOT NULL DEFAULT 0,
 `eb_count` INT UNSIGNED NOT NULL DEFAULT 0, `total_count` INT UNSIGNED NOT NULL DEFAULT 0,
 `majority_category` ENUM('USB','PSB','EB','INSUFFICIENT_DATA') NOT NULL DEFAULT 'INSUFFICIENT_DATA',
 `majority_percentage` DECIMAL(6,3) NOT NULL DEFAULT 0, `recommended_action_code` VARCHAR(64) DEFAULT NULL,
 `recommended_action_name` VARCHAR(160) DEFAULT NULL, `action_parameters_json` JSON DEFAULT NULL,
 `decision_status` ENUM('READY','INSUFFICIENT_DATA','CAMERA_OFFLINE','MODEL_OFFLINE') NOT NULL DEFAULT 'INSUFFICIENT_DATA',
 `model_version` VARCHAR(100) DEFAULT NULL, `result_version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
 `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), PRIMARY KEY (`line_no`),
 KEY `idx_ebc_result_status` (`decision_status`,`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE OR REPLACE VIEW `v_threshing_ebc_process_input` AS
SELECT `line_no`,`camera_code`,`usb_count`,`psb_count`,`eb_count`,`total_count`,`majority_category`,`majority_percentage`,
 `recommended_action_code`,`recommended_action_name`,`action_parameters_json`,`decision_status`,`model_version`,`result_version`,`updated_at`
FROM `ebc_line_results`;
