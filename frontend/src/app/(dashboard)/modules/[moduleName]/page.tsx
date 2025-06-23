/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any*/
// frontend/src/app/(dashboard)/modules/[moduleName]/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import NormalizationParamsForm from '@/components/forms/NormalizationParams';
import { useAppDataStore } from '@/stores/useAppDataStore';
import { type ParameterRow } from '@/types';

// Placeholder component for demonstration purposes
const SmoothingParamsForm = () => (
  <div className="p-4 border rounded-lg bg-white shadow-sm">
    <h2 className="text-lg font-semibold">Smoothing Parameters</h2>
    <p className="text-gray-600 mt-2">This is a placeholder for the smoothing parameters form.</p>
  </div>
);

export default function ModulePage(props: any) {
  const { moduleName } = props.params;
  const router = useRouter();
  const { addNormalizationResult } = useAppDataStore();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleNormalizationSubmit = async (activeParameters: ParameterRow[]) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/get-normalization-plot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeParameters),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Server returned a non-JSON response' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const plotObject = await response.json();
      const resultId = `norm-${Date.now()}`;

      addNormalizationResult(resultId, plotObject);
      router.push(`/dashboard/results/${resultId}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Submission Error:', errorMessage);
      alert(`Error: ${errorMessage}`);
      setIsLoading(false);
    }
  };

  const renderParameterForm = () => {
    switch (moduleName) {
      case 'normalization':
        return <NormalizationParamsForm onSubmit={handleNormalizationSubmit} isLoading={isLoading} />;
      case 'smoothing':
        return <SmoothingParamsForm />;
      default:
        return (
          <div className="p-4 border rounded-lg bg-red-50 text-red-700">
            Parameter form for &apos;{moduleName}&apos; not found.
          </div>
        );
    }
  };

  return (
    <div className="h-full p-4 md:p-6 bg-gray-50">
      <h1 className="text-2xl font-bold mb-4 capitalize text-gray-800">{moduleName} Module</h1>
      {renderParameterForm()}
    </div>
  );
}