'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';
import { Loader2 } from 'lucide-react';

export default function DnsDnsvCalculationPage() {
    const { selectedWells } = useDashboard();
    const router = useRouter();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    useEffect(() => {
        // Ensure wells are selected before running
        if (selectedWells.length === 0) {
            alert("⚠️ No wells selected. Please select at least one well.");
            router.push('/dashboard');
            return;
        }

        const runDnsDnsvCalculation = async () => {
            // The payload for a parameter-less calculation
            const payload = {
                selected_wells: selectedWells,
                // Sending empty params object if the backend expects it
                params: {},
            };

            console.log("Sending payload to backend:", payload);

            try {
                // Point to your DNS/DNSV calculation endpoint
                const response = await fetch(`${apiUrl}/api/run-dns-dnsv`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Server error');
                }

                const result = await response.json();
                alert("✅ " + result.message);

                // Redirect to the dashboard or the plot page after completion
                router.push('/dashboard');

            } catch (error) {
                alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                router.push('/dashboard'); // Redirect back on error
            }
        };

        runDnsDnsvCalculation();
    }, [router, selectedWells, apiUrl]);

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4" />
            <h1 className="text-2xl font-bold mb-2">Running DNS/DNSV Calculation...</h1>
            <p className="text-gray-600">Please wait. You will be redirected automatically when the process is complete.</p>
        </div>
    );
}