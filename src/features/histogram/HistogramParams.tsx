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
  const { selectedWells, wellColumns, selectedIntervals, selectedZones } = useDashboard();
  const [selectedLog, setSelectedLog] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plotResult, setPlotResult] = useState<{ data: Data[], layout: Partial<Layout> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableLogs = useMemo(() => {
        console.log('selectedWells:', selectedWells);
        console.log('wellColumns:', wellColumns);
        
        if (selectedWells.length === 0 || Object.keys(wellColumns).length === 0) {
            return [];
        }

        const allLogs = new Set<string>();
        
        selectedWells.forEach(wellName => {
            // Try both with and without .csv extension
            let columns = wellColumns[wellName] || wellColumns[`${wellName}.csv`];
            
            // If still not found, try to find a key that contains the well name
            if (!columns) {
                const matchingKey = Object.keys(wellColumns).find(key => 
                    key.includes(wellName) || key.replace('.csv', '') === wellName
                );
                if (matchingKey) {
                    columns = wellColumns[matchingKey];
                }
            }
            
            if (columns && Array.isArray(columns)) {
                columns.forEach(col => allLogs.add(col));
            }
        });

        // Daftar kolom yang akan dikecualikan
        const excludedColumns = new Set(['MARKER', 'STRUKTUR', 'WELL_NAME', 'SP', 'DEPTH', 'CALI']);
        
        // Filter daftar gabungan untuk membuang yang tidak diinginkan
        const finalLogs = Array.from(allLogs).filter(log => !excludedColumns.has(log));
        
        console.log('finalLogs:', finalLogs);
        return finalLogs; // Urutkan secara alfabetis agar rapi
  }, [selectedWells, wellColumns]);

  // set default selected log hanya berdasarkan perubahan availableLogs (fungsi update prev => ...)
  useEffect(() => {
    setSelectedLog(prev => {
      if (availableLogs.length === 0) return '';
      if (prev && availableLogs.includes(prev)) return prev;
      return availableLogs[0];
    });
  }, [availableLogs]);

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
      selected_intervals: selectedIntervals,
      selected_zones: selectedZones,
    };

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001';
      const response = await fetch(`${base}/api/get-histogram-plot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) { 
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.error || 'Server error'); 
      }
      
      const resJson = await response.json();
      const plotObject = typeof resJson === 'string' ? JSON.parse(resJson) : resJson;
      setPlotResult(plotObject);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-full flex flex-col bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex-shrink-0">Histogram Analysis</h2>
      
      <form onSubmit={handleSubmit} className="flex-shrink-0">
        <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
          <p className="text-sm font-semibold">Wells Selected: {selectedWells.join(', ') || 'N/A'} / Intervals: {selectedIntervals.length} selected</p>
          <hr />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Select Log to Analyze">
              <select 
                value={selectedLog} 
                onChange={(e) => setSelectedLog(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                disabled={availableLogs.length === 0}
              >
                <option value="" disabled>
                  {availableLogs.length === 0 ? 'No logs available' : 'Select a log...'}
                </option>
                {availableLogs.map(log => <option key={log} value={log}>{log}</option>)}
              </select>
            </FormField>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
          <button type="submit" className="px-6 py-2 rounded-md text-white bg-blue-600 font-semibold" disabled={isSubmitting || selectedWells.length === 0 || !selectedLog}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Generate'}
          </button>
        </div>
      </form>
      
      <div className="flex justify-center items-center mt-6">
        <div className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center p-4">
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
    </div>
  );
}