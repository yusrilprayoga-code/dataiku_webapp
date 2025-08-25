/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamically import Plotly to reduce initial bundle size
const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false, // This is important for components that rely on browser APIs
    loading: () => <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-8 w-8" /></div>
});

export default function MatchingPlotPage() {
    const router = useRouter();
    // Gunakan hook untuk mendapatkan parameter dari URL
    const searchParams = useSearchParams();

    const [plotFigure, setPlotFigure] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Ambil path LWD dari URL
        const lwdPath = "D:\\DATAIKU\\PROJECT PERTAMINA\\dataiku_webapp\\api\\data\\structures\\adera\\benuang\\BNG-056";

        // --- DEBUGGING DI FRONTEND ---
        console.log("Path LWD yang diterima dari URL:", lwdPath);

        if (!lwdPath) {
            setError("Path file LWD tidak ditemukan di URL. Tidak bisa memuat plot.");
            setIsLoading(false);
            return;
        }

        const fetchPlotData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL;
                const endpoint = `${apiUrl}/api/get-matching-plot`;

                // Kirim path LWD ke backend
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lwd_path: lwdPath }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Gagal mengambil data plot dari server.');
                }

                const resultJsonString = await response.json();
                const plotObject = JSON.parse(resultJsonString);

                if (plotObject && (plotObject.data || plotObject.layout)) {
                    setPlotFigure(plotObject);
                } else {
                    throw new Error('Struktur data plot tidak valid.');
                }

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Terjadi error tidak diketahui.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPlotData();
    }, [searchParams]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col h-full items-center justify-center p-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                    <p className="mt-4 text-gray-600">Loading Plot Data...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex h-full items-center justify-center p-4">
                    <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg shadow-md">
                        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
                        <h3 className="mt-4 text-lg font-semibold text-red-800">Error Fetching Plot</h3>
                        <p className="mt-2 text-red-700">{error}</p>
                    </div>
                </div>
            );
        }

        if (plotFigure) {
            return (
                <div style={{ border: '1px solid #ccc', padding: '1rem', background: 'white', borderRadius: '8px', height: '100%', width: '100%' }}>
                    <Plot
                        data={plotFigure.data}
                        layout={plotFigure.layout}
                        style={{ width: '100%', height: '100%' }}
                        config={{ responsive: true, displaylogo: false }}
                    />
                </div>
            );
        }

        return null; // Should not be reached if logic is correct
    };

    return (
        <div className="flex h-full flex-col rounded-lg bg-white p-4 shadow-md md:p-6">
            <div className="flex-shrink-0 flex items-center justify-between mb-4 border-b pb-2">
                <h2 className="text-xl font-bold text-gray-800">Depth Matching Result</h2>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 rounded-md bg-gray-200 px-4 py-2 font-semibold text-gray-800 hover:bg-gray-300"
                >
                    <ArrowLeft size={18} />
                    Go Back
                </button>
            </div>
            <div className="min-h-0 flex-grow">
                {renderContent()}
            </div>
        </div>
    );
}
