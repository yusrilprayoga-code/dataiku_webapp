// src/features/results-display/components/WellLogPlot.tsx

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { type Layout, type Data } from 'plotly.js';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Define the props the component expects
interface WellLogPlotProps {
  data: Data[];
  layout: Partial<Layout>;
}

const WellLogPlot: React.FC<WellLogPlotProps> = ({ data, layout }) => {
  // No more useState, useEffect, or fetch! Just rendering.
  return (
    <div className="h-full w-full">
      <Plot
        data={data}
        layout={{ ...layout, autosize: true }}
        style={{ width: '100%', height: '100%' }}
        config={{ responsive: true, displaylogo: false }}
      />
    </div>
  );
};

export default WellLogPlot;