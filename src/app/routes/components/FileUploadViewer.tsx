// app/your-route/components/FileUploadViewer.tsx
"use client";

import React, { useState, ChangeEvent } from 'react';
import JSZip from 'jszip';
import { FileData, ParsedSubFile, ParsedFileData } from '../types'; // Adjust path
import { readFileContent, readFileAsArrayBuffer } from '../utils/fileUtils'; // Adjust path
import { parseLASFile, parseCSVFile, parseXLSXFileWithSheetJS } from '../utils/fileParser'; // Adjust path
import FileList from './FileList';
import FilePreview from './FilePreview';
// Icons are now mostly in sub-components, but ensure they are imported there:
// import { Upload, File as FileIcon, Eye, Trash2, Search, FileArchiveIcon, FileTextIcon, Folder as FolderIcon } from 'lucide-react';


export default function FileUploadViewer() {
  const [uploadedFiles, setUploadedFiles] = useState<FileData[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [selectedSubFile, setSelectedSubFile] = useState<ParsedSubFile | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // processZipFile function (as defined in previous step, ensuring it uses imported parsers)
  // This function is quite large and specific to the FileData structure, so keeping it here
  // or making it a very specific utility is a choice.
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
      if (pathParts.length < 2 && (!relativePath.toLowerCase().endsWith('.las') && !relativePath.toLowerCase().endsWith('.csv'))) {
        // Allow LAS/CSV at root, or only process files in folders
        // For "structure" feature, we primarily care about files in folders.
        // If you want to handle LAS/CSV at root differently, add logic here.
        // For now, if not in a folder, and not LAS/CSV, skip.
        // If you want LAS/CSV at root to be their own "structure" use a default name or file name as structure name.
        // This example prioritizes folders as structures.
        if(pathParts.length < 2) return; 
      }

      const structureName = pathParts.length > 1 ? pathParts[0] : "_root_files_"; // Group root files if desired
      const fileNameInStructure = pathParts.length > 1 ? pathParts.slice(1).join('/') : relativePath;


      if (!structuresMap.has(structureName)) {
        structuresMap.set(structureName, { lasFiles: [], csvFiles: [] });
      }
      const currentStructure = structuresMap.get(structureName)!;
      const fileId = `${structureName}_${fileNameInStructure}_${Date.now()}_${Math.random().toString(36).substring(2,7)}`;

      if (fileNameInStructure.toLowerCase().endsWith('.las')) {
        const promise = zipEntry.async('string').then(content => {
          const parsed = parseLASFile(content);
          currentStructure.lasFiles.push({
            id: fileId, name: fileNameInStructure, type: 'las',
            content: parsed.data, headers: parsed.headers,
          });
        }).catch(err => console.error(`Failed to process LAS ${relativePath}:`, err));
        fileProcessingPromises.push(promise);
      } else if (fileNameInStructure.toLowerCase().endsWith('.csv')) {
        const promise = zipEntry.async('string').then(async content => {
          const parsed = await parseCSVFile(content);
          currentStructure.csvFiles.push({
            id: fileId, name: fileNameInStructure, type: 'csv',
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
          name: structureNameFromMap === "_root_files_" ? "Files at ZIP Root" : structureNameFromMap,
          originalZipName: originalZipFile.name,
          size: originalZipFile.size,
          originalFileType: originalZipFile.type,
          lastModified: originalZipFile.lastModified,
          isStructureFromZip: true,
          lasFiles: files.lasFiles.sort((a,b) => a.name.localeCompare(b.name)),
          csvFiles: files.csvFiles.sort((a,b) => a.name.localeCompare(b.name)),
          content: [], headers: [], // Top-level structure doesn't have direct content/headers for table preview
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
          allNewFileDataItems.push(...structuresFromZip);
        } else {
          let parsedData: ParsedFileData;
          if (file.name.toLowerCase().endsWith('.csv')) {
            const fileContent = await readFileContent(file);
            parsedData = await parseCSVFile(fileContent);
          } else if (file.name.toLowerCase().endsWith('.las')) {
            const fileContent = await readFileContent(file);
            parsedData = parseLASFile(fileContent);
          } else if (file.name.toLowerCase().endsWith('.xlsx')) {
            const arrayBufferContent = await readFileAsArrayBuffer(file);
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

  const handleDeleteFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFile?.id === fileId) {
      setSelectedFile(null);
      setSelectedSubFile(null);
    }
    setMessage('Item deleted.');
    setTimeout(() => setMessage(''), 3000);
  };

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
    </div>
  );
}