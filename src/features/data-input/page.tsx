// FILE: app/data-input/page.tsx

import React, { Suspense } from 'react';
import DataInputClient from '@/features/data-input/components/DataInputClient'; // Import our new client component
import Loading from './loading'; // Import the loading UI

export default function DataInput() {
  // This is now a Server Component. It has no hooks or state.
  return (
    <Suspense fallback={<Loading />}>
      <DataInputClient />
    </Suspense>
  );
}