// src/features/file_upload/components/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

"use client";

import React, { useState, ChangeEvent, useEffect } from 'react'; // Import useEffect
import JSZip from 'jszip';

import { ParsedSubFile, FileData, ProcessedFileDataForDisplay, StagedStructure } from './types';
import { readFileContent, readFileAsArrayBuffer } from './utils/fileUtils';
import { parseLASFile, parseCSVFile, parseXLSXFileWithSheetJS } from './utils/fileParser';
import FileList from './components/FileList';
import FilePreview from './components/FilePreview';
import { useRouter } from 'next/navigation';
import { useAppDataStore } from '@/stores/useAppDataStore';
import { DownloadCloud, Plus, UploadCloud } from 'lucide-react';
import { addMultipleFiles, getAllFiles, deleteFile as dbDeleteFile, clearAllFiles, addWellLogs, getAllWellLogs } from '../../lib/db';

export default function FileUploadViewer() {
  const [filesForDisplay, setFilesForDisplay] = useState<FileData[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [selectedSubFile, setSelectedSubFile] = useState<ParsedSubFile | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isReadyToProceed, setIsReadyToProceed] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const loadFilesFromDb = async () => {
      setMessage('Loading saved files...');
      try {
        const savedFiles = await getAllFiles();
        setFilesForDisplay(savedFiles);
      } catch (error) {
        console.error("Failed to load files from database:", error);
        setMessage("Error: Could not load saved files.");
      } finally {
        setMessage('');
        setIsInitialized(true);
      }
    };
    loadFilesFromDb();
  }, []);

  const handleProceedToNextPage = () => {
    // This function can now be much simpler. We don't need to check the file count,
    // because the button to call this will be disabled until it's ready.
    const structureNameInput = window.prompt("Please enter a name for this data structure/folder:");
    if (!structureNameInput || !structureNameInput.trim()) {
      setMessage("Structure name is required.");
      return;
    }
    const name = structureNameInput.trim();
    router.push(`/data-input?structureName=${encodeURIComponent(name)}`);
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
    await clearAllFiles();
    setIsReadyToProceed(false);
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setMessage('Processing files...');

    const allNewFileDataItems: FileData[] = [];

    for (const file of Array.from(files)) {
      try {
        if (file.name.toLowerCase().endsWith('.zip')) {
          // Your ZIP processing logic is already correct.
          // It creates structures with the right structurePath.
          const arrayBufferContent = await readFileAsArrayBuffer(file);
          const structuresFromZip = await processZipFile(file, arrayBufferContent);
          if (structuresFromZip.length > 0) {
            allNewFileDataItems.push(...structuresFromZip);
          }
        } else {
          // --- THIS LOGIC FOR SINGLE FILES IS NEW AND CORRECTED ---
          let parsedData: { headers: string[], data: any[] };
          const fileContentString = await readFileContent(file);
          const fileBaseName = file.name.replace(/\.[^/.]+$/, ""); // "my_well.las" -> "my_well"

          let type: 'las-as-csv' | 'csv' | null = null;

          if (file.name.toLowerCase().endsWith('.las')) {
            parsedData = parseLASFile(fileContentString);
            type = 'las-as-csv';
          } else if (file.name.toLowerCase().endsWith('.csv')) {
            parsedData = await parseCSVFile(fileContentString);
            type = 'csv';
          } else {
            // Skip unsupported single file types like .xlsx for this logic
            continue;
          }

          // Create the display item for the upload list
          allNewFileDataItems.push({
            id: file.name, // Use name as ID for single files
            name: file.name,
            size: file.size,
            originalFileType: file.type,
            lastModified: file.lastModified,
            isStructureFromZip: false,
            content: parsedData.data.slice(0, 1000),
            headers: parsedData.headers,
            rawFileContent: fileContentString,
          });

          const allWellLogs = await getAllWellLogs();

          // Create the individual log record for the 'well-logs' database
          allWellLogs.push({
            id: file.name,
            name: file.name,
            originalName: file.name,
            // The crucial change: the "well name" is the filename without extension.
            structurePath: fileBaseName,
            type: type,
            content: parsedData.data,
            headers: parsedData.headers,
            rawContentString: fileContentString,
          });
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        setMessage(`Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    // 1. Create a flattened list of individual logs from the processed data
    const allWellLogs: ProcessedFileDataForDisplay[] = [];
    allNewFileDataItems.forEach(fileData => {
      if (fileData.isStructureFromZip) {
        const extractLogs = (subFiles: any[] | undefined, type: 'las-as-csv' | 'csv') => {
          subFiles?.forEach(subFile => {
            allWellLogs.push({ id: subFile.id, name: `${fileData.name}/${subFile.name}`, originalName: subFile.name, structurePath: fileData.name, type, content: subFile.content, headers: subFile.headers, rawContentString: subFile.rawContentString });
          });
        };
        extractLogs(fileData.lasFiles, 'las-as-csv');
        extractLogs(fileData.csvFiles, 'csv');
      }
    });

    if (allNewFileDataItems.length > 0) {
      try {
        setMessage('Saving data to browser database...');
        await addMultipleFiles(allNewFileDataItems);
        await addWellLogs(allWellLogs);

        // --- THIS IS THE CRUCIAL FIX ---
        // Only after ALL database operations have successfully completed...
        console.log("SUCCESS: Data has been saved to IndexedDB.");
        setMessage(`Successfully processed and saved ${allWellLogs.length} log(s). You may now proceed.`);
        setIsReadyToProceed(true); // ...do we allow the user to proceed.

        const updatedFiles = await getAllFiles();
        setFilesForDisplay(updatedFiles);

      } catch (error) {
        console.error("Error occurred when trying to save everything to database", error);
        setMessage("Error: Could not save data to the database.");
      }
    } else {
      setMessage('No new files or structures were processed.');
    }

    setIsUploading(false);
    setTimeout(() => { if (!message.startsWith('Error')) setMessage(''); }, 5000);
    if (event.target) event.target.value = '';
  };


  const handleDeleteFile = async (id: string) => {
    try {
      await dbDeleteFile(id);
      if (selectedFile?.id === id) {
        setSelectedFile(null); // Clear selection if the deleted file was selected
      }
      const updatedFiles = await getAllFiles();
      setFilesForDisplay(updatedFiles);
    } catch (error) {
      console.error("Failed to delete file from database:", error);
      setMessage("Error: Could not delete the file.");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <FileList
        // Pass the display state and the new delete handler
        uploadedFiles={filesForDisplay}
        filteredFiles={filesForDisplay.filter(file => file.name.toLowerCase().includes(searchTerm.toLowerCase()))}
        selectedFile={selectedFile}
        isUploading={isUploading || !isInitialized} // Show loading state on initial load too
        message={message}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onFileUpload={handleFileUpload}
        onFileSelect={setSelectedFile}
        onDeleteFile={handleDeleteFile} // Use the new handler
      />
      <FilePreview
        selectedFile={selectedFile}
        selectedSubFile={selectedSubFile}
        onSelectSubFile={setSelectedSubFile}
      />
      {filesForDisplay.length > 0 && ( // Use filesForDisplay
        <div className="fixed bottom-8 right-8 z-50">
          <button
            onClick={handleProceedToNextPage}
            title={isReadyToProceed ? "Proceed with saved data" : "Please upload and process files first"}
            // Disable the button until the data is confirmed to be saved
            disabled={!isReadyToProceed}
            className={`p-4 rounded-full shadow-xl flex items-center justify-center transition-all duration-150 ease-in-out
            ${isReadyToProceed
                ? 'bg-green-500 hover:bg-green-600 transform hover:scale-110'
                : 'bg-gray-400 cursor-not-allowed'
              }
          `}
            aria-label="Proceed with uploaded files"
          >
            <Plus size={28} className="text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
