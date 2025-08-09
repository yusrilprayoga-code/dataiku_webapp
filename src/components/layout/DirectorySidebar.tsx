// src/components/layout/DirectorySidebar.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Folder, File, ChevronRight, ChevronDown, Database, Loader2, Check } from 'lucide-react';
import { PlotType, useDashboard } from '@/contexts/DashboardContext';

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
  
  const { toggleWellSelection, selectedWells, setPlotFigure, setPlotType, setSelectedFilePath, plotType } = useDashboard();
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
    
    // Update selected files state - allow multiple selections
    const newSelectedFiles = selectedFiles.includes(filePath)
      ? selectedFiles.filter(path => path !== filePath)
      : [...selectedFiles, filePath]; // Multiple selection
    
    setSelectedFiles(newSelectedFiles);
    
    // Handle well selection in dashboard context
    // For spliced files, extract a more reasonable well name or use the file name as-is
    let wellName;
    if (file.name.toLowerCase().includes('spliced')) {
      // For spliced files, use the filename without extension as the well identifier
      wellName = file.name.replace(/\.[^/.]+$/, "");
      console.log(`Spliced file detected: ${file.name}, using wellName: ${wellName}`);
    } else {
      // For regular files, remove file extension to get well name
      wellName = file.name.replace(/\.[^/.]+$/, "");
    }
    
    if (selectedFiles.includes(filePath)) {
      // File was deselected - remove well from selection
      if (selectedWells.includes(wellName)) {
        toggleWellSelection(wellName);
      }
    } else {
      // File was selected - add well to selection
      if (!selectedWells.includes(wellName)) {
        toggleWellSelection(wellName);
      }
    }
    
    // If this is a CSV file selection (not deselection), trigger plot for the first selected CSV
    if (!selectedFiles.includes(filePath) && file.extension === '.csv' && newSelectedFiles.length > 0) {
      console.log(`File selected: ${file.name}`);
      console.log(`File path: ${filePath}`);
      console.log(`Is spliced file: ${file.name.toLowerCase().includes('spliced')}`);
      
      // Check if file contains "spliced" to determine plot type
      if (file.name.toLowerCase().includes('spliced')) {
        console.log('Setting plot type to splicing');
        setPlotType('splicing');
      } else {
        console.log('Setting plot type to get-module1-plot');
        setPlotType('get-module1-plot');
      }
      
      // Store the selected file path in context for fallback API calls
      setSelectedFilePath(filePath);
      console.log(`Selected file path set to: ${filePath}`);
      
      // Clear any existing plot data before loading new plot
      setPlotFigure({ data: [], layout: {} });

      // Call the appropriate plot API based on plot type
      try {
        console.log(`Requesting plot for CSV file: ${filePath}`);
        console.log(`Well name: ${wellName}, File: ${file.name}`);
        console.log(`File path for backend: ${filePath}`);
        
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        let fullUrl, requestBody;
        
        // Determine API endpoint and request body based on plot type
        if (file.name.toLowerCase().includes('spliced')) {
          fullUrl = `${apiUrl}/api/get-splicing-plot`;
          requestBody = { file_path: filePath };
        } else {
          fullUrl = `${apiUrl}/api/get-module1-plot`;
          requestBody = { file_path: filePath };
        }
        
        console.log(`Full plot URL: ${fullUrl}`);
        
        const response = await fetch(fullUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        console.log(`Plot response status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
          // Try to get detailed error from response
          let errorMessage = `Failed to get plot: ${response.status} ${response.statusText}`;
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage += ` - ${errorText}`;
              console.error('Plot error response:', errorText);
            }
          } catch (parseErr) {
            console.error('Could not parse plot error response:', parseErr);
          }
          throw new Error(errorMessage);
        }

               const plotData = await response.json();
        console.log('Plot data received from backend:', plotData);
        console.log(`Plot data type: ${typeof plotData}`);
        console.log(`Plot data length: ${typeof plotData === 'string' ? plotData.length : 'not string'}`);
        
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
          console.log(`Parsed plot data has data: ${!!parsedPlotData?.data}`);
          console.log(`Parsed plot data has layout: ${!!parsedPlotData?.layout}`);
          
          // Check if it looks like a valid Plotly figure
          if (parsedPlotData && typeof parsedPlotData === 'object' && (parsedPlotData.data || parsedPlotData.layout)) {
            console.log('Using parsed plot data for setPlotFigure');
            setPlotFigure({
              data: parsedPlotData.data || [],
              layout: parsedPlotData.layout || {}
            });
            console.log('Plot data updated in dashboard context');
          } else if (plotData && plotData.error) {
            // Handle error response
            console.error('Plot request failed - backend error:', plotData.error);
            setError(`Plot generation failed: ${plotData.error}`);
          } else {
            console.error('Plot request failed - invalid Plotly figure structure');
            setError(`Plot generation failed: Invalid plot data structure`);
          }
        } catch (parseError) {
          console.error('Failed to parse plot data:', parseError);
          setError(`Plot generation failed: Could not parse plot data`);
        }
      } catch (error) {
        console.error('Error processing plot:', error);
        setError(error instanceof Error ? error.message : 'Failed to process plot data');
      }
    }
  };

  const handleSelectAllFiles = () => {
    if (selectedFiles.length === files.length) {
      // Deselect all files
      setSelectedFiles([]);
      // Clear wells from selection one by one using toggleWellSelection
      files.forEach(file => {
        const wellName = file.name.replace(/\.[^/.]+$/, "");
        if (selectedWells.includes(wellName)) {
          toggleWellSelection(wellName);
        }
      });
    } else {
      // Select all files
      const allFilePaths = files.map(file => file.path);
      setSelectedFiles(allFilePaths);
      // Add wells to selection one by one using toggleWellSelection
      files.forEach(file => {
        const wellName = file.name.replace(/\.[^/.]+$/, "");
        if (!selectedWells.includes(wellName)) {
          toggleWellSelection(wellName);
        }
      });
      
      // Trigger plot for the first CSV file if available
      const firstCsvFile = files.find(file => file.extension === '.csv');
      if (firstCsvFile) {
        console.log(`Select all - First CSV file: ${firstCsvFile.name}`);
        console.log(`Select all - Is spliced: ${firstCsvFile.name.toLowerCase().includes('spliced')}`);
        
        // Check if file contains "spliced" to determine plot type
        if (firstCsvFile.name.toLowerCase().includes('spliced')) {
          console.log('Select all - Setting plot type to splicing');
          setPlotType('splicing');
        } else {
          console.log('Select all - Setting plot type to get-module1-plot');
          setPlotType('get-module1-plot');
        }
        setSelectedFilePath(firstCsvFile.path);
        
        // Clear any existing plot data before loading new plot
        setPlotFigure({ data: [], layout: {} });
        
        // Call appropriate plot API for the first CSV
        (async () => {
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            let endpoint;
            
            // Determine API endpoint based on file name
            if (firstCsvFile.name.toLowerCase().includes('spliced')) {
              endpoint = `${apiUrl}/api/get-splicing-plot`;
            } else {
              endpoint = `${apiUrl}/api/get-module1-plot`;
            }
            
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 'file_path': allFilePaths}),
            });
            
            if (response.ok) {
              const plotData = await response.json();
              const parsedPlotData = typeof plotData === 'string' ? JSON.parse(plotData) : plotData;
              
              if (parsedPlotData && (parsedPlotData.data || parsedPlotData.layout)) {
                setPlotFigure({
                  data: parsedPlotData.data || [],
                  layout: parsedPlotData.layout || {}
                });
              }
            }
          } catch (error) {
            console.error('Error in select all plot generation:', error);
          }
        })();
      }
    }
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
          <h3 className="text-xs font-bold text-gray-700 mb-2">
            Files in {currentFolder}
          </h3>
          
          {/* Select All Checkbox - below title */}
          {files && files.length > 0 && (
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
              <button
                onClick={handleSelectAllFiles}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors duration-200 ${
                  selectedFiles.length === files.length && files.length > 0
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : selectedFiles.length > 0
                    ? 'bg-blue-200 border-blue-400 text-blue-700'
                    : 'border-gray-300 hover:border-blue-400'
                }`}
                title={selectedFiles.length === files.length ? 'Deselect All' : 'Select All'}
              >
                {selectedFiles.length === files.length && files.length > 0 && <Check className="w-3 h-3" />}
                {selectedFiles.length > 0 && selectedFiles.length < files.length && (
                  <div className="w-2 h-2 bg-blue-700 rounded-sm" />
                )}
              </button>
              <span className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer" onClick={handleSelectAllFiles}>
                {selectedFiles.length === files.length ? 'Deselect All' : 'Select All'}
              </span>
            </div>
          )}
          
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
                    <div
                      className={`w-full flex items-center gap-2 p-1 text-xs rounded transition-colors duration-200 ${
                        isSelected
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'hover:bg-gray-100 text-gray-700 border border-transparent'
                      }`}
                      title={file.path}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => handleFileSelect(file)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors duration-200 ${
                          isSelected
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                      
                      {/* File icon and name */}
                      <File className={`w-3 h-3 flex-shrink-0 ${
                        file.extension === '.csv' ? 'text-blue-500' : 'text-gray-500'
                      }`} />
                      <span className="flex-1 text-left truncate">{file.name}</span>
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
      
      
      
      <div className="bg-white rounded-lg shadow-sm p-2 mt-auto">
        <h3 className="text-xs font-bold text-gray-700 mb-2">Display</h3>
        <div className="flex flex-col gap-2">
          
          {/* Dropdown untuk Plot Layout */}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Plot Layout</label>
            <select
              value={plotType}
              onChange={(e) => setPlotType(e.target.value as PlotType)}
              className="text-xs w-full bg-white border border-gray-200 rounded p-1 focus:ring-1 focus:ring-blue-500"
            >
              <option value="default">Layout Default</option>
              <option value="normalization-prep">Layout Normalisasi</option>
              <option value="smoothing-prep">Layout Smoothing</option>
              <option value="splicing">Layout Splicing</option>
            </select>
          </div>
        </div>
      </div>
    </aside>
  );
}