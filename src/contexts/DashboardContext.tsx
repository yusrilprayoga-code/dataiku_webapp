'use client';

import { Data, Layout } from 'plotly.js';
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useRef } from 'react';

export type PlotType = 
  'default' | 'normalization' | 'smoothing' | 'porosity' | 'sw' | 
  'vsh' | 'rwa' | 'module2' | 'gsa' | 'rpbe-rgbe' | 'iqual' | 
  'swgrad' | 'dns-dnsv' | 'rt-ro' | 'module3' | 'splicing' | 
  'get-module1-plot'| 'normalization-prep'| 'smoothing-prep';

interface PlotFigure {
  data: Data[];
  layout: Partial<Layout>;
}

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
  fetchWellColumns: (wells: string[]) => Promise<void>;
  isLoadingPlot: boolean;
  plotError: string | null;
  fetchPlotData: () => Promise<void>;
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

  const [plotFigure, setPlotFigure] = useState<PlotFigure>({ data: [], layout: {} });
  const [isLoadingPlot, setIsLoadingPlot] = useState(false);
  const [plotError, setPlotError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  // refs untuk deduplikasi
  const fetchedWellsRef = useRef<Set<string>>(new Set());
  const inflightWellsRef = useRef<Set<string>>(new Set());

  // Ambil daftar wells & intervals saat mount (tetap sama)
  useEffect(() => {
    const fetchInitialData = async () => {
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

      try {
        const intervalsResponse = await fetch(`${apiUrl}/api/list-intervals`);
        if (intervalsResponse.ok) {
          const intervalsData = await intervalsResponse.json();
          if (Array.isArray(intervalsData)) {
            setAvailableIntervals(intervalsData);
          }
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

  // fetchWellColumns: hanya fetch wells yang belum pernah di-fetch dan tidak sedang inflight
  const fetchWellColumns = useCallback(async (wells: string[]) => {
    if (!apiUrl) {
      console.warn('API URL not set, cannot fetch well columns');
      return;
    }
    if (!wells || wells.length === 0) {
      // jika tidak ada wells terpilih, reset
      setWellColumns({});
      fetchedWellsRef.current.clear();
      return;
    }

    // cari wells yang belum pernah di-fetch dan tidak sedang inflight
    const wellsToFetch = wells.filter(w => 
      !fetchedWellsRef.current.has(w) && !inflightWellsRef.current.has(w)
    );

    if (wellsToFetch.length === 0) {
      // tidak perlu fetch apapun
      return;
    }

    // tandai sebagai inflight
    wellsToFetch.forEach(w => inflightWellsRef.current.add(w));

    try {
      const response = await fetch(`${apiUrl}/api/get-well-columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wells: wellsToFetch }),
      });
      if (!response.ok) throw new Error('Failed to fetch well columns');
      const data = await response.json(); // ekspektasi: { wellA: [...], wellB: [...] }

      // gabungkan dengan state lama
      setWellColumns(prev => ({ ...prev, ...data }));

      // tandai sebagai sudah di-fetch
      wellsToFetch.forEach(w => {
        fetchedWellsRef.current.add(w);
        inflightWellsRef.current.delete(w);
      });
    } catch (err) {
      // hapus tanda inflight jika terjadi error supaya bisa dicoba lagi
      wellsToFetch.forEach(w => inflightWellsRef.current.delete(w));
      console.error('Failed to fetch well columns:', err);
    }
  }, [apiUrl]);

  // Ketika selectedWells berubah, minta kolom hanya untuk wells yang belum ada
  useEffect(() => {
    if (selectedWells.length === 0) {
      setWellColumns({});
      fetchedWellsRef.current.clear();
      inflightWellsRef.current.clear();
      return;
    }
    // panggil fetch (fetchWellColumns stabil kecuali apiUrl berubah)
    fetchWellColumns(selectedWells);
  }, [selectedWells, fetchWellColumns]);

  // --- FUNGSI UTAMA BARU: Pusat Logika Pengambilan Data Plot ---
  const fetchPlotData = useCallback(async () => {
    setIsLoadingPlot(true);
    setPlotError(null);
    setPlotFigure({ data: [], layout: {} });

    const isDataPrepFlow = !!selectedFilePath;
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

    if (isDataPrepFlow) {
      switch (plotType) {
        case 'normalization-prep': endpointPath = '/api/get-normalization-prep-plot'; break;
        case 'smoothing-prep': endpointPath = '/api/get-smoothing-prep-plot'; break;
        case 'splicing': endpointPath = '/api/get-splicing-plot'; break;
        default: endpointPath = '/api/get-module1-plot'; break;
      }
      requestBody = { file_path: selectedFilePath };
    } else {
      switch (plotType) {
        case 'normalization': endpointPath = '/api/get-normalization-plot'; break;
        case 'smoothing': endpointPath = '/api/get-smoothing-plot'; break;
        case 'splicing': endpointPath = '/api/get-splicing-plot'; break;
        case 'porosity': endpointPath = '/api/get-porosity-plot'; break;
        case 'gsa': endpointPath = '/api/get-gsa-plot'; break;
        case 'vsh': endpointPath = '/api/get-vsh-plot'; break;
        case 'sw': endpointPath = '/api/get-sw-plot'; break;
        case 'rwa': endpointPath = '/api/get-rwa-plot'; break;
        case 'module2': endpointPath = '/api/get-module2-plot'; break;
        case 'rpbe-rgbe': endpointPath = '/api/get-rgbe-rpbe-plot'; break;
        case 'iqual': endpointPath = '/api/get-iqual'; break;
        case 'swgrad': endpointPath = '/api/get-swgrad-plot'; break;
        case 'dns-dnsv': endpointPath = '/api/get-dns-dnsv-plot'; break;
        case 'rt-ro': endpointPath = '/api/get-rt-r0-plot'; break;
        case 'module3': endpointPath = '/api/get-module3-plot'; break;
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
    fetchWellColumns,
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

export const useDashboard = (): DashboardContextType => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
