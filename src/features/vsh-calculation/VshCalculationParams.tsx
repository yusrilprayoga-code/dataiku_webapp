'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import { type ParameterRow } from '@/types';
import { Loader2, Settings } from 'lucide-react';
import { useAppDataStore } from '@/stores/useAppDataStore';

const createInitialVshParameters = (selection: string[]): ParameterRow[] => {
  // Jika tidak ada interval dipilih, gunakan satu kolom 'default' agar UI tetap muncul
  const effectiveSelection = selection.length > 0 ? selection : ['default'];
  const createValues = (val: string | number) => Object.fromEntries(effectiveSelection.map(i => [i, val]));

  // Definisikan master list parameter yang relevan untuk VSH
  const allPossibleParams: Omit<ParameterRow, 'values'>[] = [
    { id: 1, location: 'Interval', mode: 'In_Out', comment: 'Option for VSH from gamma ray', unit: 'ALPHA*8', name: 'OPT_GR', isEnabled: true },
    { id: 2, location: 'Interval', mode: 'In_Out', comment: 'Gamma ray matrix (clean)', unit: 'GAPI', name: 'GR_MA', isEnabled: true },
    { id: 3, location: 'Interval', mode: 'In_Out', comment: 'Gamma ray shale', unit: 'GAPI', name: 'GR_SH', isEnabled: true },
    // { id: 4, location: 'Interval', mode: 'In_Out', comment: 'Option to allow coal logic', unit: 'LOGICAL', name: 'OPT_COAL', isEnabled: true },
    { id: 4, location: 'Log', mode: 'Input', comment: 'Gamma ray log', unit: 'GAPI', name: 'GR', isEnabled: true },
    { id: 5, location: 'Log', mode: 'Output', comment: 'VSH from gamma ray', unit: 'V/V', name: 'VSH_LINEAR', isEnabled: true },
  ];

  // Definisikan nilai default
  const defaultValues: Record<string, string | number> = {
    'OPT_GR': 'LINEAR',
    'GR_MA': 30,
    'GR_SH': 120,
    'GR': 'GR',
    'VSH_LINEAR': 'VSH_LINEAR',
  };

  // Petakan untuk menghasilkan data awal yang benar
  return allPossibleParams.map(p => ({
    ...p,
    values: createValues(defaultValues[p.name] || '')
  }));
};

export default function VshCalculationParams() {
  const { selectedIntervals, selectedWells, selectedZones } = useDashboard();
  const router = useRouter();
  const [parameters, setParameters] = useState<ParameterRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingDefaults, setIsFetchingDefaults] = useState(false);
  const [rowSync, setRowSync] = useState<Record<number, boolean>>({});
  const { setVshParams, wellsDir } = useAppDataStore();
  const [fetchPerZone, setFetchPerZone] = useState(false);

  // Determine which intervals/zones to use based on priority
  const isUsingZones = selectedZones.length > 0;

  useEffect(() => {
    const effectiveSelection = selectedZones.length > 0 ? selectedZones : selectedIntervals;
    setParameters(createInitialVshParameters(effectiveSelection));
  }, [selectedIntervals, selectedZones]);

  // --- MODIFIED: Enhanced useEffect to handle fetchPerZone logic ---
  useEffect(() => {
    const fetchGrDefaults = async () => {
      if (selectedWells.length === 0) return;

      setIsFetchingDefaults(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      
      try {
        if (fetchPerZone && isUsingZones) {
          // Fetch parameters for each zone individually
          const zonePromises = selectedZones.map(async (zone) => {
            const response = await fetch(`${apiUrl}/api/get-gr-ma-sh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                full_path: wellsDir,
                selected_wells: selectedWells,
                selected_intervals: [], // Empty for zone-specific fetching
                selected_zones: [zone], // Single zone
              }),
            });

            if (!response.ok) {
              console.error(`Gagal mengambil nilai default GR untuk zone ${zone}.`);
              return null;
            }
            
            const data = await response.json();
            return { zone, data };
          });

          const zoneResults = await Promise.all(zonePromises);
          
          setParameters(prevParams =>
            prevParams.map(param => {
              if (param.name === "GR_MA" || param.name === "GR_SH") {
                const newValues = { ...param.values };
                
                zoneResults.forEach(result => {
                  if (result) {
                    newValues[result.zone] = param.name === "GR_MA" ? result.data.gr_ma : result.data.gr_sh;
                  }
                });
                
                return { ...param, values: newValues };
              }
              return param;
            })
          );
        } else {
          // Fetch aggregated parameters for all zones/intervals
          const response = await fetch(`${apiUrl}/api/get-gr-ma-sh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              full_path: wellsDir,
              selected_wells: selectedWells,
              selected_intervals: selectedIntervals,
              selected_zones: selectedZones,
            }),
          });

          if (!response.ok) {
            console.error("Gagal mengambil nilai default GR dari autoplot.");
            return;
          }
          
          const data = await response.json();
          
          setParameters(prevParams =>
            prevParams.map(param => {
              if (param.name === "GR_MA") {
                const newValues = Object.fromEntries(Object.keys(param.values).map(key => [key, data.gr_ma]));
                return { ...param, values: newValues };
              }
              if (param.name === "GR_SH") {
                const newValues = Object.fromEntries(Object.keys(param.values).map(key => [key, data.gr_sh]));
                return { ...param, values: newValues };
              }
              return param;
            })
          );
        }
      } catch (error) {
        console.error("Error saat memanggil API get-gr-ma-sh:", error);
      } finally {
        setIsFetchingDefaults(false);
      }
    };

    fetchGrDefaults();
  }, [selectedWells, selectedIntervals, selectedZones, wellsDir, fetchPerZone, isUsingZones]);
  // Added fetchPerZone and isUsingZones to dependency array
  // ----------------------------------------------------------------------

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

    // Use the effective selection for value extraction
    const firstActiveKey = isUsingZones
      ? (selectedZones[0] || 'default')
      : (selectedIntervals[0] || 'default');

    const formParams = parameters
      .filter(p => p.isEnabled)
      .reduce((acc, param) => {
        const value = param.values[firstActiveKey] || param.values[Object.keys(param.values)[0]];
        acc[param.name] = isNaN(Number(value)) ? value : Number(value);
        return acc;
      }, {} as Record<string, string | number>);

    setVshParams({
      gr_ma: Number(formParams.GR_MA),
      gr_sh: Number(formParams.GR_SH)
    });

    const payload = {
      params: formParams,
      full_path: wellsDir,
      selected_wells: selectedWells,
      selected_intervals: isUsingZones ? [] : selectedIntervals,
      selected_zones: isUsingZones ? selectedZones : [],
    };

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const endpoint = `${apiUrl}/api/run-vsh-calculation`;

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
      alert(result.message || "Proses kalkulasi VSH berhasil!");
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
    (
      <div className="p-4 md:p-6 h-full flex flex-col bg-white rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex-shrink-0">VSH by Gamma Ray Method</h2>
        <form onSubmit={handleSubmit} className="flex-grow flex flex-col min-h-0">
          <div className="flex-shrink-0 mb-6 p-4 border rounded-lg bg-gray-50">
            <p className="text-sm font-medium text-gray-700">Well: {selectedWells.join(', ') || 'N/A'} / Intervals: {selectedIntervals.length || selectedZones.length} selected</p>
            {/* --- TOGGLE FOR ZONE FETCHING --- */}
            {isUsingZones && (
              <div className="flex items-center gap-2 mt-4 text-sm">
                <Settings className="w-4 h-4 text-gray-600" />
                <label htmlFor="fetch-per-zone">Fetch param values for each zone individually</label>
                <input
                  id="fetch-per-zone"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={fetchPerZone}
                  onChange={(e) => setFetchPerZone(e.target.checked)}
                />
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <button type="button" onClick={() => router.back()} className="px-6 py-2 rounded-md">Cancel</button>
              <button type="submit" className="px-6 py-2 rounded-md text-white bg-blue-600" disabled={isSubmitting || isFetchingDefaults}>
                {(isSubmitting || isFetchingDefaults) ? <Loader2 className="animate-spin" /> : 'Start'}
              </button>
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">Parameters</h3>
          <div className="flex-grow min-h-0 border rounded-lg">
            <div className="overflow-auto h-full">
              <table className="min-w-full text-sm table-auto">
                <thead className="bg-gray-200 sticky top-0 z-10">
                  <tr>
                    {tableHeaders.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r">{header}</th>))}
                    {selectedIntervals.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r">{header}</th>))}
                    {selectedZones.map(header => (<th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r">{header}</th>))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {parameters.map((param) => (
                    <tr key={param.id} className="border-b">
                      <td className={`px-3 py-2 border-r text-center ${getRowBgColor(param.location, param.mode)}`}>{param.id}</td>
                      <td className={`px-3 py-2 border-r ${getRowBgColor(param.location, param.mode)}`}>{param.location}</td>
                      <td className={`px-3 py-2 border-r ${getRowBgColor(param.location, param.mode)}`}>{param.mode}</td>
                      <td className={`px-3 py-2 border-r ${getRowBgColor(param.location, param.mode)}`}>{param.comment}</td>
                      <td className={`px-3 py-2 border-r ${getRowBgColor(param.location, param.mode)}`}>{param.unit}</td>
                      <td className={`px-3 py-2 border-r font-semibold ${getRowBgColor(param.location, param.mode)}`}>{param.name}</td>
                      <td className={`px-3 py-2 border-r text-center ${getRowBgColor(param.location, param.mode)}`}>
                        <input type="checkbox" className="h-4 w-4 rounded" checked={!!rowSync[param.id]} onChange={(e) => handleRowToggle(param.id, e.target.checked)} />
                      </td>
                      {selectedIntervals.map(interval => (
                        <td key={`${param.id}-${interval}`} className="px-3 py-2 border-r bg-white text-black">
                          {/* Logika Dropdown untuk Input Log */}
                          <input
                            type="text"
                            value={param.values[interval] ?? ''}
                            onChange={(e) => handleValueChange(param.id, interval, e.target.value)}
                            className="w-full min-w-[150px] p-1 bg-white"
                            disabled={param.mode === 'Output'}
                          />
                        </td>
                      ))}
                      {isUsingZones && selectedZones.map(zone => (
                        <td key={`${param.id}-${zone}`} className="px-3 py-2 border-r bg-white text-black">
                          {/* Logika Dropdown untuk Input Log */}
                          <input
                            type="text"
                            value={param.values[zone] ?? ''}
                            onChange={(e) => handleValueChange(param.id, zone, e.target.value)}
                            className="w-full min-w-[150px] p-1 bg-white"
                            disabled={param.mode === 'Output'}
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
    )
  );
}