// src/app/data-prep/layout.tsx

'use client';

import React from 'react';
import DirectorySidebar from '@/components/layout/DirectorySidebar';
import MainContent from '@/components/layout/MainContent';
import RightSidebar from '@/components/layout/RightSidebar';
import { DashboardProvider } from '@/contexts/DashboardContext';
import { usePathname } from 'next/navigation';

export default function DataPrepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProvider>
      <DataPrepView>{children}</DataPrepView>
    </DashboardProvider>
  );
}

function DataPrepView({ children }: { children: React.ReactNode }) {    
    const pathname = usePathname();
    // Extract the actual route name from the pathname (e.g., 'trim-data', 'depth-matching')
    const activeModule = pathname.split('/').pop() || null;
    
    return (
        <div className="flex h-[calc(100vh-80px)] w-full bg-gray-100 font-sans text-gray-800">
            <DirectorySidebar />
            <MainContent>{children}</MainContent>
            <RightSidebar activeButton={activeModule} />
        </div>
    );
}
