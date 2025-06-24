// src/app/(dashboard)/dashboard/page.tsx

'use client';
import React, { useEffect } from 'react';
import { useAppDataStore } from '@/stores/useAppDataStore';
import WellLogPlot from '@/features/results-display/config/WellLogPlot'; 

export default function DashboardHomePage() {
  // Select the specific pieces of state and actions needed by this component
  const {
    selectedWell,
    plotData,
    plotLayout,
    isLoadingPlot,
    plotError,
    fetchPlotData,
  } = useAppDataStore();

  // Fetch initial data when the component mounts
  useEffect(() => {
    if (selectedWell) {
      fetchPlotData(selectedWell);
    }
  }, [fetchPlotData, selectedWell]);

  if (isLoadingPlot) {
    return <p>Loading Plot for {selectedWell}...</p>;
  }

  if (plotError) {
    return <p style={{ color: 'red' }}>Error: {plotError}</p>;
  }

  if (!plotData || plotData.length === 0) {
    return <p>No plot data available. Please select a well.</p>;
  }

  return <WellLogPlot data={plotData} layout={plotLayout} />;
}