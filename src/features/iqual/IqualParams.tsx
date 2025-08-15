'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import { type ParameterRow } from '@/types';
import { Loader2 } from 'lucide-react';
import { useAppDataStore } from '@/stores/useAppDataStore';

// Fungsi untuk membuat parameter awal untuk IQUAL
const createInitialIQUALParameters = (selection: string[]): ParameterRow[] => {
    const effectiveSelection = selection.length > 0 ? selection : ['default'];
    const createValues = (val: string | number) => Object.fromEntries(effectiveSelection.map(i => [i, val]));

    // Definisikan parameter yang dibutuhkan untuk IQUAL
    const allPossibleParams: Omit<ParameterRow, 'values'>[] = [
        { id: 1, location: 'Constant', mode: 'Input', comment: 'Minimum effective porosity for reservoir flag', unit: 'V/V', name: 'PHIE_THRESHOLD', isEnabled: true },
        { id: 2, location: 'Constant', mode: 'Input', comment: 'Maximum volume of shale for reservoir flag', unit: 'V/V', name: 'VSH_THRESHOLD', isEnabled: true },
        { id: 3, location: 'Log', mode: 'Output', comment: 'Reservoir Quality Flag (1=Reservoir, 0=Non-Reservoir)', unit: '', name: 'IQUAL', isEnabled: true },
    ];

    // Nilai default untuk threshold
    const defaultValues: Record<string, string | number> = {
        'PHIE_THRESHOLD': 0.1,
        'VSH_THRESHOLD': 0.5,
        'IQUAL': 'IQUAL'
    };

    return allPossibleParams.map(p => ({
        ...p,
        values: createValues(defaultValues[p.name] || '')
    }));
};

// Komponen utama halaman
export default function IqualCalculationParams() {
    const { selectedIntervals, selectedWells, selectedZones } = useDashboard();
    const router = useRouter();
    const [parameters, setParameters] = useState<ParameterRow[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { wellsDir } = useAppDataStore();
    const [rowSync, setRowSync] = useState<Record<number, boolean>>({});

    const isUsingZones = selectedZones.length > 0;
    const activeSelection = isUsingZones ? selectedZones : selectedIntervals;

    useEffect(() => {
        setParameters(createInitialIQUALParameters(activeSelection));
    }, [activeSelection, selectedIntervals, selectedZones]);
    
    // Handler untuk mengubah nilai input
    const handleValueChange = (id: number, interval: string, newValue: string) => {
        setParameters(prev =>
            prev.map(row => {
                if (row.id !== id) return row;
                // Untuk IQUAL, semua interval/zona memiliki nilai yang sama
                const newValues = Object.fromEntries(Object.keys(row.values).map(i => [i, newValue]));
                return { ...row, values: newValues };
            })
        );
    };

    const handleRowToggle = (id: number, isEnabled: boolean) => {
        setRowSync(prev => ({ ...prev, [id]: isEnabled }));
    };

    // Handler untuk mengirim data ke backend
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const firstActiveKey = activeSelection[0] || 'default';
        const formParams = parameters
            .filter(p => p.isEnabled && p.mode === 'Input') // Hanya kirim parameter input
            .reduce((acc, param) => {
                const value = param.values[firstActiveKey] || '';
                acc[param.name] = isNaN(Number(value)) ? value : Number(value);
                return acc;
            }, {} as Record<string, string | number>);

        const payload = {
            params: formParams,
            full_path: wellsDir,
            selected_wells: selectedWells,
            selected_intervals: selectedIntervals,
            selected_zones: selectedZones,
        };

        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const endpoint = `${apiUrl}/api/run-iqual-calculation`;

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
            alert(result.message || "Proses kalkulasi IQUAL berhasil!");
            router.push('/dashboard');
        } catch (error) {
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Helper untuk warna baris tabel
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
            <h2 className="text-xl font-bold mb-4 text-gray-800">IQUAL Calculation Parameters</h2>
            <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
                <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
                    <p className="text-sm font-medium text-gray-700">Well: {selectedWells.join(', ') || 'N/A'} / Intervals: {activeSelection.length} selected</p>
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                        <button type="button" onClick={() => router.back()} className="px-6 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 font-semibold">Cancel</button>
                        <button type="submit" className="px-6 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700 flex items-center justify-center" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Start'}
                        </button>
                    </div>
                </div>
                <h3 className="text-lg font-semibold mb-2">Parameters</h3>
                <div className="flex-grow min-h-0 border border-gray-300 rounded-lg">
                    <div className="overflow-auto h-full">
                        <table className="min-w-full text-sm table-auto">
                            <thead className="bg-gray-200 sticky top-0 z-10">
                                <tr>
                                    {tableHeaders.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">{header}</th>))}
                                    {selectedIntervals.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">{header}</th>))}
                                    {selectedZones.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">{header}</th>))}
                                </tr>
                            </thead>
                            <tbody>
                                {parameters.map((param) => (
                                    <tr key={param.id} className={`border-b border-gray-200 ${param.isEnabled ? getRowBgColor(param.location, param.mode) : 'bg-gray-100 text-gray-400'}`}>
                                        <td className="px-3 py-2 border-r text-center">{param.id}</td>
                                        <td className="px-3 py-2 border-r">{param.location}</td>
                                        <td className="px-3 py-2 border-r">{param.mode}</td>
                                        <td className="px-3 py-2 border-r">{param.comment}</td>
                                        <td className="px-3 py-2 border-r">{param.unit}</td>
                                        <td className="px-3 py-2 border-r font-semibold">{param.name}</td>
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
                                        {isUsingZones && selectedZones.map(zone => (
                                            <td key={zone} className="px-3 py-2 border-r bg-white text-black">
                                                <input
                                                    type="text"
                                                    value={param.values[zone] ?? ''}
                                                    onChange={(e) => handleValueChange(param.id, zone, e.target.value)}
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
