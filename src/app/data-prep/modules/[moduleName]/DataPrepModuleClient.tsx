// src/app/data-prep/modules/[moduleName]/DataPrepModuleClient.tsx

'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

import DataPrepNormalizationParams from '@/data-prep/normalization/DataPrepNormalization';
import TrimDataParams from '@/features/trim_data/TrimDataParams';
import DepthMatchingPage from '@/features/depth-matching/page';
import FillMissingPage from '@/features/fill_missing/page';
import SplicingMergingPage from '@/features/splicing-merging/page';
import DataPrepSmoothingParams from '@/data-prep/smoothing/DataPrepSmoothing';

interface DataPrepModuleClientProps {
  moduleName: string;
  validModules: string[];
}

const DataPrepModuleClient: React.FC<DataPrepModuleClientProps> = ({ 
  moduleName, 
  validModules 
}) => {
  // Check if module is valid
  if (!validModules.includes(moduleName)) {
    return (
      <div className="h-full p-4 md:p-6 bg-gray-50">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-red-200">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <h1 className="text-xl font-semibold text-red-700">Module Not Found</h1>
          </div>
          <p className="text-gray-600 mb-4">
            The data preparation module &quot;{moduleName}&quot; could not be found.
          </p>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-red-800 mb-2">Available modules:</p>
            <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
              {validModules.map((module) => (
                <li key={module}>{module}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Render the appropriate component based on moduleName
  const renderModule = () => {
    switch (moduleName) {
      // Data Preparation Tools
      case 'trim-data':
        return <TrimDataParams />;
      case 'normalization':
        return <DataPrepNormalizationParams />;
      case 'depth-matching':
        return <DepthMatchingPage />;
      case 'fill-missing':
        return <FillMissingPage />;
      case 'smoothing':
        return <DataPrepSmoothingParams />;
      case 'splicing-merging':
        return <SplicingMergingPage />;
      default:
        return (
          <div className="h-full p-4 md:p-6 bg-gray-50">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                {moduleName.split('-').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </h1>
              <p className="text-gray-600">
                This module is under development.
              </p>
            </div>
          </div>
        );
    }
  };

  return renderModule();
};

export default DataPrepModuleClient;
