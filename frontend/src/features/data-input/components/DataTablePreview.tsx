
// FILE: src/features/data-input/components/DataTablePreview.tsx
"use client";
import React from 'react';
import { PreviewableFile } from '@/types';
import { Eye } from 'lucide-react';

const DataTablePreview: React.FC<{ file: PreviewableFile | null }> = ({ file }) => {
  if (!file || !file.headers || file.headers.length === 0 || !file.content || file.content.length === 0) {
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

  return (
    <div className="flex-1 overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>{file.headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {file.content.slice(0, 1000).map((row, rIdx) => (
            <tr key={rIdx}>{file.headers.map((h, cIdx) => <td key={cIdx}>{String(row[h] ?? '')}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTablePreview;