'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { type ParameterRow } from '@/types';
import { Loader2 } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';

// Fungsi untuk membuat parameter awal
const createInitialSplicingParameters = (): ParameterRow[] => {
    const createValues = (val: string | number) => ({ 'default': val });

    const splicingParams: Omit<ParameterRow, 'values'>[] = [
        { id: 1, location: 'Constant', mode: 'Input', comment: 'Depth at which to splice the logs', unit: 'm', name: 'SPLICEDEPTH', isEnabled: true },
        { id: 2, location: 'Log', mode: 'Input', comment: 'Gamma Ray Log from UPPER section (Run 1)', unit: '', name: 'GR_RUN1', isEnabled: true },
        { id: 3, location: 'Log', mode: 'Input', comment: 'Neutron Porosity Log from UPPER section (Run 1)', unit: '', name: 'NPHI_RUN1', isEnabled: true },
        { id: 4, location: 'Log', mode: 'Input', comment: 'Density Log from UPPER section (Run 1)', unit: '', name: 'RHOB_RUN1', isEnabled: true },
        { id: 5, location: 'Log', mode: 'Input', comment: 'Resistivity Log from UPPER section (Run 1)', unit: '', name: 'RT_RUN1', isEnabled: true },
        { id: 6, location: 'Log', mode: 'Input', comment: 'Gamma Ray Log from LOWER section (Run 2)', unit: '', name: 'GR_RUN2', isEnabled: true },
        { id: 7, location: 'Log', mode: 'Input', comment: 'Neutron Porosity Log from LOWER section (Run 2)', unit: '', name: 'NPHI_RUN2', isEnabled: true },
        { id: 8, location: 'Log', mode: 'Input', comment: 'Density Log from LOWER section (Run 2)', unit: '', name: 'RHOB_RUN2', isEnabled: true },
        { id: 9, location: 'Log', mode: 'Input', comment: 'Resistivity Log from LOWER section (Run 2)', unit: '', name: 'RT_RUN2', isEnabled: true },
        { id: 10, location: 'Log', mode: 'Output', comment: 'Spliced Gamma Ray Output Log', unit: '', name: 'GR', isEnabled: true },
        { id: 11, location: 'Log', mode: 'Output', comment: 'Spliced Neutron Porosity Output Log', unit: '', name: 'NPHI', isEnabled: true },
        { id: 12, location: 'Log', mode: 'Output', comment: 'Spliced Density Output Log', unit: '', name: 'RHOB', isEnabled: true },
        { id: 13, location: 'Log', mode: 'Output', comment: 'Spliced Resistivity Output Log', unit: '', name: 'RT', isEnabled: true },
    ];

    // Nilai default yang akan menjadi sumber opsi dropdown
    const defaultValues: Record<string, string | number> = {
        'SPLICEDEPTH': 1520,
        'GR_RUN1': 'GR_CAL',
        'GR_RUN2': 'DGRCC',
        'GR': 'GR',
        'NPHI_RUN1': 'TNPH',
        'NPHI_RUN2': 'TNPL',
        'NPHI': 'NPHI',
        'RHOB_RUN1': 'RHOZ',
        'RHOB_RUN2': 'ALCDLC',
        'RHOB': 'RHOB',
        'RT_RUN1': 'RLA5',
        'RT_RUN2': 'R39PC',
        'RT': 'RT',
    };

    return splicingParams.map(p => ({
        ...p,
        values: createValues(defaultValues[p.name] || '')
    }));
};

export default function SplicingParams() {
    const { selectedWells, wellColumns } = useDashboard();
    const router = useRouter();
    const [parameters, setParameters] = useState<ParameterRow[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [wellsForSplicing, setWellsForSplicing] = useState<string[]>([]);
    const [selectedRun1Well, setSelectedRun1Well] = useState<string>('');
    const [selectedRun2Well, setSelectedRun2Well] = useState<string>('');
    const [run1Columns, setRun1Columns] = useState<string[]>([]);
    const [run2Columns, setRun2Columns] = useState<string[]>([]);
    const [isLoadingColumns, setIsLoadingColumns] = useState(false);

    // Get available wells from wellColumns or selectedWells
    const availableWells = Object.keys(wellColumns).length > 0 ? Object.keys(wellColumns) : selectedWells;
    
    // Fetch well columns from API
    const fetchWellColumns = async (wells: string[]) => {
        if (wells.length === 0) return {};
        
        setIsLoadingColumns(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        
        try {
            const response = await fetch(`${apiUrl}/api/get-well-columns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wells }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch well columns');
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching well columns:', error);
            return {};
        } finally {
            setIsLoadingColumns(false);
        }
    };

    // Get available columns for specific parameter based on well assignment
    const getColumnsForParameter = (parameterName: string): string[] => {
        // Default fallback options
        const fallbackOptions = ['GR', 'NPHI', 'RHOB', 'RT', 'GR_CAL', 'TNPH', 'RHOZ', 'RLA5', 'DGRCC', 'TNPL', 'ALCDLC', 'R39PC'];
        
        if (parameterName.includes('_RUN1')) {
            // Parameters for Run 1 (Upper) well
            return run1Columns.length > 0 ? run1Columns : fallbackOptions;
        } else if (parameterName.includes('_RUN2')) {
            // Parameters for Run 2 (Lower) well
            return run2Columns.length > 0 ? run2Columns : fallbackOptions;
        } else {
            // Output parameters - combine both wells' columns
            const combinedColumns = [...new Set([...run1Columns, ...run2Columns])];
            return combinedColumns.length > 0 ? combinedColumns : fallbackOptions;
        }
    };

    // useEffect untuk mengatur parameter awal
    useEffect(() => {
        setParameters(createInitialSplicingParameters());
    }, []);

    // useEffect untuk auto-select wells saat availableWells berubah
    useEffect(() => {
        // Only auto-select if no wells are currently selected
        if (!selectedRun1Well && !selectedRun2Well && availableWells.length >= 2) {
            setSelectedRun1Well(availableWells[0]);
            setSelectedRun2Well(availableWells[1]);
        } else if (!selectedRun1Well && availableWells.length === 1) {
            setSelectedRun1Well(availableWells[0]);
        }
    }, [availableWells.length]);

    // Fetch columns when Run 1 well changes
    useEffect(() => {
        if (selectedRun1Well) {
            fetchWellColumns([selectedRun1Well]).then(data => {
                if (data[selectedRun1Well]) {
                    setRun1Columns(data[selectedRun1Well]);
                }
            });
        } else {
            setRun1Columns([]);
        }
    }, [selectedRun1Well]);

    // Fetch columns when Run 2 well changes
    useEffect(() => {
        if (selectedRun2Well) {
            fetchWellColumns([selectedRun2Well]).then(data => {
                if (data[selectedRun2Well]) {
                    setRun2Columns(data[selectedRun2Well]);
                }
            });
        } else {
            setRun2Columns([]);
        }
    }, [selectedRun2Well]);

    // Update wellsForSplicing when individual well selections change
    useEffect(() => {
        const newWellsForSplicing = [];
        if (selectedRun1Well) newWellsForSplicing.push(selectedRun1Well);
        if (selectedRun2Well && selectedRun2Well !== selectedRun1Well) {
            newWellsForSplicing.push(selectedRun2Well);
        }
        setWellsForSplicing(newWellsForSplicing);
    }, [selectedRun1Well, selectedRun2Well]);

    const handleValueChange = (id: number, newValue: string) => {
        setParameters(prev => prev.map(row => {
            if (row.id !== id) return row;
            return { ...row, values: { 'default': newValue } };
        }));
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
            selected_wells: wellsForSplicing,
        };

        console.log("Payload yang dikirim ke backend:", payload);
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const endpoint = `${apiUrl}/api/run-splicing`;

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
            alert(result.message || "Proses Splicing/Merging berhasil!");
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
    
    const staticHeaders = ['#', 'Location', 'Mode', 'Comment', 'Name', 'Value'];

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">Splicing / Merging Logs</h2>
            
            {availableWells.length < 2 ? (
                <div className="flex-grow flex items-center justify-center">
                    <div className="text-center p-8 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Insufficient Wells</h3>
                        <p className="text-yellow-700 mb-4">
                            Splicing requires at least 2 wells to be selected. Currently available: {availableWells.length}
                        </p>
                        <p className="text-sm text-yellow-600">
                            Please select more wells from the sidebar or ensure well data is loaded.
                        </p>
                        <button 
                            onClick={() => router.back()} 
                            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            ) : (
            <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
                <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Run 1 Well (Upper Section):
                            </label>
                            <select
                                value={selectedRun1Well}
                                onChange={(e) => setSelectedRun1Well(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            >
                                <option value="">Select Run 1 Well...</option>
                                {availableWells.map(well => (
                                    <option key={well} value={well}>{well}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Run 2 Well (Lower Section):
                            </label>
                            <select
                                value={selectedRun2Well}
                                onChange={(e) => setSelectedRun2Well(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            >
                                <option value="">Select Run 2 Well...</option>
                                {availableWells.filter(well => well !== selectedRun1Well).map(well => (
                                    <option key={well} value={well}>{well}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700">
                            Selected Wells for Splicing: {wellsForSplicing.length > 0 ? wellsForSplicing.join(' & ') : 'No wells selected'}
                        </p>
                        {wellsForSplicing.length < 2 && (
                            <p className="text-xs text-red-500 mt-1">
                                Please select both Run 1 and Run 2 wells for splicing
                            </p>
                        )}
                        {isLoadingColumns && (
                            <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Loading well columns...
                            </p>
                        )}
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                        <button type="button" onClick={() => router.back()} className="px-6 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 font-semibold">Cancel</button>
                        <button 
                            type="submit" 
                            className="px-6 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700 flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed" 
                            disabled={isSubmitting || wellsForSplicing.length < 2}
                        >
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
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {parameters.map((param) => (
                                    <tr key={param.id} className={`border-b border-gray-200 ${getRowBgColor(param.location, param.mode)}`}>
                                        <td className="px-3 py-2 border-r text-center text-sm">{param.id}</td>
                                        <td className="px-3 py-2 border-r whitespace-nowrap text-sm">{param.location}</td>
                                        <td className="px-3 py-2 border-r whitespace-nowrap text-sm">{param.mode}</td>
                                        <td className="px-3 py-2 border-r whitespace-normal max-w-xs text-sm">{param.comment}</td>
                                        <td className="px-3 py-2 border-r font-semibold whitespace-nowrap text-sm">{param.name}</td>
                                        <td className="px-3 py-2 border-r bg-white text-black">
                                            {param.location === 'Log' ? (
                                                <select 
                                                    value={param.values['default'] ?? ''} 
                                                    onChange={(e) => handleValueChange(param.id, e.target.value)} 
                                                    className="w-full p-1 bg-white text-black"
                                                    disabled={isLoadingColumns}
                                                >
                                                    {isLoadingColumns ? (
                                                        <option value="">Loading columns...</option>
                                                    ) : (
                                                        getColumnsForParameter(param.name).map((colName: string) => (
                                                            <option key={colName} value={colName}>{colName}</option>
                                                        ))
                                                    )}
                                                </select>
                                            ) : (
                                                <input 
                                                    type="text" 
                                                    value={param.values['default'] ?? ''} 
                                                    onChange={(e) => handleValueChange(param.id, e.target.value)} 
                                                    className="w-full min-w-[100px] p-1 bg-white text-black" 
                                                />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </form>
            )}
        </div>
    );
}
