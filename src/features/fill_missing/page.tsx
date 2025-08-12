/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import Select from 'react-select';
import { Loader2 } from 'lucide-react';
import { useAppDataStore } from '@/stores/useAppDataStore';

export default function FillMissingParams() {
    // --- CONTEXT & ROUTER ----
    const { selectedWells, wellColumns, selectedFilePath } = useDashboard();
    const router = useRouter();
    const pathname = usePathname();

    const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
    const [maxConsecutive, setMaxConsecutive] = useState<number>(3);
    const [isFlagging, setIsFlagging] = useState(false);
    const [isFilling, setIsFilling] = useState(false);
    const [localColumns, setLocalColumns] = useState<string[]>([]);

    const isDataPrep = pathname.startsWith('/data-prep');

    const { fieldName, structureName, wellFolder, wellsDir } = useAppDataStore();

    // --- fetch kolom ketika di mode Data Prep dan ada file terpilih ---
    useEffect(() => {
        if (!isDataPrep) {
            setLocalColumns([]);
            return;
        }

        if (!selectedFilePath) {
            setLocalColumns([]);
            return;
        }

        let cancelled = false;

        const fetchColumns = async () => {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            try {
                const resp = await fetch(`${apiUrl}/api/get-well-columns`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ full_path: wellsDir }),
                });
                if (!resp.ok) {
                    const txt = await resp.text();
                    throw new Error(`Gagal mengambil kolom: ${resp.status} ${txt}`);
                }
                const data = await resp.json();

                // Normalisasi respons:
                // - jika backend kirim array -> langsung gunakan
                // - jika backend kirim object { filename: [cols], ... } -> gabungkan semua values
                // - fallback: []
                let cols: string[] = [];
                if (Array.isArray(data)) {
                    cols = data;
                } else if (data && typeof data === 'object') {
                    const arrays = Object.values(data).filter(v => Array.isArray(v)) as string[][];
                    if (arrays.length > 0) {
                        cols = Array.from(new Set(arrays.flat()));
                    } else {
                        // maybe backend returns something like { combined: [...] }
                        if (Array.isArray((data as any).combined)) {
                            cols = (data as any).combined;
                        } else {
                            cols = [];
                        }
                    }
                }

                if (!cancelled) {
                    setLocalColumns(cols);
                }
            } catch (err) {
                console.error('Error fetching columns:', err);
                if (!cancelled) setLocalColumns([]);
            }
        };

        fetchColumns();

        return () => { cancelled = true; };
    }, [isDataPrep, wellsDir]);

    // --- build dropdown options (DataPrep: localColumns, Dashboard: wellColumns for selectedWells) ---
    const logOptions = useMemo(() => {
        const excludedLogs = new Set(['DEPTH', 'STRUKTUR', 'WELL_NAME', 'CALI', 'SP', 'MARKER', 'ZONE', 'MISSING_FLAG']);

        let sourceColumns: string[] = [];

        if (isDataPrep) {
            sourceColumns = Array.isArray(localColumns) ? localColumns : [];
        } else {
            if (!selectedWells || selectedWells.length === 0) return [];
            const unique = new Set<string>();
            selectedWells.forEach((wellName: string) => {
                const cols = (wellColumns && wellColumns[wellName]) || [];
                cols.forEach((c: string) => {
                    if (c) unique.add(c);
                });
            });
            sourceColumns = Array.from(unique);
        }

        // filter & sort
        const filtered = sourceColumns
            .filter(c => c && !excludedLogs.has(c.toUpperCase()))
            .sort((a, b) => a.localeCompare(b));

        return filtered.map(c => ({ label: c, value: c }));
    }, [isDataPrep, localColumns, selectedWells, wellColumns]);

    // --- payload creator (normalisasi file_paths) ---
    const createPayload = () => {
        if (isDataPrep) {
            const selectedPaths = wellsDir;
            if (!selectedPaths || selectedPaths.length === 0) {
                alert("Please select at least one file from the Wells Browser sidebar.");
                return null;
            }
            return { file_paths: selectedPaths };
        } else {
            if (!selectedWells || selectedWells.length === 0) {
                alert("Please select a well from the dashboard sidebar.");
                return null;
            }
            return { selected_wells: selectedWells };
        }
    };

    // --- handlers ---
    const handleFlagSubmit = async () => {
        const basePayload = createPayload();
        if (!basePayload || selectedLogs.length === 0) {
            alert('Please select at least one log to flag.');
            return;
        }
        setIsFlagging(true);
        try {
            const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flag-missing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...basePayload, logs_to_check: selectedLogs, full_path: wellsDir }),
            });
            const result = await resp.json();
            if (!resp.ok) throw new Error(result?.error || 'Failed to run flagging process.');
            alert(`✅ ${result.message}`);
        } catch (err) {
            alert(`❌ ${err instanceof Error ? err.message : 'Unknown error'}`);
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
            const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/fill-flagged-missing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...basePayload, logs_to_fill: selectedLogs, max_consecutive_nan: maxConsecutive, full_path: wellsDir }),
            });
            const result = await resp.json();
            if (!resp.ok) throw new Error(result?.error || 'Failed to run filling process.');
            alert(`✅ ${result.message}`);
            router.push(isDataPrep ? '/data-prep' : '/dashboard');
        } catch (err) {
            alert(`❌ ${err instanceof Error ? err.message : 'Unknown error'}`);
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
                        ? `Context: Data Preparation (${wellsDir.length} files selected)`
                        : `Context: Dashboard (${(selectedWells || []).length} wells selected)`
                    }
                </p>
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 font-semibold">Cancel</button>
                    <button type="button" onClick={handleFlagSubmit} className="px-4 py-2 rounded-md text-white font-semibold bg-orange-500 hover:bg-orange-600 flex items-center justify-center min-w-[150px]" disabled={isFlagging || isFilling}>
                        {isFlagging ? <><Loader2 className="animate-spin w-4 h-4 mr-2" />Flagging...</> : 'Stage 1: Flag Missing'}
                    </button>
                    <button type="button" onClick={handleFillSubmit} className="px-4 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700 flex items-center justify-center min-w-[150px]" disabled={isFilling || isFlagging}>
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
                                    value={logOptions.filter(opt => selectedLogs.includes(opt.value))}
                                    onChange={(selected: any) => setSelectedLogs(Array.isArray(selected) ? selected.map((s: any) => s.value) : [])}
                                    className="min-w-[200px] text-sm text-black"
                                    classNamePrefix="react-select"
                                    menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 })}}
                                    placeholder={logOptions.length ? 'Select logs...' : 'No logs available'}
                                    isDisabled={logOptions.length === 0}
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
