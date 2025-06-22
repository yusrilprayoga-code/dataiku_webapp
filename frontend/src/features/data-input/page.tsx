// app/data-input/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { useAppDataStore } from '../../stores/useAppDataStore';
import { QCResponse, PreviewableFile, ProcessedFileDataForDisplay, QCResult, QCStatus } from '@/types';
import { FileTextIcon, Folder as FolderIcon, Inbox, CheckCircle, Loader2 } from 'lucide-react';
import DataTablePreview from '@/features/data-input/components/DataInputView'; // FIX: Import the breakout component

export default function DataInputUtamaPage() {
  const router = useRouter();

  // Get all state and actions from the single store
  const {
    stagedStructure,
    qcResults,
    handledFiles,
    setQcResults,
    addHandledFile,
    clearAllData,
    clearQcResults
  } = useAppDataStore();

  // Local UI state for this page only
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeFolder, setActiveFolder] = useState<'input' | 'output' | 'handled'>('input');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<PreviewableFile | null>(null);
  const [isQcRunning, setIsQcRunning] = useState(false);
  const [qcStatusMessage, setQcStatusMessage] = useState('');

  // --- FIX: This is the new, robust data flow logic ---
  // The page's only job is to check if the required data exists in the store.
  // It does NOT care how it got there (no more sessionStorage).
  useEffect(() => {
    if (!stagedStructure) {
      // If the user lands here directly or refreshes the page (losing the in-memory state),
      // there is no staged data to work with. The only correct action is to send them back.
      console.warn("No staged data in store. Redirecting to upload page.");
      router.replace('/'); // Use replace to prevent "back" navigation to this broken state
    }
  }, [stagedStructure, router]);


  // --- All handler functions below are now more reliable ---
  const handleRunQcWorkflow = async () => {
    if (!stagedStructure) return;
    setIsQcRunning(true);
    setQcStatusMessage('Step 1: Running initial Quality Control...');
    clearQcResults(); // Clear previous results from the global store
    setActiveFolder('output');
    setSelectedFileForPreview(null);
    setSelectedFileId(null);

    try {
      // Logic is correct: read rawContentString from the store, send to API
      const filesToProcess = stagedStructure.files.map(file => ({
        name: file.originalName || file.name,
        content: file.rawContentString
      }));
      const qcResponse = await fetch('/api/run-qc', { // This should be a centralized API call
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filesToProcess }),
      });
      if (!qcResponse.ok) {
        const errorData = await qcResponse.json().catch(() => ({}));
        throw new Error(errorData.details || `Initial QC failed`);
      }
      const initialQcResults: QCResponse = await qcResponse.json();
      setQcResults(initialQcResults); // Set the results in the global store
      await processAndHandleNulls(initialQcResults); // Trigger next step
    } catch (error) {
      alert(`An error occurred during QC: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsQcRunning(false);
      setQcStatusMessage('');
    }
  };

  const processAndHandleNulls = async (initialQcResults: QCResponse) => {
    // This function's logic is good. It correctly uses the results from the first step.
    const filesWithNulls = initialQcResults.qc_summary.filter(r => r.status === 'HAS_NULL');
    if (filesWithNulls.length === 0) {
      setQcStatusMessage('QC complete. No files with nulls to handle.');
      setTimeout(() => setQcStatusMessage(''), 3000);
      return;
    }
    setQcStatusMessage(`Step 2: Found ${filesWithNulls.length} file(s) with nulls. Auto-handling...`);

    for (const result of filesWithNulls) {
      try {
        const originalFilename = Object.keys(initialQcResults.output_files).find(name => name.startsWith(result.well_name));
        if (!originalFilename) continue;

        const fileContentWithNulls = initialQcResults.output_files[originalFilename];
        // This fetch should also be moved to a central API client eventually
        const handleNullsResponse = await fetch('/api/handle-nulls', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: fileContentWithNulls,
        });
        if (!handleNullsResponse.ok) throw new Error(`Server failed to handle nulls for ${result.well_name}`);

        const cleanedCsvContent = await handleNullsResponse.text();
        const parsedResults = await new Promise<Papa.ParseResult<any>>((resolve, reject) => {
          Papa.parse(cleanedCsvContent, { header: true, skipEmptyLines: true, complete: resolve, error: reject });
        });

        // This is perfect: Use the Zustand action to update the state.
        addHandledFile({
          id: `handled_${result.well_name}`,
          name: `${result.well_name}_HANDLED.csv`,
          content: parsedResults.data,
          headers: parsedResults.meta.fields || [],
        });
      } catch (error) {
        console.error(`Failed to handle nulls for ${result.well_name}:`, error);
      }
    }
    setQcStatusMessage('Automated null handling complete.');
    setTimeout(() => setQcStatusMessage(''), 3000);
  };

  const handleContinue = () => {
    setIsNavigating(true);
    router.push('/dashboard');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getStatusRowStyle = (status: QCStatus) => { /* ... */ };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getStatusBadgeStyle = (status: QCStatus) => { /* ... */ };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSelectInputFile = (file: ProcessedFileDataForDisplay) => { /* ... */ };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSelectHandledFile = (file: PreviewableFile) => { /* ... */ };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSelectOutputFile = (result: QCResult) => { /* ... */ };

  // --- FIX: This is a much cleaner way to handle the loading/redirect state ---
  if (!stagedStructure) {
    // While the useEffect is running its check, this will show a loading screen.
    // Once the check completes, the user will either see the page or be redirected.
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        <p className="ml-4">Loading data...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">

      {/* Panel 1: Folder Navigation & Actions */}
      <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col p-4">
        <h1 className="text-xl font-bold mb-6">Data Input Utama</h1>

        <nav className="space-y-2">
          {/* Input Folder Button */}
          <button
            onClick={() => { setActiveFolder('input'); setSelectedFileForPreview(null); setSelectedFileId(null); }}
            className={`w-full flex items-center gap-3 p-2 rounded-md text-sm font-medium transition-colors ${activeFolder === 'input' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
              }`}
          >
            <Inbox className="w-5 h-5" /> {stagedStructure.userDefinedStructureName} (Input)
          </button>

          {/* Output Folder Button */}
          <button
            onClick={() => { setActiveFolder('output'); setSelectedFileForPreview(null); setSelectedFileId(null); }}
            disabled={!qcResults}
            className={`w-full flex items-center gap-3 p-2 rounded-md text-sm font-medium transition-colors ${activeFolder === 'output' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
              } disabled:text-gray-400 disabled:cursor-not-allowed`}
          >
            <FolderIcon className="w-5 h-5" /> Output
          </button>

          {/* Handled (ABB pass_qc) Folder Button */}
          <button
            onClick={() => { setActiveFolder('handled'); setSelectedFileForPreview(null); setSelectedFileId(null); }}
            disabled={handledFiles.length === 0}
            className={`w-full flex items-center gap-3 p-2 rounded-md text-sm font-medium transition-colors ${activeFolder === 'handled' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
              } disabled:text-gray-400 disabled:cursor-not-allowed`}
          >
            <CheckCircle className="w-5 h-5 text-green-500" /> ABB (pass_qc)
          </button>
        </nav>

        <div className="mt-auto pt-4 space-y-2 border-t">
          <button onClick={handleRunQcWorkflow} disabled={isQcRunning || isNavigating}
            className="w-full px-4 py-3 bg-green-500 text-white font-bold rounded hover:bg-green-600 disabled:bg-gray-400 flex items-center justify-center gap-2">
            {isQcRunning ? (<><Loader2 className="w-5 h-5 animate-spin" />Processing...</>) : "Run Quality Control"}
          </button>

          <button
            onClick={handleContinue}
            disabled={isNavigating || isQcRunning}
            className="w-full px-4 py-2 bg-blue-500 text-white font-bold rounded hover:bg-blue-600 flex items-center justify-center transition-colors disabled:bg-gray-400 disabled:cursor-wait"
          >
            {isNavigating ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading...</>
            ) : ("Continue")}
          </button>

          <button onClick={() => { clearAllData(); router.push('/'); }} className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
            Start New Session
          </button>
        </div>
      </div>

      {/* Panel 2: File List Table */}
      <div className="flex-1 bg-gray-100 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b font-semibold text-lg bg-white">
          {activeFolder === 'input' && `Files in "${stagedStructure.userDefinedStructureName}"`}
          {activeFolder === 'output' && "Initial QC Results"}
          {activeFolder === 'handled' && "Handled Files (ABB pass_qc)"}
        </div>
        <div className="flex-1 overflow-y-auto">
          {activeFolder === 'input' && (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-200 sticky top-0"><tr><th className="px-4 py-2 text-left font-semibold text-gray-600">File Name</th><th className="px-4 py-2 text-left font-semibold text-gray-600">Original Type</th></tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stagedStructure.files.map((file) => (<tr key={file.id} onClick={() => handleSelectInputFile(file)} className={`cursor-pointer hover:bg-blue-50 ${selectedFileId === file.id ? 'bg-blue-100' : ''}`}><td className="px-4 py-2 flex items-center gap-2 text-black"><FileTextIcon className="w-4 h-4 text-gray-400" />{file.name}</td><td className="px-4 py-2 text-black">{file.type}</td></tr>))}
              </tbody>
            </table>
          )}
          {activeFolder === 'output' && qcResults && (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-200 sticky top-0"><tr><th className="px-4 py-2 text-left font-semibold text-gray-600">Well Name</th><th className="px-4 py-2 text-left font-semibold text-gray-600">Status</th><th className="px-4 py-2 text-left font-semibold text-gray-600">Details</th></tr></thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {qcResults.qc_summary.map((result) => (<tr key={result.well_name} onClick={() => handleSelectOutputFile(result)} className={`cursor-pointer ${getStatusRowStyle(result.status)} ${selectedFileId === result.well_name ? 'border-l-4 border-blue-500' : ''}`}><td className="px-4 py-2 font-medium text-black">{result.well_name}</td><td className="px-4 py-2"><span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadgeStyle(result.status)}`}>{result.status}</span></td><td className="px-4 py-2 text-black">{result.details}</td></tr>))}
              </tbody>
            </table>
          )}
          {activeFolder === 'handled' && (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-200 sticky top-0"><tr><th className="px-4 py-2 text-left font-semibold text-gray-600">Handled File Name</th></tr></thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {handledFiles.length > 0 ? handledFiles.map((file) => (<tr key={file.id} onClick={() => handleSelectHandledFile(file)} className={`cursor-pointer hover:bg-blue-50 ${selectedFileId === file.id ? 'bg-blue-100' : ''}`}><td className="px-4 py-2 flex items-center gap-2 text-black"><CheckCircle className="w-4 h-4 text-green-500" />{file.name}</td></tr>)) : <tr><td colSpan={1} className="p-4 text-center text-gray-500">No files have been processed for null values yet.</td></tr>}
              </tbody>
            </table>
          )}
          {isQcRunning && (<div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2"><div className="w-5 h-5 border-t-2 border-gray-500 rounded-full animate-spin"></div>{qcStatusMessage || 'Processing...'}</div>)}
          {activeFolder === 'output' && !qcResults && !isQcRunning && (<div className="p-8 text-center text-gray-400">Run Quality Control to see the output here.</div>)}
        </div>
      </div>

      {/* Panel 3: File Content Preview */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-lg">File Preview</h2>
          <p className="text-sm text-gray-500 truncate">{selectedFileForPreview ? selectedFileForPreview.name : "No file selected"}</p>
        </div>
        <DataTablePreview />
      </div>
    </div>
  );
}