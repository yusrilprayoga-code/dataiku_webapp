/* eslint-disable @typescript-eslint/no-unused-vars */
// frontend/src/app/(dashboard)/dashboard/modules/[moduleName]/ModulePageClient.tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDataStore } from '@/stores/useAppDataStore';
import { type ParameterRow } from '@/types';
import dynamic from 'next/dynamic';
import HistogramParams from '@/features/histogram/HistogramParams';
import CrossplotViewerRHOB_NPHI from '@/features/crossplot/CrossPlotRHOB-NPHI';
import CrossplotViewerGR_NPHI from '@/features/crossplot/CrossPlotGR-NPHI';
<<<<<<< HEAD
=======
import VshDNCalculationParams from '@/features/vsh-dn-calculation/VshDNParameter';
>>>>>>> module-2-fixed

// Dynamic imports to prevent SSR issues and improve loading
const NormalizationParamsForm = dynamic(() => import('@/features/normalization/NormalizationParams'), {
    loading: () => <div className="p-4">Loading normalization parameters...</div>,
    ssr: false
});

const DepthMatchingPage = dynamic(() => import('@/features/depth-matching/page'), {
    loading: () => <div className="p-4">Loading depth matching parameters...</div>,
    ssr: false
});

const VshCalculationParams = dynamic(() => import('@/features/vsh-calculation/VshCalculationParams'), {
    loading: () => <div className="p-4">Loading VSH calculation parameters...</div>,
    ssr: false
});

const PorosityCalculationParams = dynamic(() => import('@/features/porosity/PorosityCalculationParams'), {
    loading: () => <div className="p-4">Loading porosity calculation parameters...</div>,
    ssr: false
});

const SWCalculationParams = dynamic(() => import('@/features/sw-calculation/WaterSaturationParams'), {
    loading: () => <div className="p-4">Loading water saturation calculation parameters...</div>,
    ssr: false
});

const RWACalculationParams = dynamic(() => import('@/features/water-resistivity-calculation/WaterResistivityParams'), {
    loading: () => <div className="p-4">Loading RWA calculation parameters...</div>,
    ssr: false
});

const GsaCalculationParams = dynamic(() => import('@/features/rgsa-ngsa-dgsa/GsaCalculationParams'), {
    loading: () => <div className="p-4">Loading GSA calculation parameters...</div>,
    ssr: false
});

const TrimDataParams = dynamic(() => import('@/features/trim_data/TrimDataParams'), {
    loading: () => <div className="p-4">Loading trim data parameters...</div>,
    ssr: false
});

<<<<<<< HEAD
// Replace previous dynamic imports with direct imports for these specific modules
import DnsDnsvCalculationPage from '@/features/dns-dnsv/page';
import RgbeRpbePage from '@/features/rgbe-rpbe/page';
import RtRoPage from '@/features/rt-ro/page';
import SworadPage from '@/features/sworad/page';

=======
>>>>>>> module-2-fixed
// Placeholder component for demonstration purposes
const SmoothingParamsForm = () => (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
        <h2 className="text-lg font-semibold">Smoothing Parameters</h2>
        <p className="text-gray-600 mt-2">This is a placeholder for the smoothing parameters form.</p>
    </div>
);

// Error component
const ErrorComponent = ({ moduleName }: { moduleName: string }) => (
    <div className="h-full p-4 md:p-6 bg-gray-50">
        <div className="p-4 border rounded-lg bg-red-50 text-red-700">
            <h2 className="text-lg font-semibold mb-2">Module Not Found</h2>
            <p>Parameter form for {moduleName} not found.</p>
            <button
                onClick={() => window.history.back()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Go Back
            </button>
        </div>
    </div>
);

interface ModulePageClientProps {
    moduleName: string;
    validModules: string[];
}

export default function ModulePageClient({ moduleName, validModules }: ModulePageClientProps) {
    const router = useRouter();
    const { addNormalizationResult } = useAppDataStore();
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState(null);

    // Check if module is valid
    const isValidModule = validModules.includes(moduleName);

    const handleNormalizationSubmit = async (activeParameters: ParameterRow[]) => {
        setIsLoading(true);

        try {
            const response = await fetch('/api/get-normalization-plot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activeParameters),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({
                    error: 'Server returned a non-JSON response'
                }));
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            const plotObject = await response.json();
            const resultId = `norm-${Date.now()}`;

            addNormalizationResult(resultId, plotObject);
            router.push(`/dashboard/results/${resultId}`);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            console.error('Submission Error:', errorMessage);
            alert(`Error: ${errorMessage}`);
            setIsLoading(false);
        }
    };

    const renderParameterForm = () => {
        switch (moduleName) {
            case 'trim-data':
                return (
                    <Suspense fallback={<div className="p-4">Loading trim data parameters...</div>}>
                        <TrimDataParams />
                    </Suspense>
                );
            case 'histogram':
                return (
                    <Suspense fallback={<div className="p-4">Loading histogram parameters...</div>}>
                        <HistogramParams />
                    </Suspense>
                );
            case 'crossplot-nphi-rhob':
                return (
                    <Suspense fallback={<div className="p-4">Loading crossplot parameters...</div>}>
                        <CrossplotViewerRHOB_NPHI />
                    </Suspense>
                );
            case 'crossplot-gr-nphi':
                return (
                    <Suspense fallback={<div className="p-4">Loading crossplot parameters...</div>}>
                        <CrossplotViewerGR_NPHI />
                    </Suspense>
                );
            case 'depth-matching':
                return (
                    <Suspense fallback={<div className="p-4">Loading depth matching parameters...</div>}>
                        <DepthMatchingPage />
                    </Suspense>
                );
            case 'normalization':
                return (
                    <Suspense fallback={<div className="p-4">Loading normalization parameters...</div>}>
                        <NormalizationParamsForm />
                    </Suspense>
                );
            case 'smoothing':
                return <SmoothingParamsForm />;
            case 'vsh-calculation':
                return (
                    <Suspense fallback={<div className="p-4">Loading VSH calculation parameters...</div>}>
                        <VshCalculationParams />
                    </Suspense>
                );
<<<<<<< HEAD
=======
            case 'vsh-dn-calculation':
                return (
                    <Suspense fallback={<div className="p-4">Loading VSH-DN calculation parameters...</div>}>
                        <VshDNCalculationParams />
                    </Suspense>
                );
>>>>>>> module-2-fixed
            case 'porosity-calculation':
                return (
                    <Suspense fallback={<div className="p-4">Loading porosity calculation parameters...</div>}>
                        <PorosityCalculationParams />
                    </Suspense>
                );
            case 'sw-calculation':
                return (
                    <Suspense fallback={<div className="p-4">Loading water saturation calculation parameters...</div>}>
                        <SWCalculationParams />
                    </Suspense>
                );
            case 'water-resistivity-calculation':
                return (
                    <Suspense fallback={<div className="p-4">Loading Water Resistivity calculation parameters...</div>}>
                        <RWACalculationParams />
                    </Suspense>
                );
            case 'rgsa-ngsa-dgsa':
                return (
                    <Suspense fallback={<div className="p-4">Loading GSA calculation parameters...</div>}>
                        <GsaCalculationParams />
                    </Suspense>
                );
<<<<<<< HEAD
            case 'rgbe-rpbe':
                return (
                    <Suspense fallback={<div className="p-4">Loading RGBE-RPBE calculation...</div>}>
                        <RgbeRpbePage />
                    </Suspense>
                );
            case 'swgrad':
                return (
                    <Suspense fallback={<div className="p-4">Loading SWORAD/SWGRAD parameters...</div>}>
                        <SworadPage />
                    </Suspense>
                );
            case 'dns-dnsv':
                return (
                    <Suspense fallback={<div className="p-4">Loading DNS-DNSV calculation...</div>}>
                        <DnsDnsvCalculationPage />
                    </Suspense>
                );
            case 'rt-ro':
                return (
                    <Suspense fallback={<div className="p-4">Loading RT-RO calculation...</div>}>
                        <RtRoPage />
                    </Suspense>
                );
=======
>>>>>>> module-2-fixed
            default:
                return <ErrorComponent moduleName={moduleName} />;
        }
    };

    // Show error if module is not valid
    if (!isValidModule) {
        return <ErrorComponent moduleName={moduleName} />;
    }

    return (
        <div className="h-full p-4 md:p-6 bg-gray-50">
            <h1 className="text-2xl font-bold mb-4 capitalize text-gray-800">
                {moduleName.replace('-', ' ')} Module
            </h1>
            {renderParameterForm()}
        </div>
    );
}