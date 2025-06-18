'use client';

import React from 'react';
import { DashboardProvider } from '@/contexts/DashboardContext';

import { usePathname } from 'next/navigation';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import MainContent from '@/components/layout/MainContent';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProvider>
      {/* Layout asli Anda (dengan sidebar dan children) akan dirender di sini.
        Karena children sekarang bisa berupa Server Component, kita buat Client Component
        terpisah untuk layout yang menggunakan context.
      */}
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
            <RightSidebar activeButton={activeModule} onButtonClick={() => {}} />
        </div>
    );
}