import React from 'react';
import PlotClientComponent from './PlotClientComponent'; // Kita gunakan komponen plot terpisah
import { ParsedCsvData, ProcessedMarker } from 'codes/lib/csv-parser';

// Definisikan props yang diterima dari page.tsx
interface MainContentProps {
  logData: ParsedCsvData[] | null;
  markerData: ProcessedMarker[] | null;
  wellName: string;
}

const MainContent: React.FC<MainContentProps> = ({ logData, markerData, wellName }) => {
  // Transform logData to ParsedLasData[] (number | null values only)
  const parsedLasData = logData
    ? logData.map((row) => {
        const newRow: { [key: string]: number | null } = {};
        Object.entries(row).forEach(([key, value]) => {
          // Only keep number or null, convert string numbers to number
          if (typeof value === 'number' || value === null) {
            newRow[key] = value;
          } else if (typeof value === 'string' && !isNaN(Number(value))) {
            newRow[key] = Number(value);
          } else {
            newRow[key] = null;
          }
        });
        return newRow;
      })
    : null;

  // Transform markerData to required type (add 'formation' property if missing)
  const parsedMarkerData = markerData
    ? markerData.map((marker) => ({
        top: marker.top,
        base: marker.base,
        color: marker.color,
        formation: 'formation' in marker && typeof marker.formation === 'string' ? marker.formation : '', // fallback to empty string if not present
      }))
    : null;

  return (
    <main className="flex-grow p-6 flex flex-col bg-white overflow-hidden">
      <header className="pb-3 mb-5 border-b-2 border-gray-800 flex-shrink-0">
        <h2 className="text-2xl font-bold text-gray-900">
          Log Plots - Well: {wellName}
        </h2>
      </header>
      <div className="flex-grow rounded-lg min-h-0 overflow-y-auto border-2 border-dashed border-gray-300">
        {parsedLasData && parsedMarkerData ? (
          <PlotClientComponent
            logData={parsedLasData}
            markerData={parsedMarkerData}
            wellName={wellName}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p className="text-lg">Gagal memuat data atau tidak ada data.</p>
          </div>
        )}
      </div>
    </main>
  );
};

export default MainContent;