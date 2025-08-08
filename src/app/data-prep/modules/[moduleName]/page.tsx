import React, { Suspense } from 'react';
import DataPrepModuleClient from './DataPrepModuleClient';

// --- PERBAIKAN 1: Hapus 'Promise' dari tipe params ---
interface DataPrepModulePageProps {
  params: { moduleName: string };
}

// Daftar modul yang valid untuk seksi Data Prep
const VALID_DATA_PREP_MODULES = [
  // Data Analysis
  'histogram',
  'crossplot',
  
  // Data Preparation
  'trim-data',
  'depth-matching',
  'fill-missing',
  'smoothing',
  'normalization',
  'splicing-merging',
];

export default async function DataPrepModulePage({ params }: DataPrepModulePageProps) {
  // --- PERBAIKAN 2: Akses moduleName langsung dari params tanpa await ---
  const moduleName = params.moduleName;

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

// Fungsi generateStaticParams tidak perlu diubah
export async function generateStaticParams() {
  return VALID_DATA_PREP_MODULES.map((moduleName) => ({
    moduleName: moduleName,
  }));
}