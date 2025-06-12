/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/WellLogPlot.tsx (Resolved version combining features)
'use client';

import React, { useState, useEffect } from 'react';
import { LogDataRow, MarkerData } from '@/types';

// Prefer the new structured imports from plot_function for clarity and future maintainability
import { extractMarkersWithMeanDepth, normalizeXover } from '@/plot_function/processData';
import { plotLine, plotXoverLogNormal, plotFlag, plotTextsMarker } from '@/plot_function/plotters';
import { layoutAxis, layoutDrawLines, layoutRangeAllAxis } from '@/plot_function/layout';

// Configuration from config/plotConfig, using constants defined there.
import { ratioPlots, DEPTH_COL, NULL_VALUE } from '@/config/plotConfig'; // Assuming NULL_VALUE is also in plotConfig

import dynamic from 'next/dynamic';
import { Layout, Data } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

// Props meniru argumen yang mungkin dibutuhkan oleh plot_log_default
interface WellLogPlotProps {
  initialData: LogDataRow[];
  wellName: string; // Digunakan sebagai fallback jika title tidak ada
  dfMarker?: MarkerData[]; // Opsional, untuk data marker terpisah
}

const WellLogPlot: React.FC<WellLogPlotProps> = (props) => {
  const { initialData, wellName, dfMarker } = props;

  const [plotData, setPlotData] = useState<Data[]>([]);
  const [plotLayout, setPlotLayout] = useState<Partial<Layout>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      setIsLoading(true);

      // --- 1. Persiapan Data ---
      const sortedData = [...initialData].sort((a, b) => a[DEPTH_COL] - b[DEPTH_COL]);
      // Use the NULL_VALUE from plotConfig. The filtering logic from 'main' is good.
      const filteredData = sortedData.filter(row => row.GR !== NULL_VALUE && row.RHOB !== NULL_VALUE);
      const processedData = normalizeXover(normalizeXover(filteredData, 'NPHI', 'RHOB'), 'RT', 'RHOB');
      // Keep dfMarker optional logic from 'plot-display'
      const extractedMarkers = dfMarker || extractMarkersWithMeanDepth(initialData);

      // --- 2. Mendefinisikan Urutan Plot (Sesuai Python) ---
      // FIX #1: Menggunakan sequence yang benar (from plot-display)
      const sequence = ['MARKER', 'GR', 'RT_RHOB', 'NPHI_RHOB'];
      const nPlots = sequence.length;

      const ratios = sequence.map(key => ratioPlots[key] || 1); // Use ratioPlots from config
      // FIX #2: Menggunakan spacing 0.0 sesuai `horizontal_spacing=0.0` from plot-display
      const domains = calculateDomains(ratios, nPlots, 0.0);

      // --- 3. Inisialisasi Plot Builder ---
      let dataBuilder: Data[] = [];
      let layoutBuilder: Partial<Layout> = {};
      let counter = 0;
      const axesMap: Record<string, string[]> = {};

      // --- 4. Loop Orkestrasi Plotting (Inti dari plot_log_default) ---
      sequence.forEach((key, index) => {
        const nSeq = index + 1;
        
        if (key === 'MARKER') {
          const result = plotFlag(dataBuilder, layoutBuilder, processedData, key, nSeq);
          dataBuilder = result.data;
          
          const maxDepth = Math.max(...processedData.map(d => d.DEPTH));
          layoutBuilder = plotTextsMarker(result.layout, extractedMarkers, maxDepth, nSeq);
          
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
          axesMap[key] = Object.keys(layoutBuilder).filter(k => k.startsWith('xaxis') || k.startsWith('yaxis'));
        }
      });

      // --- 5. Finalisasi Layout ---
      // Using layout functions from @/plot_function/layout
      let finalLayout = layoutRangeAllAxis(layoutBuilder, axesMap);
      // Use xgrid_intv=0 from plot-display for layoutDrawLines
      finalLayout = layoutDrawLines(finalLayout, domains, processedData, 0);
      finalLayout = layoutAxis(finalLayout, axesMap, domains);

      // --- 6. Atur Properti Layout Global (Sesuai Python) ---
      const minDepth = Math.min(...processedData.map(d => d[DEPTH_COL]));
      const maxDepth = Math.max(...processedData.map(d => d[DEPTH_COL]));

      // Combine title logic: use wellName from main, but retain position from plot-display if desired
      finalLayout.title = { text: `Well Log ${wellName}`, x: 0.5 }; // Use wellName but keep x: 0.5
      finalLayout.height = 600; // Prefer height from plot-display
      finalLayout.showlegend = false;
      finalLayout.plot_bgcolor = 'white';
      finalLayout.paper_bgcolor = 'white'; // Added from plot-display
      finalLayout.margin = { l: 20, r: 20, t: 80, b: 20 }; // From plot-display, good for header
      finalLayout.hovermode = 'y unified';

      finalLayout.yaxis = {
        ...finalLayout.yaxis,
        title: { text: 'DEPTH (m)' }, // Add title from main
        autorange: 'reversed',
        domain: [0, 0.8], // Domain for actual plot area, leaving space for header
        range: [maxDepth, minDepth], // Explicit range from plot-display
        showspikes: true, // From plot-display
        showgrid: false, // Added from main, assume grids are drawn manually
      };

      // Memastikan semua trace terhubung ke y-axis utama (from plot-display)
      dataBuilder.forEach(trace => { (trace as any).yaxis = 'y'; });

      setPlotData(dataBuilder);
      setPlotLayout(finalLayout);
      setIsLoading(false);
    }
  }, [initialData, wellName, dfMarker]); // Added dfMarker to dependency array

  if (isLoading) return <p>Membangun Plot...</p>;

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', background: 'white', borderRadius: '8px' }}>
      <Plot
        data={plotData}
        layout={plotLayout}
        style={{ width: '100%', height: '100%' }}
        // FIX #5: Menyesuaikan tombol modebar (from plot-display)
        config={{ responsive: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d','select2d','autoScale2d','zoomIn2d','zoomOut2d','pan2d','zoom2d'] as any }}
      />
    </div>
  );
};

// Helper untuk menghitung domain dengan spacing yang bisa diatur (from plot-display)
function calculateDomains(ratios: number[], nPlots: number, spacing: number): [number, number][] {
    const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
    const domains: [number, number][] = []; let currentStart = 0;
    if (nPlots <= 1) return [[0, 1]];

    const plotAreaWidth = 1 - ((nPlots - 1) * spacing); // Use spacing from argument

    for (let i = 0; i < ratios.length; i++) {
        const normalizedWidth = (ratios[i] / totalRatio) * plotAreaWidth;
        const end = currentStart + normalizedWidth;
        domains.push([currentStart, end]);
        currentStart = end + spacing;
    }
    return domains;
}

export default WellLogPlot;