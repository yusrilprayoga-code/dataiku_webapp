'use client';

import { useEffect, useState } from 'react';
import StructuresDashboard from '@/components/structures/StructuresDashboard';
import { StructuresData } from '@/types/structures';
import RefreshButton from '@/components/RefreshButton';

export default function StructuresPage() {
  const [data, setData] = useState<StructuresData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStructuresData() {
      try {
        // Gunakan environment variable untuk URL backend
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        
        if (!apiUrl) {
          console.error('NEXT_PUBLIC_API_URL is not set in environment variables');
          setError('Backend URL not configured');
          return;
        }

        // Panggil endpoint baru yang telah kita buat di app.py
        const endpoint = `${apiUrl}/api/get-structures-summary`;
        console.log(`Fetching structures data from: ${endpoint}`);
        
        const res = await fetch(endpoint, {
          // 'no-store' memastikan kita selalu mendapatkan data terbaru dari file system
          cache: 'no-store', 
        });

        if (!res.ok) {
          const errorBody = await res.text();
          console.error(`Failed to fetch structures data: ${res.status} ${res.statusText}`, errorBody);
          setError(`Failed to fetch data: ${res.status} ${res.statusText}`);
          return;
        }
        
        const structuresData: StructuresData = await res.json();
        setData(structuresData);

      } catch (error) {
        console.error('Error fetching structures data:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchStructuresData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-lg shadow-lg">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Loading Structures Data</h1>
          <p className="text-gray-600">Fetching latest data from backend...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-800">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-lg shadow-lg border border-red-200">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.762 0L3.052 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-red-800 mb-2">Backend Connection Error</h1>
          <p className="text-gray-600 mb-4">
            Unable to fetch structures data from the backend API.
          </p>
          {error && (
            <p className="text-sm text-red-600 mb-4 font-mono bg-red-50 p-2 rounded">
              {error}
            </p>
          )}
          <div className="text-sm text-gray-500 space-y-2">
            <p>Please check:</p>
            <ul className="text-left list-disc list-inside space-y-1">
              <li>Your Python backend is running</li>
              <li>NEXT_PUBLIC_API_URL is set in .env.local</li>
              <li>Backend URL is accessible (check console for details)</li>
            </ul>
          </div>
          <RefreshButton />
        </div>
      </div>
    );
  }

  return <StructuresDashboard initialData={data} />;
}