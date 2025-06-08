export interface ParsedCsvData {
  [key: string]: number | string | null;
}

export interface ProcessedMarker {
  top: number;
  base: number;
  name: string;
  color: string;
}

// Fungsi untuk mem-parsing string CSV menjadi array of objects
export function parseCsvData(csvString: string): ParsedCsvData[] {
  // Menggunakan regular expression /\r?\n/ untuk menangani akhir baris Windows (\r\n) dan Unix (\n)
  const lines = csvString.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headerIndex = lines.findIndex(line => line.trim() !== '');
  if (headerIndex === -1) return [];

  const headers = lines[headerIndex].split(',').map(h => h.trim());
  const dataLines = lines.slice(headerIndex + 1);

  const parsedRows = dataLines
    .filter(line => line.trim() !== '') // 1. Filter baris yang benar-benar kosong
    .map(line => {
      const values = line.split(',');
      const row: ParsedCsvData = {};
      headers.forEach((header, index) => {
        const value = values[index]?.trim();
        if (!value) {
          row[header] = null;
        } else if (header === 'MARKER' && value) {
          row[header] = value;
        } else {
          const numValue = parseFloat(value);
          row[header] = isNaN(numValue) ? null : numValue;
        }
      });
      return row;
    });

  // --- LANGKAH BARU YANG DITAMBAHKAN ---
  // 2. Filter baris di mana kolom DEPTH tidak valid (null atau bukan angka)
  const validRows = parsedRows.filter(row => 
    row['DEPTH'] !== null && typeof row['DEPTH'] === 'number'
  );

  return validRows;
}


// Fungsi processMarkersFromData TIDAK PERLU DIUBAH.
// Logikanya sudah aman karena akan menerima data yang sudah bersih.
export function processMarkersFromData(data: ParsedCsvData[]): ProcessedMarker[] {
    const markers: ProcessedMarker[] = [];
    let currentMarker: { name: string; top: number } | null = null;
    const markerColors: { [key: string]: string } = {
      'Upper': 'rgba(0, 255, 255, 0.2)', 'BTS': 'rgba(255, 165, 0, 0.2)',
      'A1': 'rgba(255, 0, 0, 0.2)', 'B1': 'rgba(128, 0, 128, 0.2)',
    };
  
    data.forEach((row, index) => {
      const markerName = row['MARKER'] as string | null;
      const depth = row['DEPTH'] as number;
      
      // Guard clause ini menjadi lebih efektif karena data yang masuk sudah pasti punya DEPTH
      if (!depth) return;
  
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