// src/app/(dashboard)/layout.tsx

'use client';

import React from 'react';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import MainContent from '@/components/layout/MainContent';
import { DashboardProvider } from '@/contexts/DashboardContext';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProvider>
      <DashboardView>{children}</DashboardView>
    </DashboardProvider>
  );
}

// Komponen baru untuk layout yang menggunakan client-side hooks
function DashboardView({ children }: { children: React.ReactNode }) {    
    const pathname = usePathname();
    const activeModule = pathname.split('/').pop()?.toUpperCase().replace(/-/g, ' ') || null;
    
    return (
        <div className="flex h-screen w-full bg-gray-100 font-sans text-gray-800">
            <LeftSidebar />
            <MainContent>{children}</MainContent>
            <RightSidebar activeButton={activeModule} />
        </div>
    );
}