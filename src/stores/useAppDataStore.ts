/* eslint-disable @typescript-eslint/no-unused-vars */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { type Data, type Layout } from 'plotly.js';
import {
  PlotData,
  StagedStructure,
  QCResponse,
  PreviewableFile,
} from '@/types';

interface FolderStructure {
  [field: string]: string[]; // Contoh: { "Adera": ["Abab", "Benuang"], "Limau": [...] }
}

// FIX #1: Definisikan tipe untuk parameter VSH di sini
interface VshParams {
  gr_ma: number;
  gr_sh: number;
}

interface VshDNParams {
  rhob_ma: number;
  rhob_sh: number;
  nphi_ma: number;
  nphi_sh: number;
  prcnt_qz: number;
  prcnt_wtr: number;
}

// Interface AppState sekarang bisa menemukan tipe VshParams
interface AppState {
  // --- State for Data Input & QC Process ---
  stagedStructure: StagedStructure | null;
  qcResults: QCResponse | null;
  handledFiles: PreviewableFile[];
  normalizationResults: Record<string, PlotData>;

  // --- State for Dashboard Interaction ---
  selectedWell: string | null;
  selectedIntervals: string[];
  plotData: Data[];
  plotLayout: Partial<Layout>;
  isLoadingPlot: boolean;
  plotError: string | null;

  folderStructure: FolderStructure;
  selectedField: string | null;
  selectedStructure: string | null;

  fetchFolderStructure: () => Promise<void>;
  setSelectedField: (field: string | null) => void;
  setSelectedStructure: (structure: string | null) => void;

  // State baru untuk menyimpan parameter VSH
  vshParams: VshParams;
  vshDNParams: VshDNParams;
  // Aksi baru untuk memperbarui parameter VSH
  setVshParams: (params: VshParams) => void;
  setVshDNParams: (params: VshDNParams) => void;

  wellsDir: string;
  fieldName: string;
  wellFolder: string;
  structureName: string;

  setWellsDir: (path: string) => void;
  setStructure: (field: string, structure: string, wellFolder: string) => void;

  // --- Actions ---
  setStagedStructure: (structure: StagedStructure) => void;
  setQcResults: (results: QCResponse | null) => void;
  addHandledFile: (file: PreviewableFile) => void;
  addNormalizationResult: (id: string, plot: PlotData) => void;
  clearQcResults: () => void;
  clearNormalizationResults: () => void;
  clearAllData: () => void;
  setSelectedWell: (well: string) => void;
  toggleInterval: (interval: string) => void;
  fetchPlotData: (wellId: string) => Promise<void>;
}

export const useAppDataStore = create<AppState>()(
  persist(
    (set, get) => ({
      // --- Initial State ---
      stagedStructure: null,
      qcResults: null,
      handledFiles: [],
      normalizationResults: {},
      selectedWell: '',
      selectedIntervals: [],
      plotData: [],
      plotLayout: {},
      isLoadingPlot: true,
      plotError: null,

      folderStructure: {},
      selectedField: null,
      selectedStructure: null,

      // FIX #2: Tambahkan nilai awal untuk vshParams
      vshParams: {
        gr_ma: 30, // Nilai default
        gr_sh: 120, // Nilai default
      },
      vshDNParams: {
        rhob_ma: 2.645, // Nilai default
        rhob_sh: 2.61,  // Nilai default
        nphi_ma: -0.02, // Nilai default
        nphi_sh: 0.398, // Nilai default
        prcnt_qz: 5,
        prcnt_wtr: 5
      },

      
      wellsDir: 'data/structures/adera/benuang',
      fieldName: 'adera',
      structureName: 'benuang',
      wellFolder: 'BNG-057',

      setWellsDir: (path) => {
        console.log(`Updating wellsDir to: ${path}`);
        set({ wellsDir: path });
      },

      setStructure: (field, structure, wellFolder) => {
        const newWellsDir = `data/structures/${field.toLowerCase()}/${structure.toLowerCase()}`;
        console.log(`Updating structure settings:
          fieldName: ${field.toLowerCase()}
          structureName: ${structure.toLowerCase()}
          wellFolder: ${wellFolder.toLowerCase()}
          wellsDir: ${newWellsDir}`);
        
        set({
          fieldName: field.toLowerCase(),
          structureName: structure.toLowerCase(),
          wellFolder: wellFolder.toLowerCase(),
          wellsDir: newWellsDir
        });
      },


      // --- Actions Implementation ---
      setStagedStructure: (structure: StagedStructure) => set({ stagedStructure: structure }),
      setQcResults: (results: QCResponse | null) => set({ qcResults: results }),
      addHandledFile: (file: PreviewableFile) => set((state) => ({
        handledFiles: [...state.handledFiles, file]
      })),
      addNormalizationResult: (id: string, plot: PlotData) => set(state => ({
        normalizationResults: { ...state.normalizationResults, [id]: plot }
      })),
      clearQcResults: () => set({ qcResults: null, handledFiles: [] }),
      clearNormalizationResults: () => set({ normalizationResults: {} }),
      clearAllData: () => set({
        stagedStructure: null,
        qcResults: null,
        handledFiles: [],
        normalizationResults: {},
        vshParams: { gr_ma: 30, gr_sh: 120 },
        vshDNParams: { rhob_ma: 2.645, rhob_sh: 2.61, nphi_ma: -0.02, nphi_sh: 0.398, prcnt_qz: 5, prcnt_wtr: 5 },
      }),
      setSelectedWell: (well: string) => {
        set({ selectedWell: well });
        get().fetchPlotData(well);
      },
      toggleInterval: (interval: string) =>
        set((state) => ({
          selectedIntervals: state.selectedIntervals.includes(interval)
            ? state.selectedIntervals.filter((i) => i !== interval)
            : [...state.selectedIntervals, interval],
        })),
      
      setVshParams: (params: VshParams) => set({ vshParams: params }),
      setVshDNParams: (params: VshDNParams) => set({ vshDNParams: params }),

      fetchPlotData: async (wellId: string) => {
        // ... logika fetch Anda ...
      },

      fetchFolderStructure: async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL;
          const response = await fetch(`${apiUrl}/api/get-folder-structure`);
          if (!response.ok) throw new Error("Failed to fetch folder structure");
          const structure: FolderStructure = await response.json();
          set({ folderStructure: structure, selectedField: null, selectedStructure: null });
        } catch (error) {
          console.error("Error fetching folder structure:", error);
          // Set state kosong jika gagal
          set({ folderStructure: {} });
        }
      },
      setSelectedField: (field) => {
        // Saat field diganti, reset pilihan structure
        set({ selectedField: field, selectedStructure: null });
      },
      setSelectedStructure: (structure) => set({ selectedStructure: structure }),
    }),
    {
      name: 'app-data-storage',
      partialize: (state) => ({
        selectedWell: state.selectedWell,
        selectedIntervals: state.selectedIntervals,
        vshParams: state.vshParams,
        vshDNParams: state.vshDNParams,
        wellsDir:state.wellsDir
      }),
      storage: createJSONStorage(() => localStorage),
    }
  )
);
