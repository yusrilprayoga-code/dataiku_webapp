// src/components/layout/RightSidebar.tsx

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Map button names to their actual route names
const getRouteForItem = (itemName: string) => {
  switch (itemName) {
    // Analysis Tools
    case 'HISTOGRAM':
      return 'histogram';
    case 'CROSSPLOT':
      return 'crossplot';
    
    // VSH Calculation routes
    case 'VSH-GR':
      return 'vsh-calculation';
    case 'VSH-DN':
      return 'vsh-dn-calculation';
    
    // SW Calculation routes  
    case 'SW INDONESIA':
      return 'sw-calculation';
    case 'SW SIMANDOUX':
      return 'sw-simandoux';
    
    // RGSA routes
    case 'RGSA':
      return 'rgsa';
    case 'DGSA':
      return 'dgsa';
    case 'NGSA':
      return 'ngsa';

    // Data Preparation routes
    case 'TRIM DATA':
      return 'trim-data';
    case 'DEPTH MATCHING':
      return 'depth-matching';
    case 'FILL MISSING':
      return 'fill-missing';
    case 'SMOOTHING':
      return 'smoothing';
    case 'NORMALIZATION':
      return 'normalization';
    case 'SPLICING/MERGING':
      return 'splicing-merging';
    case 'POROSITY CALCULATION':
      return 'porosity-calculation';
    case 'WATER RESISTIVITY CALCULATION':
      return 'water-resistivity-calculation';
    case 'IQUAL':
      return 'iqual';
    case 'RGBE-RPBE':
      return 'rgbe-rpbe';
    case 'AUTO FLUID':
      return 'auto-fluid';
    case 'RT RO':
      return 'rt-ro';
    case 'SWGRAD':
      return 'swgrad';
    case 'DNS-DNSV':
      return 'dns-dnsv';
    case 'GWD':
      return 'gwd';
    case 'PLOT-DM':
      return 'plot-dm';

    default:
      return itemName.toLowerCase().replace(/\s+/g, '-');
  }
};

interface RightSidebarProps {
  activeButton: string | null;
}

interface ModuleSectionProps {
  title?: string;
  buttons: (string | DropdownButton)[];
  activeButton: string | null;
  routePrefix: string; // '/dashboard/modules' or '/data-prep/modules'
}

interface DropdownButton {
  label: string;
  items: string[];
}

const ModuleSection: React.FC<ModuleSectionProps> = ({ title, buttons, activeButton, routePrefix }) => {
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
        {buttons.map((btn) => {
          if (typeof btn === 'string') {
            // Regular button - use global route mapping
            const routeName = getRouteForItem(btn);
            const href = `${routePrefix}/${routeName}`;
            const isActive = activeButton === routeName;

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
                      // Use global route mapping function
                      const routeName = getRouteForItem(item);
                      const href = `${routePrefix}/${routeName}`;
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
  const pathname = usePathname();
  const isDataPrep = pathname.startsWith('/data-prep');

  // const module1Buttons: string[] = ['ADD PLOT', 'OPEN CROSS PLOT'];
  const qualityControlButtons: (string | DropdownButton)[] = ['TRIM DATA', 'DEPTH MATCHING', 'FILL MISSING', 'SMOOTHING', 'NORMALIZATION', 'SPLICING/MERGING'];
  
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
    'IQUAL',
    'RGBE-RPBE', 
    'AUTO FLUID',
    'RT RO',
    'SWGRAD', 
    'DNS-DNSV', 
    'GWD'
  ];
  
  const dataPrepQualityControlButtons: (string | DropdownButton)[] = [
    'TRIM DATA', 
    'DEPTH MATCHING', 
    'FILL MISSING', 
    'SMOOTHING', 
    'NORMALIZATION', 
    'SPLICING/MERGING',
    // 'PLOT-DM'
  ];
  
  const routePrefix = isDataPrep ? '/data-prep/modules' : '/dashboard/modules';
  const sidebarTitle = isDataPrep ? 'Data Preparation' : 'Module Configuration';

  return (
    <aside className="w-52 bg-gray-100 flex flex-col gap-2 p-2 border-l border-gray-300 overflow-y-auto h-screen">
      <div className="text-xs font-bold text-gray-800 px-2 py-1">{sidebarTitle}</div>
      <div className="flex flex-col gap-2">
        {isDataPrep ? (
          // Show all modules for data-prep routes - same as dashboard but in data-prep context
          <>
            <ModuleSection title="Data Preparation" buttons={dataPrepQualityControlButtons} activeButton={activeButton} routePrefix={routePrefix} />
            <ModuleSection title="Interpretation" buttons={logInterpretationButtons} activeButton={activeButton} routePrefix={routePrefix} />
            <ModuleSection title="Gas Oil Water Scanner (GOWS)" buttons={gowsButtons} activeButton={activeButton} routePrefix={routePrefix} />
          </>
        ) : (
          // Show all modules for dashboard routes
          <>
            {/* <ModuleSection buttons={['RENAME']} activeButton={activeButton} routePrefix={routePrefix} />
            <ModuleSection buttons={module1Buttons} activeButton={activeButton} routePrefix={routePrefix} /> */}
            <ModuleSection title="Data Preparation" buttons={qualityControlButtons} activeButton={activeButton} routePrefix={routePrefix} />
            <ModuleSection title="Interpretation" buttons={logInterpretationButtons} activeButton={activeButton} routePrefix={routePrefix} />
            <ModuleSection title="Gas Oil Water Scanner (GOWS)" buttons={gowsButtons} activeButton={activeButton} routePrefix={routePrefix} />
          </>
        )}
      </div>
    </aside>
  );
};

export default RightSidebar;
