/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/WellLogPlot.tsx (Perbaikan Final untuk Type Assertion)
'use client';

import React, { useState, useEffect } from 'react';
import { LogDataRow } from '@/types';
import { extractMarkersWithMeanDepth, normalizeXover } from '@/utils/processData';
import { plotLine, plotXoverLogNormal, plotFlag, plotTextsMarker } from '@/utils/plotters';
import { ratioPlots } from '@/config/plotConfig';
import dynamic from 'next/dynamic';
import { Layout, Data } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface WellLogPlotProps {
  initialData: LogDataRow[];
  wellName: string;
}

const WellLogPlot: React.FC<WellLogPlotProps> = ({ initialData, wellName }) => {
  const [plotData, setPlotData] = useState<Data[]>([]);
  const [plotLayout, setPlotLayout] = useState<Partial<Layout>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      
      const processedData = normalizeXover(initialData, 'NPHI', 'RHOB');
      const extractedMarkers = extractMarkersWithMeanDepth(initialData);

      const sequence = ['MARKER', 'GR', 'RT', 'NPHI_RHOB'];
      const nPlots = sequence.length;

      const ratios = sequence.map(key => ratioPlots[key] || 1);
      const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0);
      const domains: [number, number][] = [];
      let currentStart = 0;
      const spacing = 0.01;

      for (let i = 0; i < ratios.length; i++) {
        const normalizedWidth = (ratios[i] / totalRatio) * (1 - (nPlots - 1) * spacing);
        const end = currentStart + normalizedWidth;
        domains.push([currentStart, end]);
        currentStart = end + spacing;
      }

      let dataBuilder: Data[] = [];
      let layoutBuilder: Partial<Layout> = {}; 
      let counter = 0;

      sequence.forEach((key, index) => {
        const nSeq = index + 1;
        
        if (key === 'MARKER') {
          const result = plotFlag(dataBuilder, layoutBuilder, processedData, key, nSeq);
          dataBuilder = result.data;
          
          const maxDepth = Math.max(...processedData.map(d => d.DEPTH));
          layoutBuilder = plotTextsMarker(result.layout, extractedMarkers, maxDepth, nSeq);
          
          // FIX: Gunakan Type Assertion 'as any' untuk mengatur domain
          (layoutBuilder as any)[`xaxis${nSeq}`].domain = domains[index];

        } else if (key === 'GR') {
          const result = plotLine(dataBuilder, layoutBuilder, processedData, key, nSeq, {
            domain: domains[index]
          });
          dataBuilder = result.data;
          layoutBuilder = result.layout;
          
        } else if (key === 'RT') {
          const result = plotLine(dataBuilder, layoutBuilder, processedData, key, nSeq, {
            type: 'log',
            domain: domains[index]
          });
          dataBuilder = result.data;
          layoutBuilder = result.layout;

        } else if (key === 'NPHI_RHOB') {
          const result = plotXoverLogNormal(dataBuilder, layoutBuilder, processedData, key, nSeq, counter, nPlots, {
            yColor: 'yellow',
            domain: domains[index]
          });
          dataBuilder = result.data;
          layoutBuilder = result.layout;
          counter = result.counter;
        }
      });
      
      layoutBuilder.title = { text: `Well Log ${wellName}` };
      layoutBuilder.height = 800;
      layoutBuilder.showlegend = false;
      layoutBuilder.yaxis = { autorange: 'reversed', title: { text: 'DEPTH (m)' } };
      layoutBuilder.margin = { l: 60, r: 40, t: 80, b: 40 };
      layoutBuilder.hovermode = 'y unified';
      layoutBuilder.plot_bgcolor = 'white';

      setPlotData(dataBuilder);
      setPlotLayout(layoutBuilder);
      setIsLoading(false);
    }
  }, [initialData, wellName]);

  if (isLoading) return <p>Membangun Plot...</p>;

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', background: 'white', borderRadius: '8px' }}>
      <Plot
        data={plotData}
        layout={plotLayout}
        style={{ width: '100%', height: '100%' }}
        config={{ responsive: true, displaylogo: false, modeBarButtonsToRemove: ['select2d', 'lasso2d'] }}
      />
    </div>
  );
};

export default WellLogPlot;