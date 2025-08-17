'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import { type ParameterRow } from '@/types';
import { Loader2 } from 'lucide-react';
import { useAppDataStore } from '@/stores/useAppDataStore';

// Fungsi untuk membuat parameter awal
// Modifikasi: kini membuat 'values' berdasarkan seleksi yang diberikan
const createInitialIQUALParameters = (selection: string[]): ParameterRow[] => {
    // Jika tidak ada seleksi, gunakan 'default'. Jika ada, gunakan array seleksi.
    const effectiveSelection = selection.length > 0 ? selection : ['default'];

    const createValues = (defaultValue: string | number) => 
        Object.fromEntries(effectiveSelection.map(key => [key, defaultValue]));

    const allPossibleParams: Omit<ParameterRow, 'values'>[] = [
        { id: 1, location: 'Constant', mode: 'Input', comment: 'Minimum effective porosity for reservoir flag', unit: 'V/V', name: 'PHIE_THRESHOLD', isEnabled: true },
        { id: 2, location: 'Constant', mode: 'Input', comment: 'Maximum volume of shale for reservoir flag', unit: 'V/V', name: 'VSH_THRESHOLD', isEnabled: true },
        { id: 3, location: 'Log', mode: 'Input', comment: 'Volume of Shale log to use', unit: 'V/V', name: 'VSH_LOG', isEnabled: true },
        { id: 4, location: 'Log', mode: 'Input', comment: 'Effective Porosity log to use', unit: 'V/V', name: 'PHIE_LOG', isEnabled: true },
        { id: 5, location: 'Log', mode: 'Output', comment: 'Reservoir Quality Flag (1=Reservoir, 0=Non-Reservoir)', unit: '', name: 'IQUAL', isEnabled: true },
    ];

    const defaultValues: Record<string, string | number> = {
        'PHIE_THRESHOLD': 0.1,
        'VSH_THRESHOLD': 0.5,
        'VSH_LOG': '',
        'PHIE_LOG': '',
        'IQUAL': 'IQUAL'
    };

    return allPossibleParams.map(p => ({
        ...p,
        values: createValues(defaultValues[p.name] || '')
    }));
};


// --- KOMPONEN UTAMA ---
export default function IqualCalculationParams() {
    const { selectedIntervals, selectedWells, wellColumns, selectedZones } = useDashboard();
    const router = useRouter();
    const [parameters, setParameters] = useState<ParameterRow[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { wellsDir } = useAppDataStore();
    
    // State untuk melacak status sinkronisasi per baris
    const [rowSync, setRowSync] = useState<Record<number, boolean>>({});

    const isUsingZones = selectedZones.length > 0;
    const activeSelection = isUsingZones ? selectedZones : selectedIntervals;

    // Inisialisasi atau reset parameter saat `activeSelection` berubah
    useEffect(() => {
        setParameters(createInitialIQUALParameters(activeSelection));
    }, [activeSelection]);

    const combinedColumns = useMemo(() => {
        if (!selectedWells || selectedWells.length === 0 || Object.keys(wellColumns).length === 0) {
            return [];
        }
        const allLogs = selectedWells.flatMap(well => wellColumns[`${well}.csv`] || []);
        return [...new Set(allLogs)];
    }, [selectedWells, wellColumns]);

    const vshOptions = useMemo(() =>
        combinedColumns.filter(col => col.toUpperCase().includes('VSH')),
        [combinedColumns]
    );

    const phieOptions = useMemo(() =>
        combinedColumns.filter(col => col.toUpperCase().includes('PHIE')),
        [combinedColumns]
    );

    // **FUNGSI UTAMA UNTUK MENGUBAH NILAI DENGAN LOGIKA SINKRONISASI**
    const handleValueChange = useCallback((id: number, key: string, newValue: string) => {
        setParameters(prev =>
            prev.map(row => {
                if (row.id !== id) return row;

                const newValues = { ...row.values };
                
                // Jika sinkronisasi (P) aktif untuk baris ini, ubah semua nilai
                if (rowSync[id]) {
                    activeSelection.forEach(activeKey => {
                        newValues[activeKey] = newValue;
                    });
                } else {
                    // Jika tidak, hanya ubah nilai untuk kolom spesifik yang di-edit
                    newValues[key] = newValue;
                }
                return { ...row, values: newValues };
            })
        );
    }, [rowSync, activeSelection]);

    // Mengatur nilai default untuk dropdown VSH dan PHIE saat opsi tersedia
    useEffect(() => {
        if (activeSelection.length === 0 || parameters.length === 0) return;

        const firstKey = activeSelection[0];

        const updateDefaultIfNeeded = (paramId: number, options: string[], preferredOption: string) => {
            const param = parameters.find(p => p.id === paramId);
            // Hanya set jika value untuk key pertama masih kosong
            if (options.length > 0 && param && !param.values[firstKey]) {
                const defaultValue = options.find(opt => opt.toUpperCase() === preferredOption) || options[0];
                // Panggil handleValueChange agar logika sinkronisasi ikut berjalan
                handleValueChange(paramId, firstKey, defaultValue);
            }
        };

        updateDefaultIfNeeded(3, vshOptions, 'VSH');
        updateDefaultIfNeeded(4, phieOptions, 'PHIE');

    }, [vshOptions, phieOptions, activeSelection, parameters, handleValueChange]);

    const handleRowToggle = (id: number, checked: boolean) => {
        setRowSync(prev => ({ ...prev, [id]: checked }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        const firstActiveKey = activeSelection[0];
        if (!firstActiveKey) {
            alert("Silakan pilih minimal satu interval atau zona.");
            setIsSubmitting(false);
            return;
        }

        const formParams = parameters
            .filter(p => p.isEnabled && p.mode === 'Input')
            .reduce((acc, param) => {
                // --- PERUBAHAN DI SINI ---
                // Ambil nilai HANYA dari kolom pertama yang aktif (misal, dari 'TAF')
                const value = param.values[firstActiveKey] || '';
                // Kirim sebagai angka tunggal, bukan object
                acc[param.name] = isNaN(Number(value)) ? value : Number(value);
                return acc;
            }, {} as Record<string, string | number>);


        const payload = {
            params: formParams, // `params` sekarang akan menjadi { "PHIE_THRESHOLD": 0.1, ... }
            full_path: wellsDir,
            selected_wells: selectedWells,
            selected_intervals: selectedIntervals,
            selected_zones: selectedZones,
        };

        console.log(formParams);

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

    const getRowBgColor = (location: string, mode: string): string => {
        switch (location) {
            case 'Constant': return mode === 'Input' ? 'bg-yellow-300' : 'bg-yellow-100';
            case 'Log': return mode === 'Input' ? 'bg-cyan-400' : 'bg-cyan-200';
            default: return 'bg-white';
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
                                        <td className="px-3 py-2 border-r text-center">
                                            <input type="checkbox" className="h-4 w-4 rounded border-gray-400" checked={!!rowSync[param.id]} onChange={(e) => handleRowToggle(param.id, e.target.checked)}/>
                                        </td>
                                        {selectedIntervals.map(interval => (
                                        <td 
                                            key={interval} 
                                            className="px-3 py-2 border-r bg-white text-black"
                                        >
                                            {param.name === 'VSH_LOG' ? (
                                            <select
                                                value={param.values[interval] || ''}
                                                onChange={(e) => handleValueChange(param.id, interval, e.target.value)}
                                                className="w-full p-1 bg-white"
                                                disabled={!param.isEnabled}
                                            >
                                                {vshOptions.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                            ) : param.name === 'PHIE_LOG' ? (
                                            <select
                                                value={param.values[interval] || ''}
                                                onChange={(e) => handleValueChange(param.id, interval, e.target.value)}
                                                className="w-full p-1 bg-white"
                                                disabled={!param.isEnabled}
                                            >
                                                {phieOptions.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                            ) : (
                                            <input
                                                type="text"
                                                value={param.values[interval] ?? ''}
                                                onChange={(e) => handleValueChange(param.id, interval, e.target.value)}
                                                className="w-full p-1 bg-white text-black"
                                                disabled={!param.isEnabled || param.mode === 'Output'}
                                            />
                                            )}
                                        </td>
                                        ))}

                                        {isUsingZones && selectedZones.map(zone => (
                                        <td 
                                            key={zone} 
                                            className="px-3 py-2 border-r bg-white text-black"
                                        >
                                            {param.name === 'VSH_LOG' ? (
                                            <select
                                                value={param.values[zone] || ''}
                                                onChange={(e) => handleValueChange(param.id, zone, e.target.value)}
                                                className="w-full p-1 bg-white"
                                                disabled={!param.isEnabled}
                                            >
                                                {vshOptions.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                            ) : param.name === 'PHIE_LOG' ? (
                                            <select
                                                value={param.values[zone] || ''}
                                                onChange={(e) => handleValueChange(param.id, zone, e.target.value)}
                                                className="w-full p-1 bg-white"
                                                disabled={!param.isEnabled}
                                            >
                                                {phieOptions.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                            ) : (
                                            <input
                                                type="text"
                                                value={param.values[zone] ?? ''}
                                                onChange={(e) => handleValueChange(param.id, zone, e.target.value)}
                                                className="w-full p-1 bg-white text-black"
                                                disabled={!param.isEnabled || param.mode === 'Output'}
                                            />
                                            )}
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