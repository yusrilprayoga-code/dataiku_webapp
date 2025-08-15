'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { type ParameterRow } from '@/types';
import { Loader2 } from 'lucide-react';
import { useAppDataStore } from '@/stores/useAppDataStore';

// Fungsi untuk membuat struktur parameter awal untuk Smoothing
const createInitialParameters = (): ParameterRow[] => {
    const createValues = (val: string | number) => ({ 'default': val });
    const smoothingParams: Omit<ParameterRow, 'values'>[] = [
        { id: 1, location: 'Parameter', mode: 'Input', comment: 'Smoothing method', unit: '', name: 'METHOD', isEnabled: true },
        { id: 2, location: 'Parameter', mode: 'Input', comment: 'Size of smooth window (odd number)', unit: '', name: 'WINDOW', isEnabled: true },
        { id: 3, location: 'Log', mode: 'Input', comment: 'Log to be smoothed', unit: '', name: 'LOG_IN', isEnabled: true },
        { id: 4, location: 'Log', mode: 'Output', comment: 'Smoothed log name', unit: '', name: 'LOG_OUT', isEnabled: true },
    ];
    const defaultValues: Record<string, string | number> = {
        'METHOD': 'MOVING_AVG',
        'WINDOW': 5,
        'LOG_IN': 'GR',
        'LOG_OUT': 'GR_SM',
    };
    return smoothingParams.map(p => ({ ...p, values: createValues(defaultValues[p.name] || '') }));
};

export default function DataPrepSmoothingParams() {
    const router = useRouter();
    const [parameters, setParameters] = useState<ParameterRow[]>(createInitialParameters());
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State khusus untuk Data Prep
    const [availableFiles, setAvailableFiles] = useState<string[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [wellColumns, setWellColumns] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { fieldName, structureName, wellFolder } = useAppDataStore();

    // 1. Ambil daftar file dari direktori data mentah
    useEffect(() => {
        const fetchFilesFromDirectory = async () => {
            setIsLoading(true);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            try {
                const response = await fetch(`${apiUrl}/api/well-folder-files/${fieldName}/${structureName}/${wellFolder}`);
                if (!response.ok) throw new Error("Gagal mengambil daftar file.");
                const data = await response.json();
                setAvailableFiles(data.csv_files || []);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchFilesFromDirectory();
    }, [fieldName, structureName, wellFolder]);

    // Helper untuk membuat path lengkap dari nama file
    const constructFilePaths = useCallback((files: string[]) => {
        return files.map(file => `data/structures/${fieldName}/${structureName}/${wellFolder}/${file}`);
    }, [fieldName, structureName, wellFolder]);

    // 2. Ambil daftar kolom saat pilihan file berubah
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
                if (!response.ok) throw new Error("Gagal mengambil kolom.");
                const data = await response.json();
                const allCols = Object.values(data).flat() as string[];
                const uniqueCols = [...new Set(allCols)];
                setWellColumns(uniqueCols);
            } catch (error) {
                console.error(error);
            }
        };
        fetchColumns();
    }, [selectedFiles, constructFilePaths]);
    
    const currentLogIn = useMemo(() =>
        parameters.find(p => p.name === 'LOG_IN')?.values['default'] as string,
    [parameters]);

    // 3. Update LOG_OUT secara otomatis saat LOG_IN berubah
    useEffect(() => {
        if (currentLogIn) {
            setParameters(prev => prev.map(p => 
                p.name === 'LOG_OUT' ? { ...p, values: { 'default': `${currentLogIn}_SM` } } : p
            ));
        }
    }, [currentLogIn]);

    const handleFileSelection = (fileName: string) => {
        setSelectedFiles(prev => 
            prev.includes(fileName) ? prev.filter(f => f !== fileName) : [...prev, fileName]
        );
    };

    const handleValueChange = (id: number, newValue: string) => {
        setParameters(prev => prev.map(row => 
            row.id === id ? { ...row, values: { 'default': newValue } } : row
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formParams = parameters
            .filter(p => p.isEnabled)
            .reduce((acc, param) => {
                acc[param.name] = param.values['default'];
                return acc;
            }, {} as Record<string, string | number>);

        const payload = {
            params: formParams,
            file_paths: constructFilePaths(selectedFiles),
            selected_intervals: [], // Interval selalu kosong di Data Prep
            selected_zones: [] // Zone selalu kosong di Data Prep
        };
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const endpoint = `${apiUrl}/api/run-smoothing`; // Target endpoint smoothing

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Server error');
            const result = await response.json();
            alert(result.message || "Proses smoothing berhasil!");
            router.push('/data-prep');
        } catch (error) {
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRowBgColor = (location: string, mode: string): string => {
        switch (location) {
            case 'Parameter': return 'bg-orange-600';
            case 'Log': return mode === 'Input' ? 'bg-cyan-400' : 'bg-cyan-200';
            default: return 'bg-white';
        }
    };

    const staticHeaders = ['#', 'Location', 'Mode', 'Comment', 'Name', 'Value'];

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">Data Prep: Smoothing</h2>
            
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                <h3 className="text-lg font-semibold mb-2">Select File(s) for Smoothing</h3>
                <p className="text-sm text-gray-500 mb-4">Files from: `{`.../${structureName}/${wellFolder}`}`</p>
                {isLoading ? <Loader2 className="animate-spin" /> : (
                    <div className="max-h-40 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-2 border p-2 rounded-md bg-white">
                        {availableFiles.map(file => (
                            <label key={file} className="flex items-center gap-2 text-sm truncate p-1 rounded hover:bg-gray-100">
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

            <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
                <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
                     <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => router.back()} className="px-6 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 font-semibold">Cancel</button>
                        <button type="submit" className="px-6 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700 flex items-center justify-center min-w-[80px]" disabled={isSubmitting || selectedFiles.length === 0}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Start'}
                        </button>
                    </div>
                </div>

                <h3 className="text-lg font-semibold mb-2 flex-shrink-0">Parameters</h3>
                <div className="flex-grow min-h-0 border border-gray-300 rounded-lg">
                    <div className="overflow-auto h-full">
                        <table className="min-w-full text-sm table-auto">
                            <thead className="bg-gray-200 sticky top-0 z-10">
                                <tr>
                                    {staticHeaders.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r">{header}</th>))}
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {parameters.map((param) => (
                                    <tr key={param.id} className={`border-b border-gray-200 ${param.isEnabled ? getRowBgColor(param.location, param.mode) : 'bg-gray-100 text-gray-400'}`}>
                                        <td className="px-3 py-2 border-r text-center">{param.id}</td>
                                        <td className="px-3 py-2 border-r">{param.location}</td>
                                        <td className="px-3 py-2 border-r">{param.mode}</td>
                                        <td className="px-3 py-2 border-r">{param.comment}</td>
                                        <td className="px-3 py-2 border-r font-semibold">{param.name}</td>
                                        <td className="px-3 py-2 border-r bg-white text-black">
                                            {param.name === 'LOG_IN' ? (
                                                <select value={param.values['default'] ?? ''} onChange={(e) => handleValueChange(param.id, e.target.value)} className="w-full p-1 bg-white" disabled={wellColumns.length === 0}>
                                                    {wellColumns.length > 0 ? (
                                                        wellColumns.map(col => <option key={col} value={col}>{col}</option>)
                                                    ) : (
                                                        <option>Select a file first</option>
                                                    )}
                                                </select>
                                            ) : param.name === 'METHOD' ? (
                                                <select value={param.values['default'] ?? ''} onChange={(e) => handleValueChange(param.id, e.target.value)} className="w-full p-1 bg-white">
                                                    <option value="MOVING_AVG">MOVING_AVG</option>
                                                </select>
                                            ) : (
                                                <input type="text" value={param.values['default'] ?? ''} onChange={(e) => handleValueChange(param.id, e.target.value)} className="w-full min-w-[100px] p-1 bg-white" />
                                            )}
                                        </td>
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