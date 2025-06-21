// src/components/layout/MainContent.tsx

'use client';
import React from 'react';

export default function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 p-6 overflow-auto">
      <div className="bg-white h-full w-full rounded-lg shadow-lg p-4 relative">
        {children}
      </div>
    </main>
  );
}