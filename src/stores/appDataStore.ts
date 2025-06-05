// stores/appDataStore.ts
import { create } from 'zustand';
import { FileData as Page1FileData, ParsedSubFile as Page1ParsedSubFile } from '../app/input/types'; // Adjust path to your types

// Define the structure for data displayed on Page 2
export interface ProcessedFileDataForDisplay {
  id: string;
  name: string; // e.g., "WellA_Structure/log.las" or "markers.csv"
  originalName?: string; // e.g. "log.las"
  structurePath?: string; // e.g. "WellA_Structure" if it came from a zip structure
  type: 'las-as-csv' | 'csv'; // Indicates origin for display/processing
  content: any[];
  headers: string[];
}

export interface StagedStructure {
  userDefinedStructureName: string; // The name user inputs
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