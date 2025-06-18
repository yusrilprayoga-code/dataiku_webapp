'use client';

import React from 'react';
import Link from 'next/link'; // Impor komponen Link

interface RightSidebarProps {
  activeButton: string | null;
  onButtonClick: (buttonName: string) => void;
}

interface ModuleSectionProps {
  title?: string;
  buttons: string[];
  activeButton: string | null;
}

const ModuleSection: React.FC<ModuleSectionProps> = ({ title, buttons, activeButton }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
    {title && <h4 className="text-xs font-bold text-gray-700 mb-3 pb-1.5 border-b border-gray-300">{title}</h4>}
    <div className="flex flex-col gap-2">
      {buttons.map(btn => {
        const isActive = activeButton === btn;
        // Buat href URL-friendly (huruf kecil, ganti spasi dengan strip)
        const href = `/dashboard/${btn.toLowerCase().replace(/\s+/g, '-')}`;
        
        return (
          // FIX: Gunakan komponen <Link> sebagai pembungkus
          <Link href={href} key={btn}>
            <button
              className={`w-full text-sm font-semibold text-left p-3 rounded border transition-colors duration-200 ${
                isActive
                  ? 'bg-gray-700 text-white border-gray-800'
                  : 'text-black bg-gray-200 border-gray-300 hover:bg-gray-300'
              }`}
            >
              {btn}
            </button>
          </Link>
        );
      })}
    </div>
  </div>
);

const RightSidebar: React.FC<RightSidebarProps> = ({ activeButton }) => {
  const module1Buttons: string[] = ['ADD PLOT', 'OPEN CROSS PLOT', 'TRIM DATA'];
  const qualityControlButtons: string[] = ['FILL MISSING', 'SMOOTHING', 'NORMALIZATION'];
  const logInterpretationButtons: string[] = ['VSH CALCULATION', 'POROSITY CALCULATION', 'SW CALCULATION', 'WATER RESISTIVITY CALCULATION'];
  const gowsButtons: string[] = ['RGSA-NGSA-DGSA', 'RPBE-ROBE', 'SWORAD', 'DNS-DNSV', 'GWD'];

  return (
    <aside className="w-72 bg-gray-100 p-4 border-l border-gray-300 overflow-y-auto">
      <h3 className="text-sm font-bold text-gray-800 mb-4">Module Configuration</h3>
      <div className="flex flex-col gap-4">
        {/* Tidak perlu lagi mengirim onButtonClick, karena Link yang menangani navigasi */}
        <ModuleSection buttons={['RENAME']} activeButton={activeButton} />
        <ModuleSection buttons={module1Buttons} activeButton={activeButton} />
        <ModuleSection title="Module 1 - Quality Control" buttons={qualityControlButtons} activeButton={activeButton} />
        <ModuleSection title="Module 2 - Log Interpretation" buttons={logInterpretationButtons} activeButton={activeButton} />
        <ModuleSection title="Module 3 - Gas Oil Water Scanner (GOWS)" buttons={gowsButtons} activeButton={activeButton} />
      </div>
    </aside>
  );
};

export default RightSidebar;