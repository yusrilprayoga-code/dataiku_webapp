/* eslint-disable @typescript-eslint/no-explicit-any */
// src/config/otherConfig.ts
import { type LogDataRow } from '@/types'; // Sesuaikan path jika perlu

/**
 * Mengonversi nilai pada kolom kedalaman dari feet ke meter.
 * Fungsi ini mengembalikan array baru dan tidak mengubah data asli (immutable).
 *
 * @param data - Array data log.
 * @param column - Nama kolom kedalaman yang akan dikonversi (default: 'DEPTH').
 * @returns Array LogDataRow baru dengan kedalaman dalam meter.
 */
export function convertDepthFtToM(data: LogDataRow[], column: keyof LogDataRow = 'DEPTH'): LogDataRow[] {
  const CONVERSION_FACTOR = 0.3048; // 1 ft = 0.3048 m
  return data.map(row => ({
    ...row,
    [column]: (row[column] as number) * CONVERSION_FACTOR
  }));
}

/**
 * Memfilter urutan track plot dengan menghapus kunci yang tidak diinginkan.
 *
 * @param sequence - Array awal dari kunci track (misalnya, ['GR', 'RT', 'NPHI']).
 * @param excludeKeys - Array kunci track yang ingin dihapus.
 * @returns Array sequence baru yang sudah difilter.
 */
export function updatePlotSequence(sequence: string[], excludeKeys: string[]): string[] {
  return sequence.filter(key => !excludeKeys.includes(key));
}

/**
 * Mengubah kolom kategorikal (string) menjadi numerik, mereplikasi
 * logika Pandas untuk menangani nilai unik dan NaN.
 *
 * @param dfWell - Array data log.
 * @param col - Nama kolom yang akan di-encode.
 * @returns Objek berisi data yang telah diupdate dan peta nama.
 */
export function encodeWithNan(
  dfWell: LogDataRow[],
  col: string
): { data: LogDataRow[], names: Record<number, string> } {
  // Ambil nilai unik dan bukan null
  const uniqueVals = [...new Set(dfWell.map(d => d[col]).filter(v => v != null && v !== ''))];
  
  const colMap = new Map<string, number>();
  const flagMap: Record<number, string> = {};

  uniqueVals.forEach((val, i) => {
    const numericVal = i + 1;
    colMap.set(val, numericVal);
    flagMap[numericVal] = val;
  });

  // Tambahkan mapping untuk nilai kosong/null ke 0
  flagMap[0] = '';
  
  const dfEncoded = dfWell.map(row => {
    const originalVal = row[col];
    const encodedVal = (originalVal != null && originalVal !== '') ? colMap.get(originalVal as string) ?? 0 : 0;
    return { ...row, [col]: encodedVal };
  });

  return { data: dfEncoded, names: flagMap };
}

/**
 * [Helper] Menghasilkan satu warna acak, dengan opsi untuk membuatnya pastel.
 * Tidak diekspor karena hanya digunakan oleh generateNewColor.
 */
function getRandomColor(pastelFactor = 0.5): [number, number, number] {
  const randomRGB = [Math.random(), Math.random(), Math.random()];
  return randomRGB.map(x => (x + pastelFactor) / (1.0 + pastelFactor)) as [number, number, number];
}

/**
 * [Helper] Menghitung "Manhattan distance" antara dua warna dalam ruang RGB.
 * Tidak diekspor karena hanya digunakan oleh generateNewColor.
 */
function colorDistance(
  c1: [number, number, number],
  c2: [number, number, number]
): number {
  return Math.abs(c1[0] - c2[0]) + Math.abs(c1[1] - c2[1]) + Math.abs(c1[2] - c2[2]);
}

/**
 * Membuat warna baru yang paling berbeda dari warna yang sudah ada
 * untuk memastikan kontras visual yang baik.
 */
export function generateNewColor(
  existingColors: Record<any, [number, number, number]>,
  pastelFactor = 0.5
): [number, number, number] {
  const existingColorValues = Object.values(existingColors);
  if (existingColorValues.length === 0) {
    return getRandomColor(pastelFactor);
  }

  let maxDistance: number | null = null;
  let bestColor: [number, number, number] | null = null;

  for (let i = 0; i < 100; i++) {
    const color = getRandomColor(pastelFactor);
    const minDistanceToExisting = Math.min(
      ...existingColorValues.map(c => colorDistance(color, c))
    );
    if (maxDistance === null || minDistanceToExisting > maxDistance) {
      maxDistance = minDistanceToExisting;
      bestColor = color;
    }
  }
  return bestColor!;
}

/**
 * Mengubah nilai RGB (dalam rentang 0-1) menjadi kode Hex string.
 */
export function rgbToHex(rgb: [number, number, number]): string {
  if (!rgb || rgb.length !== 3) return '#000000';
  
  const toHex = (c: number) => {
    const byte = Math.round(c * 255);
    const clampedByte = Math.max(0, Math.min(255, byte));
    return clampedByte.toString(16).padStart(2, '0');
  };
  
  return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
}