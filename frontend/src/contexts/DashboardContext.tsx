import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

export type PlotType = 'default' | 'normalization' | 'porosity' | 'gsa';

interface DashboardContextType {
  availableWells: string[];
  selectedWells: string[];  
  toggleWellSelection: (well: string) => void; 
  selectedIntervals: string[];
  toggleInterval: (interval: string) => void;
  plotType: PlotType;
  setPlotType: (type: PlotType) => void;
  wellColumns: Record<string, string[]>;
  fetchWellColumns: (wells: string[]) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [availableWells, setAvailableWells] = useState<string[]>([]);
  const [selectedWells, setSelectedWells] = useState<string[]>(['ABB-035']);
  const [selectedIntervals, setSelectedIntervals] = useState<string[]>(['B1', 'GUF']);
  const [plotType, setPlotType] = useState<PlotType>('default');
const [wellColumns, setWellColumns] = useState<Record<string, string[]>>({});

    useEffect(() => {
    const fetchWells = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5001/api/list-wells');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        if (Array.isArray(data)) {
          setAvailableWells(data);
          // Secara otomatis pilih sumur pertama sebagai default jika ada
          if (data.length > 0 && selectedWells.length === 0) {
            setSelectedWells([data[0]]);
          }
        }
      } catch (error) {
        console.error("Gagal mengambil daftar sumur:", error);
      }
    };
    fetchWells();
  }, [selectedWells.length]);

    const fetchWellColumns = async (wells: string[]) => {
    try {
      const response = await fetch('http://127.0.0.1:5001/api/get-well-columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wells }),
      });
      if (!response.ok) throw new Error('Network error saat ambil kolom well');

      const data = await response.json();
      setWellColumns(data); 
    } catch (err) {
      console.error('Gagal mengambil kolom well:', err);
    }
  };

  useEffect(() => {
    if (selectedWells.length > 0) {
      fetchWellColumns(selectedWells);
    }
  }, [selectedWells]);

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

  const value = { availableWells, selectedWells, toggleWellSelection, selectedIntervals, toggleInterval, plotType, setPlotType, wellColumns, fetchWellColumns };

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