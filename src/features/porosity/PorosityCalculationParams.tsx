// src/features/porosity/PorosityCalculationParams.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import { type ParameterRow } from '@/types';
import { Loader2 } from 'lucide-react';

// Fungsi diubah untuk menerima selectedIntervals agar struktur data benar
const createInitialPorosityParameters = (intervals: string[]): ParameterRow[] => {
    // Membuat objek values dengan key dari setiap interval yang dipilih
    const createValues = (val: string | number) =>
        Object.fromEntries(intervals.map(i => [i, val]));

    const porosityParams: Omit<ParameterRow, 'values'>[] = [
        { id: 1, location: 'Constant', mode: 'Input', comment: 'Fluid Density (e.g., 1.00 for water)', unit: 'g/cc', name: 'RHOB_FL', isEnabled: true },
        { id: 2, location: 'Constant', mode: 'Input', comment: 'Shale Density', unit: 'g/cc', name: 'RHOB_SH', isEnabled: true },
        { id: 3, location: 'Constant', mode: 'Input', comment: 'Dry Shale Density', unit: 'g/cc', name: 'RHOB_DSH', isEnabled: true },
        { id: 4, location: 'Constant', mode: 'Input', comment: 'Shale Neutron Porosity', unit: 'v/v', name: 'NPHI_SH', isEnabled: true },
        { id: 5, location: 'Constant', mode: 'Input', comment: 'Maximum allowed PHIE', unit: 'v/v', name: 'PHIE_MAX', isEnabled: true },
        { id: 6, location: 'Constant', mode: 'Input', comment: 'Base Rock Matrix Density (Sandstone)', unit: 'kg/m3', name: 'RHOB_MA_BASE', isEnabled: true },
        { id: 7, location: 'Constant', mode: 'Input', comment: 'Water Density', unit: 'g/cc', name: 'RHOB_W', isEnabled: true },
        { id: 8, location: 'Constant', mode: 'Input', comment: 'Max Extreme Density (Sandstone)', unit: 'kg/m3', name: 'RHOB_MAX', isEnabled: true },
    ];

    const defaultValues: Record<string, string | number> = {
        'RHOB_FL': 1.00,
        'RHOB_SH': 2.45,       // Nilai fallback, akan ditimpa oleh data dari API
        'RHOB_DSH': 2.60,
        'NPHI_SH': 0.35,       // Nilai fallback, akan ditimpa oleh data dari API
        'PHIE_MAX': 0.3,
        'RHOB_MA_BASE': 2.65,
        'RHOB_W': 1.00,
        'RHOB_MAX': 4.00
    };

    return porosityParams.map(p => ({
        ...p,
        values: createValues(defaultValues[p.name] || '')
    }));
};

export default function PorosityCalculationParams() {
    const { selectedWells, selectedIntervals } = useDashboard();
    const router = useRouter();
    const [parameters, setParameters] = useState<ParameterRow[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rowSync, setRowSync] = useState<Record<number, boolean>>({});
    const [isFetchingDefaults, setIsFetchingDefaults] = useState(false); // State loading

    // Inisialisasi atau re-inisialisasi parameter saat interval berubah
    useEffect(() => {
        if (selectedIntervals.length > 0) {
            setParameters(createInitialPorosityParameters(selectedIntervals));
        } else {
            setParameters([]);
        }
    }, [selectedIntervals]);

    // useEffect untuk mengambil nilai default RHOB_SH dan NPHI_SH dari backend
    useEffect(() => {
        const fetchIntersectionDefaults = async () => {
            if (selectedWells.length === 0) return;

            setIsFetchingDefaults(true);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            try {
                const response = await fetch(`${apiUrl}/api/get-intersection-point`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        selected_wells: selectedWells,
                        selected_intervals: selectedIntervals,
                    }),
                });

                if (!response.ok) {
                    const err = await response.json();
                    console.error("Gagal mengambil nilai default dari intersection point:", err.error);
                    return;
                }
                
                const data = await response.json();

                setParameters(prevParams => 
                    prevParams.map(param => {
                        if (param.name === "RHOB_SH" || param.name === "NPHI_SH") {
                            const newValue = param.name === "RHOB_SH" ? data.rhob_sh : data.nphi_sh;
                            const newValues = Object.fromEntries(
                                Object.keys(param.values).map(key => [key, newValue])
                            );
                            return { ...param, values: newValues };
                        }
                        return param;
                    })
                );
            } catch (error) {
                console.error("Error saat fetching intersection defaults:", error);
            } finally {
                setIsFetchingDefaults(false);
            }
        };

        fetchIntersectionDefaults();
    }, [selectedWells, selectedIntervals]);

    const handleValueChange = (id: number, interval: string, newValue: string) => {
        setParameters(prev =>
            prev.map(row => {
                if (row.id !== id) return row;
                if (rowSync[id]) {
                    const newValues = Object.fromEntries(
                        Object.keys(row.values).map(i => [i, newValue])
                    );
                    return { ...row, values: newValues };
                }
                return { ...row, values: { ...row.values, [interval]: newValue } };
            })
        );
    }

    const handleRowToggle = (id: number, isEnabled: boolean) => {
        setRowSync(prev => ({ ...prev, [id]: isEnabled }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formParams = parameters
            .filter(p => p.isEnabled)
            .reduce((acc, param) => {
                const firstInterval = selectedIntervals[0] || 'default';
                const value = param.values[firstInterval] ?? param.values['default'] ?? '';
                acc[param.name] = isNaN(Number(value)) ? value : Number(value);
                return acc;
            }, {} as Record<string, string | number>);

        const payload = { params: formParams, selected_wells: selectedWells, selected_intervals: selectedIntervals };
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const endpoint = `${apiUrl}/api/run-porosity-calculation`;

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
            alert(result.message || "Proses kalkulasi Porositas berhasil!");
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
    
    const tableHeaders = ['#', 'Location', 'Mode', 'Comment', 'Unit', 'Name', 'P'];

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">Porosity from density-neutron using Bateman/Konen method</h2>
            <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
                <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50 flex flex-col gap-4">
                    <div className="md:col-span-4">
                        <p className="text-sm font-medium text-gray-700">Well: {selectedWells.join(', ') || 'N/A'} / Intervals: {selectedIntervals.length} selected</p>
                    </div>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                        <button type="button" onClick={() => router.back()} className="px-6 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 font-semibold">Cancel</button>
                        <button type="submit" className="px-6 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700 flex items-center justify-center min-w-[80px]" disabled={isSubmitting || isFetchingDefaults}>
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
                                    {tableHeaders.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">{header}</th>))}
                                    {selectedIntervals.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">{header}</th>))}
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {parameters.map((param) => (
                                    <tr key={param.id} className={`border-b border-gray-200 ${param.isEnabled ? getRowBgColor(param.location, param.mode) : 'bg-gray-100 text-gray-400'}`}>
                                        <td className="px-3 py-2 border-r text-center">{param.id}</td>
                                        <td className="px-3 py-2 border-r whitespace-nowrap">{param.location}</td>
                                        <td className="px-3 py-2 border-r whitespace-nowrap">{param.mode}</td>
                                        <td className="px-3 py-2 border-r whitespace-normal max-w-xs">{param.comment}</td>
                                        <td className="px-3 py-2 border-r whitespace-nowrap">{param.unit}</td>
                                        <td className="px-3 py-2 border-r font-semibold whitespace-nowrap">{param.name}</td>
                                        <td className="px-3 py-2 border-r text-center"><input type="checkbox" className="h-4 w-4 rounded border-gray-400" checked={!!rowSync[param.id]} onChange={(e) => handleRowToggle(param.id, e.target.checked)} /></td>
                                        {selectedIntervals.map(interval => (
                                            <td key={interval} className="px-3 py-2 border-r bg-white text-black">
                                                <input
                                                    type="text"
                                                    value={param.values[interval] ?? ''}
                                                    onChange={(e) => handleValueChange(param.id, interval, e.target.value)}
                                                    className="w-full min-w-[100px] p-1 bg-white text-black disabled:bg-gray-100 disabled:text-gray-500"
                                                />
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