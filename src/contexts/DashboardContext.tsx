/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// /src/contexts/DashboardContext.tsx

'use client';

import { LogCurve } from '@/lib/db';
import { Data } from 'plotly.js';
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';

export type PlotType = 'default' | 'normalization' | 'smoothing' | 'porosity' | 'sw' | 'vsh' | 'rwa' | 'gsa' | 'module2' | 'rpbe-rgbe' | 'swgrad' | 'dns-dnsv' | 'rt-ro';

interface DashboardContextType {
  availableWells: string[];
  selectedWells: string[];
  toggleWellSelection: (well: string) => void;
  selectedIntervals: string[];
  toggleInterval: (interval: string) => void;
  plotType: PlotType;
  wellColumns: Record<string, string[]>;
  setPlotType: (type: PlotType) => void;
  fetchWellColumns: (wells: string[]) => Promise<void>;
  plotData: Data[];
  setPlotData: (data: Data[]) => void;
  getCurrentLogs: () => LogCurve[];
  availableIntervals: string[];
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [availableWells, setAvailableWells] = useState<string[]>([]);
  const [availableIntervals, setAvailableIntervals] = useState<string[]>([]);
  const [selectedWells, setSelectedWells] = useState<string[]>([]);
  const [selectedIntervals, setSelectedIntervals] = useState<string[]>(['B1', 'GUF']);
  const [plotType, setPlotType] = useState<PlotType>('default');
  const [wellColumns, setWellColumns] = useState<Record<string, string[]>>({});
  const [plotData, setPlotData] = useState<Data[]>([]);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const fetchWellsFromServer = async () => {
      try {
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

      try {
        const intervalsResponse = await fetch('http://127.0.0.1:5001/api/list-intervals');
        if (!intervalsResponse.ok) throw new Error('Gagal mengambil daftar interval');
        const intervalsData = await intervalsResponse.json();
        if (Array.isArray(intervalsData)) {
          setAvailableIntervals(intervalsData);
        }
      } catch (error) {
        console.error("Error fetching intervals:", error);
      }
    };

    fetchWellsFromServer();
  }, []); // Run only once when the provider mounts

  const fetchWellColumns = async (wells: string[]) => {
    try {
      const response = await fetch(`${apiUrl}/api/get-well-columns`, {
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

  const getCurrentLogs = (): LogCurve[] => {
    console.log("Getting current logs from plot data:", plotData);

    // First, identify all valid log curves (type: scattergl)
    const logTraces = plotData.filter((trace) => {
      const t = trace as any;
      return t.type === 'scattergl' &&
        t.name &&
        !t.name.toLowerCase().includes('xover') &&
        t.name !== 'MARKER';
    });

    console.log("Found log curves:", logTraces.map(t => (t as any).name));

    const logs: LogCurve[] = [];

    for (const trace of logTraces) {
      const t = trace as any;
      if (!t.name) continue;

      try {
        // Get the x and y data arrays, handling both direct arrays and objects with _inputArray
        let xData: number[] = [];
        let yData: number[] = [];

        // Extract x values
        if (t.x && t.x._inputArray instanceof Float64Array) {
          xData = Array.from(t.x._inputArray);
        } else if (Array.isArray(t.x)) {
          xData = t.x;
        } else if (t.x && Array.isArray(t.x.data)) {
          xData = t.x.data;
        }

        // Extract y values
        if (t.y && t.y._inputArray instanceof Float64Array) {
          yData = Array.from(t.y._inputArray);
        } else if (Array.isArray(t.y)) {
          yData = t.y;
        } else if (t.y && Array.isArray(t.y.data)) {
          yData = t.y.data;
        }

        if (xData.length === 0 || yData.length === 0) {
          console.log(`No valid data arrays for log ${t.name}`);
          continue;
        }

        // Create pairs of depth (y) and value (x)
        const pairs: [number, number | null][] = [];
        for (let i = 0; i < yData.length; i++) {
          const depth = Number(yData[i]);
          const value = xData[i];
          const numValue = value !== undefined && value !== null ? Number(value) : null;

          if (!isNaN(depth) && (numValue === null || !isNaN(numValue))) {
            pairs.push([depth, numValue]);
          }
        }

        if (pairs.length === 0) {
          console.log(`No valid data points found for log ${t.name}`);
          continue;
        }

        console.log(`Processed ${pairs.length} points for log ${t.name}`);

        logs.push({
          curveName: t.name,
          data: pairs,
          wellName: selectedWells[0] || 'Unknown Well',
          plotData: plotData
        });
      } catch (err) {
        console.error(`Error processing log ${t.name}: ${err}`);
      }
    }

    console.log("Transformed logs:", logs);
    return logs;
  };

  const value = {
    availableWells,
    selectedWells,
    toggleWellSelection,
    selectedIntervals,
    toggleInterval,
    plotType,
    setPlotType,
    wellColumns,
    fetchWellColumns,
    plotData,
    setPlotData,
    getCurrentLogs,
    availableIntervals
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