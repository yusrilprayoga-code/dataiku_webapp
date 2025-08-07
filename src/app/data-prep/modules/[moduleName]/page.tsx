// src/app/data-prep/modules/[moduleName]/page.tsx

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
  'splicing-merging'
];

export default async function DataPrepModulePage({ params }: DataPrepModulePageProps) {
  const resolvedParams = await params;
  const moduleName = resolvedParams.moduleName;

  return (
    <Suspense fallback={
      <div className="h-full p-4 md:p-6 bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="ml-4 text-gray-600">Loading data preparation module...</div>
        </div>
      </div>
    }>
      <DataPrepModuleClient
        moduleName={moduleName}
        validModules={VALID_DATA_PREP_MODULES}
      />
    </Suspense>
  );
}
