// app/your-route/components/FilePreview.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { FileData, ParsedSubFile } from '../types'; // Adjust path
import { formatFileSize } from '../utils/fileUtils'; // Adjust path
import { Eye, FileTextIcon, File as FileIcon} from 'lucide-react'; // Add FileTextIcon

interface FilePreviewProps {
  selectedFile: FileData | null;
  selectedSubFile: ParsedSubFile | null;
  onSelectSubFile: (subFile: ParsedSubFile) => void;
}

const DataTablePreview: React.FC<{ headers: string[]; content: any[] }> = ({ headers, content }) => {
  if (!headers || headers.length === 0 || !content || content.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <FileIcon className="mx-auto w-12 h-12 text-gray-300 mb-3" />
        <p>No data or headers to display for this selection.</p>
      </div>
    );
  }
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50 sticky top-0 z-10">
        <tr>
          {headers.map((header, index) => (
            <th
              key={index}
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 whitespace-nowrap"
              title={header}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {content.slice(0, 1000).map((row, rowIndex) => (
          <tr key={rowIndex} className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`}>
            {headers.map((header, colIndex) => (
              <td
                key={colIndex}
                className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-xs truncate"
                title={String(row[header] ?? '')}
              >
                {String(row[header] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};


const FilePreview: React.FC<FilePreviewProps> = ({ selectedFile, selectedSubFile, onSelectSubFile }) => {
  if (!selectedFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center text-gray-500 p-5">
          <Eye className="mx-auto w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium mb-2">Select an item to preview</h3>
          <p>Choose an item from the list on the left.</p>
        </div>
      </div>
    );
  }

  let previewTitle = selectedFile.name;
  let subTitle = "";

  if (selectedFile.isStructureFromZip) {
    subTitle = `Structure (from ${selectedFile.originalZipName || 'ZIP'}). Contains: ${selectedFile.lasFiles?.length || 0} LAS, ${selectedFile.csvFiles?.length || 0} CSV.`;
    if (selectedSubFile) {
      previewTitle = `${selectedFile.name} / ${selectedSubFile.name}`; // e.g., WellA / log.las
      subTitle = `Previewing ${selectedSubFile.type.toUpperCase()} file. ${selectedSubFile.content.length} rows × ${selectedSubFile.headers.length} columns.`;
    }
  } else {
     subTitle = `Previewing ${Math.min(selectedFile.content?.length || 0, 1000)} of ${selectedFile.content?.length || 0} rows × ${selectedFile.headers?.length || 0} columns`;
  }


  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Preview Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Eye className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-800 truncate" title={previewTitle}>
                {previewTitle}
              </h2>
              <p className="text-sm text-gray-500">{subTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 flex-shrink-0">
              {formatFileSize(selectedFile.size)}
            </span>
          </div>
        </div>
      </div>

      {/* Data Display Area */}
      <div className="flex-1 overflow-auto">
        {selectedFile.isStructureFromZip ? (
          <>
            {!selectedSubFile ? (
              <div className="p-4">
                {selectedFile.lasFiles && selectedFile.lasFiles.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-md font-semibold text-gray-700 mb-2">LAS Files:</h3>
                    <ul className="space-y-1">
                      {selectedFile.lasFiles.map((las) => (
                        <li
                          key={las.id}
                          className="text-sm text-blue-600 hover:underline cursor-pointer p-1 rounded hover:bg-gray-100 flex items-center gap-2"
                          onClick={() => onSelectSubFile(las)}
                        >
                          <FileTextIcon className="w-4 h-4 text-gray-500 flex-shrink-0" /> {las.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedFile.csvFiles && selectedFile.csvFiles.length > 0 && (
                  <div>
                    <h3 className="text-md font-semibold text-gray-700 mb-2">CSV Files (Markers):</h3>
                    <ul className="space-y-1">
                      {selectedFile.csvFiles.map((csv) => (
                        <li
                          key={csv.id}
                          className="text-sm text-blue-600 hover:underline cursor-pointer p-1 rounded hover:bg-gray-100 flex items-center gap-2"
                          onClick={() => onSelectSubFile(csv)}
                        >
                          <FileTextIcon className="w-4 h-4 text-gray-500 flex-shrink-0" /> {csv.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(!selectedFile.lasFiles || selectedFile.lasFiles.length === 0) &&
                 (!selectedFile.csvFiles || selectedFile.csvFiles.length === 0) && (
                  <p className="text-gray-500">No LAS or CSV files found in this structure.</p>
                )}
              </div>
            ) : (
              // Previewing a selected sub-file
              <DataTablePreview headers={selectedSubFile.headers} content={selectedSubFile.content} />
            )}
          </>
        ) : (
          // Previewing a single, directly uploaded file
          selectedFile.content && selectedFile.headers ? (
            <DataTablePreview headers={selectedFile.headers} content={selectedFile.content} />
          ) : (
             <div className="p-8 text-center text-gray-500">
                <FileIcon className="mx-auto w-12 h-12 text-gray-300 mb-3" />
                <p>No data to display for this file.</p>
             </div>
          )
        )}
      </div>
    </div>
  );
};

export default FilePreview;