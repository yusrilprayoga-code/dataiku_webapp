import React, { Suspense } from 'react';
import DataPrepModuleClient from './DataPrepModuleClient';

interface DataPrepModulePageProps {
  params: Promise<{ moduleName: string }>;
}

// List of valid data preparation module names
const VALID_DATA_PREP_MODULES = [
  'histogram',
  'crossplot',
  'trim-data',
  'depth-matching',
  'fill-missing',
  'smoothing',
  'normalization',
  'splicing-merging',
  'plot-dm'
];

// Fallback component for Suspense
const LoadingFallback = () => (
    <div className="h-full p-4 md:p-6 bg-gray-50 flex items-center justify-center">
        <div className="flex items-center text-gray-600">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <div className="ml-4 text-gray-600">Loading data preparation module...</div>
        </div>
    </div>
);

export default async function DataPrepModulePage({ params }: DataPrepModulePageProps) {
  // --- FIX #2: Await the 'params' object first, then access its properties ---
  const resolvedParams = await params;
  const moduleName = resolvedParams.moduleName;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <DataPrepModuleClient
        moduleName={moduleName}
        validModules={VALID_DATA_PREP_MODULES}
      />
    </Suspense>
  );
}

// generateStaticParams function does not need changes
export async function generateStaticParams() {
  return VALID_DATA_PREP_MODULES.map((moduleName) => ({
    moduleName: moduleName,
  }));
}