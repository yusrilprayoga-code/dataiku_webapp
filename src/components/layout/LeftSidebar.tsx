"use client";

import { PlotType, useDashboard } from '@/contexts/DashboardContext';
import { useEffect, useState } from 'react';
import { getSetsForWell, WellDataSet, LogCurve, addLogsToSet, saveWellDataSet, getWellDataSet } from '@/lib/db';
import { ArrowLeft, BarChart3, List, Plus, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SetListItem {
  setName: string;
  wells: string[];
  isSelected: boolean;
}

export default function LeftSidebar() {
  const { availableWells, selectedWells, toggleWellSelection, selectedIntervals, toggleInterval, plotType,
    setPlotType, getCurrentLogs } = useDashboard();

  const [isMounted, setIsMounted] = useState(false);
  const [availableSets, setAvailableSets] = useState<SetListItem[]>([]);
  const [selectedSet, setSelectedSet] = useState<WellDataSet | null>(null);
  const [isAddingNewSet, setIsAddingNewSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch available sets when selected wells change
  useEffect(() => {
    const fetchSets = async () => {
      if (selectedWells.length > 0) {
        try {
          // Fetch sets for all selected wells
          const allSets = await Promise.all(
            selectedWells.map(well => getSetsForWell(well))
          );
          console.log('Fetched sets:', allSets);

          // Combine and deduplicate sets
          const uniqueSets = Array.from(
            new Map(
              allSets.flat().map(set => [
                set.setName,
                {
                  setName: set.setName,
                  wells: set.wells,
                  isSelected: selectedSet?.setName === set.setName
                }
              ])
            ).values()
          );

          console.log('Unique sets to display:', uniqueSets);
          setAvailableSets(uniqueSets);
        } catch (error) {
          console.error('Error fetching sets:', error);
        }
      } else {
        setAvailableSets([]);
      }
    };

    fetchSets();
  }, [selectedWells, selectedSet?.setName]);

  const handleSelectAllWells = (checked: boolean) => {
    if (checked) {
      availableWells.forEach(well => {
        if (!selectedWells.includes(well)) {
          toggleWellSelection(well);
        }
      });
    } else {
      selectedWells.forEach(well => toggleWellSelection(well));
    }
  };

  const handleSelectAllIntervals = (checked: boolean) => {
    if (checked) {
      intervals.forEach(interval => {
        if (!selectedIntervals.includes(interval)) {
          toggleInterval(interval);
        }
      });
    } else {
      selectedIntervals.forEach(interval => toggleInterval(interval));
    }
  };

  const handleViewSet = async (setName: string) => {
    const setData = await getWellDataSet(setName);
    if (setData) {
      setSelectedSet(setData);
    }
  };

  const handleBackToSets = () => {
    setSelectedSet(null);
  }; const handleCreateNewSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetName.trim()) {
      alert('Please enter a name for the set');
      return;
    }

    if (selectedWells.length === 0) {
      alert('Please select a well first');
      return;
    }

    if (selectedWells.length > 1) {
      alert('Please select only one well to create a set');
      return;
    }

    try {
      // Get current plot logs from the dashboard context
      const logCurves = getCurrentLogs();
      console.log("Got log curves:", logCurves);

      if (logCurves.length === 0) {
        alert('No logs found in current plot. Please ensure there is data displayed in the plot.');
        return;
      }

      // Save the set with the well name
      const setName = newSetName.trim();
      await saveWellDataSet(setName, logCurves);

      // Success feedback
      alert(`Successfully saved set "${setName}" with ${logCurves.length} logs`);

      setIsAddingNewSet(false);
      setNewSetName('');

      // Select the newly created set
      const newSet = await getWellDataSet(setName);
      if (newSet) {
        setSelectedSet(newSet);
      }

      // Refresh the sets list
      if (selectedWells.length > 0) {
        const sets = await Promise.all(selectedWells.map(well => getSetsForWell(well)));
        const uniqueSets = Array.from(
          new Map(
            sets.flat().map(set => [
              set.setName,
              {
                setName: set.setName,
                wells: set.wells,
                isSelected: false
              }
            ])
          ).values()
        );
        setAvailableSets(uniqueSets);
      }
    } catch (error) {
      console.error('Failed to create new set:', error);
    }
  }; const handleAddToSet = async (setName: string) => {
    if (selectedWells.length === 0) {
      alert('Please select a well first');
      return;
    }

    if (selectedWells.length > 1) {
      alert('Please select only one well to add to a set');
      return;
    }

    try {
      const logCurves = getCurrentLogs();
      console.log("Got log curves for adding to set:", logCurves);

      if (logCurves.length === 0) {
        alert('No logs found in current plot. Please ensure there is data displayed in the plot.');
        return;
      }

      // Add the logs to the set
      await addLogsToSet(setName, logCurves);

      // Success feedback
      alert(`Successfully added ${logCurves.length} logs to set "${setName}"`);

      // Refresh both the selected set and the available sets list
      const updatedSet = await getWellDataSet(setName);
      if (updatedSet) {
        setSelectedSet(updatedSet);
      }

      // Refresh the available sets list
      if (selectedWells.length > 0) {
        const sets = await Promise.all(selectedWells.map(well => getSetsForWell(well)));
        const uniqueSets = Array.from(
          new Map(
            sets.flat().map(set => [
              set.setName,
              {
                setName: set.setName,
                wells: set.wells,
                isSelected: selectedSet?.setName === set.setName
              }
            ])
          ).values()
        );
        setAvailableSets(uniqueSets);
      }
    } catch (error) {
      console.error('Failed to add to set:', error);
    }
  };

  const intervals: string[] =
    ["MEF", "ABF", "GUF", "BTL", "Lower_BTL", "Upper_BTS", "BTS", "A", "B", "B1", "C", "D", "E", "E1", "BSMT"];

  return (
    <aside className="w-52 bg-gray-100 p-4 flex flex-col gap-4 border-r border-gray-300 h-screen">
      {/* Well Data Section */}
      <div className="flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-gray-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
            checked={selectedWells.length === availableWells.length}
            onChange={(e) => handleSelectAllWells(e.target.checked)}
          />
          <h3 className="text-sm font-bold text-gray-800 flex-1">Well List</h3>
        </div>
        <div className="overflow-y-auto min-h-0 flex-1 max-h-[25vh]">
          <div className="flex flex-col gap-1.5">
            {!isMounted ? (
              <>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </>
            ) : (
              availableWells.map(well => (
                <label key={well} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                    checked={selectedWells.includes(well)}
                    onChange={() => toggleWellSelection(well)}
                  />
                  <span className="text-sm font-medium">{well}</span>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Intervals Section */}
      <div className="flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-gray-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
            checked={selectedIntervals.length === intervals.length}
            onChange={(e) => handleSelectAllIntervals(e.target.checked)}
          />
          <h3 className="text-sm font-bold text-gray-800 flex-1">Interval List</h3>
        </div>
        <div className="overflow-y-auto min-h-0 flex-1 max-h-[25vh]">
          <div className="flex flex-col gap-1.5">
            {intervals.map(interval => (
              <label key={interval} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-200 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                  checked={selectedIntervals.includes(interval)}
                  onChange={() => toggleInterval(interval)}
                />
                <span className="text-sm">{interval}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Saved Sets Section */}
      <div className="flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-gray-300">
          {selectedSet ? (
            <button
              onClick={handleBackToSets}
              className="p-1 hover:bg-gray-200 rounded-md"
              title="Back to sets list"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => setIsAddingNewSet(true)}
              className="p-1 hover:bg-gray-200 rounded-md"
              title="Create new set"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
          <h3 className="text-sm font-bold text-gray-800 flex-1">
            {selectedSet
              ? `Logs in ${selectedSet.setName}`
              : 'Saved Sets'}
          </h3>
        </div>
        <div className="overflow-y-auto min-h-0 flex-1 max-h-[25vh]">
          {isAddingNewSet ? (
            <form onSubmit={handleCreateNewSet} className="p-2">
              <input
                type="text"
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                placeholder="Enter set name..."
                className="w-full p-1 text-sm border rounded"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  className="flex-1 px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNewSet(false);
                    setNewSetName('');
                  }}
                  className="flex-1 px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : selectedSet ? (
            <div className="flex flex-col gap-1.5">
              {selectedSet.logs.map((log, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-200">
                  <span className="text-sm flex-1">{log.curveName}</span>
                </div>
              ))}
            </div>
          ) : availableSets.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {availableSets.map(set => (
                <div key={set.setName}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-md hover:bg-gray-200 group",
                    set.isSelected && "bg-blue-50"
                  )}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">{set.setName}</div>
                    <div className="text-xs text-gray-500">
                      Wells: {set.wells.length}
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewSet(set.setName)}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-300 rounded"
                    title="View logs list"
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-300 rounded"
                    title="View log plot"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </button>
                  {!set.isSelected && (
                    <button
                      onClick={() => handleAddToSet(set.setName)}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-300 rounded"
                      title="Add current logs to set"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 p-2">
              {selectedWells.length === 0
                ? "Select wells to view available sets"
                : "No saved sets found. Click + to create one."}
            </p>
          )}
        </div>
      </div>

      {/* Plot Display Section */}
      <div className="mt-auto">
        <h3 className="text-sm font-bold text-gray-800 mb-2 pb-1 border-b border-gray-300">Plot Display</h3>
        <div className="flex flex-col gap-1.5">
          <select
            value={plotType}
            onChange={(e) => setPlotType(e.target.value as PlotType)}
            className="text-sm p-2 w-full bg-white border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="default">Plot Default</option>
            <option value="normalization">Plot Normalisasi</option>
            <option value="smoothing">Plot Smoothing</option>
            <option value="porosity">Plot Porosity</option>
            <option value="gsa">GSA Plot</option>
          </select>
        </div>
      </div>
    </aside>
  );
}
