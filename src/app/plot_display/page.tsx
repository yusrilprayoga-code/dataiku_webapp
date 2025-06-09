// src/app/page.tsx (Diperbarui)

import LeftSidebar from '../../components/layout/LeftSidebar';
import MainContent from '../../components/layout/MainContent';
import RightSidebar from '../../components/layout/RightSidebar';
import { getData } from '../../lib/getData';

export default async function DashboardPage() {
  // Data diambil di Server Component
  const { logData, wellName } = await getData();

  return (
    <main className="flex h-screen w-full bg-gray-100 font-sans text-gray-800">
      {/* 1. Render LeftSidebar */}
      <LeftSidebar />
      
      {/* 2. Render MainContent dan berikan data yang sudah diambil sebagai props */}
      <MainContent initialLogData={logData} wellName={wellName} />
      
      {/* 3. Render RightSidebar */}
      <RightSidebar />
    </main>
  );
}