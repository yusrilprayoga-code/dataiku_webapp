/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAppDataStore } from '@/stores/useAppDataStore';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function CrossplotNPHI_GR() {
  const { selectedWells } = useDashboard();
  const [plotResult, setPlotResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [circleShapes, setCircleShapes] = useState<any[]>([]);
  const { vshParams } = useAppDataStore();

  const handleClick = (event: any) => {
    const x = event.points[0].x;
    const y = event.points[0].y;

    const xRadius = 0.005;
    const yRadius = 1.2; 

    const newShape = {
        type: 'circle',
        xref: 'x',
        yref: 'y',
        x0: x - xRadius,
        x1: x + xRadius,
        y0: y - yRadius,
        y1: y + yRadius,
        line: {
            color: 'red',
            width: 1
        },
        fillcolor: 'red',
        opacity: 1
    };

    setCircleShapes([newShape]);
  };

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
        body: JSON.stringify({
          selected_wells: selectedWells,
          x_col: 'NPHI',
          y_col: 'GR',
          GR_MA: vshParams.gr_ma,
          GR_SH: vshParams.gr_sh,
        }),
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
      <h2 className="text-xl font-bold mb-4 text-gray-800">Crossplot NPHI vs GR</h2>
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
            layout={{
                ...plotResult.layout,
                // shapes: circleShapes,
                autosize: true
            }}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true }}
            useResizeHandler={true}
            // onClick={handleClick}
            // onDoubleClick={() => setCircleShapes([])}
          />
        </div>
      )}
    </div>
  );
}
