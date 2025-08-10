import React, { Suspense } from 'react';
import ModulePageClient from './ModulePageClient';
import { Loader2 } from 'lucide-react';

// --- PERBAIKAN 1: Tambahkan 'Promise' pada tipe params ---
interface MyPageProps {
  params: Promise<{ moduleName: string }>;
}

// Daftar modul yang valid untuk mencegah rute yang tidak valid
const VALID_MODULES = [
  'histogram', 'crossplot', 'trim-data', 'depth-matching', 'normalization',
  'smoothing', 'splicing-merging', 'vsh-calculation', 'vsh-dn-calculation',
  'porosity-calculation', 'rgsa-ngsa-dgsa', 'fill-missing', 'sw-calculation',
  'water-resistivity-calculation', 'rgbe-rpbe', 'swgrad', 'dns-dnsv',
  'rt-ro', 'gwd',
];

// Komponen Fallback untuk Suspense
const LoadingFallback = () => (
    <div className="h-full p-4 md:p-6 bg-gray-50 flex items-center justify-center">
        <div className="flex items-center text-gray-600">
            <Loader2 className="animate-spin h-8 w-8 mr-4" />
            <span className="text-lg">Loading module...</span>
        </div>
    </div>
);

// Halaman Server Component utama
export default async function MyPage({ params }: MyPageProps) {
  // --- PERBAIKAN 2: Gunakan 'await' untuk mendapatkan isi dari params ---
  const resolvedParams = await params;
  const moduleName = resolvedParams.moduleName;

  return (
    <Suspense fallback={<LoadingFallback />}>
      <ModulePageClient
        moduleName={moduleName}
        validModules={VALID_MODULES}
      />
    </Suspense>
  );
}

// Fungsi ini membantu Next.js membuat halaman-halaman ini secara statis saat build
export async function generateStaticParams() {
  return VALID_MODULES.map((moduleName) => ({
    moduleName: moduleName,
  }));
}