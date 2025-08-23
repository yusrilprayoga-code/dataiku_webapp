'use client';

import React from 'react';

// --- LANGKAH 1: Impor semua komponen modul di satu tempat ---
import HistogramParams from '@/features/histogram/HistogramParams';
import CrossplotViewer from '@/features/crossplot/CrossPlot';
import NormalizationParamsForm from '@/features/normalization/NormalizationParams';
import DepthMatchingPage from '@/features/depth-matching/page';
import VshCalculationParams from '@/features/vsh-calculation/VshCalculationParams';
import VshDNCalculationParams from '@/features/vsh-dn-calculation/VshDNParameter';
import PorosityCalculationParams from '@/features/porosity/PorosityCalculationParams';
import SWCalculationParams from '@/features/sw-calculation/WaterSaturationParams';
import RWACalculationParams from '@/features/water-resistivity-calculation/WaterResistivityParams';
import TrimDataDashboard from '@/features/trim_data/TrimDataDashboard';
import DnsDnsvCalculationPage from '@/features/dns-dnsv/page';
import RgbeRpbePage from '@/features/rgbe-rpbe/page';
import RtRoPage from '@/features/rt-ro/page';
import SwgradParams from '@/features/swgrad/page';
import FillMissingPage from '@/features/fill_missing/page';
import SmoothingPage from '@/features/smoothing/page';
import GWDPage from '@/features/gwd/page';
import SplicingParams from '@/features/splicing-merging/page';
import RGSAParams from '@/features/rgsa/RGSAParams';
import NGSAParams from '@/features/ngsa/NGSAParams';
import DGSAParams from '@/features/dgsa/DGSAParams';
import SwSimandouxParams from '@/features/sw-simandoux/page';
import IqualCalculationParams from '@/features/iqual/IqualParams';

// Komponen untuk menampilkan pesan error jika modul tidak ditemukan
const ErrorComponent = ({ moduleName }: { moduleName: string }) => (
    <div className="h-full p-4 md:p-6 bg-gray-50">
        <div className="p-4 border rounded-lg bg-red-50 text-red-700">
            <h2 className="text-lg font-semibold mb-2">Module Not Found</h2>
            <p>Parameter form for &quot;{moduleName}&quot; not found or not registered.</p>
            <button
                onClick={() => window.history.back()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Go Back
            </button>
        </div>
    </div>
);

// --- LANGKAH 2: Buat "peta" dari moduleName ke Komponen React ---
const moduleMap: Record<string, React.ComponentType<unknown>> = {
    'histogram': HistogramParams,
    'crossplot': CrossplotViewer,
    'normalization': NormalizationParamsForm,
    'depth-matching': DepthMatchingPage,
    'vsh-calculation': VshCalculationParams,
    'vsh-dn-calculation': VshDNCalculationParams,
    'porosity-calculation': PorosityCalculationParams,
    'sw-calculation': SWCalculationParams,
    'sw-simandoux': SwSimandouxParams,
    'water-resistivity-calculation': RWACalculationParams,
    // 'rgsa-ngsa-dgsa': GsaCalculationParams,
    'rgsa': RGSAParams,
    'ngsa': NGSAParams,
    'dgsa': DGSAParams,
    'trim-data': TrimDataDashboard,
    'iqual': IqualCalculationParams,
    'dns-dnsv': DnsDnsvCalculationPage,
    'rgbe-rpbe': RgbeRpbePage,
    'rt-ro': RtRoPage,
    'swgrad': SwgradParams,
    'fill-missing': FillMissingPage,
    'smoothing': SmoothingPage,
    'gwd': GWDPage,
    'splicing-merging': SplicingParams,
};

interface ModulePageClientProps {
    moduleName: string;
    validModules: string[];
}

export default function ModulePageClient({ moduleName, validModules }: ModulePageClientProps) {
    // Dapatkan Komponen dari peta berdasarkan moduleName
    const ModuleComponent = moduleMap[moduleName];

    // Jika komponen tidak ditemukan di peta atau tidak valid, tampilkan error
    if (!ModuleComponent || !validModules.includes(moduleName)) {
        return <ErrorComponent moduleName={moduleName} />;
    }

    return (
        <div className="h-full p-4 md:p-6 bg-gray-50">
            <h1 className="text-2xl font-bold mb-4 capitalize text-gray-800">
                {moduleName.replace(/-/g, ' ')} Module
            </h1>
            {/* Render komponen yang dipilih */}
            <ModuleComponent />
        </div>
    );
}