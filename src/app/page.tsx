"use client"; 

import { useState, ChangeEvent } from 'react';
import { Upload, File as FileIcon, Eye, Trash2, Search } from 'lucide-react'; // Renamed File to FileIcon to avoid conflict with File interface
import Papa from 'papaparse';
import XLSX from 'xlsx';

interface FileData {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  content: any[];
  headers: string[];
}

export default function FileUploadViewer() {
  const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const parseLASFile = (fileContent: string): { headers: string[], data: any[] } => {
    const lines = fileContent.split('\n');
    let parsedHeaders: string[] = [];
    const parsedData: any[] = [];
    
    let inCurveSection = false;
    let inDataSection = false;

    // First pass: Extract headers from ~Curve Information Bloc
    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.toUpperCase().startsWith('~C')) { // Start of Curve Information Block
            inCurveSection = true;
            continue;
        }
        
        if (inCurveSection) {
            if (trimmedLine.startsWith('~')) { // Another section starts, so ~C ends
                inCurveSection = false;
                // We could break here if we assume ~C always precedes ~A
                // For robustness, parse all ~C sections if multiple (though not standard)
                continue; 
            }
            if (trimmedLine && !trimmedLine.startsWith('#')) { // Not a comment and not empty
                // Mnemonic is the first part before a dot or colon.
                // e.g., "DEPT.M ..." -> "DEPT" or "GR   .GAPI ..." -> "GR"
                const mnemonicMatch = trimmedLine.match(/^([^\s.:]+)/); 
                if (mnemonicMatch && mnemonicMatch[1]) {
                    parsedHeaders.push(mnemonicMatch[1]);
                }
            }
        }
    }
    
    for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.toUpperCase().startsWith('~A')) { // Start of ASCII Log Data
            inDataSection = true;
            // If parsedHeaders is still empty (no ~C block or empty ~C), 
            // we will generate generic headers based on the first valid data line.
            continue;
        }

        if (inDataSection) {
            if (trimmedLine.startsWith('~')) { // Another section starts, so ~A ends
                 inDataSection = false;
                 break; // Data is contiguous in ~A section
            }
            if (trimmedLine && !trimmedLine.startsWith('#')) { // Not a comment and not empty
                const values = trimmedLine.split(/\s+/).filter(v => v.trim() !== ""); // Split by one or more whitespace, filter empty strings

                if (values.length > 0) {
                    if (parsedHeaders.length === 0) {
                        // No headers from ~C, generate generic headers like "Column 1", "Column 2", ...
                        parsedHeaders = values.map((_, index) => `Column ${index + 1}`);
                    }

                    const row: any = {};
                    const columnCount = Math.min(parsedHeaders.length, values.length);
                    for (let i = 0; i < columnCount; i++) {
                        row[parsedHeaders[i]] = values[i];
                    }
                    // If values array has more elements than parsedHeaders, they are ignored.
                    // If values array has fewer, corresponding data will be missing for trailing headers.
                    parsedData.push(row);
                }
            }
        }
    }
    
    return { headers: parsedHeaders, data: parsedData };
  };


  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setMessage('Processing files...');
    const newFiles: FileData[] = [];

    for (const file of Array.from(files)) {
      try {
        const fileContent = await readFileContent(file);
        let parsedData: { headers: string[], data: any[] };

        if (file.name.toLowerCase().endsWith('.csv')) {
          parsedData = await parseCSVFile(fileContent);
        } else if (file.name.toLowerCase().endsWith('.las')) {
          parsedData = parseLASFile(fileContent);
        } else if (file.name.toLowerCase().endsWith('.xlsx')) {
          const arrayBufferContent = await readFileAsArrayBuffer(file);
          parsedData = parseXLSXFileWithSheetJS(arrayBufferContent);
        } else {
          throw new Error('Unsupported file type. Please upload .csv or .las files.');
        }

        if (parsedData.data.length === 0 && parsedData.headers.length === 0) {
            setMessage(`Warning: File ${file.name} appears to be empty or could not be parsed correctly.`);
        }


        const fileData: FileData = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 9), // More robust unique ID
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          lastModified: file.lastModified,
          content: parsedData.data.slice(0, 1000), // Limit to first 1000 rows for performance
          headers: parsedData.headers
        };

        newFiles.push(fileData);
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        setMessage(`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Optionally, clear message after a delay or let it persist until next message
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setIsUploading(false);
    
    if (newFiles.length > 0) {
      if (!message.startsWith('Error') && !message.startsWith('Warning')) { // Don't overwrite error/warning with success immediately
          setMessage(`Successfully uploaded ${newFiles.length} file(s)`);
      }
    } else if (!message.startsWith('Error') && !message.startsWith('Warning')) {
        setMessage('No new files were processed.');
    }

    setTimeout(() => {
        if(message.startsWith('Successfully') || message.startsWith('No new files')) setMessage('');
    }, 5000);


    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  };

  const readFileContent = (file: globalThis.File): Promise<string> => { // Use globalThis.File to avoid conflict
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const readFileAsArrayBuffer = (file: globalThis.File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        resolve(e.target.result);
      } else {
        reject(new Error('Failed to read file as ArrayBuffer: Result was not an ArrayBuffer.'));
      }
    };
    reader.onerror = (e) => {
      console.error("FileReader error:", reader.error);
      reject(new Error('Failed to read file using FileReader: ' + reader.error?.message));
    };
    reader.readAsArrayBuffer(file);
  });
};

  const parseXLSXFileWithSheetJS = (arrayBuffer: ArrayBuffer): { headers: string[], data: any[] } => {
  try {
    // Use XLSX.read() to parse the ArrayBuffer
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Get the first sheet name
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('XLSX file (SheetJS) contains no sheets.');
    }

    // Get the worksheet object
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert sheet to an array of arrays (header: 1 means the first array is headers)
    // defval: "" ensures empty cells are treated as empty strings
    const sheetDataAsArrayOfArrays: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    
    if (!sheetDataAsArrayOfArrays || sheetDataAsArrayOfArrays.length === 0) {
      return { headers: [], data: [] }; // Empty sheet
    }

    // The first inner array is the headers
    const headers: string[] = sheetDataAsArrayOfArrays[0].map(String);
    
    // The rest of the arrays are data rows
    const dataRows = sheetDataAsArrayOfArrays.slice(1);

    // Convert array data rows to objects
    const data: any[] = dataRows.map(rowArray => {
      const rowObject: any = {};
      headers.forEach((header, index) => {
        // Ensure rowArray has the element, otherwise default to empty string
        rowObject[header] = rowArray[index] !== undefined ? rowArray[index] : "";
      });
      return rowObject;
    });

    return { headers, data };

  } catch (error) {
    console.error("Error parsing XLSX file with SheetJS:", error);
    if (error instanceof Error) {
      throw new Error(`SheetJS XLSX parsing failed: ${error.message}`);
    }
    throw new Error("An unknown error occurred during SheetJS XLSX parsing.");
  }
};

  const parseCSVFile = (content: string): Promise<{ headers: string[], data: any[] }> => {
    return new Promise((resolve, reject) => {
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true, // Tries to convert strings to numbers/booleans
        complete: (results) => {
          if (results.errors.length > 0) {
            // Log all errors for debugging, but reject with the first one
            console.error('CSV parsing errors:', results.errors);
            reject(new Error(`CSV parsing error: ${results.errors[0].message} (Row: ${results.errors[0].row})`));
          } else {
            resolve({
              headers: results.meta.fields || [],
              data: results.data as any[]
            });
          }
        },
        error: (error: Error) => reject(new Error(`CSV parsing failed: ${error.message}`))
      });
    });
  };

  const handleFileSelect = (file: FileData) => {
    setSelectedFile(file);
  };

  const handleDeleteFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
    }
    setMessage('File deleted.');
    setTimeout(() => setMessage(''), 3000);
  };

  const filteredFiles = uploadedFiles.filter(file => 
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - File List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FileIcon className="w-5 h-5" /> 
              Upload Data
            </h1>
            <span className="text-sm text-gray-500">
              {uploadedFiles.length} file(s)
            </span>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Filter files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Upload Area */}
        <div className="p-4 border-b border-gray-200">
          <label className={`
            block w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${isUploading ? 'border-gray-300 bg-gray-50 animate-pulse' : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50'}
          `}>
            <div className="text-center">
              <Upload className="mx-auto w-8 h-8 text-blue-500 mb-2" />
              <p className="text-sm text-gray-600">
                {isUploading ? 'Processing files...' : 'Click to upload or drag files here'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Supports .csv, .las, and .xlsx files</p>
            </div>
            <input
              type="file"
              multiple
              accept=".csv, .las, .xlsx"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              aria-label="File uploader"
            />
          </label>
          
          {message && (
            <div className={`mt-2 p-2 border rounded text-sm ${
              message.startsWith('Error') ? 'bg-red-50 border-red-200 text-red-700' :
              message.startsWith('Warning') ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
              'bg-blue-50 border-blue-200 text-blue-700'
            }`} role="alert">
              {message}
            </div>
          )}
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase">
              <div className="col-span-6">Name</div>
              <div className="col-span-3">Modified</div>
              <div className="col-span-2">Size</div>
              <div className="col-span-1 text-right">Del</div>
            </div>
          </div>
          
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedFile?.id === file.id ? 'bg-blue-50 border-l-4 border-l-blue-500 font-medium' : 'border-l-4 border-l-transparent'
              }`}
              onClick={() => handleFileSelect(file)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && handleFileSelect(file)}
            >
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6">
                  <div className="flex items-center gap-2">
                    <FileIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 truncate" title={file.name}>
                      {file.name}
                    </span>
                  </div>
                </div>
                <div className="col-span-3 text-xs text-gray-500">
                  {formatDate(file.lastModified)}
                </div>
                <div className="col-span-2 text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </div>
                <div className="col-span-1 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent file selection when deleting
                      handleDeleteFile(file.id);
                    }}
                    className="p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700 focus:outline-none focus:ring-1 focus:ring-red-500"
                    aria-label={`Delete ${file.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {uploadedFiles.length > 0 && filteredFiles.length === 0 && (
             <div className="p-8 text-center text-gray-500">
                <Search className="mx-auto w-12 h-12 text-gray-300 mb-3" />
                <p>No files match your search.</p>
             </div>
          )}

          {uploadedFiles.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <FileIcon className="mx-auto w-12 h-12 text-gray-300 mb-3" />
              <p>No files uploaded yet</p>
              <p className="text-sm">Upload .csv or .las files to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - File Preview */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedFile ? (
          <>
            {/* Preview Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0"> {/* min-w-0 for truncation */}
                  <Eye className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <div className="min-w-0"> {/* min-w-0 for truncation */}
                    <h2 className="font-semibold text-gray-800 truncate" title={selectedFile.name}>{selectedFile.name}</h2>
                    <p className="text-sm text-gray-500">
                      Previewing {Math.min(selectedFile.content.length, 1000)} of {selectedFile.content.length} rows × {selectedFile.headers.length} columns
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 flex-shrink-0">
                    {formatFileSize(selectedFile.size)}
                  </span>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="flex-1 overflow-auto">
              {selectedFile.headers.length > 0 && selectedFile.content.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      {selectedFile.headers.map((header, index) => (
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
                    {selectedFile.content.map((row, rowIndex) => (
                      <tr key={rowIndex} className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`}>
                        {selectedFile.headers.map((header, colIndex) => (
                          <td
                            key={colIndex}
                            className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap max-w-xs truncate" // Added max-w-xs and truncate
                            title={String(row[header] === null || row[header] === undefined ? '' : row[header])}
                          >
                            {String(row[header] === null || row[header] === undefined ? '' : row[header])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <FileIcon className="mx-auto w-12 h-12 text-gray-300 mb-3" />
                  <p>No data to display for this file.</p>
                  {selectedFile.headers.length === 0 && <p className="text-sm">Could not determine headers.</p>}
                  {selectedFile.content.length === 0 && <p className="text-sm">The file appears to have no content rows.</p>}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500 p-5">
              <Eye className="mx-auto w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a file to preview</h3>
              <p>Choose a file from the list on the left to view its contents here.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}