// src/app/(dashboard)/layout.tsx

'use client';

import React from 'react';
import LeftSidebar from '@/components/layout/LeftSidebar';
import RightSidebar from '@/components/layout/RightSidebar';
import MainContent from '@/components/layout/MainContent';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-gray-100 font-sans text-gray-800">
      <LeftSidebar />
      <MainContent>{children}</MainContent>
      {/* RightSidebar no longer needs callbacks, it uses <Link> for navigation */}
      <RightSidebar />
    </div>
  );
}