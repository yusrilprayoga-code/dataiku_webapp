/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/WellLogPlot.tsx (Disesuaikan dengan plot_log_default)
'use client';

import React, { useState, useEffect } from 'react';
import { LogDataRow, MarkerData } from '@/types';
import * as plotFns from '@/config/plotFunction';
import * as layoutFns from '@/config/plotLayout';
import * as plotCfgs from '@/config/plotConfig';
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
      const sortedData = [...initialData].sort((a, b) => a[plotCfgs.DEPTH_COL] - b[plotCfgs.DEPTH_COL]);
      const filteredData = sortedData.filter(row => row.GR !== plotCfgs.NULL_VALUE && row.RHOB !== plotCfgs.NULL_VALUE);
      const processedData = plotFns.normalizeXover(plotFns.normalizeXover(filteredData, 'NPHI', 'RHOB'), 'RT', 'RHOB');
      const extractedMarkers = dfMarker || plotFns.extractMarkersWithMeanDepth(initialData);

      // --- 2. Mendefinisikan Urutan Plot (Sesuai Python) ---
      // FIX #1: Menggunakan sequence yang benar
      const sequence = ['MARKER', 'GR', 'RT_RHOB', 'NPHI_RHOB'];
      const nPlots = sequence.length;

      const ratios = sequence.map(key => plotCfgs.ratioPlots[key] || 1);
      // FIX #2: Menggunakan spacing 0.0 sesuai `horizontal_spacing=0.0`
      const domains = calculateDomains(ratios, nPlots, 0.0);

      // --- 3. Inisialisasi Plot Builder ---
      let dataBuilder: Data[] = [];
      let layoutBuilder: Partial<Layout> = {}; 
      let counter = 0;
      const axesMap: Record<string, string[]> = {};

      // --- 4. Loop Orkestrasi Plotting (Inti dari plot_log_default) ---
      sequence.forEach((key, index) => {
        const nSeq = index + 1;
        let result: { data: Data[], layout: Partial<Layout>, counter?: number } | undefined;

        switch (key) {
          case 'MARKER':
            // Memanggil plotFlag dan plotTextsMarker
            const flagResult = plotFns.plotFlag(dataBuilder, layoutBuilder, processedData, key, nSeq);
            const finalLayoutForMarker = plotFns.plotTextsMarker(
              flagResult.layout, 
              extractedMarkers, 
              Math.max(...processedData.map(d => d[plotCfgs.DEPTH_COL])), 
              nSeq
            );
            result = {
              data: flagResult.data,
              layout: finalLayoutForMarker
            };
            break;
          case 'GR':
            result = plotFns.plotLine(dataBuilder, layoutBuilder, processedData, key, nSeq, { domain: domains[index], col: 'GR', label: 'GR' });
            break;
          case 'RT_RHOB':
            result = plotFns.plotXoverLogNormal(dataBuilder, layoutBuilder, processedData, key, nSeq, counter, nPlots, {
              yColor: 'limegreen',
              nColor: 'lightgray',
              type: 1, // Sesuai kode Python
              excludeCrossover: false,
              domain: domains[index]
            });
            counter = result.counter!;
            break;
          case 'NPHI_RHOB':
            result = plotFns.plotXoverLogNormal(dataBuilder, layoutBuilder, processedData, key, nSeq, counter, nPlots, {
              yColor: 'rgba(0,0,0,0)', // Sesuai kode Python
              nColor: 'yellow',
              type: 2, // Sesuai kode Python
              excludeCrossover: false,
              domain: domains[index]
            });
            counter = result.counter!;
            break;
        }

        if(result) {
          dataBuilder = result.data;
          layoutBuilder = result.layout;
          axesMap[key] = Object.keys(layoutBuilder).filter(k => k.startsWith('xaxis') || k.startsWith('yaxis'));
        }
      });
      
      // --- 5. Finalisasi Layout ---
      let finalLayout = layoutFns.layoutRangeAllAxis(layoutBuilder, axesMap);
      finalLayout = layoutFns.layoutDrawLines(finalLayout, domains, processedData, 0); // xgrid_intv=0
      finalLayout = layoutFns.layoutAxis(finalLayout, axesMap, domains);

      // --- 6. Atur Properti Layout Global (Sesuai Python) ---
      const minDepth = Math.min(...processedData.map(d => d[plotCfgs.DEPTH_COL]));
      const maxDepth = Math.max(...processedData.map(d => d[plotCfgs.DEPTH_COL]));
      
      // FIX #4: Menyesuaikan properti layout global
      finalLayout.title = { text: "Well Log ABB-036", x: 0.5 };
      finalLayout.height = 600;
      finalLayout.showlegend = false;
      finalLayout.plot_bgcolor = 'white';
      finalLayout.paper_bgcolor = 'white';
      finalLayout.margin = { l: 20, r: 20, t: 80, b: 20 }; // Top margin butuh sedikit ruang untuk header
      finalLayout.hovermode = 'y unified';
      
      finalLayout.yaxis = { 
        ...finalLayout.yaxis, 
        autorange: 'reversed', 
        domain: [0, 0.8], // Domain tetap dipertahankan untuk header
        range: [maxDepth, minDepth],
        showspikes: true,
      };

      // Memastikan semua trace terhubung ke y-axis utama
      dataBuilder.forEach(trace => { (trace as any).yaxis = 'y'; });
      
      setPlotData(dataBuilder);
      setPlotLayout(finalLayout);
      setIsLoading(false);
    }
  }, [initialData, wellName, dfMarker]);

  if (isLoading) return <p>Membangun Plot...</p>;

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', background: 'white', borderRadius: '8px' }}>
      <Plot
        data={plotData}
        layout={plotLayout}
        style={{ width: '100%', height: '100%' }}
        // FIX #5: Menyesuaikan tombol modebar
        config={{ responsive: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d','select2d','autoScale2d','zoomIn2d','zoomOut2d','pan2d','zoom2d'] as any }}
      />
    </div>
  );
};

// Helper untuk menghitung domain dengan spacing yang bisa diatur
function calculateDomains(ratios: number[], nPlots: number, spacing: number): [number, number][] {
    const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
    const domains: [number, number][] = []; let currentStart = 0;
    if (nPlots <= 1) return [[0, 1]];
    
    const plotAreaWidth = 1 - ((nPlots - 1) * spacing);

    for (let i = 0; i < ratios.length; i++) {
        const normalizedWidth = (ratios[i] / totalRatio) * plotAreaWidth;
        const end = currentStart + normalizedWidth;
        domains.push([currentStart, end]);
        currentStart = end + spacing;
    }
    return domains;
}

export default WellLogPlot;