/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useAppDataStore } from '@/stores/useAppDataStore';
import { Loader2, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {children}
    </div>
);

// Nama komponen diubah menjadi lebih generik
export default function CrossplotViewer() {
  const { selectedWells, selectedIntervals, wellColumns } = useDashboard();
  const { vshDNParams, setVshDNParams } = useAppDataStore();
  // const { vshDNParams } = useAppDataStore();
  
  // State untuk pilihan sumbu X dan Y
  const [xCol, setXCol] = useState<string>('NPHI');
  const [yCol, setYCol] = useState<string>('RHOB');
  const { prcnt_qz, prcnt_wtr } = vshDNParams;
  
  const [plotResult, setPlotResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Logika untuk mendapatkan daftar kolom yang bisa diplot
  const availableLogs = useMemo(() => {
    if (selectedWells.length === 0 || Object.keys(wellColumns).length === 0) return [];
    const firstWell = wellColumns[selectedWells[0]] || [];
    const excluded = new Set(['MARKER', 'STRUKTUR', 'WELL_NAME', 'DEPTH', 'DEPT']);
    return firstWell.filter(log => !excluded.has(log));
  }, [selectedWells, wellColumns]);

  useEffect(() => {
    if (availableLogs.length > 0) {
        if (!availableLogs.includes(xCol)) setXCol(availableLogs[0]);
        if (!availableLogs.includes(yCol)) setYCol(availableLogs[0]);
    }
  }, [availableLogs, xCol, yCol]);

  const handleParamChange = (key: string, value: string) => {
    const numericValue = parseFloat(value);
    setVshDNParams({ ...vshDNParams, [key]: isNaN(numericValue) ? '' : numericValue });
  };


  const fetchCrossplot = async () => {
    if (selectedWells.length === 0 || !xCol || !yCol) {
      alert('Silakan pilih Well, sumbu X, dan sumbu Y terlebih dahulu.');
      return;
    }
    setLoading(true);
    setError(null);
    setPlotResult(null);

    const endpoint = "http://127.0.0.1:5001/api/get-crossplot";
    
    const payload = {
      selected_wells: selectedWells,
      selected_intervals: selectedIntervals,
      x_col: xCol,
      y_col: yCol,
      ...vshDNParams,
    };

    console.log(vshDNParams);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error((await response.json()).error || 'Gagal mengambil data dari server');
      }
      
      const plotObject = await response.json();
      setPlotResult(plotObject);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-white rounded-lg shadow-md">
      {/* Judul dinamis */}
      <h2 className="text-xl font-bold mb-4 text-gray-800">Crossplot {yCol} vs {xCol}</h2>
      <p className="text-sm text-gray-600 mb-1">Wells: {selectedWells.join(', ') || 'N/A'}</p>
      <p className="text-sm text-gray-600 mb-4">Intervals: {selectedIntervals.join(', ') || 'All'}</p>

      {/* FIX: Tambahkan UI untuk memilih kolom X dan Y */}
      <div className="p-4 border rounded-lg bg-gray-50 space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Select X-Axis Log">
              <select value={xCol} onChange={(e) => setXCol(e.target.value)} className="w-full p-2 border rounded-md">
                  {availableLogs.map(log => <option key={log} value={log}>{log}</option>)}
              </select>
            </FormField>
            <FormField label="Select Y-Axis Log">
               <select value={yCol} onChange={(e) => setYCol(e.target.value)} className="w-full p-2 border rounded-md">
                  {availableLogs.map(log => <option key={log} value={log}>{log}</option>)}
              </select>
            </FormField>
            {(xCol === "NPHI" && yCol === "RHOB") && (
              <>
                <FormField label="Percentile Quartz">
                  <input
                    type="number"
                    value={prcnt_qz}
                    onChange={(e) => handleParamChange('prcnt_qz', e.target.value)}
                    className="w-full p-2 border rounded-md"
                    step="any"
                  />
                </FormField>
                <FormField label="Percentile Water">
                  <input
                    type="number"
                    value={prcnt_wtr}
                    onChange={(e) => handleParamChange('prcnt_wtr', e.target.value)}
                    className="w-full p-2 border rounded-md"
                    step="any"
                  />
                </FormField>
              </>
            )}

        </div>
        <div className="flex justify-end pt-4 border-t">
            <button
              onClick={fetchCrossplot}
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? <span className="flex items-center gap-2"><Loader2 className="animate-spin w-4 h-4" /> Loading...</span> : 'Generate Crossplot'}
            </button>
        </div>
      </div>

      {/* Area untuk menampilkan hasil */}
      <div className="mt-4 min-h-[600px] border-2 border-dashed rounded-lg flex items-center justify-center p-2">
        {loading && <div className="text-center text-gray-500"><Loader2 className="animate-spin h-8 w-8 mx-auto mb-2"/>Generating plot...</div>}
        {error && <div className="text-center text-red-600 p-4"><AlertTriangle className="mx-auto h-8 w-8 mb-2"/>Error: {error}</div>}
        {!loading && !error && plotResult && (
            <Plot
              data={plotResult.data}
              layout={{ ...plotResult.layout, autosize: true }}
              style={{ width: '100%', height: '100%' }}
              config={{ responsive: true }}
              useResizeHandler={true}
            />
        )}
         {!loading && !error && !plotResult && (
            <div className="text-center text-gray-400">Crossplot will be displayed here.</div>
        )}
      </div>
    </div>
  );
}
