// src/components/WellLogPlot.tsx
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { type Layout, type Data } from 'plotly.js';
import { useDashboard } from '@/contexts/DashboardContext';
import { Loader2 } from 'lucide-react';
// REMOVE this import, we no longer get data from the client's DB
// import { getProcessedWellData } from '@/lib/db';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function WellLogPlot() {
  const [plotData, setPlotData] = useState<Data[]>([]);
  const [plotLayout, setPlotLayout] = useState<Partial<Layout>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedWells, plotType } = useDashboard();

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
        case 'porosity':
          endpointPath = '/api/get-porosity-plot';
          break;
        default:
          endpointPath = '/api/get-plot';
          break;
      }
      const endpoint = `${apiUrl}${endpointPath}`;

      try {
        // --- THIS IS THE SIMPLIFICATION ---
        // We no longer need to fetch data from IndexedDB first.
        // We simply send the names of the selected wells directly to the backend.
        // The backend will use these names to find the files on its persistent volume.

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ selected_wells: selectedWells }), // Send the array of well names
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to retrieve data from server' }));
          throw new Error(errorData.error);
        }

        const plotObject = await response.json();

        if (plotObject && plotObject.data && plotObject.layout) {
          setPlotData(plotObject.data);
          setPlotLayout(plotObject.layout);
        } else {
          throw new Error("Received invalid plot data structure from server.");
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal');
        console.error("Error fetching plot data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlotData();
  }, [selectedWells, plotType]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Loading Plot from Server...</span>
      </div>
    );
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', background: 'white', borderRadius: '8px', height: '100%', width: '100%' }}>
      <Plot
        data={plotData}
        layout={plotLayout}
        style={{ width: '100%', height: '100%' }}
        config={{ responsive: true, displaylogo: false }}
      />
    </div>
  );
};