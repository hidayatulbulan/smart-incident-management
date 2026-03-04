# 🚨 SMART Incident Management System

SMART Incident Management System adalah **aplikasi manajemen insiden berbasis web** yang memungkinkan **User** melaporkan insiden, **Admin** mengelola dan menugaskan insiden, serta **Solver** menangani dan menyelesaikan insiden secara terstruktur.

---

## ✨ Fitur Utama

### 👤 User

* Membuat laporan insiden (foto, kategori, prioritas)
* Melihat status laporan
* Melihat riwayat laporan insiden

### 🛠️ Admin

* Melihat seluruh laporan insiden
* Menugaskan insiden ke Solver
* Monitoring insiden melalui dashboard

### 🧑‍🔧 Solver

* Melihat insiden yang ditugaskan
* Mengubah status insiden (`On Progress` / `Completed`)
* Menambahkan catatan penyelesaian

---

## 🧰 Teknologi yang Digunakan

* **Backend**: Node.js, Express.js
* **Frontend**: HTML, CSS, Vanilla JavaScript
* **Database**: MySQL
* **Authentication**: JSON Web Token (JWT)
* **Penyimpanan Foto**: Local Server (`uploads/`)

---

## ▶️ Menjalankan Sistem

### 1️⃣ Konfigurasi Environment

Buat file `.env` di folder **backend**:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=smartincident
JWT_SECRET=your_secret_key
```

---

### 2️⃣ Install & Jalankan Aplikasi

```bash
cd backend
npm install
npm start
```

---

### 3️⃣ Akses Aplikasi

Buka browser dan akses:

```
http://localhost:3000
```

---

## 🔐 Akun Default (Untuk Pengecekan)

| Role   | Email                                       | Password  |
| ------ | ------------------------------------------- | --------- |
| Admin  | [admin@gmail.com](mailto:admin@gmail.com)   | admin123  |
| Solver | [solver@gmail.com](mailto:solver@gmail.com) | solver123 |
| User   | [bulan@gmail.com](mailto:bulan@gmail.com)   | 123456    |

---

## 🔄 Alur Pengecekan Sistem

1. Login sebagai **User** → buat laporan insiden
2. Login sebagai **Solver** → tangani dan selesaikan laporan
3. Login sebagai **Admin** → monitoring dan manajemen insiden

---

## 📁 Catatan

* File `.env` dan folder `node_modules` tidak disertakan di repository
* File database `.sql` digunakan untuk menyamakan struktur database saat kolaborasi
* Foto insiden tersimpan di:

  ```
  backend/uploads/incidents/
  ```

---

📄 **SMART Incident Management System**
