// src/config/plotRanges.ts

/**
 * Konfigurasi rentang untuk berbagai jenis plot log.
 * Diterjemahkan dari dictionary Python.
 * Struktur: { [key: string]: number[][] }
 */
export const rangeCol = {
  'GR': [[0, 250]],
  'GR_NORM': [[0, 250]],
  'GR_DUAL': [[0, 250], [0, 250]],
  'RT': [[0.02, 2000]],
  'RT_RO': [[0.02, 2000], [0.02, 2000]],
  'X_RT_RO': [[0, 4]],
  'NPHI_RHOB_NON_NORM': [[0.6, 0], [1.71, 2.71]],
  'NPHI_RHOB': [[0.6, 0], [1.71, 2.71], [1, 0], [1, 0]],
  'RHOB': [[1.71, 2.71]],
  'SW': [[1, 0]],
  'PHIE_PHIT': [[0.5, 0], [0.5, 0]],
  'PERM': [[0.02, 2000]],
  'VCL': [[0, 1]],
  'RWAPP_RW': [[0.01, 1000], [0.01, 1000]],
  'X_RWA_RW': [[0, 4]],
  'RT_F': [[0.02, 2000], [0.02, 2000]],
  'X_RT_F': [[0, 2]],
  'RT_RHOB': [[0.01, 1000], [1.71, 2.71], [0, 1], [0, 1]],
  'X_RT_RHOB': [[-0.5, 0.5]],
  'XPT': [[0, 1]],
  'RT_RGSA': [[0.02, 2000], [0.02, 2000]],
  'NPHI_NGSA': [[0.6, 0], [0.6, 0]],
  'RHOB_DGSA': [[1.71, 2.71], [1.71, 2.71]],
  'VSH': [[0, 1]],
  'SP': [[-160, 40]],
  'VSH_LINEAR': [[0, 1]],
  'VSH_DN': [[0, 1]],
  'VSH_SP': [[0, 1]],
  'PHIE_DEN': [[0, 1], [0, 1]],
  'PHIT_DEN': [[0, 1], [0, 1]],
  'RWA': [[0, 60], [0, 60], [0, 60]],
  // TODO: Sesuai komentar di kode Python, periksa kembali logika untuk PHIE dan PHIT
  'PHIE': [[0.6, 0]],
  'RT_GR': [[0.02, 2000], [0, 250], [0.02, 2000], [0, 250]],
  'RT_PHIE': [[0.02, 2000], [0.6, 0]],
  'SWARRAY': [[1, 0], [1, 0]],
  'SWGRAD': [[-2, 2]]
};

// Ekspor tipe untuk 'rangeCol' agar bisa digunakan di tempat lain
export type RangeCol = typeof rangeCol;