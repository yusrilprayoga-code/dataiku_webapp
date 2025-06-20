# WebApp Quality Control Geologi

![Vercel Deployment](https://therealsujitk-vercel-badge.vercel.app/?app=dataiku-webapp&style=for-the-badge)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

> _Update Terakhir: 20 Juni 2025_

## Deskripsi Singkat

Sebuah aplikasi web full-stack yang dirancang untuk menjalankan proses _Quality Control_ (QC) pada file data sumur (well log). Frontend dibangun dengan Next.js untuk antarmuka yang modern dan interaktif, sementara backend menggunakan Flask (Python) untuk memproses data dan menjalankan kalkulasi yang kompleks.

Proyek ini terkonfigurasi untuk _continuous deployment_ di Vercel dari branch `main`.
**Link Deployment:** [https://dataiku-webapp.vercel.app/](https://dataiku-webapp.vercel.app/)

## ✨ Fitur Utama

-   **Antarmuka Upload Data:** Antarmuka yang bersih dan ramah pengguna untuk mengunggah file data untuk diproses.
-   **Backend Berbasis Python:** Memanfaatkan kekuatan Python dan ekosistem data science-nya untuk menjalankan skrip QC yang kompleks.
-   **Visualisasi Interaktif:** Menampilkan hasil dan plot data secara dinamis menggunakan Plotly.js untuk pengalaman analisis yang interaktif.
-   **Arsitektur Serverless:** Dideploy di Vercel, memanfaatkan _serverless functions_ untuk backend yang skalabel dan efisien.

## 🗺️ Roadmap Proyek & Desain

Perencanaan dan pengembangan fitur dilacak secara visual menggunakan Figma.

-   **[Peta Jalan & Desain Sistem](https://www.figma.com/board/TaQF2Vgx8wQN1WjkmIlpga/System-Design-geolog-wannabe?node-id=0-1&p=f&t=wzgm4Gd6hTsIbVM7-0)**: Lihat papan ini untuk arsitektur sistem dan rencana pengembangan jangka panjang.
-   **[Desain UI/UX](https://www.figma.com/design/eyPxoYTxXwey0rOVZzYvZz/UI-UX-geolog-wannabe?node-id=10-15&t=ddCZAXv3vKNkqxuH-0)**: Lihat tautan ini untuk desain antarmuka, komponen, dan pengalaman pengguna.

## 🛠️ Teknologi yang Digunakan

| Kategori | Teknologi |
| :--- | :--- |
| **Frontend** | ![Next.js](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white) ![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white) |
| **Backend** | ![Flask](https://img.shields.io/badge/flask-%23000.svg?style=for-the-badge&logo=flask&logoColor=white) ![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54) |
| **Deployment**| ![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white) |

## 📂 Struktur Proyek & Konvensi Developer

Proyek ini menggunakan struktur **Monorepo**, artinya kode frontend dan backend berada dalam satu repository untuk memudahkan pengembangan.

#### Peta Direktori Proyek

-   **`/` (Root Direktori)**
    -   📄 `.gitignore`: Daftar file/folder yang diabaikan oleh Git.
    -   📄 `vercel.json`: Konfigurasi build & deployment untuk Vercel.
    -   📁 `api/`: **Backend (Flask)**. Semua logika pemrosesan data Python ada di sini.
        -   `app.py`: Entrypoint utama Flask, hanya berisi definisi rute API.
        -   `requirements.txt`: Daftar semua package Python yang dibutuhkan.
        -   `modules/`: "Otak" dari backend, berisi semua logika bisnis dan fungsi-fungsi kompleks.
        -   `venv/`: Virtual environment Python (diabaikan oleh Git).
    -   📁 `frontend/`: **Frontend (Next.js)**. Semua yang berhubungan dengan tampilan ada di sini.
        -   `package.json`: Daftar dependensi dan skrip untuk frontend.
        -   `next.config.ts`: Konfigurasi Next.js.
        -   `public/`: Aset statis seperti gambar dan ikon.
        -   `src/`: Folder utama kode sumber frontend.
            -   `app/`: Halaman dan layout (menggunakan App Router).
            -   `components/`: Komponen UI kecil yang bisa dipakai ulang (misal: Button, Card).
            -   `features/`: Komponen dan logic untuk fitur spesifik (misal: semua yang berhubungan dengan `file-upload`).
            -   `lib/`: Fungsi bantuan (helpers), hooks, dan utilitas umum.

#### Konvensi Utama untuk Developer (TIDI)

> **Aturan Emas:** Jaga pemisahan tugas. `frontend` hanya mengurus tampilan dan interaksi. `api` mengurus semua pemrosesan data. Keduanya hanya "berkomunikasi" melalui API call.
> *(Untuk detail konvensi lainnya, silakan lihat dokumen panduan developer internal).*

## 🚀 Panduan Setup Lokal

Ikuti instruksi ini untuk menjalankan proyek di komputer Anda.

### Prasyarat

-   [Node.js](https://nodejs.org/) (v18 atau lebih baru)
-   [Python](https://www.python.org/downloads/) (v3.9 atau lebih baru) & `pip`

### Instalasi & Setup

1.  **Clone Repository:**
    ```bash
    git clone [https://github.com/MichelPT/dataiku_webapp.git](https://github.com/MichelPT/dataiku_webapp.git)
    cd dataiku_webapp
    ```

2.  **Setup Backend (Python):**
    ```bash
    cd api
    python3 -m venv venv
    source venv/bin/activate  # Untuk Windows: venv\Scripts\activate
    pip install -r requirements.txt
    cd ..
    ```

3.  **Setup Frontend (Node.js):**
    ```bash
    cd frontend
    npm install
    cd ..
    ```

### Menjalankan Server Development

Cara yang disarankan adalah menggunakan `concurrently` untuk menjalankan kedua server dengan satu perintah dari **direktori root proyek**:

```bash
npm run dev