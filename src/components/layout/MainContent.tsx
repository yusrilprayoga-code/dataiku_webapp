// src/components/layout/MainContent.tsx (Struktur Baru)

import { LogDataRow } from "@/types";
import WellLogPlot from "@/components/WellLogPlot";

interface MainContentProps {
  initialLogData: LogDataRow[];
  wellName: string;
}

export default function MainContent({ initialLogData, wellName }: MainContentProps) {
  return (
    <div className="flex-1 overflow-auto p-4 md:p-6">
      {/* Di sinilah komponen plot kita akan dirender */}
      {/* Teruskan props yang diterima ke komponen plot */}
      <WellLogPlot 
        initialData={initialLogData} 
        wellName={wellName} 
      />
    </div>
  );
}