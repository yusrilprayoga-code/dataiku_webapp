'use client';

import { Data, Layout } from 'plotly.js';
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';

// Tipe PlotType diperluas untuk mencakup semua kemungkinan layout dari kedua alur kerja
export type PlotType = 
  'default' | 'normalization' | 'smoothing' | 'porosity' | 'sw' | 
  'vsh' | 'rwa' | 'module2' | 'gsa' | 'rpbe-rgbe' | 'iqual' | 
  'swgrad' | 'dns-dnsv' | 'rt-ro' | 'splicing' | 
  'get-module1-plot'| 'normalization-prep'| 'smoothing-prep';

// Struktur data untuk sebuah objek plot dari Plotly
interface PlotFigure {
  data: Data[];
  layout: Partial<Layout>;
}

// Tipe untuk semua nilai yang akan disediakan oleh Context ke komponen lain
interface DashboardContextType {
  availableWells: string[];
  selectedWells: string[];
  toggleWellSelection: (well: string) => void;
  availableIntervals: string[];
  selectedIntervals: string[];
  toggleInterval: (interval: string) => void;
  availableZones: string[];
  selectedZones: string[];
  toggleZone: (zone: string) => void;
  wellColumns: Record<string, string[]>;
  plotType: PlotType;
  setPlotType: (type: PlotType) => void;
  plotFigure: PlotFigure;
  setPlotFigure: (figure: PlotFigure) => void;
  selectedFilePath: string | null;
  setSelectedFilePath: (path: string | null) => void;
  
  // Properti baru untuk manajemen plot terpusat
  isLoadingPlot: boolean;
  plotError: string | null;
  fetchPlotData: () => Promise<void>; // Fungsi utama untuk mengambil plot
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [availableWells, setAvailableWells] = useState<string[]>([]);
  const [availableIntervals, setAvailableIntervals] = useState<string[]>([]);
  const [availableZones, setAvailableZones] = useState<string[]>([]);
  const [selectedWells, setSelectedWells] = useState<string[]>([]);
  const [selectedIntervals, setSelectedIntervals] = useState<string[]>([]);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [wellColumns, setWellColumns] = useState<Record<string, string[]>>({});
  const [plotType, setPlotType] = useState<PlotType>('default');
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  
  // State terpusat untuk data plot, status loading, dan error
  const [plotFigure, setPlotFigure] = useState<PlotFigure>({ data: [], layout: {} });
  const [isLoadingPlot, setIsLoadingPlot] = useState(false);
  const [plotError, setPlotError] = useState<string | null>(null);
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // Mengambil daftar well & interval saat aplikasi pertama kali dimuat
  useEffect(() => {
    const fetchInitialData = async () => {
      // Mengambil daftar sumur
      try {
        if (!apiUrl) throw new Error("API URL is not configured.");
        const response = await fetch(`${apiUrl}/api/list-wells`);
        if (!response.ok) throw new Error('Failed to fetch well list');
        const wellNames: string[] = await response.json();
        if (Array.isArray(wellNames)) {
          setAvailableWells(wellNames);
        }
      } catch (error) {
        console.error("Failed to fetch well list:", error);
      }
      // Mengambil daftar interval
      try {
        const intervalsResponse = await fetch(`${apiUrl}/api/list-intervals`);
        if (!intervalsResponse.ok) throw new Error('Failed to fetch interval list');
        const intervalsData = await intervalsResponse.json();
        if (Array.isArray(intervalsData)) {
          setAvailableIntervals(intervalsData);
        }
      } catch (error) {
        console.error("Error fetching intervals:", error);
      }
      try {
        const zonesResponse = await fetch(`${apiUrl}/api/list-zones`);
        if (!zonesResponse.ok) throw new Error('Failed to fetch zone list');
        const zonesData = await zonesResponse.json();
        if (Array.isArray(zonesData)) {
          setAvailableZones(zonesData);
        }
      } catch (error) {
        console.error("Error fetching zones:", error);
      }
    };
    fetchInitialData();
  }, [apiUrl]);

  // Mengambil nama-nama kolom dari sumur yang dipilih di Dashboard
  useEffect(() => {
    const fetchWellColumns = async () => {
        if (selectedWells.length === 0) {
            setWellColumns({});
            return;
        }
        try {
            const response = await fetch(`${apiUrl}/api/get-well-columns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wells: selectedWells }),
            });
            if (!response.ok) throw new Error('Failed to fetch well columns');
            setWellColumns(await response.json());
        } catch (err) {
            console.error('Failed to fetch well columns:', err);
        }
    };
    fetchWellColumns();
  }, [selectedWells, apiUrl]);

  
  // --- FUNGSI UTAMA BARU: Pusat Logika Pengambilan Data Plot ---
  const fetchPlotData = useCallback(async () => {
    setIsLoadingPlot(true);
    setPlotError(null);
    setPlotFigure({ data: [], layout: {} }); // Selalu reset plot saat memulai fetch baru

    // Menentukan konteks: apakah dari Dashboard (well-based) atau Data Prep (file-based)
    const isDataPrepFlow = !!selectedFilePath;
    
    // Validasi input untuk menghentikan proses jika tidak perlu
    if (!isDataPrepFlow && selectedWells.length === 0) {
        setPlotFigure({ data: [], layout: { title: { text: 'Please select a well from the list.' } } });
        setIsLoadingPlot(false);
        return;
    }
    if (isDataPrepFlow && !selectedFilePath) {
        setPlotFigure({ data: [], layout: { title: { text: 'Please select a file from the browser.' } } });
        setIsLoadingPlot(false);
        return;
    }

    let endpointPath = '';
    let requestBody: unknown;

    // Tentukan endpoint dan body payload berdasarkan konteks
    if (isDataPrepFlow) {
        // Logika untuk alur kerja Data Prep (menggunakan file_path)
        switch (plotType) {
            case 'normalization-prep': endpointPath = '/api/get-normalization-prep-plot'; break;
            case 'smoothing-prep': endpointPath = '/api/get-smoothing-prep-plot'; break;
            case 'splicing': endpointPath = '/api/get-splicing-plot'; break;
            default: endpointPath = '/api/get-module1-plot'; break;
        }
        requestBody = { file_path: selectedFilePath };
    } else {
        // Logika untuk alur kerja Dashboard (menggunakan selected_wells)
        switch (plotType) {
            case 'normalization':
              endpointPath = '/api/get-normalization-plot';
              break;
            case 'smoothing':
              endpointPath = '/api/get-smoothing-plot';
              break;
            case 'splicing':
              endpointPath = '/api/get-splicing-plot';
              break;
            case 'porosity':
              endpointPath = '/api/get-porosity-plot';
              break;
            case 'gsa':
              endpointPath = '/api/get-gsa-plot';
              break;
            case 'vsh':
              endpointPath = '/api/get-vsh-plot';
              break;
            case 'sw':
              endpointPath = '/api/get-sw-plot';
              break;
            case 'rwa':
              endpointPath = '/api/get-rwa-plot';
              break;
            case 'module2':
              endpointPath = '/api/get-module2-plot';
              break;
            case 'rpbe-rgbe':
              endpointPath = '/api/get-rgbe-rpbe-plot';
              break;
            case 'iqual':
              endpointPath = '/api/get-iqual';
              break;
            case 'swgrad':
              endpointPath = '/api/get-swgrad-plot';
              break;
            case 'dns-dnsv':
              endpointPath = '/api/get-dns-dnsv-plot';
              break;
            case 'rt-ro':
              endpointPath = '/api/get-rt-r0-plot';
              break;
            default: endpointPath = '/api/get-plot'; break;
        }
        requestBody = { selected_wells: selectedWells, selected_intervals: selectedIntervals };
    }

    try {
        const response = await fetch(`${apiUrl}${endpointPath}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch plot from server');
        
        const plotData = await response.json();
        const parsed = typeof plotData === 'string' ? JSON.parse(plotData) : plotData;

        if (parsed && (parsed.data || parsed.layout)) {
             setPlotFigure({ data: parsed.data || [], layout: parsed.layout || {} });
        } else {
            throw new Error("Invalid plot data structure received from server.");
        }
    } catch (err) {
        console.error(`Error fetching plot for type "${plotType}":`, err);
        setPlotError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
        setIsLoadingPlot(false);
    }
  }, [apiUrl, plotType, selectedFilePath, selectedWells, selectedIntervals]);


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

  const toggleZone = (zone: string) => {
    setSelectedZones(prev =>
      prev.includes(zone)
        ? prev.filter(z => z !== zone)
        : [...prev, zone]
    );
  };

  // Kumpulkan semua nilai yang akan disediakan oleh provider
  const value: DashboardContextType = {
    availableWells,
    selectedWells,
    toggleWellSelection,
    availableIntervals,
    selectedIntervals,
    toggleInterval,
    availableZones,
    selectedZones,
    toggleZone,
    wellColumns,
    plotType,
    setPlotType,
    plotFigure,
    setPlotFigure,
    selectedFilePath,
    setSelectedFilePath,
    // Nilai-nilai baru yang disediakan oleh context
    isLoadingPlot,
    plotError,
    fetchPlotData,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

// Hook kustom untuk memudahkan penggunaan context di komponen lain
export const useDashboard = (): DashboardContextType => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};