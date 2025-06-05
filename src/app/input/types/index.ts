// export interface ParsedSubFile {
//   id: string;
//   name: string;
//   type: 'las' | 'csv';
//   content: any[];
//   headers: string[];
//   // rawContentString?: string;
// }

// export interface FileData {
//   id: string;
//   name: string;
//   originalZipName?: string;
//   size: number;
//   originalFileType: string; // Renamed from 'type' in your provided code
//   lastModified: number;
//   isStructureFromZip?: boolean;
//   lasFiles?: ParsedSubFile[];
//   csvFiles?: ParsedSubFile[];
//   content?: any[];
//   headers?: string[];
//   // For ZIP files that aren't structures but just list LAS files (as per previous iteration)
//   isZip?: boolean; // You had this, check if it overlaps with isStructureFromZip intent
//   lasFilesInZip?: { name: string, contentPreview?: string }[];
// }

export interface ParsedSubFile { // Keep this name as it's used in your code
  id: string;
  name: string;
  type: 'las' | 'csv';
  rawContentString: string; // <-- ADD THIS: To store raw string content for LAS/CSV from ZIP
  content: any[];
  headers: string[];
}

export interface FileData { // Keep this name
  id: string;
  name: string;
  originalZipName?: string;
  size: number;
  originalFileType: string;
  lastModified: number;
  isStructureFromZip?: boolean;
  lasFiles?: ParsedSubFile[];
  csvFiles?: ParsedSubFile[];
  content?: any[]; // For single parsed files
  headers?: string[]; // For single parsed files
  rawFileContent?: string | ArrayBuffer; // <-- ADD THIS: For single raw uploaded files
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

export interface ProcessedFileDataForDisplay {
  id: string;         // Unique ID, can be derived from original ParsedSubFile or FileData id
  name: string;       // Display name, could be original name or prefixed (e.g., "StructureFromZip/subfile.las")
  originalName?: string; // The file's original name if different from the display name
  structurePath?: string; // If it came from a structure within a ZIP, this is the structure's name
  type: 'las-as-csv' | 'csv'; // Specifies how to treat the data for display
  content: any[];     // Parsed tabular content
  headers: string[];  // Column headers
}

// Represents the entire package of data passed to the "Data Input Utama" page
export interface StagedStructure {
  userDefinedStructureName: string; // The name the user provides in the prompt on page 1
  files: ProcessedFileDataForDisplay[]; // A flattened list of all LAS (as CSV) and CSV files
}