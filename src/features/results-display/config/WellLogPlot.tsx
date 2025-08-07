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
  const { selectedWells, selectedIntervals, plotType, plotFigure } = useDashboard();
  
  useEffect(() => {
    // Check if we have plot data from context (e.g., from Module1 plot via DirectorySidebar)
    if (plotFigure && plotFigure.data && plotFigure.data.length > 0) {
      console.log('Using plot data from dashboard context:', plotFigure);
      setPlotData(plotFigure.data);
      setPlotLayout(plotFigure.layout || {});
      setIsLoading(false);
      return;
    }
    
    // Default state - no plot until user specifically requests one
    setIsLoading(false);
    setPlotData([]);
    setPlotLayout({ 
      title: { 
        text: selectedWells.length === 0 
          ? 'Please select data dulu nggih mas.'
          : 'Plot data will appear here once you select.'
      } 
    });
    
    // Don't automatically fetch plot data - only when explicitly requested
    // This prevents the component from making API calls just because wells are selected
    
  }, [selectedWells, selectedIntervals, plotType, plotFigure]);

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