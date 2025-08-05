"use client";

import { PlotType, useDashboard } from '@/contexts/DashboardContext';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function LeftSidebar() {
  const { availableWells, selectedWells, toggleWellSelection, selectedIntervals, toggleInterval, plotType, availableIntervals, setPlotType } = useDashboard();
  const [isMounted, setIsMounted] = useState(false);

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
      availableIntervals.forEach(interval => {
        if (!selectedIntervals.includes(interval)) {
          toggleInterval(interval);
        }
      });
    } else {
      selectedIntervals.forEach(interval => toggleInterval(interval));
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

        {/* Saved Sets Section - Commented out for now */}

        {/* Plot Display Section */}
        <div className="bg-white rounded-lg shadow-sm p-2">
          <h3 className="text-xs font-bold text-gray-700 mb-1">Plot Display</h3>
          <select
            value={plotType}
            onChange={(e) => setPlotType(e.target.value as PlotType)}
            className="text-xs w-full bg-white border border-gray-200 rounded p-1 focus:ring-1 focus:ring-blue-500"
          >
            <option value="default">Layout Default</option>
            <option value="normalization">Layout Normalisasi</option>
            <option value="smoothing">Layout Smoothing</option>
            <option value="vsh">Layout VSH</option>
            <option value="porosity">Layout Porosity</option>
            <option value="sw">Layout SW</option>
            <option value="rwa">Layout RWA</option>
            <option value="module2">Layout Module 2</option>
            <option value="gsa">Layout GSA</option>
            <option value="rpbe-rgbe">Layout RPBE RGBE</option>
            <option value="iqual">Layout IQUAL</option>
            <option value="swgrad">Layout SWGRAD</option>
            <option value="dns-dnsv">Layout DNS-DNSV</option>
            <option value="rt-ro">Layout RT-RO</option>
          </select>

          <div className="flex flex-col gap-1.5">
            {/* 2. Tombol untuk navigasi ke modul Histogram */}
            <Link href="histogram">
              <button className="text-xs w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-center font-medium hover:bg-gray-100 focus:ring-1 focus:ring-blue-500 transition-colors">
                Histogram
              </button>
            </Link>
          </div>

          <div className="flex flex-col gap-1.5">
            {/* 2. Tombol untuk navigasi ke modul Crossplot */}
            <Link href="crossplot">
               <button className="text-xs w-full bg-gray-50 border border-gray-200 rounded p-1.5 text-center font-medium hover:bg-gray-100 focus:ring-1 focus:ring-blue-500 transition-colors">
                Crossplot
              </button>
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}