'use client';

import React from 'react';
// Impor komponen form baru Anda
import NormalizationParams from '@/components/forms/NormalizationParams';

const SmoothingParams = () => <div className="p-4"><h2>Smoothing Parameters</h2><p>Form untuk smoothing...</p></div>;

export default function ModulePage({ params }: { params: Promise<{ moduleName: string }> }) {
  const resolvedParams = React.use(params);

  const renderParameterForm = () => {
    const moduleKey = resolvedParams.moduleName.replace(/-/g, ' ').toUpperCase();

    switch (moduleKey) {
      case 'NORMALIZATION':
        return <NormalizationParams />;
      
      case 'SMOOTHING':
        return <SmoothingParams />;

      default:
        return <div>Parameter tidak ditemukan.</div>;
    }
  };

  return (
    <div className="h-full">
      {renderParameterForm()}
    </div>
  );
}