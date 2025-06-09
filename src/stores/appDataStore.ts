import { create } from 'zustand';
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

interface AppDataState {
  stagedStructure: StagedStructure | null;
  qcResults: QCResponse | null;
  handledFiles: PreviewableFile[];
  
  setStagedStructure: (structure: StagedStructure | null) => void;
  setQcResults: (results: QCResponse | null) => void;
  addHandledFile: (file: PreviewableFile) => void;
  
  clearQcResults: () => void;
  clearAllData: () => void;
}

export const useAppDataStore = create<AppDataState>((set) => ({
  stagedStructure: null,
  qcResults: null,
  handledFiles: [],
  
  setStagedStructure: (structure) => set({ stagedStructure: structure }),
  setQcResults: (results) => set({ qcResults: results }),
  addHandledFile: (file) => set((state) => ({ handledFiles: [...state.handledFiles, file] })),
  
  clearQcResults: () => set({ qcResults: null, handledFiles: [] }),
  
  clearAllData: () => set({ 
    stagedStructure: null, 
    qcResults: null, 
    handledFiles: [] 
  }),
}));