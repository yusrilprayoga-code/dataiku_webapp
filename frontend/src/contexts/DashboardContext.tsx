// src/contexts/DashboardContext.tsx

'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';

interface DashboardContextType {
  selectedWell: string | null;
  setSelectedWell: (well: string) => void;
  selectedIntervals: string[];
  toggleInterval: (interval: string) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [selectedWell, setSelectedWell] = useState<string>('ABAB-035');
  const [selectedIntervals, setSelectedIntervals] = useState<string[]>(['B1', 'GUF']);

  // Fungsi untuk menambah/menghapus interval dari daftar yang dipilih
  const toggleInterval = (interval: string) => {
    setSelectedIntervals(prev =>
      prev.includes(interval)
        ? prev.filter(i => i !== interval)
        : [...prev, interval]
    );
  };

  const value = { selectedWell, setSelectedWell, selectedIntervals, toggleInterval };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = (): DashboardContextType => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};