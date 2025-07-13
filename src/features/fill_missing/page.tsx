'use client';

import React, { useMemo, useState } from 'react';
import { useDashboard } from '@/contexts/DashboardContext';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import { Loader2 } from 'lucide-react';

export default function FillMissingPage() {
  const { selectedWells, wellColumns } = useDashboard();
  const router = useRouter();

  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const excludedLogs = ['DEPTH', 'STRUKTUR', 'WELL_NAME', 'CALI', 'SP'];
  const includedLogs = ['RHOB', 'NPHI', 'GR', 'RT'];

  const combinedLogs = useMemo(() => {
  if (!selectedWells || selectedWells.length === 0) return [];

  return Array.from(
    new Set(
      selectedWells.flatMap(well => wellColumns[well] || [])
    )
  )
    .filter(log => !excludedLogs.includes(log.toUpperCase()))
    .filter(log =>
      includedLogs.some(keyword =>
        log.toUpperCase().includes(keyword)
      )
    );
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedWells, wellColumns]);

  const options = combinedLogs.map(log => ({ label: log, value: log }));
  console.log('Available logs:', options);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:5001/api/fill-null-marker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_wells: selectedWells,
          selected_logs: selectedLogs,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        alert(`✅ ${result.message}`);
      } else {
        alert(`❌ ${result.error || 'Gagal menjalankan pengisian'}`);
      }
      router.push('/dashboard');
    } catch (error) {
      console.error(error);
      alert('❌ Terjadi error saat menghubungi backend.');
      router.push('/dashboard');
    } finally {
      setIsSubmitting(false);
    }
  };

  const staticHeaders = ['#', 'Location', 'Mode', 'Comment', 'Unit', 'Name', 'Value'];

  const getRowBgColor = (location: string, mode: string): string => {
    if (location === 'Constant' && mode === 'Input') return 'bg-yellow-300';
    if (location === 'Log' && mode === 'Input') return 'bg-cyan-400';
    return 'bg-white';
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Fill Missing Values by Marker</h2>

      <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
        <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
          <p className="text-sm font-medium text-gray-700 mb-2">
            Wells: {selectedWells.length > 0 ? selectedWells.join(', ') : 'N/A'}
          </p>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 rounded-md text-gray-800 bg-gray-200 hover:bg-gray-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Start'}
            </button>
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-2 flex-shrink-0">Parameters</h3>
        <div className="flex-grow min-h-0 border border-gray-300 rounded-lg overflow-auto">
          <table className="min-w-full text-sm table-auto">
            <thead className="bg-gray-200 sticky top-0 z-10">
              <tr>
                {staticHeaders.map(header => (
                  <th key={header} className="px-3 py-2 text-center font-semibold text-gray-700 border-b border-r border-gray-600 whitespace-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              <tr className={`${getRowBgColor('Log', 'Input')} border-b`}>
                <td className="px-3 py-2 border-r text-center">1</td>
                <td className="px-3 py-2 border-r">Log</td>
                <td className="px-3 py-2 border-r">Input</td>
                <td className="px-3 py-2 border-r">Select target logs for null-filling</td>
                <td className="px-3 py-2 border-r">LOG</td>
                <td className="px-3 py-2 border-r font-semibold">LOG_IN</td>
                <td className="px-3 py-2  bg-white text-black">
                  <Select
                    isMulti
                    options={options}
                    value={options.filter(opt => selectedLogs.includes(opt.value))}
                    onChange={(selected) => setSelectedLogs(selected.map(s => s.value))}
                    className="min-w-[200px] text-black bg-white"
                    classNamePrefix="react-select"
                    menuPortalTarget={typeof window !== 'undefined' ? document.body : null}
                    styles={{
                      menuPortal: base => ({ ...base, zIndex: 9999 }),
                      option: (baseStyles, state) => ({
                          ...baseStyles,
                          color: 'black', 
                          backgroundColor: state.isFocused ? '#f0f0f0' : 'white',
                          '&:active': {
                              backgroundColor: '#e0e0e0',
                          },
                      }),
                    }}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </form>
    </div>
  );
}
