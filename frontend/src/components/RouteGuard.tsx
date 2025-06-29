'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDataStore } from '@/stores/useAppDataStore';

export default function RouteGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const stagedStructure = useAppDataStore(state => state.stagedStructure);

    useEffect(() => {
        // Check both Zustand and localStorage
        const hasStagedData = stagedStructure || localStorage.getItem('stagedStructure');

        if (!hasStagedData) {
            console.warn('No staged data found, redirecting to upload');
            router.replace('/');
        }
    }, [stagedStructure, router]);

    return <>{children}</>;
}