'use client';

import React from 'react';
import { useAppDataStore } from '@/stores/useAppDataStore';
import { Folder, Save, X } from 'lucide-react';

interface SaveLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: string, structure: string) => void;
  isSaving: boolean;
}

export default function SaveLocationModal({ isOpen, onClose, onSave, isSaving }: SaveLocationModalProps) {
  const { 
    folderStructure, 
    selectedField, 
    selectedStructure, 
    setSelectedField, 
    setSelectedStructure 
  } = useAppDataStore();

  const handleSaveClick = () => {
    if (selectedField && selectedStructure) {
      onSave(selectedField, selectedStructure);
    }
  };

  if (!isOpen) return null;

  const fields = Object.keys(folderStructure);
  const structures = selectedField ? folderStructure[selectedField] : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md transform transition-all animate-fade-in-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Folder className="text-blue-500" />
            Save Processed Wells
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="field-select" className="block text-sm font-medium text-gray-700 mb-1">
              1. Select Field
            </label>
            <select
              id="field-select"
              value={selectedField || ''}
              onChange={(e) => setSelectedField(e.target.value || null)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" disabled>-- Choose a Field --</option>
              {fields.map(field => (
                <option key={field} value={field}>{field}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="structure-select" className="block text-sm font-medium text-gray-700 mb-1">
              2. Select Structure
            </label>
            <select
              id="structure-select"
              value={selectedStructure || ''}
              onChange={(e) => setSelectedStructure(e.target.value || null)}
              disabled={!selectedField}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              <option value="" disabled>-- Choose a Structure --</option>
              {structures.map(structure => (
                <option key={structure} value={structure}>{structure}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveClick}
            disabled={!selectedField || !selectedStructure || isSaving}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
          >
            {isSaving ? 'Saving...' : <><Save size={18} /> Save and Continue</>}
          </button>
        </div>
      </div>
    </div>
  );
}