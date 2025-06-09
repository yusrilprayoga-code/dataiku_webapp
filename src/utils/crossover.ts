// src/utils/crossover.ts (Versi Final)

import { LogDataRow } from "@/types";
import { dataCol } from "@/config/plotConfig";
import { thres } from "@/config/plotConfig"; // Impor thres yang baru

/**
 * Menentukan warna isian (fill color) berdasarkan label.
 * @param label - Label numerik dari data (misalnya 1 untuk ya, 0 untuk tidak).
 * @param yColor - Warna untuk "ya" (default: hijau transparan).
 * @param nColor - Warna untuk "tidak" (default: merah transparan).
 * @returns String warna RGBA.
 */
export function fillcol(
  label: string | number,
  yColor = 'rgba(0, 250, 0, 0.4)',
  nColor = 'rgba(250, 0, 0, 0)'
): string {
  // Pastikan label adalah angka
  const numericLabel = typeof label === 'string' ? parseFloat(label) : label;
  return numericLabel >= 1 ? yColor : nColor;
}

/**
 * Memproses data log untuk mengidentifikasi dan mengelompokkan segmen crossover.
 * @param dfWell - Seluruh data log.
 * @param key - Kunci identifikasi untuk jenis crossover (mis. 'NPHI_RHOB').
 * @param type - Tipe filter: 1 (hanya tampilkan zona crossover), selain itu (tampilkan semua zona).
 * @returns Array dari array data (LogDataRow[][]), di mana setiap array inner adalah segmen kontinu.
 */
export function xoverLabelDf(dfWell: LogDataRow[], key: string, type = 1): LogDataRow[][] {
  if (!dfWell || dfWell.length === 0) return [];
  
  // 1. Pelabelan: Buat kolom 'label' (0 atau 1) berdasarkan kondisi crossover.
  const labeledData = dfWell.map(row => {
    let label = 0;
    const cols = dataCol[key];

    if (['X_RT_RO', 'X_RWA_RW', 'X_RT_F', 'X_RT_RHOB'].includes(key)) {
      if (row[cols[0]] > thres[key]) label = 1;
    } else if (key === 'NPHI_RHOB' || key === 'RT_RHOB') {
      // Ini menggunakan kolom yang sudah dinormalisasi, mis. NPHI_NORM vs RHOB_NORM_NPHI
      if (row[cols[2]] > row[cols[3]]) label = 1;
    } else {
      if (row[cols[0]] > row[cols[1]]) label = 1;
    }
    
    return { ...row, label };
  });

  // 2. Pengelompokan: Buat ID grup untuk setiap segmen kontinu (di mana label sama).
  // Ini adalah replikasi dari `.ne(.shift()).cumsum()` di Pandas.
  let groupCounter = 0;
  let lastLabel = -1; // Nilai awal yang tidak mungkin sama dengan label
  const groupedData = labeledData.map(row => {
    if (row.label !== lastLabel) {
      groupCounter++;
      lastLabel = row.label;
    }
    return { ...row, group: groupCounter };
  });

  // 3. Pemisahan: Pisahkan data menjadi array dari array berdasarkan ID grup.
  const segments = Object.values(
    groupedData.reduce((acc, row) => {
      // Jika grup belum ada di akumulator, buat array baru
      if (!acc[row.group]) {
        acc[row.group] = [];
      }
      acc[row.group].push(row);
      return acc;
    }, {} as Record<number, LogDataRow[]>)
  );

  // 4. Pemfilteran: Terapkan filter berdasarkan 'type'.
  if (type === 1) {
    // Hanya kembalikan segmen di mana labelnya adalah 1 (zona crossover)
    return segments.filter(segment => segment.length > 0 && segment[0].label === 1);
  }

  // Jika tipe bukan 1, kembalikan semua segmen
  return segments;
}