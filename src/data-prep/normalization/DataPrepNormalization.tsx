'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { type ParameterRow } from '@/types';
import { Loader2 } from 'lucide-react';

// Fungsi untuk membuat struktur parameter awal
const createInitialParameters = (): ParameterRow[] => {
    const createValues = (val: string | number) => ({ 'default': val });
    const allPossibleParams: Omit<ParameterRow, 'values'>[] = [
        { id: 1, location: 'Parameter', mode: 'Input', comment: 'Normalization: Min-Max', unit: '', name: 'NORMALIZE_OPT', isEnabled: true },
        { id: 2, location: 'Constant', mode: 'Input', comment: 'Input low log value (P5)', unit: '', name: 'LOW_IN', isEnabled: true },
        { id: 3, location: 'Constant', mode: 'Input', comment: 'Input high log value (P95)', unit: '', name: 'HIGH_IN', isEnabled: true },
        { id: 4, location: 'Constant', mode: 'Input', comment: 'Reference log low value', unit: '', name: 'LOW_REF', isEnabled: true },
        { id: 5, location: 'Constant', mode: 'Input', comment: 'Reference log high value', unit: '', name: 'HIGH_REF', isEnabled: true },
        { id: 6, location: 'Log', mode: 'Input', comment: 'Input Log', unit: '', name: 'LOG_IN', isEnabled: true },
        { id: 7, location: 'Log', mode: 'Output', comment: 'Output Log Name', unit: '', name: 'LOG_OUT', isEnabled: true },
    ];
    const defaultValues: Record<string, string | number> = {
        'NORMALIZE_OPT': 'MIN-MAX', 'LOG_IN': 'DGRCC', 'LOG_OUT': 'DGRCC_NO',
        'LOW_REF': 40, 'HIGH_REF': 140, 'LOW_IN': '5', 'HIGH_IN': '95',
    };
    return allPossibleParams.map(p => ({ ...p, values: createValues(defaultValues[p.name] || '') }));
};

const dataPrepPath = { field: 'adera', structure: 'benuang', wellFolder: 'BNG-057' };

export default function DataPrepNormalizationParams() {
    const router = useRouter();
    const [parameters, setParameters] = useState<ParameterRow[]>(createInitialParameters());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetchingDefaults, setIsFetchingDefaults] = useState(false);

    // State khusus untuk Data Prep
    const [availableFiles, setAvailableFiles] = useState<string[]>([]);
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [wellColumns, setWellColumns] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 1. Ambil daftar file dari direktori data mentah saat komponen dimuat
    useEffect(() => {
        const fetchFilesFromDirectory = async () => {
            setIsLoading(true);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            try {
                const { field, structure, wellFolder } = dataPrepPath;
                const response = await fetch(`${apiUrl}/api/well-folder-files/${field}/${structure}/${wellFolder}`);
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
    }, []);

    // Helper untuk membuat path lengkap dari nama file
    const constructFilePaths = useCallback((files: string[]) => {
        const { field, structure, wellFolder } = dataPrepPath;
        return files.map(file => `data/structures/${field}/${structure}/${wellFolder}/${file}`);
    }, []);

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
                setWellColumns([...new Set(allCols)]);
            } catch (error) {
                console.error(error);
            }
        };
        fetchColumns();
    }, [constructFilePaths, selectedFiles]);
    
    const currentLogIn = useMemo(() =>
        parameters.find(p => p.name === 'LOG_IN')?.values['default'] as string,
    [parameters]);

    // 3. Ambil nilai persentil saat file atau LOG_IN berubah
    useEffect(() => {
        const fetchPercentileDefaults = async (logColumn: string) => {
            if (selectedFiles.length === 0 || !logColumn) return;
            setIsFetchingDefaults(true);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            try {
                const response = await fetch(`${apiUrl}/api/get-log-percentiles`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        file_paths: constructFilePaths(selectedFiles),
                        selected_intervals: [],
                        log_column: logColumn,
                    }),
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Gagal mengambil persentil dari backend.");
                }
                const data = await response.json();
                setParameters(prev => prev.map(p => {
                    if (p.name === 'LOW_IN') return { ...p, values: { 'default': data.p5 } };
                    if (p.name === 'HIGH_IN') return { ...p, values: { 'default': data.p95 } };
                    return p;
                }));
            } catch (error) {
                console.error(error);
            } finally {
                setIsFetchingDefaults(false);
            }
        };

        if (currentLogIn) {
            fetchPercentileDefaults(currentLogIn);
        }
    }, [selectedFiles, currentLogIn, constructFilePaths]);
    
    // 4. Update LOG_OUT otomatis saat LOG_IN berubah
    useEffect(() => {
        if (currentLogIn) {
            setParameters(prev => prev.map(p => 
                p.name === 'LOG_OUT' ? { ...p, values: { 'default': `${currentLogIn}_NO` } } : p
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
                const value = param.values['default'];
                acc[param.name] = value;
                return acc;
            }, {} as Record<string, string | number>);

        const payload = {
            params: formParams,
            file_paths: constructFilePaths(selectedFiles),
            selected_intervals: []
        };
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const endpoint = `${apiUrl}/api/run-interval-normalization`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Server error');
            const result = await response.json();
            alert(result.message || "Proses normalisasi berhasil!");
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
            case 'Constant': return mode === 'Input' ? 'bg-yellow-300' : 'bg-yellow-100';
            case 'Log': return mode === 'Input' ? 'bg-cyan-400' : 'bg-cyan-200';
            case 'Output': return 'bg-yellow-600';
            case 'Interval': return 'bg-green-400';
            default: return 'bg-white';
        }
    };

    const staticHeaders = ['Location', 'Mode', 'Comment', 'Unit', 'Name', 'Value'];

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">Data Prep: Normalization</h2>
            
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                <h3 className="text-lg font-semibold mb-2">Select File(s) for Normalization</h3>
                <p className="text-sm text-gray-500 mb-4">Files from: `{`.../${dataPrepPath.structure}/${dataPrepPath.wellFolder}`}`</p>
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
                        <button type="submit" className="px-6 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700 flex items-center justify-center min-w-[80px]" disabled={isSubmitting || isFetchingDefaults || selectedFiles.length === 0}>
                            {(isSubmitting || isFetchingDefaults) ? <Loader2 className="animate-spin" /> : 'Start'}
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
                                        <td className="px-3 py-2 border-r">{param.location}</td>
                                        <td className="px-3 py-2 border-r">{param.mode}</td>
                                        <td className="px-3 py-2 border-r">{param.comment}</td>
                                        <td className="px-3 py-2 border-r">{param.unit}</td>
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