/* eslint-disable @typescript-eslint/no-unused-vars */
// frontend/src/app/(dashboard)/modules/[moduleName]/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import NormalizationParamsForm from '@/components/forms/NormalizationParams';
import { useAppDataStore } from '@/stores/useAppDataStore';
import { type ParameterRow } from '@/types';

// frontend/src/app/(dashboard)/modules/[moduleName]/page.tsx
'use client';

// KODE INI SENGAJA DIBUAT SANGAT SEDERHANA UNTUK TUJUAN DEBUGGING
// Tidak ada state, tidak ada effect, tidak ada fetch, tidak ada apa-apa.

export default function ModulePage({ params }: { params: { moduleName: string } }) {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Halaman Modul Uji Coba</h1>
      <p style={{ marginTop: '1rem', fontSize: '1.2rem' }}>
        Jika Anda melihat halaman ini, artinya proses build berhasil!
      </p>
      <p>Modul yang dipilih: <strong>{params.moduleName}</strong></p>
    </div>
  );
}