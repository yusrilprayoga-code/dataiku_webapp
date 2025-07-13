/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Import Plot secara dinamis untuk hindari error SSR
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function CrossplotViewerRHOB_NPHI() {
  const { selectedWells } = useDashboard();
  const [plotResult, setPlotResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchCrossplot = async () => {
    if (selectedWells.length === 0) {
      alert('Pilih minimal 1 well terlebih dahulu.');
      return;
    }

    setLoading(true);

    const endpoint = "http://127.0.0.1:5001/api/get-crossplot";

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_wells: selectedWells }),
      });

      const data = await response.json();

      if (data.error) {
        alert(data.error);
      } else {
        setPlotResult(data);
      }
    } catch (err) {
      alert('Gagal mengambil crossplot dari server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Crossplot NPHI vs RHOB</h2>
      <p className="text-sm text-gray-600 mb-2">Well dipilih: {selectedWells.join(', ') || 'Tidak ada'}</p>

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={fetchCrossplot}
          className="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="animate-spin w-4 h-4" /> Loading...
            </span>
          ) : (
            'Tampilkan Crossplot'
          )}
        </button>
      </div>

      {plotResult && (
        <div className="mt-4 border border-gray-300 p-4 rounded">
          <Plot
            data={plotResult.data}
            layout={{ ...plotResult.layout, autosize: true }}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true }}
            useResizeHandler={true}
          />
        </div>
      )}
    </div>
  );
}
