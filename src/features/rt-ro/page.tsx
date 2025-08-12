'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import { type ParameterRow } from '@/types';
import { Loader2 } from 'lucide-react';
import { useAppDataStore } from '@/stores/useAppDataStore';

const createInitialParameters = (intervals: string[]): ParameterRow[] => {
    const effectiveIntervals = intervals.length > 0 ? intervals : ['default'];
    const createValues = (val: string | number) => Object.fromEntries(effectiveIntervals.map(i => [i, val]));

    const allPossibleParams: Omit<ParameterRow, 'values'>[] = [
        // Parameter input oleh pengguna (angka)
        { id: 1, location: 'Constant', mode: 'Input', comment: 'Coeff for saturation equation: A', unit: '', name: 'A', isEnabled: true },
        { id: 2, location: 'Constant', mode: 'Input', comment: 'Coeff for saturation equation: M', unit: '', name: 'M', isEnabled: true },
        { id: 3, location: 'Constant', mode: 'Input', comment: 'Coeff for saturation equation: N', unit: '', name: 'N', isEnabled: true },
        { id: 4, location: 'Constant', mode: 'Input', comment: 'Shale Resistivity', unit: 'OHMM', name: 'RT_SH', isEnabled: true },
        
        // Parameter input log (dropdown)
        { id: 5, location: 'Log', mode: 'Input', comment: 'Apparent Water Resistivity', unit: 'OHMM', name: 'RWA', isEnabled: true },
        { id: 6, location: 'Log', mode: 'Input', comment: 'Effective Porosity', unit: 'V/V', name: 'PHIE', isEnabled: true },
        { id: 7, location: 'Log', mode: 'Input', comment: 'Volume of Shale', unit: 'V/V', name: 'VSH', isEnabled: true },
        { id: 8, location: 'Log', mode: 'Input', comment: 'Unflushed Zone Resistivity', unit: 'OHMM', name: 'RT', isEnabled: true },

        // Parameter output (tidak bisa diubah pengguna)
        { id: 9, location: 'Log', mode: 'Output', comment: 'Grouping ID based on IQUAL', unit: '', name: 'GROUP_ID', isEnabled: true },
        { id: 10, location: 'Log', mode: 'Output', comment: 'RT vs R0 Gradient', unit: '', name: 'RT_R0_GRAD', isEnabled: true },
        { id: 11, location: 'Log', mode: 'Output', comment: 'PHIE vs RT-R0 Gradient', unit: '', name: 'PHIE_RTR0_GRAD', isEnabled: true },
        { id: 12, location: 'Log', mode: 'Output', comment: 'Fluid Type (Gas/Water)', unit: '', name: 'FLUID_RTROPHIE', isEnabled: true },
        { id: 13, location: 'Log', mode: 'Output', comment: 'RT - R0', unit: 'OHMM', name: 'RT_RO', isEnabled: true },
    ];

    const defaultValues: Record<string, string | number> = {
        'A': 1,
        'M': 2,
        'N': 2,
        'RT_SH': 2.2,
        'RWA': 'RWA_FULL',
        'PHIE': 'PHIE',
        'VSH': 'VSH',
        'RT': 'RT',
        'GROUP_ID': 'GROUP_ID',
        'RT_R0_GRAD': 'RT_R0_GRAD',
        'PHIE_RTR0_GRAD': 'PHIE_RTR0_GRAD',
        'FLUID_RTROPHIE': 'FLUID_RTROPHIE',
        'RT_RO': 'RT_RO',
    };

    return allPossibleParams.map(p => ({
        ...p,
        values: createValues(defaultValues[p.name] || '')
    }));
};

export default function RtRoParams() {
    const { selectedWells, selectedIntervals, wellColumns, selectedZones } = useDashboard();
    const router = useRouter();
    const [parameters, setParameters] = useState<ParameterRow[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [linkedRows, setLinkedRows] = useState<Record<number, boolean>>({});
    const { wellsDir } = useAppDataStore();

    // Determine which intervals/zones to use based on priority
    const activeIntervals = selectedZones.length > 0 ? selectedZones : selectedIntervals;
    const isUsingZones = selectedZones.length > 0;

    useEffect(() => {
        const effectiveSelection = selectedZones.length > 0 ? selectedZones : selectedIntervals;
        setParameters(createInitialParameters(effectiveSelection));
    }, [selectedIntervals, selectedZones]);

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
                    const newValues = Object.fromEntries(Object.keys(row.values).map(i => [i, newValue]));
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

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const endpoint = `${apiUrl}/api/run-rt-r0`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Server error');
            
            const result = await response.json();
            alert(result.message || "Proses RT-RO berhasil!");
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
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">RT-RO Calculation</h2>

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
                                {parameters.map((param) => (
                                    <tr key={param.id} className={`border-b ${getRowBgColor(param.location, param.mode)}`}>
                                        <td className="px-3 py-2 border-r text-center">{param.id}</td>
                                        <td className="px-3 py-2 border-r">{param.location}</td>
                                        <td className="px-3 py-2 border-r">{param.mode}</td>
                                        <td className="px-3 py-2 border-r">{param.comment}</td>
                                        <td className="px-3 py-2 border-r">{param.unit}</td>
                                        <td className="px-3 py-2 border-r font-semibold">{param.name}</td>
                                        <td className="px-3 py-2 border-r text-center">
                                            <input type="checkbox" className="h-4 w-4 rounded" checked={!!linkedRows[param.id]} onChange={e => handleRowToggle(param.id, e.target.checked)} />
                                        </td>
                                        {displayColumns.map(column => {
                                            const currentValue = param.values[column] ?? '';
                                            const isLogInput = param.location === 'Log' && param.mode === 'Input';
                                            
                                            let filteredOptions: string[] = combinedColumns;
                                            if (param.name === 'RWA') filteredOptions = combinedColumns.filter(c => c.toUpperCase().includes('RWA'));
                                            if (param.name === 'PHIE') filteredOptions = combinedColumns.filter(c => c.toUpperCase().includes('PHIE'));
                                            if (param.name === 'VSH') filteredOptions = combinedColumns.filter(c => c.toUpperCase().includes('VSH'));
                                            if (param.name === 'RT') filteredOptions = combinedColumns.filter(c => c.toUpperCase().includes('RT'));
                                            
                                            return (
                                                <td key={column} className="px-3 py-2 border-r bg-white text-black">
                                                    {isLogInput ? (
                                                        <select
                                                            value={String(currentValue)}
                                                            onChange={(e) => handleValueChange(param.id, column, e.target.value)}
                                                            className="w-full p-1 bg-white"
                                                            disabled={!param.isEnabled}
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
                                                            disabled={!param.isEnabled || param.mode === 'Output'}
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