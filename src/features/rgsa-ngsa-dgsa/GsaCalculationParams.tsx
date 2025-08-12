'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import { type ParameterRow } from '@/types';
import { Loader2 } from 'lucide-react';
import { useAppDataStore } from '@/stores/useAppDataStore';

// Definisikan tipe untuk props yang akan diterima komponen ini
interface GsaBaseParamsProps {
    moduleTitle: string;
    apiEndpoint: string;
    relevantParams: string[];
}

// Fungsi createInitialParameters sekarang menerima daftar parameter yang relevan
const createInitialParameters = (intervals: string[], relevantParamNames: string[]): ParameterRow[] => {
    const effectiveIntervals = intervals.length > 0 ? intervals : ['default'];
    const createValues = (val: string | number) => Object.fromEntries(effectiveIntervals.map(i => [i, val]));

    // Definisikan master list dari SEMUA parameter GSA yang mungkin
    const allPossibleParams: Omit<ParameterRow, 'values'>[] = [
        { id: 1, location: 'Constant', mode: 'Input', comment: 'Window wide of sliding average', unit: 'METRES', name: 'SLIDING_WINDOW', isEnabled: true },
        { id: 3, location: 'Log', mode: 'Input', comment: 'Input gamma ray log', unit: 'GAPI', name: 'GR', isEnabled: true },
        { id: 4, location: 'Log', mode: 'Input', comment: 'Input density log', unit: 'G/C3', name: 'DENS', isEnabled: true },
        { id: 5, location: 'Log', mode: 'Input', comment: 'Input neutron log', unit: 'V/V', name: 'NEUT', isEnabled: true },
        { id: 6, location: 'Log', mode: 'Input', comment: 'Input resistivity log', unit: 'OHMM', name: 'RES', isEnabled: true },
    ];

    // Definisikan nilai default
    const defaultValues: Record<string, string | number> = {
        'SLIDING_WINDOW': 10,
        'GR': 'GR',
        'DENS': 'RHOB',
        'NEUT': 'NPHI',
        'RES': 'RT',
    };

    // Filter parameter berdasarkan props `relevantParamNames` yang diterima
    return allPossibleParams
        .filter(p => relevantParamNames.includes(p.name))
        .map(p => ({
            ...p,
            values: createValues(defaultValues[p.name] || '')
        }));
};

export default function GsaBaseParams({ moduleTitle, apiEndpoint, relevantParams }: GsaBaseParamsProps) {
    const { selectedWells, selectedIntervals, wellColumns, selectedZones } = useDashboard();
    const router = useRouter();
    const [parameters, setParameters] = useState<ParameterRow[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [linkedRows, setLinkedRows] = useState<Record<number, boolean>>({});

    // Determine which intervals/zones to use based on priority
    const activeIntervals = selectedZones.length > 0 ? selectedZones : selectedIntervals;
    const isUsingZones = selectedZones.length > 0;

    const {wellsDir} = useAppDataStore();  

    // Use effective selection for parameter initialization
    useEffect(() => {
        const effectiveSelection = selectedZones.length > 0 ? selectedZones : selectedIntervals;
        setParameters(createInitialParameters(effectiveSelection, relevantParams)); 
    }, [selectedIntervals, selectedZones, relevantParams]);

    const combinedColumns = useMemo(() => {
        if (!selectedWells || selectedWells.length === 0) return [];
        const allCols = selectedWells.flatMap(well => wellColumns[well] || []);
        return [...new Set(allCols)];
    }, [selectedWells, wellColumns]);

    const handleValueChange = (id: number, interval: string, newValue: string) => {
        setParameters(prev =>
            prev.map(row => {
                if (row.id !== id) return row;
                if (linkedRows[id]) {
                    const newValues = Object.fromEntries(
                        Object.keys(row.values).map(i => [i, newValue])
                    );
                    return { ...row, values: newValues };
                }
                return { ...row, values: { ...row.values, [interval]: newValue } };
            })
        );
    };

    const handleRowToggle = (id: number, isEnabled: boolean) => {
        setLinkedRows(prev => ({ ...prev, [id]: isEnabled }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Use the effective selection for value extraction
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
            params: formParams,
            full_path: wellsDir,
            selected_wells: selectedWells,
            selected_intervals: isUsingZones ? [] : selectedIntervals,
            selected_zones: isUsingZones ? selectedZones : [],
        };
        
        // Gunakan endpoint dari props
        const endpoint = `${process.env.NEXT_PUBLIC_API_URL}${apiEndpoint}`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Server error');
            
            const result = await response.json();
            alert(result.message || "Proses kalkulasi berhasil!");
            router.push('/dashboard');
        } catch (error) {
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRowBgColor = (location: string, mode: string): string => {
        switch (location) {
        case 'Parameter':
            return 'bg-orange-600';

        case 'Constant':
            if (mode === 'Input') {
            return 'bg-yellow-300';
            } else {
            return 'bg-yellow-100';
            }

        case 'Log':
            if (mode === 'Input') {
            return 'bg-cyan-400';
            } else {
            return 'bg-cyan-200';
            }

        case 'Output':
            return 'bg-yellow-600';

        case 'Interval':
            return 'bg-green-400';

        default:
            return 'bg-white';
        }
    };

    const staticHeaders = ['#', 'Location', 'Mode', 'Comment', 'Unit', 'Name', 'P'];
    
    // Get display columns - avoid duplication between intervals and zones
    const displayColumns = isUsingZones ? selectedZones : selectedIntervals;

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-white rounded-lg shadow-md">
            {/* Gunakan judul dari props */}
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">{moduleTitle}</h2>

            <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
                <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
                    <p className="text-sm font-medium text-gray-700">
                        Well: {selectedWells.join(', ') || 'N/A'} / 
                        {isUsingZones ? 'Zones' : 'Intervals'}: {activeIntervals.length} selected
                    </p>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                        <button type="button" onClick={() => router.back()} className="px-6 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 font-semibold">Cancel</button>
                        <button type="submit" className="px-6 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
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
                                    {displayColumns.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r">{header}</th>))}
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {parameters.map(param => (
                                    <tr key={param.id} className={`border-b ${getRowBgColor(param.location, param.mode)}`}>
                                        <td className={`px-3 py-2 border-r text-center ${getRowBgColor(param.location, param.mode)}`}>{param.id}</td>
                                        <td className={`px-3 py-2 border-r whitespace-nowrap ${getRowBgColor(param.location, param.mode)}`}>{param.location}</td>
                                        <td className={`px-3 py-2 border-r whitespace-nowrap ${getRowBgColor(param.location, param.mode)}`}>{param.mode}</td>
                                        <td className={`px-3 py-2 border-r max-w-xs whitespace-normal ${getRowBgColor(param.location, param.mode)}`}>{param.comment}</td>
                                        <td className={`px-3 py-2 border-r whitespace-nowrap ${getRowBgColor(param.location, param.mode)}`}>{param.unit}</td>
                                        <td className={`px-3 py-2 border-r font-semibold whitespace-nowrap ${getRowBgColor(param.location, param.mode)}`}>{param.name}</td>
                                        <td className={`px-3 py-2 border-r text-center ${getRowBgColor(param.location, param.mode)}`}>
                                            <input type="checkbox" className="h-4 w-4 rounded" checked={!!linkedRows[param.id]} onChange={e => handleRowToggle(param.id, e.target.checked)} />
                                        </td>
                                        {displayColumns.map(column => {
                                            const currentValue = param.values[column] ?? '';
                                            const useDropdown = ['GR', 'DENS', 'NEUT', 'RES'].includes(param.name);
                                            
                                            let filteredOptions: string[] = combinedColumns;
                                            if (param.name === 'GR') filteredOptions = combinedColumns.filter(c => c.includes('GR'));
                                            else if (param.name === 'DENS') filteredOptions = combinedColumns.filter(c => c.includes('RHOB'));
                                            else if (param.name === 'NEUT') filteredOptions = combinedColumns.filter(c => c.includes('NPHI'));
                                            else if (param.name === 'RES') filteredOptions = combinedColumns.filter(c => c.includes('RT'));

                                            return (
                                                <td key={column} className="px-3 py-2 border-r bg-white text-black">
                                                    {useDropdown ? (
                                                        <select
                                                            value={String(currentValue)}
                                                            onChange={(e) => handleValueChange(param.id, column, e.target.value)}
                                                            className="w-full p-1 bg-white"
                                                        >
                                                            {!filteredOptions.includes(String(currentValue)) && <option value={String(currentValue)}>{String(currentValue)}</option>}
                                                            {filteredOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                        </select>
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            value={String(currentValue)}
                                                            onChange={(e) => handleValueChange(param.id, column, e.target.value)}
                                                            className="w-full min-w-[100px] p-1 bg-white"
                                                        />
                                                    )}
                                                </td>
                                            );
                                        })}
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