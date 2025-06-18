/* eslint-disable @typescript-eslint/no-explicit-any */
// src/types/index.ts

// Merepresentasikan satu baris dari data log sumur utama
export interface LogDataRow {
  DEPTH: number;
  MARKER: string;
  NPHI?: number | null;
  RHOB?: number | null;
  RT?: number | null;
  GR?: number | null;
  RHOB_NPHI?: number | null;
  RT_RHOB?: number | null;
  NPHI_RHOB?: number | null;
  RHOB_NORM?: number | null;
  // Tambahkan semua kolom lain dari file CSV Anda di sini agar type-safe
  [key: string]: any; 

  // Kolom-kolom baru yang akan kita buat
  NPHI_NORM?: number;
  RHOB_NORM_NPHI?: number;
  RT_NORM?: number;
  RHOB_NORM_RT?: number;
}

export interface XptNote {
  'Depth (m)': number;
  'Note': string;
}

// Merepresentasikan data marker yang sudah diproses
export interface MarkerData {
  Surface: string;
  'Mean Depth': number;
}

export type IntervalValues = {
  [intervalName: string]: {
    checked: boolean;
    value: string | number;
  };
};

export interface ParameterRow {
  id: number;
  location: string;
  mode: string;
  comment: string;
  unit: string;
  name: string;
  isEnabled: boolean; 
  values: {
    [intervalName: string]: string | number;
  };
}