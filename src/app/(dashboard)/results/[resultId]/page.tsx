// src/app/(dashboard)/results/[resultId]/page.tsx

import React from 'react';
import ResultPageClient from './ResultPageClient';

export const dynamic = 'force-static';
export const revalidate = 0;

export async function generateStaticParams() {
  return [];
}

interface ResultPageProps {
  params: { resultId: string };
}

export default function ResultPage({ params }: ResultPageProps) {
  return <ResultPageClient resultId={params.resultId} />;
}
