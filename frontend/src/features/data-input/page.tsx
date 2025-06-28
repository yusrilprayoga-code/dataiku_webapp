/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

// app/data-input-utama/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Papa from 'papaparse';
import { useAppDataStore } from '../../stores/useAppDataStore';
import { QCResponse, PreviewableFile, ProcessedFileDataForDisplay, QCResult, QCStatus, StagedStructure } from '@/types';
import { FileTextIcon, Folder as FolderIcon, Inbox, CheckCircle, Loader2 } from 'lucide-react';
import DataTablePreview from '@/features/data-input/components/DataTablePreview';
import { getAllFiles } from '@/features/file_upload/utils/db';

export default function DataInputUtamaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- REFACTORED: We only need ONE loading state. ---
  const [isLoading, setIsLoading] = useState(true);

  const { stagedStructure, setStagedStructure, qcResults, setQcResults, handledFiles, addHandledFile, clearAllData, clearQcResults } = useAppDataStore();

  // --- All other local component state is fine ---
  const [isNavigating, setIsNavigating] = useState(false);
  const [activeFolder, setActiveFolder] = useState<'input' | 'output' | 'handled'>('input');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<PreviewableFile | null>(null);
  const [isQcRunning, setIsQcRunning] = useState(false);
  const [qcStatusMessage, setQcStatusMessage] = useState('');

  // --- REMOVED: These state variables were redundant and not used. ---
  // const [isInitializing, setIsInitializing] = useState(true);
  // const [structureName, setStructureName] = useState<string | null>(null);

  useEffect(() => {
    const initializeData = async () => {
      if (useAppDataStore.getState().stagedStructure) {
        setIsLoading(false);
        return;
      }
      try {
        const structureName = searchParams.get('structureName');

        if (!structureName) {
          // This error message is now more accurate
          throw new Error('No structure name found in URL. Cannot initialize page.');
        }

        // The rest of your logic remains exactly the same...
        const filesFromDb = await getAllFiles();
        if (filesFromDb.length === 0) {
          throw new Error("IndexedDB is empty, can't build structure.");
        }

        const filesForProcessing: ProcessedFileDataForDisplay[] = [];
        filesFromDb.forEach(fileData => {
          if (fileData.isStructureFromZip) {
            const processSubFiles = (subFiles: any[] | undefined, type: 'las-as-csv' | 'csv') => {
              subFiles?.forEach(subFile => {
                filesForProcessing.push({ id: subFile.id, name: `${fileData.name}/${subFile.name}`, originalName: subFile.name, structurePath: fileData.name, type, content: subFile.content, headers: subFile.headers, rawContentString: subFile.rawContentString });
              });
            };
            processSubFiles(fileData.lasFiles, 'las-as-csv');
            processSubFiles(fileData.csvFiles, 'csv');
          } else if (fileData.rawFileContent && typeof fileData.rawFileContent === 'string') {
            const fileType = fileData.name.toLowerCase().endsWith('.las') ? 'las-as-csv' : 'csv';
            filesForProcessing.push({ id: fileData.id, name: fileData.name, type: fileType, content: fileData.content || [], headers: fileData.headers || [], rawContentString: fileData.rawFileContent });
          }
        });

        const reconstructed: StagedStructure = {
          userDefinedStructureName: structureName,
          files: filesForProcessing,
        };
        setStagedStructure(reconstructed);

      } catch (error) {
        console.error("Initialization failed, redirecting to home:", error);
        router.replace('/');
      } finally {
        // This is the single point where we indicate loading is complete.
        setIsLoading(false);
      }
    };
    initializeData();
  }, [router, searchParams, setStagedStructure]);

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
    } catch (error) {
      alert(`Error saat QC: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsQcRunning(false);
      setQcStatusMessage('');
    }
  };

  const handleContinue = () => { setIsNavigating(true); router.push('/dashboard'); };

  // --- Handler functions are fine, but some were duplicated in DataInputView ---
  const handleSelectInputFile = (file: ProcessedFileDataForDisplay) => {
    setSelectedFileId(file.id);
    setSelectedFileForPreview({
      id: file.id, name: file.name, content: file.content, headers: file.headers,
    });
  };
  const handleSelectHandledFile = (file: PreviewableFile) => { /* ... */ };
  const handleSelectOutputFile = (result: QCResult) => { /* ... */ };

  // --- REFACTORED: This is the single, simple loading check we need. ---
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        <p className="ml-4">Loading session data...</p>
      </div>
    );
  }

  // Fallback in case loading finishes but the structure is still missing
  // (the useEffect would have already redirected, this prevents a crash)
  if (!stagedStructure) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <p>No data found. Redirecting...</p>
      </div>
    );
  }

  // Main component render
  return (
    <div className="flex h-screen bg-gray-50 text-gray-800">
      {/* Panel 1: Folder Navigation & Actions */}
      <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col p-4">
        <h1 className="text-xl font-bold mb-6">Data Input Utama</h1>
        <nav className="space-y-2">
          <button onClick={() => { setActiveFolder('input'); setSelectedFileForPreview(null); setSelectedFileId(null); }}
            className={`w-full flex items-center gap-3 p-2 rounded-md text-sm font-medium transition-colors ${activeFolder === 'input' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
            <Inbox className="w-5 h-5" /> {stagedStructure.userDefinedStructureName} (Input)
          </button>
          <button onClick={() => { setActiveFolder('output'); setSelectedFileForPreview(null); setSelectedFileId(null); }}
            disabled={!qcResults}
            className={`w-full flex items-center gap-3 p-2 rounded-md text-sm font-medium transition-colors ${activeFolder === 'output' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'} disabled:text-gray-400 disabled:cursor-not-allowed`}>
            <FolderIcon className="w-5 h-5" /> Output
          </button>
          <button onClick={() => { setActiveFolder('handled'); setSelectedFileForPreview(null); setSelectedFileId(null); }}
            disabled={handledFiles.length === 0}
            className={`w-full flex items-center gap-3 p-2 rounded-md text-sm font-medium transition-colors ${activeFolder === 'handled' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'} disabled:text-gray-400 disabled:cursor-not-allowed`}>
            <CheckCircle className="w-5 h-5 text-green-500" /> ABB (pass_qc)
          </button>
        </nav>
        <div className="mt-auto pt-4 space-y-2 border-t">
          <button onClick={handleRunQcWorkflow} disabled={isQcRunning || isNavigating}
            className="w-full px-4 py-3 bg-green-500 text-white font-bold rounded hover:bg-green-600 disabled:bg-gray-400 flex items-center justify-center gap-2">
            {isQcRunning ? (<><Loader2 className="w-5 h-5 animate-spin" />Processing...</>) : "Run Quality Control"}
          </button>
          <button onClick={handleContinue} disabled={isNavigating || isNavigating}
            className="w-full px-4 py-2 bg-blue-500 text-white font-bold rounded hover:bg-blue-600 flex items-center justify-center transition-colors disabled:bg-gray-400 disabled:cursor-wait">
            {isNavigating ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading...</>) : ("Continue")}
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
          {/* Your table rendering logic is fine */}
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
