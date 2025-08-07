// src/components/WellLogPlot.tsx
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { type Layout, type Data } from 'plotly.js';
import { useDashboard } from '@/contexts/DashboardContext';
import { Loader2 } from 'lucide-react';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function WellLogPlot() {
  const [plotData, setPlotData] = useState<Data[]>([]);
  const [plotLayout, setPlotLayout] = useState<Partial<Layout>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 1. Get plot data from dashboard context  
  const { selectedWells, selectedIntervals, plotType, plotFigure, selectedFilePath } = useDashboard();
  
  useEffect(() => {
    // Check if we have plot data from context (e.g., from Module1 plot via DirectorySidebar)
    if (plotFigure && plotFigure.data && plotFigure.data.length > 0) {
      console.log('Using plot data from dashboard context:', plotFigure);
      setPlotData(plotFigure.data);
      setPlotLayout(plotFigure.layout || {});
      setIsLoading(false);
      return;
    }

    // Only fetch plot data if we have selected wells OR if it's a Module1 plot with a file path
    if (selectedWells.length === 0 && !(plotType === 'get-module1-plot' && selectedFilePath)) {
      setIsLoading(false);
      setPlotData([]);
      setPlotLayout({ 
        title: { 
          text: selectedWells.length === 0 
            ? 'Please select a CSV file from the directory browser to view well log plots.'
            : 'Plot data will appear here when you select a CSV file or choose a processing module.'
        } 
      });
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
        case 'get-module1-plot':
          endpointPath = '/api/get-module1-plot';
          break;
        case 'default':
        default:
          endpointPath = '/api/get-plot';
          break;
      }
      const endpoint = `${apiUrl}${endpointPath}`;

      try {
        // Prepare request body based on plot type
        let requestBody: any;
        if (plotType === 'get-module1-plot') {
          // For Module1 plots, send file_path
          if (!selectedFilePath) {
            setError("No file selected for Module1 plot.");
            setIsLoading(false);
            return;
          }
          requestBody = { file_path: selectedFilePath };
        } else {
          // For other plot types, send selected wells and intervals
          requestBody = { 
            selected_wells: selectedWells,
            selected_intervals: selectedIntervals 
          };
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Gagal mengambil data dari server');
        }

        const responseData = await response.json();
        
        // Handle different response formats
        let plotObject;
        if (plotType === 'get-module1-plot') {
          // Module1 plots may return data directly or as JSON string
          if (typeof responseData === 'string') {
            plotObject = JSON.parse(responseData);
          } else {
            plotObject = responseData;
          }
        } else {
          // Other plots return JSON string that needs parsing
          plotObject = JSON.parse(responseData);
        }

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
  // Include selectedFilePath for Module1 plot dependency
  }, [selectedWells, selectedIntervals, plotType, selectedFilePath]);


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