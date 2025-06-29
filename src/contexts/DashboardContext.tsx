// /src/contexts/DashboardContext.tsx

'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
// REMOVE this import, we no longer get data from the client's DB
// import { getProcessedWellList } from '@/lib/db'; 

export type PlotType = 'default' | 'normalization' | 'porosity' | 'gsa';

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
  const [selectedWells, setSelectedWells] = useState<string[]>([]);
  const [selectedIntervals, setSelectedIntervals] = useState<string[]>(['B1', 'GUF']);
  const [plotType, setPlotType] = useState<PlotType>('default');

  useEffect(() => {
    // --- THIS IS THE NEW LOGIC ---
    // This function now fetches the well list directly from your stateful backend API.
    const fetchWellsFromServer = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) {
          throw new Error("API URL is not configured.");
        }

        const endpoint = `${apiUrl}/api/list-wells`;
        console.log(`Fetching available wells from server: ${endpoint}`);

        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error('Network response from /api/list-wells was not ok');
        }

        const wellNames: string[] = await response.json();

        if (Array.isArray(wellNames)) {
          setAvailableWells(wellNames);

          // Automatically select the first well if none are selected
          if (wellNames.length > 0 && selectedWells.length === 0) {
            setSelectedWells([wellNames[0]]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch well list from server:", error);
      }
    };

    fetchWellsFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once when the provider mounts

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