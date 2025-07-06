/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any*/
// frontend/src/app/(dashboard)/dashboard/modules/[moduleName]/page.tsx
'use client';

import React, { useMemo, useState, Suspense } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import { Loader2, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';

// A simple component to display the result, dynamically loaded by Suspense
const ResultDisplay = dynamic(() => Promise.resolve(({ data }: { data: any }) => (
    <div className="p-4 mt-6 border rounded-lg bg-green-100 text-green-800">
        <h3 className="font-bold">Success</h3>
        <p className="text-sm mb-2">{data.message || "Operation completed."}</p>
    </div>
)), {
    loading: () => <div className="p-4">Loading result view...</div>,
    ssr: false
});

export default function FillMissingPage() {
    // Hooks from the context and for navigation
    const { selectedWells, wellColumns } = useDashboard();
    const router = useRouter();

    // State for the form's specific inputs
    const [selectedLogs, setSelectedLogs] = useState<string[]>([]);

    // State for managing the API call lifecycle
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [apiResult, setApiResult] = useState<any>(null);

    // Memoized calculation for the dropdown options
    const options = useMemo(() => {
        if (!selectedWells || selectedWells.length === 0 || !wellColumns) return [];
        const excludedLogs = ['DEPTH', 'STRUKTUR', 'WELL_NAME', 'CALI', 'SP'];
        const includedLogs = ['RHOB', 'NPHI', 'GR', 'RT'];

        return Array.from(new Set(selectedWells.flatMap(well => wellColumns[well] || [])))
            .filter(log => !excludedLogs.includes(log.toUpperCase()))
            .filter(log => includedLogs.some(keyword => log.toUpperCase().includes(keyword)))
            .map(log => ({ label: log, value: log }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedWells, wellColumns]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setApiResult(null);

        const endpointPath = '/api/fill-null-marker';
        const payload = {
            selected_wells: selectedWells,
            selected_logs: selectedLogs,
        };

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            if (!apiUrl) throw new Error("API URL is not configured.");

            const endpoint = `${apiUrl}${endpointPath}`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const responseData = await response.json();
            if (!response.ok) {
                throw new Error(responseData.error || `Server error: ${response.status}`);
            }

            setApiResult(responseData);
            alert(responseData.message || "Operation completed successfully!");

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRowBgColor = (location: string, mode: string): string => {
        if (location === 'Log' && mode === 'Input') return 'bg-cyan-400';
        return 'bg-white';
    };

    const staticHeaders = ['#', 'Location', 'Mode', 'Comment', 'Unit', 'Name', 'Value'];

    return (
        <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Fill Missing Values by Marker</h2>

            <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
                <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                        Wells: {selectedWells.length > 0 ? selectedWells.join(', ') : 'None Selected'}
                    </p>
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center w-24"
                            disabled={isSubmitting || selectedWells.length === 0 || selectedLogs.length === 0}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Start'}
                        </button>
                    </div>
                </div>

                <h3 className="text-lg font-semibold mb-2 flex-shrink-0">Parameters</h3>
                <div className="flex-grow min-h-0 border border-gray-300 rounded-lg overflow-auto">
                    <table className="min-w-full text-sm table-auto">
                        <thead className="bg-gray-200 sticky top-0 z-10">
                            <tr>
                                {staticHeaders.map(header => (
                                    <th key={header} className="px-3 py-2 text-center font-semibold text-gray-700 border-b border-r border-gray-600 whitespace-nowrap">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            <tr className={`${getRowBgColor('Log', 'Input')} border-b text-white`}>
                                <td className="px-3 py-2 border-r text-center">1</td>
                                <td className="px-3 py-2 border-r">Log</td>
                                <td className="px-3 py-2 border-r">Input</td>
                                <td className="px-3 py-2 border-r">Select target logs for null-filling</td>
                                <td className="px-3 py-2 border-r">LOG</td>
                                <td className="px-3 py-2 border-r font-semibold">LOG_IN</td>
                                <td className="px-3 py-2 bg-white text-black">
                                    <Select
                                        isMulti
                                        options={options}
                                        value={options.filter(opt => selectedLogs.includes(opt.value))}
                                        onChange={(selected) => setSelectedLogs(selected.map(s => s.value))}
                                        className="min-w-[200px] text-black bg-white"
                                        classNamePrefix="react-select"
                                        menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                                        styles={{
                                            menuPortal: base => ({ ...base, zIndex: 9999 }),
                                            option: (baseStyles, state) => ({
                                                ...baseStyles,
                                                color: 'black',
                                                backgroundColor: state.isFocused ? '#f0f0f0' : 'white',
                                                '&:active': { backgroundColor: '#e0e0e0' },
                                            }),
                                        }}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </form>

            {/* Display area for loading states and results */}
            {isSubmitting && (
                <div className="flex items-center justify-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <Loader2 className="mr-2 h-6 w-6 animate-spin text-blue-600" />
                    <span className="text-blue-700 font-medium">Processing on server...</span>
                </div>
            )}
            {error && (
                <div className="p-4 border rounded-lg bg-red-100 text-red-700">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">An Error Occurred</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>{error}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {apiResult && (
                <Suspense fallback={<div className="p-4">Loading results...</div>}>
                    <ResultDisplay data={apiResult} />
                </Suspense>
            )}
        </div>
    );
}
