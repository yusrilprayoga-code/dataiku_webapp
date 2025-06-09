// src/utils/layout.ts

import { Layout } from 'plotly.js';
import { colorCol, dataCol, DEPTH_COL, unitCol } from '@/config/plotConfig';
import { rangeCol } from '@/config/plotRanges';

// Helper function untuk replikasi np.linspace
const linspace = (start: number, stop: number, num: number): number[] => {
  const arr: number[] = [];
  const step = (stop - start) / (num - 1);
  for (let i = 0; i < num; i++) {
    arr.push(start + (step * i));
  }
  return arr;
};

type AxesMap = Record<string, string[]>;

export function layoutRangeAllAxis(
  layout: Partial<Layout>, 
  axes: AxesMap
): Partial<Layout> {
  const newLayout = { ...layout };

  for (const key in axes) {
    const axess = axes[key];
    for (const axis of axess) {
      if (axis.startsWith('yaxis')) {
        // Styling Y-Axis utama
        (newLayout as any)[axis] = {
          ...((newLayout as any)[axis] || {}),
          gridcolor: 'gainsboro',
          showgrid: true,
        };
      } else {
        // Styling X-Axis (grid vertikal)
        const ticks = list(np.linspace(range_col[key][0][0],range_col[key][0][1],5));
        (newLayout as any)[axis] = {
          ...((newLayout as any)[axis] || {}),
          tickvals: linspace(rangeCol[key as keyof typeof rangeCol][0][0], rangeCol[key as keyof typeof rangeCol][0][1], 5),
          gridcolor: 'gainsboro',
          side: "top",
        };
      }
    }
  }
  return newLayout;
}

export function layoutDrawLines(
  layout: Partial<Layout>, 
  ratios: number[],
  dfWell: any[], // Hanya untuk mendapatkan max depth
  xgridIntv: number | null
): Partial<Layout> {
  const newLayout = { ...layout };
  const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0);
  let shapes: Partial<Layout['shapes'][0]>[] = newLayout.shapes || [];

  // Garis pembatas vertikal antar track
  let currentPos = 0;
  shapes.push({ type: 'line', xref: 'paper', yref: 'paper', x0: 0, x1: 0, y0: 1, y1: 0, line: { color: 'black', width: 1 }});
  for (const ratio of ratios) {
    currentPos += ratio / totalRatio;
    shapes.push({ type: 'line', xref: 'paper', yref: 'paper', x0: currentPos, x1: currentPos, y0: 1, y1: 0, line: { color: 'black', width: 1 }});
  }
  
  // Garis pembatas horizontal
  [0, 1].forEach(y => {
    shapes.push({ type: 'line', xref: 'paper', yref: 'paper', x0: 0, x1: 1, y0: y, y1: y, line: { color: 'black', width: 1 }});
  });

  // Garis grid horizontal (jika diinginkan)
  if (xgridIntv && xgridIntv > 0) {
    const maxDepth = Math.max(...dfWell.map(d => d[DEPTH_COL]));
    for (let y = 0; y < maxDepth; y += xgridIntv) {
      shapes.push({ layer: 'below', type: 'line', x0: 0, x1: 1, xref: 'paper', y0: y, y1: y, line: { color: 'gainsboro', width: 1 }});
    }
    (newLayout as any).yaxis.showgrid = false; // Matikan grid default jika menggunakan shape
  }
  
  newLayout.shapes = shapes;
  return newLayout;
}

export function layoutAxis(
  layout: Partial<Layout>, 
  axes: AxesMap, 
  ratios: number[]
): Partial<Layout> {
  const newLayout = { ...layout };
  const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0);
  let annotations: Partial<Layout['annotations'][0]>[] = newLayout.annotations || [];
  
  let currentX = 0;
  const keys = Object.keys(axes);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const trackWidth = ratios[i] / totalRatio;
    const trackCenter = currentX + (trackWidth / 2);

    const xAxesForKey = axes[key].filter(a => a.startsWith('x'));
    
    // Anotasi untuk setiap sumbu-x di dalam satu track
    xAxesForKey.forEach((axisId, j) => {
        const xOffset = (j - (xAxesForKey.length - 1) / 2) * 0.05; // Beri sedikit jarak antar teks
        const color = colorCol[key][j] || 'black';
        const paramName = dataCol[key][j];
        const unitName = unitCol[key] ? unitCol[key][j] : '';
        const range = rangeCol[key as keyof typeof rangeCol][j];
        
        // Nama Parameter
        annotations.push({
            font: { color: color, size: 12 }, x: trackCenter + xOffset, y: 0.92,
            xanchor: 'center', yanchor: 'bottom', showarrow: false, text: `<b>${paramName}</b>`,
            xref: 'paper', yref: 'paper'
        });
        // Unit
        annotations.push({
            font: { color: color, size: 10 }, x: trackCenter + xOffset, y: 0.88,
            xanchor: 'center', yanchor: 'bottom', showarrow: false, text: unitName,
            xref: 'paper', yref: 'paper'
        });
        // Rentang Min dan Max
        if (range) {
            annotations.push({
                font: { color: color, size: 10 }, x: currentX, y: 0.99,
                xanchor: 'left', yanchor: 'top', showarrow: false, text: String(range[0]),
                xref: 'paper', yref: 'paper'
            });
            annotations.push({
                font: { color: color, size: 10 }, x: currentX + trackWidth, y: 0.99,
                xanchor: 'right', yanchor: 'top', showarrow: false, text: String(range[1]),
                xref: 'paper', yref: 'paper'
            });
        }
    });
    currentX += trackWidth;
  }
  
  newLayout.annotations = annotations;
  return newLayout;
}