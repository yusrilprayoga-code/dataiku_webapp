/* eslint-disable @typescript-eslint/no-explicit-any */

// FILE 1: frontend/src/features/quality-control/types.ts
// Menyatukan semua tipe data yang relevan di sini untuk kerapian.

import { type Data, type Layout } from 'plotly.js';

// Tipe data untuk file yang sudah diproses dan siap ditampilkan
export interface ProcessedFileDataForDisplay {
    id: string;
    name: string;
    originalName?: string;
    structurePath?: string;
    type: 'las-as-csv' | 'csv' | 'xlsx-as-csv';
    content: any[];
    headers: string[];
    rawContentString: string; // Konten mentah sangat penting untuk dikirim ke backend
}

// Tipe data untuk struktur file yang akan diteruskan antar halaman
export interface StagedStructure {
    userDefinedStructureName: string;
    files: ProcessedFileDataForDisplay[];
}

// Tipe data untuk file yang sedang di-preview
export interface PreviewableFile {
    id: string;
    name: string;
    content: any[];
    headers: string[];
}

// Tipe-tipe yang berhubungan dengan file asli dan sub-file dari ZIP
export interface ParsedSubFile extends PreviewableFile {
    type: 'las' | 'csv';
    rawContentString: string;
}

export interface FileData extends PreviewableFile {
    size: number;
    originalFileType: string;
    lastModified: number;
    isStructureFromZip: boolean;
    lasFiles?: ParsedSubFile[];
    csvFiles?: ParsedSubFile[];
    originalZipName?: string;
    rawFileContent?: string | ArrayBuffer;
}

// Tipe-tipe untuk respons API QC
export interface QcSummaryItem {
    well_name: string;
    status: 'PASS' | 'MISSING_LOGS' | 'HAS_NULL' | 'EXTREME_VALUES' | 'ERROR';
    details: string;
}

export interface QcApiResponse {
    qc_summary: QcSummaryItem[];
    output_files: {
        [filename: string]: string; // nama file -> konten CSV sebagai string
    };
}

// Tipe data untuk plot Plotly
export interface PlotObject {
    data: Data[];
    layout: Partial<Layout>;
}
