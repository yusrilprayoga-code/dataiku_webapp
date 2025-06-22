# Proyek WebApp Quality Control Geolog

![Vercel Deployment](https://therealsujitk-vercel-badge.vercel.app/?app=dataiku-webapp&style=for-the-badge)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

> _Update Terakhir: 22 Juni 2025_

## Deskripsi Singkat

Sebuah aplikasi web full-stack yang dirancang untuk meniru fungsionalitas aplikasi geologi seperti Geolog, dengan fokus pada proses _Quality Control_ (QC) untuk data sumur (well log). Frontend dibangun dengan Next.js untuk antarmuka yang modern dan interaktif, sementara backend menggunakan Flask (Python) untuk memproses data dan menjalankan kalkulasi yang kompleks.

---

## 📍 Quick Navigation dengan Link

[Fitur Utama](#-fitur-utama) | [Roadmap](#️-roadmap-proyek) | [Struktur Proyek](#-struktur-proyek--konvensi-developer) | [Setup Lokal](#-panduan-setup-lokal-getting-started) | [Alur Kerja Git](#-alur-kerja-git--kolaborasi) | [Tim Pengembang](#️-tim-pengembang)

---

## ✨ Fitur Utama

-   **Antarmuka Upload Data:** Memungkinkan pengguna untuk mengunggah file data sumur (format `.LAS`, `.CSV`, dll.) untuk dianalisis.
-   **Proses QC Otomatis:** Menjalankan skrip Python di backend untuk melakukan validasi data, seperti mengecek nilai null, nilai ekstrem, dan kelengkapan data.
-   **Visualisasi Interaktif:** Menampilkan hasil data log dan markah dalam bentuk plot interaktif menggunakan Plotly.
-   **Arsitektur Serverless:** Dideploy di Vercel, memanfaatkan _serverless functions_ untuk backend yang skalabel dan efisien.

## 🗺️ Roadmap Proyek

<!-- Perubahan: Mengganti daftar statis dengan tautan ke GitHub Projects -->
Perencanaan dan status pengembangan proyek ini dikelola secara aktif menggunakan **GitHub Projects**. Anda dapat melihat tugas-tugas yang sedang dikerjakan, yang akan datang, dan yang sudah selesai secara transparan.

➡️ **[Lihat Papan Proyek Roadmap di GitHub](https://github.com/MichelPT/dataiku_webapp/projects)**

_Silakan kunjungi papan proyek untuk detail terbaru mengenai fitur dan perbaikan yang direncanakan._

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

## 📂 Struktur Proyek & Konvensi Developer

Proyek ini menggunakan struktur **Monorepo**. Ini berarti kode frontend dan backend berada dalam satu *repository* untuk memudahkan pengembangan fitur secara bersamaan.

-   `/` (Direktori Utama Proyek)
    -   **`api/` — Backend (Flask). Semua logika Python ada di sini.**
    -   **`frontend/` — Frontend (Next.js). Semua yang dilihat pengguna ada di sini.**
    -   `.gitignore` — Daftar file/folder yang diabaikan oleh Git.
    -   `vercel.json` — Konfigurasi *build* & *deployment* untuk Vercel.

## 🔎 Penjelasan Rinci Struktur Proyek

Bagian ini menjelaskan peran dari setiap direktori dan file penting.

### Direktori Level Atas

* **`api/`**

  > **Apa itu?** Folder ini berisi seluruh aplikasi backend yang ditulis dalam Python menggunakan framework Flask. Tugasnya adalah menyediakan data, menjalankan kalkulasi, dan berinteraksi dengan database atau file.

* **`frontend/`**

  > **Apa itu?** Folder ini berisi seluruh aplikasi frontend yang ditulis menggunakan Next.js (React). Semua yang berhubungan dengan tampilan, interaksi pengguna, dan visualisasi data berada di sini.

* **`.gitignore`**

  > **Apa itu?** File konfigurasi standar Git untuk menginstruksikan file atau folder mana yang tidak perlu dilacak, seperti `venv/` atau `node_modules/`.

* **`vercel.json`**

  > **Apa itu?** File konfigurasi untuk Vercel, platform hosting kita. File ini sangat penting karena ia memberi tahu Vercel bagaimana cara membangun (`build`) frontend dan backend, serta bagaimana mengarahkan permintaan (`routing`) dari pengguna ke layanan yang benar.

### Di Dalam `api/` (Backend)

* **`app.py`**

  > **Apa itu?** Entrypoint atau file utama server Flask.
  > **Apa isinya?** Hanya definisi rute-rute API (misalnya `@app.route('/api/run-qc')`).
  > **Kapan saya harus mengubahnya?** Ubah file ini **hanya** saat Anda perlu membuat *endpoint* API baru. Logika bisnis yang kompleks **tidak boleh** diletakkan di sini.

* **`modules/`**

  > **Apa itu?** "Otak" dari backend. Direktori ini berisi semua logika bisnis yang sebenarnya.
  > **Apa isinya?** Kumpulan file Python yang masing-masing berfungsi sebagai "service" untuk tugas tertentu. Contoh: `qc_service.py` untuk semua fungsi terkait Quality Control, `plotting_service.py` untuk menyiapkan data plot.
  > **Kapan saya harus mengubahnya?** Saat Anda perlu menulis atau memodifikasi fungsi untuk kalkulasi, pemrosesan data, atau logika bisnis lainnya. Inilah tempat utama Anda bekerja di backend.

* **`requirements.txt`**

  > **Apa itu?** Daftar semua *package* atau pustaka Python yang dibutuhkan oleh backend.
  > **Kapan saya harus mengubahnya?** Setiap kali Anda menginstal *package* baru (`pip install pandas`), Anda harus memperbarui file ini dengan menjalankan `pip freeze > requirements.txt` agar developer lain memiliki dependensi yang sama.

### Di Dalam `frontend/src/` (Frontend)

* **`app/`**

  > **Apa itu?** Direktori utama untuk routing di Next.js.
  > **Apa isinya?** Folder-folder yang namanya akan menjadi path URL. Di dalamnya ada file `page.tsx` yang akan dirender untuk URL tersebut.
  > **Kapan saya harus mengubahnya?** Saat Anda ingin membuat halaman baru. Ingat, file `page.tsx` di sini harus tetap "bodoh". Tugasnya hanya mengimpor komponen "View" dari `features/`. Contoh: `app/data-input/page.tsx` hanya akan me-render `<DataInputView />`.

* **`features/`**

  > **Apa itu?** **Ini adalah tempat utama Anda bekerja di frontend.** Setiap fitur aplikasi (misal: upload file, tampilan dashboard, QC) memiliki foldernya sendiri di sini.
  > **Apa isinya?** Folder per fitur, yang masing-masing berisi `components/` dan `hooks/`-nya sendiri. Ini membuat setiap fitur mandiri dan mudah dikelola.
  > **Kapan saya harus mengubahnya?** Hampir setiap saat. Saat Anda membangun fitur baru atau memodifikasi fitur yang ada, Anda akan bekerja di dalam salah satu folder di sini.

* **`components/`**

  > **Apa itu?** Perpustakaan komponen UI yang sangat generik, dapat digunakan kembali di seluruh aplikasi.
  > **Apa isinya?** Komponen "dumb" seperti `Button.tsx`, `Input.tsx`, `Modal.tsx`. Komponen-komponen ini tidak tahu apa-apa tentang data atau logika bisnis.
  > **Kapan saya harus mengubahnya?** Saat Anda perlu membuat atau memodifikasi elemen UI dasar yang akan dipakai di banyak tempat.

* **`stores/`**

  > **Apa itu?** Tempat untuk state management global menggunakan Zustand.
  > **Apa isinya?** `useAppDataStore.ts`, yang merupakan **Single Source of Truth** (satu-satunya sumber kebenaran) untuk semua data yang perlu dibagikan antar halaman atau fitur (seperti data QC, data plot, atau sumur yang sedang dipilih).
  > **Kapan saya harus mengubahnya?** Saat Anda perlu menambah atau mengubah data yang bersifat global.

* **`lib/`**

  > **Apa itu?** Direktori untuk utilitas dan fungsi pembantu umum.
  > **Apa isinya?** `api.ts` (klien terpusat untuk semua panggilan ke backend Flask) dan `utils.ts` (fungsi-fungsi umum seperti format tanggal, kalkulasi sederhana, dll).
  > **Kapan saya harus mengubahnya?** Saat Anda perlu membuat fungsi pembantu yang dapat digunakan kembali di berbagai fitur.

* **`types/`**

  > **Apa itu?** Kamus tipe data untuk seluruh aplikasi.
  > **Apa isinya?** File `index.ts` yang berisi semua `interface` dan `type` TypeScript global (misalnya `PlotData`, `QCResult`, `StagedStructure`).
  > **Kapan saya harus mengubahnya?** Saat Anda perlu mendefinisikan bentuk (shape) dari sebuah objek data yang akan digunakan di banyak tempat.

## 💡 Alur Kerja Developer (Contoh)

Misalkan Anda ingin menambahkan fitur **"Kalkulasi Porositas"**:

1.  **Backend:** Buat `porosity_service.py` di `api/modules/`. Tambahkan endpoint `/api/calculate-porosity` di `api/app.py` yang memanggil fungsi dari service tersebut.

2.  **Frontend (State):** Tambahkan `porosityResults` ke dalam `useAppDataStore` jika hasilnya perlu global.

3.  **Frontend (Fitur):**
    * Buat folder `frontend/src/features/porosity-calculation/`.
    * Di dalamnya, buat `components/PorosityView.tsx` yang berisi UI (form, tombol, dll).
    * (Opsional) Buat *hook* `usePorosity.ts` di dalamnya untuk menangani logika panggilan API ke `/api/calculate-porosity`.

4.  **Frontend (Rute):** Buat file di `app/dashboard/modules/porosity-calculation/page.tsx` yang isinya hanya me-render `<PorosityView />`.

Dengan mengikuti alur ini, kode Anda akan selalu terorganisir, mudah ditemukan, dan tidak saling mengganggu antar fitur.

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

Dikembangkan oleh Iza, Sani, Michel, dan Dio. Yap, berempat kami Power Ranger.

## 📜 Lisensi

Didistribusikan di bawah Lisensi MIT.
