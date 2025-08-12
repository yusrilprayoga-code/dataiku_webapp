/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import { type ParameterRow } from '@/types';
import { Loader2 } from 'lucide-react';
import { useAppDataStore } from '@/stores/useAppDataStore';

// Fungsi untuk membuat struktur parameter awal
const createInitialTrimParameters = (): ParameterRow[] => {
    const createValues = (val: string | number) => ({ default: val });
    const allParams: Omit<ParameterRow, 'values'>[] = [
        { id: 1, location: 'Parameter', mode: 'Input', comment: 'Pilih mode trim', unit: 'MODE', name: 'TRIM_MODE', isEnabled: true },
        { id: 2, location: 'Parameter', mode: 'Input', comment: 'Trim data di atas kedalaman ini', unit: 'm', name: 'DEPTH_ABOVE', isEnabled: true },
        { id: 3, location: 'Parameter', mode: 'Input', comment: 'Trim data di bawah kedalaman ini', unit: 'm', name: 'DEPTH_BELOW', isEnabled: true },
    ];
    const defaultValues: Record<string, string | number> = {
        TRIM_MODE: 'CUSTOM_TRIM',
        DEPTH_ABOVE: '',
        DEPTH_BELOW: '',
    };
    return allParams.map(p => ({ ...p, values: createValues(defaultValues[p.name] || '') }));
};

export default function TrimDataParams() {
    // Ambil state global dari context, termasuk selectedFilePath
    const { selectedWells, selectedIntervals, selectedFilePath } = useDashboard();
    const router = useRouter();
    const pathname = usePathname();
    
    const [parameters, setParameters] = useState<ParameterRow[]>(createInitialTrimParameters());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { wellsDir } = useAppDataStore();
    
    // Mendeteksi konteks saat ini (Dashboard atau Data Prep)
    const isDataPrep = pathname?.startsWith('/data-prep') || false;

    // Logika untuk mengambil daftar file dari direktori sekarang sudah dihapus dari sini,
    // karena kita akan mengandalkan `DirectorySidebar` untuk mengisi `selectedFilePath`.

    const handleValueChange = (id: number, newValue: string | number) => {
        setParameters(prev =>
            prev.map(row =>
                row.id === id ? { ...row, values: { default: newValue } } : row
            )
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formParams = parameters
            .filter(p => p.isEnabled)
            .reduce((acc, param) => {
                acc[param.name] = param.values.default;
                return acc;
            }, {} as Record<string, string | number>);

        // --- PERBAIKAN UTAMA: Payload yang Cerdas ---
        let payload: any;
        if (isDataPrep) {
            // Validasi: Pastikan sebuah file telah dipilih dari DirectorySidebar
            if (!selectedFilePath) {
                alert("Please select a file from the Wells Browser sidebar first.");
                setIsSubmitting(false);
                return;
            }
            // Payload untuk Data Prep: gunakan file_paths, abaikan interval
            payload = {
                params: formParams,
                file_paths: [selectedFilePath], // Kirim path file yang dipilih dari context
                selected_wells: selectedWells,                
                selected_intervals: []
            };
        } else {
            // Payload untuk Dashboard: gunakan selectedWells dan selectedIntervals
            payload = {
                params: formParams,
                full_path: wellsDir,
                selected_wells: selectedWells,
                selected_intervals: selectedIntervals
            };
        }
        // ---------------------------------------------
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const endpoint = `${apiUrl}/api/trim-data`;

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
            alert(result.message || 'Data berhasil di-trim.');
            router.push(isDataPrep ? '/data-prep' : '/dashboard');
        } catch (error) {
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Fungsi getRowBgColor dipertahankan
    const getRowBgColor = (location: string, mode: string): string => {
        switch (location) {
            case 'Parameter': return 'bg-orange-600 text-white';
            case 'Constant': return mode === 'Input' ? 'bg-yellow-300' : 'bg-yellow-100';
            case 'Log': return mode === 'Input' ? 'bg-cyan-400' : 'bg-cyan-200';
            default: return 'bg-white';
        }
    };

    const currentTrimMode = parameters.find(p => p.name === 'TRIM_MODE')?.values.default;
    const tableHeaders = ['#', 'Location', 'Mode', 'Comment', 'Unit', 'Name', 'Value'];

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">Trim Well Log Data</h2>
            
            <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
                <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50 flex flex-col gap-4">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">
                            Context: {isDataPrep ? 'Data Preparation' : 'Dashboard'}
                        </p>
                        {/* Tampilkan info sesuai konteks */}
                        {isDataPrep ? (
                            <p className="text-sm font-medium text-gray-700">
                                Selected File: <span className="font-semibold text-blue-600">{selectedFilePath ? selectedFilePath.split('/').pop() : 'None'}</span>
                            </p>
                        ) : (
                             <p className="text-sm font-medium text-gray-700">
                                Well: {selectedWells.join(', ') || 'N/A'} / Intervals: {selectedIntervals.length} selected
                            </p>
                        )}
                    </div>

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
                                    {tableHeaders.map(header => (
                                        <th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {parameters.map((param) => {
                                    if (param.name === 'DEPTH_ABOVE' && currentTrimMode !== 'DEPTH_ABOVE' && currentTrimMode !== 'CUSTOM_TRIM') return null;
                                    if (param.name === 'DEPTH_BELOW' && currentTrimMode !== 'DEPTH_BELOW' && currentTrimMode !== 'CUSTOM_TRIM') return null;

                                    return (
                                        <tr key={param.id} className={`border-b ${param.isEnabled ? '' : 'bg-gray-100 text-gray-400'}`}>
                                            <td className={`px-3 py-2 border-r text-center ${getRowBgColor(param.location, param.mode)}`}>{param.id}</td>
                                            <td className={`px-3 py-2 border-r whitespace-nowrap ${getRowBgColor(param.location, param.mode)}`}>{param.location}</td>
                                            <td className={`px-3 py-2 border-r whitespace-nowrap ${getRowBgColor(param.location, param.mode)}`}>{param.mode}</td>
                                            <td className={`px-3 py-2 border-r max-w-xs whitespace-normal ${getRowBgColor(param.location, param.mode)}`}>{param.comment}</td>
                                            <td className={`px-3 py-2 border-r whitespace-nowrap ${getRowBgColor(param.location, param.mode)}`}>{param.unit}</td>
                                            <td className={`px-3 py-2 border-r font-semibold whitespace-nowrap ${getRowBgColor(param.location, param.mode)}`}>{param.name}</td>
                                            <td className="px-3 py-2 border-r bg-white text-black">
                                                {param.name === 'TRIM_MODE' ? (
                                                    <select
                                                        value={String(param.values.default ?? '')}
                                                        onChange={(e) => handleValueChange(param.id, e.target.value)}
                                                        className="w-full min-w-[100px] p-1 bg-white"
                                                    >
                                                        <option value="DEPTH_ABOVE">DEPTH_ABOVE</option>
                                                        <option value="DEPTH_BELOW">DEPTH_BELOW</option>
                                                        <option value="CUSTOM_TRIM">CUSTOM_TRIM</option>
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        value={param.values.default ?? ''}
                                                        onChange={(e) => handleValueChange(param.id, e.target.value)}
                                                        className="w-full min-w-[100px] p-1 bg-white"
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </form>
        </div>
    );
};