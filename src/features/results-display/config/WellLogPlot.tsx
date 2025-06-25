// src/components/WellLogPlot.tsx
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { type Layout, type Data } from 'plotly.js';
import { useDashboard } from '@/contexts/DashboardContext';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });
type WellLogPlotProps = unknown

const WellLogPlot: React.FC<WellLogPlotProps> = () => {
  const [plotData, setPlotData] = useState<Data[]>([]);
  const [plotLayout, setPlotLayout] = useState<Partial<Layout>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { selectedWells, plotType } = useDashboard();

  useEffect(() => {
    if (selectedWells.length === 0) {
      setIsLoading(false);
      setPlotData([]); 
      setPlotLayout({ title: { text: 'Pilih satu atau lebih sumur dari sidebar untuk memulai' } });
      return;
    }

    const fetchPlotData = async () => {
      setIsLoading(true);
      setError(null);

            let endpoint = '';
      switch (plotType) {
        case 'normalization':
          endpoint = 'http://127.0.0.1:5001/api/get-normalization-plot';
          break;
        case 'porosity':
          endpoint = 'http://127.0.0.1:5001/api/get-porosity-plot';
          break;
        case 'default':
        default: 
          endpoint = 'http://127.0.0.1:5001/api/get-plot';
          break;
      }
      
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

  if (isLoading) {
    return <p>Memuat Plot dari Server Python...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', background: 'white', borderRadius: '8px' }}>
      <Plot
        data={plotData}
        layout={plotLayout}
        style={{ width: '100%', height: '100%' }}
        config={{ responsive: true, displaylogo: false }}
      />
    </div>
  );
};

export default WellLogPlot;