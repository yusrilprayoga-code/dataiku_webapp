// src/features/file_upload/page.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import React, { useState, ChangeEvent, useEffect } from 'react';
import JSZip from 'jszip';
import { useRouter } from 'next/navigation';

// Impor store dan tipe global
import { useAppDataStore } from '@/stores/useAppDataStore';
import { ProcessedFileDataForDisplay } from '@/types';

// --- PERUBAHAN 1: Impor tipe dari file lokal yang sudah disentralisasi ---
import { FileData, ParsedSubFile } from './types';

// Impor komponen UI
import FileList from './components/FileList';
import FilePreview from './components/FilePreview';
import { Plus } from 'lucide-react';

// Impor utilitas file lokal
import { readFileContent, readFileAsArrayBuffer } from './utils/fileUtils';
import { parseLASFile, parseCSVFile } from './utils/fileParser';


export default function FileUploadViewer() {
  const router = useRouter();
  const { setStagedStructure, clearAllData } = useAppDataStore();

  const [filesForDisplay, setFilesForDisplay] = useState<FileData[]>([]);
  const [processedFilesForZustand, setProcessedFilesForZustand] = useState<ProcessedFileDataForDisplay[]>([]);
  
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [selectedSubFile, setSelectedSubFile] = useState<ParsedSubFile | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isReadyToProceed, setIsReadyToProceed] = useState<boolean>(false);

  useEffect(() => {
    clearAllData();
  }, [clearAllData]);

  const handleProceedToNextPage = () => {
    const structureNameInput = window.prompt("Please enter a name for this data structure/folder:", "BEL");
    if (!structureNameInput || !structureNameInput.trim()) {
      setMessage("Warning: Structure name is required.");
      return;
    }
    const name = structureNameInput.trim();

    setStagedStructure({
      userDefinedStructureName: name,
      files: processedFilesForZustand,
    });
    
    router.push(`/data-input?structureName=${encodeURIComponent(name)}`);
  };
  
  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    // ... (Logika handleFileUpload Anda dari jawaban sebelumnya tetap sama)
    setFilesForDisplay([]);
    setProcessedFilesForZustand([]);
    setIsReadyToProceed(false);
    setSelectedFile(null);
    setMessage('');

    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setMessage('Processing files, please wait...');

    const displayItems: FileData[] = []; 
    const allProcessedFiles: ProcessedFileDataForDisplay[] = [];

    for (const file of Array.from(files)) {
      try {
        if (file.name.toLowerCase().endsWith('.zip')) {
          const arrayBuffer = await readFileAsArrayBuffer(file);
          const zip = await JSZip.loadAsync(arrayBuffer);
          
          const zipDisplayData: FileData = {
            id: file.name, name: file.name, size: file.size,
            isStructureFromZip: true, lastModified: file.lastModified,
            originalFileType: file.type, content: [], headers: [], lasFiles: [], csvFiles: []
          };

          for (const relativePath in zip.files) {
            const zipEntry = zip.files[relativePath];
            if (zipEntry.dir) continue;

            const rawContentString = await zipEntry.async('string');
            const parsed = parseLASFile(rawContentString);
            
            allProcessedFiles.push({
              id: `${file.name}-${zipEntry.name}`, name: zipEntry.name, originalName: zipEntry.name,
              type: 'las-as-csv', fileCategory: 'well-log',
              content: parsed.data, headers: parsed.headers, rawContentString: rawContentString,
            });
          }
          displayItems.push(zipDisplayData);

        } else {
          const fileContentString = await readFileContent(file);
          let parsedData: { headers: string[], data: any[] };
          let fileCategory: 'well-log' | 'marker' | 'zone';
          let type: 'las-as-csv' | 'csv';

          if (file.name.toLowerCase().endsWith('.las')) {
            parsedData = parseLASFile(fileContentString);
            type = 'las-as-csv';
            fileCategory = 'well-log';
          } else if (file.name.toLowerCase().includes('marker')) {
            parsedData = await parseCSVFile(fileContentString);
            type = 'csv';
            fileCategory = 'marker';
          } else if (file.name.toLowerCase().includes('zone')) {
            parsedData = await parseCSVFile(fileContentString);
            type = 'csv';
            fileCategory = 'zone';
          } else {
            continue;
          }

          displayItems.push({
            id: file.name, name: file.name, size: file.size,
            originalFileType: file.type, lastModified: file.lastModified,
            isStructureFromZip: false,
            content: parsedData.data, headers: parsedData.headers, rawFileContent: fileContentString,
          });
          
          allProcessedFiles.push({
            id: file.name, name: file.name, originalName: file.name,
            type: type, fileCategory: fileCategory, 
            content: parsedData.data, headers: parsedData.headers, rawContentString: fileContentString,
          });
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        setMessage(`Error: Could not process ${file.name}`);
      }
    }
    
    setFilesForDisplay(displayItems);
    setProcessedFilesForZustand(allProcessedFiles);

    if (allProcessedFiles.length > 0) {
      setMessage(`Successfully processed ${allProcessedFiles.length} file(s). Ready to proceed.`);
      setIsReadyToProceed(true);
    } else {
      setMessage('No valid files were processed. Please check file types.');
    }

    setIsUploading(false);
  };

  const handleDeleteFile = (id: string) => {
    setFilesForDisplay(prev => prev.filter(f => f.id !== id));
    setProcessedFilesForZustand(prev => prev.filter(f => f.id !== id));
    if (filesForDisplay.length - 1 === 0) {
        setIsReadyToProceed(false);
        setMessage('All files removed. Please upload new files.');
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-50">
      <FileList
        uploadedFiles={filesForDisplay}
        filteredFiles={filesForDisplay.filter(file => file.name.toLowerCase().includes(searchTerm.toLowerCase()))}
        selectedFile={selectedFile}
        isUploading={isUploading}
        message={message}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onFileUpload={handleFileUpload}
        // --- PERUBAHAN 2: Perbaiki cara memberikan prop onFileSelect ---
        onFileSelect={(file) => setSelectedFile(file)}
        onDeleteFile={handleDeleteFile}
      />
      <FilePreview
        selectedFile={selectedFile}
        selectedSubFile={selectedSubFile}
        onSelectSubFile={setSelectedSubFile}
      />
      {filesForDisplay.length > 0 && (
        <div className="fixed bottom-8 right-8 z-50">
          <button
            onClick={handleProceedToNextPage}
            disabled={!isReadyToProceed}
            title={isReadyToProceed ? "Proceed with processed data" : "Waiting for files to be processed"}
            className={`p-4 rounded-full shadow-lg flex items-center justify-center transition-all ${isReadyToProceed ? 'bg-green-500 hover:bg-green-600 hover:scale-110' : 'bg-gray-400 cursor-not-allowed'}`}
          >
            <Plus size={28} className="text-white" />
          </button>
        </div>
      )}
    </div>
  );
}