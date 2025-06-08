// src/components/DashboardLayout.tsx
import React from 'react';
import LeftSidebar from './LeftSidebar';
import MainContent from './MainContent';
import RightSidebar from './RightSidebar';

const DashboardLayout: React.FC = () => {
  return (
    // Container utama setinggi layar dan menggunakan flexbox
    <div className="flex h-screen w-full bg-gray-100 font-sans">
      <LeftSidebar />
      <MainContent logData={[]} markerData={[]} wellName="" />
      <RightSidebar />
    </div>
  );
};

export default DashboardLayout;