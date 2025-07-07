"use client";

import { PlotType, useDashboard } from '@/contexts/DashboardContext';
import { useEffect, useState } from 'react';
import { getSetNamesForWell, getWellDataSet, LogCurve } from '@/lib/db';
import { ArrowLeft, BarChart3, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LeftSidebar() {
  const { availableWells, selectedWells, toggleWellSelection, selectedIntervals, toggleInterval, plotType,
    setPlotType } = useDashboard();

  const [isMounted, setIsMounted] = useState(false);
  const [savedSets, setSavedSets] = useState<string[]>([]);
  const [selectedSetLogs, setSelectedSetLogs] = useState<LogCurve[] | null>(null);
  const [selectedSetName, setSelectedSetName] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  const handleViewSetLogs = async (setName: string) => {
    if (selectedWells.length === 1) {
      const setData = await getWellDataSet(selectedWells[0], setName);
      if (setData) {
        setSelectedSetLogs(setData.logs);
        setSelectedSetName(setName);
      }
    }
  };

  const handleBackToSets = () => {
    setSelectedSetLogs(null);
    setSelectedSetName(null);
  };

  // Fetch saved sets when selected well changes
  useEffect(() => {
    const fetchSavedSets = async () => {
      if (selectedWells.length === 1) {
        const sets = await getSetNamesForWell(selectedWells[0]);
        setSavedSets(sets);
      } else {
        setSavedSets([]);
      }
    };

    fetchSavedSets();
  }, [selectedWells]);

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
          {selectedSetLogs ? (
            <button
              onClick={handleBackToSets}
              className="p-1 hover:bg-gray-200 rounded-md"
              title="Back to sets list"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : null}
          <h3 className="text-sm font-bold text-gray-800 flex-1">
            {selectedSetLogs
              ? `Logs in ${selectedSetName}`
              : `Saved Sets ${selectedWells.length === 1 ? `(${selectedWells[0]})` : ''}`}
          </h3>
        </div>
        <div className="overflow-y-auto min-h-0 flex-1 max-h-[25vh]">
          {selectedSetLogs ? (
            <div className="flex flex-col gap-1.5">
              {selectedSetLogs.map((log, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded-md">
                  <span className="text-sm flex-1">{log.curveName}</span>
                  <span className="text-xs text-gray-500">{log.unit}</span>
                </div>
              ))}
            </div>
          ) : selectedWells.length === 1 ? (
            savedSets.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {savedSets.map(set => (
                  <div key={set}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-200 group">
                    <span className="text-sm flex-1">{set}</span>
                    <button
                      onClick={() => handleViewSetLogs(set)}
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
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 p-2">No saved sets for this well</p>
            )
          ) : (
            <p className="text-sm text-gray-500 p-2">Select a single well to view saved sets</p>
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