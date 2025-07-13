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

// FIX #1: Definisikan tipe untuk parameter VSH di sini
interface VshParams {
  gr_ma: number;
  gr_sh: number;
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
  selectedWells: string[]; // Add this line
  selectedIntervals: string[];
  plotData: Data[];
  plotLayout: Partial<Layout>;
  isLoadingPlot: boolean;
  plotError: string | null;

  // State baru untuk menyimpan parameter VSH
  vshParams: VshParams;
  // Aksi baru untuk memperbarui parameter VSH
  setVshParams: (params: VshParams) => void;

  // --- Actions ---
  setStagedStructure: (structure: StagedStructure) => void;
  setQcResults: (results: QCResponse | null) => void;
  addHandledFile: (file: PreviewableFile) => void;
  addNormalizationResult: (id: string, plot: PlotData) => void;
  clearQcResults: () => void;
  clearNormalizationResults: () => void;
  clearAllData: () => void;
  setSelectedWell: (well: string) => void;
  setSelectedWells: (wells: string[]) => void; // Add this line
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
      selectedWell: 'ABAB-035',
      selectedWells: [], // Add this line
      selectedIntervals: ['B1', 'GUF'],
      plotData: [],
      plotLayout: {},
      isLoadingPlot: true,
      plotError: null,

      // FIX #2: Tambahkan nilai awal untuk vshParams
      vshParams: {
        gr_ma: 30, // Nilai default
        gr_sh: 120, // Nilai default
      },

      // --- Actions Implementation ---
      setStagedStructure: (structure) => set({ stagedStructure: structure }),
      setQcResults: (results) => set({ qcResults: results }),
      addHandledFile: (file) => set((state) => ({
        handledFiles: [...state.handledFiles, file]
      })),
      addNormalizationResult: (id, plot) => set(state => ({
        normalizationResults: { ...state.normalizationResults, [id]: plot }
      })),
      setSelectedWells: (wells) => set({ selectedWells: wells }), // Add this line
      clearQcResults: () => set({ qcResults: null, handledFiles: [] }),
      clearNormalizationResults: () => set({ normalizationResults: {} }),
      clearAllData: () => set({
        stagedStructure: null,
        qcResults: null,
        handledFiles: [],
        normalizationResults: {},
        selectedWells: [], // Add this line
        vshParams: { gr_ma: 30, gr_sh: 120 },
      }),
      setSelectedWell: (well) => {
        set({ selectedWell: well });
        get().fetchPlotData(well);
      },
      toggleInterval: (interval) =>
        set((state) => ({
          selectedIntervals: state.selectedIntervals.includes(interval)
            ? state.selectedIntervals.filter((i) => i !== interval)
            : [...state.selectedIntervals, interval],
        })),

      // FIX #3: Tambahkan implementasi untuk aksi setVshParams
      setVshParams: (params) => set({ vshParams: params }),

      fetchPlotData: async (wellId) => {
        // ... logika fetch Anda ...
      },
    }),
    {
      name: 'app-data-storage',
      partialize: (state) => ({
        selectedWell: state.selectedWell,
        selectedIntervals: state.selectedIntervals,
        // (Opsional) Simpan juga parameter VSH agar tidak hilang saat refresh
        vshParams: state.vshParams,
      }),
      storage: createJSONStorage(() => localStorage),
    }
  )
);
