// src/components/layout/DirectorySidebar.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Folder, File, ChevronRight, ChevronDown, Database, Loader2 } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';

interface WellFolder {
  name: string;
  type: 'folder';
  file_count: number;
  path: string;
}

interface WellFile {
  name: string;
  type: 'file';
  extension: string;
  size_bytes: number;
  path: string;
}

interface FoldersResponse {
  field_name: string;
  structure_name: string;
  folder_names: string[];
  csv_files: string[];
  total_folders: number;
  total_csv_files: number;
  structure_path: string;
}

interface FilesResponse {
  field_name: string;
  structure_name: string;
  well_folder: string;
  well_path: string;
  csv_files: string[];
  total_csv_files: number;
  total_files: number;
  csv_files_details: WellFile[];
}

export default function DirectorySidebar() {
  // Hardcoded structure info - you can make this dynamic later
  const FIELD_NAME = 'adera';
  const STRUCTURE_NAME = 'benuang';
  
  const { toggleWellSelection, selectedWells, setPlotFigure } = useDashboard();
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [wellFolders, setWellFolders] = useState<WellFolder[]>([]);
  const [files, setFiles] = useState<WellFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load well folders on component mount
  useEffect(() => {
    const loadWellFolders = async () => {
      setLoadingFolders(true);
      setError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      
      console.log(`API URL: ${apiUrl}`);
      console.log(`Full request URL: ${apiUrl}/api/structure-folders/${FIELD_NAME}/${STRUCTURE_NAME}`);
      
      try {
        const response = await fetch(`${apiUrl}/api/structure-folders/${FIELD_NAME}/${STRUCTURE_NAME}`);
        console.log(`Response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          // Try to get more detailed error information from the response
          let errorMessage = `Failed to load folders: ${response.status} ${response.statusText}`;
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage += ` - ${errorText}`;
              console.error('Backend error response:', errorText);
            }
          } catch (parseErr) {
            console.error('Could not parse error response:', parseErr);
          }
          throw new Error(errorMessage);
        }
        
        const data: FoldersResponse = await response.json();
        console.log('Folders data received:', data);
        
        // Convert folder_names to WellFolder objects to match our component state
        const folderObjects: WellFolder[] = data.folder_names.map(folderName => ({
          name: folderName,
          type: 'folder' as const,
          file_count: 0, // Backend doesn't provide this, we'll set to 0
          path: `${data.structure_path}/${folderName}`
        }));
        
        setWellFolders(folderObjects);
      } catch (err) {
        console.error('Error loading well folders:', err);
        setError(err instanceof Error ? err.message : 'Failed to load folders');
        setWellFolders([]);
      } finally {
        setLoadingFolders(false);
      }
    };
    
    loadWellFolders();
  }, []);

  // Load files when folder is selected
  useEffect(() => {
    if (currentFolder) {
      const loadFiles = async () => {
        setLoadingFiles(true);
        setError(null);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        
        console.log(`Loading files for folder: ${currentFolder}`);
        console.log(`Full request URL: ${apiUrl}/api/well-folder-files/${FIELD_NAME}/${STRUCTURE_NAME}/${currentFolder}`);
        
        try {
          const response = await fetch(`${apiUrl}/api/well-folder-files/${FIELD_NAME}/${STRUCTURE_NAME}/${currentFolder}`);
          console.log(`Files response status: ${response.status} ${response.statusText}`);
          
          if (!response.ok) {
            let errorMessage = `Failed to load files: ${response.status} ${response.statusText}`;
            try {
              const errorText = await response.text();
              if (errorText) {
                errorMessage += ` - ${errorText}`;
                console.error('Backend error response:', errorText);
              }
            } catch (parseErr) {
              console.error('Could not parse error response:', parseErr);
            }
            throw new Error(errorMessage);
          }
          
          const data: FilesResponse = await response.json();
          console.log('Files data received:', data);
          
          // Use only csv_files_details since we only get CSV files now
          setFiles(data.csv_files_details);
        } catch (err) {
          console.error('Error loading files:', err);
          setError(err instanceof Error ? err.message : 'Failed to load files');
          setFiles([]);
        } finally {
          setLoadingFiles(false);
        }
      };
      
      loadFiles();
    } else {
      setFiles([]);
    }
  }, [currentFolder]);

  const handleFolderSelect = (folderName: string) => {
    if (currentFolder === folderName) {
      // Deselect if clicking the same folder
      setCurrentFolder(null);
      setSelectedFiles([]);
    } else {
      setCurrentFolder(folderName);
      setSelectedFiles([]);
    }
  };

  const handleFileSelect = async (file: WellFile) => {
    const filePath = file.path;
    
    // Update selected files state
    const newSelectedFiles = selectedFiles.includes(filePath)
      ? selectedFiles.filter(path => path !== filePath)
      : [filePath]; // Single selection for now
    
    setSelectedFiles(newSelectedFiles);
    
    // If file is selected and it's a CSV file, trigger Module1 plot
    if (newSelectedFiles.length > 0 && file.extension === '.csv') {
      const wellName = file.name.replace(/\.[^/.]+$/, ""); // Remove file extension
      
      // Add well to dashboard context first
      if (!selectedWells.includes(wellName)) {
        toggleWellSelection(wellName);
      }

      // Call the Module1 plot API
      try {
        console.log(`Requesting Module1 plot for CSV file: ${filePath}`);
        console.log(`Well name: ${wellName}, File: ${file.name}`);
        console.log(`File path for backend: ${filePath}`);
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const fullUrl = `${apiUrl}/api/get-module1-plot`;
        console.log(`Full Module1 plot URL: ${fullUrl}`);
        
        const requestBody = {
          file_path: filePath  // Only send file_path as required by backend
        };
        
        const response = await fetch(fullUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        console.log(`Module1 plot response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          // Try to get detailed error from response
          let errorMessage = `Failed to get Module1 plot: ${response.status} ${response.statusText}`;
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage += ` - ${errorText}`;
              console.error('Module1 plot error response:', errorText);
            }
          } catch (parseErr) {
            console.error('Could not parse Module1 plot error response:', parseErr);
          }
          throw new Error(errorMessage);
        }

               const plotData = await response.json();
        console.log('Module1 plot data received from backend:', plotData);
        
        // Backend returns a JSON string that needs to be parsed
        // The response is the result of fig_result.to_json() from Plotly
        let parsedPlotData;
        try {
          if (typeof plotData === 'string') {
            parsedPlotData = JSON.parse(plotData);
          } else {
            parsedPlotData = plotData;
          }
          
          console.log('Parsed plot data:', parsedPlotData);
          
          // Check if it looks like a valid Plotly figure
          if (parsedPlotData && typeof parsedPlotData === 'object' && (parsedPlotData.data || parsedPlotData.layout)) {
            console.log('Using parsed plot data:', parsedPlotData);
            setPlotFigure({
              data: parsedPlotData.data || [],
              layout: parsedPlotData.layout || {}
            });
            console.log('Module1 plot data updated in dashboard context');
          } else if (plotData && plotData.error) {
            // Handle error response
            console.error('Module1 plot request failed - backend error:', plotData.error);
            setError(`Plot generation failed: ${plotData.error}`);
          } else {
            console.error('Module1 plot request failed - invalid Plotly figure structure');
            setError(`Plot generation failed: Invalid plot data structure`);
          }
        } catch (parseError) {
          console.error('Failed to parse plot data:', parseError);
          setError(`Plot generation failed: Could not parse plot data`);
        }
      } catch (error) {
        console.error('Error processing Module1 plot:', error);
        setError(error instanceof Error ? error.message : 'Failed to process plot data');
      }
    } else if (newSelectedFiles.length === 0) {
      // If no files selected, remove wells from dashboard context
      const wellName = file.name.replace(/\.[^/.]+$/, "");
      if (selectedWells.includes(wellName)) {
        toggleWellSelection(wellName);
      }
    }
  };

  const handleSelectAllFiles = () => {
    if (selectedFiles.length === files.length) {
      setSelectedFiles([]);
      // Clear wells from selection one by one using toggleWellSelection
      files.forEach(file => {
        const wellName = file.name.replace(/\.[^/.]+$/, "");
        if (selectedWells.includes(wellName)) {
          toggleWellSelection(wellName);
        }
      });
    } else {
      const allFilePaths = files.map(file => file.path);
      setSelectedFiles(allFilePaths);
      // Add wells to selection one by one using toggleWellSelection
      files.forEach(file => {
        const wellName = file.name.replace(/\.[^/.]+$/, "");
        if (!selectedWells.includes(wellName)) {
          toggleWellSelection(wellName);
        }
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <aside className="w-52 bg-gray-100 flex flex-col gap-2 p-2 border-r border-gray-300 h-screen">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-1">
        <Database className="w-4 h-4 text-gray-600" />
        <div className="text-xs font-bold text-gray-800">Wells Browser</div>
      </div>

      {/* Current Structure Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
        <div className="text-xs text-blue-700">
          <div className="font-semibold">{STRUCTURE_NAME}</div>
          <div className="text-blue-500">Field: {FIELD_NAME}</div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2">
          <div className="text-xs text-red-700 font-medium">Error:</div>
          <div className="text-xs text-red-600">{error}</div>
        </div>
      )}

      {/* Well Folders Section */}
      <div className="bg-white rounded-lg shadow-sm p-2">
        <h3 className="text-xs font-bold text-gray-700 mb-1">Well Folders</h3>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {loadingFolders ? (
            <div className="flex items-center gap-2 p-1">
              <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
              <span className="text-xs text-gray-500">Loading...</span>
            </div>
          ) : !wellFolders || wellFolders.length === 0 ? (
            <div className="text-xs text-gray-500 p-1">No folders found</div>
          ) : (
            wellFolders.map((folder) => (
              <button
                key={folder.name}
                onClick={() => handleFolderSelect(folder.name)}
                className={`w-full flex items-center gap-2 p-1 text-xs rounded transition-colors duration-200 ${
                  currentFolder === folder.name
                    ? 'bg-green-100 text-green-800'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Folder className="w-3 h-3 text-yellow-500" />
                <span className="flex-1 text-left truncate">{folder.name}</span>
                {currentFolder === folder.name ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Files Section */}
      {currentFolder && (
        <div className="bg-white rounded-lg shadow-sm p-2 flex-1 overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-bold text-gray-700">
              Files in {currentFolder}
            </h3>
            {files && files.length > 0 && (
              <button
                onClick={handleSelectAllFiles}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {selectedFiles.length === files.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
          
          <div className="space-y-1 overflow-y-auto flex-1">
            {loadingFiles ? (
              <div className="flex items-center gap-2 p-1">
                <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                <span className="text-xs text-gray-500">Loading...</span>
              </div>
            ) : !files || files.length === 0 ? (
              <div className="text-xs text-gray-500 p-1">No files found</div>
            ) : (
              files.map((file) => {
                const isSelected = selectedFiles.includes(file.path);
                
                return (
                  <div key={file.path} className="space-y-0.5">
                    <button
                      onClick={() => handleFileSelect(file)}
                      className={`w-full flex items-center gap-2 p-1 text-xs rounded transition-colors duration-200 ${
                        isSelected
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'hover:bg-gray-100 text-gray-700 border border-transparent'
                      }`}
                      title={file.path}
                    >
                      <File className={`w-3 h-3 flex-shrink-0 ${
                        file.extension === '.csv' ? 'text-blue-500' : 'text-gray-500'
                      }`} />
                      <span className="flex-1 text-left truncate">{file.name}</span>
                    </button>
                    <div className="text-xs text-gray-500 ml-5">
                      {formatFileSize(file.size_bytes)}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Files Count */}
          {selectedFiles && selectedFiles.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="text-xs text-blue-600 font-medium">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}