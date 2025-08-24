'use client';

import { useAppDataStore } from '@/stores/useAppDataStore';
import { usePathname } from 'next/navigation';
import { Data, Layout } from 'plotly.js';
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useRef } from 'react';

export type PlotType =
  'default' | 'normalization' | 'smoothing' | 'porosity' | 'sw' |
  'vsh' | 'rwa' | 'module2' | 'gsa' | 'rpbe-rgbe' | 'iqual' |
  'swgrad' | 'dns-dnsv' | 'rt-ro' | 'module3' | 'splicing' |
  'get-module1-plot' | 'normalization-prep' | 'smoothing-prep' | 'fill-missing-prep' | 'custom' | 'trimming' | 'depth-matching';

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
  selectedCustomColumns: string[];
  toggleCustomColumn: (column: string) => void;
  fetchPlotData: () => Promise<void>;
  columnError: string | null;
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
  const [selectedCustomColumns, setSelectedCustomColumns] = useState<string[]>([]);
  const [plotType, setPlotType] = useState<PlotType>('default');
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  const [plotFigure, setPlotFigure] = useState<PlotFigure>({ data: [], layout: {} });
  const [isLoadingPlot, setIsLoadingPlot] = useState(false);
  const [plotError, setPlotError] = useState<string | null>(null);
  const [columnError, setColumnError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  const pathname = usePathname();
  const isDataPrep = pathname.startsWith('/data-prep');
  const { wellsDir } = useAppDataStore();

  const fetchedWellsRef = useRef<Set<string>>(new Set());
  const inflightWellsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchInitialData = async () => {
      if (isDataPrep || !wellsDir) {
        setAvailableWells([]);
        setAvailableIntervals([]);
        setAvailableZones([]);
        return;
      }
      try {
        if (!apiUrl) throw new Error("API URL is not configured.");
        const wellsResponse = await fetch(`${apiUrl}/api/list-wells`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_path: wellsDir }),
        });
        if (!wellsResponse.ok) throw new Error('Failed to fetch well list');
        const wellNames: string[] = await wellsResponse.json();
        if (Array.isArray(wellNames)) setAvailableWells(wellNames);
      } catch (error) {
        console.error("Failed to fetch well list:", error);
      }
      try {
        const intervalsResponse = await fetch(`${apiUrl}/api/list-intervals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_path: wellsDir }),
        });
        if (intervalsResponse.ok) {
          const intervalsData = await intervalsResponse.json();
          if (Array.isArray(intervalsData)) setAvailableIntervals(intervalsData);
        }
      } catch (error) {
        console.error("Error fetching intervals:", error);
      }
      try {
        const zonesResponse = await fetch(`${apiUrl}/api/list-zones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ full_path: wellsDir }),
        });
        if (!zonesResponse.ok) throw new Error('Failed to fetch zone list');
        const zonesData = await zonesResponse.json();
        if (Array.isArray(zonesData)) setAvailableZones(zonesData);
      } catch (error) {
        console.error("Error fetching zones:", error);
      }
    };
    fetchInitialData();
  }, [apiUrl, isDataPrep, wellsDir]);

   const fetchWellColumns = useCallback(async (wells: string[]) => {
    if (!apiUrl) {
      console.warn('API URL not set, cannot fetch well columns');
      return;
    }
    const wellsToFetch = wells.filter(w => !fetchedWellsRef.current.has(w) && !inflightWellsRef.current.has(w));
    if (wellsToFetch.length === 0) return;

    let requestBody;
    if (isDataPrep) {
      requestBody = { wells: wellsToFetch };
    } else {
      if (!wellsDir) {
        console.warn("wellsDir is not set; cannot fetch columns for dashboard.");
        return;
      }
      requestBody = { full_path: wellsDir, wells: wellsToFetch };
    }

    wellsToFetch.forEach(w => inflightWellsRef.current.add(w));
    setColumnError(null); // Clear previous errors

    try {
      const response = await fetch(`${apiUrl}/api/get-well-columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Handle HTTP errors like 404 Not Found or 500 Internal Server Error
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
    console.log("get-well-columns response:", data);

      // --- NEW VALIDATION LOGIC ---
      // Check if the received data is a non-empty object.
      // This is crucial for preventing the stuck loading state.
      if (typeof data !== 'object' || data === null || Object.keys(data).length === 0) {
        throw new Error('API returned empty or invalid data for well columns.');
      }
      setWellColumns(prev => ({ ...prev, ...data }));
      wellsToFetch.forEach(w => {
        fetchedWellsRef.current.add(w);
        inflightWellsRef.current.delete(w);
      });
    } catch (err) {
      // This will now catch network errors, HTTP errors, and our validation errors
      wellsToFetch.forEach(w => inflightWellsRef.current.delete(w));
      const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred';
      setColumnError(`Failed to load curves: ${errorMsg}`); // Set a descriptive error
      console.error('Failed to fetch well columns:', err);
    }
  }, [apiUrl, isDataPrep, wellsDir]);

  useEffect(() => {
    if (selectedWells.length === 0) {
      setWellColumns({});
      setColumnError(null);
      fetchedWellsRef.current.clear();
      inflightWellsRef.current.clear();
      return;
    }
    fetchWellColumns(selectedWells);
  }, [selectedWells, fetchWellColumns]);

  const toggleCustomColumn = (column: string) => {
    setSelectedCustomColumns(prev =>
      prev.includes(column) ? prev.filter(c => c !== column) : [...prev, column]
    );
  };

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
            case 'depth-matching': endpointPath = '/api/get-depth-matching-prep-plot'; break;
            case 'smoothing-prep': endpointPath = '/api/get-smoothing-prep-plot'; break;
            case 'fill-missing-prep': endpointPath = '/api/get-fill-missing-plot'; break;
            case 'splicing': endpointPath = '/api/get-splicing-plot'; break;
            case 'trimming': endpointPath = '/api/get-trimming-plot'; break;
            case 'custom': endpointPath = '/api/get-custom-plot'; break;
            default: endpointPath = '/api/get-module1-plot'; break;
        }
        if (plotType === 'custom') {
            requestBody = { custom_columns: selectedCustomColumns, file_path: selectedFilePath };
        } else {
            requestBody = { file_path: selectedFilePath };
        }
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
            case 'custom': endpointPath = '/api/get-custom-plot'; break;
            default: endpointPath = '/api/get-plot'; break;
        }
        if (plotType === 'custom') {
            requestBody = { custom_columns: selectedCustomColumns, selected_wells: selectedWells, selected_intervals: selectedIntervals, selected_zones: selectedZones, full_path: wellsDir};
        } else {
            requestBody = { selected_wells: selectedWells, selected_intervals: selectedIntervals, selected_zones: selectedZones, full_path: wellsDir };
        }
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
  }, [apiUrl, plotType, selectedFilePath, selectedWells, selectedIntervals, selectedZones, selectedCustomColumns, wellsDir]);

  const toggleWellSelection = (well: string) => {
    setSelectedWells(prev =>
      prev.includes(well) ? prev.filter(w => w !== well) : [...prev, well]
    );
  };

  const toggleInterval = (interval: string) => {
    setSelectedIntervals(prev =>
      prev.includes(interval) ? prev.filter(i => i !== interval) : [...prev, interval]
    );
  };

  const toggleZone = (zone: string) => {
    setSelectedZones(prev =>
      prev.includes(zone) ? prev.filter(z => z !== zone) : [...prev, zone]
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
    selectedCustomColumns,
    toggleCustomColumn,
    columnError,
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
