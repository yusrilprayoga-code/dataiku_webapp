'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';

const FillMissingPage = () => {
  const { selectedWells } = useDashboard();
  const [message, setMessage] = useState('⏳ Mengisi missing values...');
  const router = useRouter();

  useEffect(() => {
    const runFillMissing = async () => {
      if (!selectedWells || selectedWells.length === 0) {
        setMessage('❌ Tidak ada well yang dipilih.');
        setTimeout(() => router.push('/dashboard'), 2000);
        return;
      }

      try {
        const response = await fetch('http://localhost:5001/api/fill-null-marker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selected_wells: selectedWells }),
        });

        const result = await response.json();

        if (response.ok) {
          setMessage(`✅ ${result.message}`);
        } else {
          setMessage(`❌ ${result.error || 'Gagal menjalankan pengisian'}`);
        }
      } catch (error) {
        console.error(error);
        setMessage('❌ Terjadi error saat menghubungi backend.');
      } finally {
        setTimeout(() => router.push('/dashboard'), 2500);
      }
    };

    runFillMissing();
  }, [selectedWells, router]);

  return (
    <div className="p-8">
      <p className="text-sm text-gray-800">{message}</p>
      <p className="text-xs text-gray-500">Tunggu sebentar...</p>
    </div>
  );
};

export default FillMissingPage;
