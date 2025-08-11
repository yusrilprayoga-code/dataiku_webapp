'use client';
import React from 'react';
import GsaBaseParams from '@/features/rgsa-ngsa-dgsa/GsaCalculationParams';

export default function NgsaParams() {
    return (
        <GsaBaseParams
            moduleTitle="NGSA (Neutron-Gamma Ray) Calculation"
            apiEndpoint="/api/run-ngsa"
            relevantParams={['SLIDING_WINDOW', 'GR', 'NEUT']}
        />
    );
}