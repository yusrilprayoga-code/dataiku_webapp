// eslint-disable-next-line react/no-unescaped-entities

// src/app/(dashboard)/modules/[moduleName]/page.tsx

'use client';

import React from 'react';
import NormalizationParamsForm from '@/components/forms/NormalizationParams';

const SmoothingParamsForm = () => <div className="p-4"><h2>Smoothing Parameters</h2><p>Form for smoothing...</p></div>;

export default function ModulePage({ params }: { params: { moduleName: string } }) {
  const renderParameterForm = () => {
    switch (params.moduleName) {
      case 'normalization':
        return <NormalizationParamsForm />;
      case 'smoothing':
        return <SmoothingParamsForm />;
      default:
        return <div>Parameter form for &apos;{params.moduleName}&apos; not found.</div>;
    }
  };

  return (
    <div className="h-full">
      {renderParameterForm()}
    </div>
  );
}