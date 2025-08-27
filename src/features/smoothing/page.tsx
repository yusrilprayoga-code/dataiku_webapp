'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import { type ParameterRow } from '@/types';
import { Loader2 } from 'lucide-react';
import { useAppDataStore } from '@/stores/useAppDataStore';

const createInitialSmoothingParameters = (selection: string[]): ParameterRow[] => {
    // Jika tidak ada interval/zones dipilih, gunakan satu kolom 'default' agar UI tetap muncul
    const effectiveSelection = selection.length > 0 ? selection : ['default'];
    const createValues = (val: string | number) => Object.fromEntries(effectiveSelection.map(i => [i, val]));

    const smoothingParams: Omit<ParameterRow, 'values'>[] = [
        { id: 1, location: 'Parameter', mode: 'Input', comment: 'Smoothing method', unit: '', name: 'METHOD', isEnabled: true },
        { id: 2, location: 'Parameter', mode: 'Input', comment: 'Size of smooth window', unit: '', name: 'WINDOW', isEnabled: true },
        { id: 3, location: 'Log', mode: 'Input', comment: 'Log to be smoothed', unit: '', name: 'LOG_IN', isEnabled: true },
        { id: 4, location: 'Log', mode: 'Output', comment: 'Smoothed log', unit: '', name: 'LOG_OUT', isEnabled: true },
    ];

    const defaultValues: Record<string, string | number> = {
        'METHOD': 'MOVING_AVG',
        'WINDOW': 5,
        'LOG_IN': 'GR',
    };

    defaultValues['LOG_OUT'] = `${defaultValues['LOG_IN']}_SM`;

    return smoothingParams.map(p => ({
        ...p,
        values: createValues(defaultValues[p.name] || '')
    }));
};

export default function SmoothingParams() {
    const { selectedWells, selectedIntervals, wellColumns, selectedZones } = useDashboard();
    const router = useRouter();
    const pathname = usePathname();
    const [parameters, setParameters] = useState<ParameterRow[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rowSync, setRowSync] = useState<Record<number, boolean>>({});
    const [availableColumns, setAvailableColumns] = useState<string[]>([]);

    const { wellsDir } = useAppDataStore();
    
    // Check if we're in DataPrep context by checking the current pathname
    const isDataPrep = pathname?.startsWith('/data-prep') || false;

    // Determine which intervals/zones to use based on priority (same as VSH)
    const isUsingZones = selectedZones.length > 0;

    useEffect(() => {
        // Use zones if available, otherwise use intervals (same logic as VSH)
        const effectiveSelection = selectedZones.length > 0 ? selectedZones : selectedIntervals;
        setParameters(createInitialSmoothingParameters(effectiveSelection));
    }, [selectedIntervals, selectedZones]);

    // Fetch available columns for DataPrep context
    useEffect(() => {
        const fetchWellColumns = async () => {
            if (!isDataPrep || !wellsDir) return;

            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL;
                const response = await fetch(`${apiUrl}/api/get-well-columns`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ full_path: wellsDir }),
                });

                if (!response.ok) {
                    console.error('Failed to fetch well columns');
                    return;
                }

                const data = await response.json();
                console.log(data)
                
                // Handle the response structure where data contains well files as keys
                const allColumns: string[] = [];
                
                // Extract columns from all wells
                Object.values(data).forEach((wellColumns: any) => {
                    if (Array.isArray(wellColumns)) {
                        allColumns.push(...wellColumns);
                    }
                });
                
                // Get unique columns and filter out excluded ones
                const excludedColumns = new Set(['DEPTH', 'STRUKTUR', 'WELL_NAME', 'CALI', 'SP', 'MARKER', 'ZONE', 'RESERVOIR_CLASS']);
                const uniqueColumns = [...new Set(allColumns)];
                const filteredColumns = uniqueColumns.filter((col: string) => !excludedColumns.has(col));
                
                setAvailableColumns(filteredColumns);
            } catch (error) {
                console.error('Error fetching well columns:', error);
            }
        };

        fetchWellColumns();
    }, [isDataPrep, wellsDir, selectedWells]);
    
    const allAvailableColumns = useMemo(() => {
        // In DataPrep context, use the dynamically fetched columns
        if (isDataPrep) {
            return availableColumns;
        }
        
        // In Dashboard context, use the existing logic
        if (selectedWells.length === 0) return [];

        // 1. Definisikan kolom-kolom yang akan dikecualikan/disembunyikan
        const excludedColumns = new Set(['DEPTH', 'STRUKTUR', 'WELL_NAME', 'CALI', 'SP', 'MARKER', 'ZONE', 'RESERVOIR_CLASS']);

        // Gabungkan semua kolom dari sumur yang dipilih
        const columns = selectedWells.flatMap(well => wellColumns[well] || []);
        // Buat daftar unik untuk menghindari duplikasi
        const uniqueColumns = [...new Set(columns)];

        // 2. Filter daftar kolom unik untuk membuang yang tidak diinginkan
        const filteredColumns = uniqueColumns.filter(col => !excludedColumns.has(col));

        // 3. Kembalikan hasil filter tanpa diurutkan (.sort() dihapus)
        return filteredColumns;
    }, [isDataPrep, availableColumns, selectedWells, wellColumns]);

    const handleValueChange = (id: number, interval: string, newValue: string) => {
        setParameters(prev => prev.map(row => {
            if (row.id !== id) return row;
            if (rowSync[id]) {
                const newValues = Object.fromEntries(
                    Object.keys(row.values).map(i => [i, newValue])
                );
                return { ...row, values: newValues };
            }
            return {
                ...row,
                values: { ...row.values, [interval]: newValue },
            };
        }));
    };

    const handleRowToggle = (id: number, isEnabled: boolean) => {
        setRowSync(prev => ({ ...prev, [id]: isEnabled }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Use the effective selection for value extraction (same as VSH)
        const firstActiveKey = isUsingZones 
            ? (selectedZones[0] || 'default') 
            : (selectedIntervals[0] || 'default');

        const formParams = parameters
            .filter(p => p.isEnabled)
            .reduce((acc, param) => {
                const value = param.values[firstActiveKey] || param.values[Object.keys(param.values)[0]];
                acc[param.name] = value;
                return acc;
            }, {} as Record<string, string | number>);

        const payload = {
            full_path: wellsDir,
            params: formParams,
            selected_wells: selectedWells,
            selected_intervals: isUsingZones ? [] : selectedIntervals,
            selected_zones: isUsingZones ? selectedZones : [],
        };
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const endpoint = `${apiUrl}/api/run-smoothing`; 

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server error');
            }
            const result = await response.json();
            alert(result.message || "Proses smoothing berhasil!");
            router.push('/dashboard');
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
    
    const staticHeaders = isDataPrep 
        ? ['#', 'Location', 'Mode', 'Comment', 'Unit', 'Name', 'Value']
        : ['#', 'Location', 'Mode', 'Comment', 'Unit', 'Name', 'P'];

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">Smoothing</h2>
            <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
                <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
                    <div className="md:col-span-4">
                        <p className="text-sm font-medium text-gray-700">Well: {selectedWells.join(', ') || 'N/A'} / Intervals: {selectedIntervals.length || selectedZones.length} selected</p>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                        <button type="button" onClick={() => router.back()} className="px-6 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 font-semibold">Cancel</button>
                        <button type="submit" className="px-6 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700 flex items-center justify-center" disabled={isSubmitting}>
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
                                    {staticHeaders.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">{header}</th>))}
                                    {!isDataPrep && selectedIntervals.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">{header}</th>))}
                                    {!isDataPrep && selectedZones.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">{header}</th>))}
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {parameters.map((param) => (
                                    <tr key={param.id} className={`border-b border-gray-200 ${param.isEnabled ? getRowBgColor(param.location, param.mode) : 'bg-gray-100 text-gray-400'}`}>
                                        <td className="px-3 py-2 border-r text-center text-sm">{param.id}</td>
                                        <td className="px-3 py-2 border-r whitespace-nowrap text-sm">{param.location}</td>
                                        <td className="px-3 py-2 border-r whitespace-nowrap text-sm">{param.mode}</td>
                                        <td className="px-3 py-2 border-r whitespace-normal max-w-xs text-sm">{param.comment}</td>
                                        <td className="px-3 py-2 border-r whitespace-nowrap text-sm">{param.unit}</td>
                                        <td className="px-3 py-2 border-r font-semibold whitespace-nowrap text-sm">{param.name}</td>
                                        {isDataPrep ? (
                                            <td className="px-3 py-2 border-r bg-white text-black">
                                                {param.name === 'METHOD' ? (
                                                    <select value={param.values['default'] ?? ''} onChange={(e) => handleValueChange(param.id, 'default', e.target.value)} className="w-full p-1 bg-white text-black">
                                                        <option value="MOVING_AVG">MOVING_AVG</option>
                                                    </select>
                                                ) : param.name === 'LOG_IN' ? (
                                                    <select 
                                                        value={param.values['default'] ?? ''} 
                                                        onChange={(e) => handleValueChange(param.id, 'default', e.target.value)} 
                                                        className="w-full p-1 bg-white text-black"
                                                    >
                                                        {allAvailableColumns.length === 0 && <option value="">No logs available</option>}
                                                        {allAvailableColumns.map(colName => (
                                                            <option key={colName} value={colName}>{colName}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input 
                                                        type="text" 
                                                        value={param.values['default'] ?? ''} 
                                                        onChange={(e) => handleValueChange(param.id, 'default', e.target.value)} 
                                                        className="w-full min-w-[100px] p-1 bg-white text-black" 
                                                    />
                                                )}
                                            </td>
                                        ) : (
                                            <>
                                                <td className="px-3 py-2 border-r text-center">
                                                    <input type="checkbox" className="h-4 w-4 rounded border-gray-400" checked={!!rowSync[param.id]} onChange={(e) => handleRowToggle(param.id, e.target.checked)} />
                                                </td>
                                                {selectedIntervals.map(interval => (
                                                    <td key={`${param.id}-${interval}`} className="px-3 py-2 border-r bg-white text-black">
                                                        {param.name === 'METHOD' ? (
                                                            <select value={param.values[interval] ?? ''} onChange={(e) => handleValueChange(param.id, interval, e.target.value)} className="w-full p-1 bg-white text-black">
                                                                <option value="MOVING_AVG">MOVING_AVG</option>
                                                            </select>
                                                        ) : param.name === 'LOG_IN' ? (
                                                            <select 
                                                                value={param.values[interval] ?? ''} 
                                                                onChange={(e) => handleValueChange(param.id, interval, e.target.value)} 
                                                                className="w-full p-1 bg-white text-black"
                                                            >
                                                                {allAvailableColumns.length === 0 && <option value="">No logs available</option>}
                                                                {allAvailableColumns.map(colName => (
                                                                    <option key={colName} value={colName}>{colName}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input 
                                                                type="text" 
                                                                value={param.values[interval] ?? ''} 
                                                                onChange={(e) => handleValueChange(param.id, interval, e.target.value)} 
                                                                className="w-full min-w-[100px] p-1 bg-white text-black" 
                                                            />
                                                        )}
                                                    </td>
                                                ))}
                                                {isUsingZones && selectedZones.map(zone => (
                                                    <td key={`${param.id}-${zone}`} className="px-3 py-2 border-r bg-white text-black">
                                                        {param.name === 'METHOD' ? (
                                                            <select value={param.values[zone] ?? ''} onChange={(e) => handleValueChange(param.id, zone, e.target.value)} className="w-full p-1 bg-white text-black">
                                                                <option value="MOVING_AVG">MOVING_AVG</option>
                                                            </select>
                                                        ) : param.name === 'LOG_IN' ? (
                                                            <select 
                                                                value={param.values[zone] ?? ''} 
                                                                onChange={(e) => handleValueChange(param.id, zone, e.target.value)} 
                                                                className="w-full p-1 bg-white text-black"
                                                            >
                                                                {allAvailableColumns.length === 0 && <option value="">No logs available</option>}
                                                                {allAvailableColumns.map(colName => (
                                                                    <option key={colName} value={colName}>{colName}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input 
                                                                type="text" 
                                                                value={param.values[zone] ?? ''} 
                                                                onChange={(e) => handleValueChange(param.id, zone, e.target.value)} 
                                                                className="w-full min-w-[100px] p-1 bg-white text-black" 
                                                            />
                                                        )}
                                                    </td>
                                                ))}
                                            </>
                                        )}
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