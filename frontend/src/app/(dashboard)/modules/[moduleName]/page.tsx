/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/(dashboard)/modules/[moduleName]/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import NormalizationParamsForm from '@/components/forms/NormalizationParams'; // Pastikan path ini benar
import { useAppDataStore } from '@/stores/useAppDataStore'; // Pastikan path ini benar
import { type ParameterRow } from '@/types'; // Pastikan path ini benar

// Komponen placeholder
const SmoothingParamsForm = () => <div className="p-4"><h2>Smoothing Parameters</h2><p>Form for smoothing...</p></div>;

export default function ModulePage({ params }: { params: { moduleName: string } }) {
  const router = useRouter();
  const { addNormalizationResult } = useAppDataStore(); // Ambil action dari store
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);

  // Fungsi ini sekarang menjadi "otak" yang menangani logika submit
  const handleNormalizationSubmit = async (activeParameters: ParameterRow[]) => {
    setIsLoading(true);

    try {
      // FIX PENTING: Gunakan path relatif, bukan URL hardcode!
      const response = await fetch('/api/get-normalization-plot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeParameters),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Server returned non-JSON response' }));
        throw new Error(errorData.error || 'Server error occurred');
      }

      // Vercel/Flask akan return JSON, jadi kita parse sekali saja.
      const plotObject = await response.json();
      const resultId = `norm-${Date.now()}`;

      addNormalizationResult(resultId, plotObject); // Simpan hasil ke global store

      // Arahkan ke halaman hasil
      router.push(`/dashboard/results/${resultId}`);

    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Jangan set isLoading ke false di sini jika navigasi berhasil
    } finally {
      // Set isLoading ke false hanya jika terjadi error, agar tombol bisa diklik lagi
      // Jika sukses, kita akan pindah halaman jadi tidak perlu di-set.
      if (!router) setIsLoading(false);
    }
  };

  const renderParameterForm = () => {
    switch (params.moduleName) {
      case 'normalization':
        return <NormalizationParamsForm onSubmit={handleNormalizationSubmit} isLoading={isLoading} />;
      case 'smoothing':
        return <SmoothingParamsForm />; // Anda bisa membuat handler terpisah untuk ini
      default:
        return <div>Parameter form untuk &apos;{params.moduleName}&apos; tidak ditemukan.</div>;
    }
  };

  return (
    <div className="h-full p-4 bg-gray-50">
      <h1 className="text-2xl font-bold mb-4 capitalize">{params.moduleName} Module</h1>
      {renderParameterForm()}
    </div>
  );
}