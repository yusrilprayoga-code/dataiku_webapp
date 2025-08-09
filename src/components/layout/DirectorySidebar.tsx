'use client';

import React, { useState, useEffect } from 'react';
import { Folder, File, ChevronRight, ChevronDown, Database, Loader2 } from 'lucide-react';
import { PlotType, useDashboard } from '@/contexts/DashboardContext';

// Interface definitions for folder and file structures
interface WellFolder {
  name: string;
  type: 'folder';
  path: string;
}

interface WellFile {
  name: string;
  type: 'file';
  extension: string;
  path: string;
}

interface FoldersResponse {
  field_name: string;
  structure_name: string;
  folder_names: string[];
  structure_path: string;
}

interface FilesResponse {
  field_name: string;
  structure_name: string;
  well_folder: string;
  well_path: string;
  csv_files_details: WellFile[];
}

export default function DirectorySidebar() {
  // Hardcoded structure info for the Data Prep section
  const FIELD_NAME = 'adera';
  const STRUCTURE_NAME = 'benuang';
  
  // Get all necessary state and functions from the central DashboardContext
  const { 
    plotType, 
    setPlotType, 
    setSelectedFilePath, 
    selectedFilePath,
    fetchPlotData // The central function to trigger plot fetching
  } = useDashboard();
  
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [wellFolders, setWellFolders] = useState<WellFolder[]>([]);
  const [files, setFiles] = useState<WellFile[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect to load the top-level well folders on component mount
  useEffect(() => {
    const loadWellFolders = async () => {
      setLoadingFolders(true);
      setError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      try {
        const response = await fetch(`${apiUrl}/api/structure-folders/${FIELD_NAME}/${STRUCTURE_NAME}`);
        if (!response.ok) throw new Error(`Failed to load folders: ${response.statusText}`);
        const data: FoldersResponse = await response.json();
        const folderObjects: WellFolder[] = data.folder_names.map(folderName => ({
          name: folderName,
          type: 'folder' as const,
          path: `${data.structure_path}/${folderName}`
        }));
        setWellFolders(folderObjects);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load folders');
      } finally {
        setLoadingFolders(false);
      }
    };
    loadWellFolders();
  }, []);

  // Effect to load files when a folder is selected
  useEffect(() => {
    if (currentFolder) {
      const loadFiles = async () => {
        setLoadingFiles(true);
        setError(null);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        try {
          const response = await fetch(`${apiUrl}/api/well-folder-files/${FIELD_NAME}/${STRUCTURE_NAME}/${currentFolder}`);
          if (!response.ok) throw new Error(`Failed to load files: ${response.statusText}`);
          const data: FilesResponse = await response.json();
          setFiles(data.csv_files_details);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load files');
        } finally {
          setLoadingFiles(false);
        }
      };
      loadFiles();
    } else {
      setFiles([]); // Clear files if no folder is selected
    }
  }, [currentFolder]);

  // Effect to automatically trigger a plot fetch whenever the selected file or plot type changes
  useEffect(() => {
    // Only fetch if a file has been selected
    if (selectedFilePath) {
      fetchPlotData();
    }
  }, [selectedFilePath, plotType, fetchPlotData]);

  // Handler to expand/collapse a folder
  const handleFolderSelect = (folderName: string) => {
    setCurrentFolder(currentFolder === folderName ? null : folderName);
  };

  // Handler for when a user clicks on a file
  const handleFileSelect = (file: WellFile) => {
    // Set the selected file path in the context
    setSelectedFilePath(file.path);
    
    // Automatically determine the default plot type when a new file is selected
    const initialPlotType = file.name.toLowerCase().includes('spliced') ? 'splicing' : 'default';
    setPlotType(initialPlotType);
  };

  // Handler for when the user changes the plot layout dropdown
  const handleLayoutChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newPlotType = e.target.value as PlotType;
      setPlotType(newPlotType);
  };

  return (
    <aside className="w-52 bg-gray-100 flex flex-col gap-2 p-2 border-r border-gray-300 h-screen">
      <div className="flex items-center gap-2 px-2 py-1">
        <Database className="w-4 h-4 text-gray-600" />
        <div className="text-xs font-bold text-gray-800">Wells Browser</div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
        <div className="text-xs text-blue-700">
            <div className="font-semibold">{STRUCTURE_NAME}</div>
            <div className="text-blue-500">Field: {FIELD_NAME}</div>
        </div>
      </div>

      {error && ( <div className="text-xs text-red-600 p-2 bg-red-50 rounded border border-red-200">{error}</div> )}
      
      <div className="bg-white rounded-lg shadow-sm p-2">
        <h3 className="text-xs font-bold text-gray-700 mb-1">Well Folders</h3>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {loadingFolders ? (
            <div className="flex items-center gap-2 p-1 text-xs text-gray-500"><Loader2 className="w-3 h-3 animate-spin" />Loading...</div>
          ) : (
            wellFolders.map((folder) => (
              <button
                key={folder.name}
                onClick={() => handleFolderSelect(folder.name)}
                className={`w-full flex items-center gap-2 p-1 text-xs rounded transition-colors ${
                  currentFolder === folder.name ? 'bg-green-100 text-green-800' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <Folder className="w-3 h-3 text-yellow-500" />
                <span className="flex-1 text-left truncate">{folder.name}</span>
                {currentFolder === folder.name ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            ))
          )}
        </div>
      </div>

      {currentFolder && (
        <div className="bg-white rounded-lg shadow-sm p-2 flex-1 flex flex-col overflow-hidden">
          <h3 className="text-xs font-bold text-gray-700 mb-2">Files in {currentFolder}</h3>
          <div className="space-y-1 overflow-y-auto flex-1">
            {loadingFiles ? (
              <div className="flex items-center gap-2 p-1 text-xs text-gray-500"><Loader2 className="w-3 h-3 animate-spin" />Loading...</div>
            ) : (
              files.map((file) => {
                const isSelected = selectedFilePath === file.path;
                return (
                  <button
                    key={file.path}
                    onClick={() => handleFileSelect(file)}
                    className={`w-full flex items-center gap-2 p-1 text-xs rounded transition-colors text-left ${
                      isSelected ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'hover:bg-gray-100 text-gray-700 border border-transparent'
                    }`}
                    title={file.path}
                  >
                    <File className={`w-3 h-3 flex-shrink-0 ${file.extension === '.csv' ? 'text-blue-500' : 'text-gray-500'}`} />
                    <span className="flex-1 truncate">{file.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    
      <div className="bg-white rounded-lg shadow-sm p-2 mt-auto">
        <h3 className="text-xs font-bold text-gray-700 mb-2">Display</h3>
        <div className="flex flex-col gap-2">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Plot Layout</label>
            <select
              value={plotType}
              onChange={handleLayoutChange}
              className="text-xs w-full bg-white border border-gray-200 rounded p-1 focus:ring-1 focus:ring-blue-500"
              disabled={!selectedFilePath} // Disable if no file is selected
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