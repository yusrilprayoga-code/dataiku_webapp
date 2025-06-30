'use client';

import React, { useState, useEffect } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { type ParameterRow } from '@/types';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Komponen helper untuk Form Field
// const FormField: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
//     <div className={className}>
//         <label className="block text-sm font-medium text-gray-500 mb-1">{label}</label>
//         {children}
//     </div>
// );

const createInitialParameters = (intervals: string[]): ParameterRow[] => {
  const createValues = (val: string | number) => Object.fromEntries(intervals.map(i => [i, val]));

  // Definisikan master list dari semua parameter yang mungkin
  const allPossibleParams: Omit<ParameterRow, 'values'>[] = [
    { id: 1, location: 'Constant', mode: 'Input', comment: 'window wide of sliding average', unit: 'METRES', name: 'SLIDING_WINDOW', isEnabled: true },
    // { id: 2, location: 'Constant', mode: 'Input', comment: 'Maximum resistivity in water zone', unit: 'OHMM', name: 'RESWAT_MAX', isEnabled: true },
    // { id: 3, location: 'Constant', mode: 'Input', comment: 'Minimum resistivity in water zone', unit: 'OHMM', name: 'RESWAT_MIN', isEnabled: true },
    // { id: 4, location: 'Constant', mode: 'Input', comment: 'Maximum hydrogen index in water zone', unit: 'OHMM', name: 'NPHIWATER_MAX', isEnabled: true },
    // { id: 5, location: 'Constant', mode: 'Input', comment: 'Minimum hydrogen index in water zone', unit: 'OHMM', name: 'NPHIWATER_MIN', isEnabled: true },
    // { id: 6, location: 'Constant', mode: 'Input', comment: 'Maximum density in water zone', unit: 'OHMM', name: 'RHOBWAT_MAX', isEnabled: true },
    // { id: 7, location: 'Constant', mode: 'Input', comment: 'Minimum density in water zone', unit: 'OHMM', name: 'RHOBWAT_MIN', isEnabled: true },
    // { id: 2, location: 'Log', mode: 'Input', comment: 'Downhole depth', unit: 'METRES', name: 'DEPTH', isEnabled: true },
    { id: 3, location: 'Log', mode: 'Input', comment: 'Input gamma ray log', unit: 'GAPI', name: 'GR', isEnabled: true },
    { id: 4, location: 'Log', mode: 'Input', comment: 'Input density log', unit: 'G/C3', name: 'DENS', isEnabled: true },
    { id: 5, location: 'Log', mode: 'Input', comment: 'Input neutron log', unit: 'V/V', name: 'NEUT', isEnabled: true },
    { id: 6, location: 'Log', mode: 'Input', comment: 'Input resistivity log', unit: 'OHMM', name: 'RES', isEnabled: true },
    // { id: 13, location: 'Log', mode: 'Input', comment: 'lithology', unit: 'ALPHA*10', name: 'LITHOLOGY', isEnabled: true },
    // { id: 14, location: 'Log', mode: 'Output', comment: 'Reference curve for resisitivity', unit: 'OHMM', name: 'RGSA', isEnabled: true },
    // { id: 15, location: 'Log', mode: 'Output', comment: 'Reference curve for density', unit: 'G/C3', name: 'DGSA', isEnabled: true },
    // { id: 16, location: 'Log', mode: 'Output', comment: 'Reference curve for neutron', unit: 'V/V', name: 'NGSA', isEnabled: true },
  ];

  const relevantParamNames = new Set([
    'SLIDING_WINDOW',
    // 'RESWAT_MAX', 'RESWAT_MIN', 'NPHIWATER_MAX', 'NPHIWATER_MIN', 'RHOBWAT_MAX', 'RHOBWAT_MIN', 'DEPTH', 
    'GR', 'DENS', 'NEUT', 'RES',
    // 'LITHOLOGY', 'RGSA', 'DGSA', 'NGSA'
  ]);

  // 2. Definisikan nilai default sesuai gambar
  const defaultValues: Record<string, string | number> = {
    'SLIDING_WINDOW': 100,
    // 'RESWAT_MAX': 10, 'RESWAT_MIN': 1, 'NPHIWATER_MAX': 0.3,
    // 'NPHIWATER_MIN': 0, 'RHOBWAT_MAX': 3, 'RHOBWAT_MIN': 1, 
    // 'DEPTH': 'DEPTH',
    'GR': 'GR', 'DENS': 'RHOB', 'NEUT': 'NPHI', 'RES': 'RT',
    // 'LITHOLOGY': 'LAYERING_LITHO.LITHO', 'RGSA': 'RGSA', 'DGSA': 'DGSA', 'NGSA': 'NGSA'
  };

  return allPossibleParams
    .filter(p => relevantParamNames.has(p.name))
    .map(p => ({
      ...p,
      values: createValues(defaultValues[p.name] || '')
    }));
};

export default function GsaCalculationParams() {
  const { selectedWells, selectedIntervals } = useDashboard();
  const [parameters, setParameters] = useState<ParameterRow[]>([]);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { setParameters(createInitialParameters(selectedIntervals)); }, [selectedIntervals]);

  const handleUnifiedValueChange = (id: number, newValue: string) => { setParameters(prev => prev.map(row => { if (row.id === id) { const newValues = Object.fromEntries(Object.keys(row.values).map(intervalKey => [intervalKey, newValue])); return { ...row, values: newValues }; } return row; })); };
  const handleRowToggle = (id: number, isEnabled: boolean) => { setParameters(prev => prev.map(row => (row.id === id ? { ...row, isEnabled } : row))); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formParams = parameters
      .filter(p => p.isEnabled)
      .reduce((acc, param) => {
        const value = param.values[selectedIntervals[0] || 'default'] || param.values[Object.keys(param.values)[0]];
        acc[param.name] = value;
        return acc;
      }, {} as Record<string, string | number>);

    const payload = {
      params: formParams,
      selected_wells: selectedWells,
      selected_intervals: selectedIntervals
    };

    console.log("Payload yang dikirim ke backend:", payload);


    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const endpoint = `${apiUrl}/api/run-gsa-calculation`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error');
      }

      const result = await response.json();
      alert(result.message || "Proses kalkulasi RGSA, NGSA, DGSA berhasil!");
      router.push('/dashboard');

    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRowBgColor = (location: string, mode: string): string => {
    switch (location) {
      case 'Parameter':
        return 'bg-orange-600';

      case 'Constant':
        if (mode === 'Input') {
          return 'bg-yellow-300';
        } else {
          return 'bg-yellow-100';
        }

      case 'Log':
        if (mode === 'Input') {
          return 'bg-cyan-400';
        } else {
          return 'bg-cyan-200';
        }

      case 'Output':
        return 'bg-yellow-600';

      case 'Interval':
        return 'bg-green-400';

      default:
        return 'bg-white';
    }
  };
  const staticHeaders = ['#', 'Location', 'Mode', 'Comment', 'Unit', 'Name', 'P'];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">Computer reference logs for depth matching.</h2>

      <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
        <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4 items-start">
            {/* Baris informasi */}
            <div className="md:col-span-4">
              <p className="text-sm font-medium text-gray-700">Well: {selectedWells + ', ' || 'N/A'} / Intervals: {selectedIntervals.length} selected</p>
            </div>

            {/* Baris input */}
            {/* <FormField label="Input Set">
                    <button type="button" onClick={() => alert('Popup pilihan Input Set')} className="text-sm p-2 w-full bg-white border border-gray-300 rounded-md text-left shadow-sm hover:border-blue-500">WIRE</button>
                </FormField>
                <FormField label="Output Set">
                    <button type="button" onClick={() => alert('Popup pilihan Output Set')} className="text-sm p-2 w-full bg-white border border-gray-300 rounded-md text-left shadow-sm hover:border-blue-500">WDE</button>
                </FormField>
                <FormField label="Sampling Log">
                    <select className="text-sm p-2 w-full bg-white border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                        <option>Use finest</option>
                        <option>Use coarsest</option>
                    </select>
                </FormField>
                <FormField label="Reference">
                    <select className="text-sm p-2 w-full bg-white border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                        <option>DEPTH</option>
                        <option>TVD</option>
                    </select>
                </FormField> */}
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <button type="button" className="px-6 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 font-semibold">Cancel</button>
            <button type="submit" className="px-6 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Start'}
            </button>
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-2 flex-shrink-0">Parameters</h3>
        <div className="flex-grow min-h-0 border border-gray-300 rounded-lg">
          <div className="overflow-auto h-full">
            <table className="min-w-full text-sm table-auto">
              <thead className="bg-gray-200 sticky top-0 z-10">
                <tr>
                  {staticHeaders.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">{header}</th>))}
                  {selectedIntervals.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">{header}</th>))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {parameters.map((param) => (
                  <tr key={param.id} className={`border-b border-gray-200 ${param.isEnabled ? getRowBgColor(param.location, param.mode) : 'bg-gray-100 text-gray-400'}`}>

                    {/* Kolom statis (ID, Location, dll.) tidak berubah */}
                    <td className="px-3 py-2 border-r text-center text-sm">{param.id}</td>
                    <td className="px-3 py-2 border-r whitespace-nowrap text-sm">{param.location}</td>
                    <td className="px-3 py-2 border-r whitespace-nowrap text-sm">{param.mode}</td>
                    <td className="px-3 py-2 border-r whitespace-normal max-w-xs text-sm">{param.comment}</td>
                    <td className="px-3 py-2 border-r whitespace-nowrap text-sm">{param.unit}</td>
                    <td className="px-3 py-2 border-r font-semibold whitespace-nowrap text-sm">{param.name}</td>

                    {/* Kolom 'P' untuk Checkbox */}
                    <td className="px-3 py-2 border-r text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-400"
                        checked={param.isEnabled}
                        onChange={(e) => handleRowToggle(param.id, e.target.checked)}
                      />
                    </td>

                    {/* Kolom dinamis untuk setiap interval */}
                    {selectedIntervals.map(interval => (
                      <td key={interval} className="px-3 py-2 border-r bg-white">
                        <input
                          type="text"
                          value={param.values[interval] ?? ''}
                          onChange={(e) => handleUnifiedValueChange(param.id, e.target.value)}
                          disabled={!param.isEnabled}
                          className="w-full min-w-[100px] p-1 bg-white text-black disabled:bg-gray-100 disabled:text-gray-500"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </form>
    </div>
  );
}