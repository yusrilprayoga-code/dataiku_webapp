// FILE: app/data-input/loading.tsx

import { Loader2 } from 'lucide-react';

export default function Loading() {
    // You can add any UI you want here.
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            <p className="ml-4">Loading Page...</p>
        </div>
    );
}