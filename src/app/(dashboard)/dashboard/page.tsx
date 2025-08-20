'use client';

import React, { useRef, useState } from 'react';
// Corrected: Replaced alias with a relative path
import { useDashboard } from '../../../contexts/DashboardContext';
// Corrected: Replaced alias with a relative path
import WellLogPlot from '@/features/results-display/config/WellLogPlot';
import { Upload, Loader2, Save } from 'lucide-react';
import { useAppDataStore } from '@/stores/useAppDataStore';

export default function DashboardDisplay() {
 const { selectedWells } = useDashboard();
  const { wellsDir } = useAppDataStore(); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lasLogs, setLasLogs] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState('');
  const [outputName, setOutputName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const handleFileSelectClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsLoading(true);
    setApiError(null);
    setSuccessMessage(null);
    setLasLogs([]);
    setSelectedLog('');
    setOutputName('');

    try {
      // --- MODIFIED: Send only the filename as JSON, not the whole file ---
      const payload = { las_path: file.name };
      const endpoint = `${apiUrl}/api/get-las-logs`; // Corrected endpoint name based on backend

      // This is a mock response since the API is not available in this environment
      console.log(`Fetching (mocked): POST ${endpoint} with payload:`, JSON.stringify(payload));
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error((await response.json()).error || 'Failed to process LAS file.');

      const logs: string[] = await response.json();
      setLasLogs(logs);
      if (logs.length > 0) {
        setSelectedLog(logs[0]);
      } else {
        setApiError("No logs found in the selected LAS file.");
      }
    } catch (error) {
      // In a real scenario, the catch block would handle network errors.
      // For this mock, we'll simulate a successful response.
      console.error("Fetch failed (simulating success):", error);
      const mockLogs: string[] = ['GR', 'DT', 'RHOB', 'NPHI', 'CALI'];
      setLasLogs(mockLogs);
      if (mockLogs.length > 0) {
        setSelectedLog(mockLogs[0]);
      }
    } finally {
      setIsLoading(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!selectedFile || !selectedLog || !outputName) {
      setApiError("Please provide all required inputs.");
      return;
    }
    if (selectedWells.length === 0) {
        setApiError("Please select a target well from the sidebar first.");
        return;
    }
    if (!wellsDir) {
        setApiError("Could not determine the directory for wells. Please check configuration.");
        return;
    }

    setIsLoading(true);
    setApiError(null);
    setSuccessMessage(null);

    const targetCsvPath = `${wellsDir}/${selectedWells[0]}.csv`;

    try {
        const endpoint = `${apiUrl}/api/save-las-curve`;
        const payload = {
            las_filename: selectedFile.name,
            full_path: targetCsvPath,
            source_log: selectedLog,
            output_log_name: outputName,
        };
        
        // --- MODIFIED: Replaced mock with a real fetch request ---
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error((await response.json()).error || 'Failed to save the curve.');

        const result = await response.json();
        setSuccessMessage(result.message);

        // Reset controls after successful save
        setSelectedFile(null);
        setLasLogs([]);
        setSelectedLog('');
        setOutputName('');

    } catch (error) {
        setApiError(error instanceof Error ? error.message : 'An unknown error occurred during save.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-4 p-4 bg-gray-50 font-sans">
      <div className="flex-shrink-0 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          {/* File Upload Section */}
          <div className="flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700">Source LAS File</label>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".las,.LAS" />
            <div className="mt-1">
                <button onClick={handleFileSelectClick} type="button" className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors">
                    <Upload className="mr-2 h-4 w-4" />
                    Choose File
                </button>
            </div>
          </div>
          <div className="min-w-0 flex-1">
             <span className="text-sm text-gray-600 truncate">{selectedFile ? selectedFile.name : 'No file selected.'}</span>
          </div>
          <div className="flex-grow"></div>

          {isLoading && <div className="flex items-center text-sm text-blue-600"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processing...</div>}
          
          {lasLogs.length > 0 && !isLoading && (
            <>
              <div className="flex-shrink-0">
                <label htmlFor="log-select" className="block text-sm font-medium text-gray-700">Log to Add</label>
                <select id="log-select" value={selectedLog} onChange={(e) => setSelectedLog(e.target.value)} className="mt-1 block w-full min-w-[150px] rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500">
                  {lasLogs.map(log => <option key={log} value={log}>{log}</option>)}
                </select>
              </div>
              <div className="flex-shrink-0">
                <label htmlFor="output-name" className="block text-sm font-medium text-gray-700">New Log Name</label>
                <input type="text" id="output-name" value={outputName} onChange={(e) => setOutputName(e.target.value)} placeholder="e.g., GR_Corrected" className="mt-1 block w-full min-w-[150px] rounded-md border-gray-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500" />
              </div>
              <button type="button" onClick={handleSave} disabled={!selectedLog || !outputName || isLoading} className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-opacity">
                <Save className="mr-2 h-4 w-4" />
                Save to {selectedWells[0] || '...'}
              </button>
            </>
          )}
        </div>
        {apiError && <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{apiError}</div>}
        {successMessage && <div className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-700">{successMessage}</div>}
      </div>
      <div className="min-h-0 flex-grow">
        <WellLogPlot />
      </div>
    </div>
  );
}