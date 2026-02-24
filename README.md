SMART Incident Management System

SMART Incident Management System adalah aplikasi manajemen insiden berbasis web yang memungkinkan User melaporkan insiden, Admin mengelola dan menugaskan insiden, serta Solver menangani dan menyelesaikan insiden.

Fitur Utama

1. User
Membuat laporan insiden (foto, kategori, prioritas)
Melihat status dan riwayat laporan

2. Admin
Melihat seluruh laporan insiden
Menugaskan insiden ke solver
Monitoring melalui dashboard

3. Solver
Melihat insiden yang ditugaskan
Mengubah status (On Progress / Completed)
Menambahkan catatan penyelesaian

Teknologi

Backend: Node.js, Express.js
Frontend: HTML, CSS, Vanilla JavaScript
Database: MySQL
Auth: JWT
Penyimpanan foto: Local server (uploads)

Menjalankan Sistem 

1. Konfigurasi Environment
Buat file .env di folder backend:
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=smartincident
JWT_SECRET=your_secret_key
2. Install & Jalankan
cd backend
npm install
npm start
Akses aplikasi melalui browser:
http://localhost:3000

Akun Default (Untuk Pengecekan)
Role	Email	                    Password
Admin	admin@gmail.com             admin123
Solver	solver@gmail.com            solver123
User	bulan@gmail.com             123456

Alur Cek Sistem
Login sebagai User → buat laporan
Login sebagai Solver → tangani laporan
Login sebagai Admin → monitoring & manajemen

Catatan
File .env dan node_modules tidak disertakan di repository
File database .sql digunakan untuk menyamakan struktur saat kolaborasi
Foto insiden tersimpan di backend/uploads/incidents/