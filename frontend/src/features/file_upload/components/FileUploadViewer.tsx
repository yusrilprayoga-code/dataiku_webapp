// src/features/file_upload/components/FileUploadViewer.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, ChangeEvent } from 'react';
import JSZip from 'jszip';

import { ParsedSubFile, FileData, ProcessedFileDataForDisplay, StagedStructure } from '../types';
import { readFileContent, readFileAsArrayBuffer } from '../utils/fileUtils';
import { parseLASFile, parseCSVFile, parseXLSXFileWithSheetJS } from '../utils/fileParser';
import FileList from './FileList';
import FilePreview from './FilePreview';
import { useRouter } from 'next/navigation'; // For navigation
import { useAppDataStore } from '@/stores/useAppDataStore'; // Correct path to your store
import { DownloadCloud, Plus, UploadCloud } from 'lucide-react';

export default function FileUploadViewer() {
  const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [selectedSubFile, setSelectedSubFile] = useState<ParsedSubFile | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // --- FIX: Get the action from the store and the router hook ---
  const router = useRouter();
  const setStagedStructure = useAppDataStore((state) => state.setStagedStructure);

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
            rawContentString: subFile.rawContentString,
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
            rawContentString: subFile.rawContentString,
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
      setMessage("No relevant LAS or CSV files found to proceed.");
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const newStructureForNextPage: StagedStructure = {
      userDefinedStructureName: structureNameInput.trim(),
      files: filesForNextPage,
    };

    setStagedStructure(newStructureForNextPage);

    setMessage('');
    router.push('/data-input');
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
      const fileId = `${structureName}_${fileNameInStructure}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      if (fileNameInStructure.toLowerCase().endsWith('.las')) {
        const promise = zipEntry.async('string').then(rawLasContent => {
          const parsed = parseLASFile(rawLasContent);
          currentStructure.lasFiles.push({
            id: fileId, name: fileNameInStructure, type: 'las',
            rawContentString: rawLasContent,
            content: parsed.data, headers: parsed.headers,
          });
        }).catch(err => console.error(`Failed to process LAS ${relativePath}:`, err));
        fileProcessingPromises.push(promise);
      } else if (fileNameInStructure.toLowerCase().endsWith('.csv')) {
        const promise = zipEntry.async('string').then(async rawCsvContent => {
          const parsed = await parseCSVFile(rawCsvContent);
          currentStructure.csvFiles.push({
            id: fileId, name: fileNameInStructure, type: 'csv',
            rawContentString: rawCsvContent,
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
          id: `${originalZipFile.name}_${structureNameFromMap}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: structureNameFromMap === "_ROOT_FILES_IN_ZIP_" ? `${originalZipFile.name} (Root Files)` : structureNameFromMap,
          originalZipName: originalZipFile.name,
          size: originalZipFile.size,
          originalFileType: originalZipFile.type,
          lastModified: originalZipFile.lastModified,
          isStructureFromZip: true,
          lasFiles: files.lasFiles.sort((a, b) => a.name.localeCompare(b.name)),
          csvFiles: files.csvFiles.sort((a, b) => a.name.localeCompare(b.name)),
          content: [], headers: [],
        });
      }
    }
    resultStructures.sort((a, b) => a.name.localeCompare(b.name));
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
          const zipFileData = structuresFromZip.map(s => ({ ...s, rawFileContent: arrayBufferContent }));
          allNewFileDataItems.push(...zipFileData);

        } else {
          let parsedData: { headers: string[], data: any[] };
          let rawFileContentForSingleFile: string | ArrayBuffer;

          if (file.name.toLowerCase().endsWith('.csv')) {
            const fileContentString = await readFileContent(file);
            rawFileContentForSingleFile = fileContentString;
            parsedData = await parseCSVFile(fileContentString);
          } else if (file.name.toLowerCase().endsWith('.las')) {
            const fileContentString = await readFileContent(file);
            rawFileContentForSingleFile = fileContentString;
            parsedData = parseLASFile(fileContentString);
          } else if (file.name.toLowerCase().endsWith('.xlsx')) {
            const arrayBufferContent = await readFileAsArrayBuffer(file);
            rawFileContentForSingleFile = arrayBufferContent;
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
      if (message.startsWith('Successfully') || message.startsWith('No new files') || message.startsWith('Warning')) setMessage('');
    }, 5000);
    if (event.target) event.target.value = '';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <FileList
        uploadedFiles={uploadedFiles}
        filteredFiles={uploadedFiles.filter(file => file.name.toLowerCase().includes(searchTerm.toLowerCase()))}
        selectedFile={selectedFile}
        isUploading={isUploading}
        message={message}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onFileUpload={handleFileUpload}
        onFileSelect={setSelectedFile}
        onDeleteFile={(id) => {
          setUploadedFiles(prev => prev.filter(f => f.id !== id));
          if (selectedFile?.id === id) setSelectedFile(null);
        }}
      />
      <FilePreview
        selectedFile={selectedFile}
        selectedSubFile={selectedSubFile}
        onSelectSubFile={setSelectedSubFile}
      />
      {uploadedFiles.length > 0 && (
        <div className="fixed bottom-8 right-8 z-50">
          <button
            onClick={handleProceedToNextPage}
            title={`Process ${uploadedFiles.length} item(s) and create structure`}
            className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-xl flex items-center justify-center transition-all duration-150 ease-in-out transform hover:scale-110 focus:outline-none"
            aria-label="Proceed with uploaded files"
          >
            <Plus size={28} />
          </button>
        </div>
      )}
    </div>
  );
}
