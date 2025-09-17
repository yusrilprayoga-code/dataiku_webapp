'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StructuresData, FieldDetails} from '@/types/structures';
import { FolderIcon, FileTextIcon, Loader2 } from 'lucide-react';
import { useAppDataStore } from '@/stores/useAppDataStore';

interface StructuresDashboardProps {
  initialData: StructuresData;
}

export default function StructuresDashboard({ initialData }: StructuresDashboardProps) {
  const router = useRouter();
  const [data] = useState<StructuresData>(initialData);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [selectedStructure, setSelectedStructure] = useState<string | null>(null);
  const [fieldDetails, setFieldDetails] = useState<FieldDetails | null>(null);
  const [isLoadingField, setIsLoadingField] = useState(false);
  const setStructure = useAppDataStore(state => state.setStructure);

  const handleFieldSelect = async (fieldName: string) => {
    if (selectedField === fieldName) return;
    
    setSelectedField(fieldName);
    setSelectedStructure(null);
    setIsLoadingField(true);
    
    try {
      // Use mock data directly instead of API call
      const fieldData = data.fields.find(field => field.field_name === fieldName);
      if (fieldData) {
        const totalWells = fieldData.structures.reduce((sum, structure) => sum + structure.wells_count, 0);
        const totalRecords = fieldData.structures.reduce((sum, structure) => sum + structure.total_records, 0);
        
        setFieldDetails({
          field_name: fieldName,
          structures: fieldData.structures.map(structure => ({
            structure_name: structure.structure_name,
            file_path: structure.file_path,
            wells: structure.wells,
            wells_count: structure.wells_count,
            total_records: structure.total_records,
            columns: structure.columns,
            sample_data: []
          })),
          total_wells: totalWells,
          total_records: totalRecords,
          all_wells: []
        });
      }
    } catch (error) {
      console.error('Error loading field details:', error);
    } finally {
      setIsLoadingField(false);
    }
  };

  const handleStructureSelect = async (structureName: string) => {
    try {
      // Get the field name for the current structure
      const fieldName = selectedField?.toLowerCase() || '';
      
      if (fieldName === 'adera') {
        if (structureName.toLowerCase() === 'abab') {
        } else if (structureName.toLowerCase() === 'benuang') {
        }
      } else if (fieldName === 'prabumulih') {
        if (structureName.toLowerCase().includes('gunung') || structureName.toLowerCase().includes('kemala')) {
        }
      }

      setStructure(fieldName, structureName, '');
      
      // // Make API call to select structure using environment variable
      // if (apiFieldName && apiStructureName) {
      //   const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      //   const response = await fetch(`${apiUrl}/api/select-structure`, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({
      //       field_name: apiFieldName,
      //       structure_name: apiStructureName
      //     })
      //   });
        
      //   if (response.ok) {
      //     console.log('Structure selection API call successful');
      //   } else {
      //     console.error('Structure selection API call failed');
      //   }
      // }
    } catch (error) {
      console.error('Error calling select-structure API:', error);
    }
    
    // Navigate to dashboard after API call
    router.push('/dashboard');
  };

  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-50 text-gray-800">
      {/* Panel 1: Fields List */}
      <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col p-4">
        <h1 className="text-xl font-bold mb-6 text-gray-800">Fields</h1>
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {data.fields.map((field) => (
              <button
                key={field.field_name}
                onClick={() => handleFieldSelect(field.field_name)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all duration-200 text-left border ${
                  selectedField === field.field_name 
                    ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' 
                    : 'hover:bg-gray-50 border-transparent hover:border-gray-200'
                }`}
              >
                <FolderIcon className={`w-5 h-5 ${selectedField === field.field_name ? 'text-blue-500' : 'text-gray-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{field.field_name}</div>
                  <div className="text-xs text-gray-500">{field.structures_count} structures</div>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Summary statistics - Commented out for now
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Total Fields:</span>
              <span className="font-semibold">{data.summary.total_fields}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Structures:</span>
              <span className="font-semibold">{data.summary.total_structures}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Wells:</span>
              <span className="font-semibold">{data.summary.total_wells}</span>
            </div>
          </div>
        </div>
        */}
      </div>

      {/* Panel 2: Structures List */}
      <div className="flex-1 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b font-semibold text-lg bg-white shadow-sm">
          {selectedField ? `Structures in "${selectedField}"` : 'Select a field to view structures'}
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoadingField ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Loading structures...</span>
            </div>
          ) : fieldDetails ? (
            <div className="bg-white m-4 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Structure Name</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fieldDetails.structures.map((structure) => (
                    <tr
                      key={structure.structure_name}
                      onClick={() => handleStructureSelect(structure.structure_name)}
                      className={`cursor-pointer transition-all duration-200 ${
                        selectedStructure === structure.structure_name 
                          ? 'bg-blue-50 border-l-4 border-blue-500' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <FileTextIcon className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{structure.structure_name}</div>
                            {structure.error && <div className="text-xs text-red-500">(Error loading)</div>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <div className="text-center">
                <FolderIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>Select a field to view its structures</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Panel 3: Structure Details - Commented out for now */}
      {/* 
      <div className="flex-1 flex flex-col bg-white">
        <div className="p-4 border-b bg-white shadow-sm">
          <h2 className="font-semibold text-lg text-gray-800">Structure Details</h2>
          <p className="text-sm text-gray-500 truncate">
            {selectedStructure ? `Details for "${selectedStructure}"` : "Select a structure to view details"}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {isLoadingStructure ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Loading structure details...</span>
            </div>
          ) : structureDetails ? (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Structure Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-600">Field:</span>
                    <span className="font-semibold text-gray-800">{structureDetails.field_name}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-600">Structure:</span>
                    <span className="font-semibold text-gray-800">{structureDetails.structure_name}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-600">Wells Count:</span>
                    <span className="font-semibold text-gray-800">{structureDetails.wells_count}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-600">Total Records:</span>
                    <span className="font-semibold text-gray-800">{structureDetails.total_records.toLocaleString()}</span>
                  </div>
                  <div className="col-span-2 flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-600">File Path:</span>
                    <span className="font-mono text-xs text-gray-800 truncate max-w-md">{structureDetails.file_path}</span>
                  </div>
                </div>
              </div>
              {structureDetails.wells && structureDetails.wells.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Wells ({structureDetails.wells_count})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                    {structureDetails.wells.map((well) => (
                      <div
                        key={well}
                        className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 text-sm font-mono text-gray-700 hover:shadow-md transition-shadow duration-200"
                      >
                        {well}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Available Columns ({structureDetails.columns.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {structureDetails.columns.map((column, index) => (
                    <div
                      key={column}
                      className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 text-sm"
                    >
                      <span className="font-medium text-gray-800">{column}</span>
                      <span className="ml-2 text-xs text-gray-500 block">
                        {structureDetails.data_types && structureDetails.data_types[column] 
                          ? `Type: ${structureDetails.data_types[column]}` 
                          : `Column #${index + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {structureDetails.statistics && Object.keys(structureDetails.statistics).length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Column Statistics</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {Object.entries(structureDetails.statistics).map(([column, stats]) => (
                      <div key={column} className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-800 mb-2">{column}</h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex justify-between">
                            <span>Count:</span>
                            <span className="font-mono">{stats.count}</span>
                          </div>
                          {stats.mean !== null && (
                            <div className="flex justify-between">
                              <span>Mean:</span>
                              <span className="font-mono">{stats.mean?.toFixed(2)}</span>
                            </div>
                          )}
                          {stats.min !== null && (
                            <div className="flex justify-between">
                              <span>Min:</span>
                              <span className="font-mono">{stats.min}</span>
                            </div>
                          )}
                          {stats.max !== null && (
                            <div className="flex justify-between">
                              <span>Max:</span>
                              <span className="font-mono">{stats.max}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {structureDetails.sample_data && structureDetails.sample_data.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Sample Data (First 10 rows)</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border border-gray-300 rounded-lg overflow-hidden">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          {structureDetails.columns.slice(0, 8).map((column) => (
                            <th key={column} className="px-3 py-2 text-left border-r border-gray-300 font-medium text-gray-700">
                              {column}
                            </th>
                          ))}
                          {structureDetails.columns.length > 8 && (
                            <th className="px-3 py-2 text-left font-medium text-gray-700">...</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {structureDetails.sample_data.slice(0, 10).map((row, index) => (
                          <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-t border-gray-200`}>
                            {structureDetails.columns.slice(0, 8).map((column) => (
                              <td key={column} className="px-3 py-2 border-r border-gray-200 text-gray-700">
                                {String(row[column] || '').slice(0, 30)}
                                {String(row[column] || '').length > 30 && '...'}
                              </td>
                            ))}
                            {structureDetails.columns.length > 8 && (
                              <td className="px-3 py-2 text-gray-700">...</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <FileTextIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-lg font-medium">Select a structure to view details</p>
                <p className="text-sm">Choose a structure from the middle panel to see its information</p>
              </div>
            </div>
          )}
        </div>
      </div>
      */}
    </div>
  );
}
