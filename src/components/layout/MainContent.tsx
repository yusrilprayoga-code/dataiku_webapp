// src/components/layout/MainContent.tsx
'use client';
import React from 'react';

// Terima `children` sebagai prop
export default function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="bg-white h-full w-full rounded-lg shadow-lg p-4">
        {/* Render konten apa pun yang dikirimkan */}
        {children}
      </div>
    </div>
  );
}