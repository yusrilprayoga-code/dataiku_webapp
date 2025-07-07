// src/components/WellLogPlot.tsx
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { type Layout, type Data } from 'plotly.js';
import { useDashboard } from '@/contexts/DashboardContext';
import { Loader2, Save } from 'lucide-react';

import { saveWellDataSet } from '@/lib/db';
import { type LogCurve } from '@/lib/db';
import SaveSetDialog from '@/components/SaveSetDialog';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function WellLogPlot() {
  const [plotData, setPlotData] = useState<Data[]>([]);
  const [plotLayout, setPlotLayout] = useState<Partial<Layout>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedWells, plotType } = useDashboard();
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const canSave = selectedWells.length === 1 && plotData.length > 0;

  useEffect(() => {
    if (selectedWells.length === 0) {
      setIsLoading(false);
      setPlotData([]);
      setPlotLayout({ title: { text: 'Please select one or more wells from the sidebar to begin.' } });
      return;
    }

    const fetchPlotData = async () => {
      setIsLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        setError("API URL is not configured.");
        setIsLoading(false);
        return;
      }

      let endpointPath = '';
      switch (plotType) {
        case 'normalization':
          endpointPath = '/api/get-normalization-plot';
          break;
        case 'smoothing':
          endpointPath = '/api/get-smoothing-plot';
          break;
        case 'porosity':
          endpointPath = '/api/get-porosity-plot';
          break;
        case 'gsa':
          endpointPath = '/api/get-gsa-plot';
          break;
        case 'default':
        default:
          endpointPath = '/api/get-plot';
          break;
      }
      const endpoint = `${apiUrl}${endpointPath}`;

      try {
        // FIX: Gunakan metode POST dan kirim `selectedWells`
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ selected_wells: selectedWells }), // Kirim sebagai objek
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Gagal mengambil data dari server');
        }

        const responseData = await response.json();
        const plotObject = JSON.parse(responseData);

        setPlotData(plotObject.data);
        setPlotLayout(plotObject.layout);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal');
        console.error("Error fetching plot data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlotData();
  }, [selectedWells, plotType]);

  const handleSaveSet = async (setName: string) => {
    if (!canSave) {
      alert("Can only save data for a single selected well.");
      return;
    }
    const wellName = selectedWells[0];
    console.log("Inspecting plotData:", plotData);

    try {
      // Transform the plot data into log curves, handling both x/y and customdata formats
      const logCurves: LogCurve[] = plotData.reduce((accumulator: LogCurve[], trace: any) => {
        const traceData = trace as { 
          customdata?: any[],
          x?: number[],
          y?: number[],
          name?: string,
          meta?: { unit?: string }
        };

        if (traceData.customdata && Array.isArray(traceData.customdata)) {
          const curveName = traceData.name || 'UnknownCurve';
          const data = traceData.customdata
            .filter(point => Array.isArray(point) && point.length >= 2)
            .map(point => [Number(point[0]), point[1] ?? null] as [number, number | null])
            .filter(point => !isNaN(point[0]));

          if (data.length > 0) {
            accumulator.push({ 
              curveName, 
              unit: traceData.meta?.unit || 'N/A',
              data
            });
          }
        } 
        else if (Array.isArray(traceData.y) && Array.isArray(traceData.x)) {
          const curveName = traceData.name || 'UnknownCurve';
          const data = traceData.y
            .map((depth, i) => [Number(depth), traceData.x?.[i] ?? null] as [number, number | null])
            .filter(([depth]) => !isNaN(depth));

          if (data.length > 0) {
            accumulator.push({ 
              curveName,
              unit: traceData.meta?.unit || 'N/A',
              data
            });
          }
        }

        return accumulator;
      }, []);

      if (logCurves.length === 0) {
        alert("No valid log curves could be found in the current plot to save.");
        return;
      }

      await saveWellDataSet(wellName, setName, logCurves);
      alert(`Successfully saved the log set "${setName}" for well "${wellName}"!`);
      setIsSaveDialogOpen(false);

    } catch (err) {
      console.error("Failed to save set:", err);
      alert(`Error: ${err instanceof Error ? err.message : 'Could not save the set.'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Loading Plot from Server...</span>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 p-4">Error: {error}</p>;
  }

  return (
    <div className="relative border-1 border-gray-200 p-4 bg-white rounded-lg shadow-md h-full w-full">
      {/* NEW: Save Button */}
      <div className="absolute top-2 right-2 z-10">
        <button
          onClick={() => setIsSaveDialogOpen(true)}
          disabled={!canSave}
          title={canSave ? "Save current log data as a set" : "Please select a single well to save its data"}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm
                     hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                     disabled:bg-gray-400 disabled:cursor-not-allowed`}
        >
          <Save className="h-4 w-4" />
          Save Log Set
        </button>
      </div>

      <Plot
        data={plotData}
        layout={plotLayout}
        style={{ width: '100%', height: '100%' }}
        config={{ responsive: true, displaylogo: false }}
      />

      {/* NEW: Render the Dialog */}
      {canSave && (
        <SaveSetDialog
          isOpen={isSaveDialogOpen}
          onClose={() => setIsSaveDialogOpen(false)}
          onSave={handleSaveSet}
          wellName={selectedWells[0]}
        />
      )}
    </div>
  );
};
