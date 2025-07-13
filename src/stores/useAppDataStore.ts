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

interface VshDNParams {
  rho_ma: number;
  rho_sh: number;
  nphi_ma: number;
  nphi_sh: number;
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

  // State baru untuk menyimpan parameter VSH
  vshParams: VshParams;
  vshDNParams: VshDNParams;
  // Aksi baru untuk memperbarui parameter VSH
  setVshParams: (params: VshParams) => void;
  setVshDNParams: (params: VshDNParams) => void;

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
      selectedWell: 'ABAB-035',
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

      vshDNParams: {
        rho_ma: 2.645, // Nilai default
        rho_sh: 2.61, // Nilai default
        nphi_ma: -0.02, // Nilai default
        nphi_sh: 0.398, // Nilai default
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
      clearQcResults: () => set({ qcResults: null, handledFiles: [] }),
      clearNormalizationResults: () => set({ normalizationResults: {} }),
      clearAllData: () => set({
        stagedStructure: null,
        qcResults: null,
        handledFiles: [],
        normalizationResults: {},
        // Anda mungkin juga ingin mereset vshParams di sini
        vshParams: { gr_ma: 30, gr_sh: 120 },
        vshDNParams: { rho_ma: 2.645, rho_sh: 2.61, nphi_ma: -0.02, nphi_sh: 0.398 },
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
      
      setVshParams: (params) => set({ vshParams: params }),
      setVshDNParams: (params) => set({ vshDNParams: params }),

      fetchPlotData: async (wellId) => {
        // ... logika fetch Anda ...
      },
    }),
    {
      name: 'app-data-storage',
      partialize: (state) => ({
        selectedWell: state.selectedWell,
        selectedIntervals: state.selectedIntervals,
        vshParams: state.vshParams,
        vshDNParams: state.vshDNParams,
      }),
      storage: createJSONStorage(() => localStorage),
    }
  )
);
