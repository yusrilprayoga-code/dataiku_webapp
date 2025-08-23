/* eslint-disable @typescript-eslint/no-explicit-any */

// Tipe ini HANYA digunakan di dalam fitur file_upload

export interface ParsedSubFile {
  id: string;
  name: string;
  type: 'las' | 'csv';
  rawContentString: string;
  content: any[];
  headers: string[];
}

export interface FileData {
  id: string;
  name: string;
  size: number;
  originalFileType: string;
  lastModified: number;
  isStructureFromZip: boolean;
  content: any[];
  headers: string[];
  // Untuk file ZIP, kita simpan detail file di dalamnya
  lasFiles?: ParsedSubFile[];
  csvFiles?: ParsedSubFile[];
  originalZipName?: string;
  // Kita standarkan `rawFileContent` menjadi string | undefined agar konsisten
  rawFileContent?: string; 
}