'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import { type ParameterRow } from '@/types';
import { Loader2, Settings } from 'lucide-react';
import { useAppDataStore } from '@/stores/useAppDataStore';

// Fungsi diubah untuk menerima selectedIntervals dan membuat struktur data yang sesuai
const createInitialVshDNParameters = (selection: string[]): ParameterRow[] => {
    // Membuat objek values dengan key dari setiap interval yang dipilih
    const effectiveSelection = selection.length > 0 ? selection : ['default'];
        const createValues = (val: string | number) => Object.fromEntries(effectiveSelection.map(i => [i, val]));

    const allPossibleParams: Omit<ParameterRow, "values">[] = [
        { id: 1, location: "Interval", mode: "In_Out", comment: "Matrix density", unit: "G/C3", name: "RHOB_MA", isEnabled: true },
        { id: 2, location: "Interval", mode: "In_Out", comment: "Shale density", unit: "G/C3", name: "RHOB_SH", isEnabled: true },
        { id: 3, location: "Interval", mode: "In_Out", comment: "Fluid density", unit: "G/C3", name: "RHOB_FL", isEnabled: true },
        { id: 4, location: "Interval", mode: "In_Out", comment: "Matrix neutron porosity", unit: "V/V", name: "NPHI_MA", isEnabled: true },
        { id: 5, location: "Interval", mode: "In_Out", comment: "Shale neutron porosity", unit: "V/V", name: "NPHI_SH", isEnabled: true },
        { id: 6, location: "Interval", mode: "In_Out", comment: "Fluid neutron porosity", unit: "V/V", name: "NPHI_FL", isEnabled: true },
        { id: 9, location: "Log", mode: "Input", comment: "Density log", unit: "G/C3", name: "RHOB", isEnabled: true },
        { id: 10, location: "Log", mode: "Input", comment: "Neutron porosity log", unit: "V/V", name: "NPHI", isEnabled: true },
        { id: 11, location: "Log", mode: "Output", comment: "VSH from density‑neutron", unit: "V/V", name: "VSH", isEnabled: true },
    ];

    const defaultValues: Record<string, string | number> = {
        RHOB_MA: 2.65,
        RHOB_SH: 2.61,
        RHOB_FL: 0.85,
        NPHI_MA: -0.02,
        NPHI_SH: 0.398,
        NPHI_FL: 0.85,
        RHOB: "RHOB",
        NPHI: "NPHI",
        VSH: "VSH_DN",
    };

    return allPossibleParams.map(p => ({
        ...p,
        values: createValues(defaultValues[p.name] || '')
    }));
};

export default function VshDNCalculationParams() {
    const { selectedIntervals, selectedWells, selectedZones } = useDashboard();
    const router = useRouter();
    const [parameters, setParameters] = useState<ParameterRow[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetchingDefaults, setIsFetchingDefaults] = useState(false);
    const [rowSync, setRowSync] = useState<Record<number, boolean>>({}); // State untuk checkbox "P" dikembalikan
    const { setVshDNParams, wellsDir } = useAppDataStore();
    const [fetchPerZone, setFetchPerZone] = useState(false);

    const isUsingZones = selectedZones.length > 0;

    useEffect(() => {
            const effectiveSelection = selectedZones.length > 0 ? selectedZones : selectedIntervals;
            setParameters(createInitialVshDNParameters(effectiveSelection));
        }, [selectedIntervals, selectedZones]);

    // --- MODIFIED: Enhanced useEffect to handle fetchPerZone logic ---
    useEffect(() => {
        const fetchIntersectionDefaults = async () => {
            if (selectedWells.length === 0) return;

            setIsFetchingDefaults(true);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            
            try {
                if (fetchPerZone && isUsingZones) {
                    // Fetch parameters for each zone individually
                    console.log('Fetching per zone for zones:', selectedZones);
                    const zonePromises = selectedZones.map(async (zone) => {
                        console.log(`Making API call for zone: ${zone}`);
                        const response = await fetch(`${apiUrl}/api/get-intersection-point`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                full_path: wellsDir,
                                selected_wells: selectedWells,
                                selected_intervals: [], // Empty for zone-specific fetching
                                selected_zones: [zone], // Single zone
                            }),
                        });

                        if (!response.ok) {
                            const err = await response.json();
                            console.error(`Gagal mengambil nilai default untuk zone ${zone}:`, err.error);
                            return null;
                        }
                        
                        const data = await response.json();
                        console.log(`Data received for zone ${zone}:`, data);
                        return { zone, data };
                    });

                    const zoneResults = await Promise.all(zonePromises);
                    console.log('All zone results:', zoneResults);
                    
                    setParameters(prevParams => 
                        prevParams.map(param => {
                            if (param.name === "RHOB_SH" || param.name === "NPHI_SH") {
                                const newValues = { ...param.values };
                                
                                zoneResults.forEach(result => {
                                    if (result) {
                                        const newValue = param.name === "RHOB_SH" ? result.data.rhob_sh : result.data.nphi_sh;
                                        console.log(`Setting ${param.name} for zone ${result.zone} to:`, newValue);
                                        newValues[result.zone] = newValue;
                                    }
                                });
                                
                                return { ...param, values: newValues };
                            }
                            return param;
                        })
                    );
                } else {
                    // Fetch aggregated parameters for all zones/intervals
                    console.log('Fetching aggregated data for all zones/intervals');
                    const response = await fetch(`${apiUrl}/api/get-intersection-point`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            full_path: wellsDir,
                            selected_wells: selectedWells,
                            selected_intervals: selectedIntervals,
                            selected_zones: selectedZones,
                        }),
                    });

                    if (!response.ok) {
                        const err = await response.json();
                        console.error("Gagal mengambil nilai default:", err.error);
                        return;
                    }
                    
                    const data = await response.json();
                    console.log('Aggregated data received:', data);

                    setParameters(prevParams => 
                        prevParams.map(param => {
                            if (param.name === "RHOB_SH" || param.name === "NPHI_SH") {
                                const newValue = param.name === "RHOB_SH" ? data.rhob_sh : data.nphi_sh;
                                // Update semua nilai interval untuk parameter ini
                                const newValues = Object.fromEntries(
                                    Object.keys(param.values).map(key => [key, newValue])
                                );
                                return { ...param, values: newValues };
                            }
                            return param;
                        })
                    );
                }
            } catch (error) {
                console.error("Error saat memanggil API:", error);
            } finally {
                setIsFetchingDefaults(false);
            }
        };

        fetchIntersectionDefaults();
    }, [selectedWells, selectedIntervals, selectedZones, wellsDir, fetchPerZone, isUsingZones]);
    // Added fetchPerZone and isUsingZones to dependency array

    // Fungsi handleValueChange dikembalikan untuk menangani input per interval
    const handleValueChange = (id: number, interval: string, newValue: string) => {
        setParameters(prev =>
            prev.map(row => {
                if (row.id !== id) return row;
                // Jika sinkronisasi aktif, update semua nilai
                if (rowSync[id]) {
                    const newValues = Object.fromEntries(
                        Object.keys(row.values).map(i => [i, newValue])
                    );
                    return { ...row, values: newValues };
                }
                // Jika tidak, update nilai untuk interval spesifik
                return { ...row, values: { ...row.values, [interval]: newValue } };
            })
        );
    };

    // Fungsi handleRowToggle untuk checkbox "P" dikembalikan
    const handleRowToggle = (id: number, enabled: boolean) => {
        setRowSync(prev => ({ ...prev, [id]: enabled }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const firstActiveKey = isUsingZones 
                ? (selectedZones[0] || 'default') 
                : (selectedIntervals[0] || 'default');

        const formParams = parameters
            .filter(p => p.isEnabled)
            .reduce((acc, param) => {
                // Ambil nilai dari interval pertama sebagai representasi
                const value = param.values[firstActiveKey];
                acc[param.name] = isNaN(Number(value)) ? value : String(value);
                return acc;
            }, {} as Record<string, string | number>);
        
        // ... (sisa fungsi tidak berubah)
        setVshDNParams({
            rhob_ma: Number(formParams.RHOB_MA),
            rhob_sh: Number(formParams.RHOB_SH),
            nphi_ma: Number(formParams.NPHI_MA),
            nphi_sh: Number(formParams.NPHI_SH),
            prcnt_qz: 0,
            prcnt_wtr: 0
        });
        const payload = { params: formParams, full_path: wellsDir, selected_wells: selectedWells, selected_intervals: isUsingZones ? [] : selectedIntervals,
        selected_zones: isUsingZones ? selectedZones : []
         };
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const endpoint = `${apiUrl}/api/run-vsh-dn-calculation`;
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
            alert(result.message || "Proses kalkulasi VSH berhasil!");
            router.push('/dashboard');
        } catch (error) {
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRowBgColor = (location: string, mode: string): string => {
        switch (location) {
            case 'Interval': return 'bg-green-400';
            case 'Log': return mode === 'Input' ? 'bg-cyan-400' : 'bg-cyan-200';
            default: return 'bg-white';
        }
    };

    const tableHeaders = ['#', 'Location', 'Mode', 'Comment', 'Unit', 'Name', 'P'];

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">Volume of shale by density neutron method</h2>
            <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
                <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50 flex flex-col gap-4">
                    <div className="md:col-span-4">
                        <p className="text-sm font-medium text-gray-700">Well: {selectedWells.join(', ') || 'N/A'} / Intervals: {selectedIntervals.length || selectedZones.length} selected</p>
                    </div>
                    {/* --- NEW: TOGGLE FOR ZONE FETCHING --- */}
                    {isUsingZones && (
                        <div className="flex items-center gap-2 text-sm">
                            <Settings className="w-4 h-4 text-gray-600" />
                            <label htmlFor="fetch-per-zone">Fetch param values for each zone individually</label>
                            <input
                                id="fetch-per-zone"
                                type="checkbox"
                                className="h-4 w-4"
                                checked={fetchPerZone}
                                onChange={(e) => setFetchPerZone(e.target.checked)}
                            />
                        </div>
                    )}
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
                                    {/* Header tabel dinamis dikembalikan */}
                                    {selectedIntervals.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">{header}</th>))}
                                    {selectedZones.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r">{header}</th>))}
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
                                        {/* Kolom checkbox "P" dikembalikan */}
                                        <td className="px-3 py-2 border-r text-center">
                                            <input type="checkbox" className="h-4 w-4 rounded border-gray-400" checked={!!rowSync[param.id]} onChange={(e) => handleRowToggle(param.id, e.target.checked)} />
                                        </td>
                                        {/* Kolom input dinamis per interval dikembalikan */}
                                        {selectedIntervals.map(interval => (
                                            <td key={`${param.id}-${interval}`} className="px-3 py-2 border-r bg-white text-black">
                                                <input
                                                    type="text"
                                                    value={param.values[interval] ?? ''}
                                                    onChange={(e) => handleValueChange(param.id, interval, e.target.value)}
                                                    className="w-full min-w-[150px] p-1 bg-white text-black disabled:bg-gray-100 disabled:text-gray-500"
                                                />
                                            </td>
                                        ))}
                                        {isUsingZones && selectedZones.map(zone => (
                                            <td key={`${param.id}-${zone}`} className="px-3 py-2 border-r bg-white text-black">
                                                <input
                                                    type="text"
                                                    value={param.values[zone] ?? ''}
                                                    onChange={(e) => handleValueChange(param.id, zone, e.target.value)}
                                                    className="w-full min-w-[150px] p-1 bg-white text-black disabled:bg-gray-100 disabled:text-gray-500"
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