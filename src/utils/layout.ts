/* eslint-disable @typescript-eslint/no-explicit-any */
// src/utils/layout.ts (Versi Final dengan Semua Fungsi)

import { Layout } from 'plotly.js';
import { colorCol, dataCol, DEPTH_COL, unitCol } from '@/config/plotConfig';
import { rangeCol } from '@/config/plotRanges';

const linspace = (start: number, stop: number, num: number): number[] => {
  const arr: number[] = [];
  const step = (stop - start) / (num - 1);
  for (let i = 0; i < num; i++) arr.push(start + (step * i));
  return arr;
};

type AxesMap = Record<string, string[]>;

export function layoutRangeAllAxis(layout: Partial<Layout>, axes: AxesMap): Partial<Layout> {
  const newLayout = { ...layout };
  for (const key in axes) {
    const axisId = axes[key].find(a => a.startsWith('x'));
    const rangeConfig = rangeCol[key as keyof typeof rangeCol];
    if (axisId && rangeConfig && rangeConfig[0]) {
      (newLayout as any)[axisId] = {
        ...((newLayout as any)[axisId] || {}),
        tickvals: linspace(rangeConfig[0][0], rangeConfig[0][1], 5),
        gridcolor: 'gainsboro',
        showgrid: true,
      };
    }
  }
  return newLayout;
}

export function layoutDrawLines(layout: Partial<Layout>, ratios: number[], dfWell: any[], xgridIntv: number | null): Partial<Layout> {
  const newLayout = { ...layout };
  const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
  const spacing = 0.01 * (ratios.length > 1 ? ratios.length - 1 : 0);
  const plotAreaWidth = 1 - spacing;
  const shapes: Partial<Layout['shapes'][0]>[] = newLayout.shapes || [];

  let currentX = 0;
  for (let i = 0; i < ratios.length; i++) {
    const trackWidth = (ratios[i] / totalRatio) * plotAreaWidth;
    shapes.push({ type: 'line', xref: 'paper', yref: 'paper', x0: currentX, x1: currentX, y0: 1, y1: 0.8, line: { color: 'black', width: 1 } });
    currentX += trackWidth + (spacing / (ratios.length - 1 || 1));
  }
  shapes.push({ type: 'line', xref: 'paper', yref: 'paper', x0: 1, x1: 1, y0: 1, y1: 0.8, line: { color: 'black', width: 1 } });
  shapes.push({ type: 'line', xref: 'paper', yref: 'paper', x0: 0, x1: 1, y0: 0.8, y1: 0.8, line: { color: 'black', width: 1 } });

  if (xgridIntv && xgridIntv > 0) {
    const maxDepth = Math.max(...dfWell.map(d => d[DEPTH_COL]));
    for (let y = 0; y < maxDepth; y += xgridIntv) {
      shapes.push({ layer: 'below', type: 'line', x0: 0, x1: 1, xref: 'paper', y0: y, y1: y, line: { color: 'gainsboro', width: 1 } });
    }
    if (!(newLayout as any).yaxis) { (newLayout as any).yaxis = {}; }
    (newLayout as any).yaxis.showgrid = false;
  }
  
  newLayout.shapes = shapes;
  return newLayout;
}

export function layoutAxis(layout: Partial<Layout>, axes: AxesMap, ratios: number[]): Partial<Layout> {
  const newLayout = { ...layout };
  const totalRatio = ratios.reduce((sum, r) => sum + r, 0);
  const annotations: Partial<Layout['annotations'][0]>[] = newLayout.annotations || [];

  let currentX = 0;
  const keys = Object.keys(axes);
  const spacing = 0.01 * (keys.length > 1 ? keys.length - 1 : 0);
  const plotAreaWidth = 1 - spacing;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const trackWidth = (ratios[i] / totalRatio) * plotAreaWidth;
    const trackCenter = currentX + (trackWidth / 2);
    const xAxesForKey = axes[key]?.filter(a => a.startsWith('x')) || [];
    
    xAxesForKey.forEach((axisId, j) => {
      const color = colorCol[key]?.[j] || 'black';
      const paramName = dataCol[key]?.[j];
      const unitName = unitCol[key]?.[j] || '';
      const range = rangeCol[key as keyof typeof rangeCol]?.[j];
      
      const yPosTitle = 0.93;
      const yPosUnit = 0.89;

      if (paramName) annotations.push({ font: { color, size: 12 }, x: trackCenter, y: yPosTitle, xanchor: 'center', yanchor: 'bottom', showarrow: false, text: `<b>${paramName}</b>`, xref: 'paper', yref: 'paper' });
      if (unitName) annotations.push({ font: { color, size: 10 }, x: trackCenter, y: yPosUnit, xanchor: 'center', yanchor: 'bottom', showarrow: false, text: unitName, xref: 'paper', yref: 'paper' });
      if (range) {
        annotations.push({ font: { color, size: 10 }, x: currentX, y: 0.99, xanchor: 'left', yanchor: 'top', showarrow: false, text: String(range[0]), xref: 'paper', yref: 'paper' });
        annotations.push({ font: { color, size: 10 }, x: currentX + trackWidth, y: 0.99, xanchor: 'right', yanchor: 'top', showarrow: false, text: String(range[1]), xref: 'paper', yref: 'paper' });
      }
    });
    currentX += trackWidth + (spacing / (keys.length - 1 || 1));
  }
  
  newLayout.annotations = annotations;
  return newLayout;
}