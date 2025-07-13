'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import { Loader2 } from 'lucide-react';

export default function SwgradPage() {
    const { selectedWells } = useDashboard();
    const router = useRouter();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const runEndpoint = `${apiUrl}/api/run-swgrad`;

    useEffect(() => {
        // Ensure wells are selected before trying to run the calculation
        if (!selectedWells || selectedWells.length === 0) {
            alert("⚠️ No wells selected. Please go back to the dashboard and select at least one well.");
            router.push('/dashboard');
            return;
        }

        const runCalculation = async () => {
            // The payload for a parameter-less calculation
            const payload = {
                selected_wells: selectedWells,
                params: {}, // Send empty params if the backend expects the key
            };

            console.log("Sending payload to backend for SWGRAD calculation:", payload);

            try {
                // Call the calculation endpoint
                const response = await fetch(runEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Server error during calculation.');
                }

                const result = await response.json();
                alert("✅ " + result.message); // Show success message

                // Redirect to the main dashboard
                router.push('/dashboard');

            } catch (error) {
                alert(`❌ Calculation Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                router.push('/dashboard'); // Redirect back to the dashboard on error
            }
        };

        runCalculation();

    }, [router, selectedWells, apiUrl, runEndpoint]);

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
            <h1 className="text-2xl font-bold mb-2">Running SWGRAD Calculation...</h1>
            <p className="text-gray-600">Please wait. You will be redirected automatically when the process is complete.</p>
        </div>
    );
}
