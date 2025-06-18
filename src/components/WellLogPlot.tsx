// src/components/WellLogPlot.tsx
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { type Layout, type Data } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });
type WellLogPlotProps = unknown

const WellLogPlot: React.FC<WellLogPlotProps> = () => {
  const [plotData, setPlotData] = useState<Data[]>([]);
  const [plotLayout, setPlotLayout] = useState<Partial<Layout>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlotData = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/api/get-plot');
        
        if (!response.ok) {
          throw new Error(`Gagal mengambil data dari server: ${response.statusText}`);
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
  }, []);

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