// FILE 2: frontend/src/features/quality-control/QcRunner.tsx
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useAppDataStore } from '@/stores/useAppDataStore';
import { Loader2, PlayCircle } from 'lucide-react';
import React, { useState } from 'react';
import { QcApiResponse, QcSummaryItem } from './types';

export default function QcRunner() {
    // Ambil data yang sudah disiapkan dari Zustand store
    const { stagedStructure, setQcResults } = useAppDataStore();
    const [isLoading, setIsLoading] = useState(false);
    const [apiResponse, setApiResponse] = useState<QcApiResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleRunQc = async () => {
        if (!stagedStructure || stagedStructure.files.length === 0) {
            alert("Tidak ada data yang siap untuk diproses. Silakan upload file terlebih dahulu.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setApiResponse(null);

        try {
            // Siapkan data yang akan dikirim ke backend
            const filesToProcess = stagedStructure.files.map(file => ({
                name: file.originalName || file.name,
                content: file.rawContentString,
            }));

            // Panggil endpoint QC yang baru dan bersih
            const response = await fetch('/api/qc/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: filesToProcess }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: "Server error" }));
                throw new Error(errData.error || `HTTP error! Status: ${response.status}`);
            }

            const results: QcApiResponse = await response.json();
            setApiResponse(results);

            // Simpan hasil ke global store agar bisa diakses halaman lain
            setQcResults(results);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan tidak dikenal";
            console.error("Gagal menjalankan QC:", err);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Quality Control Runner</h2>

            {stagedStructure ? (
                <div className="mb-4 p-4 bg-gray-50 rounded-md border">
                    <p className="font-semibold text-gray-700">Struktur Siap Diproses:</p>
                    <p className="text-lg font-bold text-blue-600">{stagedStructure.userDefinedStructureName}</p>
                    <p className="text-sm text-gray-500">{stagedStructure.files.length} file akan diproses.</p>
                </div>
            ) : (
                <p className="text-gray-500 mb-4">Silakan kembali ke halaman upload dan siapkan data terlebih dahulu.</p>
            )}

            <button
                onClick={handleRunQc}
                disabled={isLoading || !stagedStructure}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white font-bold rounded-md hover:bg-green-600 disabled:bg-gray-400 transition-colors"
            >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
                {isLoading ? 'Sedang Memproses...' : 'Jalankan Quality Control'}
            </button>

            {error && (
                <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {apiResponse && (
                <div className="mt-6">
                    <h3 className="font-bold text-lg">Hasil QC:</h3>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                        {apiResponse.qc_summary.map((item) => (
                            <li key={item.well_name}>
                                <strong>{item.well_name}:</strong>
                                <span className={`font-semibold ml-2 ${item.status === 'PASS' ? 'text-green-600' : 'text-yellow-600'}`}>{item.status}</span>
                                - <span className="text-gray-600">{item.details}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}