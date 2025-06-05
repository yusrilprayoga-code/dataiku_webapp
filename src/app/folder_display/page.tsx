// app/data-input-utama/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDataStore } from '../../stores/appDataStore'; // Adjust path
import { StagedStructure, ProcessedFileDataForDisplay } from '../../stores/appDataStore'; // Or from your types file
import { Eye, FileTextIcon, Folder as FolderIcon } from 'lucide-react'; // Import necessary icons

// Reusable DataTablePreview component (can be moved to its own file)
const DataTablePreview: React.FC<{ headers: string[]; content: any[] }> = ({ headers, content }) => {
  if (!headers || headers.length === 0 || !content || content.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <FileTextIcon className="mx-auto w-12 h-12 text-gray-300 mb-3" />
        <p>No data or headers to display for this selection.</p>
      </div>
    );
  }
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50 sticky top-0 z-10">
        <tr>
          {headers.map((header, index) => (
            <th key={index} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap" title={header}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {content.slice(0, 1000).map((row, rowIndex) => ( // Apply row limit
          <tr key={rowIndex} className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`}>
            {headers.map((header, colIndex) => (
              <td key={colIndex} className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-xs truncate" title={String(row[header] ?? '')}>
                {String(row[header] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};


export default function DataInputUtamaPage() {
  const router = useRouter();
  const { stagedStructure, clearStagedStructure } = useAppDataStore();
  const [selectedFileForPreview, setSelectedFileForPreview] = useState<ProcessedFileDataForDisplay | null>(null);

  useEffect(() => {
    if (!stagedStructure) {
      // If no data, maybe redirect back or show a message
      // For now, just log and let the page render a "no data" state
      console.warn("No staged structure data found. Redirecting might be appropriate.");
      // router.replace('/input'); // Example redirect
    }

    // Optional: Clear staged data when component unmounts or user navigates away
    // return () => {
    //   clearStagedStructure();
    // };
  }, [stagedStructure, router, clearStagedStructure]);

  if (!stagedStructure) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-8">
        <FolderIcon className="w-24 h-24 text-gray-300 mb-4" />
        <h1 className="text-2xl font-semibold text-gray-700 mb-2">No Data Structure Loaded</h1>
        <p className="text-gray-500 mb-6">Please go back to the upload page and process some files first.</p>
        <button
          onClick={() => router.push('/input')}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Go to Upload Page
        </button>
      </div>
    );
  }

  const handleSubFileSelect = (file: ProcessedFileDataForDisplay) => {
    setSelectedFileForPreview(file);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel: Structure and File List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col p-4 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b">
          <FolderIcon className="w-8 h-8 text-yellow-500 flex-shrink-0" />
          <div>
            <h1 className="text-xl font-semibold text-gray-800">{stagedStructure.userDefinedStructureName}</h1>
            <p className="text-sm text-gray-500">{stagedStructure.files.length} file(s)</p>
          </div>
        </div>
        <h2 className="text-lg font-medium text-gray-700 pt-2">Files in Structure:</h2>
        <ul className="flex-1 overflow-y-auto space-y-1">
          {stagedStructure.files.map((file) => (
            <li
              key={file.id}
              onClick={() => handleSubFileSelect(file)}
              className={`p-2 rounded cursor-pointer hover:bg-gray-100 flex items-center gap-2 ${
                selectedFileForPreview?.id === file.id ? 'bg-blue-100 border border-blue-300' : ''
              }`}
            >
              <FileTextIcon className={`w-5 h-5 flex-shrink-0 ${file.type === 'las-as-csv' ? 'text-green-500' : 'text-blue-500'}`} />
              <span className="text-sm text-gray-700 truncate" title={file.name}>{file.name}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => {
            clearStagedStructure(); // Clear data before going back
            router.push('/input');
          }}
          className="w-full mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Back to Upload Page & Clear
        </button>
        {/* You can add a "Save/Process Structure" button here later for backend integration */}
      </div>

      {/* Right Panel: Preview */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedFileForPreview ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Eye className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <h2 className="font-semibold text-gray-800 truncate" title={selectedFileForPreview.name}>
                      {selectedFileForPreview.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Type: {selectedFileForPreview.type.toUpperCase()}. Previewing {Math.min(selectedFileForPreview.content.length, 1000)} of {selectedFileForPreview.content.length} rows × {selectedFileForPreview.headers.length} columns.
                    </p>
                  </div>
                </div>
                {/* You might want to display original file size if you pass it through */}
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <DataTablePreview headers={selectedFileForPreview.headers} content={selectedFileForPreview.content} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500 p-5">
              <Eye className="mx-auto w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a file from the structure to preview</h3>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}