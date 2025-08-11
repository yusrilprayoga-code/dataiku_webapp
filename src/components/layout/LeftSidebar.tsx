'use client';

import { PlotType, useDashboard } from '@/contexts/DashboardContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function LeftSidebar() {
    // Ambil semua state dan fungsi yang relevan dari context
    const { 
        availableWells, 
        selectedWells, 
        toggleWellSelection, 
        availableIntervals, 
        selectedIntervals, 
        toggleInterval,
        availableZones,
        selectedZones,
        toggleZone,
        plotType, 
        setPlotType,
        fetchPlotData // Fungsi terpusat untuk mengambil plot
    } = useDashboard();
    
    const [isMounted, setIsMounted] = useState(false);
    const [intervalType, setIntervalType] = useState<'markers' | 'zones'>('markers');
    const router = useRouter();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Gunakan useEffect untuk secara otomatis mengambil plot baru saat pilihan berubah
    useEffect(() => {
        // Hanya jalankan fetch jika ada sumur yang dipilih untuk menghindari permintaan yang tidak perlu
        if (selectedWells.length > 0) {
            fetchPlotData();
        }
    }, [selectedWells, selectedIntervals, plotType, fetchPlotData]);


    const handleSelectAllWells = (checked: boolean) => {
        if (checked) {
            availableWells.forEach(well => {
                if (!selectedWells.includes(well)) {
                    toggleWellSelection(well);
                }
            });
        } else {
            selectedWells.forEach(well => toggleWellSelection(well));
        }
    };

    const handleSelectAllIntervals = (checked: boolean) => {
        if (intervalType === 'markers') {
            if (checked) {
                availableIntervals.forEach(interval => {
                    if (!selectedIntervals.includes(interval)) {
                        toggleInterval(interval);
                    }
                });
            } else {
                selectedIntervals.forEach(interval => toggleInterval(interval));
            }
        } else {
            // Handle zones selection - select/deselect all zones
            if (checked) {
                availableZones.forEach(zone => {
                    if (!selectedZones.includes(zone)) {
                        toggleZone(zone);
                    }
                });
            } else {
                selectedZones.forEach(zone => toggleZone(zone));
            }
        }
    };

    const handleIntervalTypeChange = (type: 'markers' | 'zones') => {
        setIntervalType(type);
        // Clear selections when switching types
        if (type === 'zones') {
            selectedZones.forEach(zone => toggleZone(zone)); // Clear all selected zones
        } else {
            selectedIntervals.forEach(interval => toggleInterval(interval)); // Clear all selected intervals
        }
    };

    // Opsi untuk dropdown crossplot
    const crossplotOptions = [
        { label: "Pilih Crossplot...", value: "" },
        { label: "Crossplot GR vs NPHI", value: "GR-NPHI" },
        { label: "Crossplot GR vs RHOB", value: "GR-RHOB" },
        { label: "Crossplot RHOB vs NPHI", value: "RHOB-NPHI" },
        { label: "Crossplot RT vs GR", value: "RT-GR" },
        { label: "Crossplot PHIE vs VSH", value: "PHIE-VSH" },
        { label: "Crossplot SW vs PHIE", value: "SW-PHIE" },
    ];

    const handleCrossplotChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (!value) return;

        const [yCol, xCol] = value.split('-');
        // Arahkan ke halaman crossplot dengan parameter URL
        router.push(`/dashboard/modules/crossplot?y=${yCol}&x=${xCol}`);
        e.target.value = ""; // Reset dropdown agar bisa dipilih lagi
    };

    return (
        <aside className="w-52 bg-gray-100 flex flex-col gap-2 p-2 border-r border-gray-300 h-screen">
            <div className="flex flex-col h-full gap-2">
                <div className="text-xs font-bold text-gray-800 px-2 py-1">Data Selection</div>
                
                {/* Well Data Section */}
                <div className="flex flex-col bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 p-1.5 bg-gray-50 border-b">
                        <input
                            type="checkbox"
                            className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
                            checked={isMounted && availableWells.length > 0 && selectedWells.length === availableWells.length}
                            onChange={(e) => handleSelectAllWells(e.target.checked)}
                        />
                        <h3 className="text-xs font-bold text-gray-700">Wells</h3>
                        <span className="text-xs text-gray-500 ml-auto">{selectedWells.length}/{availableWells.length}</span>
                    </div>
                    <div className="overflow-y-auto flex-1 p-1">
                        <div className="flex flex-col gap-0.5">
                            {isMounted ? availableWells.map(well => (
                                <label key={well} className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-gray-50 cursor-pointer text-xs">
                                    <input
                                        type="checkbox"
                                        className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
                                        checked={selectedWells.includes(well)}
                                        onChange={() => toggleWellSelection(well)}
                                    />
                                    <span className="truncate">{well}</span>
                                </label>
                            )) : <div>Loading...</div>}
                        </div>
                    </div>
                </div>

                {/* Intervals Section */}
                <div className="flex flex-col bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2 p-1.5 bg-gray-50 border-b">
                        <input
                            type="checkbox"
                            className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
                            checked={isMounted && (
                                intervalType === 'markers' 
                                    ? availableIntervals.length > 0 && selectedIntervals.length === availableIntervals.length
                                    : availableZones.length > 0 && selectedZones.length === availableZones.length
                            )}
                            onChange={(e) => handleSelectAllIntervals(e.target.checked)}
                        />
                        <h3 className="text-xs font-bold text-gray-700">
                            {intervalType === 'markers' ? 'Markers' : 'Zones'}
                        </h3>
                        <span className="text-xs text-gray-500 ml-auto">
                            {intervalType === 'markers' 
                                ? `${selectedIntervals.length}/${availableIntervals.length}`
                                : `${selectedZones.length}/${availableZones.length}`
                            }
                        </span>
                    </div>
                    
                    {/* Toggle buttons for markers/zones */}
                    <div className="flex bg-gray-50 border-b">
                        <button
                            type="button"
                            onClick={() => handleIntervalTypeChange('markers')}
                            className={`flex-1 px-2 py-1 text-xs font-medium transition-colors ${
                                intervalType === 'markers' 
                                    ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500' 
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            Markers
                        </button>
                        <button
                            type="button"
                            onClick={() => handleIntervalTypeChange('zones')}
                            className={`flex-1 px-2 py-1 text-xs font-medium transition-colors ${
                                intervalType === 'zones' 
                                    ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500' 
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            Zones
                        </button>
                    </div>
                    
                    <div className="overflow-y-auto flex-1 p-1">
                        <div className="flex flex-col gap-0.5">
                            {intervalType === 'markers' ? (
                                availableIntervals.map(interval => (
                                    <label key={interval} className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-gray-50 cursor-pointer text-xs">
                                        <input
                                            type="checkbox"
                                            className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
                                            checked={selectedIntervals.includes(interval)}
                                            onChange={() => toggleInterval(interval)}
                                        />
                                        <span className="truncate">{interval}</span>
                                    </label>
                                ))
                            ) : (
                                availableZones.length === 0 ? (
                                    <div className="flex items-center justify-center py-2 text-xs text-gray-500">
                                        No zones available
                                    </div>
                                ) : (
                                    availableZones.map(zone => (
                                        <label key={zone} className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-gray-50 cursor-pointer text-xs">
                                            <input
                                                type="checkbox"
                                                className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
                                                checked={selectedZones.includes(zone)}
                                                onChange={() => toggleZone(zone)}
                                            />
                                            <span className="truncate">{zone}</span>
                                        </label>
                                    ))
                                )
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Spacer agar Display menempel di bawah */}
                <div className="flex-grow"></div>

                {/* Display Section */}
                <div className="bg-white rounded-lg shadow-sm p-2 flex flex-col gap-2">
                    <h3 className="text-xs font-bold text-gray-700">Display</h3>
                    <div>
                        <label className="text-xs text-gray-600 mb-1 block">Plot Layout</label>
                        <select
                            value={plotType}
                            onChange={(e) => setPlotType(e.target.value as PlotType)}
                            className="text-xs w-full bg-white border border-gray-200 rounded p-1 focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="default">Layout Default</option>
                            <option value="normalization">Layout Normalisasi</option>
                            <option value="smoothing">Layout Smoothing</option>
                            <option value="vsh">Layout VSH</option>
                            <option value="porosity">Layout Porosity</option>
                            <option value="sw">Layout SW</option>
                            <option value="rwa">Layout RWA</option>
                            <option value="module2">Layout Module 2</option>
                            <option value="gsa">Layout GSA</option>
                            <option value="rpbe-rgbe">Layout RPBE RGBE</option>
                            <option value="iqual">Layout IQUAL</option>
                            <option value="swgrad">Layout SWGRAD</option>
                            <option value="dns-dnsv">Layout DNS-DNSV</option>
                            <option value="rt-ro">Layout RT-RO</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-gray-600 mb-1 block">Analysis</label>
                        <select
                            onChange={handleCrossplotChange}
                            // Class 'appearance-none' dan 'text-center' dihapus agar sesuai referensi
                            className="text-xs w-full bg-white border border-gray-200 rounded p-1 focus:ring-1 focus:ring-blue-500"
                        >
                            {crossplotOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        </div>

                        {/* Link Histogram sekarang berada di luar div-select agar menjadi elemen terpisah di bawahnya */}
                        <Link href="/dashboard/modules/histogram" className="text-xs w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-center font-medium hover:bg-gray-100 focus:ring-1 focus:ring-blue-500 transition-colors">
                            Histogram
                        </Link>
                </div>
            </div>
        </aside>
    );
};