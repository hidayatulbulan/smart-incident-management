-- phpMyAdmin SQL Dump
-- version 5.0.4
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 24 Feb 2026 pada 03.48
-- Versi server: 10.4.16-MariaDB
-- Versi PHP: 7.4.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `smartincident`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `incidents`
--

CREATE TABLE `incidents` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `type` varchar(100) DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `priority` varchar(50) DEFAULT 'Medium',
  `description` text DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `recommendation` text DEFAULT NULL,
  `status` varchar(50) DEFAULT 'open',
  `admin_note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `assigned_to` int(11) DEFAULT NULL,
  `solver_note` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data untuk tabel `incidents`
--

INSERT INTO `incidents` (`id`, `user_id`, `title`, `type`, `category`, `priority`, `description`, `location`, `photo`, `recommendation`, `status`, `admin_note`, `created_at`, `updated_at`, `assigned_to`, `solver_note`) VALUES
(4, 2, 'Ac Ruang 302 Rusak', NULL, 'facilities', 'Low', 'ac tidak dingin', 'Gedung A, Lantai 2', '1771508627203-246540560.png', NULL, 'closed', NULL, '2026-02-19 13:43:47', '2026-02-20 05:47:06', NULL, NULL),
(5, 2, 'testt', NULL, 'it', 'Low', 'testtttttttttttttttttttttt', 'testttttttttttttttttt', '1771516215360-825495120.png', NULL, 'open', NULL, '2026-02-19 15:50:15', '2026-02-20 07:10:51', NULL, NULL),
(6, 2, 'Server down', NULL, 'it', 'High', 'server tidak bisa diakses', 'Gedung B lantai 3', '1771580329808-640345869.jpg', NULL, 'open', NULL, '2026-02-20 09:38:49', '2026-02-20 09:38:49', NULL, NULL),
(7, 2, 'lampu padam', NULL, 'facilities', 'Low', 'lampu padam', 'gedung ab', '1771581334262-765472528.jpeg', NULL, 'progress', NULL, '2026-02-20 09:55:34', '2026-02-20 09:56:32', NULL, NULL);

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `profile_photo` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `created_at`, `updated_at`, `profile_photo`) VALUES
(1, 'Admin', 'admin@gmail.com', '$2b$10$wY3HkSaDVnSqM2VdPT8hC.NcdyWiU75MGkv.eAS3o8VJ7G4/oEpf.', 'admin', '2026-02-19 12:58:22', '2026-02-19 12:58:22', NULL),
(2, 'bulan', 'bulan@gmail.com', '$2b$10$AlXPQ86koZFPMd1UAHgqRuV7ZK1DDo8vuxFS/0YXgol.8JtmtmEVC', 'user', '2026-02-19 13:41:59', '2026-02-19 13:41:59', NULL),
(3, 'Solver', 'solver@gmail.com', '$2b$10$q6jSlCzJFW0heg994aAGQesVBnsa2.dAh8hzDJYFDoiPjJTIdKMhi', '', '2026-02-23 14:39:18', '2026-02-23 14:44:48', NULL);

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `incidents`
--
ALTER TABLE `incidents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `assigned_to` (`assigned_to`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `incidents`
--
ALTER TABLE `incidents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT untuk tabel `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `incidents`
--
ALTER TABLE `incidents`
  ADD CONSTRAINT `incidents_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `incidents_ibfk_2` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
