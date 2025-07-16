"use client";

import { PlotType, useDashboard } from '@/contexts/DashboardContext';
import { useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, List, Plus, Save, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSetsForWell, getWellDataSet, deleteWellDataSet, removeLogsFromSet, saveWellDataSet, addLogsToSet, type LogCurve, type WellDataSet } from '@/lib/db';

interface SetListItem {
  setName: string;
  wells: string[];
  isSelected: boolean;
}

export default function LeftSidebar() {
  const { availableWells, selectedWells, toggleWellSelection, selectedIntervals, toggleInterval, plotType, availableIntervals, setPlotType, getCurrentLogs } = useDashboard();
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
      availableIntervals.forEach(interval => {
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
  };

  const handleDeleteSet = async (setName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete the set "${setName}"?`)) {
      await deleteWellDataSet(setName);

      // Refresh sets list
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

      // If we're viewing this set, go back to the sets list
      if (selectedSet?.setName === setName) {
        setSelectedSet(null);
      }
    }
  };

  const handleDeleteLog = async (log: LogCurve) => {
    if (selectedSet && confirm(`Are you sure you want to delete the log "${log.curveName}" from this set?`)) {
      await removeLogsFromSet(selectedSet.setName, [log.curveName], log.wellName);

      // Refresh the selected set view
      const updatedSet = await getWellDataSet(selectedSet.setName);
      if (updatedSet) {
        setSelectedSet(updatedSet);
      } else {
        // If all logs were removed, the set was deleted, so go back to sets list
        setSelectedSet(null);
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
                isSelected: false
              }
            ])
          ).values()
        );
        setAvailableSets(uniqueSets);
      }
    }
  };

  const handleCreateNewSet = async (e: React.FormEvent) => {
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


  return (
    <aside className="w-52 bg-gray-100 flex flex-col gap-2 p-2 border-r border-gray-300 h-screen">
      <div className="grid grid-rows-[auto_1fr_1fr_1fr_auto] h-full gap-2">
        {/* Header */}
        <div className="text-xs font-bold text-gray-800 px-2 py-1">Data Selection</div>

        {/* Well Data Section */}
        <div className="flex flex-col bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 p-1.5 bg-gray-50 border-b">
            <input
              type="checkbox"
              className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
              checked={selectedWells.length === availableWells.length}
              onChange={(e) => handleSelectAllWells(e.target.checked)}
            />
            <h3 className="text-xs font-bold text-gray-700">Wells</h3>
            <span className="text-xs text-gray-500 ml-auto">{selectedWells.length}/{availableWells.length}</span>
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            <div className="flex flex-col gap-0.5">
              {!isMounted ? (
                <>
                  <div className="h-5 bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-5 bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-5 bg-gray-100 rounded animate-pulse"></div>
                </>
              ) : (
                availableWells.map(well => (
                  <label key={well} className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-gray-50 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
                      checked={selectedWells.includes(well)}
                      onChange={() => toggleWellSelection(well)}
                    />
                    <span className="truncate">{well}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Intervals Section */}
        <div className="flex flex-col bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 p-1.5 bg-gray-50 border-b">
            <input
              type="checkbox"
              className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
              checked={selectedIntervals.length === availableIntervals.length}
              onChange={(e) => handleSelectAllIntervals(e.target.checked)}
            />
            <h3 className="text-xs font-bold text-gray-700">Intervals</h3>
            <span className="text-xs text-gray-500 ml-auto">{selectedIntervals.length}/{availableIntervals.length}</span>
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            <div className="flex flex-col gap-0.5">
              {availableIntervals.map(interval => (
                <label key={interval} className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-gray-50 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-1 focus:ring-blue-500"
                    checked={selectedIntervals.includes(interval)}
                    onChange={() => toggleInterval(interval)}
                  />
                  <span className="truncate">{interval}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Saved Sets Section */}
        <div className="flex flex-col bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 p-1.5 bg-gray-50 border-b">
            {selectedSet ? (
              <button
                onClick={handleBackToSets}
                className="p-0.5 hover:bg-gray-200 rounded"
                title="Back to sets list"
              >
                <ArrowLeft className="h-3 w-3" />
              </button>
            ) : (
              <button
                onClick={() => setIsAddingNewSet(true)}
                className="p-0.5 hover:bg-gray-200 rounded"
                title="Create new set"
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
            <h3 className="text-xs font-bold text-gray-700">
              {selectedSet ? `Logs in ${selectedSet.setName}` : 'Saved Sets'}
            </h3>
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            <div className="flex flex-col gap-0.5">
              {isAddingNewSet ? (
                <form onSubmit={handleCreateNewSet} className="p-1">
                  <input
                    type="text"
                    value={newSetName}
                    onChange={(e) => setNewSetName(e.target.value)}
                    placeholder="Enter set name..."
                    className="w-full p-1 text-xs border rounded"
                    autoFocus
                  />
                  <div className="flex gap-1 mt-1">
                    <button
                      type="submit"
                      className="flex-1 px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewSet(false);
                        setNewSetName('');
                      }}
                      className="flex-1 px-2 py-0.5 text-xs bg-gray-200 rounded hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : selectedSet ? (
                <div className="flex flex-col gap-0.5">
                  {selectedSet.logs.map((log, index) => (
                    <div key={index} className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-gray-50 group">
                      <span className="text-xs flex-1 truncate">{log.curveName}</span>
                      <button
                        onClick={() => handleDeleteLog(log)}
                        className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded text-red-600"
                        title="Delete log from set"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : availableSets.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {availableSets.map(set => (
                    <div key={set.setName}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded hover:bg-gray-50 group",
                        set.isSelected && "bg-blue-50"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{set.setName}</div>
                        <div className="text-[10px] text-gray-500">
                          Wells: {set.wells.length}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleViewSet(set.setName)}
                          className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded"
                          title="View logs list"
                        >
                          <List className="h-3 w-3" />
                        </button>
                        <button
                          className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded"
                          title="View log plot"
                        >
                          <BarChart3 className="h-3 w-3" />
                        </button>
                        {!set.isSelected && (
                          <button
                            onClick={() => handleAddToSet(set.setName)}
                            className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded"
                            title="Add current logs to set"
                          >
                            <Save className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteSet(set.setName, e)}
                          className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded text-red-600"
                          title="Delete set"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 px-2 py-0.5">
                  {selectedWells.length === 0
                    ? "Select wells to view sets"
                    : "No saved sets. Click + to create."}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Plot Display Section */}
        <div className="bg-white rounded-lg shadow-sm p-2">
          <h3 className="text-xs font-bold text-gray-700 mb-1">Plot Display</h3>
          <select
            value={plotType}
            onChange={(e) => setPlotType(e.target.value as PlotType)}
            className="text-xs w-full bg-white border border-gray-200 rounded p-1 focus:ring-1 focus:ring-blue-500"
          >
            <option value="default">Plot Default</option>
            <option value="normalization">Plot Normalisasi</option>
            <option value="smoothing">Plot Smoothing</option>
            <option value="vsh">Plot VSH</option>
            <option value="porosity">Plot Porosity</option>
            <option value="sw">Plot SW</option>
            <option value="rwa">Plot RWA</option>
            <option value="gsa">Plot GSA</option>
            <option value="rpbe-rgbe">Plot RPBE RGBE</option>
            <option value="swgrad">Plot SWGRAD</option>
            <option value="dns-dnsv">Plot DNS-DNSV</option>
            <option value="rt-ro">Plot RT-RO</option>
          </select>
        </div>
      </div>
    </aside>
  );
}
