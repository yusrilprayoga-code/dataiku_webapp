"use client";

import React, { useState } from 'react';

// Menentukan tipe untuk props dari komponen SidebarButton
interface SidebarButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ label, isActive, onClick }) => {
  const baseClasses = "w-full text-left text-sm p-2.5 rounded border border-gray-300 transition-colors duration-200";
  const activeClasses = "bg-gray-600 text-white font-bold border-gray-500";
  const inactiveClasses = "bg-gray-200 hover:bg-gray-300 text-black";

  return (
    <button className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`} onClick={onClick}>
      {label}
    </button>
  );
};

const LeftSidebar: React.FC = () => {
  const wellData: string[] = ['ABAB-001', 'ABAB-002', 'ABAB-003', 'ABAB-004', 'ABAB-035'];
  const intervals: string[] = ['A', 'B', 'B1', 'GUF', 'TUF', 'Upper_BTS'];
  
  // Menentukan tipe state secara eksplisit
  const [activeWell, setActiveWell] = useState<string>('ABAB-035');
  const [activeInterval, setActiveInterval] = useState<string>('B1');

  return (
    <aside className="w-52 bg-gray-100 p-4 flex flex-col gap-6 border-r border-gray-300 overflow-y-auto">
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-2 pb-1 border-b border-gray-300">Well Data</h3>
        <div className="flex flex-col gap-1.5">
          {wellData.map(well => (
            <SidebarButton key={well} label={well} isActive={activeWell === well} onClick={() => setActiveWell(well)} />
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-2 pb-1 border-b border-gray-300">Interval</h3>
        <div className="flex flex-col gap-1.5">
          {intervals.map(interval => (
            <SidebarButton key={interval} label={interval} isActive={activeInterval === interval} onClick={() => setActiveInterval(interval)} />
          ))}
        </div>
      </div>
      <div className="mt-auto">
         <SidebarButton label="HOME" onClick={() => { /* Logika untuk Home */ }} isActive={false} />
      </div>
    </aside>
  );
};

export default LeftSidebar;