'use client';

import React, { useState, useMemo, useEffect } from 'react';
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

    const defaultValues: Record<string, string | number> = {
        'SPLICEDEPTH': 1520, 'GR_RUN1': 'GR_CAL', 'GR_RUN2': 'DGRCC', 'GR': 'GR',
        'NPHI_RUN1': 'TNPH', 'NPHI_RUN2': 'TNPL', 'NPHI': 'NPHI',
        'RHOB_RUN1': 'RHOZ', 'RHOB_RUN2': 'ALCDLC', 'RHOB': 'RHOB',
        'RT_RUN1': 'RLA5', 'RT_RUN2': 'R39PC', 'RT': 'RT',
    };

    return splicingParams.map(p => ({
        ...p,
        values: createValues(defaultValues[p.name] || '')
    }));
};

export default function SplicingParams() {
    const { 
        selectedWells, 
        wellColumns, 
        setPlotFigure,
        fetchWellColumns
    } = useDashboard();

    const router = useRouter();
    const [parameters, setParameters] = useState<ParameterRow[]>(createInitialSplicingParameters());
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State lokal untuk menunjuk file mana dari `selectedWells` yang akan digunakan untuk Run 1 dan Run 2
    const [selectedRun1Path, setSelectedRun1Path] = useState<string>('');
    const [selectedRun2Path, setSelectedRun2Path] = useState<string>('');
    
    // Panggil fetchWellColumns untuk mendapatkan daftar kolom dari file yang dipilih
    useEffect(() => {
        if (selectedWells.length > 0) {
            fetchWellColumns(selectedWells);
        }
    }, [selectedWells, fetchWellColumns]);

    // Atur pilihan default untuk dropdown Run 1 dan Run 2 saat daftar file berubah
    useEffect(() => {
        if (selectedWells.length >= 2) {
            setSelectedRun1Path(selectedWells[0]);
            setSelectedRun2Path(selectedWells[1]);
        } else if (selectedWells.length === 1) {
            setSelectedRun1Path(selectedWells[0]);
            setSelectedRun2Path('');
        } else {
            setSelectedRun1Path('');
            setSelectedRun2Path('');
        }
    }, [selectedWells]);

    // Dapatkan daftar kolom untuk masing-masing file yang dipilih
    const run1Columns = useMemo(() => wellColumns[selectedRun1Path] || [], [wellColumns, selectedRun1Path]);
    const run2Columns = useMemo(() => wellColumns[selectedRun2Path] || [], [wellColumns, selectedRun2Path]);

    // Sediakan daftar kolom yang sesuai untuk setiap parameter di tabel
    const getColumnsForParameter = (parameterName: string): string[] => {
        const fallbackOptions = ['GR', 'NPHI', 'RHOB', 'RT', 'GR_CAL', 'TNPH', 'RHOZ', 'RLA5', 'DGRCC', 'TNPL', 'ALCDLC', 'R39PC'];
        if (parameterName.includes('_RUN1')) {
            return run1Columns.length > 0 ? run1Columns : fallbackOptions;
        } else if (parameterName.includes('_RUN2')) {
            return run2Columns.length > 0 ? run2Columns : fallbackOptions;
        } else {
            const combined = [...new Set([...run1Columns, ...run2Columns])];
            return combined.length > 0 ? combined : fallbackOptions;
        }
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
                acc[param.name] = param.values['default'];
                return acc;
            }, {} as Record<string, string | number>);

        const payload = {
            params: formParams,
            run1_file_path: selectedRun1Path,
            run2_file_path: selectedRun2Path,
        };

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
            
            // Generate plot setelah splicing berhasil
            const plotResponse = await fetch(`${apiUrl}/api/get-splicing-plot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file_path: result.output_file_path }),
            });
            
            if (!plotResponse.ok) throw new Error('Failed to generate plot');
            
            const plotData = await plotResponse.json();
            const parsedPlotData = typeof plotData === 'string' ? JSON.parse(plotData) : plotData;

            if (parsedPlotData && (parsedPlotData.data || parsedPlotData.layout)) {
                setPlotFigure({
                    data: parsedPlotData.data || [],
                    layout: parsedPlotData.layout || {}
                });
                alert(result.message || "Splicing/Merging completed! Plot has been generated.");
                router.push('/data-prep');
            } else {
                throw new Error('Invalid plot data structure');
            }
        } catch (error) {
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const getRowBgColor = (location: string, mode: string): string => {
        switch (location) {
            case 'Constant': return 'bg-yellow-300';
            case 'Log': return mode === 'Input' ? 'bg-cyan-400' : 'bg-cyan-200';
            default: return 'bg-white';
        }
    };
    
    const staticHeaders = ['#', 'Location', 'Mode', 'Comment', 'Name', 'Value'];

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">Splicing / Merging Logs</h2>
            
            {selectedWells.length < 2 ? (
                <div className="flex-grow flex items-center justify-center">
                    <div className="text-center p-8 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h3 className="text-lg font-semibold text-yellow-800 mb-2">Insufficient Files Selected</h3>
                        <p className="text-yellow-700 mb-4">
                            Splicing requires at least 2 files to be selected from the Wells Browser.
                            <br />
                            Currently selected: {selectedWells.length}
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">Run 1 Well (Upper Section):</label>
                            <select
                                value={selectedRun1Path}
                                onChange={(e) => setSelectedRun1Path(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                required
                            >
                                <option value="">Select Run 1 Well...</option>
                                {selectedWells.map(path => (
                                    <option key={path} value={path}>{path.split('/').pop()}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Run 2 Well (Lower Section):</label>
                            <select
                                value={selectedRun2Path}
                                onChange={(e) => setSelectedRun2Path(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md"
                                required
                            >
                                <option value="">Select Run 2 Well...</option>
                                {selectedWells.filter(path => path !== selectedRun1Path).map(path => (
                                    <option key={path} value={path}>{path.split('/').pop()}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                        <button type="button" onClick={() => router.back()} className="px-6 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 font-semibold">Cancel</button>
                        <button 
                            type="submit" 
                            className="px-6 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700 flex items-center justify-center disabled:bg-gray-400" 
                            disabled={isSubmitting || !selectedRun1Path || !selectedRun2Path}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Start Splicing'}
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
                                    <tr key={param.id} className={`border-b border-gray-200 ${getRowBgColor(param.location, param.mode)}`}>
                                        <td className="px-3 py-2 border-r text-center">{param.id}</td>
                                        <td className="px-3 py-2 border-r">{param.location}</td>
                                        <td className="px-3 py-2 border-r">{param.mode}</td>
                                        <td className="px-3 py-2 border-r">{param.comment}</td>
                                        <td className="px-3 py-2 border-r font-semibold">{param.name}</td>
                                        <td className="px-3 py-2 border-r bg-white text-black">
                                            {param.location === 'Log' ? (
                                                <select 
                                                    value={param.values['default'] ?? ''} 
                                                    onChange={(e) => handleValueChange(param.id, e.target.value)} 
                                                    className="w-full p-1 bg-white"
                                                    disabled={param.mode === 'Output'}
                                                >
                                                    {getColumnsForParameter(param.name).map((colName: string) => (
                                                        <option key={colName} value={colName}>{colName}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <input 
                                                    type="text" 
                                                    value={param.values['default'] ?? ''} 
                                                    onChange={(e) => handleValueChange(param.id, e.target.value)} 
                                                    className="w-full min-w-[100px] p-1 bg-white" 
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