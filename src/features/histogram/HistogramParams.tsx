'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { type Layout, type Data } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {children}
    </div>
);

export default function HistogramParams() {
  const { selectedWells, wellColumns, fetchWellColumns } = useDashboard();
  
  const [selectedLog, setSelectedLog] = useState<string>('');
  const [bins, setBins] = useState(50);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plotResult, setPlotResult] = useState<{ data: Data[], layout: Partial<Layout> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableLogs = useMemo(() => {
    if (selectedWells.length === 0 || Object.keys(wellColumns).length === 0) {
      return [];
    }
    const firstWellName = selectedWells[0];
    let commonLogs = new Set(wellColumns[firstWellName] || []);

    for (let i = 1; i < selectedWells.length; i++) {
        const wellName = selectedWells[i];
        const currentWellCols = new Set(wellColumns[wellName] || []);
        commonLogs = new Set([...commonLogs].filter(col => currentWellCols.has(col)));
    }

    const excludedColumns = new Set(['MARKER', 'STRUKTUR', 'WELL_NAME', 'SP', 'DEPTH', 'CALI']);
    const finalLogs = Array.from(commonLogs).filter(log => !excludedColumns.has(log));
    
    return finalLogs;
  }, [selectedWells, wellColumns]);

  useEffect(() => {
    if (selectedWells.length > 0) {
      fetchWellColumns(selectedWells);
    }
  }, [selectedWells, fetchWellColumns]); 

  useEffect(() => {
    if (availableLogs.length > 0 && !availableLogs.includes(selectedLog)) {
        setSelectedLog(availableLogs[0]);
    } else if (availableLogs.length === 0) {
        setSelectedLog('');
    }
  }, [availableLogs, selectedLog]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLog) {
        alert("Please select a log to analyze.");
        return;
    }
    setIsSubmitting(true);
    setError(null);
    setPlotResult(null);
    
    const payload = {
      selected_wells: selectedWells,
      log_column: selectedLog,
      bins: bins
    };

    try {
      const response = await fetch('http://127.0.0.1:5001/api/get-histogram-plot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) { throw new Error((await response.json()).error || 'Server error'); }
      
      const plotObject = JSON.parse(await response.json());
      setPlotResult(plotObject);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex-shrink-0">Histogram Analysis</h2>
      
      <form onSubmit={handleSubmit} className="flex-shrink-0">
        <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
          <p className="text-sm font-semibold">Wells Selected: {selectedWells.join(', ') || 'N/A'}</p>
          <hr />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Select Log to Analyze">
              <select 
                value={selectedLog} 
                onChange={(e) => setSelectedLog(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                disabled={availableLogs.length === 0}
              >
                <option value="" disabled>Select a log...</option>
                {availableLogs.map(log => <option key={log} value={log}>{log}</option>)}
              </select>
            </FormField>
            <FormField label="Number of Bins">
              <input 
                type="number" 
                value={bins}
                onChange={(e) => setBins(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </FormField>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
          <button type="submit" className="px-6 py-2 rounded-md text-white bg-blue-600 font-semibold" disabled={isSubmitting || selectedWells.length === 0}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Generate'}
          </button>
        </div>
      </form>
      
      {/* Area untuk menampilkan hasil plot */}
      <div className="flex-grow mt-6 min-h-0 border-2 border-dashed rounded-lg flex items-center justify-center p-2">
        {isSubmitting && (
            <div className="text-center text-gray-500"><Loader2 className="animate-spin h-8 w-8 mx-auto mb-2"/>Generating plot...</div>
        )}
        {error && (
            <div className="text-center text-red-600 p-4"><AlertTriangle className="mx-auto h-8 w-8 mb-2"/>Error: {error}</div>
        )}
        {!isSubmitting && !error && plotResult && (
            <Plot
                data={plotResult.data}
                layout={plotResult.layout}
                style={{ width: '100%', height: '100%' }}
                config={{ responsive: true }}
                useResizeHandler={true}
            />
        )}
        {!isSubmitting && !error && !plotResult && (
            <div className="text-center text-gray-400">Histogram will be displayed here.</div>
        )}
      </div>
    </div>
  );
}