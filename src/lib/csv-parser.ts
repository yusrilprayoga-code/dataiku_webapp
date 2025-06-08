// src/lib/csv-parser.ts

// Tipe data untuk satu baris data log yang sudah bersih
export interface ParsedLogData {
  [key: string]: number | string | null;
}

// Tipe data untuk satu blok marker yang sudah diproses
export interface ProcessedMarker {
  top: number;
  base: number;
  name: string;
  color: string;
}

export function ParsedCsvData(csvString: string): ParsedLogData[] {
  // ... (kode parser dari jawaban sebelumnya sudah benar, pastikan Anda menggunakan versi itu)
  // ... (versi yang sudah menangani DEPT kosong dan sorting)
  const lines = csvString.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headerIndex = lines.findIndex(line => line.trim() !== '' && line.toUpperCase().includes('DEPTH'));
  if (headerIndex === -1) return [];

  const headers = lines[headerIndex].split(',').map(h => h.trim().toUpperCase()); // Konsisten ke huruf besar
  const deptColumnIndex = headers.findIndex(h => h === 'DEPTH');

  if (deptColumnIndex === -1) return [];
  
  const dataLines = lines.slice(headerIndex + 1);
  const parsedData: ParsedLogData[] = [];
  let lastValidDepth: number | null = null;
  const assumedDepthStep = 0.1524;

  dataLines.forEach(line => {
    if (line.trim() === '') return;
    const values = line.split(',');
    const row: ParsedLogData = {};
    let currentDepth: number | null = parseFloat(values[deptColumnIndex]);
    
    if (isNaN(currentDepth)) {
      if (lastValidDepth !== null) {
        currentDepth = lastValidDepth + assumedDepthStep;
      } else {
        return; 
      }
    }
    lastValidDepth = currentDepth;

    headers.forEach((header, index) => {
      if (index === deptColumnIndex) {
          row[header] = currentDepth;
          return;
      }
      const value = values[index]?.trim();
      if (!value) {
        row[header] = null;
      } else if (header === 'MARKER') {
        row[header] = value;
      } else {
        const numValue = parseFloat(value);
        row[header] = isNaN(numValue) ? null : numValue;
      }
    });
    parsedData.push(row);
  });
  return parsedData;
}


// Fungsi processMarkersFromData tidak perlu diubah
export function processMarkersFromData(data: ParsedLogData[]): ProcessedMarker[] {
    const markers: ProcessedMarker[] = [];
    let currentMarker: { name: string; top: number } | null = null;
    const markerColors: { [key: string]: string } = {
      'Upper': 'rgba(0, 255, 255, 0.2)', 'BTS': 'rgba(255, 165, 0, 0.2)',
      'A1': 'rgba(255, 0, 0, 0.2)', 'B1': 'rgba(128, 0, 128, 0.2)',
    };
  
    data.forEach((row, index) => {
      const markerName = row['MARKER'] as string | null;
      const depth = row['DEPTH'] as number;
      if (depth === null) return;
  
      if (markerName && (!currentMarker || markerName !== currentMarker.name)) {
        if (currentMarker) {
          markers.push({
            ...currentMarker, base: depth,
            color: markerColors[currentMarker.name] || 'rgba(211, 211, 211, 0.2)',
          });
        }
        currentMarker = { name: markerName, top: depth };
      }
      
      if (index === data.length - 1 && currentMarker) {
          markers.push({
            ...currentMarker, base: depth,
            color: markerColors[currentMarker.name] || 'rgba(211, 211, 211, 0.2)',
          });
      }
    });
    return markers;
}