/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

// app/data-input-utama/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { useAppDataStore } from '../../stores/useAppDataStore';
import { QCResponse, PreviewableFile, ProcessedFileDataForDisplay, QCResult, QCStatus, StagedStructure } from '@/types';
import { FileData } from '../file_upload/types';
import { FileTextIcon, Folder as FolderIcon, Inbox, CheckCircle, Loader2 } from 'lucide-react';
import DataTablePreview from '@/features/data-input/components/DataTablePreview'; // We will use this preview component

// NEW: Import the DB utility to get the files
import { getAllFiles } from '@/features/file_upload/utils/db'; // Adjust path if necessary

export default function DataInputUtamaPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // Get state and actions from the Zustand store
  const { stagedStructure, setStagedStructure, qcResults, setQcResults, handledFiles, addHandledFile, clearAllData, clearQcResults } = useAppDataStore();

  // Local component state
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeFolder, setActiveFolder] = useState<'input' | 'output' | 'handled'>('input');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<PreviewableFile | null>(null);
  const [isQcRunning, setIsQcRunning] = useState(false);
  const [qcStatusMessage, setQcStatusMessage] = useState('');

  const [structureName, setStructureName] = useState<string | null>(null);

  useEffect(() => {
    // Client-side only
    if (typeof window === 'undefined') return;

    // Get structure name from session storage
    const name = sessionStorage.getItem('userDefinedStructureName');
    setStructureName(name);

    if (!name) {
      router.replace('/');
      return;
    }

    const loadFiles = async () => {
      setIsLoading(true);
      try {
        const filesFromDb: FileData[] = await getAllFiles();

        const filesForProcessing: ProcessedFileDataForDisplay[] = [];
        filesFromDb.forEach(fileData => {
          if (fileData.isStructureFromZip) {
            const processSubFiles = (subFiles: any[] | undefined, type: 'las-as-csv' | 'csv') => {
              subFiles?.forEach(subFile => {
                filesForProcessing.push({
                  id: subFile.id,
                  name: `${fileData.name}/${subFile.name}`,
                  originalName: subFile.name,
                  structurePath: fileData.name,
                  type: type,
                  content: subFile.content,
                  headers: subFile.headers,
                  rawContentString: subFile.rawContentString,
                });
              });
            };
            processSubFiles(fileData.lasFiles, 'las-as-csv');
            processSubFiles(fileData.csvFiles, 'csv');
          } else if (fileData.rawFileContent && typeof fileData.rawFileContent === 'string') {
            const fileType = fileData.name.toLowerCase().endsWith('.las') ? 'las-as-csv' : 'csv';
            filesForProcessing.push({
              id: fileData.id,
              name: fileData.name,
              type: fileType,
              content: fileData.content || [],
              headers: fileData.headers || [],
              rawContentString: fileData.rawFileContent,
            });
          }
        });

        const reconstructedStructure: StagedStructure = {
          userDefinedStructureName: name,
          files: filesForProcessing,
        };

        setStagedStructure(reconstructedStructure);
      } catch (error) {
        console.error("Failed to load data:", error);
        router.replace('/');
      } finally {
        setIsLoading(false);
      }
    };

    // Only load if store is empty
    loadFiles();
  }, [router, setStagedStructure]);

  const handleRunQcWorkflow = async () => {
    if (!stagedStructure) return;
    setIsQcRunning(true);
    setQcStatusMessage('Langkah 1: Menjalankan Quality Control...');
    setQcResults(null);
    setActiveFolder('output');
    setSelectedFileForPreview(null);
    setSelectedFileId(null);
    try {
      const filesToProcess = stagedStructure.files.map(file => ({ name: file.originalName || file.name, content: file.rawContentString }));
      // Gunakan path relatif
      const qcResponse = await fetch('/api/qc/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filesToProcess }),
      });
      if (!qcResponse.ok) {
        const errorData = await qcResponse.json().catch(() => ({}));
        throw new Error(errorData.details || `Initial QC failed`);
      }
      const initialQcResults: QCResponse = await qcResponse.json();
      setQcResults(initialQcResults);
      // await processAndHandleNulls(initialQcResults);
    } catch (error) {
      alert(`Error saat QC: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsQcRunning(false);
      setQcStatusMessage('');
    }
  };

  const processAndHandleNulls = async (initialQcResults: QCResponse) => {
    const filesWithNulls = initialQcResults.qc_summary.filter(r => r.status === 'HAS_NULL');
    if (filesWithNulls.length === 0) { /* ... */ return; }
    setQcStatusMessage(`Langkah 2: Menangani ${filesWithNulls.length} file dengan null...`);
    for (const result of filesWithNulls) {
      try {
        const originalFilename = Object.keys(initialQcResults.output_files).find(name => name.startsWith(result.well_name));
        if (!originalFilename) continue;
        const fileContentWithNulls = initialQcResults.output_files[originalFilename];
        const handleNullsResponse = await fetch('/api/handle-nulls', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: fileContentWithNulls,
        });
        if (!handleNullsResponse.ok) throw new Error(`Server gagal menangani null untuk ${result.well_name}`);
        const cleanedCsvContent = await handleNullsResponse.text();
        const parsedResults = await new Promise<Papa.ParseResult<any>>((resolve, reject) => {
          Papa.parse(cleanedCsvContent, { header: true, skipEmptyLines: true, complete: resolve, error: reject });
        });
        addHandledFile({ id: `handled_${result.well_name}`, name: `${result.well_name}_HANDLED.csv`, content: parsedResults.data, headers: parsedResults.meta.fields || [] });
      } catch (error) { console.error(`Gagal menangani null untuk ${result.well_name}:`, error); }
    }
    setQcStatusMessage('Penanganan null otomatis selesai.');
    setTimeout(() => setQcStatusMessage(''), 3000);
  };

  const handleContinue = () => { setIsNavigating(true); router.push('/dashboard'); };

  // Handlers untuk seleksi (sudah benar, tidak perlu diubah)
  const getStatusRowStyle = (status: QCStatus) => { /* ... */ return ''; };
  const getStatusBadgeStyle = (status: QCStatus) => { /* ... */ return ''; };
  const handleSelectInputFile = (file: ProcessedFileDataForDisplay) => { /* ... */ };
  const handleSelectHandledFile = (file: PreviewableFile) => { /* ... */ };
  const handleSelectOutputFile = (result: QCResult) => { /* ... */ };

  // Tampilkan layar loading saat data sedang dimuat dari sessionStorage
  if (isLoading || !stagedStructure) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        <p className="ml-4">Memuat data sesi...</p>
      </div>
    );
  }

  // JSX utama tidak perlu diubah
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
        <DataTablePreview file={selectedFileForPreview} />
      </div>
    </div>
  );
}