"use client"; // WAJIB! Plotly.js adalah library client-side.

import React from 'react';
import Plot from 'react-plotly.js';
import { ParsedLasData } from 'codes/lib/las-parser';

// Tipe untuk data marker
interface Marker {
  top: number;
  base: number;
  formation: string;
  color: string;
}

interface WellLogPlotProps {
  logData: ParsedLasData[]; 
  markerData: Marker[];      
}

const WellLogPlot: React.FC<WellLogPlotProps> = ({ logData, markerData }) => {
  const depth = logData.map(d => d['DEPT'] as number);

  // --- Trace untuk setiap track ---

  // TRACK 1: Marker (disimulasikan dengan heatmap)
  const markerTrace = {
    x: markerData.map(m => m.formation),
    y: markerData.map(m => (m.top + m.base) / 2), // Posisi tengah untuk label
    text: markerData.map(m => m.formation),
    mode: 'text',
    xaxis: 'x1',
    yaxis: 'y1',
  };

  // TRACK 2: GR (Gamma Ray)
  const grTrace = {
    x: logData.map(d => d['GR']),
    y: depth,
    name: 'GR',
    mode: 'lines',
    line: { color: 'darkgreen', width: 1.5 },
    xaxis: 'x2',
  };

  // TRACK 3: RT (Resistivity) & RHOB (Density)
  const rtTrace = {
    x: logData.map(d => d['RT']),
    y: depth,
    name: 'RT',
    mode: 'lines',
    line: { color: 'red', width: 1.5 },
    xaxis: 'x3',
  };
  const rhobTrace_track3 = { // RHOB di track RT
    x: logData.map(d => d['RHOB']),
    y: depth,
    name: 'RHOB',
    mode: 'lines',
    line: { color: 'blue', width: 1.5 },
    xaxis: 'x5', // Sumbu X sekunder untuk skala berbeda
  };


  // TRACK 4: NPHI (Neutron Porosity) & RHOB (Density) Crossover
  const nphiTrace = {
    x: logData.map(d => d['NPHI']),
    y: depth,
    name: 'NPHI',
    mode: 'lines',
    line: { color: 'blue', width: 1.5, dash: 'dash' },
    xaxis: 'x4',
  };
  const rhobTrace_track4 = { // RHOB di track NPHI
    x: logData.map(d => d['RHOB']),
    y: depth,
    name: 'RHOB',
    mode: 'lines',
    line: { color: 'red', width: 1.5 },
    xaxis: 'x4',
  };
  
  // Shading untuk crossover NPHI-RHOB
  const crossoverFill = {
    x: [
      ...logData.map(d => d['NPHI']),
      ...[...logData.map(d => d['RHOB'])].reverse()
    ],
    y: [
      ...depth,
      ...[...depth].reverse()
    ],
    fill: 'toself',
    fillcolor: 'rgba(255, 0, 0, 0.2)', // Merah transparan saat RHOB > NPHI
    line: { color: 'transparent' },
    name: 'Gas Crossover',
    xaxis: 'x4',
    showlegend: false,
  };


  // --- Konfigurasi Layout Plot ---
  const layout: Partial<Plotly.Layout> = {
    title: { text: 'Well Log ABB-036' },
    height: 1200, // Atur tinggi plot sesuai kebutuhan
    showlegend: false,
    hovermode: 'y unified',
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',

    // Sumbu Y utama (DEPTH)
    yaxis: {
      title: { text: 'DEPTH (m)' },
      autorange: 'reversed',
      zeroline: false,
      gridcolor: '#e0e0e0',
    },
    
    // Konfigurasi setiap track (sumbu X)
    xaxis: { title: { text: 'MARKER' }, domain: [0, 0.1], zeroline: false, showticklabels: false },
    xaxis2: { title: { text: 'GR' }, domain: [0.12, 0.37], gridcolor: '#e0e0e0' },
    xaxis3: { title: { text: 'RT/RHOB' }, domain: [0.39, 0.64], type: 'log', gridcolor: '#e0e0e0' },
    xaxis4: { title: { text: 'NPHI/RHOB' }, domain: [0.66, 1], gridcolor: '#e0e0e0', autorange: 'reversed' },

    xaxis5: { 
        overlaying: 'x3', 
        side: 'top', 
        showgrid: false, 
        title: { text: 'RHOB' }, 
        type: 'linear' 
    },

    // Bentuk untuk marker (simulasi bar)
    shapes: markerData.flatMap(m => ([
        { type: 'rect', xref: 'paper', yref: 'y', x0: 0, y0: m.top, x1: 0.1, y1: m.base, fillcolor: m.color, opacity: 0.3, line: { width: 0 } }
    ])),
  };

  return (
    <Plot
      data={[markerTrace, grTrace, rtTrace, rhobTrace_track3, nphiTrace, rhobTrace_track4, crossoverFill]}
      layout={layout}
      style={{ width: '100%', height: '100%' }}
      useResizeHandler={true}
    />
  );
};

export default WellLogPlot;