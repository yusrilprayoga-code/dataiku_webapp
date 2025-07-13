
// frontend/src/app/(dashboard)/dashboard/modules/[moduleName]/page.tsx
import React, { Suspense } from 'react';
import ModulePageClient from './ModulePageClient';

interface MyPageProps {
  params: Promise<{ moduleName: string }>;
}

// List of valid module names to prevent invalid routes
const VALID_MODULES = [
  'histogram',
  'crossplot-nphi-rhob',
  'crossplot-gr-nphi',
  'trim-data',
  'depth-matching',
  'normalization',
  'smoothing',
  'vsh-calculation',
  'porosity-calculation',
  'rgsa-ngsa-dgsa',
  'fill-missing',
  'water-resistivity-calculation',
  'sw-calculation'
];

export default async function MyPage({ params }: MyPageProps) {
  const resolvedParams = await params;
  const moduleName = resolvedParams.moduleName;
  return (
    <Suspense fallback={
      <div className="h-full p-4 md:p-6 bg-gray-50">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div className="ml-4 text-gray-600">Loading module...</div>
        </div>
      </div>
    }>
      <ModulePageClient
        moduleName={moduleName}
        validModules={VALID_MODULES}
      />
    </Suspense>
  );
}

// This helps with static generation and prevents 404s
export async function generateStaticParams() {
  return VALID_MODULES.map((moduleName) => ({
    moduleName: moduleName,
  }));
}