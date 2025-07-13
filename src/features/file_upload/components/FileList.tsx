// app/your-route/components/FileList.tsx
import React, { ChangeEvent } from 'react';
import { FileData } from '../types'; // Adjust path
import FileItem from './FileItem';
import { Upload, File as FileIcon, Search } from 'lucide-react'; // Import FolderIcon if not already

interface FileListProps {
  uploadedFiles: FileData[];
  filteredFiles: FileData[];
  selectedFile: FileData | null;
  isUploading: boolean;
  message: string;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onFileSelect: (file: FileData) => void;
  onDeleteFile: (fileId: string) => void;
}

const FileList: React.FC<FileListProps> = ({
  uploadedFiles,
  filteredFiles,
  selectedFile,
  isUploading,
  message,
  searchTerm,
  onSearchTermChange,
  onFileUpload,
  onFileSelect,
  onDeleteFile,
}) => {
  return (
    <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col h-full"> {/* Added h-full */}
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FileIcon className="w-5 h-5" /> Upload Data
          </h1>
          <span className="text-sm text-gray-500">{uploadedFiles.length} item(s)</span> {/* Changed file(s) to item(s) */}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Filter items..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Upload Area */}
      <div className="p-4 border-b border-gray-200">
        <label
          className={`block w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isUploading ? 'border-gray-300 bg-gray-50 animate-pulse' : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
        >
          <div className="text-center">
            <Upload className="mx-auto w-8 h-8 text-blue-500 mb-2" />
            <p className="text-sm text-gray-600">
              {isUploading ? 'Processing files...' : 'Click to upload or drag files here'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supports .csv, .las, .xlsx, and .zip (with internal folders for structures)
            </p>
          </div>
          <input
            type="file"
            multiple
            accept=".csv,.las,.xlsx,.zip"
            onChange={onFileUpload}
            disabled={isUploading}
            className="hidden"
            aria-label="File uploader"
          />
        </label>
        {message && (
          <div
            className={`mt-2 p-2 border rounded text-sm ${message.startsWith('Error') ? 'bg-red-50 border-red-200 text-red-700' :
              message.startsWith('Warning') ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                'bg-blue-50 border-blue-200 text-blue-700'
              }`}
            role="alert"
          >
            {message}
          </div>
        )}
      </div>

      {/* File List Area */}
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
          <FileItem
            key={file.id}
            file={file}
            isSelected={selectedFile?.id === file.id}
            onSelect={onFileSelect}
            onDelete={onDeleteFile}
          />
        ))}
        {uploadedFiles.length > 0 && filteredFiles.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Search className="mx-auto w-12 h-12 text-gray-300 mb-3" />
            <p>No items match your search.</p>
          </div>
        )}
        {uploadedFiles.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            {/* Use FolderIcon or FileIcon appropriately based on context if desired */}
            <FileIcon className="mx-auto w-12 h-12 text-gray-300 mb-3" />
            <p>No items uploaded</p>
            <p className="text-sm">Upload files or ZIP archives with structures to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileList;