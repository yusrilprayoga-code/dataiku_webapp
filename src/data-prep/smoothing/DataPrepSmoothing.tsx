'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { type ParameterRow } from '@/types';
import { Loader2 } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';

// Fungsi untuk membuat struktur parameter awal untuk Smoothing (TIDAK BERUBAH)
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
    
    const { 
        selectedWells, 
        wellColumns, 
        fetchWellColumns
    } = useDashboard(); 
    
    useEffect(() => {
        if (selectedWells.length > 0) {
            const wellNamesOnly = selectedWells.map(well => well.replace(/\.csv$/, ''));
            fetchWellColumns(wellNamesOnly);
        }
    }, [selectedWells, fetchWellColumns]);

    const allAvailableColumns = useMemo(() => {
        if (!selectedWells || selectedWells.length === 0 || !wellColumns) {
            return [];
        }
        const allCols = Object.values(wellColumns).flat();
        return [...new Set(allCols)];
    }, [selectedWells, wellColumns]);

    const currentLogIn = useMemo(() =>
        parameters.find(p => p.name === 'LOG_IN')?.values['default'] as string,
    [parameters]);

    useEffect(() => {
        if (currentLogIn) {
            setParameters(prev => prev.map(p => 
                p.name === 'LOG_OUT' ? { ...p, values: { 'default': `${currentLogIn}_SM` } } : p
            ));
        }
    }, [currentLogIn]);


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
            file_paths: selectedWells, 
            selected_intervals: [], 
            selected_zones: [] 
        };

        console.log('Payload for Smoothing:', payload);
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const endpoint = `${apiUrl}/api/run-smoothing`;

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
                <h3 className="text-lg font-semibold mb-2">File(s) Selected for Smoothing</h3>
                <p className="text-sm text-gray-500 mb-2">
                    File-file berikut telah dipilih dari Wells Browser:
                </p>
                {selectedWells.length > 0 ? (
                    <div className="max-h-28 overflow-y-auto text-sm text-blue-800 bg-blue-50 p-2 rounded-md">
                        <ul className="list-disc list-inside">
                            {selectedWells.map(well => <li key={well}>{well}</li>)}
                        </ul>
                    </div>
                ) : (
                    <p className="text-sm text-red-600 font-medium">
                        Tidak ada file yang dipilih. Silakan pilih file dari Wells Browser terlebih dahulu.
                    </p>
                )}
            </div>

            <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
                <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => router.back()} className="px-6 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 font-semibold">Cancel</button>
                        <button type="submit" className="px-6 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700 flex items-center justify-center min-w-[80px]" disabled={isSubmitting || selectedWells.length === 0}>
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
                                                <select value={param.values['default'] ?? ''} onChange={(e) => handleValueChange(param.id, e.target.value)} className="w-full p-1 bg-white" disabled={allAvailableColumns.length === 0}>
                                                    {allAvailableColumns.length > 0 ? (
                                                        allAvailableColumns.map(col => <option key={col} value={col}>{col}</option>)
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