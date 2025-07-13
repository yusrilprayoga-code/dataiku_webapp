/* eslint-disable @typescript-eslint/no-explicit-any */
import { type Layout } from 'plotly.js';
import { type LogDataRow } from '@/types';
import { rangeCol, DEPTH_COL, colorCol, dataCol, unitCol } from '@/features/results-display/config/plotConfig'; // Sesuaikan path jika perlu

// Definisikan tipe untuk peta sumbu agar konsisten
type AxesMap = Record<string, string[]>;

/**
 * Membuat array angka dengan interval yang sama (pengganti np.linspace).
 */
const linspace = (start: number, stop: number, num: number): number[] => {
  if (num < 2) {
    return num === 1 ? [start] : [];
  }
  const arr: number[] = [];
  const step = (stop - start) / (num - 1);
  for (let i = 0; i < num; i++) {
    arr.push(start + step * i);
  }
  return arr;
};

/**
 * Membuat array angka untuk skala logaritmik (pengganti np.arange log).
 */
const logArange = (min: number, max: number): number[] => {
  const arr: number[] = [];
  // const n = Math.ceil(Math.log10(max / min));

  for (let i = Math.floor(Math.log10(min)); i < Math.ceil(Math.log10(max)); i++) {
    for (let j = 1; j < 10; j++) {
      const val = j * Math.pow(10, i);
      if (val >= min && val <= max) {
        arr.push(val);
      }
    }
  }
  return arr;
};

export function layoutRangeAllAxis(
  layout: Partial<Layout>,
  axes: AxesMap
): Partial<Layout> {
  const newLayout = { ...layout };

  for (const key in axes) {
    // Cari sumbu-x utama untuk track ini (bukan overlay)
    // const mainXAxisId = axes[key].find(a => a === `xaxis${Object.keys(newLayout).filter(k => k.startsWith('xaxis')).length}`);
    const axisId = axes[key][1];

    if (axisId && axisId.startsWith('x')) {
      const rangeConfig = rangeCol[key as keyof typeof rangeCol];
      if (!rangeConfig || !rangeConfig[0]) continue;

      const isLog = ['RT_RO', 'PERM', 'RWAPP_RW', 'RT_F', 'RT_RHOB', 'RT_RGSA', 'RT', 'RT_GR', 'RT_PHIE'].includes(key);

      let tickvals: number[];
      if (isLog) {
        tickvals = logArange(rangeConfig[0][0], rangeConfig[0][1]);
      } else {
        tickvals = linspace(rangeConfig[0][0], rangeConfig[0][1], 5);
      }

      (newLayout as any)[axisId] = {
        ...((newLayout as any)[axisId] || {}),
        tickvals: tickvals,
        gridcolor: 'gainsboro',
        showgrid: true,
        side: "top",
      };
    }
  }
  return newLayout;
}

/**
 * Menggambar garis-garis pembatas track (vertikal) dan header (horizontal).
 * Juga menambahkan grid kedalaman horizontal.
 */
export function layoutDrawLines(
  layout: Partial<Layout>,
  domains: [number, number][], // Menggunakan domain yang sudah dihitung
  dfWell: LogDataRow[],
  xgridIntv: number | null
): Partial<Layout> {
  const newLayout = { ...layout };
  const shapes: Partial<Layout['shapes'][0]>[] = newLayout.shapes || [];

  // Garis pembatas vertikal antar track, digambar berdasarkan domain
  domains.forEach(domain => {
    shapes.push({ type: 'line', xref: 'paper', yref: 'paper', x0: domain[0], x1: domain[0], y0: 1, y1: 0, line: { color: 'black', width: 1 } });
  });
  // Tambahkan garis di paling kanan
  shapes.push({ type: 'line', xref: 'paper', yref: 'paper', x0: 1, x1: 1, y0: 1, y1: 0, line: { color: 'black', width: 1 } });

  // Garis pembatas horizontal untuk header
  shapes.push({ type: 'line', xref: 'paper', yref: 'paper', x0: 0, x1: 1, y0: 0.8, y1: 0.8, line: { color: 'black', width: 1 } });
  shapes.push({ type: 'line', xref: 'paper', yref: 'paper', x0: 0, x1: 1, y0: 1, y1: 1, line: { color: 'black', width: 1 } });

  // Garis grid kedalaman horizontal
  if (xgridIntv && xgridIntv > 0) {
    const minDepth = Math.min(...dfWell.map(d => d[DEPTH_COL]));
    const maxDepth = Math.max(...dfWell.map(d => d[DEPTH_COL]));
    for (let y = Math.ceil(minDepth / xgridIntv) * xgridIntv; y < maxDepth; y += xgridIntv) {
      shapes.push({ layer: 'below', type: 'line', x0: 0, x1: 1, xref: 'paper', y0: y, y1: y, line: { color: 'gainsboro', width: 1 } });
    }
    // Matikan grid default dari sumbu-y karena kita menggambarnya manual
    if (!(newLayout as any).yaxis) { (newLayout as any).yaxis = {}; }
    (newLayout as any).yaxis.showgrid = false;
  }

  newLayout.shapes = shapes;
  return newLayout;
}

/**
 * Menggambar garis-garis pembatas untuk area header.
 */
export function layoutDrawHeaderLines(layout: Partial<Layout>, domains: [number, number][]): Partial<Layout> {
  const newLayout = { ...layout };
  const shapes: Partial<Layout['shapes'][0]>[] = newLayout.shapes || [];

  const yHeaderTop = 1.0;
  const yHeaderBottom = 0.8;

  // Garis vertikal pembatas antar track, hanya di area header
  domains.forEach(domain => {
    shapes.push({ type: 'line', xref: 'paper', yref: 'paper', x0: domain[0], x1: domain[0], y0: yHeaderTop, y1: yHeaderBottom, line: { color: 'black', width: 1 } });
  });
  shapes.push({ type: 'line', xref: 'paper', yref: 'paper', x0: 1, x1: 1, y0: yHeaderTop, y1: yHeaderBottom, line: { color: 'black', width: 1 } });

  // Garis horizontal atas dan bawah header
  shapes.push({ type: 'line', xref: 'paper', yref: 'paper', x0: 0, x1: 1, y0: yHeaderTop, y1: yHeaderTop, line: { color: 'black', width: 1 } });
  shapes.push({ type: 'line', xref: 'paper', yref: 'paper', x0: 0, x1: 1, y0: yHeaderBottom, y1: yHeaderBottom, line: { color: 'black', width: 1 } });

  newLayout.shapes = shapes;
  return newLayout;
}

/**
 * Menambahkan semua teks anotasi di area header (nama kurva, unit, rentang).
 */
export function layoutAxis(layout: Partial<Layout>, axes: AxesMap, domains: [number, number][]): Partial<Layout> {
  const newLayout = { ...layout };
  const annotations: Partial<Layout['annotations'][0]>[] = newLayout.annotations || [];

  // Anotasi untuk label DEPTH utama
  annotations.push({
    font: { color: 'black', size: 12 }, x: -0.01, y: 0.9, xanchor: 'right', yanchor: 'top',
    showarrow: false, text: `${DEPTH_COL} (m)`, textangle: -90 as any, xref: 'paper', yref: 'paper'
  });

  const keys = Object.keys(axes);
  keys.forEach((key, i) => {
    const domain = domains[i];
    if (!domain) return;

    const trackStart = domain[0];
    const trackEnd = domain[1];
    const trackCenter = trackStart + (trackEnd - trackStart) / 2;
    let pos_y = 0.85;

    const axesForThisKey = axes[key].filter(ax => ax.startsWith('x'));

    axesForThisKey.forEach((axisId, j) => {
      const color = colorCol[key]?.[j] || 'black';
      const paramName = dataCol[key]?.[j];
      const unitName = unitCol[key]?.[j] || '';
      const range = rangeCol[key as keyof typeof rangeCol]?.[j];

      // Styling Sumbu-x (garis berwarna di bawah header)
      (newLayout as any)[axisId] = {
        ...((newLayout as any)[axisId] || {}),
        tickfont: { color, size: 9 }, anchor: "free", showline: true,
        position: pos_y - 0.01, showticklabels: true, linewidth: 1.5, linecolor: color
      };

      // Anotasi Nama Parameter & Unit di tengah track
      if (paramName) annotations.push({ font: { color, size: 12 }, x: trackCenter, y: pos_y, xanchor: 'center', yanchor: 'bottom', showarrow: false, text: `<b>${paramName}</b>`, xref: 'paper', yref: 'paper' });
      if (unitName) annotations.push({ font: { color, size: 10 }, x: trackCenter, y: pos_y - 0.04, xanchor: 'center', yanchor: 'bottom', showarrow: false, text: unitName, xref: 'paper', yref: 'paper' });

      // Anotasi Rentang Min & Max di tepi track
      if (range && !['CLASS', 'TEST', 'XPT', 'MARKER', 'ZONA'].includes(key)) {
        annotations.push({ font: { color, size: 10 }, x: trackStart, y: pos_y, xanchor: 'left', yanchor: 'middle', showarrow: false, text: String(range[0]), xref: 'paper', yref: 'paper' });
        annotations.push({ font: { color, size: 10 }, x: trackEnd, y: pos_y, xanchor: 'right', yanchor: 'middle', showarrow: false, text: String(range[1]), xref: 'paper', yref: 'paper' });
      }

      pos_y += 0.04; // Geser posisi y ke atas untuk parameter berikutnya di track yang sama
    });
  });

  newLayout.annotations = annotations;
  return newLayout;
}

/**
 * Menggambar garis-garis pembatas track (vertikal) dan grid kedalaman (horizontal)
 * HANYA pada area plot utama (di bawah header).
 *
 * @param layout - Objek layout Plotly yang ada.
 * @param domains - Array domain [start, end] untuk setiap track.
 * @param dfWell - Data log sumur untuk menentukan rentang kedalaman.
 * @param gridInterval - Interval untuk garis grid kedalaman horizontal (misalnya, 50).
 * @returns Objek layout baru dengan tambahan shapes.
 **/

export function layoutDrawMainLines(
  layout: Partial<Layout>,
  domains: [number, number][],
  dfWell: LogDataRow[],
  gridInterval: number | null
): Partial<Layout> {
  const newLayout = { ...layout };
  // Ambil shapes yang sudah ada (misalnya dari header) agar tidak hilang
  const shapes: Partial<Layout['shapes'][0]>[] = newLayout.shapes || [];

  const yMainTop = 0.8; // Posisi y atas area main (batas bawah header)
  const yMainBottom = 0;  // Posisi y bawah area main

  // --- Garis Vertikal Pembatas Track ---
  domains.forEach(domain => {
    // Garis di sisi kiri setiap track
    shapes.push({
      type: 'line', xref: 'paper', yref: 'paper',
      x0: domain[0], x1: domain[0], y0: yMainTop, y1: yMainBottom,
      line: { color: 'black', width: 1, dash: 'solid' }
    });
  });
  // Tambahkan garis vertikal di paling kanan
  shapes.push({
    type: 'line', xref: 'paper', yref: 'paper',
    x0: 1, x1: 1, y0: yMainTop, y1: yMainBottom,
    line: { color: 'black', width: 1, dash: 'solid' }
  });

  // --- Garis Horizontal Bawah ---
  shapes.push({
    type: 'line', xref: 'paper', yref: 'paper',
    x0: 0, x1: 1, y0: yMainBottom, y1: yMainBottom,
    line: { color: 'black', width: 1, dash: 'solid' }
  });

  // --- Grid Kedalaman Horizontal ---
  if (gridInterval && gridInterval > 0) {
    const minDepth = Math.min(...dfWell.map(d => d[DEPTH_COL]));
    const maxDepth = Math.max(...dfWell.map(d => d[DEPTH_COL]));

    // Mulai dari kelipatan interval terdekat di atas minDepth
    for (let y = Math.ceil(minDepth / gridInterval) * gridInterval; y < maxDepth; y += gridInterval) {
      shapes.push({
        layer: 'below', // Gambar grid di bawah data
        type: "line",
        x0: 0, x1: 1,
        xref: "paper",
        y0: y, y1: y, // Gunakan koordinat data (kedalaman) langsung
        yref: "y",     // Referensi ke sumbu-y data
        line: { color: "gainsboro", width: 1 }
      });
    }
    // Matikan grid default dari sumbu-y karena kita menggambarnya manual dengan shapes
    if (!(newLayout as any).yaxis) { (newLayout as any).yaxis = {}; }
    (newLayout as any).yaxis.showgrid = false;
  }

  newLayout.shapes = shapes;
  return newLayout;
}
