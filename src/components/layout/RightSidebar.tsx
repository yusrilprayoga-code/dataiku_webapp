// src/components/layout/RightSidebar.tsx

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface RightSidebarProps {
  activeButton: string | null;
}

interface ModuleSectionProps {
  title?: string;
  buttons: (string | DropdownButton)[];
  activeButton: string | null;
}

interface DropdownButton {
  label: string;
  items: string[];
}

const ModuleSection: React.FC<ModuleSectionProps> = ({ title, buttons, activeButton }) => {
  const [expandedDropdowns, setExpandedDropdowns] = useState<Set<string>>(new Set());

  const toggleDropdown = (label: string) => {
    const newExpanded = new Set(expandedDropdowns);
    if (newExpanded.has(label)) {
      newExpanded.delete(label);
    } else {
      newExpanded.add(label);
    }
    setExpandedDropdowns(newExpanded);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-2">
      {title && <h3 className="text-xs font-bold text-gray-700 mb-1">{title}</h3>}
      <div className="flex flex-col gap-1">
        {buttons.map((btn, index) => {
          if (typeof btn === 'string') {
            // Regular button
            const urlFriendlyBtn = btn.toLowerCase().replace(/\s+/g, '-');
            const href = `/dashboard/modules/${urlFriendlyBtn}`;
            const isActive = activeButton === urlFriendlyBtn;

            return (
              <Link href={href} key={btn}>
                <button
                  className={`w-full text-xs font-medium text-left p-1 rounded border transition-colors duration-200 ${isActive
                    ? 'bg-gray-700 text-white border-gray-800'
                    : 'text-black bg-gray-200 border-gray-300 hover:bg-gray-300'
                    }`}
                >
                  {btn}
                </button>
              </Link>
            );
          } else {
            // Dropdown button
            const isExpanded = expandedDropdowns.has(btn.label);
            
            return (
              <div key={btn.label} className="space-y-0.5">
                <button
                  onClick={() => toggleDropdown(btn.label)}
                  className="w-full text-xs font-medium text-left p-1 rounded border transition-colors duration-200 text-black bg-gray-200 border-gray-300 hover:bg-gray-300 flex items-center justify-between"
                >
                  <span>{btn.label}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
                {isExpanded && (
                  <div className="ml-2 space-y-0.5">
                    {btn.items.map((item) => {
                      // Map dropdown items to their actual route names
                      const getRouteForItem = (itemName: string) => {
                        switch (itemName) {
                          case 'VSH-GR':
                            return 'vsh-calculation';
                          case 'VSH-DN':
                            return 'vsh-dn-calculation';
                          case 'SW INDONESIA':
                            return 'sw-calculation';
                          case 'SW SIMANDOUX':
                            return 'sw-simandoux';
                          case 'RGSA':
                          case 'DGSA':
                          case 'NGSA':
                            return 'rgsa-ngsa-dgsa';
                          default:
                            return itemName.toLowerCase().replace(/\s+/g, '-');
                        }
                      };

                      const routeName = getRouteForItem(item);
                      const href = `/dashboard/modules/${routeName}`;
                      const isActive = activeButton === routeName;

                      return (
                        <Link href={href} key={item}>
                          <button
                            className={`w-full text-xs font-normal text-left p-1 rounded border transition-colors duration-200 ${isActive
                              ? 'bg-gray-700 text-white border-gray-800'
                              : 'text-gray-700 bg-gray-100 border-gray-200 hover:bg-gray-200'
                              }`}
                          >
                            {item}
                          </button>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
        })}
      </div>
    </div>
  );
};

const RightSidebar: React.FC<RightSidebarProps> = ({ activeButton }) => {

  // const module1Buttons: string[] = ['ADD PLOT', 'OPEN CROSS PLOT'];
  const qualityControlButtons: (string | DropdownButton)[] = ['HISTOGRAM', 'CROSSPLOT', 'TRIM DATA', 'SPLICING/MERGING', 'DEPTH MATCHING', 'FILL MISSING', 'SMOOTHING', 'NORMALIZATION'];
  
  const logInterpretationButtons: (string | DropdownButton)[] = [
    {
      label: 'VSH CALCULATION',
      items: ['VSH-GR', 'VSH-DN']
    },
    'POROSITY CALCULATION', 
    {
      label: 'SW CALCULATION',
      items: ['SW INDONESIA', 'SW SIMANDOUX']
    },
    'WATER RESISTIVITY CALCULATION'
  ];
  
  const gowsButtons: (string | DropdownButton)[] = [
    {
      label: 'GSA',
      items: ['RGSA', 'DGSA', 'NGSA']
    },
    'RGBE-RPBE', 
    'SWGRAD', 
    'DNS-DNSV', 
    'RT RO', 
    'GWD'
  ];

  return (
    <aside className="w-52 bg-gray-100 flex flex-col gap-2 p-2 border-l border-gray-300 overflow-y-auto h-screen">
      <div className="text-xs font-bold text-gray-800 px-2 py-1">Module Configuration</div>
      <div className="flex flex-col gap-2">
        {/* <ModuleSection buttons={['RENAME']} activeButton={activeButton} />
        <ModuleSection buttons={module1Buttons} activeButton={activeButton} /> */}
        <ModuleSection title="Data Preparation" buttons={qualityControlButtons} activeButton={activeButton} />
        <ModuleSection title="Interpretation" buttons={logInterpretationButtons} activeButton={activeButton} />
        <ModuleSection title="Gas Oil Water Scanner (GOWS)" buttons={gowsButtons} activeButton={activeButton} />
      </div>
    </aside>
  );
};

export default RightSidebar;
