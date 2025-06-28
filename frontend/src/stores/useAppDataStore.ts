import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { type Data, type Layout } from 'plotly.js';
import {
  PlotData,
  StagedStructure,
  QCResponse,
  PreviewableFile,
} from '@/types';

// Define the shape of our application's unified state
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
  // Data Input & QC Actions
  setStagedStructure: (structure: StagedStructure) => void;
  setQcResults: (results: QCResponse | null) => void;
  addHandledFile: (file: PreviewableFile) => void;
  addNormalizationResult: (id: string, plot: PlotData) => void;
  clearQcResults: () => void;
  clearNormalizationResults: () => void;
  clearAllData: () => void;

  // Dashboard Actions
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

      // --- Actions Implementation ---
      setStagedStructure: (structure) => set({ stagedStructure: structure }),
      setQcResults: (results) => set({ qcResults: results }),
      addHandledFile: (file) => set((state) => ({
        handledFiles: [...state.handledFiles, file]
      })),

      addNormalizationResult: (id, plot) => set(state => ({
        normalizationResults: {
          ...state.normalizationResults,
          [id]: plot
        }
      })),

      clearQcResults: () => set({
        qcResults: null,
        handledFiles: []
      }),

      clearNormalizationResults: () => set({
        normalizationResults: {}
      }),

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
        if (!wellId) return;
        set({ isLoadingPlot: true, plotError: null });
        try {
          const response = await fetch(`/api/get-plot?well=${wellId}`);
          if (!response.ok) throw new Error(`Failed to fetch plot data for ${wellId}`);

          const plotObject: PlotData = await response.json();
          set({
            plotData: plotObject.data,
            plotLayout: plotObject.layout,
            isLoadingPlot: false,
          });
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
          set({ plotError: errorMessage, isLoadingPlot: false });
        }
      },
    }),
    {
      name: 'app-data-storage',
      partialize: (state) => ({
        // Only persist critical navigation state
        stagedStructure: state.stagedStructure,
        qcResults: state.qcResults,
        handledFiles: state.handledFiles,

        // Don't persist heavy visualization states
        // These will be re-fetched as needed
      }),
      storage: createJSONStorage(() => localStorage),
    }
  )
);