"use client";

import React from 'react';
import Plot from 'react-plotly.js';
// Impor tipe data yang benar
import { ParsedLasData } from 'codes/lib/las-parser';
import { markerData } from 'codes/lib/mockMarkerData';

// Ubah tipe props agar sesuai
interface PlotProps {
  logData: ParsedLasData[];
  markerData: typeof markerData;
  wellName: string;
}

const PlotClientComponent: React.FC<PlotProps> = ({ logData, markerData, wellName }) => {
  // Logika plot tidak perlu diubah karena kita mengakses data dengan cara yang sama (d['NAMA_KOLOM'])
  const depth = logData.map(d => d['DEPTH'] as number);

  const markerTextTrace = { x: markerData.map(() => 0.5), y: markerData.map(m => (m.top + m.base) / 2), text: markerData.map(m => m.formation), mode: 'text', xaxis: 'x1', hoverinfo: 'none' };
  const grTrace = { x: logData.map(d => d['GR']), y: depth, name: 'GR', mode: 'lines', line: { color: '#006400', width: 1.5 }, xaxis: 'x2' };
  const rtTrace = { x: logData.map(d => d['RT']), y: depth, name: 'RT', mode: 'lines', line: { color: '#d9534f', width: 1.5 }, xaxis: 'x3' };
  const rhobTrace_on_rt_track = { x: logData.map(d => d['RHOB']), y: depth, name: 'RHOB', mode: 'lines', line: { color: '#428bca', width: 1.5 }, xaxis: 'x5' };
  const nphiTrace = { x: logData.map(d => d['NPHI']), y: depth, name: 'NPHI', mode: 'lines', line: { color: '#428bca', width: 1.5, dash: 'dot' }, xaxis: 'x4' };
  const rhobTrace_on_nphi_track = { x: logData.map(d => d['RHOB']), y: depth, name: 'RHOB', mode: 'lines', line: { color: '#d9534f', width: 1.5 }, xaxis: 'x4' };
  
  const layout: Partial<Plotly.Layout> = {
      title: { text: `Well Log ${wellName}` }, height: 1200, showlegend: false, hovermode: 'y unified',
      plot_bgcolor: 'white', paper_bgcolor: 'white', margin: { l: 40, r: 40, t: 60, b: 40 },
      yaxis: { title: { text: 'DEPTH (m)' }, autorange: 'reversed', gridcolor: '#e0e0e0', zeroline: false },
      xaxis: { domain: [0, 0.1], title: { text: 'MARKER' }, showticklabels: false, zeroline: false },
      xaxis2: { domain: [0.12, 0.37], title: { text: 'GR' }, gridcolor: '#e0e0e0', zeroline: false },
      xaxis3: { domain: [0.39, 0.64], title: { text: 'RT' }, type: 'log', gridcolor: '#e0e0e0', zeroline: false, side: 'top' },
      xaxis4: { domain: [0.66, 1], title: { text: 'NPHI/RHOB' }, gridcolor: '#e0e0e0', zeroline: false },
      xaxis5: { overlaying: 'x3', side: 'bottom', title: { text: 'RHOB' }, showgrid: false, zeroline: false, autorange: true },
      shapes: markerData.map(m => ({ type: 'rect', xref: 'paper', yref: 'y', x0: 0, y0: m.top, x1: 0.1, y1: m.base, fillcolor: m.color, layer: 'below', line: { width: 0 } })),
  };

  return (
      <Plot
          data={[ markerTextTrace, grTrace, rtTrace, rhobTrace_on_rt_track, nphiTrace, rhobTrace_on_nphi_track ]}
          layout={layout}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
      />
  );
};

export default PlotClientComponent;