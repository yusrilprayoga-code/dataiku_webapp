/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/WellLogPlot.tsx (Versi Final dengan Filter Data)
'use client';

import React, { useState, useEffect } from 'react';
import { LogDataRow } from '@/types';
import { extractMarkersWithMeanDepth, normalizeXover } from '@/utils/processData';
import { plotLine, plotXoverLogNormal, plotFlag, plotTextsMarker } from '@/utils/plotters';
import { layoutAxis, layoutDrawLines, layoutRangeAllAxis } from '@/utils/layout';
import { ratioPlots, DEPTH_COL } from '@/config/plotConfig';
import dynamic from 'next/dynamic';
import { Layout, Data } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface WellLogPlotProps {
  initialData: LogDataRow[];
  wellName: string;
}

// Nilai null standar di file LAS
const NULL_VALUE = -999.25;

const WellLogPlot: React.FC<WellLogPlotProps> = ({ initialData, wellName }) => {
  const [plotData, setPlotData] = useState<Data[]>([]);
  const [plotLayout, setPlotLayout] = useState<Partial<Layout>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      
      // FIX #1: Urutkan dan filter data null
      const sortedData = [...initialData].sort((a, b) => a[DEPTH_COL] - b[DEPTH_COL]);
      const filteredData = sortedData.filter(row => {
        // Hapus baris jika nilai GR atau RHOB adalah nilai null
        return row.GR !== NULL_VALUE && row.RHOB !== NULL_VALUE;
      });

      const processedData = normalizeXover(normalizeXover(filteredData, 'NPHI', 'RHOB'), 'RT', 'RHOB');
      const extractedMarkers = extractMarkersWithMeanDepth(initialData); // Marker bisa diambil dari data asli

      const sequence = ['MARKER', 'GR', 'RT_RHOB', 'NPHI_RHOB'];
      const nPlots = sequence.length;
      const ratios = sequence.map(key => ratioPlots[key] || 1);
      const domains = calculateDomains(ratios, nPlots);

      let dataBuilder: Data[] = [];
      let layoutBuilder: Partial<Layout> = {}; 
      let counter = 0;
      const axesMap: Record<string, string[]> = {};

      sequence.forEach((key, index) => {
        const nSeq = index + 1;
        axesMap[key] = [];

        let result;
        switch (key) {
          case 'MARKER':
            result = plotFlag(dataBuilder, layoutBuilder, processedData, key, nSeq);
            layoutBuilder = plotTextsMarker(result.layout, extractedMarkers, Math.max(...processedData.map(d => d[DEPTH_COL])), nSeq);
            (layoutBuilder as any)[`xaxis${nSeq}`] = { ...((layoutBuilder as any)[`xaxis${nSeq}`] || {}), domain: domains[index] };
            break;
          case 'GR':
            result = plotLine(dataBuilder, layoutBuilder, processedData, key, nSeq, { domain: domains[index] });
            break;
          case 'RT_RHOB':
            result = plotXoverLogNormal(dataBuilder, layoutBuilder, processedData, key, nSeq, counter, nPlots, { domain: domains[index] });
            counter = (result as any).counter;
            break;
          case 'NPHI_RHOB':
            result = plotXoverLogNormal(dataBuilder, layoutBuilder, processedData, key, nSeq, counter, nPlots, { yColor: 'yellow', domain: domains[index] });
            counter = (result as any).counter;
            break;
        }
        if(result) {
            dataBuilder = result.data;
            layoutBuilder = result.layout;
            axesMap[key] = Object.keys(layoutBuilder).filter(k => k.startsWith('xaxis') || k.startsWith('yaxis'));
        }
      });
      
      let finalLayout = layoutRangeAllAxis(layoutBuilder, axesMap);
      finalLayout = layoutDrawLines(finalLayout, ratios, processedData, 50);
      finalLayout = layoutAxis(finalLayout, axesMap, ratios);

      finalLayout.title = { text: `Well Log ${wellName}`, y: 0.99, font: { size: 16 } };
      finalLayout.height = 800;
      finalLayout.showlegend = false;
      // FIX #2: Konfigurasi Y-Axis utama yang akan digunakan bersama
      finalLayout.yaxis = { 
        title: { text: 'DEPTH (m)' },
        autorange: 'reversed', 
        domain: [0, 0.8], // Domain 80% di bawah, menyisakan 20% untuk header
        showgrid: false, // Grid akan digambar manual dengan shapes
      };
      finalLayout.margin = { l: 60, r: 40, t: 140, b: 40 };
      finalLayout.hovermode = 'y unified';
      finalLayout.plot_bgcolor = 'white';

      setPlotData(dataBuilder);
      setPlotLayout(finalLayout);
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

function calculateDomains(ratios: number[], nPlots: number): [number, number][] {
    const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0);
    const domains: [number, number][] = [];
    let currentStart = 0;
    const spacing = 0.01;
    const plotAreaWidth = 1 - (nPlots > 1 ? (nPlots - 1) * spacing : 0);

    for (let i = 0; i < ratios.length; i++) {
        const normalizedWidth = (ratios[i] / totalRatio) * plotAreaWidth;
        const end = currentStart + normalizedWidth;
        domains.push([currentStart, end]);
        currentStart = end + spacing;
    }
    return domains;
}

export default WellLogPlot;