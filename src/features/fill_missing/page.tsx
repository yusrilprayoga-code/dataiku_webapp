/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import { Loader2 } from 'lucide-react';
import { useAppDataStore } from '@/stores/useAppDataStore';

export default function FillMissingParams() {
    // --- STATE MANAGEMENT ---
    const router = useRouter();
    const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
    const [maxConsecutive, setMaxConsecutive] = useState<number>(3);
    const [isFlagging, setIsFlagging] = useState(false);
    const [isFilling, setIsFilling] = useState(false);
    
    // State baru untuk pemilihan file dan kolom
    const [availableFiles, setAvailableFiles] = useState<string[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [wellColumns, setWellColumns] = useState<string[]>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(true);

    const { fieldName, structureName, wellFolder } = useAppDataStore();

    // --- DATA FETCHING ---

    // 1. Ambil daftar file dari direktori saat komponen dimuat
    useEffect(() => {
        const fetchFilesFromDirectory = async () => {
            setIsLoadingFiles(true);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            try {
                const response = await fetch(`${apiUrl}/api/well-folder-files/${fieldName}/${structureName}/${wellFolder}`);
                if (!response.ok) throw new Error("Gagal mengambil daftar file.");
                const data = await response.json();
                setAvailableFiles(data.csv_files || []);
            } catch (error) {
                console.error(error);
                alert("Error: Gagal memuat daftar file dari direktori.");
            } finally {
                setIsLoadingFiles(false);
            }
        };
        fetchFilesFromDirectory();
    }, [fieldName, structureName, wellFolder]);

    // Helper untuk membuat path lengkap dari nama file
    const constructFilePaths = useCallback((files: string[]) => {
        return files.map(file => `data/structures/${fieldName}/${structureName}/${wellFolder}/${file}`);
    }, [fieldName, structureName, wellFolder]);

    // 2. Ambil daftar kolom gabungan saat pilihan file berubah
    useEffect(() => {
        const fetchColumns = async () => {
            if (selectedFiles.length === 0) {
                setWellColumns([]);
                return;
            }
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            try {
                const fullPaths = constructFilePaths(selectedFiles);
                const response = await fetch(`${apiUrl}/api/get-well-columns`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ file_paths: fullPaths }),
                });
                if (!response.ok) throw new Error("Gagal mengambil kolom dari file yang dipilih.");
                const data = await response.json();
                const allCols = Object.values(data).flat() as string[];
                const uniqueCols = [...new Set(allCols)];
                setWellColumns(uniqueCols);
            } catch (error) {
                console.error(error);
                alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        };
        fetchColumns();
    }, [selectedFiles, constructFilePaths]);

    // --- UI LOGIC & HANDLERS ---

    const logOptions = useMemo(() => {
        const excludedLogs = new Set(['DEPTH', 'STRUKTUR', 'WELL_NAME', 'CALI', 'SP', 'MARKER', 'ZONE', 'MISSING_FLAG']);
        return wellColumns
            .filter(c => c && !excludedLogs.has(c.toUpperCase()))
            .sort((a, b) => a.localeCompare(b))
            .map(c => ({ label: c, value: c }));
    }, [wellColumns]);

    const handleFileSelection = (fileName: string) => {
        setSelectedFiles(prev => 
            prev.includes(fileName) ? prev.filter(f => f !== fileName) : [...prev, fileName]
        );
    };

    const runProcess = async (stage: 'flag' | 'fill') => {
        if (selectedFiles.length === 0) {
            alert("Silakan pilih setidaknya satu file untuk diproses.");
            return;
        }
        if (selectedLogs.length === 0) {
            alert(`Silakan pilih setidaknya satu log untuk di-${stage}.`);
            return;
        }

        stage === 'flag' ? setIsFlagging(true) : setIsFilling(true);

        const payload = {
            file_paths: constructFilePaths(selectedFiles),
            logs_to_check: selectedLogs, // untuk flag
            logs_to_fill: selectedLogs, // untuk fill
            max_consecutive_nan: maxConsecutive,
        };
        
        const endpoint = stage === 'flag' 
            ? `${process.env.NEXT_PUBLIC_API_URL}/api/flag-missing`
            : `${process.env.NEXT_PUBLIC_API_URL}/api/fill-flagged-missing`;

        try {
            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await resp.json();
            if (!resp.ok) throw new Error(result?.error || `Gagal menjalankan proses ${stage}.`);
            alert(`✅ ${result.message}`);
            if (stage === 'fill') router.push('/data-prep');
        } catch (err) {
            alert(`❌ ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            stage === 'flag' ? setIsFlagging(false) : setIsFilling(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Fill Missing Values (Two Stages)</h2>

            {/* --- BAGIAN BARU: PEMILIHAN FILE --- */}
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                <h3 className="text-lg font-semibold mb-2">Select File(s) to Process</h3>
                <p className="text-sm text-gray-500 mb-4">Files from: `{`.../${structureName}/${wellFolder}`}`</p>
                {isLoadingFiles ? <Loader2 className="animate-spin" /> : (
                    <div className="max-h-40 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-2 border p-2 rounded-md bg-white">
                        {availableFiles.map(file => (
                            <label key={file} className="flex items-center gap-2 text-sm truncate p-1 rounded hover:bg-gray-100 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={selectedFiles.includes(file)}
                                    onChange={() => handleFileSelection(file)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                {file}
                            </label>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 font-semibold">Cancel</button>
                    <button type="button" onClick={() => runProcess('flag')} className="px-4 py-2 rounded-md text-white font-semibold bg-orange-500 hover:bg-orange-600 flex items-center justify-center min-w-[150px]" disabled={isFlagging || isFilling || selectedFiles.length === 0}>
                        {isFlagging ? <><Loader2 className="animate-spin w-4 h-4 mr-2" />Flagging...</> : 'Stage 1: Flag Missing'}
                    </button>
                    <button type="button" onClick={() => runProcess('fill')} className="px-4 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700 flex items-center justify-center min-w-[150px]" disabled={isFilling || isFlagging || selectedFiles.length === 0}>
                        {isFilling ? <><Loader2 className="animate-spin w-4 h-4 mr-2" />Filling...</> : 'Stage 2: Fill Flagged'}
                    </button>
                </div>
            </div>

            <h3 className="text-lg font-semibold mb-2 flex-shrink-0">Parameters</h3>
            <div className="flex-grow min-h-0 border border-gray-300 rounded-lg overflow-auto">
                <table className="min-w-full text-sm table-auto">
                    <thead className="bg-gray-200 sticky top-0 z-10">
                        <tr>
                            {['#', 'Location', 'Comment', 'Name', 'Value'].map(header => (
                                <th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r">{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        <tr className="border-b">
                            <td className="px-3 py-2 border-r text-center bg-cyan-400">1</td>
                            <td className="px-3 py-2 border-r bg-cyan-400">Log</td>
                            <td className="px-3 py-2 border-r bg-cyan-400">Select logs to be flagged and filled</td>
                            <td className="px-3 py-2 border-r font-semibold bg-cyan-400">LOGS</td>
                            <td className="px-3 py-2 bg-white text-black">
                                <Select
                                    isMulti
                                    options={logOptions}
                                    value={logOptions.filter(opt => selectedLogs.includes(opt.value))}
                                    onChange={(selected: any) => setSelectedLogs(Array.isArray(selected) ? selected.map((s: any) => s.value) : [])}
                                    className="min-w-[200px] text-sm text-black"
                                    classNamePrefix="react-select"
                                    menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 })}}
                                    placeholder={selectedFiles.length === 0 ? 'Select file(s) first' : 'Select logs...'}
                                    isDisabled={selectedFiles.length === 0}
                                />
                            </td>
                        </tr>
                        <tr className="border-b">
                            <td className="px-3 py-2 border-r text-center bg-yellow-300">2</td>
                            <td className="px-3 py-2 border-r bg-yellow-300">Constant</td>
                            <td className="px-3 py-2 border-r bg-yellow-300">Max consecutive NaNs to fill (for Stage 2)</td>
                            <td className="px-3 py-2 border-r font-semibold bg-yellow-300">MAX_CONSECUTIVE_NAN</td>
                            <td className="px-3 py-2 bg-white text-black">
                                <input
                                    type="number"
                                    value={maxConsecutive}
                                    onChange={(e) => setMaxConsecutive(parseInt(e.target.value, 10) || 0)}
                                    className="w-full min-w-[100px] p-2 bg-white text-black border rounded"
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
