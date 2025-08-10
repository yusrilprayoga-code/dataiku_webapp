'use client';
import React from 'react';
import GsaBaseParams from '@/features/rgsa-ngsa-dgsa/GsaCalculationParams';

export default function RgsaParams() {
    return (
        <GsaBaseParams
            moduleTitle="RGSA (Resistivity-Gamma Ray) Calculation"
            apiEndpoint="/api/run-rgsa"
            relevantParams={['SLIDING_WINDOW', 'GR', 'RES']}
        />
    );
}