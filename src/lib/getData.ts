// src/lib/data-loader.ts (Diperbarui untuk .csv)

import { LogDataRow } from '@/types';
import path from 'path';
import fs from 'fs/promises';
import Papa from 'papaparse'; // Import papaparse

export async function getData(): Promise<{ logData: LogDataRow[], wellName: string }> {
  // Pastikan nama file sesuai: pass_qc.csv
  const fileName = 'pass_qc.csv';
  const filePath = path.join(process.cwd(), 'backend/data', fileName);

  try {
    const csvFileContent = await fs.readFile(filePath, 'utf-8');

    // Gunakan Papaparse untuk mengubah string CSV menjadi JSON
    const parseResult = Papa.parse(csvFileContent, {
      header: true,       // Gunakan baris pertama sebagai nama kolom (header)
      dynamicTyping: true, // Secara otomatis mengubah angka dan boolean ke tipe yang benar
      skipEmptyLines: true, // Lewati baris kosong
    });

    // Hasil parsing ada di `parseResult.data`
    const logData = parseResult.data as LogDataRow[];
    
    // Asumsi nama sumur bisa diambil dari nama file atau hardcode
    const wellName = fileName.replace('.csv', '').replace(/_/g, ' ').toUpperCase();

    return { logData, wellName };
  } catch (error) {
    console.error(`Gagal membaca atau mem-parsing file ${fileName}:`, error);
    return { logData: [], wellName: "Unknown" };
  }
}