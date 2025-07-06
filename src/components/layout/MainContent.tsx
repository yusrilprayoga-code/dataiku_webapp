// src/components/layout/MainContent.tsx

'use client';
import React from 'react';

export default function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 relative overflow-y-auto bg-gray-100 p-4 md:p-6">
        {children}
    </main>
  );
}