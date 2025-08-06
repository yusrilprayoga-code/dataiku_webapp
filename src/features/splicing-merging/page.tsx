'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { type ParameterRow } from '@/types';
import { Loader2 } from 'lucide-react';

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

// Daftar opsi dropdown dibuat secara manual dari nilai-nilai di atas
const manualLogOptions = [
    // RUN 1 (UPPER) Defaults
    'GR_CAL', 'TNPH', 'RHOZ', 'RLA5',
    // RUN 2 (LOWER) Defaults
    'DGRCC', 'TNPL', 'ALCDLC', 'R39PC',
    // Output Defaults
    'GR', 'NPHI', 'RHOB', 'RT'
];
// Buat daftar yang unik dan terurut
const uniqueAvailableColumns = [...new Set(manualLogOptions)].sort();


export default function SplicingParams() {
    const router = useRouter();
    const [parameters, setParameters] = useState<ParameterRow[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Sumur ditetapkan secara statis untuk halaman ini
    const wellsForSplicing = ['bng-57_wl_12_25_trim.las', 'bng-57_lwd_8_5_trim.las'];

    // useEffect sekarang hanya untuk mengatur parameter awal, tanpa memanggil API
    useEffect(() => {
        setParameters(createInitialSplicingParameters());
    }, []);

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
            <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
                <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
                    <div className="md:col-span-4">
                        <p className="text-sm font-medium text-gray-700">Wells for Splicing: {wellsForSplicing.join(' & ')}</p>
                        <p className="text-xs text-gray-500 mt-1">Run 1 (Upper): {wellsForSplicing[0]}, Run 2 (Lower): {wellsForSplicing[1]}</p>
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
                                                >
                                                    {/* Gunakan daftar kolom manual */}
                                                    {uniqueAvailableColumns.map(colName => (
                                                        <option key={colName} value={colName}>{colName}</option>
                                                    ))}
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
        </div>
    );
}
