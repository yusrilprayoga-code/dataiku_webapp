/* eslint-disable @typescript-eslint/no-unused-vars */
// frontend/src/app/(dashboard)/modules/[moduleName]/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import NormalizationParamsForm from '@/components/forms/NormalizationParams';
import { useAppDataStore } from '@/stores/useAppDataStore';
import { type ParameterRow } from '@/types';

// Komponen placeholder untuk contoh
const SmoothingParamsForm = () => <div className="p-4"><h2>Smoothing Parameters</h2><p>Form for smoothing...</p></div>;

// ========================================================================
// === PASTIKAN TIDAK ADA KATA KUNCI 'async' PADA BARIS DI BAWAH INI ===
// ========================================================================
export default function ModulePage({ params }: { params: { moduleName: string } }) {
  // Semua hooks ini harus berada di dalam fungsi yang BUKAN async
  const router = useRouter();
  const { addNormalizationResult } = useAppDataStore();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null); // 'results' tidak dipakai, tapi kita biarkan dulu

  // Fungsi handler ini BOLEH dan HARUS async karena ia melakukan fetch
  const handleNormalizationSubmit = async (activeParameters: ParameterRow[]) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/get-normalization-plot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeParameters),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Server returned non-JSON response' }));
        throw new Error(errorData.error || 'Server error occurred');
      }

      const plotObject = await response.json();
      const resultId = `norm-${Date.now()}`;

      addNormalizationResult(resultId, plotObject);

      router.push(`/dashboard/results/${resultId}`);

    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Jika terjadi error, set loading kembali ke false agar tombol bisa diklik lagi
      setIsLoading(false);
    }
    // 'finally' block tidak diperlukan di sini
  };

  // Fungsi render ini adalah bagian dari komponen sinkron
  const renderParameterForm = () => {
    switch (params.moduleName) {
      case 'normalization':
        return <NormalizationParamsForm onSubmit={handleNormalizationSubmit} isLoading={isLoading} />;
      case 'smoothing':
        return <SmoothingParamsForm />;
      default:
        return <div>Parameter form untuk &apos;{params.moduleName}&apos; tidak ditemukan.</div>;
    }
  };

  // Return JSX adalah bagian dari komponen sinkron
  return (
    <div className="h-full p-4 bg-gray-50">
      <h1 className="text-2xl font-bold mb-4 capitalize">{params.moduleName} Module</h1>
      {renderParameterForm()}
    </div>
  );
}