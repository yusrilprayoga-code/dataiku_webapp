'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useDashboard } from '@/contexts/DashboardContext';
import { Loader2 } from 'lucide-react';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function WellLogPlot() {
  // 1. Ambil state yang sudah jadi dari context.
  // Tidak ada lagi state lokal (useState) atau logika fetching (useEffect) di sini.
  const { plotFigure, isLoadingPlot, plotError } = useDashboard();

  // 2. Tampilkan status loading berdasarkan state dari context.
  if (isLoadingPlot) {
    return (
      <div className="flex h-full w-full items-center justify-center text-gray-500">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Loading Plot from Server...</span>
      </div>
    );
  }

  // 3. Tampilkan error jika ada, berdasarkan state dari context.
  if (plotError) {
    return (
        <div className="flex h-full w-full items-center justify-center p-4">
            <p className="text-center text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
                <strong>Error:</strong> {plotError}
            </p>
        </div>
    );
  }

  // 4. Tampilkan pesan default jika tidak ada data plot.
  if (!plotFigure || !plotFigure.data || plotFigure.data.length === 0) {
      return (
          <div className="flex h-full w-full items-center justify-center text-center text-gray-500 p-4">
              <div>
                  <h3 className="text-lg font-semibold">No Plot to Display</h3>
                  <p className="text-sm mt-1">Please select a well or file from a sidebar to generate a plot.</p>
              </div>
          </div>
      );
  }

  // 5. Jika semua baik-baik saja, render plot langsung dari context.
  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', background: 'white', borderRadius: '8px', height: '100%', width: '100%' }}>
      <Plot
        data={plotFigure.data}
        layout={plotFigure.layout}
        style={{ width: '100%', height: '100%' }}
        config={{ responsive: true, displaylogo: false }}
      />
    </div>
  );
};