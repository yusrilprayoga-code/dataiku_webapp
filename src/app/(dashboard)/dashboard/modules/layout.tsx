// This is a Server Component, no 'use client' directive
import React from 'react';

// This function will run on the server at build time
export async function generateStaticParams() {
    // This list must match the module names in your page.tsx switch statement
    const modules = [
        'trim-data',
        'depth-matching',
        'normalization',
        'smoothing',
        'vsh-calculation',
        'porosity-calculation',
        'rgsa-ngsa-dgsa',
        'fill-missing',
        'sw-calculation',
        'water-resistivity-calculation',
        'rpbe-robe',
        'dns-dnsv',
        'sworad',
    ];

    console.log('Generating static params for modules:', modules); // This will show up in your build logs

    // Return the array of parameters to pre-render
    return modules.map(moduleName => ({
        moduleName: moduleName,
    }));
}

// This layout component wraps the page.tsx component
export default function ModulesLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}