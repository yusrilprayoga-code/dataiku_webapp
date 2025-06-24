// src/components/forms/NormalizationParams.tsx
'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { type ParameterRow } from '@/types'; // Pastikan path ini benar
import { useDashboard } from '@/contexts/DashboardContext'; // Kita masih butuh ini untuk data awal

// --- Definisikan tipe data untuk props ---
interface NormalizationParamsProps {
  // Fungsi yang akan dipanggil saat form disubmit
  onSubmit: (activeParameters: ParameterRow[]) => Promise<void>;
  // State loading yang dikontrol oleh induk
  isLoading: boolean;
}

// --- Helper Functions (pindahkan dari file lama atau simpan di sini) ---
const FormField: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (<div className={className}><label className="block text-sm font-medium text-gray-500 mb-1">{label}</label>{children}</div>);

const createInitialParameters = (intervals: string[]): ParameterRow[] => {
  // ... (Fungsi createInitialParameters sama seperti kode Anda sebelumnya)
  const createValues = (val: string | number) => Object.fromEntries(intervals.map(i => [i, val]));
  return [
    { id: 1, location: 'Parameter', mode: 'Input', comment: 'Calib Parameters: File, Screen', unit: 'ALPHA*6', name: 'CALIB_OPT', isEnabled: true, values: createValues('SCREEN') },
    { id: 2, location: 'Parameter', mode: 'Input', comment: 'Normalization: Min-Average-Max, Min-Max', unit: 'ALPHA*15', name: 'NORMALIZE_OPT', isEnabled: true, values: createValues('MIN-MAX') },
    { id: 3, location: 'Parameter', mode: 'Input', comment: 'Normalization Report Name', unit: 'REPORT_FILE', name: 'REPORT_FILE', isEnabled: true, values: createValues('^REPORTS/log_normalization') },
    { id: 4, location: 'Interval', mode: 'Input', comment: 'Number of Bins to Use', unit: 'BINS', name: 'BINS', isEnabled: true, values: createValues(100) },
    { id: 5, location: 'Interval', mode: 'Input', comment: 'Lo Cumulative Percentile, eg 5', unit: '', name: 'PCT_MIN', isEnabled: true, values: createValues(3) },
    { id: 6, location: 'Interval', mode: 'Input', comment: 'Hi Cumulative Percentile, eg 95', unit: '', name: 'PCT_MAX', isEnabled: true, values: createValues(97) },
    { id: 10, location: 'Constant', mode: 'Input', comment: 'Calibration Minimum', unit: '', name: 'CALIB_MIN', isEnabled: true, values: createValues(40) },
    { id: 11, location: 'Constant', mode: 'Input', comment: 'Calibration Maximum via Freq-Hist', unit: '', name: 'CALIB_MAX', isEnabled: true, values: createValues(140) },
    { id: 17, location: 'Log', mode: 'Input', comment: 'Input Log', unit: 'LOG_IN', name: 'LOG_IN', isEnabled: true, values: createValues('GR') },
    { id: 18, location: 'Log', mode: 'Output', comment: 'Output Log Name', unit: 'LOG_OUT', name: 'LOG_OUT', isEnabled: true, values: createValues('GR_NORM') },
  ];
};

const getRowBgColor = (location: string, mode: string): string => {
  // ... (Fungsi getRowBgColor sama seperti kode Anda sebelumnya)
  switch (location) {
    case 'Parameter': return 'bg-orange-600';
    case 'Constant': return mode === 'Input' ? 'bg-yellow-200' : 'bg-yellow-100';
    case 'Log': return mode === 'Input' ? 'bg-cyan-300' : 'bg-cyan-200';
    case 'Output': return 'bg-teal-100';
    case 'Interval': return 'bg-green-400';
    default: return 'bg-white';
  }
};
// --- Komponen Utama ---
export default function NormalizationParams({ onSubmit, isLoading }: NormalizationParamsProps) {
  const { selectedWell, selectedIntervals } = useDashboard(); // Ambil data dari context
  const [parameters, setParameters] = useState<ParameterRow[]>([]);

  // Set parameter awal saat interval berubah
  useEffect(() => { setParameters(createInitialParameters(selectedIntervals)); }, [selectedIntervals]);

  // Handler untuk mengubah state internal form ini
  const handleUnifiedValueChange = (id: number, newValue: string) => {
    setParameters(prev =>
      prev.map(row => {
        if (row.id === id) {
          const newValues = Object.fromEntries(Object.keys(row.values).map(intervalKey => [intervalKey, newValue]));
          return { ...row, values: newValues };
        }
        return row;
      })
    );
  };
  const handleRowToggle = (id: number, isEnabled: boolean) => { setParameters(prev => prev.map(row => (row.id === id ? { ...row, isEnabled } : row))); };

  // Handler untuk submit form
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const activeParameters = parameters.filter(p => p.isEnabled);
    // Panggil fungsi onSubmit dari props, kirimkan data yang sudah difilter
    onSubmit(activeParameters);
  };

  const staticHeaders = ['#', 'Location', 'Mode', 'Comment', 'Unit', 'Name', 'P'];

  return (
    // ... JSX Anda sama persis dari <div className="p-4..."> sampai akhir
    // Satu-satunya perbedaan adalah tombol 'Start' sekarang menggunakan prop 'isLoading'
    <div className="p-4 md:p-6 h-full flex flex-col bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">Normalize a log based on calibration parameters.</h2>
      <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
        <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4 items-start">
            <div className="md:col-span-4"><p className="text-sm font-medium text-gray-700">Well: {selectedWell || 'N/A'} / Intervals: {selectedIntervals.length} selected</p></div>
            <FormField label="Input Set"><button type="button" onClick={() => alert('Popup pilihan Input Set')} className="text-sm p-2 w-full bg-white border border-gray-300 rounded-md text-left shadow-sm hover:border-blue-500">WIRE</button></FormField>
            <FormField label="Output Set"><button type="button" onClick={() => alert('Popup pilihan Output Set')} className="text-sm p-2 w-full bg-white border border-gray-300 rounded-md text-left shadow-sm hover:border-blue-500">WDE</button></FormField>
            <FormField label="Sampling Log"><select className="text-sm p-2 w-full bg-white border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"><option>Use finest</option><option>Use coarsest</option></select></FormField>
            <FormField label="Reference"><select className="text-sm p-2 w-full bg-white border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"><option>DEPTH</option><option>TVD</option></select></FormField>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <button type="button" className="px-6 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 font-semibold">Cancel</button>
            <button type="submit" disabled={isLoading} className="px-6 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">{isLoading ? 'Processing...' : 'Start'}</button>
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2 flex-shrink-0">Parameters</h3>
        <div className="flex-grow min-h-0 border border-gray-300">
          <div className="overflow-auto h-full">
            <table className="min-w-full text-sm table-auto">
              <thead className="bg-gray-200 sticky top-0 z-10">{/* ... header tabel Anda ... */}
                <tr>
                  {staticHeaders.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">{header}</th>))}
                  {selectedIntervals.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">{header}</th>))}
                </tr>
              </thead>
              <tbody className="bg-white">{/* ... body tabel Anda ... */}
                {parameters.map((param) => (
                  <tr key={param.id} className={`border-b border-gray-200 ${param.isEnabled ? getRowBgColor(param.location, param.mode) : 'bg-gray-100'}`}>
                    <td className="px-3 py-2 border-r text-center text-gray-500">{param.id}</td>
                    <td className="px-3 py-2 border-r">{param.location}</td>
                    <td className="px-3 py-2 border-r">{param.mode}</td>
                    <td className="px-3 py-2 border-r whitespace-normal w-64">{param.comment}</td>
                    <td className="px-3 py-2 border-r">{param.unit}</td>
                    <td className="px-3 py-2 border-r font-semibold">{param.name}</td>
                    <td className="px-3 py-2 border-r text-center"><input type="checkbox" className="h-4 w-4 rounded border-gray-400" checked={param.isEnabled} onChange={(e) => handleRowToggle(param.id, e.target.checked)} /></td>
                    {selectedIntervals.map(interval => (<td key={interval} className="px-3 py-2 border-r"><input type="text" value={param.values[interval] || ''} onChange={(e) => handleUnifiedValueChange(param.id, e.target.value)} disabled={!param.isEnabled} className=" p-1 bg-white border border-gray-300 rounded-md shadow-sm disabled:bg-gray-100 disabled:text-gray-500" /></td>))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </div>
  );
}