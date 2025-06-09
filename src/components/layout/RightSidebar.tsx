import React from 'react';

// Tipe untuk props ModuleSection, `title` bersifat opsional (?)
interface ModuleSectionProps {
  title?: string;
  buttons: string[];
}

const ModuleSection: React.FC<ModuleSectionProps> = ({ title, buttons }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
    {title && <h4 className="text-xs font-bold text-gray-700 mb-3 pb-1.5 border-b border-gray-300">{title}</h4>}
    <div className="flex flex-col gap-2">
      {buttons.map(btn => (
        <button key={btn} className="w-full text-sm text-black bg-gray-200 p-3 rounded border border-gray-300 hover:bg-gray-300 transition-colors duration-200">
          {btn}
        </button>
      ))}
    </div>
  </div>
);

const RightSidebar: React.FC = () => {
  const module1Buttons: string[] = ['ADD PLOT', 'OPEN CROSS PLOT', 'TRIM DATA'];
  const qualityControlButtons: string[] = ['FILL MISSING', 'SMOOTHING', 'NORMALIZATION'];
  const logInterpretationButtons: string[] = ['VSH CALCULATION', 'POROSITY CALCULATION', 'SW CALCULATION', 'WATER RESISTIVITY CALCULATION'];
  const gdwsButtons: string[] = ['RGSA-NGSA-DGSA', 'RPBE-ROBE', 'SWORAD', 'DNS-DNSV', 'GWD'];

  return (
    <aside className="w-72 bg-gray-100 p-4 border-l border-gray-300 overflow-y-auto">
      <h3 className="text-sm font-bold text-gray-800 mb-4">Module Configuration</h3>
      <div className="flex flex-col gap-4">
        <ModuleSection buttons={['RENAME']} />
        <ModuleSection buttons={module1Buttons} />
        <ModuleSection title="Module 1 - Quality Control" buttons={qualityControlButtons} />
        <ModuleSection title="Module 2 - Log Interpretation" buttons={logInterpretationButtons} />
        <ModuleSection title="Module 3 - Gas Oil Water Scanner (GOWS)" buttons={gdwsButtons} />
      </div>
    </aside>
  );
};

export default RightSidebar;