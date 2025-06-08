export interface ParsedLasData {
  [key: string]: number | null;
}

export function parseLasData(lasString: string): ParsedLasData[] {
  const dataSectionIndex = lasString.toUpperCase().indexOf('~A');
  if (dataSectionIndex === -1) return [];

  // Gunakan regex untuk memisahkan baris, menangani \n dan \r\n
  const lines = lasString.substring(dataSectionIndex).trim().split(/\r?\n/);
  
  const headerLineIndex = lines.findIndex(line => !line.startsWith('#') && line.trim().toUpperCase() !== '~A');
  if (headerLineIndex === -1) return [];
  
  const columns = lines[headerLineIndex].trim().split(/\s+/);
  const dataLines = lines.slice(headerLineIndex + 1);

  return dataLines
    .filter(line => line.trim() !== '' && !line.trim().startsWith('#')) // Abaikan baris kosong dan komentar
    .map(line => {
      const values = line.trim().split(/\s+/);
      const row: ParsedLasData = {};
      columns.forEach((col, index) => {
        const value = parseFloat(values[index]);
        // Nilai null di file LAS seringkali -999.25
        row[col] = (value === -999.25 || isNaN(value)) ? null : value;
      });
      return row;
    })
    .filter(row => row['DEPT'] !== null && typeof row['DEPT'] === 'number'); // Pastikan DEPT valid
}