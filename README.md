# Proyek WebApp Quality Control Geolog

![Vercel Deployment](https://therealsujitk-vercel-badge.vercel.app/?app=dataiku-webapp&style=for-the-badge)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

> _Update Terakhir: 20 Juni 2025_

## Deskripsi Singkat

Sebuah aplikasi web full-stack yang dirancang untuk meniru fungsionalitas aplikasi geologi seperti Geolog, dengan fokus pada proses _Quality Control_ (QC) untuk data sumur (well log). Frontend dibangun dengan Next.js untuk antarmuka yang modern dan interaktif, sementara backend menggunakan Flask (Python) untuk memproses data dan menjalankan kalkulasi yang kompleks.

## ✨ Fitur Utama

-   **Antarmuka Upload Data:** Memungkinkan pengguna untuk mengunggah file data sumur (format `.LAS`, `.CSV`, dll.) untuk dianalisis.
-   **Proses QC Otomatis:** Menjalankan skrip Python di backend untuk melakukan validasi data, seperti mengecek nilai null, nilai ekstrem, dan kelengkapan data.
-   **Visualisasi Interaktif:** Menampilkan hasil data log dan markah dalam bentuk plot interaktif menggunakan Plotly.
-   **Arsitektur Serverless:** Dideploy di Vercel, memanfaatkan _serverless functions_ untuk backend yang skalabel dan efisien.

## 🗺️ Roadmap Proyek

Proyek ini sedang dalam tahap pengembangan aktif. Berikut adalah beberapa fitur dan perbaikan yang direncanakan:

-   [x] Integrasi skrip QC dasar dengan fungsionalitas upload file.
-   [x] Visualisasi data log menggunakan Plotly.
-   [x] Implementasi arsitektur Monorepo yang bersih untuk Frontend & Backend.
-   [ ] Sistem autentikasi pengguna (misalnya menggunakan NextAuth.js).
-   [ ] Integrasi database (seperti Vercel Postgres) untuk menyimpan hasil QC dan data pengguna.
-   [ ] Penambahan unit test dan integration test untuk backend Python.
-   [ ] Pengembangan dasbor pengguna untuk melihat riwayat proses QC.

## 🛠️ Teknologi yang Digunakan

| Kategori | Teknologi |
| :--- | :--- |
| **Frontend** | ![Next.js](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white) ![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) |
| **Backend** | ![Flask](https://img.shields.io/badge/flask-%23000.svg?style=for-the-badge&logo=flask&logoColor=white) ![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54) |
| **Deployment**| ![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white) |

## 🚀 Panduan Setup Lokal (Getting Started)

Panduan ini untuk developer yang ingin menjalankan proyek ini di komputernya.

#### Prasyarat
-   [Node.js](https://nodejs.org/) (v18 atau lebih baru)
-   [Python](https://www.python.org/downloads/) (v3.9 atau lebih baru)

#### Langkah-langkah Instalasi

1.  **Clone Repository**
    ```bash
    git clone [https://github.com/MichelPT/dataiku_webapp.git](https://github.com/MichelPT/dataiku_webapp.git)
    cd dataiku_webapp
    ```

2.  **Setup Backend (Python)**
    ```bash
    # Masuk ke direktori api
    cd api

    # Buat dan aktifkan virtual environment
    python3 -m venv venv
    source venv/bin/activate  # Untuk Windows: venv\Scripts\activate

    # Install semua dependensi Python
    pip install -r requirements.txt

    # Kembali ke root direktori
    cd ..
    ```

3.  **Setup Frontend (Node.js)**
    ```bash
    # Masuk ke direktori frontend
    cd frontend

    # Install semua dependensi JavaScript
    npm install

    # Kembali ke root direktori
    cd ..
    ```

4.  **Jalankan Server Development**
    Cara terbaik adalah menggunakan `concurrently` untuk menjalankan kedua server sekaligus. Cukup jalankan satu perintah ini dari **direktori root proyek**:
    ```bash
    npm run dev
    ```
    Aplikasi frontend akan berjalan di `http://localhost:3000` dan backend di `http://localhost:5001`.

## 📂 Struktur Proyek & Konvensi Developer (TIDI)

Proyek ini menggunakan struktur **Monorepo**. Ini berarti kode frontend dan backend berada dalam satu repository untuk memudahkan pengembangan fitur secara bersamaan.

/ (Project Root)
├── api/                # Backend (Flask). Semua logika Python ada di sini.
│   ├── venv/           # Virtual Environment (diabaikan oleh Git)
│   ├── app.py          # Entrypoint Flask, hanya berisi routing API.
│   ├── modules/        # "Otak" dari backend, semua logika bisnis ada di sini.
│   └── requirements.txt
│
├── frontend/           # Frontend (Next.js). Semua yang dilihat pengguna ada di sini.
│   ├── src/
│   │   ├── app/        # Halaman dan layout (App Router).
│   │   ├── components/ # Komponen UI kecil yang bisa dipakai ulang.
│   │   └── features/   # Komponen & logic untuk fitur spesifik (mis: file-upload).
│   ├── public/
│   └── package.json
│
├── .gitignore          # Daftar file/folder yang diabaikan Git.
└── vercel.json         # Konfigurasi build & deployment untuk Vercel.


> **Aturan Emas untuk Developer:**
> 1.  **Pemisahan yang Jelas:** `frontend` hanya mengurus tampilan dan interaksi pengguna. `api` mengurus semua proses data. Keduanya hanya "berbicara" melalui API call.
> 2.  **Satu Fitur, Satu Branch:** Jika sebuah fitur membutuhkan perubahan di frontend dan backend, kerjakan keduanya di dalam **satu branch Git yang sama**.
> 3.  **Backend Modular:** Jaga `api/app.py` tetap bersih (hanya routing). Pindahkan semua logika kompleks ke dalam folder `api/modules/`.
> 4.  **Frontend Berbasis Fitur:** Kelompokkan komponen, hooks, dan utilitas yang berhubungan dengan satu fitur ke dalam satu folder di `frontend/src/features/`.

## 🌊 Alur Kerja Git & Kolaborasi

1.  **Selalu Mulai dari `main`:** Sebelum mulai, update kodemu dengan `git checkout main && git pull origin main`.
2.  **Buat Branch Baru:** Gunakan nama yang deskriptif, contoh: `feat/user-dashboard`.
3.  **Kerjakan & Commit:** Buat commit-commit kecil yang logis. Satu commit bisa berisi perubahan di frontend dan backend sekaligus.
4.  **Buat Pull Request (PR):** Jika sudah selesai, dorong branch-mu ke GitHub dan buat PR yang menargetkan `main`.
5.  **Review & Merge:** Minta anggota tim lain untuk mereview kodemu. Setelah disetujui, merge PR tersebut.
6.  **Hapus Branch:** Setelah di-merge, hapus branch fitur agar repository tetap bersih.

## 📦 Deployment

Proyek ini terhubung dengan Vercel untuk _Continuous Deployment_:
-   Setiap `push` atau `merge` ke branch `main` akan otomatis men-deploy versi produksi baru.
-   Setiap Pull Request akan membuat _Preview Deployment_ tersendiri untuk testing.

## 🤔 Troubleshooting Umum

-   **Error `Failed to fetch` saat development lokal?**
    -   **Penyebab:** Masalah CORS. Server Next.js (`:3000`) tidak bisa langsung mengakses server Flask (`:5001`).
    -   **Solusi:** Pastikan `next.config.ts` di folder `frontend` memiliki `rewrites` untuk mem-proxy request `/api/*` ke `http://127.0.0.1:5001`. Pastikan juga kode `fetch` di frontend menggunakan path relatif (contoh: `/api/run-qc`).

-   **Error `git push` ditolak karena file terlalu besar?**
    -   **Penyebab:** Folder seperti `node_modules` atau `.next` tidak sengaja ter-commit.
    -   **Solusi:** Pastikan `.gitignore` sudah benar. Gunakan `git-filter-repo` untuk membersihkan histori Git dari file-file besar tersebut, lalu lakukan `git push --force`.

## ✍️ Tim Pengembang

-   **MichelPT** - *Initial Work & Development* - [GitHub Profile](https://github.com/MichelPT)
-   **[Nama Kolaborator]** - *Development* - [Link GitHub]

## 📜 Lisensi

Didistribusikan di bawah Lisensi MIT.