'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, AlertTriangle, Database } from 'lucide-react';
import { type Layout, type Data } from 'plotly.js';

// Impor Plotly secara dinamis untuk performa sisi klien
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Daftar sumur yang tersedia
const AVAILABLE_WELLS = ['BNG-56', 'BNG-58', 'BNG-59'];

export default function DepthMatchingPage() {
  // State untuk menampung plot, status loading, error, dan sumur yang dipilih
  const [plot, setPlot] = useState<{ data: Data[], layout: Partial<Layout> } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWell, setSelectedWell] = useState<string>(AVAILABLE_WELLS[0]); // Default ke sumur pertama

  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const endpoint = `${apiUrl}/api/run-depth-matching`;

  // Fungsi untuk mengambil data plot dari backend, sekarang menggunakan useCallback
  const runAndFetchPlot = useCallback(async (wellName: string) => {
    setIsLoading(true);
    setError(null);
    setPlot(null); // Kosongkan plot lama saat memulai request baru

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Kirim nama sumur yang dipilih di body request
        body: JSON.stringify({ well_name: wellName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Terjadi kesalahan di server');
      }
      
      // Backend sekarang langsung mengembalikan string JSON dari plot
      const plotJsonString = await response.json();
      const plotObject = JSON.parse(plotJsonString);
      setPlot(plotObject); // Simpan plot yang berhasil diterima ke state

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal');
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]); // useCallback dependency

  // useEffect akan berjalan saat 'selectedWell' berubah
  useEffect(() => {
    runAndFetchPlot(selectedWell);
  }, [selectedWell, runAndFetchPlot]);

  // Fungsi untuk menampilkan konten berdasarkan state
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600" />
          <p className="mt-4 text-lg font-semibold">Menjalankan Depth Matching untuk {selectedWell}...</p>
          <p className="text-sm">Proses ini mungkin memakan waktu beberapa saat.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center text-red-600 p-4">
          <AlertTriangle className="h-12 w-12 mb-4" />
          <h3 className="text-lg font-bold">Terjadi Kesalahan</h3>
          <p className="text-sm mt-2 bg-red-50 p-3 rounded-md">{error}</p>
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
    <div className="flex flex-col p-4 bg-gray-50">
        {/* Kontainer untuk pilihan sumur */}
        <div className="mb-4 p-3 border rounded-lg bg-white shadow-sm">
            <div className="flex items-center mb-2">
                <Database className="h-5 w-5 mr-2 text-gray-600" />
                <h3 className="text-md font-semibold text-gray-800">Pilih Sumur (Well)</h3>
            </div>
            <div className="flex space-x-2">
                {AVAILABLE_WELLS.map((well) => (
                    <button
                        key={well}
                        onClick={() => setSelectedWell(well)}
                        disabled={isLoading}
                        className={`
                            px-4 py-2 text-sm font-medium border rounded-md transition-colors
                            ${selectedWell === well 
                                ? 'bg-blue-600 text-white border-blue-700 shadow-md' 
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                            }
                            disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400
                        `}
                    >
                        {well}
                    </button>
                ))}
            </div>
        </div>
        
        {/* Kontainer untuk menampilkan plot atau status */}
        <div className="flex-grow min-h-0 border rounded-lg shadow-inner bg-white p-2">
            {renderContent()}
        </div>
    </div>
  );
}
