// src/components/WellLogPlot.tsx (Final - Versi Flask)
'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { type Layout, type Data } from 'plotly.js';
import { LogDataRow } from '@/types';

// Komponen Plotly diimpor secara dinamis
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Props komponen ini sekarang bisa sangat sederhana
interface WellLogPlotProps {
  initialData: LogDataRow[];
  wellName: string;
}

const WellLogPlot: React.FC<WellLogPlotProps> = () => {
  // State hanya untuk menampung `data` dan `layout` yang diterima dari Flask
  const [plotData, setPlotData] = useState<Data[]>([]);
  const [plotLayout, setPlotLayout] = useState<Partial<Layout>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fungsi untuk mengambil data plot dari backend Flask kita
    const fetchPlotData = async () => {
      try {
        // 1. Lakukan API call ke server Flask
        const response = await fetch('http://127.0.0.1:5000/api/get-plot');
        
        if (!response.ok) {
          throw new Error(`Gagal mengambil data dari server: ${response.statusText}`);
        }
        
        // 2. Ambil data JSON dari respons
        const responseData = await response.json();

        // 3. Penting: Respons dari fig.to_json() adalah string, jadi perlu di-parse lagi
        const plotObject = JSON.parse(responseData);

        // 4. Simpan data dan layout dari Flask ke dalam state React
        // Ini akan secara otomatis memicu Plotly untuk menggambar plot
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
  }, []); // Array dependensi kosong `[]` berarti `useEffect` hanya berjalan sekali

  // Tampilkan pesan loading saat mengambil data
  if (isLoading) {
    return <p>Memuat Plot dari Server Python...</p>;
  }

  // Tampilkan pesan error jika terjadi masalah
  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  // 5. Jika berhasil, tampilkan komponen Plot dengan data dari state
  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', background: 'white', borderRadius: '8px' }}>
      <Plot
        data={plotData}
        layout={plotLayout}
        style={{ width: '100%', height: '800px' }}
        config={{ responsive: true, displaylogo: false }}
      />
    </div>
  );
};

export default WellLogPlot;