'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';

export default function RtRoPage() {
    const { selectedWells } = useDashboard();
    const router = useRouter();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const endpoint = `${apiUrl}/api/run-rt-r0`;

    useEffect(() => {
        const runCalculation = async () => {
            // 1. Check if wells are selected
            if (!selectedWells || selectedWells.length === 0) {
                alert("⚠️ No wells selected. Please go back and select at least one well.");
                router.push('/dashboard');
                return;
            }

            // 2. Prepare the payload for the backend
            const payload = {
                // Standardizing the key to 'selected_wells' for consistency
                selected_wells: selectedWells,
                params: {} // Assuming no parameters are needed
            };

            console.log("Sending payload to backend for RT/RO calculation:", payload);

            try {
                // 3. Call the calculation endpoint
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Server error during calculation.');
                }

                // 4. Show success message and redirect
                const result = await response.json();
                alert("✅ " + result.message);
                router.push('/dashboard');

            } catch (error) {
                // 5. Show error message and redirect
                alert(`❌ Calculation Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                router.push('/dashboard');
            }
        };

        runCalculation();

    }, [selectedWells, router, apiUrl, endpoint]);

    // This UI is shown while the calculation is in progress
    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
            <h1 className="text-2xl font-bold mb-2">Running RT/RO Calculation...</h1>
            <p className="text-gray-600">Please wait. You will be redirected automatically when the process is complete.</p>
        </div>
    );
}