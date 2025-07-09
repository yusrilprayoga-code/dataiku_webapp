'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useAppDataStore } from '@/stores/useAppDataStore';
import { useDashboard } from '@/contexts/DashboardContext';
import { type PlotData } from '@/types';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function RgbeRpbePage() {
    const { selectedWells } = useDashboard();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [plot, setPlot] = useState<PlotData | null>(null);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const endpoint = `${apiUrl}/api/get-rgbe-rpbe-plot`;

    useEffect(() => {
        const fetchPlot = async () => {
            if (!selectedWells || selectedWells.length === 0) {
                setError("No wells selected");
                return;
            }

            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ wells: selectedWells }),
                });

                if (!response.ok) {
                    throw new Error(await response.text());
                }

                const plotData = await response.json();
                setPlot(plotData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch plot data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPlot();
    }, [selectedWells]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading RGBE-RPBE analysis...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 border rounded-lg bg-red-50 text-red-700">
                <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    if (!plot) {
        return (
            <div className="p-4">
                <p>No data available. Please select wells to analyze.</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            <Plot
                data={plot.data}
                layout={{
                    ...plot.layout,
                    autosize: true,
                    height: undefined,
                    width: undefined,
                }}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler={true}
                config={{
                    displaylogo: false,
                    responsive: true,
                    scrollZoom: true,
                }}
            />
        </div>
    );
}
