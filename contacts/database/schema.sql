-- ═══════════════════════════════════════════════════════════════════════
-- DATABASE: agrovision_contacts
-- Owner Service: contacts (port 3400)
-- Domain       : Mill Personnel, Owners, & Operator Directory
-- ═══════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `agrovision_contacts`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `agrovision_contacts`;

-- ── DB Users ──
CREATE USER IF NOT EXISTS 'scada_contacts'@'localhost' IDENTIFIED BY 'CHANGE_THIS_PASSWORD';
GRANT ALL PRIVILEGES ON agrovision_contacts.* TO 'scada_contacts'@'localhost';
FLUSH PRIVILEGES;

-- ─────────────────────────────────────────────────────────────
-- Contact Directory Table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE `contacts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `role` varchar(100) NOT NULL COMMENT 'Jabatan/Peran (e.g. Mill Manager, Supervisor, Support)',
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `station` varchar(100) NOT NULL DEFAULT 'ALL' COMMENT 'Station scope, or ALL',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial contacts (Demo / White-labeled)
INSERT INTO `contacts` (`name`, `role`, `phone`, `email`, `station`) VALUES
('Ahmad Fauzi', 'Mill Manager', '081234567890', 'ahmad.fauzi@agrovision.local', 'ALL'),
('Heri Sunarko', 'Electrical Engineer', '081298765432', 'heri.sunarko@agrovision.local', 'ALL'),
('Andi Wijaya', 'Sterilizer Operator', '081345678901', 'andi.wijaya@agrovision.local', 'STERILIZER');

SET FOREIGN_KEY_CHECKS = 1;
