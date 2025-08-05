'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { type ParameterRow } from '@/types';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const createInitialParameters = (intervals: string[]): ParameterRow[] => {
    const createValues = (val: string | number) => Object.fromEntries(intervals.map(i => [i, val]));

    const allPossibleParams: Omit<ParameterRow, 'values'>[] = [
        { id: 1, location: 'Parameter', mode: 'Input', comment: 'Normalization: Min-Max', unit: 'ALPHA*15', name: 'NORMALIZE_OPT', isEnabled: true },
        { id: 2, location: 'Constant', mode: 'Input', comment: 'Input low log value', unit: '', name: 'LOW_IN', isEnabled: true },
        { id: 3, location: 'Constant', mode: 'Input', comment: 'Input high log value', unit: '', name: 'HIGH_IN', isEnabled: true },
        { id: 4, location: 'Constant', mode: 'Input', comment: 'Reference log low value', unit: '', name: 'LOW_REF', isEnabled: true },
        { id: 5, location: 'Constant', mode: 'Input', comment: 'Reference log high value', unit: '', name: 'HIGH_REF', isEnabled: true },
        { id: 6, location: 'Log', mode: 'Input', comment: 'Input Log', unit: 'LOG_IN', isEnabled: true, name: 'LOG_IN' },
        { id: 7, location: 'Log', mode: 'Output', comment: 'Output Log Name', unit: 'LOG_OUT', name: 'LOG_OUT', isEnabled: true },
    ];

    const relevantParamNames = new Set(['NORMALIZE_OPT', 'LOG_IN', 'LOG_OUT', 'LOW_REF', 'HIGH_REF', 'LOW_IN', 'HIGH_IN']);

    const defaultValues: Record<string, string | number> = {
        'NORMALIZE_OPT': 'MIN-MAX',
        'LOG_IN': 'GR',
        'LOG_OUT': 'GR_NORM',
        'LOW_REF': 40,
        'HIGH_REF': 140,
        'LOW_IN': 5, // Nilai awal ini akan segera ditimpa oleh data dari backend
        'HIGH_IN': 95 // Nilai awal ini akan segera ditimpa oleh data dari backend
    };

    return allPossibleParams
        .filter(p => relevantParamNames.has(p.name))
        .map(p => ({
            ...p,
            values: createValues(defaultValues[p.name] || '')
        }));
};

export default function NormalizationParams() {
    const { selectedWells, selectedIntervals } = useDashboard();
    const [parameters, setParameters] = useState<ParameterRow[]>([]);
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rowSync, setRowSync] = useState<Record<number, boolean>>({});
    // State baru untuk loading saat mengambil nilai persentil
    const [isFetchingDefaults, setIsFetchingDefaults] = useState(false);

    useEffect(() => {
        if (selectedIntervals.length > 0) {
            setParameters(createInitialParameters(selectedIntervals));
        }
    }, [selectedIntervals]);

    // useEffect untuk mengambil nilai persentil default dari backend
    useEffect(() => {
        const fetchPercentileDefaults = async (logColumn: string) => {
            if (selectedWells.length === 0 || !logColumn) return;

            setIsFetchingDefaults(true);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            try {
                const response = await fetch(`${apiUrl}/api/get-log-percentiles`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        selected_wells: selectedWells,
                        selected_intervals: selectedIntervals,
                        log_column: logColumn,
                    }),
                });

                if (!response.ok) {
                    console.error("Gagal mengambil nilai persentil default dari backend.");
                    return;
                }

                const data = await response.json();
                
                // Perbarui state parameter dengan nilai P5 dan P95 yang diterima
                setParameters(prevParams => {
                    return prevParams.map(param => {
                        const newValues = { ...param.values };
                        // Pastikan semua interval di-update jika sinkronisasi aktif
                        Object.keys(newValues).forEach(intervalKey => {
                            if (param.name === 'LOW_IN') {
                                newValues[intervalKey] = data.p5;
                            }
                            if (param.name === 'HIGH_IN') {
                                newValues[intervalKey] = data.p95;
                            }
                        });
                        return { ...param, values: newValues };
                    });
                });

            } catch (error) {
                console.error("Error saat fetching percentiles:", error);
            } finally {
                setIsFetchingDefaults(false);
            }
        };

        // Dapatkan nama log input saat ini dari state parameter
        const logInParam = parameters.find(p => p.name === 'LOG_IN');
        const firstInterval = selectedIntervals[0];
        const currentLogIn = firstInterval ? logInParam?.values[firstInterval] as string : undefined;

        if (currentLogIn) {
            fetchPercentileDefaults(currentLogIn);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        selectedWells, 
        selectedIntervals, 
        // Ekstrak nilai LOG_IN sebagai dependensi agar useEffect berjalan saat log diubah
        // eslint-disable-next-line react-hooks/exhaustive-deps
        parameters.find(p => p.name === 'LOG_IN')?.values[selectedIntervals[0] || '']
    ]);
    
    const handleUnifiedValueChange = (id: number, newValue: string, interval: string) => {
        setParameters(prev => prev.map(row => {
            if (row.id !== id) return row;
            // Jika sinkronisasi baris aktif, ubah semua nilai di baris itu
            if (rowSync[id]) {
                const newValues = Object.fromEntries(
                    Object.keys(row.values).map(i => [i, newValue])
                );
                return { ...row, values: newValues };
            }
            // Jika tidak, hanya ubah nilai untuk interval spesifik
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
        const formParams = parameters
            .filter(p => p.isEnabled)
            .reduce((acc, param) => {
                const firstInterval = selectedIntervals[0] || Object.keys(param.values)[0];
                const value = param.values[firstInterval];
                acc[param.name] = value;
                return acc;
            }, {} as Record<string, string | number>);

        const payload = {
            params: formParams,
            selected_wells: selectedWells,
            selected_intervals: selectedIntervals
        };

        console.log("Payload yang dikirim ke backend:", payload);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const endpoint = `${apiUrl}/api/run-interval-normalization`;

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
            console.log("Data yang sudah dinormalisasi diterima:", JSON.parse(result.data));
            alert(result.message + " Hasilnya ada di console (F12).");
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
            case 'Constant': return mode === 'Input' ? 'bg-yellow-300' : 'bg-yellow-100';
            case 'Log': return mode === 'Input' ? 'bg-cyan-400' : 'bg-cyan-200';
            case 'Output': return 'bg-yellow-600';
            case 'Interval': return 'bg-green-400';
            default: return 'bg-white';
        }
    };
    
    const staticHeaders = ['Location', 'Mode', 'Comment', 'Unit', 'Name', 'P'];

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">Normalize a log based on calibration parameters.</h2>
            <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
                <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
                    <div className="md:col-span-4">
                        <p className="text-sm font-medium text-gray-700">Well: {selectedWells.join(', ') || 'N/A'} / Intervals: {selectedIntervals.length} selected</p>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                        <button type="button" onClick={() => router.back()} className="px-6 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 font-semibold">Cancel</button>
                        <button type="submit" className="px-6 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700 flex items-center justify-center" disabled={isSubmitting || isFetchingDefaults}>
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
                                    {staticHeaders.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">{header}</th>))}
                                    {selectedIntervals.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">{header}</th>))}
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {parameters.map((param) => (
                                    <tr key={param.id} className={`border-b border-gray-200 ${param.isEnabled ? getRowBgColor(param.location, param.mode) : 'bg-gray-100 text-gray-400'}`}>
                                        <td className="px-3 py-2 border-r whitespace-nowrap text-sm">{param.location}</td>
                                        <td className="px-3 py-2 border-r whitespace-nowrap text-sm">{param.mode}</td>
                                        <td className="px-3 py-2 border-r whitespace-normal max-w-xs text-sm">{param.comment}</td>
                                        <td className="px-3 py-2 border-r whitespace-nowrap text-sm">{param.unit}</td>
                                        <td className="px-3 py-2 border-r font-semibold whitespace-nowrap text-sm">{param.name}</td>
                                        <td className="px-3 py-2 border-r text-center">
                                            <input type="checkbox" className="h-4 w-4 rounded border-gray-400" checked={!!rowSync[param.id]} onChange={(e) => handleRowToggle(param.id, e.target.checked)} />
                                        </td>
                                        {selectedIntervals.map(interval => (
                                            <td key={interval} className="px-3 py-2 border-r bg-white text-black">
                                                {param.name === 'NORMALIZE_OPT' ? (
                                                    <select value={param.values[interval] ?? ''} onChange={(e) => handleUnifiedValueChange(param.id, e.target.value, interval)} className="w-full p-1 bg-white text-black disabled:bg-gray-100 disabled:text-gray-500">
                                                        <option value="MIN-MAX">MIN-MAX</option>
                                                    </select>
                                                ) : (
                                                    <input type="text" value={param.values[interval] ?? ''} onChange={(e) => handleUnifiedValueChange(param.id, e.target.value, interval)} className="w-full min-w-[100px] p-1 bg-white text-black disabled:bg-gray-100 disabled:text-gray-500" />
                                                )}
                                            </td>
                                        ))}
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