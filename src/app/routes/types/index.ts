export interface ParsedSubFile {
  id: string;
  name: string;
  type: 'las' | 'csv';
  content: any[];
  headers: string[];
  // rawContentString?: string;
}

export interface FileData {
  id: string;
  name: string;
  originalZipName?: string;
  size: number;
  originalFileType: string; // Renamed from 'type' in your provided code
  lastModified: number;
  isStructureFromZip?: boolean;
  lasFiles?: ParsedSubFile[];
  csvFiles?: ParsedSubFile[];
  content?: any[];
  headers?: string[];
  // For ZIP files that aren't structures but just list LAS files (as per previous iteration)
  isZip?: boolean; // You had this, check if it overlaps with isStructureFromZip intent
  lasFilesInZip?: { name: string, contentPreview?: string }[];
}

// You might also want a type for what your parsing functions return before full FileData creation
export interface ParsedFileData {
  headers: string[];
  data: any[];
}

export interface ParsedZipData extends ParsedFileData {
  lasFilesInZip: { name: string }[];
}

export interface ParsedStructureData {
  name: string; // Structure name
  lasFiles: ParsedSubFile[];
  csvFiles: ParsedSubFile[];
}