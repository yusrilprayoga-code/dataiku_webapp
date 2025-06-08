import fs from 'fs';
import path from 'path';
import { parseCsvData, processMarkersFromData } from 'codes/lib/csv-parser';

// Impor komponen-komponen layout kita
import LeftSidebar from 'codes/module_components/LeftSidebar';
import MainContent from 'codes/module_components/MainContent';
import RightSidebar from 'codes/module_components/RightSidebar';

// Fungsi untuk membaca dan memproses data di sisi server
async function getPlotData() {
  const fileName = 'ABB-035.las';
  const filePath = path.join(process.cwd(), 'data', fileName);
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const logData = parseCsvData(fileContent);
    const markerData = processMarkersFromData(logData);
    const wellName = fileName.replace('.las', '');

    return { logData, markerData, wellName };
  } catch (error) {
    console.error("Gagal membaca atau memproses file data:", error);
    return { logData: null, markerData: null, wellName: 'Error Reading File' };
  }
}

// Ini adalah Server Component yang mengambil data dan menyusun layout
export default async function DashboardPage() {
  const { logData, markerData, wellName } = await getPlotData();

  return (
    <main className="flex h-screen w-full bg-gray-100 font-sans text-gray-800">
      {/* 1. Render LeftSidebar */}
      <LeftSidebar />
      
      {/* 2. Render MainContent dan berikan data yang sudah diambil */}
      <MainContent 
        logData={logData} 
        markerData={markerData} 
        wellName={wellName} 
      />
      
      {/* 3. Render RightSidebar */}
      <RightSidebar />
    </main>
  );
}