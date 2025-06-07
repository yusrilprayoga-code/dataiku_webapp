// stores/appDataStore.ts
import { create } from 'zustand';
import { FileData as Page1FileData, ParsedSubFile as Page1ParsedSubFile } from '../app/input/types'; // Adjust path to your types

export interface ProcessedFileDataForDisplay {
  id: string;
  name: string;
  originalName?: string;
  structurePath?: string;
  type: 'las-as-csv' | 'csv';
  content: any[];
  headers: string[];
  rawContentString: string; // <--- ADD THIS PROPERTY
}

// The StagedStructure interface remains the same, as it uses the type above
export interface StagedStructure {
  userDefinedStructureName: string;
  files: ProcessedFileDataForDisplay[];
}

interface AppDataState {
  stagedStructure: StagedStructure | null;
  setStagedStructure: (structure: StagedStructure | null) => void;
  clearStagedStructure: () => void;
}

export const useAppDataStore = create<AppDataState>((set) => ({
  stagedStructure: null,
  setStagedStructure: (structure) => set({ stagedStructure: structure }),
  clearStagedStructure: () => set({ stagedStructure: null }),
}));