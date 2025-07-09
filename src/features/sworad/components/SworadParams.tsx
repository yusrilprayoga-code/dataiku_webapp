'use client';

import React from 'react';
import { type ParameterRow } from '@/types';
import { useDashboard } from '@/contexts/DashboardContext';

interface SworadParamsProps {
    parameters: ParameterRow[];
    onParameterChange: (updatedParams: ParameterRow[]) => void;
}

export default function SworadParams({ parameters, onParameterChange }: SworadParamsProps) {
    const { selectedWells, selectedIntervals } = useDashboard();

    const handleUnifiedValueChange = (id: number, newValue: string) => {
        const updatedParams = parameters.map(param => {
            if (param.id === id) {
                const newValues = Object.fromEntries(
                    Object.keys(param.values).map(intervalKey => [intervalKey, parseFloat(newValue) || 0])
                );
                return { ...param, values: newValues };
            }
            return param;
        });
        onParameterChange(updatedParams);
    };

    const handleRowToggle = (id: number, isEnabled: boolean) => {
        onParameterChange(parameters.map(param =>
            param.id === id ? { ...param, isEnabled } : param
        ));
    };

    const getRowBgColor = (location: string, mode: string): string => {
        switch (location) {
            case 'Constant':
                return mode === 'Input' ? 'bg-yellow-300' : 'bg-yellow-100';
            case 'Log':
                return mode === 'Input' ? 'bg-cyan-400' : 'bg-cyan-200';
            default:
                return 'bg-white';
        }
    };

    const staticHeaders = ['#', 'Location', 'Mode', 'Comment', 'Unit', 'Name', 'P'];

    return (
        <div className="h-full flex flex-col min-h-0">
            <div className="flex-grow min-h-0 border border-gray-300 rounded-lg">
                <div className="overflow-auto h-full">
                    <table className="min-w-full text-sm table-auto">
                        <thead className="bg-gray-200 sticky top-0 z-10">
                            <tr>
                                {staticHeaders.map(header => (
                                    <th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">
                                        {header}
                                    </th>
                                ))}
                                {selectedIntervals.map(header => (
                                    <th key={header} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-r border-gray-300 whitespace-nowrap">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {parameters.map((param) => (
                                <tr key={param.id}
                                    className={`border-b border-gray-200 ${param.isEnabled ? getRowBgColor(param.location, param.mode) : 'bg-gray-100 text-gray-400'
                                        }`}
                                >
                                    <td className="px-3 py-2 border-r text-center text-sm">{param.id}</td>
                                    <td className="px-3 py-2 border-r whitespace-nowrap text-sm">{param.location}</td>
                                    <td className="px-3 py-2 border-r whitespace-nowrap text-sm">{param.mode}</td>
                                    <td className="px-3 py-2 border-r whitespace-normal max-w-xs text-sm">{param.comment}</td>
                                    <td className="px-3 py-2 border-r whitespace-nowrap text-sm">{param.unit}</td>
                                    <td className="px-3 py-2 border-r font-semibold whitespace-nowrap text-sm">{param.name}</td>
                                    <td className="px-3 py-2 border-r text-center">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-400"
                                            checked={param.isEnabled}
                                            onChange={(e) => handleRowToggle(param.id, e.target.checked)}
                                        />
                                    </td>
                                    {selectedIntervals.map(interval => (
                                        <td key={interval} className="px-3 py-2 border-r bg-white">
                                            <input
                                                type="number"
                                                value={param.values[interval] ?? ''}
                                                onChange={(e) => handleUnifiedValueChange(param.id, e.target.value)}
                                                disabled={!param.isEnabled}
                                                className="w-full min-w-[100px] p-1 bg-white text-black disabled:bg-gray-100 disabled:text-gray-500"
                                                step={0.1}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
