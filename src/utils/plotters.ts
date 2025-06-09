/* eslint-disable @typescript-eslint/no-explicit-any */
// src/utils/plotters.ts (Perbaikan Final untuk Tipe Options)

import { LogDataRow, MarkerData } from "@/types";
import { type Data, type Layout } from 'plotly.js';
import { flagColor as flagColorConfig, flagsName as flagsNameConfig, dataCol, DEPTH_COL, colorCol, LINE_WIDTH, legends } from '@/config/plotConfig';
import { rangeCol } from "@/config/plotRanges";
import { xoverLabelDf, fillcol } from './crossover';
import { encodeWithNan } from "./processData";
import { discreteColorscale, generateNewColor, rgbToHex } from "./colors";

interface PlotterResult {
  data: Data[];
  layout: Partial<Layout>;
}

/**
 * Menambahkan jejak kurva (line trace) ke dalam data plot.
 */
export function plotLine(
  existingData: Data[],
  existingLayout: Partial<Layout>,
  dfWell: LogDataRow[],
  baseKey: string,
  nSeq: number,
  // FIX: Tambahkan `domain` ke dalam definisi tipe options
  options: {
    type?: 'log';
    col?: keyof LogDataRow;
    label?: string;
    domain?: [number, number]; 
  } = {}
): PlotterResult {
  const { type, col: optionCol, label: optionLabel, domain } = options;

  const col = optionCol || (dataCol[baseKey] ? dataCol[baseKey][0] : baseKey);
  const label = optionLabel || col;

  const newTrace: Partial<Data> = {
    type: 'scattergl', x: dfWell.map(d => d[col]), y: dfWell.map(d => d[DEPTH_COL]),
    line: { color: colorCol[baseKey] ? colorCol[baseKey][0] : 'black', width: LINE_WIDTH, },
    name: String(label), legendgroup: legends[nSeq - 1], showlegend: true, xaxis: `x${nSeq}`, yaxis: 'y',
  };
  
  const newData = [...existingData, newTrace as Data];
  const newLayout = { ...existingLayout };
  const xaxisKey = `xaxis${nSeq}`;
  const range = rangeCol[baseKey as keyof typeof rangeCol]?.[0];

  if (!range) {
    console.warn(`Rentang untuk '${baseKey}' tidak ditemukan.`);
    return { data: newData, layout: newLayout };
  }

  if (type === 'log') {
    (newLayout as Record<string, any>)[xaxisKey] = { side: 'top', type: 'log', range: [Math.log10(range[0]), Math.log10(range[1])], domain: domain, };
  } else {
    (newLayout as Record<string, any>)[xaxisKey] = { side: 'top', range: range, domain: domain, };
  }

  return { data: newData, layout: newLayout };
}


/**
 * Menambahkan plot NPHI-RHOB Crossover
 */
export function plotXoverLogNormal(
  existingData: Data[],
  existingLayout: Partial<Layout>,
  dfWell: LogDataRow[],
  key: string,
  nSeq: number,
  counter: number,
  nPlots: number,
  // FIX: Tambahkan `domain` ke dalam definisi tipe options
  options: {
    yColor?: string;
    nColor?: string;
    type?: number;
    excludeCrossover?: boolean;
    domain?: [number, number];
  } = {}
): PlotterResult & { counter: number } {
  const { yColor = 'limegreen', nColor = 'lightgray', type = 1, excludeCrossover = false, domain } = options;

  const dataBuilder = [...existingData];
  const layoutBuilder = { ...existingLayout };
  let currentCounter = counter;

  const col1 = dataCol[key][0];
  const range1 = rangeCol[key as keyof typeof rangeCol][0];
  const trace1: Partial<Data> = {
    type: 'scattergl', x: dfWell.map(d => d[col1]), y: dfWell.map(d => d[DEPTH_COL]),
    line: { color: colorCol[key][0], width: LINE_WIDTH }, name: col1, legendgroup: legends[nSeq - 1], showlegend: false,
    xaxis: `x${nSeq}`, yaxis: 'y',
  };
  dataBuilder.push(trace1 as Data);
  // Terapkan domain pada sumbu-x utama track ini
  (layoutBuilder as any)[`xaxis${nSeq}`] = { side: 'top', range: range1, domain: domain, };
  
  currentCounter++;
  const overlayXaxisId = nPlots + currentCounter;
  const col2 = dataCol[key][1];
  const range2 = rangeCol[key as keyof typeof rangeCol][1];
  const trace2: Partial<Data> = {
    type: 'scattergl', x: dfWell.map(d => d[col2]), y: dfWell.map(d => d[DEPTH_COL]),
    line: { color: colorCol[key][1], width: LINE_WIDTH }, name: col2, legendgroup: legends[nSeq - 1], showlegend: false,
    xaxis: `x${overlayXaxisId}`, yaxis: 'y',
  };
  dataBuilder.push(trace2 as Data);
  (layoutBuilder as any)[`xaxis${overlayXaxisId}`] = { side: 'top', range: range2, overlaying: `x${nSeq}`, };

  if (!excludeCrossover) {
    currentCounter++;
    const shadingXaxisId = nPlots + currentCounter;
    const xoverDfs = xoverLabelDf(dfWell, key, type);

    for (const xoverDf of xoverDfs) {
      if (xoverDf.length === 0) continue;
      const fillTrace1: Partial<Data> = {
        type: 'scatter', x: xoverDf.map(d => d[dataCol[key][2]]), y: xoverDf.map(d => d[DEPTH_COL]),
        showlegend: false, line: { color: 'rgba(0,0,0,0)' }, xaxis: `x${shadingXaxisId}`, yaxis: 'y', hoverinfo: 'none',
      };
      const fillTrace2: Partial<Data> = {
        type: 'scatter', x: xoverDf.map(d => d[dataCol[key][3]]), y: xoverDf.map(d => d[DEPTH_COL]),
        showlegend: false, line: { color: 'rgba(0,0,0,0)' }, fill: 'tonextx',
        fillcolor: fillcol(xoverDf[0].label, yColor, nColor), xaxis: `x${shadingXaxisId}`, yaxis: 'y', hoverinfo: 'none',
      };
      dataBuilder.push(fillTrace1 as Data, fillTrace2 as Data);
    }
    (layoutBuilder as any)[`xaxis${shadingXaxisId}`] = { visible: false, overlaying: `x${nSeq}`, range: range1, };
  }

  return { data: dataBuilder, layout: layoutBuilder, counter: currentCounter };
}

export function plotFlag(
  existingData: Data[],
  existingLayout: Partial<Layout>,
  dfWell: LogDataRow[],
  key: string,
  nSeq: number
): PlotterResult {
  const dataBuilder = [...existingData];
  const layoutBuilder: Record<string, any> = { ...existingLayout };
  
  // FIX: Deklarasikan variabel final yang akan kita isi
  let finalFlagColors: Record<number, string>;
  let finalFlagsNames: Record<number, string>;
  let maxVal: number;
  let currentDfWell = [...dfWell];
  const col = dataCol[key][0];

  // Tentukan warna dan nama berdasarkan 'key'
  if (['MARKER', 'RGBE', 'RPBE'].includes(key)) {
    // Jalur dinamis untuk 'MARKER'
    const result = encodeWithNan(currentDfWell, col); // Gunakan 'col' bukan 'key'
    currentDfWell = result.data;
    finalFlagsNames = result.names;
    maxVal = Object.keys(finalFlagsNames).length;
    
    // Logika placeholder untuk generate warna
    const tempColors: Record<number, string> = {};
    for (let i = 0; i < maxVal; i++) {
        tempColors[i] = rgbToHex(generateNewColor({}, 0));
    }
    tempColors[0] = 'rgba(0,0,0,0)';
    finalFlagColors = tempColors;
  } else {
    // Jalur statis dari konfigurasi untuk 'TEST', 'CLASS', dll.
    finalFlagColors = flagColorConfig[key];
    finalFlagsNames = flagsNameConfig[key];
    if (!finalFlagsNames) {
      console.error(`flagsName untuk key '${key}' tidak ditemukan.`);
      return { data: dataBuilder, layout: layoutBuilder };
    }
    maxVal = Math.max(...Object.keys(finalFlagsNames).map(Number)) + 1;
  }
  
  // Menyiapkan data untuk Heatmap menggunakan variabel final
  const zData = [currentDfWell.map(d => (d[col] as number) / maxVal)];
  const customData = currentDfWell.map(row => finalFlagsNames[row[col] as number] || '');
  
  const bvals = Array.from({ length: maxVal + 1 }, (_, i) => i);
  const colors = Object.values(finalFlagColors);
  // Ensure colorscale is of type [number, string][]
  const colorscale: [number, string][] = discreteColorscale(bvals, colors) as [number, string][];

  const trace: Partial<Data> = {
    type: 'heatmap',
    z: zData, zmin: 0, zmax: 1,
    y: currentDfWell.map(d => d[DEPTH_COL]),
    customdata: customData,
    hovertemplate: '%{customdata}<extra></extra>',
    colorscale: colorscale,
    showscale: false,
    xaxis: `x${nSeq}`,
    yaxis: 'y', 
  };
  
  dataBuilder.push(trace as Data);
  layoutBuilder[`xaxis${nSeq}`] = { 
    side: 'top', 
    zeroline: false,
    showgrid: false,
    showticklabels: false, // Sumbu x untuk flag tidak perlu label
  };

  return { data: dataBuilder, layout: layoutBuilder };
}

/**
 * Menambahkan anotasi teks untuk marker.
 */
export function plotTextsMarker(
  existingLayout: Partial<Layout>,
  dfText: MarkerData[],
  depthBtm: number,
  nSeq: number
): Partial<Layout> {
  if (dfText.length === 0) return existingLayout;

  const newAnnotations = dfText.map(row => {
    const y = row['Mean Depth'];
    
    // FIX: Kondisi diubah agar sesuai dengan logika Python asli.
    // Hanya tampilkan marker jika kedalamannya berada dalam rentang plot.
    if (y < depthBtm) { 
      return {
        x: 0.5, y: y,
        xref: `x${nSeq} domain`,
        yref: 'y',
        xanchor: 'center', yanchor: 'middle',
        text: `<b>${row.Surface.substring(0, 8)}</b>`, // Dibuat tebal
        showarrow: false,
        font: { size: 10, color: 'black' },
        bgcolor: 'rgba(255, 255, 255, 0.7)', // Latar belakang sedikit transparan
        borderpad: 2,
      } as Partial<Layout['annotations'][0]>;
    }
    return null; // Kembalikan null jika kondisi tidak terpenuhi
  }).filter(Boolean) as Partial<Layout['annotations'][0]>[]; // Hapus semua entri null dari array

  const existingAnnotations = existingLayout.annotations || [];
  return { 
    ...existingLayout, 
    annotations: [...existingAnnotations, ...newAnnotations] 
  };
}