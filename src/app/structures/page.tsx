import StructuresDashboard from '@/components/structures/StructuresDashboard';
import { StructuresData } from '@/types/structures';

// Fungsi ini sekarang akan memanggil backend secara nyata
async function getStructuresData(): Promise<StructuresData | null> {
  try {
    // Gunakan environment variable untuk URL backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    if (!apiUrl) {
      console.error('NEXT_PUBLIC_API_URL is not set in environment variables');
      return null;
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
      return null;
    }
    
    const data: StructuresData = await res.json();
    return data;

  } catch (error) {
    console.error('Error fetching structures data:', error);
    return null;
  }
}

// Komponen Page tidak perlu diubah sama sekali
export default async function StructuresPage() {
  const data = await getStructuresData();
  
  if (!data) {
    // Tampilan error ini akan otomatis muncul jika fetch gagal
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
          <div className="text-sm text-gray-500 space-y-2">
            <p>Please check:</p>
            <ul className="text-left list-disc list-inside space-y-1">
              <li>Your Python backend is running</li>
              <li>NEXT_PUBLIC_API_URL is set in .env.local</li>
              <li>Backend URL is accessible (check console for details)</li>
            </ul>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <StructuresDashboard initialData={data} />;
}