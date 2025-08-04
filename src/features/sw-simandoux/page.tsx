// src/features/sw-simandoux/page.tsx
'use client';

import React from 'react';

export default function SwSimandouxParams() {
  return (
    <div className="p-4 md:p-8 min-h-full flex flex-col bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 flex-shrink-0">SW Simandoux Calculation</h2>
      
      <div className="flex-shrink-0">
        <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
          <p className="text-sm font-semibold">SW Simandoux Template</p>
          <hr />
          <div className="text-center text-gray-500 py-8">
            <h3 className="text-lg font-medium mb-2">To be made</h3>
            <p className="text-sm">SW Simandoux kalkulasi nanti disini.</p>
            <p className="text-xs mt-2 text-gray-400">Placeholder buat params SW Simandoux.</p>
          </div>
        </div>
      </div>
      
      {/* Plot area placeholder */}
      <div className="flex justify-center items-center mt-6">
        <div className="w-full aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center p-4">
          <div className="text-center text-gray-400">
            SW Simandoux results will be displayed here.
          </div>
        </div>
      </div>
    </div>
  );
}
