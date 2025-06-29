/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any*/
// frontend/src/features/modules/ModuleClientView.tsx

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Import all your specific parameter form components
// Make sure these paths are correct for your project structure
import NormalizationParamsForm from '@/features/normalization/NormalizationParams';
import DepthMatchingPage from '@/features/depth-matching/page';
import VshCalculationParams from '@/features/vsh-calculation/VshCalculationParams';
import PorosityCalculationParams from '@/features/porosity/PorosityCalculationParams';
import GsaCalculationParams from '@/features/rgsa-ngsa-dgsa/GsaCalculationParams';
import TrimDataParams from '@/features/trim_data/TrimDataParams';

// A generic placeholder for modules that are not yet implemented
const NotImplementedModule = ({ moduleName }: { moduleName: string }) => (
    <div className="p-4 border rounded-lg bg-yellow-50 text-yellow-800 shadow-sm">
        <h2 className="text-lg font-semibold">Module Not Implemented</h2>
        <p className="text-gray-600 mt-2">The UI and logic for the &apos;{moduleName}&apos; module have not been created yet.</p>
    </div>
);

// This component receives the moduleName as a simple string prop.
// It is NOT async and can safely use hooks.
export default function ModuleClientView({ moduleName }: { moduleName: string }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [apiResult, setApiResult] = useState<any>(null);

    /**
     * A generic function to handle submissions from any child form component.
     * @param payload - The JSON data to send to the backend.
     * @param endpointPath - The specific API path for the module (e.g., '/api/run-vsh-calculation').
     */
    const handleFormSubmit = async (payload: any, endpointPath: string) => {
        setIsLoading(true);
        setError(null);
        setApiResult(null);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            if (!apiUrl) throw new Error("API URL is not configured. Please set NEXT_PUBLIC_API_URL in your environment variables.");

            const endpoint = `${apiUrl}${endpointPath}`;
            console.log(`Submitting to ${endpoint} with payload:`, payload);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.error || `Server error: ${response.status}`);
            }

            console.log("Received successful response:", responseData);
            setApiResult(responseData);
            alert(responseData.message || "Operation completed successfully!");

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            console.error('Submission Error:', errorMessage);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Renders the correct parameter form based on the moduleName prop.
     * It passes the generic `handleFormSubmit` function and `isLoading` state to each child.
     */
    const renderParameterForm = () => {
        switch (moduleName) {
            case 'trim-data':
                return <TrimDataParams />;
            //   case 'depth-matching':
            //     // Assuming DepthMatchingPage is updated to accept these props
            //     return <DepthMatchingPage onSubmit={handleFormSubmit} isSubmitting={isLoading} />;
            //   case 'normalization':
            //     return <NormalizationParamsForm onSubmit={handleFormSubmit} isSubmitting={isLoading} />;
            //   case 'vsh-calculation':
            //     return <VshCalculationParams onSubmit={handleFormSubmit} isSubmitting={isLoading} />;
            //   case 'porosity-calculation':
            //     return <PorosityCalculationParams onSubmit={handleFormSubmit} isSubmitting={isLoading} />;
            //   case 'rgsa-ngsa-dgsa':
            //     return <GsaCalculationParams onSubmit={handleFormSubmit} isSubmitting={isLoading} />;
            default:
                return <NotImplementedModule moduleName={moduleName} />;
        }
    };

    return (
        <div className="h-full p-4 md:p-6 bg-gray-50 space-y-6">
            <h1 className="text-2xl font-bold capitalize text-gray-800 border-b pb-2">{moduleName.replace(/-/g, ' ')} Module</h1>

            {renderParameterForm()}

            {/* Display area for loading states and results */}
            {isLoading && (
                <div className="flex items-center justify-center p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <Loader2 className="mr-2 h-6 w-6 animate-spin text-blue-600" />
                    <span className="text-blue-700 font-medium">Processing on server, please wait...</span>
                </div>
            )}
            {error && (
                <div className="p-4 border rounded-lg bg-red-100 text-red-700">
                    <h3 className="font-bold">An Error Occurred</h3>
                    <p>{error}</p>
                </div>
            )}
            {apiResult && (
                <div className="p-4 border rounded-lg bg-green-100 text-green-800">
                    <h3 className="font-bold">Success</h3>
                    <p>{apiResult.message}</p>
                    {/* Optionally display the full JSON response for debugging */}
                    <pre className="mt-2 text-xs whitespace-pre-wrap break-all bg-white p-2 rounded">
                        {JSON.stringify(apiResult, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
