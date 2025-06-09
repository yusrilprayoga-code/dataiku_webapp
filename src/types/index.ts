/* eslint-disable @typescript-eslint/no-explicit-any */
// src/types/index.ts

// Merepresentasikan satu baris dari data log sumur utama
export interface LogDataRow {
  DEPTH: number;
  MARKER: string;
  NPHI?: number | null;
  RHOB?: number | null;
  RT?: number | null;
  // Tambahkan semua kolom lain dari file CSV Anda di sini agar type-safe
  [key: string]: any; 

  // Kolom-kolom baru yang akan kita buat
  NPHI_NORM?: number;
  RHOB_NORM_NPHI?: number;
  RT_NORM?: number;
  RHOB_NORM_RT?: number;
}

// Merepresentasikan data marker yang sudah diproses
export interface MarkerData {
  Surface: string;
  'Mean Depth': number;
}