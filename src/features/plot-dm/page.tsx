/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';

const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>
});

// Komponen baru untuk menampilkan tabel ringkasan
const SummaryTable = ({ data }: { data: Record<string, any> | null }) => {
    if (!data) return null;

    return (
        <div className="mt-4 border rounded-lg overflow-hidden shadow-sm">
            <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Metric</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">Value</th>
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {Object.entries(data).map(([key, value]) => (
                        <tr key={key} className="border-t">
                            <td className="px-4 py-2 font-medium text-gray-800">{key}</td>
                            <td className="px-4 py-2 text-gray-600">{value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


export default function MatchingPlotPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [plotFigure, setPlotFigure] = useState<any>(null);
    const [summaryData, setSummaryData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Ambil path LWD dari URL secara dinamis
        // // const lwdPath = ;

        // if (!lwdPath) {
        //     setError("Path file LWD tidak ditemukan di URL. Tidak bisa memuat plot.");
        //     setIsLoading(false);
        //     return;
        // }

        const fetchAnalysisData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL;
                // Panggil endpoint baru yang lebih lengkap
                const endpoint = `${apiUrl}/api/get-matching-plot`;

                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // body: JSON.stringify({ lwd_path: lwdPath }),
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || 'Gagal mengambil data analisis dari server.');
                }

                // Ekstrak plot dan summary dari respons
                const plotObject = JSON.parse(result.plot_data);
                setPlotFigure(plotObject);
                setSummaryData(result.summary_data);

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Terjadi error tidak diketahui.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnalysisData();
    }, [searchParams]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col h-full items-center justify-center p-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                    <p className="mt-4 text-gray-600">Generating Analysis Plot...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg shadow-md">
                    <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
                    <h3 className="mt-4 text-lg font-semibold text-red-800">Error Fetching Analysis</h3>
                    <p className="mt-2 text-red-700">{error}</p>
                </div>
            );
        }

        if (plotFigure) {
            return (
                <div className="flex flex-col h-full">
                    <div className="flex-shrink-0">
                         <SummaryTable data={summaryData} />
                    </div>
                    <div className="flex-grow min-h-0 mt-4">
                        <Plot
                            data={plotFigure.data}
                            layout={plotFigure.layout}
                            style={{ width: '100%', height: '1000%' }}
                            useResizeHandler={true}
                            config={{ responsive: true, displaylogo: false }}
                        />
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex h-full flex-col rounded-lg bg-white p-4 shadow-md md:p-6">
            <div className="flex-shrink-0 flex items-center justify-between mb-4 border-b pb-2">
                <h2 className="text-xl font-bold text-gray-800">Depth Matching Analysis Result</h2>
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
