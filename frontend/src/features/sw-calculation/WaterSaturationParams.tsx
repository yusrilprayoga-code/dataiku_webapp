'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import { type ParameterRow } from '@/types';
import { Loader2 } from 'lucide-react';

const createInitialSWParameters = (): ParameterRow[] => {
  // Untuk SW, nilai parameter tidak bergantung pada interval, jadi kita hardcode 'default'
  const createValues = (val: string | number) => ({ 'default': val });

  // Definisikan master list parameter yang relevan untuk SW
  const allPossibleParams: Omit<ParameterRow, 'values'>[] = [
    { id: 1, location: 'Interval', mode: 'In_Out', comment: 'Tortuosity constant', unit: '', name: 'A', isEnabled: true },
    { id: 2, location: 'Interval', mode: 'In_Out', comment: 'Cementation Factor', unit: '', name: 'M', isEnabled: true },
    { id: 3, location: 'Interval', mode: 'In_Out', comment: 'Saturation exponent', unit: '', name: 'N', isEnabled: true },
    { id: 4, location: 'Interval', mode: 'In_Out', comment: 'Resistivity of formation water', unit: 'OHMM', name: 'RWS', isEnabled: true },
    { id: 5, location: 'Interval', mode: 'In_Out', comment: 'Temperature of RWS value', unit: 'DEGC', name: 'RWT', isEnabled: true },
    { id: 6, location: 'Interval', mode: 'In_Out', comment: 'Shale resistivity', unit: 'OHMM', name: 'RT_SH', isEnabled: true },
    { id: 7, location: 'Log', mode: 'Input', comment: 'True formation resistivity', unit: 'OHMM', name: 'RT', isEnabled: true },
    { id: 8, location: 'Log', mode: 'Input', comment: 'Limited effective porosity', unit: 'V/V', name: 'PHIE', isEnabled: true },
    { id: 9, location: 'Log', mode: 'Input', comment: 'Limited volume of shale', unit: 'V/V', name: 'VSH', isEnabled: true },
    { id: 10, location: 'Log', mode: 'Input', comment: 'Formation temperature', unit: 'DEGF', name: 'FTEMP', isEnabled: true },
    { id: 11, location: 'Log', mode: 'Output', comment: 'SW from Indonesia', unit: 'V/V', name: 'SW', isEnabled: true },
  ];

  const defaultValues: Record<string, string | number> = {
    RWS: 0.529,
    RWT: 227,
    FTEMP: 80,
    RT_SH: 2.2,
    A: 1.0,
    M: 2.0,
    N: 2.0,
    RT: 'RT',
    PHIE: 'PHIE',
    SW: 'SW',
    VSH: 'VSH'
    };

  // Petakan untuk menghasilkan data awal yang benar
  return allPossibleParams.map(p => ({
    ...p,
    values: createValues(defaultValues[p.name] || '')
  }));
};

export default function SWCalculationParams() {
  const { selectedIntervals, selectedWells, wellColumns } = useDashboard();
  const router = useRouter();
  const [parameters, setParameters] = useState<ParameterRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rowSync, setRowSync] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setParameters(createInitialSWParameters());
  }, []);

  const combinedColumns = selectedWells.flatMap(well => wellColumns[well] || []);

  const handleValueChange = (id: number, interval: string, newValue: string) => {
    setParameters(prev =>
      prev.map(row => {
        if (row.id !== id) return row;

        if (rowSync[id]) {
          const newValues = Object.fromEntries(
            Object.keys(row.values).map(i => [i, newValue])
          );
          return { ...row, values: newValues };
        }

        return {
          ...row,
          values: { ...row.values, [interval]: newValue },
        };
      })
    );
  };

  // Handler untuk checkbox di kolom "P"
  const handleRowToggle = (id: number, enabled: boolean) => {
    setRowSync(prev => ({ ...prev, [id]: enabled }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formParams = parameters
    .filter(p => p.isEnabled)
    .reduce((acc, param) => {
      const value = param.values[selectedIntervals[0] || 'default'] || param.values[Object.keys(param.values)[0]];
      acc[param.name] = isNaN(Number(value)) ? value : Number(value);
      return acc;
    }, {} as Record<string, string | number>);

    const payload = {
      params: formParams,
      selected_wells: selectedWells,
      selected_intervals: selectedIntervals,
    };

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const endpoint = `${apiUrl}api/run-sw-calculation`;

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
      alert(result.message || "Proses kalkulasi SW berhasil!");
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

  const tableHeaders = ['#', 'Location', 'Mode', 'Comment', 'Unit', 'Name', 'P'];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">Water Saturation Input Parameters</h2>

      <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
        {/* Bagian Konfigurasi Atas */}
        <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50 flex flex-col gap-4">
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

        {/* Tabel Parameter */}
        <h3 className="text-lg font-semibold mb-2 flex-shrink-0">Parameters</h3>
        <div className="flex-grow min-h-0 border border-gray-300 rounded-lg">
          <div className="overflow-auto h-full">
            <table className="min-w-full text-sm table-auto">
              <thead className="bg-gray-200 sticky top-0 z-10">
                <tr>
                  {tableHeaders.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">{header}</th>))}
                  {selectedIntervals.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">{header}</th>))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {parameters.map((param) => (
                  <tr key={param.id} className={`border-b border-gray-200 ${param.isEnabled ? getRowBgColor(param.location, param.mode) : 'bg-gray-100 text-gray-400'}`}>
                    <td className="px-3 py-2 border-r text-center">{param.id}</td>
                    <td className="px-3 py-2 border-r whitespace-nowrap">{param.location}</td>
                    <td className="px-3 py-2 border-r whitespace-nowrap">{param.mode}</td>
                    <td className="px-3 py-2 border-r whitespace-normal max-w-xs">{param.comment}</td>
                    <td className="px-3 py-2 border-r whitespace-nowrap">{param.unit}</td>
                    <td className="px-3 py-2 border-r font-semibold whitespace-nowrap">{param.name}</td>
                    <td className="px-3 py-2 border-r text-center"><input type="checkbox" className="h-4 w-4 rounded border-gray-400" checked={!!rowSync[param.id]} onChange={(e) => handleRowToggle(param.id, e.target.checked)} /></td>
                      {selectedIntervals.map(interval => (
                        <td key={`${param.id}-${interval}`} className="px-3 py-2 border-r bg-white text-black">
                          {param.name === 'OPT_GR' ? (
                            <select
                              value={String(param.values[interval] ?? param.values['default'] ?? '')}
                              onChange={(e) => handleValueChange(param.id, interval, e.target.value)}
                              className="w-full min-w-[100px] p-1 bg-white disabled:bg-gray-100 disabled:text-gray-500"
                            >
                              <option value="LINEAR">LINEAR</option>
                            </select>
                          ) : param.name === 'GR' ? (
                            (() => {
                              const filteredOptions: string[] = combinedColumns.filter(col => col.toUpperCase().includes('GR'));
                              return (
                                <select
                                  value={String(param.values[interval] ?? param.values['default'] ?? '')}
                                  onChange={(e) => handleValueChange(param.id, interval, e.target.value)}
                                  className="w-full min-w-[100px] p-1 bg-white disabled:bg-gray-100 disabled:text-gray-500"
                                >
                                  {filteredOptions.length === 0 && <option value="">No match</option>}
                                  {filteredOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              );
                            })()
                          ) : (
                            <input
                              type="text"
                              value={ param.values[interval] ?? param.values['default'] ?? ''}
                              onChange={(e) => handleValueChange(param.id, interval, e.target.value)}
                              className="w-full min-w-[100px] p-1 bg-white text-black disabled:bg-gray-100 disabled:text-gray-500"
                            />
                          )}
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


