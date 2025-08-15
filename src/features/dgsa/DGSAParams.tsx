'use client';
import React from 'react';
import GsaBaseParams from '@/features/rgsa-ngsa-dgsa/GsaCalculationParams';

export default function DgsaParams() {
    return (
        <GsaBaseParams
            moduleTitle="DGSA (Density-Gamma Ray) Calculation"
            apiEndpoint="/api/run-dgsa"
            relevantParams={['SLIDING_WINDOW', 'RHOBWAT_MAX', 'RHOBWAT_MIN', 'GR', 'DENS']}
        />
    );
}