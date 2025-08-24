/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { type ParameterRow } from '@/types';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';

// This function remains the same
const createInitialDepthMatchingParameters = (): ParameterRow[] => {
    const createValues = (val: string | number) => ({ 'default': val });
    const depthMatchingParams: Omit<ParameterRow, 'values'>[] = [
        { id: 1, location: 'Log', mode: 'Input', comment: 'Reference log for correlation (e.g., GR_CAL)', unit: '', name: 'REFERENCE_LOG', isEnabled: true },
        { id: 2, location: 'Log', mode: 'Input', comment: 'Log to be shifted to match the reference', unit: '', name: 'MATCHING_LOG', isEnabled: true },
        { id: 3, location: 'Log', mode: 'Output', comment: 'Name for the new depth-matched log', unit: '', name: 'OUTPUT_LOG', isEnabled: true },
    ];
    const defaultValues: Record<string, string | number> = {
        'REFERENCE_LOG': 'GR_CAL',
        'MATCHING_LOG': 'DGRCC',
        'OUTPUT_LOG': 'MATCHED_LOG_DS',
    };
    return depthMatchingParams.map(p => ({
        ...p,
        values: createValues(defaultValues[p.name] || '')
    }));
};

export default function DepthMatchingPage() {
    const { 
        selectedWells, 
        wellColumns, 
        columnError,
        fetchWellColumns,
        setPlotFigure
    } = useDashboard();

    const router = useRouter();
    const [parameters, setParameters] = useState<ParameterRow[]>(createInitialDepthMatchingParameters());
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [referenceWellPath, setReferenceWellPath] = useState<string>('');
    const [matchingWellPath, setMatchingWellPath] = useState<string>('');

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

    const logOptions = useMemo(() => {
        const excludedLogs = new Set(['DEPTH', 'STRUKTUR', 'WELL_NAME', 'CALI', 'SP', 'MARKER', 'ZONE', 'MISSING_FLAG']);
        return allAvailableColumns
            .filter(c => c && !excludedLogs.has(c.toUpperCase()))
            .sort((a, b) => a.localeCompare(b))
            .map(c => ({ label: c, value: c }));
    }, [allAvailableColumns]);
     
    const handleValueChange = (id: number, newValue: string) => {
        setParameters(prev => prev.map(row => 
            row.id === id ? { ...row, values: { 'default': newValue } } : row
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setPlotFigure({ data: [], layout: {} });

        const formParams = parameters.reduce((acc, param) => {
            acc[param.name] = param.values['default'];
            return acc;
        }, {} as Record<string, string | number>);

        const payload = {
            params: formParams,
            reference_well_path: referenceWellPath,
            matching_well_path: matchingWellPath,
        };

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const endpoint = `${apiUrl}/api/run-depth-matching`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Server error during depth matching');
            }
            
            const result = await response.json();
            const plotObject = JSON.parse(result);

            if (plotObject && (plotObject.data || plotObject.layout)) {
                setPlotFigure({ data: plotObject.data || [], layout: plotObject.layout || {} });
                alert("Depth Matching complete! Plot generated on the dashboard.");
                router.push('/dashboard');
            } else {
                throw new Error('Invalid plot data structure received from server.');
            }
        } catch (error) {
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const getRowBgColor = (location: string, mode: string): string => {
        if (location === 'Constant') return 'bg-yellow-300';
        if (location === 'Log' && mode === 'Input') return 'bg-cyan-400 text-white';
        if (location === 'Log' && mode === 'Output') return 'bg-cyan-200';
        return 'bg-white';
    };
    
    if (selectedWells.length < 2) {
        return (
            <div className="flex h-full items-center justify-center p-4">
                <div className="text-center p-8 bg-yellow-50 border border-yellow-200 rounded-lg shadow-md">
                    <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
                    <h3 className="mt-4 text-lg font-semibold text-yellow-800">Insufficient Files Selected</h3>
                    <p className="mt-2 text-yellow-700">
                        Depth Matching requires selecting at least 2 files from the Wells Browser.
                        <br />
                        You have currently selected: <strong>{selectedWells.length}</strong>
                    </p>
                    <button 
                        onClick={() => router.back()} 
                        className="mt-6 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col rounded-lg bg-white p-4 shadow-md md:p-6">
            <h2 className="flex-shrink-0 text-xl font-bold text-gray-800">Depth Matching Parameters</h2>
            
            <form onSubmit={handleSubmit} className="mt-4 flex min-h-0 flex-grow flex-col">
                <div className="flex-shrink-0 rounded-lg border bg-gray-50 p-4">
                    {columnError && (
                         <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-md">
                            <p><strong>Warning:</strong> {columnError}</p>
                         </div>
                    )}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">Reference Well (Static):</label>
                            <select
                                value={referenceWellPath}
                                onChange={(e) => setReferenceWellPath(e.target.value)}
                                className="w-full rounded-md border border-gray-300 p-2"
                                required
                            >
                                <option value="" disabled>Select Reference Well...</option>
                                {selectedWells.map(path => (
                                    <option key={path} value={path}>{path.split('/').pop()}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">Matching Well (to be Shifted):</label>
                            <select
                                value={matchingWellPath}
                                onChange={(e) => setMatchingWellPath(e.target.value)}
                                className="w-full rounded-md border border-gray-300 p-2"
                                required
                            >
                                <option value="" disabled>Select Matching Well...</option>
                                {selectedWells.filter(path => path !== referenceWellPath).map(path => (
                                    <option key={path} value={path}>{path.split('/').pop()}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end gap-2 border-t pt-4">
                        <button type="button" onClick={() => router.back()} className="rounded-md bg-gray-200 px-6 py-2 font-semibold text-gray-800 hover:bg-gray-300">Cancel</button>
                        <button 
                            type="submit" 
                            className="flex items-center justify-center rounded-md bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400" 
                            disabled={isSubmitting || !referenceWellPath || !matchingWellPath}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Run Depth Matching'}
                        </button>
                    </div>
                </div>

                <h3 className="flex-shrink-0 text-lg font-semibold mt-6 mb-2">Parameters</h3>
                <div className="min-h-0 flex-grow rounded-lg border border-gray-300">
                    <div className="h-full overflow-auto">
                        <table className="min-w-full text-sm">
                            <thead className="sticky top-0 z-10 bg-gray-200">
                                <tr>
                                    {['#', 'Location', 'Mode', 'Comment', 'Name', 'Value'].map(header => (
                                        <th key={header} className="border-b border-r px-3 py-2 text-left font-semibold text-gray-700">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {parameters.map((param) => (
                                    <tr key={param.id} className={`border-b border-gray-200`}>
                                        <td className={`border-r px-3 py-2 text-center ${getRowBgColor(param.location, param.mode)}`}>{param.id}</td>
                                        <td className={`border-r px-3 py-2 ${getRowBgColor(param.location, param.mode)}`}>{param.location}</td>
                                        <td className={`border-r px-3 py-2 ${getRowBgColor(param.location, param.mode)}`}>{param.mode}</td>
                                        <td className={`border-r px-3 py-2 ${getRowBgColor(param.location, param.mode)}`}>{param.comment}</td>
                                        <td className={`border-r px-3 py-2 font-semibold ${getRowBgColor(param.location, param.mode)}`}>{param.name}</td>
                                        <td className="border-r bg-white px-3 py-2 text-black">
                                            {param.mode === 'Input' && param.location === 'Log' ? (
                                                <select 
                                                    value={param.values['default'] ?? ''} 
                                                    onChange={(e) => handleValueChange(param.id, e.target.value)} 
                                                    className="w-full bg-white p-1"
                                                >
                                                    {allAvailableColumns.length > 0 ? (
                                                        allAvailableColumns.map((colName) => (
                                                            <option key={colName} value={colName}>{colName}</option>
                                                        ))
                                                    ) : (
                                                        <option value="" disabled>No columns loaded...</option>
                                                    )}
                                                </select>
                                            ) : (
                                                <input 
                                                    type="text" 
                                                    value={param.values['default'] ?? ''} 
                                                    onChange={(e) => handleValueChange(param.id, e.target.value)} 
                                                    className="w-full min-w-[100px] bg-white p-1"
                                                    disabled={param.mode === 'Output'}
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
        </div>
    );
}