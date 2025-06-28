// /src/contexts/DashboardContext.tsx

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

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
    const fetchWells = async () => {
      try {
        // --- THIS IS THE FIX ---
        // 1. Get the base URL from our environment variable.
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) {
          console.error("API URL is not configured. Please set NEXT_PUBLIC_API_URL.");
          return;
        }

        // 2. Construct the full endpoint.
        const endpoint = `${apiUrl}/api/list-wells`;
        console.log(`Fetching available wells from: ${endpoint}`);

        // 3. Use the full endpoint in the fetch call.
        const response = await fetch(endpoint);

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setAvailableWells(data);

          // Automatically select the first well as the default if one isn't already selected.
          if (data.length > 0 && selectedWells.length === 0) {
            setSelectedWells([data[0]]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch well list:", error);
      }
    };

    fetchWells();
    // The dependency array should be empty to ensure this only runs once on mount.
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