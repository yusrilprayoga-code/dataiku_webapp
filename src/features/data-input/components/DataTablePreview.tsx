// src/features/data-input/components/DataTablePreview.tsx
"use client";
import React from 'react';
import { PreviewableFile } from '@/types';
import { Eye } from 'lucide-react';

const DataTablePreview: React.FC<{ file: PreviewableFile | null }> = ({ file }) => {
  if (!file || !file.content || file.content.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-gray-400">
          <Eye className="mx-auto w-16 h-16 mb-4" />
          <h3 className="text-lg font-medium">No File Selected</h3>
          <p>Select a file from the list to preview its contents.</p>
        </div>
      </div>
    );
  }

  const headers = file.headers || (file.content.length > 0 ? Object.keys(file.content[0]) : []);

  if (headers.length === 0) {
    return <div className="p-4">No data or headers to display.</div>;
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            {headers.map((header, index) => (
              <th key={index} className="px-4 py-2 text-left font-semibold text-gray-600 border-b border-gray-200 whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {file.content.slice(0, 1000).map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {headers.map((header, colIndex) => (
                <td key={colIndex} className="px-4 py-2 text-gray-700 whitespace-nowrap max-w-xs truncate" title={String(row[header] ?? '')}>
                  {String(row[header] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {file.content.length > 1000 && (
        <div className="p-4 text-center text-sm text-gray-500 border-t">
          Showing first 1000 of {file.content.length} rows.
        </div>
      )}
    </div>
  );
};

export default DataTablePreview;