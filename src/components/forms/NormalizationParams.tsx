'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import { useAppDataStore } from '@/stores/appDataStore';
import { type ParameterRow } from '@/types';

const FormField: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => ( <div className={className}><label className="block text-sm font-medium text-gray-500 mb-1">{label}</label>{children}</div> );

const createInitialParameters = (intervals: string[]): ParameterRow[] => {
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

export default function NormalizationParams() {
  const { selectedWell, selectedIntervals } = useDashboard();
  const { addNormalizationResult } = useAppDataStore();
  const router = useRouter();
  const [parameters, setParameters] = useState<ParameterRow[]>([]);
  const [, setIsSubmitting] = useState(false);
  
  useEffect(() => { setParameters(createInitialParameters(selectedIntervals)); }, [selectedIntervals]);

  const handleUnifiedValueChange = (id: number, newValue: string) => {
    setParameters(prev =>
      prev.map(row => {
        if (row.id === id) {
          const newValues = Object.fromEntries(
            Object.keys(row.values).map(intervalKey => [intervalKey, newValue])
          );
          return { ...row, values: newValues };
        }
        return row;
      })
    );
  };
  const handleRowToggle = (id: number, isEnabled: boolean) => { setParameters(prev => prev.map(row => (row.id === id ? { ...row, isEnabled } : row))); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const activeParameters = parameters.filter(p => p.isEnabled);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/get-normalization-plot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeParameters),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error');
      }

      const plotObject = JSON.parse(await response.json());
      const resultId = `norm-${Date.now()}`;
      addNormalizationResult(resultId, plotObject);
      router.push(`/dashboard/results/${resultId}`);

    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSubmitting(false);
    }
  };
  
  const getRowBgColor = (location: string, mode: string): string => {
    switch (location) {
      case 'Parameter':
        return 'bg-orange-600';

      case 'Constant':
        if (mode === 'Input') {
          return 'bg-yellow-200'; 
        } else { 
          return 'bg-yellow-100';
        }

      case 'Log':
        if (mode === 'Input') {
          return 'bg-cyan-300'; 
        } else { 
          return 'bg-cyan-200'; 
        }
        
      case 'Output':
          return 'bg-teal-100';

      case 'Interval':
        return 'bg-green-400';

      default:
        return 'bg-white';
    }
  };

  const staticHeaders = ['#', 'Location', 'Mode', 'Comment', 'Unit', 'Name', 'P'];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">Normalize a log based on calibration parameters.</h2>
      
      <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
        {/* FIX #1: BAGIAN ATAS DITATA ULANG DENGAN CSS GRID AGAR SEJAJAR SEMPURNA */}
        <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4 items-start">
                {/* Baris informasi */}
                <div className="md:col-span-4">
                    <p className="text-sm font-medium text-gray-700">Well: {selectedWell || 'N/A'} / Intervals: {selectedIntervals.length} selected</p>
                </div>

                {/* Baris input */}
                <FormField label="Input Set">
                    <button type="button" onClick={() => alert('Popup pilihan Input Set')} className="text-sm p-2 w-full bg-white border border-gray-300 rounded-md text-left shadow-sm hover:border-blue-500">WIRE</button>
                </FormField>
                <FormField label="Output Set">
                    <button type="button" onClick={() => alert('Popup pilihan Output Set')} className="text-sm p-2 w-full bg-white border border-gray-300 rounded-md text-left shadow-sm hover:border-blue-500">WDE</button>
                </FormField>
                <FormField label="Sampling Log">
                    <select className="text-sm p-2 w-full bg-white border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                        <option>Use finest</option>
                        <option>Use coarsest</option>
                    </select>
                </FormField>
                <FormField label="Reference">
                    <select className="text-sm p-2 w-full bg-white border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                        <option>DEPTH</option>
                        <option>TVD</option>
                    </select>
                </FormField>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                <button type="button" className="px-6 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 font-semibold">Cancel</button>
                <button type="submit" className="px-6 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700">Start</button>
            </div>
        </div>

        {/* BAGIAN TENGAH: TABEL PARAMETER */}
        <h3 className="text-lg font-semibold mb-2 flex-shrink-0">Parameters</h3>
        <div className="flex-grow min-h-0 border border-gray-300">
          <div className="overflow-auto h-full">
            <table className="min-w-full text-sm table-auto">
              <thead className="bg-gray-200 sticky top-0 z-10">
                <tr>
                  {staticHeaders.map(header => (
                    <th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">{header}</th>
                  ))}
                  {selectedIntervals.map(header => (
                    <th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {parameters.map((param) => (
                  <tr key={param.id} className={`border-b border-gray-200 ${param.isEnabled ? getRowBgColor(param.location, param.mode) : 'bg-gray-100'}`}>
                    <td className="px-3 py-2 border-r text-center text-gray-500">{param.id}</td>
                    <td className="px-3 py-2 border-r">{param.location}</td>
                    <td className="px-3 py-2 border-r">{param.mode}</td>
                    {/* FIX #2: Kolom Comment diatur agar bisa wrap */}
                    <td className="px-3 py-2 border-r whitespace-normal w-64">{param.comment}</td>
                    <td className="px-3 py-2 border-r">{param.unit}</td>
                    <td className="px-3 py-2 border-r font-semibold">{param.name}</td>
                    <td className="px-3 py-2 border-r text-center">
                      <input type="checkbox" className="h-4 w-4 rounded border-gray-400" checked={param.isEnabled} onChange={(e) => handleRowToggle(param.id, e.target.checked)} />
                    </td>
                    
                    {selectedIntervals.map(interval => (
                      <td key={interval} className="px-3 py-2 border-r">
                        <input
                          type="text"
                          value={param.values[interval] || ''}
                          onChange={(e) => handleUnifiedValueChange(param.id, e.target.value)}
                          disabled={!param.isEnabled}
                          className=" p-1 bg-white border border-gray-300 rounded-md shadow-sm disabled:bg-gray-100 disabled:text-gray-500"
                        />
                      </td>
                    ))}
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