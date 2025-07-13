"use client";

import { PlotType, useDashboard } from '@/contexts/DashboardContext';
import { useEffect, useState } from 'react';

// Menentukan tipe untuk props dari komponen SidebarButton
// interface SidebarButtonProps {
//   label: string;
//   isActive: boolean;
//   onClick: () => void;
// }

// const SidebarButton: React.FC<SidebarButtonProps> = ({ label, isActive, onClick }) => {
//   const baseClasses = "w-full text-left text-sm p-2.5 rounded border border-gray-300 transition-colors duration-200";
//   const activeClasses = "bg-gray-600 text-white font-bold border-gray-500";
//   const inactiveClasses = "bg-gray-200 hover:bg-gray-300 text-black";

//   return (
//     <button className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`} onClick={onClick}>
//       {label}
//     </button>
//   );
// };

export default function LeftSidebar() {
  const { availableWells, selectedWells, toggleWellSelection, availableIntervals, selectedIntervals, toggleInterval, plotType, 
    setPlotType } = useDashboard();
  
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <aside className="w-52 bg-gray-100 p-4 flex flex-col gap-6 border-r border-gray-300 overflow-y-auto">
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-2 pb-1 border-b border-gray-300">Well Data</h3>
        <div className="flex flex-col gap-1.5">
          {!isMounted ? (
            // Tampilkan skeleton/placeholder loading
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
                  // PASTIKAN: onChange di sini HANYA memanggil toggleWellSelection
                  onChange={() => toggleWellSelection(well)}
                />
                <span className="text-sm font-medium">{well}</span>
              </label>
            ))
          )}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-2 pb-1 border-b border-gray-300">Interval</h3>
        <div className="flex flex-col gap-1.5">
          {availableIntervals.map(interval => (
            <label key={interval} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-200 cursor-pointer">
              <input 
                type="checkbox" 
                className="h-4 w-4 rounded"
                checked={selectedIntervals.includes(interval)}
                onChange={() => toggleInterval(interval)}
              />
              <span className="text-sm">{interval}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
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
            <option value="vsh">Plot VSH</option>
            <option value="porosity">Plot Porosity</option>
            <option value="sw">Plot Water Saturation</option>
            <option value="rwa">Plot Water Resistivity</option>
            <option value="gsa">Plot GSA</option>
          </select>
        </div>
      </div>
    </aside>
  );
}