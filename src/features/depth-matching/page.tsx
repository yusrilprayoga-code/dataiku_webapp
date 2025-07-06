'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, AlertTriangle } from 'lucide-react';
import { type Layout, type Data } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function DepthMatchingPage() {
  // State untuk menampung plot, status loading, dan pesan error
  const [plot, setPlot] = useState<{ data: Data[], layout: Partial<Layout> } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const endpoint = `${apiUrl}/api/run-depth-matching`;

  // useEffect akan berjalan otomatis saat komponen pertama kali dimuat
  useEffect(() => {
    const runAndFetchPlot = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}), // Kirim body kosong untuk memicu request
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Terjadi kesalahan di server');
        }

        const plotObject = JSON.parse(await response.json());
        setPlot(plotObject); // Simpan plot yang berhasil diterima ke state

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal');
      } finally {
        setIsLoading(false);
      }
    };

    runAndFetchPlot();
  }, []); // Array dependensi kosong berarti hanya berjalan sekali

  // Fungsi untuk menampilkan konten berdasarkan state
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600" />
          <p className="mt-4 text-lg font-semibold">Running Depth Matching...</p>
          <p className="text-sm">Proses ini mungkin memakan waktu beberapa saat.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-red-600 p-4">
          <AlertTriangle className="h-12 w-12 mb-4" />
          <h3 className="text-lg font-bold">An Error Occurred</h3>
          <p className="text-sm mt-2">{error}</p>
        </div>
      );
    }

    if (plot) {
      return (
        <Plot
          data={plot.data}
          layout={plot.layout}
          style={{ width: '100%', height: '100%' }}
          config={{ responsive: true }}
          useResizeHandler={true}
        />
      );
    }
    return null;
  };

  return (
    <div className="flex-grow min-h-0 border rounded-lg shadow-inner">
      {renderContent()}
    </div>
  );
}