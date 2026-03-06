-- AI Knowledge Base Table
-- Jalankan script ini untuk membuat tabel knowledge_base

-- 1. Tambahkan kolom is_overdue ke tabel incidents jika belum ada
ALTER TABLE `incidents` ADD COLUMN `is_overdue` TINYINT(1) NOT NULL DEFAULT 0 AFTER `solver_note`;

-- 2. Buat tabel knowledge_base (sesuai struktur yang Anda inginkan)
CREATE TABLE IF NOT EXISTS `knowledge_base` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `incident_id` INT(11) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `problem` TEXT NOT NULL,
  `solution` TEXT NOT NULL,
  `created_by` INT(11) DEFAULT NULL,
  `is_overdue` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_incident_id` (`incident_id`),
  KEY `idx_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

