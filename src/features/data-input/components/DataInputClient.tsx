/* eslint-disable @typescript-eslint/no-unused-vars */

// app/data-input-utama/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Papa from 'papaparse';
import { useAppDataStore } from '../../../stores/useAppDataStore';
import { QCResponse, PreviewableFile, ProcessedFileDataForDisplay, QCResult, QCStatus } from '@/types';
import { FileTextIcon, Folder as FolderIcon, Inbox, Loader2, Tags, Layers } from 'lucide-react'; 
import DataTablePreview from '@/features/data-input/components/DataTablePreview';
import SaveLocationModal from '@/features/data-input/components/SaveLocationModal';

const getStatusRowStyle = (status: QCStatus): string => {
    switch (status) {
        case 'MISSING_LOGS':
        case 'ERROR':
            return 'bg-red-100 hover:bg-red-200';
        case 'HAS_NULL':
            return 'bg-yellow-100 hover:bg-yellow-200';
        case 'EXTREME_VALUES':
            return 'bg-orange-100 hover:bg-orange-200';
        case 'PASS':
            return 'hover:bg-green-50';
        default:
            return 'hover:bg-gray-50';
    }
};

const getStatusBadgeStyle = (status: QCStatus): string => {
    switch (status) {
        case 'MISSING_LOGS':
            return 'bg-red-100 text-red-800';
        case 'HAS_NULL':
            return 'bg-yellow-100 text-yellow-800';
        case 'EXTREME_VALUES':
            return 'bg-orange-100 text-orange-800';
        case 'PASS':
            return 'bg-green-100 text-green-800';
        case 'ERROR':
            return 'bg-red-200 text-red-900 font-bold';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

export default function DataInputUtamaPage() {
    const router = useRouter();
    const { stagedStructure, qcResults, setQcResults, clearAllData, fetchFolderStructure  } = useAppDataStore();

    const [isLoading, setIsLoading] = useState(true); 
    const [isNavigating, setIsNavigating] = useState(false);
    const [activeFolder, setActiveFolder] = useState<'input' | 'output'>('input');
    const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
    const [selectedFileForPreview, setSelectedFileForPreview] = useState<PreviewableFile | null>(null);
    const [isQcRunning, setIsQcRunning] = useState(false);
    const [processedCSVs, setProcessedCSVs] = useState<Record<string, string>>({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const initialize = async () => {
          const dataFromStore = useAppDataStore.getState().stagedStructure;
          if (!dataFromStore) {
            router.replace('/');
          } else {
            await fetchFolderStructure();
            setIsLoading(false);
          }
        };
        initialize();
    }, [router, fetchFolderStructure]);

    const handleRunQcWorkflow = async () => {
        if (!stagedStructure) return;
        setIsQcRunning(true);
        setQcResults(null);
        setActiveFolder('output');
        setSelectedFileForPreview(null);
        setSelectedFileId(null);
        
        try {
            const wellLogs = stagedStructure.files
                .filter(f => f.fileCategory === 'well-log')
                .map(file => ({ name: file.originalName || file.name, content: file.rawContentString }));

            const markerFile = stagedStructure.files.find(f => f.fileCategory === 'marker');
            const zoneFile = stagedStructure.files.find(f => f.fileCategory === 'zone');

            const payload = {
                structureName: stagedStructure.userDefinedStructureName,
                well_logs: wellLogs,
                marker_data: markerFile ? { name: markerFile.name, content: markerFile.rawContentString } : null,
                zone_data: zoneFile ? { name: zoneFile.name, content: zoneFile.rawContentString } : null,
            };

            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            const endpoint = `${apiUrl}/api/run-qc`;
            
            const qcResponse = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            
            if (!qcResponse.ok) {
                const errorData = await qcResponse.json().catch(() => ({}));
                throw new Error(errorData.details || `Initial QC failed`);
            }
            
            const initialQcResults: QCResponse = await qcResponse.json();
            setQcResults(initialQcResults);
            setProcessedCSVs(initialQcResults.output_files || {});
        } catch (error) {
            alert(`Error saat QC: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsQcRunning(false);
        }
    };

    const handleContinue = () => {
      if (!qcResults || Object.keys(processedCSVs).length === 0) {
        alert("Please run Quality Control first to generate results.");
        return;
      }
      // Buka modal, jangan langsung navigasi
      setIsModalOpen(true); 
    };

    const handleSelectInputFile = (file: ProcessedFileDataForDisplay) => {
        setSelectedFileId(file.id);
        setSelectedFileForPreview({
            id: file.id, name: file.name, content: file.content, headers: file.headers,
        });
    };

    const handleSelectOutputFile = (result: QCResult) => {
        if (!qcResults) return;
        setSelectedFileId(result.well_name);
        const outputFilename = Object.keys(processedCSVs).find(name => name.startsWith(result.well_name));
        if (outputFilename && processedCSVs[outputFilename]) {
            Papa.parse(processedCSVs[outputFilename], {
                header: true,
                skipEmptyLines: true,
                complete: (res) => setSelectedFileForPreview({
                    id: result.well_name, name: outputFilename,
                    content: res.data, headers: res.meta.fields || []
                })
            });
        }
    };

    const renderFileCategory = (file: ProcessedFileDataForDisplay) => {
        switch(file.fileCategory) {
            case 'marker':
                return <span className="flex items-center gap-2 text-sm font-medium text-purple-700"><Tags className="w-4 h-4" /> Marker</span>;
            case 'zone':
                return <span className="flex items-center gap-2 text-sm font-medium text-cyan-700"><Layers className="w-4 h-4" /> Zone</span>;
            case 'well-log':
            default:
                return <span className="flex items-center gap-2 text-sm text-gray-600"><FileTextIcon className="w-4 h-4" /> Well Log</span>;
        }
    };

    const handleSaveToLocation = async (field: string, structure: string) => {
      setIsSaving(true);
      try {
        // Check if qcResults exists
        if (!qcResults) {
          alert("No QC results available.");
          setIsSaving(false);
          return;
        }

        // Filter sumur yang lolos QC (tidak MISSING_LOGS)
        const wellsToSave = qcResults.qc_summary
          .filter(r => r.status !== 'MISSING_LOGS')
          .map(r => ({
            wellName: r.well_name,
            csvContent: processedCSVs[`${r.well_name}.csv`]
          }))
          .filter(item => item.csvContent); // Pastikan konten ada

        if (wellsToSave.length === 0) {
          alert("No valid wells to save.");
          setIsSaving(false);
          return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const endpoint_save = `${apiUrl}/api/save-qc-results`;

        const response = await fetch(endpoint_save, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field: field,
            structure: structure,
            wells: wellsToSave
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save files on the server.');
        }

        const result = await response.json();
        console.log('Server response:', result);
        
        // Tutup modal dan lanjutkan ke dashboard
        setIsModalOpen(false);
        router.push('/dashboard');

      } catch (error) {
        console.error("Save failed:", error);
        alert(`Error saving results: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsSaving(false);
      }
    };

    if (isLoading || !stagedStructure) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                <p className="ml-4">Loading session data...</p>
            </div>
        );
    }

    // --- BAGIAN RETURN YANG DIPERBAIKI ---
    return (
        <>
        <SaveLocationModal 
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onSave={handleSaveToLocation}
              isSaving={isSaving}
            />
        <div className="flex h-[calc(100vh-80px)] bg-gray-50 text-gray-800">
            {/* Panel 1: Navigasi & Aksi */}
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
                </nav>
                <div className="mt-auto pt-4 space-y-2 border-t">
                    <button onClick={handleRunQcWorkflow} disabled={isQcRunning} className="w-full px-4 py-3 bg-green-500 text-white font-bold rounded hover:bg-green-600 disabled:bg-gray-400 flex items-center justify-center gap-2">
                        {isQcRunning ? (<><Loader2 className="w-5 h-5 animate-spin" />Processing...</>) : "Run Quality Control"}
                    </button>
                    <button onClick={handleContinue} disabled={isNavigating} className="w-full px-4 py-2 bg-blue-500 text-white font-bold rounded hover:bg-blue-600 flex items-center justify-center transition-colors disabled:bg-gray-400 disabled:cursor-wait">
                        {isNavigating ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading...</>) : "Continue"}
                    </button>
                    <button onClick={() => { clearAllData(); router.push('/'); }} className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                        Start New Session
                    </button>
                </div>
            </div>
            
            {/* Panel 2: Daftar File */}
            <div className="flex-1 bg-gray-100 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b font-semibold text-lg bg-white">
                    {activeFolder === 'input' && `Files in "${stagedStructure.userDefinedStructureName}"`}
                    {activeFolder === 'output' && "Initial QC Results"}
                </div>
                <div className="flex-1 overflow-y-auto">
                    {activeFolder === 'input' && (
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-200 sticky top-0">
                                <tr>
                                    <th className="w-3/5 px-4 py-2 text-left font-semibold text-gray-600">File Name</th>
                                    <th className="w-1/5 px-4 py-2 text-left font-semibold text-gray-600">Category</th>
                                    <th className="w-1/5 px-4 py-2 text-left font-semibold text-gray-600">Type</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stagedStructure.files.map((file) => (
                                    <tr key={file.id} onClick={() => handleSelectInputFile(file)} className={`cursor-pointer hover:bg-blue-50 ${selectedFileId === file.id ? 'bg-blue-100' : ''}`}>
                                        <td className="px-4 py-2 text-black truncate" title={file.name}>{file.name}</td>
                                        <td className="px-4 py-2">{renderFileCategory(file)}</td>
                                        <td className="px-4 py-2 text-black">{file.type}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {activeFolder === 'output' && qcResults && (
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-200 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Well Name</th>
                                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Status</th>
                                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {qcResults.qc_summary.map((result) => (
                                    <tr key={result.well_name} onClick={() => handleSelectOutputFile(result)} className={`cursor-pointer transition-colors ${getStatusRowStyle(result.status)} ${selectedFileId === result.well_name ? 'border-l-4 border-blue-500' : ''}`}>
                                        <td className="px-4 py-2 font-medium text-black">{result.well_name}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadgeStyle(result.status)}`}>
                                                {result.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-black">{result.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Panel 3: Pratinjau Konten */}
            <div className="flex-1 flex flex-col bg-white">
                <div className="p-4 border-b">
                    <h2 className="font-semibold text-lg">File Preview</h2>
                    <p className="text-sm text-gray-500 truncate">{selectedFileForPreview ? selectedFileForPreview.name : "No file selected"}</p>
                </div>
                <DataTablePreview file={selectedFileForPreview} />
            </div>
        </div>
     </>
    );
}

