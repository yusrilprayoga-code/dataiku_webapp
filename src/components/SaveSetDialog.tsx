'use client';

import React, { useState, useEffect } from 'react';
import { getSetsForWell } from '@/lib/db'; // Import your DB function

interface SaveSetDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (setName: string) => void;
    wellName: string;
}

export default function SaveSetDialog({ isOpen, onClose, onSave, wellName }: SaveSetDialogProps) {
    const [saveMode, setSaveMode] = useState<'new' | 'existing'>('new');
    const [newSetName, setNewSetName] = useState('');
    const [existingSets, setExistingSets] = useState<string[]>([]);
    const [selectedSet, setSelectedSet] = useState('');

    // Fetch the list of existing sets for the current well when the dialog opens
    useEffect(() => {
        if (isOpen && wellName) {
            getSetsForWell(wellName).then(sets => {
                const setNames = sets.map(set => set.setName);
                setExistingSets(setNames);
                if (setNames.length > 0) {
                    setSelectedSet(setNames[0]);
                }
            });
        }
    }, [isOpen, wellName]);

    const handleSaveClick = () => {
        if (saveMode === 'new') {
            if (!newSetName.trim()) {
                alert('Please enter a name for the new set.');
                return;
            }
            onSave(newSetName.trim());
        } else {
            if (!selectedSet) {
                alert('Please select an existing set to overwrite.');
                return;
            }
            onSave(selectedSet);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-xl font-bold mb-4">Save Current Log as a Set</h2>
                <p className="mb-4 text-sm text-gray-600">
                    Save the log curves currently displayed for well: <strong className="text-gray-800">{wellName}</strong>
                </p>

                {/* --- Save Mode Selection --- */}
                <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="saveMode"
                            value="new"
                            checked={saveMode === 'new'}
                            onChange={() => setSaveMode('new')}
                            className="form-radio h-4 w-4 text-blue-600"
                        />
                        Create New Set
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="saveMode"
                            value="existing"
                            checked={saveMode === 'existing'}
                            onChange={() => setSaveMode('existing')}
                            className="form-radio h-4 w-4 text-blue-600"
                            disabled={existingSets.length === 0}
                        />
                        Overwrite Existing Set
                    </label>
                </div>

                {/* --- Input Fields --- */}
                {saveMode === 'new' ? (
                    <div>
                        <label htmlFor="new-set-name" className="block text-sm font-medium text-gray-700">New Set Name</label>
                        <input
                            id="new-set-name"
                            type="text"
                            value={newSetName}
                            onChange={(e) => setNewSetName(e.target.value)}
                            placeholder="e.g., 'Corrected Logs'"
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                ) : (
                    <div>
                        <label htmlFor="existing-set-name" className="block text-sm font-medium text-gray-700">Select Set to Overwrite</label>
                        <select
                            id="existing-set-name"
                            value={selectedSet}
                            onChange={(e) => setSelectedSet(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            {existingSets.map(set => <option key={set} value={set}>{set}</option>)}
                        </select>
                    </div>
                )}

                {/* --- Action Buttons --- */}
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        Cancel
                    </button>
                    <button onClick={handleSaveClick} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Save Set
                    </button>
                </div>
            </div>
        </div>
    );
}