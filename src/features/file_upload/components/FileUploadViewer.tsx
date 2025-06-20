// app/your-route/components/FileUploadViewer.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, ChangeEvent } from 'react';
import JSZip from 'jszip';
import Papa from 'papaparse';
import { ParsedSubFile, FileData} from '../types'; // Adjust path
import {ProcessedFileDataForDisplay, StagedStructure} from '../../../stores/appDataStore';
import { readFileContent, readFileAsArrayBuffer } from '../utils/fileUtils'; // Adjust path
import { parseLASFile, parseCSVFile, parseXLSXFileWithSheetJS } from '../utils/fileParser'; // Adjust path
import FileList from './FileList';
import FilePreview from './FilePreview';
import { useRouter } from 'next/navigation'; // For navigation
import { useAppDataStore } from '../../../stores/appDataStore'; // Adjust path to your store
import { DownloadCloud, Plus, UploadCloud } from 'lucide-react';

export default function FileUploadViewer() {
  const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [selectedSubFile, setSelectedSubFile] = useState<ParsedSubFile | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

const router = useRouter();
const { setStagedStructure } = useAppDataStore();

const handleProceedToNextPage = () => {
  if (uploadedFiles.length === 0) {
    setMessage("Please upload some files first.");
    setTimeout(() => setMessage(''), 3000);
    return;
  }

  const structureNameInput = window.prompt("Please enter a name for this data structure/folder:");
  if (!structureNameInput || structureNameInput.trim() === "") {
    setMessage("Structure name is required to proceed.");
    setTimeout(() => setMessage(''), 3000);
    return;
  }

const filesForNextPage: ProcessedFileDataForDisplay[] = [];
  uploadedFiles.forEach(fileData => {
    // Case 1: Files from a processed ZIP structure
    if (fileData.isStructureFromZip) {
      fileData.lasFiles?.forEach(subFile => {
        filesForNextPage.push({
          id: subFile.id,
          name: `${fileData.name}/${subFile.name}`,
          originalName: subFile.name,
          structurePath: fileData.name,
          type: 'las-as-csv',
          content: subFile.content,
          headers: subFile.headers,
          rawContentString: subFile.rawContentString, // <-- FIX: Copy the raw content over
        });
      });
      fileData.csvFiles?.forEach(subFile => {
        filesForNextPage.push({
          id: subFile.id,
          name: `${fileData.name}/${subFile.name}`,
          originalName: subFile.name,
          structurePath: fileData.name,
          type: 'csv',
          content: subFile.content,
          headers: subFile.headers,
          rawContentString: subFile.rawContentString, // <-- FIX: Copy the raw content over
        });
      });
    } 
    // Case 2: Single uploaded LAS or CSV files
    else if (fileData.rawFileContent && typeof fileData.rawFileContent === 'string') {
      let fileType: 'las-as-csv' | 'csv' | null = null;
      if (fileData.name.toLowerCase().endsWith('.las')) {
        fileType = 'las-as-csv';
      } else if (fileData.name.toLowerCase().endsWith('.csv')) {
        fileType = 'csv';
      }

      if (fileType) {
        filesForNextPage.push({
           id: fileData.id,
           name: fileData.name,
           type: fileType,
           content: fileData.content || [],
           headers: fileData.headers || [],
           rawContentString: fileData.rawFileContent,
        });
      }
    }
  });


  if (filesForNextPage.length === 0) {
    setMessage("No relevant LAS or CSV files found in the current uploads to proceed.");
    setTimeout(() => setMessage(''), 3000);
    return;
  }

  const newStructureForNextPage: StagedStructure = {
    userDefinedStructureName: structureNameInput.trim(),
    files: filesForNextPage,
  };

  try {
    // Convert the complex object to a JSON string and save it
    sessionStorage.setItem('stagedStructure', JSON.stringify(newStructureForNextPage));
  } catch (error) {
    console.error("Could not save to sessionStorage:", error);
    setMessage("Error: Could not prepare data for the next step.");
    return;
  }

  setMessage('');
  router.push('/data-input-utama');
};

  const processZipFile = async (
    originalZipFile: globalThis.File,
    arrayBuffer: ArrayBuffer
  ): Promise<FileData[]> => {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const structuresMap: Map<string, { lasFiles: ParsedSubFile[], csvFiles: ParsedSubFile[] }> = new Map();
    const fileProcessingPromises: Promise<void>[] = [];

    zip.forEach((relativePath, zipEntry) => {
      if (zipEntry.dir) return;
      const pathParts = relativePath.split('/');
      const structureName = pathParts.length > 1 ? pathParts[0] : "_ROOT_FILES_IN_ZIP_";
      const fileNameInStructure = pathParts.length > 1 ? pathParts.slice(1).join('/') : relativePath;

      if (!structuresMap.has(structureName)) {
        structuresMap.set(structureName, { lasFiles: [], csvFiles: [] });
      }
      const currentStructure = structuresMap.get(structureName)!;
      const fileId = `${structureName}_${fileNameInStructure}_${Date.now()}_${Math.random().toString(36).substring(2,7)}`;

      if (fileNameInStructure.toLowerCase().endsWith('.las')) {
        const promise = zipEntry.async('string').then(rawLasContent => { // <-- Get raw string
          const parsed = parseLASFile(rawLasContent);
          currentStructure.lasFiles.push({
            id: fileId, name: fileNameInStructure, type: 'las',
            rawContentString: rawLasContent, // <-- Store raw string
            content: parsed.data, headers: parsed.headers,
          });
        }).catch(err => console.error(`Failed to process LAS ${relativePath}:`, err));
        fileProcessingPromises.push(promise);
      } else if (fileNameInStructure.toLowerCase().endsWith('.csv')) {
        const promise = zipEntry.async('string').then(async rawCsvContent => { // <-- Get raw string
          const parsed = await parseCSVFile(rawCsvContent); // parseCSVFile takes string
          currentStructure.csvFiles.push({
            id: fileId, name: fileNameInStructure, type: 'csv',
            rawContentString: rawCsvContent, // <-- Store raw string
            content: parsed.data, headers: parsed.headers,
          });
        }).catch(err => console.error(`Failed to process CSV ${relativePath}:`, err));
        fileProcessingPromises.push(promise);
      }
    });

    await Promise.all(fileProcessingPromises);

    const resultStructures: FileData[] = [];
    for (const [structureNameFromMap, files] of structuresMap.entries()) {
      if (files.lasFiles.length > 0 || files.csvFiles.length > 0) {
        resultStructures.push({
          id: `${originalZipFile.name}_${structureNameFromMap}_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
          name: structureNameFromMap === "_ROOT_FILES_IN_ZIP_" ? `${originalZipFile.name} (Root Files)` : structureNameFromMap,
          originalZipName: originalZipFile.name,
          size: originalZipFile.size,
          originalFileType: originalZipFile.type,
          lastModified: originalZipFile.lastModified,
          isStructureFromZip: true,
          lasFiles: files.lasFiles.sort((a,b) => a.name.localeCompare(b.name)),
          csvFiles: files.csvFiles.sort((a,b) => a.name.localeCompare(b.name)),
          content: [], headers: [],
        });
      }
    }
    resultStructures.sort((a,b) => a.name.localeCompare(b.name));
    return resultStructures;
  };


  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setMessage('Processing files...');
    const allNewFileDataItems: FileData[] = [];

    for (const file of Array.from(files)) {
      try {
        const commonFileProps = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
            name: file.name,
            size: file.size,
            originalFileType: file.type || 'application/octet-stream',
            lastModified: file.lastModified,
        };

        if (file.name.toLowerCase().endsWith('.zip')) {
          const arrayBufferContent = await readFileAsArrayBuffer(file);
          const structuresFromZip = await processZipFile(file, arrayBufferContent);
          if (structuresFromZip.length === 0) {
            setMessage(`Warning: ZIP file ${file.name} did not yield any structures with LAS/CSV files.`);
          }
          // Add rawFileContent for the ZIP itself if needed, though processZipFile now handles sub-files' raw content
          const zipFileData = structuresFromZip.map(s => ({...s, rawFileContent: arrayBufferContent}));
          allNewFileDataItems.push(...zipFileData);

        } else {
          let parsedData: { headers: string[], data: any[] };
          let rawFileContentForSingleFile: string | ArrayBuffer; // To store raw content

          if (file.name.toLowerCase().endsWith('.csv')) {
            const fileContentString = await readFileContent(file);
            rawFileContentForSingleFile = fileContentString; // Store raw string
            parsedData = await parseCSVFile(fileContentString);
          } else if (file.name.toLowerCase().endsWith('.las')) {
            const fileContentString = await readFileContent(file);
            rawFileContentForSingleFile = fileContentString; // Store raw string
            parsedData = parseLASFile(fileContentString);
          } else if (file.name.toLowerCase().endsWith('.xlsx')) {
            const arrayBufferContent = await readFileAsArrayBuffer(file);
            rawFileContentForSingleFile = arrayBufferContent; // Store ArrayBuffer
            parsedData = parseXLSXFileWithSheetJS(arrayBufferContent);
          } else {
            throw new Error('Unsupported individual file type.');
          }

          if (parsedData.data.length === 0 && parsedData.headers.length === 0) {
            setMessage(`Warning: File ${file.name} seems empty or unparsable.`);
          }
          allNewFileDataItems.push({
            ...commonFileProps,
            isStructureFromZip: false,
            content: parsedData.data.slice(0, 1000),
            headers: parsedData.headers,
            rawFileContent: rawFileContentForSingleFile, 
          });
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        setMessage(`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    setUploadedFiles(prev => [...prev, ...allNewFileDataItems]);
    setIsUploading(false);
    if (allNewFileDataItems.length > 0 && !message.startsWith('Error') && !message.startsWith('Warning')) {
      setMessage(`Successfully processed ${allNewFileDataItems.length} item(s)`);
    } else if (allNewFileDataItems.length === 0 && !message.startsWith('Error') && !message.startsWith('Warning')) {
      setMessage('No new files or structures were processed.');
    }
    setTimeout(() => {
      if(message.startsWith('Successfully') || message.startsWith('No new files') || message.startsWith('Warning')) setMessage('');
    }, 5000);
    if (event.target) event.target.value = '';
  };

  const handleFileSelect = (file: FileData) => {
    setSelectedFile(file);
    setSelectedSubFile(null); // Reset sub-file selection
  };

   const handleExportLasInZipsAsCsv = () => {
    let filesDownloaded = 0;
    uploadedFiles.forEach(fileData => {
      if (fileData.isStructureFromZip && fileData.lasFiles) {
        fileData.lasFiles.forEach(lasSubFile => {
          if (lasSubFile.content && lasSubFile.headers) {
            try {
              const csvString = Papa.unparse({
                fields: lasSubFile.headers,
                data: lasSubFile.content,
              });
              const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              const url = URL.createObjectURL(blob);
              link.setAttribute('href', url);
              // Sanitize filename for download
              const safeSubFileName = lasSubFile.name.replace(/[^a-z0-9_.-]/gi, '_');
              const downloadFileName = `${fileData.name}_${safeSubFileName.replace(/\.las$/i, '')}.csv`;
              link.setAttribute('download', downloadFileName);
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              filesDownloaded++;
            } catch (e) {
              console.error("Error unparsing or downloading CSV for", lasSubFile.name, e);
              setMessage(`Error creating CSV for ${lasSubFile.name}`);
            }
          }
        });
      }
    });
    if (filesDownloaded > 0) {
      setMessage(`Successfully exported ${filesDownloaded} LAS file(s) as CSV.`);
    } else {
      setMessage('No LAS files found in ZIP structures to export as CSV.');
    }
    setTimeout(() => setMessage(''), 5000);
  };

  const handlePrepareForDataikuUpload = async () => {
    console.log("Preparing files for Dataiku Upload (Conceptual):");
    const filesToUpload: { name: string, type: 'las' | 'csv' | 'xlsx' | 'zip' | 'other', content: string | ArrayBuffer }[] = [];

    for (const fileData of uploadedFiles) {
      if (fileData.isStructureFromZip) {
        // For structures, we want to upload the individual LAS and CSV files found within.
        // The Python script likely expects these raw files in a folder.
        fileData.lasFiles?.forEach(subFile => {
          filesToUpload.push({
            name: `${fileData.name}/${subFile.name}`, // Suggests a path for organization
            type: 'las',
            content: subFile.rawContentString // Use the stored raw string
          });
        });
        fileData.csvFiles?.forEach(subFile => {
          filesToUpload.push({
            name: `${fileData.name}/${subFile.name}`,
            type: 'csv',
            content: subFile.rawContentString // Use the stored raw string
          });
        });
      } else if (fileData.rawFileContent) {
        // For single uploaded files
        let fileType: 'las' | 'csv' | 'xlsx' | 'other' = 'other';
        if (fileData.name.toLowerCase().endsWith('.las')) fileType = 'las';
        else if (fileData.name.toLowerCase().endsWith('.csv')) fileType = 'csv';
        else if (fileData.name.toLowerCase().endsWith('.xlsx')) fileType = 'xlsx';
        
        filesToUpload.push({
          name: fileData.name,
          type: fileType,
          content: fileData.rawFileContent
        });
      }
    }

    if (filesToUpload.length === 0) {
      console.log("No files prepared for upload.");
      setMessage("No files available or prepared for Dataiku upload.");
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    console.log("Files that would be uploaded:", filesToUpload.map(f => ({ name: f.name, type: f.type, size: typeof f.content === 'string' ? f.content.length : f.content.byteLength })) );
    setMessage(`Prepared ${filesToUpload.length} file(s) for Dataiku upload. Check console. Backend API needed.`);
    setTimeout(() => setMessage(''), 7000);

    // In a real scenario, you would loop through filesToUpload and send them to your backend:
    // for (const fileToUpload of filesToUpload) {
    //   const formData = new FormData();
    //   const blobContent = typeof fileToUpload.content === 'string' ?
    //     new Blob([fileToUpload.content], { type: 'text/plain' }) : // Adjust MIME type as needed
    //     new Blob([fileToUpload.content]); // For ArrayBuffer
    //
    //   formData.append('file', blobContent, fileToUpload.name);
    //   formData.append('targetPath', fileToUpload.name); // Or derive path as needed by backend
    //
    //   try {
    //     const response = await fetch('/api/dataiku/upload-to-folder', { // Your backend endpoint
    //       method: 'POST',
    //       body: formData,
    //     });
    //     if (!response.ok) {
    //       throw new Error(`Failed to upload ${fileToUpload.name}: ${response.statusText}`);
    //     }
    //     console.log(`Successfully uploaded ${fileToUpload.name}`);
    //   } catch (error) {
    //     console.error(`Error uploading ${fileToUpload.name}:`, error);
    //     setMessage(`Error uploading ${fileToUpload.name}`);
    //     // Potentially stop or collect all errors
    //   }
    // }
  };

  const handleDeleteFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
      setSelectedSubFile(null);
    }
    setMessage('Item deleted.');
    setTimeout(() => setMessage(''), 3000);
  };

  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  const filteredFiles = uploadedFiles.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <FileList
        uploadedFiles={uploadedFiles}
        filteredFiles={filteredFiles}
        selectedFile={selectedFile}
        isUploading={isUploading}
        message={message}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onFileUpload={handleFileUpload}
        onFileSelect={handleFileSelect}
        onDeleteFile={handleDeleteFile}
      />
      <FilePreview
        selectedFile={selectedFile}
        selectedSubFile={selectedSubFile}
        onSelectSubFile={setSelectedSubFile}
      />

      {/* Floating Action Button Area */}
      <div className="fixed bottom-8 right-8 z-50">
        {isFabMenuOpen && (
          <div className="flex flex-col items-end mb-2 space-y-2">
            <button
              onClick={() => {
                handleExportLasInZipsAsCsv();
                setIsFabMenuOpen(false);
              }}
              title="Export LAS in ZIPs as CSV"
              className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg flex items-center justify-center transition-all duration-150 ease-in-out transform hover:scale-110"
            >
              <DownloadCloud size={24} />
               <span className="ml-2 text-sm sr-only">Export LAS as CSV</span> {/* sr-only for accessibility, shown on hover/focus with title */}
            </button>
            <button
              onClick={() => {
                handlePrepareForDataikuUpload();
                setIsFabMenuOpen(false);
              }}
              title="Prepare for Dataiku Upload"
              className="bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-full shadow-lg flex items-center justify-center transition-all duration-150 ease-in-out transform hover:scale-110"
            >
              <UploadCloud size={24} />
              <span className="ml-2 text-sm sr-only">Prepare Dataiku Upload</span>
            </button>
          </div>
        )}
          {uploadedFiles.length > 0 && ( // Optionally show FAB only when files are present
    <div className="fixed bottom-8 right-8 z-50">
      <button
        onClick={handleProceedToNextPage}
        title={`Process ${uploadedFiles.length} item(s) and create structure`}
        className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-xl flex items-center justify-center transition-all duration-150 ease-in-out transform hover:scale-110 focus:outline-none"
        aria-label="Proceed with uploaded files"
      >
        <Plus size={28} /> {/* Or a more descriptive icon like ArrowRight, Check, etc. */}
      </button>
    </div>
  )}
</div> /
    </div>
  );
}