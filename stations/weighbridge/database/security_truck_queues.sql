-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Aug 06, 2026 at 06:51 AM
-- Server version: 8.0.30
-- PHP Version: 8.3.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `agrovision_security`
--

-- --------------------------------------------------------

--
-- Table structure for table `security_truck_queues`
--

CREATE TABLE `security_truck_queues` (
  `id` int NOT NULL,
  `queue_code` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Kode antrian unik (contoh: Q-20260626-001)',
  `classification_code` char(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'U' COMMENT 'FK -> security_queue_classifications.code',
  `queue_date` date NOT NULL COMMENT 'Tanggal pembuatan antrian',
  `sequence_number` int NOT NULL COMMENT 'Nomor urut antrian harian',
  `driver_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nama lengkap sopir',
  `no_sim` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nomor SIM sopir',
  `license_plate` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nomor polisi kendaraan',
  `no_do` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nomor Delivery Order / Surat Jalan',
  `transporter_company` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Nama perusahaan/vendor angkutan',
  `perusahaan` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'PERUSAHAAN pada form, bisa beda dari transporter_company',
  `driver_photo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Path file foto sopir/truk dari kamera',
  `status` enum('WAITING','WEIGH_IN','GRADING','COMPLETED','CANCELLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'WAITING',
  `weigh_in_at` timestamp NULL DEFAULT NULL,
  `check_in_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu truk didaftarkan oleh satpam',
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Catatan tambahan dari satpam',
  `pending_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Diisi saat status berubah jadi PENDING',
  `registered_by` int UNSIGNED NOT NULL COMMENT 'ID Satpam yang mendaftarkan',
  `registered_by_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nama Satpam (snapshot)',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Antrian truk yang didaftarkan oleh petugas keamanan';

--
-- Dumping data for table `security_truck_queues`
--

INSERT INTO `security_truck_queues` (`id`, `queue_code`, `classification_code`, `queue_date`, `sequence_number`, `driver_name`, `no_sim`, `license_plate`, `no_do`, `transporter_company`, `perusahaan`, `driver_photo`, `status`, `weigh_in_at`, `check_in_at`, `notes`, `pending_reason`, `registered_by`, `registered_by_name`, `created_at`, `updated_at`) VALUES
(1, 'U-001', 'U', '2026-08-03', 1, 'Fahri', '12345678', 'BK 1234 AB', 'DO-12355', 'PT Tes', 'PT Tes', 'http://100.93.196.21:3101/uploads/photo-1785728150070-193938640.jpg', 'WAITING', '2026-08-03 03:42:56', '2026-08-03 03:36:09', 'Tes', NULL, 1, 'Security', '2026-08-03 03:36:09', '2026-08-06 02:45:31'),
(2, 'U-002', 'U', '2026-08-03', 2, 'Wili', '123456', 'BK 999 AK', 'D0-1234556', 'PT Tes', 'PT Tes', 'http://100.93.196.21:3101/uploads/photo-1785729639853-213182063.jpg', 'WAITING', '2026-08-05 08:48:36', '2026-08-03 04:00:51', 'Tes', NULL, 1, 'Security', '2026-08-03 04:00:51', '2026-08-06 03:08:09'),
(3, 'U-003', 'U', '2026-08-03', 3, 'Dika', '123456', 'BK 999 AB', 'D0-12233444', 'PT Tes', 'PT Tes', 'http://100.93.196.21:3101/uploads/photo-1785731050354-180689786.jpg', 'WAITING', '2026-08-03 04:57:07', '2026-08-03 04:24:51', 'Tes', NULL, 1, 'Security', '2026-08-03 04:24:51', '2026-08-06 03:08:13'),
(4, 'U-004', 'U', '2026-08-03', 4, 'Amal', '12345678', 'BK 1234 AB', 'DO-12446', 'PT Tes', 'PT Tes', 'http://100.93.196.21:3101/uploads/photo-1785731933917-351572973.jpg', 'COMPLETED', '2026-08-03 04:58:02', '2026-08-03 04:39:25', 'Tes', NULL, 1, 'Security', '2026-08-03 04:39:25', '2026-08-06 02:19:58');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `security_truck_queues`
--
ALTER TABLE `security_truck_queues`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_security_queue_code` (`queue_code`),
  ADD UNIQUE KEY `uq_stq_date_class_seq` (`queue_date`,`classification_code`,`sequence_number`),
  ADD KEY `idx_queue_date_sequence` (`queue_date`,`sequence_number`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_license_plate` (`license_plate`),
  ADD KEY `idx_stq_classification` (`classification_code`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `security_truck_queues`
--
ALTER TABLE `security_truck_queues`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `security_truck_queues`
--
ALTER TABLE `security_truck_queues`
  ADD CONSTRAINT `fk_stq_classification` FOREIGN KEY (`classification_code`) REFERENCES `security_queue_classifications` (`code`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
