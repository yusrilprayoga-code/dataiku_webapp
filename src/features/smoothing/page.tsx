'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';

export default function SmoothingPage() {
  const { selectedWells, selectedIntervals } = useDashboard();
  const router = useRouter();

  useEffect(() => {
    const runSmoothing = async () => {
      const payload = {
        selected_wells: selectedWells,
        selected_intervals: selectedIntervals,
      };

      console.log("Payload yang dikirim ke backend:", payload);

      try {
        const response = await fetch('http://127.0.0.1:5001/api/run-smoothing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Server error');
        }

        const result = await response.json();
        console.log("Data hasil smoothing:", JSON.parse(result.data));
        alert(result.message + " Hasilnya ada di console (F12).");

        router.push('/dashboard');
      } catch (error) {
        alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    runSmoothing();
  }, [router, selectedIntervals, selectedWells]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Menjalankan Smoothing...</h1>
      <p className="text-gray-600">Silakan tunggu. Proses ini akan dialihkan setelah selesai.</p>
    </div>
  );
}
