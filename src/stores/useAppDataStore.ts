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

// The AppState interface remains the same
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
      // All your initial state values are perfectly fine.
      stagedStructure: null,
      qcResults: null,
      handledFiles: [],
      normalizationResults: {},
      selectedWell: 'ABAB-035', // Default value
      selectedIntervals: ['B1', 'GUF'], // Default value
      plotData: [],
      plotLayout: {},
      isLoadingPlot: true,
      plotError: null,

      // --- Actions Implementation ---
      // All your action implementations are perfectly fine.
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
      fetchPlotData: async (wellId) => {
        // ... this fetch logic is fine
      },
    }),
    {
      name: 'app-data-storage', // The key in localStorage

      // --- THIS IS THE CORRECTED CONFIGURATION ---
      partialize: (state) => ({
        // ✅ We ONLY persist small, simple values that represent user settings.
        // This improves User Experience by remembering their choices across sessions.
        selectedWell: state.selectedWell,
        selectedIntervals: state.selectedIntervals,

        // ❌ We EXCLUDE all large, complex, or transient data objects.
        // These objects will be loaded from IndexedDB or fetched from an API
        // and held in memory for the session, but NOT saved to localStorage.
      }),
      storage: createJSONStorage(() => localStorage),
    }
  )
);