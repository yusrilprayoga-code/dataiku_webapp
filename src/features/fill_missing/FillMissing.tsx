'use client';

import React, {useMemo, useEffect, useState} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import Select from 'react-select';
import { Loader2 } from 'lucide-react';
import { useAppDataStore } from '@/stores/useAppDataStore';

export default function FillMissingParams() {
    // Ambil state yang relevan dari context
    const { 
        selectedWells,
        wellColumns,
        selectedFilePath, // Ini adalah string path ke satu file
    } = useDashboard();
    
    const router = useRouter();
    const pathname = usePathname();

    const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
    const [maxConsecutive, setMaxConsecutive] = useState<number>(3);
    const [isFlagging, setIsFlagging] = useState(false);
    const [isFilling, setIsFilling] = useState(false);
    
    const isDataPrep = pathname.startsWith('/data-prep');

    const [localColumns, setLocalColumns] = useState<string[]>([]);
    const [isLoadingColumns, setIsLoadingColumns] = useState(false);

    const { fieldName, structureName, wellFolder, wellsDir } = useAppDataStore();

    // useEffect untuk mengambil kolom saat file dipilih di Data Prep
    useEffect(() => {
        // Hanya berjalan jika di mode Data Prep dan ada file yang dipilih
        if (isDataPrep && selectedFilePath) {
            const fetchColumns = async () => {
                setIsLoadingColumns(true);
                const apiUrl = process.env.NEXT_PUBLIC_API_URL;
                try {
                    const response = await fetch(`${apiUrl}/api/get-well-columns`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        // Kirim path file tunggal DI DALAM SEBUAH ARRAY
                        body: JSON.stringify({ full_path: wellsDir }),
                    });
                    if (!response.ok) throw new Error("Gagal mengambil kolom.");
                    
                    const data = await response.json();
                    const fileName = selectedFilePath.split('/').pop() || '';
                    setLocalColumns(data[fileName] || []);

                } catch (error) { 
                    console.error(error);
                    setLocalColumns([]);
                } finally {
                    setIsLoadingColumns(false);
                }
            };
            fetchColumns();
        } else if (isDataPrep) {
            setLocalColumns([]); // Reset jika tidak ada file dipilih
        }
    }, [isDataPrep, selectedFilePath]);

    // Opsi dropdown yang cerdas
    const logOptions = useMemo(() => {
        const excludedLogs = new Set(['DEPTH', 'STRUKTUR', 'WELL_NAME', 'CALI', 'SP', 'MARKER', 'ZONE', 'MISSING_FLAG']);
        let sourceColumns: string[];

        if (isDataPrep) {
            sourceColumns = localColumns; // Menggunakan state lokal
        } else {
            if (!selectedWells || selectedWells.length === 0) return [];
            const uniqueColumns = new Set(selectedWells.flatMap(well => wellColumns[well] || []));
            sourceColumns = Array.from(uniqueColumns);
        }
        
        return sourceColumns
            .filter(log => !excludedLogs.has(log.toUpperCase()))
            .map(log => ({ label: log, value: log }));
    }, [isDataPrep, localColumns, selectedWells, wellColumns]);
    
    // Helper untuk membuat payload yang sesuai
    const createPayload = () => {
        if (isDataPrep) {
            if (!selectedFilePath) {
                alert("Please select a file from the Wells Browser sidebar.");
                return null;
            }
            // Bungkus string path tunggal di dalam sebuah array
            return { file_paths: [selectedFilePath] };
        } else {
            if (selectedWells.length === 0) {
                alert("Please select a well from the dashboard sidebar.");
                return null;
            }
            return { selected_wells: selectedWells };
        }
    };

    const handleFlagSubmit = async () => {
        const basePayload = createPayload();
        if (!basePayload || selectedLogs.length === 0) {
            alert('Please select at least one log to flag.');
            return;
        }
        setIsFlagging(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flag-missing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...basePayload, logs_to_check: selectedLogs, full_path: wellsDir }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to run flagging process.');
            alert(`✅ ${result.message}`);
        } catch (error) {
            alert(`❌ ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsFlagging(false);
        }
    };

    const handleFillSubmit = async () => {
        const basePayload = createPayload();
        if (!basePayload || selectedLogs.length === 0) {
            alert('Please select at least one log to fill.');
            return;
        }
        setIsFilling(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/fill-flagged-missing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...basePayload, logs_to_fill: selectedLogs, max_consecutive_nan: maxConsecutive, full_path: wellsDir }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to run filling process.');
            alert(`✅ ${result.message}`);
            router.push(isDataPrep ? '/data-prep' : '/dashboard');
        } catch (error) {
            alert(`❌ ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsFilling(false);
        }
    };
    
    const getRowBgColor = (location: string): string => {
        if (location === 'Constant') return 'bg-yellow-300 text-gray-800';
        if (location === 'Log') return 'bg-cyan-400 text-gray-800';
        return 'bg-white';
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Fill Missing Values (Two Stages)</h2>

            <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-2">
                    {isDataPrep 
                        // --- PERBAIKAN TAMPILAN JUMLAH FILE ---
                        ? `Context: Data Preparation (${selectedFilePath ? 1 : 0} file selected)` 
                        : `Context: Dashboard (${selectedWells.length} wells selected)`
                    }
                </p>
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 font-semibold">Cancel</button>
                    <button type="button" onClick={handleFlagSubmit} className="px-4 py-2 rounded-md text-white font-semibold bg-orange-500 hover:bg-orange-600 flex items-center justify-center min-w-[150px]" disabled={isFlagging || isFilling}>
                        {isFlagging ? <><Loader2 className="animate-spin w-4 h-4 mr-2" />Flagging...</> : 'Stage 1: Flag Missing'}
                    </button>
                    <button type="button" onClick={handleFillSubmit} className="px-4 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700 flex items-center justify-center min-w-[150px]" disabled={isFilling || isFilling}>
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
                            <td className={`px-3 py-2 border-r text-center ${getRowBgColor('Log')}`}>1</td>
                            <td className={`px-3 py-2 border-r ${getRowBgColor('Log')}`}>Log</td>
                            <td className={`px-3 py-2 border-r ${getRowBgColor('Log')}`}>Select logs to be flagged and filled</td>
                            <td className={`px-3 py-2 border-r font-semibold ${getRowBgColor('Log')}`}>LOGS</td>
                            <td className="px-3 py-2 bg-white text-black">
                                <Select
                                    isMulti
                                    options={logOptions}
                                    isLoading={isLoadingColumns}
                                    value={logOptions.filter(opt => selectedLogs.includes(opt.value))}
                                    onChange={(selected) => setSelectedLogs(selected.map(s => s.value))}
                                    className="min-w-[200px] text-sm"
                                    classNamePrefix="react-select"
                                />
                            </td>
                        </tr>
                        <tr className="border-b">
                            <td className={`px-3 py-2 border-r text-center ${getRowBgColor('Constant')}`}>2</td>
                            <td className={`px-3 py-2 border-r ${getRowBgColor('Constant')}`}>Constant</td>
                            <td className={`px-3 py-2 border-r ${getRowBgColor('Constant')}`}>Max consecutive NaNs to fill (for Stage 2)</td>
                            <td className={`px-3 py-2 border-r font-semibold ${getRowBgColor('Constant')}`}>MAX_CONSECUTIVE_NAN</td>
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