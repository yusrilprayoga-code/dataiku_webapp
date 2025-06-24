// src/app/(dashboard)/results/[resultId]/page.tsx

'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDataStore } from '@/stores/useAppDataStore';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function ResultPage() {
  const router = useRouter();
  const params = useParams();
  const normalizationResults = useAppDataStore((state) => state.normalizationResults);
  
  const resultId = params.resultId as string;
  const plot = normalizationResults[resultId];

  if (!plot) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
        <h2 className="text-2xl font-bold">Result Not Found</h2>
        <p className="mt-2">Could not find result with ID: {resultId}</p>
        <button onClick={() => router.push('/dashboard/dashboard')} className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col p-4 bg-gray-50">
      <div className="flex-shrink-0 mb-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Result: {resultId}</h1>
        <button onClick={() => router.back()} className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
          <ArrowLeft size={16} />
          Back
        </button>
      </div>
        <Plot
          data={plot.data}
          layout={plot.layout}
          style={{ width: '100%', height: '100%' }}
          config={{ responsive: true }}
          useResizeHandler={true}
        />
    </div>
  );
}
