'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import Select from 'react-select';
import { Loader2 } from 'lucide-react';

export default function FillMissingPage() {
    const { selectedWells, wellColumns } = useDashboard();
    const router = useRouter();

    const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
    const [maxConsecutive, setMaxConsecutive] = useState<number>(3); // State baru untuk n sampling rate
    const [isFlagging, setIsFlagging] = useState(false); // State loading untuk proses flagging
    const [isFilling, setIsFilling] = useState(false);   // State loading untuk proses filling

    // Logika untuk mendapatkan opsi dropdown (tidak berubah)
    const combinedLogs = useMemo(() => {
        if (!selectedWells || selectedWells.length === 0) return [];
        const excludedLogs = ['DEPTH', 'STRUKTUR', 'WELL_NAME', 'CALI', 'SP', 'MARKER', 'ZONE'];
        const uniqueColumns = new Set(selectedWells.flatMap(well => wellColumns[well] || []));
        return Array.from(uniqueColumns).filter(log => !excludedLogs.includes(log.toUpperCase()));
    }, [selectedWells, wellColumns]);
    
    const options = combinedLogs.map(log => ({ label: log, value: log }));

    // --- Handler untuk Tahap 1: Flag Missing Values ---
    const handleFlagSubmit = async () => {
        if (selectedLogs.length === 0) {
            alert('Please select at least one log to flag.');
            return;
        }
        setIsFlagging(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flag-missing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selected_wells: selectedWells,
                    logs_to_check: selectedLogs,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to run flagging process.');
            alert(`✅ ${result.message}`);
        } catch (error) {
            alert(`❌ ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsFlagging(false);
        }
    };

    // --- Handler untuk Tahap 2: Fill Flagged Values ---
    const handleFillSubmit = async () => {
        if (selectedLogs.length === 0) {
            alert('Please select at least one log to fill.');
            return;
        }
        setIsFilling(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/fill-flagged-missing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selected_wells: selectedWells,
                    logs_to_fill: selectedLogs,
                    max_consecutive_nan: maxConsecutive,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to run filling process.');
            alert(`✅ ${result.message}`);
            router.push('/dashboard'); // Kembali ke dashboard setelah selesai
        } catch (error) {
            alert(`❌ ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsFilling(false);
        }
    };

    const getRowBgColor = (location: string): string => {
        if (location === 'Constant') return 'bg-yellow-300';
        if (location === 'Log') return 'bg-cyan-400';
        return 'bg-white';
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Fill Missing Values (Two Stages)</h2>
            <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-2">
                    Wells: {selectedWells.length > 0 ? selectedWells.join(', ') : 'N/A'}
                </p>
                {/* --- Kumpulan Tombol Aksi --- */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                    <button type="button" onClick={() => router.push('/dashboard')} className="px-4 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 font-semibold">
                        Cancel
                    </button>
                    <button type="button" onClick={handleFlagSubmit} className="px-4 py-2 rounded-md text-white font-semibold bg-orange-500 hover:bg-orange-600 flex items-center justify-center" disabled={isFlagging || isFilling}>
                        {isFlagging ? <Loader2 className="animate-spin" /> : 'Stage 1: Flag Missing'}
                    </button>
                    <button type="button" onClick={handleFillSubmit} className="px-4 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700 flex items-center justify-center" disabled={isFilling || isFlagging}>
                        {isFilling ? <Loader2 className="animate-spin" /> : 'Stage 2: Fill Flagged'}
                    </button>
                </div>
            </div>

            <h3 className="text-lg font-semibold mb-2 flex-shrink-0">Parameters</h3>
            <div className="flex-grow min-h-0 border border-gray-300 rounded-lg overflow-auto">
                <table className="min-w-full text-sm table-auto">
                    <thead className="bg-gray-200 sticky top-0 z-10">
                        <tr>
                            {['#', 'Location', 'Comment', 'Name', 'Value'].map(header => (
                                <th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {/* --- Baris untuk memilih log --- */}
                        <tr className={`${getRowBgColor('Log')} border-b`}>
                            <td className="px-3 py-2 border-r text-center">1</td>
                            <td className="px-3 py-2 border-r">Log</td>
                            <td className="px-3 py-2 border-r">Select logs to be flagged and filled</td>
                            <td className="px-3 py-2 border-r font-semibold">LOGS</td>
                            <td className="px-3 py-2 bg-white text-black">
                                <Select
                                    isMulti
                                    options={options}
                                    value={options.filter(opt => selectedLogs.includes(opt.value))}
                                    onChange={(selected) => setSelectedLogs(selected.map(s => s.value))}
                                    className="min-w-[200px] text-black bg-white"
                                    classNamePrefix="react-select"
                                    menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }), option: base => ({...base, color: 'black'}) }}
                                />
                            </td>
                        </tr>
                        {/* --- Baris untuk parameter Max Consecutive NaN --- */}
                        <tr className={`${getRowBgColor('Constant')} border-b`}>
                            <td className="px-3 py-2 border-r text-center">2</td>
                            <td className="px-3 py-2 border-r">Constant</td>
                            <td className="px-3 py-2 border-r">Max consecutive NaNs to fill (for Stage 2)</td>
                            <td className="px-3 py-2 border-r font-semibold">MAX_CONSECUTIVE_NAN</td>
                            <td className="px-3 py-2 bg-white text-black">
                                <input
                                    type="number"
                                    value={maxConsecutive}
                                    onChange={(e) => setMaxConsecutive(parseInt(e.target.value, 10) || 0)}
                                    className="w-full min-w-[100px] p-1 bg-white text-black border rounded"
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
