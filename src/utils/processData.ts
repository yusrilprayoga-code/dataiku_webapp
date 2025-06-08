// src/utils/processData.ts

import { LogDataRow, MarkerData } from '@/types'; 
import { rangeCol, RangeCol } from '@/config/plotRanges';

export function extractMarkersWithMeanDepth(data: LogDataRow[]): MarkerData[] {
  // ... (kode dari jawaban sebelumnya, tidak perlu diubah)
  if (!data || data.length === 0) return [];
  const markerGroups = new Map<string, { sum: number; count: number }>();
  for (const row of data) {
    if (!row.MARKER || row.MARKER.trim() === '') continue;
    const group = markerGroups.get(row.MARKER) || { sum: 0, count: 0 };
    group.sum += row.DEPTH;
    group.count += 1;
    markerGroups.set(row.MARKER, group);
  }
  const result: MarkerData[] = [];
  markerGroups.forEach((value, key) => {
    result.push({
      Surface: key,
      'Mean Depth': value.sum / value.count,
    });
  });
  return result;
}


// Fungsi normalizeXover sekarang lebih bersih
export function normalizeXover(data: LogDataRow[], log1Key: keyof LogDataRow, log2Key: keyof LogDataRow): LogDataRow[] {
  const logMergeKey = `${String(log1Key)}_${String(log2Key)}` as keyof RangeCol;
  const ranges = rangeCol[logMergeKey];

  if (!ranges) {
    console.warn(`Rentang untuk '${logMergeKey}' tidak ditemukan di 'rangeCol'. Melewatkan normalisasi.`);
    return data;
  }

  const [log1Range, log2Range] = ranges;
  const [minLog1, maxLog1] = log1Range;
  const [minLog2, maxLog2] = log2Range;

  const log1NormKey = `${String(log1Key)}_NORM`;
  const log2NormKey = `${String(log2Key)}_NORM_${String(log1Key)}`;

  return data.map(row => {
    const newRow = { ...row };
    const log1Value = row[log1Key] as number;
    const log2Value = row[log2Key] as number;
    
    newRow[log1NormKey] = log1Value;

    if (typeof log2Value === 'number' && !isNaN(log2Value)) {
      newRow[log2NormKey] = minLog1 + (log2Value - minLog2) * (maxLog1 - minLog1) / (maxLog2 - minLog2);
    } else {
      newRow[log2NormKey] = null;
    }
    return newRow;
  });
}

// export function encodeWithNan(
//   dfWell: LogDataRow[], 
//   key: string
// ): { data: LogDataRow[], names: Record<number, string> } {
//   console.warn("encodeWithNan: Menggunakan implementasi placeholder.");
//   // Ini hanya contoh, tidak akan berfungsi dengan benar
//   const names = { 1: 'Top-A', 2: 'Top-B' };
//   const data = dfWell.map(row => ({ ...row, [key]: Math.random() > 0.5 ? 1 : 2 }));
//   return { data, names };
// }

export function encodeWithNan(
  dfWell: LogDataRow[],
  col: string
): { data: LogDataRow[], names: Record<number, string> } {
  // Replikasi dari .dropna().unique()
  const uniqueVals = [...new Set(dfWell.map(d => d[col]).filter(v => v != null && v !== ''))];
  
  // Replikasi dari pembuatan col_map dan flag_map
  const colMap = new Map<string, number>();
  const flagMap: Record<number, string> = {};

  uniqueVals.forEach((val, i) => {
    const numericVal = i + 1;
    colMap.set(val, numericVal);
    flagMap[numericVal] = val;
  });

  // Tambahkan mapping untuk nilai kosong/null
  flagMap[0] = '';
  
  // Replikasi dari .map(col_map).fillna(0).astype(int)
  const dfEncoded = dfWell.map(row => {
    const originalVal = row[col];
    const encodedVal = (originalVal != null && originalVal !== '') ? colMap.get(originalVal as string) ?? 0 : 0;
    return { ...row, [col]: encodedVal };
  });

  return { data: dfEncoded, names: flagMap };
}