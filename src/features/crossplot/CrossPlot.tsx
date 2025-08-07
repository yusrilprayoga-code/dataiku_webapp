/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useAppDataStore } from '@/stores/useAppDataStore';
import { Loader2, AlertTriangle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {children}
    </div>
);

export default function CrossplotViewer() {
    const { selectedWells, selectedIntervals, wellColumns } = useDashboard();
    const { vshDNParams, setVshDNParams, vshParams, setVshParams } = useAppDataStore();
    const searchParams = useSearchParams();

    const [xCol, setXCol] = useState<string>('');
    const [yCol, setYCol] = useState<string>('');
    const [plotResult, setPlotResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const availableLogs = useMemo(() => {
        if (selectedWells.length === 0 || Object.keys(wellColumns).length === 0) return [];
        const allLogs = selectedWells.flatMap(well => wellColumns[well] || []);
        const excluded = new Set(['MARKER', 'STRUKTUR', 'WELL_NAME', 'DEPTH', 'DEPT']);
        return [...new Set(allLogs)].filter(log => !excluded.has(log));
    }, [selectedWells, wellColumns]);

    const fetchCrossplot = useCallback(async (xAxis: string, yAxis: string) => {
        if (selectedWells.length === 0 || !xAxis || !yAxis) return;
        
        setLoading(true);
        setError(null);
        setPlotResult(null);

        const endpoint = "http://127.0.0.1:5001/api/get-crossplot";
        const payload = {
            selected_wells: selectedWells,
            selected_intervals: selectedIntervals,
            x_col: xAxis,
            y_col: yAxis,
            ...vshDNParams,
            ...vshParams,
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Gagal mengambil data');
            
            setPlotResult(await response.json());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
        } finally {
            setLoading(false);
        }
    }, [selectedWells, selectedIntervals, vshDNParams, vshParams]);

    useEffect(() => {
        const xFromUrl = searchParams.get('x');
        const yFromUrl = searchParams.get('y');

        if (xFromUrl && yFromUrl) {
            setXCol(xFromUrl);
            setYCol(yFromUrl);
            fetchCrossplot(xFromUrl, yFromUrl);
        } else if (availableLogs.length > 0) {
            // Fallback jika tidak ada parameter URL
            setXCol('NPHI');
            setYCol('RHOB');
        }
    }, [searchParams, fetchCrossplot, availableLogs]);
    
    const handleParamChange = (key: string, value: string) => {
        const numericValue = parseFloat(value);
        setVshDNParams({ ...vshDNParams, [key]: isNaN(numericValue) ? '' : numericValue });
    };

    const handleGRParamChange = (key: string, value: string) => {
        const numericValue = parseFloat(value);
        setVshParams({ ...vshParams, [key]: isNaN(numericValue) ? '' : numericValue });
    };

    return (
        <div className="p-4 md:p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Crossplot {yCol || ''} vs {xCol || ''}</h2>
            <p className="text-sm text-gray-600 mb-1">Wells: {selectedWells.join(', ') || 'N/A'}</p>
            <p className="text-sm text-gray-600 mb-4">Intervals: {selectedIntervals.join(', ') || 'All'}</p>

            <div className="p-4 border rounded-lg bg-gray-50 space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {(xCol === "NPHI" && yCol === "RHOB") && (
                        <>
                            <FormField label="Percentile Quartz"><input type="number" value={vshDNParams.prcnt_qz} onChange={(e) => handleParamChange('prcnt_qz', e.target.value)} className="w-full p-2 border rounded-md" step="any"/></FormField>
                            <FormField label="Percentile Water"><input type="number" value={vshDNParams.prcnt_wtr} onChange={(e) => handleParamChange('prcnt_wtr', e.target.value)} className="w-full p-2 border rounded-md" step="any"/></FormField>
                        </>
                    )}
                    {(xCol === "NPHI" && (yCol === "GR" || yCol === "GR_RAW_NORM")) && (
                        <>
                            <FormField label="GR MA"><input type="number" value={vshParams.gr_ma} onChange={(e) => handleGRParamChange('gr_ma', e.target.value)} className="w-full p-2 border rounded-md" step="any"/></FormField>
                            <FormField label="GR SH"><input type="number" value={vshParams.gr_sh} onChange={(e) => handleGRParamChange('gr_sh', e.target.value)} className="w-full p-2 border rounded-md" step="any"/></FormField>
                        </>
                    )}
                </div>
                {/* <div className="flex justify-end pt-4 border-t">
                    <button
                        onClick={() => fetchCrossplot(xCol, yCol)}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
                        disabled={loading}
                    >
                        {loading ? <span className="flex items-center gap-2"><Loader2 className="animate-spin w-4 h-4" /> Loading...</span> : 'Generate Crossplot'}
                    </button>
                </div> */}
            </div>

            <div className="mt-4 min-h-[600px] border-2 border-dashed rounded-lg flex items-center justify-center p-2">
                {loading && <div className="text-center text-gray-500"><Loader2 className="animate-spin h-8 w-8 mx-auto mb-2"/>Generating plot...</div>}
                {error && <div className="text-center text-red-600 p-4"><AlertTriangle className="mx-auto h-8 w-8 mb-2"/>Error: {error}</div>}
                {!loading && !error && plotResult && (
                    <Plot
                        data={plotResult.data}
                        layout={{ ...plotResult.layout, autosize: true }}
                        style={{ width: '100%', height: '100%' }}
                        config={{ responsive: true }}
                        useResizeHandler={true}
                    />
                )}
                {!loading && !error && !plotResult && (
                    <div className="text-center text-gray-400">Select axes and click &quot;Generate Crossplot&quot; or choose a predefined crossplot from the sidebar.</div>
                )}
            </div>
        </div>
    );
}