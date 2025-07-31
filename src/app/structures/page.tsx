import StructuresDashboard from '@/components/structures/StructuresDashboard';
import { StructuresData } from '@/types/structures';

async function getStructuresData(): Promise<StructuresData | null> {
  try {
    // For now, return mock data to display fields and structures only
    // Replace this with actual backend call when your Python backend is ready
    const mockData: StructuresData = {
      fields: [
        {
          field_name: "Adera",
          structures_count: 4,
          structures: [
            {
              structure_name: "Abab",
              field_name: "Adera",
              file_path: "/data/structures/Adera/Abab.xlsx",
              wells_count: 12,
              wells: ["ABB-001", "ABB-002", "ABB-003", "ABB-004", "ABB-005", "ABB-006", "ABB-007", "ABB-008", "ABB-009", "ABB-010", "ABB-011", "ABB-012"],
              total_records: 1200,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT"]
            },
            {
              structure_name: "Benuang",
              field_name: "Adera",
              file_path: "/data/structures/Adera/Benuang.xlsx",
              wells_count: 8,
              wells: ["BNG-001", "BNG-002", "BNG-003", "BNG-004", "BNG-005", "BNG-006", "BNG-007", "BNG-008"],
              total_records: 850,
              columns: ["DEPTH", "GR", "NPHI", "RHOB"]
            },
            {
              structure_name: "Dewa",
              field_name: "Adera",
              file_path: "/data/structures/Adera/Dewa.xlsx",
              wells_count: 15,
              wells: ["DEW-001", "DEW-002", "DEW-003", "DEW-004", "DEW-005", "DEW-006", "DEW-007", "DEW-008", "DEW-009", "DEW-010", "DEW-011", "DEW-012", "DEW-013", "DEW-014", "DEW-015"],
              total_records: 1600,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT", "SP"]
            },
            {
              structure_name: "Raja",
              field_name: "Adera",
              file_path: "/data/structures/Adera/Raja.xlsx",
              wells_count: 10,
              wells: ["RJA-001", "RJA-002", "RJA-003", "RJA-004", "RJA-005", "RJA-006", "RJA-007", "RJA-008", "RJA-009", "RJA-010"],
              total_records: 980,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT"]
            }
          ]
        },
        {
          field_name: "Limau",
          structures_count: 5,
          structures: [
            {
              structure_name: "Belimbing",
              field_name: "Limau",
              file_path: "/data/structures/Limau/Belimbing.xlsx",
              wells_count: 18,
              wells: ["LIM-BLB-001", "LIM-BLB-002", "LIM-BLB-003", "LIM-BLB-004", "LIM-BLB-005", "LIM-BLB-006", "LIM-BLB-007", "LIM-BLB-008", "LIM-BLB-009", "LIM-BLB-010", "LIM-BLB-011", "LIM-BLB-012", "LIM-BLB-013", "LIM-BLB-014", "LIM-BLB-015", "LIM-BLB-016", "LIM-BLB-017", "LIM-BLB-018"],
              total_records: 2100,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT", "SP"]
            },
            {
              structure_name: "Karangan",
              field_name: "Limau",
              file_path: "/data/structures/Limau/Karangan.xlsx",
              wells_count: 7,
              wells: ["LIM-KRG-001", "LIM-KRG-002", "LIM-KRG-003", "LIM-KRG-004", "LIM-KRG-005", "LIM-KRG-006", "LIM-KRG-007"],
              total_records: 750,
              columns: ["DEPTH", "GR", "NPHI", "RHOB"]
            },
            {
              structure_name: "Limau Barat",
              field_name: "Limau",
              file_path: "/data/structures/Limau/Limau Barat.xlsx",
              wells_count: 22,
              wells: ["LIM-LB-001", "LIM-LB-002", "LIM-LB-003", "LIM-LB-004", "LIM-LB-005", "LIM-LB-006", "LIM-LB-007", "LIM-LB-008", "LIM-LB-009", "LIM-LB-010", "LIM-LB-011", "LIM-LB-012", "LIM-LB-013", "LIM-LB-014", "LIM-LB-015", "LIM-LB-016", "LIM-LB-017", "LIM-LB-018", "LIM-LB-019", "LIM-LB-020", "LIM-LB-021", "LIM-LB-022"],
              total_records: 2800,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT", "SP", "CALI"]
            },
            {
              structure_name: "Limau Tengah",
              field_name: "Limau",
              file_path: "/data/structures/Limau/Limau Tengah.xlsx",
              wells_count: 16,
              wells: ["LIM-LT-001", "LIM-LT-002", "LIM-LT-003", "LIM-LT-004", "LIM-LT-005", "LIM-LT-006", "LIM-LT-007", "LIM-LT-008", "LIM-LT-009", "LIM-LT-010", "LIM-LT-011", "LIM-LT-012", "LIM-LT-013", "LIM-LT-014", "LIM-LT-015", "LIM-LT-016"],
              total_records: 1950,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT"]
            },
            {
              structure_name: "Tanjung Miring Barat",
              field_name: "Limau",
              file_path: "/data/structures/Limau/Tanjung Miring Barat.xlsx",
              wells_count: 14,
              wells: ["LIM-TMB-001", "LIM-TMB-002", "LIM-TMB-003", "LIM-TMB-004", "LIM-TMB-005", "LIM-TMB-006", "LIM-TMB-007", "LIM-TMB-008", "LIM-TMB-009", "LIM-TMB-010", "LIM-TMB-011", "LIM-TMB-012", "LIM-TMB-013", "LIM-TMB-014"],
              total_records: 1650,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT", "SP"]
            }
          ]
        },
        {
          field_name: "Pendopo",
          structures_count: 5,
          structures: [
            {
              structure_name: "Benakat Barat",
              field_name: "Pendopo",
              file_path: "/data/structures/Pendopo/Benakat Barat.xlsx",
              wells_count: 11,
              wells: [],
              total_records: 1300,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT"]
            },
            {
              structure_name: "Betung",
              field_name: "Pendopo",
              file_path: "/data/structures/Pendopo/Betung.xlsx",
              wells_count: 9,
              wells: [],
              total_records: 950,
              columns: ["DEPTH", "GR", "NPHI", "RHOB"]
            },
            {
              structure_name: "Musi Timur",
              field_name: "Pendopo",
              file_path: "/data/structures/Pendopo/Musi Timur.xlsx",
              wells_count: 13,
              wells: [],
              total_records: 1450,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT", "SP"]
            },
            {
              structure_name: "Sopa",
              field_name: "Pendopo",
              file_path: "/data/structures/Pendopo/Sopa.xlsx",
              wells_count: 8,
              wells: [],
              total_records: 890,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT"]
            },
            {
              structure_name: "Talang Akar Pendopo",
              field_name: "Pendopo",
              file_path: "/data/structures/Pendopo/Talang Akar Pendopo.xlsx",
              wells_count: 15,
              wells: [],
              total_records: 1750,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT", "SP", "CALI"]
            }
          ]
        },
        {
          field_name: "Prabumulih",
          structures_count: 16,
          structures: [
            {
              structure_name: "Beringin-A",
              field_name: "Prabumulih",
              file_path: "/data/structures/Prabumulih/Beringin-A.xlsx",
              wells_count: 12,
              wells: [],
              total_records: 1400,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT"]
            },
            {
              structure_name: "Beringin-C",
              field_name: "Prabumulih",
              file_path: "/data/structures/Prabumulih/Beringin-C.xlsx",
              wells_count: 10,
              wells: [],
              total_records: 1200,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT"]
            },
            {
              structure_name: "Beringin-D",
              field_name: "Prabumulih",
              file_path: "/data/structures/Prabumulih/Beringin-D.xlsx",
              wells_count: 8,
              wells: [],
              total_records: 950,
              columns: ["DEPTH", "GR", "NPHI", "RHOB"]
            },
            {
              structure_name: "Beringin-E",
              field_name: "Prabumulih",
              file_path: "/data/structures/Prabumulih/Beringin-E.xlsx",
              wells_count: 14,
              wells: [],
              total_records: 1650,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT", "SP"]
            },
            {
              structure_name: "Beringin-F",
              field_name: "Prabumulih",
              file_path: "/data/structures/Prabumulih/Beringin-F.xlsx",
              wells_count: 9,
              wells: [],
              total_records: 1100,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT"]
            },
            {
              structure_name: "Beringin-H",
              field_name: "Prabumulih",
              file_path: "/data/structures/Prabumulih/Beringin-H.xlsx",
              wells_count: 11,
              wells: [],
              total_records: 1350,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT"]
            },
            {
              structure_name: "Gunung Kemala Barat",
              field_name: "Prabumulih",
              file_path: "/data/structures/Prabumulih/Gunung Kemala Barat.xlsx",
              wells_count: 16,
              wells: [],
              total_records: 1900,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT", "SP"]
            },
            {
              structure_name: "Gunung Kemala Tengah",
              field_name: "Prabumulih",
              file_path: "/data/structures/Prabumulih/Gunung Kemala Tengah.xlsx",
              wells_count: 13,
              wells: [],
              total_records: 1550,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT"]
            },
            {
              structure_name: "Gunung Kemala Timur",
              field_name: "Prabumulih",
              file_path: "/data/structures/Prabumulih/Gunung Kemala Timur.xlsx",
              wells_count: 12,
              wells: [],
              total_records: 1400,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT"]
            },
            {
              structure_name: "Lembak",
              field_name: "Prabumulih",
              file_path: "/data/structures/Prabumulih/Lembak.xlsx",
              wells_count: 7,
              wells: [],
              total_records: 800,
              columns: ["DEPTH", "GR", "NPHI", "RHOB"]
            },
            {
              structure_name: "Ogan Timur",
              field_name: "Prabumulih",
              file_path: "/data/structures/Prabumulih/Ogan Timur.xlsx",
              wells_count: 18,
              wells: [],
              total_records: 2200,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT", "SP", "CALI"]
            },
            {
              structure_name: "Prabumenang",
              field_name: "Prabumulih",
              file_path: "/data/structures/Prabumulih/Prabumenang.xlsx",
              wells_count: 15,
              wells: [],
              total_records: 1800,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT", "SP"]
            },
            {
              structure_name: "Prabumulih Barat",
              field_name: "Prabumulih",
              file_path: "/data/structures/Prabumulih/Prabumulih Barat.xlsx",
              wells_count: 20,
              wells: [],
              total_records: 2500,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT", "SP", "CALI"]
            },
            {
              structure_name: "Talang Jimar Barat",
              field_name: "Prabumulih",
              file_path: "/data/structures/Prabumulih/Talang Jimar Barat.xlsx",
              wells_count: 14,
              wells: [],
              total_records: 1650,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT", "SP"]
            },
            {
              structure_name: "Talang Jimar Tengah",
              field_name: "Prabumulih",
              file_path: "/data/structures/Prabumulih/Talang Jimar Tengah.xlsx",
              wells_count: 11,
              wells: [],
              total_records: 1300,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT"]
            },
            {
              structure_name: "Talang Jimar Timur",
              field_name: "Prabumulih",
              file_path: "/data/structures/Prabumulih/Talang Jimar Timur.xlsx",
              wells_count: 9,
              wells: [],
              total_records: 1050,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT"]
            },
            {
              structure_name: "Tanjung Tiga Barat",
              field_name: "Prabumulih",
              file_path: "/data/structures/Prabumulih/Tanjung Tiga Barat.xlsx",
              wells_count: 13,
              wells: [],
              total_records: 1500,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT", "SP"]
            }
          ]
        },
        {
          field_name: "Ramba",
          structures_count: 3,
          structures: [
            {
              structure_name: "Bentayan",
              field_name: "Ramba",
              file_path: "/data/structures/Ramba/Bentayan.xlsx",
              wells_count: 12,
              wells: [],
              total_records: 1400,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT"]
            },
            {
              structure_name: "Mangunjaya",
              field_name: "Ramba",
              file_path: "/data/structures/Ramba/Mangunjaya.xlsx",
              wells_count: 8,
              wells: [],
              total_records: 950,
              columns: ["DEPTH", "GR", "NPHI", "RHOB"]
            },
            {
              structure_name: "Ramba",
              field_name: "Ramba",
              file_path: "/data/structures/Ramba/Ramba.xlsx",
              wells_count: 15,
              wells: [],
              total_records: 1750,
              columns: ["DEPTH", "GR", "NPHI", "RHOB", "RT", "SP"]
            }
          ]
        }
      ],
      structures: [], // We'll populate this from fields
      wells: [], // Not needed for now
      summary: {
        total_fields: 5,
        total_structures: 33,
        total_wells: 385,
        total_records: 47500
      }
    };

    // Populate the structures array from fields
    mockData.structures = mockData.fields.flatMap(field => field.structures);

    console.log('Using mock data for structures display');
    return mockData;

    // Uncomment this when your backend is ready:
    /*
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    
    if (!backendUrl) {
      console.error('NEXT_PUBLIC_BACKEND_URL is not set in environment variables');
      return null;
    }

    console.log(`Fetching structures data from: ${backendUrl}/api/structures`);
    
    const res = await fetch(`${backendUrl}/api/structures`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      console.error(`Failed to fetch structures data: ${res.status} ${res.statusText}`);
      return null;
    }
    
    const data = await res.json();
    return data;
    */
  } catch (error) {
    console.error('Error fetching structures data:', error);
    return null;
  }
}

export default async function StructuresPage() {
  const data = await getStructuresData();
  
  if (!data) {
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
              <li>NEXT_PUBLIC_BACKEND_URL is set in .env.local</li>
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
