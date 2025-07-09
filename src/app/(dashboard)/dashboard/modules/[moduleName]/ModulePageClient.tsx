/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any*/
// frontend/src/app/(dashboard)/dashboard/modules/[moduleName]/ModulePageClient.tsx
'use client';

import React, { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDataStore } from '@/stores/useAppDataStore';
import { type ParameterRow } from '@/types';
import dynamic from 'next/dynamic';

// GOWS module imports
const RgbeRpbePage = dynamic(() => import('@/features/rgbe-rpbe/page'), {
    loading: () => <p>Loading RGBE-RPBE analysis...</p>, ssr: false
});
const SworadPage = dynamic(() => import('@/features/sworad/page'), {
    loading: () => <p>Loading SWORAD analysis...</p>, ssr: false
});
const DnsDnsvPage = dynamic(() => import('@/features/dns-dnsv/page'), {
    loading: () => <p>Loading DNS-DNSV analysis...</p>, ssr: false
});
const RtRoPage = dynamic(() => import('@/features/rt-ro/page'), {
    loading: () => <p>Loading RT-RO analysis...</p>, ssr: false
});

// Other dynamic module imports
const NormalizationParamsForm = dynamic(() => import('@/features/normalization/NormalizationParams'), {
    loading: () => <p>Loading normalization parameters...</p>, ssr: false
});
const DepthMatchingPage = dynamic(() => import('@/features/depth-matching/page'), {
    loading: () => <p>Loading depth matching parameters...</p>, ssr: false
});
const VshCalculationParams = dynamic(() => import('@/features/vsh-calculation/VshCalculationParams'), {
    loading: () => <p>Loading VSH calculation parameters...</p>, ssr: false
});
const PorosityCalculationParams = dynamic(() => import('@/features/porosity/PorosityCalculationParams'), {
    loading: () => <p>Loading porosity calculation parameters...</p>, ssr: false
});
const GsaCalculationParams = dynamic(() => import('@/features/rgsa-ngsa-dgsa/GsaCalculationParams'), {
    loading: () => <p>Loading GSA calculation parameters...</p>, ssr: false
});
const FillMissingPage = dynamic(() => import('@/features/fill_missing/page'), {
    loading: () => <p>Loading trim data parameters...</p>, ssr: false
});
const TrimDataParams = dynamic(() => import('@/features/trim_data/TrimDataParams'), {
    loading: () => <p>Loading trim data parameters...</p>, ssr: false
});
const SmoothingPage = dynamic(() => import('@/features/smoothing/page'), {
    loading: () => <p>Loading trim data parameters...</p>, ssr: false
});
const SmoothingParamsForm = () => (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
        <h2 className="text-lg font-semibold">Smoothing Parameters</h2>
        <p className="text-gray-600 mt-2">Smoothing parameters form placeholder.</p>
    </div>
);

// Error component
const ErrorComponent = ({ moduleName }: { moduleName: string }) => (
    <div className="p-4 border rounded-lg bg-red-50 text-red-700">
        <h2 className="text-lg font-semibold mb-2">Module Not Found</h2>
        <p>Parameter form for &quot;{moduleName}&quot; not found.</p>
        <button onClick={() => window.history.back()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Go Back</button>
    </div>
);

// --- Main Component ---
interface ModulePageClientProps {
    moduleName: string;
    validModules: string[];
}

export default function ModulePageClient({ moduleName, validModules }: ModulePageClientProps) {
    const router = useRouter();
    const { addNormalizationResult } = useAppDataStore();
    const [isLoading, setIsLoading] = useState(false);

    if (!validModules.includes(moduleName)) {
        return <ErrorComponent moduleName={moduleName} />;
    }

    const handleNormalizationSubmit = async (activeParameters: ParameterRow[]) => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/get-normalization-plot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activeParameters),
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Server error');

            const plotObject = await response.json();
            const resultId = `norm-${Date.now()}`;
            addNormalizationResult(resultId, plotObject);
            router.push(`/dashboard/results/${resultId}`);
        } catch (error) {
            console.error('Submission Error:', error);
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setIsLoading(false);
        }
    };

    const renderParameterForm = () => {
        switch (moduleName) {
            case 'fill-missing':
                return (
                    <Suspense fallback={<p>Loading fill missing parameters...</p>}>
                        <FillMissingPage />
                    </Suspense>
                );
            case 'trim-data':
                return (
                    <Suspense fallback={<p>Loading trim data parameters...</p>}>
                        <TrimDataParams />
                    </Suspense>
                );
            case 'depth-matching':
                return (
                    <Suspense fallback={<p>Loading depth matching parameters...</p>}>
                        <DepthMatchingPage />
                    </Suspense>
                );
            case 'normalization':
                return (
                    <Suspense fallback={<p>Loading normalization parameters...</p>}>
                        <NormalizationParamsForm />
                    </Suspense>
                );
            case 'smoothing': return (
                <Suspense fallback={<p>Loading VSH calculation parameters...</p>}>
                    <SmoothingPage />
                </Suspense>
            ); case 'vsh-calculation':
                return (
                    <Suspense fallback={<p>Loading VSH calculation parameters...</p>}>
                        <VshCalculationParams />
                    </Suspense>
                );
            case 'porosity-calculation':
                return (
                    <Suspense fallback={<p>Loading porosity calculation parameters...</p>}>
                        <PorosityCalculationParams />
                    </Suspense>
                );
            case 'rgsa-ngsa-dgsa':
                return (
                    <Suspense fallback={<p>Loading GSA calculation parameters...</p>}>
                        <GsaCalculationParams />
                    </Suspense>
                );
            case 'rpbe-rgbe':
                return (
                    <Suspense fallback={<p>Loading RPBE-RGBE analysis...</p>}>
                        <RgbeRpbePage />
                    </Suspense>
                );
            case 'sworad':
                return (
                    <Suspense fallback={<p>Loading SWORAD analysis...</p>}>
                        <SworadPage />
                    </Suspense>
                );
            case 'dns-dnsv':
                return (
                    <Suspense fallback={<p>Loading DNS-DNSV analysis...</p>}>
                        <DnsDnsvPage />
                    </Suspense>
                );
            case 'rt-ro':
                return (
                    <Suspense fallback={<p>Loading RT-RO analysis...</p>}>
                        <RtRoPage />
                    </Suspense>
                );
            default:
                return <ErrorComponent moduleName={moduleName} />;
        }
    };

    return (
        <div className="h-full p-4 md:p-6 bg-gray-50">
            <h1 className="text-2xl font-bold mb-4 capitalize text-gray-800">
                {moduleName.replace(/-/g, ' ')} Module
            </h1>
            {renderParameterForm()}
        </div>
    );
}