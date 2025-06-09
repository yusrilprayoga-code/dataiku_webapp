// src/utils/crossover.ts (Perbaikan pada xoverLabelDf)

import { LogDataRow } from "@/types";
import { dataCol, thres } from "@/config/plotConfig";

// Fungsi fillcol tidak berubah
export function fillcol(
  label: string | number,
  yColor = 'rgba(0, 250, 0, 0.4)',
  nColor = 'rgba(250, 0, 0, 0)'
): string {
  const numericLabel = typeof label === 'string' ? parseFloat(label) : label;
  return numericLabel >= 1 ? yColor : nColor;
}


// Versi xoverLabelDf yang lebih andal
export function xoverLabelDf(dfWell: LogDataRow[], key: string, type = 1): LogDataRow[][] {
  if (!dfWell || dfWell.length === 0) return [];
  
  const labeledData = dfWell.map(row => {
    let label = 0;
    const cols = dataCol[key];
    if (['X_RT_RO', 'X_RWA_RW', 'X_RT_F', 'X_RT_RHOB'].includes(key)) {
      if (row[cols[0]] > thres[key]) label = 1;
    } else if (key === 'NPHI_RHOB' || key === 'RT_RHOB') {
      if (row[cols[2]] > row[cols[3]]) label = 1;
    } else {
      if (row[cols[0]] > row[cols[1]]) label = 1;
    }
    return { ...row, label };
  });

  // Logika pengelompokan & pemisahan yang lebih robust
  if (labeledData.length === 0) return [];
  
  const segments: LogDataRow[][] = [];
  let currentSegment: LogDataRow[] = [];
  
  for (let i = 0; i < labeledData.length; i++) {
    const currentRow = labeledData[i];
    // Jika segmen kosong atau label saat ini sama dengan sebelumnya, tambahkan ke segmen
    if (currentSegment.length === 0 || currentRow.label === currentSegment[0].label) {
      currentSegment.push(currentRow);
    } else {
      // Jika label berubah, simpan segmen lama dan mulai yang baru
      segments.push(currentSegment);
      currentSegment = [currentRow];
    }
  }
  // Jangan lupa simpan segmen terakhir
  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }
  
  // Filter berdasarkan tipe
  if (type === 1) {
    return segments.filter(segment => segment.length > 0 && segment[0].label === 1);
  }

  return segments;
}