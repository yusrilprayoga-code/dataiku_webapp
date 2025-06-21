// src/types/index.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Layout, type Data } from 'plotly.js';

// Represents the structure of a Plotly chart object.
// This replaces the old `PlotObject` for consistency.
export interface PlotData {
  data: Data[];
  layout: Partial<Layout>;
}

// --- Types from your original code ---
export interface ProcessedFileDataForDisplay {
  id: string;
  name: string;
  originalName?: string;
  structurePath?: string;
  type: 'las-as-csv' | 'csv';
  content: any[];
  headers: string[];
  rawContentString: string;
}

export interface StagedStructure {
  userDefinedStructureName: string;
  files: ProcessedFileDataForDisplay[];
}

export type QCStatus = 'PASS' | 'MISSING_LOGS' | 'HAS_NULL' | 'EXTREME_VALUES' | 'ERROR' | 'HANDLED_NULLS';

export interface QCResult {
  well_name: string;
  status: QCStatus;
  details: string;
}

export interface QCResponse {
  qc_summary: QCResult[];
  output_files: Record<string, string>;
}

export interface PreviewableFile {
  id: string;
  name:string;
  content: any[];
  headers: string[];
}

// -- Other types you provided ---
export interface LogDataRow {
  DEPTH: number;
  MARKER: string;
  NPHI?: number | null;
  RHOB?: number | null;
  [key: string]: any;
}