// /src/contexts/DashboardContext.tsx

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { getProcessedWellList } from '@/lib/db';

export type PlotType = 'default' | 'normalization' | 'porosity';

interface DashboardContextType {
  availableWells: string[];
  selectedWells: string[];
  toggleWellSelection: (well: string) => void;
  selectedIntervals: string[];
  toggleInterval: (interval: string) => void;
  plotType: PlotType;
  setPlotType: (type: PlotType) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [availableWells, setAvailableWells] = useState<string[]>([]);
  const [selectedWells, setSelectedWells] = useState<string[]>([]); // Start with empty, will be populated
  const [selectedIntervals, setSelectedIntervals] = useState<string[]>(['B1', 'GUF']);
  const [plotType, setPlotType] = useState<PlotType>('default');

  useEffect(() => {
    const fetchWellsFromDb = async () => {
      try {
        // --- THIS IS THE FIX ---
        // We now fetch from the list of PROCESSED wells
        const wellNames = await getProcessedWellList();

        setAvailableWells(wellNames);

        if (wellNames.length > 0 && selectedWells.length === 0) {
          setSelectedWells([wellNames[0]]);
        }
      } catch (error) {
        console.error("Failed to fetch processed well list from IndexedDB:", error);
      }
    };

    fetchWellsFromDb();
  }, []);

  const toggleWellSelection = (well: string) => {
    setSelectedWells(prev =>
      prev.includes(well) ? prev.filter(w => w !== well) : [...prev, well]
    );
  };

  const toggleInterval = (interval: string) => {
    setSelectedIntervals(prev =>
      prev.includes(interval)
        ? prev.filter(i => i !== interval)
        : [...prev, interval]
    );
  };

  const value = { availableWells, selectedWells, toggleWellSelection, selectedIntervals, toggleInterval, plotType, setPlotType };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = (): DashboardContextType => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};