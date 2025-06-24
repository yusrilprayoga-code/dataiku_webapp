/* eslint-disable @typescript-eslint/no-explicit-any */
import { type LogDataRow, type MarkerData, type XptNote } from '@/types'; // Keep all types from plot-display
import { type Data, type Layout } from 'plotly.js';
import {
  dataCol,
  DEPTH_COL,
  colorCol,
  LINE_WIDTH,
  legends,
  rangeCol,
  thres,
  colorsDict, // Keep from plot-display
  flagColor,  // Keep from plot-display
  flagsName   // Keep from plot-display
} from './plotConfig';
// Keep these imports from plot-display, as they are used by new functions
import { encodeWithNan, generateNewColor, rgbToHex } from './otherConfig';

// Definisikan tipe untuk hasil return dari plotter agar konsisten
interface PlotterResult {
  data: Data[];
  layout: Partial<Layout>;
}

/**
 * Membuat skala warna diskrit (bertingkat) untuk Plotly.
 * @param bvals - Array nilai numerik yang menjadi batas interval.
 * @param colors - Array string warna untuk setiap interval.
 * @returns Array colorscale yang diformat untuk Plotly.
 */
export function discreteColorscale(bvals: number[], colors: string[]): (string | number)[][] {
  // Validasi input
  if (bvals.length !== colors.length + 1) {
    console.error('Panjang `bvals` harus sama dengan panjang `colors` + 1');
    return []; // Kembalikan array kosong jika input tidak valid
  }

  // Buat salinan dan urutkan bvals untuk menghindari modifikasi array asli
  const sortedBvals = [...bvals].sort((a, b) => a - b);
  const min = sortedBvals[0];
  const max = sortedBvals[sortedBvals.length - 1];

  // Hindari pembagian dengan nol jika semua nilai bvals sama
  if (max === min) {
    console.warn("Semua nilai `bvals` sama, colorscale mungkin tidak akurat.");
    return colors.map(color => [0, color]);
  }

  // Normalisasi boundary values ke rentang 0-1
  const nvals = sortedBvals.map(v => (v - min) / (max - min));

  const dcolorscale: (string | number)[][] = [];
  for (let k = 0; k < colors.length; k++) {
    dcolorscale.push([nvals[k], colors[k]]);
    dcolorscale.push([nvals[k + 1], colors[k]]);
  }

  return dcolorscale;
}

/**
 * Memilih warna isian (fill color) berdasarkan nilai label.
 * @param label - Label numerik dari data (misalnya 1 untuk ya, 0 untuk tidak).
 * @param yColor - Warna untuk "ya".
 * @param nColor - Warna untuk "tidak".
 * @returns String warna RGBA.
 */
export function fillcol(
  label: string | number,
  yColor = 'rgba(0, 250, 0, 0.4)',
  nColor = 'rgba(250, 0, 0, 0)'
): string {
  const numericLabel = typeof label === 'string' ? parseFloat(label) : label;

  return numericLabel >= 1 ? yColor : nColor;
}

/**
 * Memproses data log untuk mengidentifikasi dan mengelompokkan segmen crossover.
 * Fungsi ini menerima seluruh data log dan mengembalikannya dalam bentuk
 * potongan-potongan (segmen), di mana setiap segmen adalah zona kontinu
 * dari 'crossover' atau 'non-crossover'.
 *
 * @param dfWell - Seluruh data log dalam format array objek.
 * @param key - Kunci untuk menentukan jenis perbandingan (mis. 'NPHI_RHOB').
 * @param type - Tipe filter: 1 (hanya kembalikan zona crossover), selain itu (kembalikan semua zona).
 * @returns Array dari array data (LogDataRow[][]), di mana setiap array inner adalah segmen kontinu.
 */
export function xoverLabelDf(dfWell: LogDataRow[], key: string, type = 1): LogDataRow[][] {
  // Jika tidak ada data, kembalikan array kosong
  if (!dfWell || dfWell.length === 0) {
    return [];
  }

  // --- Tahap 1: Pelabelan (Labeling) ---
  // Membuat array baru dengan tambahan properti 'label' (0 atau 1)
  const labeledData = dfWell.map(row => {
    let label = 0;
    const cols = dataCol[key];

    if (!cols) {
      console.warn(`Konfigurasi 'dataCol' untuk kunci '${key}' tidak ditemukan.`);
      return { ...row, label: 0 };
    }

    if (['X_RT_RO', 'X_RWA_RW', 'X_RT_F', 'X_RT_RHOB'].includes(key)) {
      if (row[cols[0]] > thres[key]) {
        label = 1;
      }
    } else if (key === 'NPHI_RHOB' || key === 'RT_RHOB') {
      // Menggunakan kolom yang sudah dinormalisasi dari plotConfig
      // Assuming dataCol[key][2] and dataCol[key][3] are the normalized columns
      if ((row[cols[2]] as number) > (row[cols[3]] as number)) { // Explicitly cast to number
        label = 1;
      }
    } else {
      if ((row[cols[0]] as number) > (row[cols[1]] as number)) { // Explicitly cast to number
        label = 1;
      }
    }

    return { ...row, label };
  });

  // --- Tahap 2: Pengelompokan & Pemisahan ---
  // Mereplikasi logika `groupby(label.ne(label.shift()).cumsum())` dari Pandas
  if (labeledData.length === 0) {
    return [];
  }

  const segments: LogDataRow[][] = [];
  let currentSegment: LogDataRow[] = [];

  for (let i = 0; i < labeledData.length; i++) {
    const currentRow = labeledData[i];

    // Jika segmen saat ini kosong, atau labelnya sama dengan anggota pertama segmen, tambahkan
    if (currentSegment.length === 0 || currentRow.label === currentSegment[0].label) {
      currentSegment.push(currentRow);
    } else {
      // Jika label berubah, simpan segmen yang sudah selesai
      segments.push(currentSegment);
      // Mulai segmen baru dengan baris saat ini
      currentSegment = [currentRow];
    }
  }
  // Menyimpan segmen terakhir setelah loop selesai
  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  // --- Tahap 3: Pemfilteran (Filtering) ---
  // Jika tipe adalah 1, hanya kembalikan segmen di mana labelnya adalah 1
  if (type === 1) {
    return segments.filter(segment => segment.length > 0 && segment[0].label === 1);
  }

  // Jika tipe bukan 1, kembalikan semua segmen
  return segments;
}

/**
 * Membuat dan menambahkan sebuah trace kurva garis ke dalam plot.
 * @param existingData - Array `data` Plotly yang sudah ada.
 * @param existingLayout - Objek `layout` Plotly yang sudah ada.
 * @param dfWell - Data log sumur yang telah diproses.
 * @param baseKey - Kunci utama untuk mengakses konfigurasi (warna, rentang, dll.).
 * @param nSeq - Nomor urutan track plot (dimulai dari 1).
 * @param options - Objek untuk parameter opsional seperti tipe skala, nama kolom, dll.
 * @returns Objek baru yang berisi `data` dan `layout` yang telah diperbarui.
 */
export function plotLine(
  existingData: Data[],
  existingLayout: Partial<Layout>,
  dfWell: LogDataRow[],
  baseKey: string,
  nSeq: number,
  options: {
    type?: 'log';
    col?: keyof LogDataRow;
    label?: string;
    domain?: [number, number];
  } = {}
): PlotterResult {
  const { type, col: optionCol, label: optionLabel, domain } = options;

  // Jika nama kolom tidak diberikan, gunakan default dari plotConfig
  const col = optionCol || (dataCol[baseKey] ? dataCol[baseKey][0] : baseKey);
  // Jika label tidak diberikan, gunakan nama kolom sebagai default
  const label = optionLabel || col;

  // Buat trace (jejak plot) baru
  const newTrace: Partial<Data> = {
    type: 'scattergl', // Gunakan scattergl untuk performa yang lebih baik
    x: dfWell.map(d => d[col]),
    y: dfWell.map(d => d[DEPTH_COL]),
    line: {
      color: colorCol[baseKey] ? colorCol[baseKey][0] : 'black',
      width: LINE_WIDTH,
    },
    name: String(label),
    legendgroup: legends[nSeq - 1] || `legend${nSeq}`,
    showlegend: true, // Akan dikontrol oleh layout global nantinya
    xaxis: `x${nSeq}`,
    yaxis: 'y', // Penting: Semua track menggunakan sumbu-Y utama yang sama
  };

  // Buat salinan baru dari data dan layout yang ada (prinsip immutability)
  const dataBuilder = [...existingData, newTrace as Data];
  const layoutBuilder = { ...existingLayout };

  // Update layout untuk sumbu-x yang sesuai
  const xaxisKey = `xaxis${nSeq}`;
  const range = rangeCol[baseKey as keyof typeof rangeCol]?.[0];

  if (!range) {
    console.warn(`Konfigurasi rentang untuk '${baseKey}' tidak ditemukan di 'rangeCol'.`);
  } else if (type === 'log') {
    // Pengaturan untuk skala logaritmik
    (layoutBuilder as any)[xaxisKey] = { // Keep as any for direct assignment
      side: 'top',
      type: 'log',
      range: [Math.log10(range[0]), Math.log10(range[1])],
      domain: domain,
    };
  } else {
    // Pengaturan untuk skala linear
    (layoutBuilder as any)[xaxisKey] = { // Keep as any for direct assignment
      side: 'top',
      range: range,
      domain: domain,
    };
  }

  return { data: dataBuilder, layout: (layoutBuilder as any) }; // Keep as any for return
}

/**
 * Membuat plot garis dengan area yang diisi (fill) ke nilai batas tertentu.
 * Ini dicapai dengan membuat satu trace dummy sebagai batas dan satu trace data
 * dengan properti `fill: 'tonextx'`.
 *
 * @param existingData - Array `data` Plotly yang sudah ada.
 * @param existingLayout - Objek `layout` Plotly yang sudah ada.
 * @param dfWell - Data log sumur yang telah diproses.
 * @param key - Kunci utama untuk mengakses konfigurasi (warna, rentang, dll.).
 * @param nSeq - Nomor urutan track plot (dimulai dari 1).
 * @param index - Indeks untuk mengakses kolom dan warna spesifik dari konfigurasi.
 * @param options - Opsi tambahan seperti domain.
 * @returns Objek baru yang berisi `data` dan `layout` yang telah diperbarui.
 */
export function plotFillXToInt(
  existingData: Data[],
  existingLayout: Partial<Layout>,
  dfWell: LogDataRow[],
  key: string,
  nSeq: number,
  index: number, // Parameter index untuk fleksibilitas
  options: {
    domain?: [number, number];
  } = {}
): PlotterResult {
  const { domain } = options;

  // Ambil konfigurasi berdasarkan `key` dan `index`
  const col = dataCol[key][index];
  const threshold = rangeCol[key as keyof typeof rangeCol][index][1]; // Ambil nilai batas atas dari rentang

  // Buat data untuk trace dummy (garis vertikal di nilai threshold)
  const thresholdLine = dfWell.map(() => threshold);

  // Buat salinan baru dari data dan layout
  const dataBuilder = [...existingData];
  const layoutBuilder = { ...existingLayout };

  // 1. Tambahkan trace dummy yang tidak terlihat sebagai batas isian
  const dummyTrace: Partial<Data> = {
    type: 'scatter',
    x: thresholdLine,
    y: dfWell.map(d => d[DEPTH_COL]),
    line: { color: 'rgba(0,0,0,0)', width: 0 },
    showlegend: false,
    name: `dummy_${col}`,
    hoverinfo: 'skip',
    xaxis: `x${nSeq}`,
    yaxis: 'y',
  };
  dataBuilder.push(dummyTrace as Data);

  // 2. Tambahkan trace data asli dengan properti `fill`
  const mainTrace: Partial<Data> = {
    type: 'scatter',
    x: dfWell.map(d => d[col]),
    y: dfWell.map(d => d[DEPTH_COL]),
    line: {
      color: colorCol[key][index] || 'black',
      width: LINE_WIDTH,
    },
    name: col,
    legendgroup: legends[nSeq - 1] || `legend${nSeq}`,
    showlegend: true,
    fill: 'tonextx', // <-- Kunci untuk mengisi area ke trace sebelumnya
    xaxis: `x${nSeq}`,
    yaxis: 'y',
  };
  dataBuilder.push(mainTrace as Data);

  // 3. Update layout untuk sumbu-x yang sesuai
  const xaxisKey = `xaxis${nSeq}`;
  const range = rangeCol[key as keyof typeof rangeCol][index];

  if (range) {
    (layoutBuilder as any)[xaxisKey] = { // Keep as any for direct assignment
      side: 'top',
      range: range,
      domain: domain,
    };
  }

  return { data: dataBuilder, layout: (layoutBuilder as any) }; // Keep as any for return
}

/**
 * Membuat plot dengan dua kurva yang saling tumpang tindih (overlay) dalam satu track,
 * seperti GR dan GR_NORM.
 *
 * @param existingData - Array `data` Plotly yang sudah ada.
 * @param existingLayout - Objek `layout` Plotly yang sudah ada.
 * @param dfWell - Data log sumur yang telah diproses.
 * @param key - Kunci utama untuk mengakses konfigurasi (mis. 'GR_DUAL').
 * @param nSeq - Nomor urutan track plot (dimulai dari 1).
 * @param counter - Counter untuk memastikan ID sumbu overlay unik.
 * @param nPlots - Jumlah total track plot.
 * @param options - Opsi tambahan seperti domain.
 * @returns Objek baru yang berisi `data`, `layout`, dan `counter` yang telah diperbarui.
 */
export function plotDualGr(
  existingData: Data[],
  existingLayout: Partial<Layout>,
  dfWell: LogDataRow[],
  key: string,
  nSeq: number,
  counter: number,
  nPlots: number,
  options: {
    domain?: [number, number];
  } = {}
): PlotterResult & { counter: number } {
  const { domain } = options;

  const dataBuilder = [...existingData];
  const layoutBuilder = { ...existingLayout };
  let currentCounter = counter;

  // --- 1. Plot Kurva Pertama (mis. GR) ---
  const col1 = dataCol[key][0];
  const range1 = rangeCol[key as keyof typeof rangeCol][0];

  const trace1: Partial<Data> = {
    type: 'scattergl',
    x: dfWell.map(d => d[col1]),
    y: dfWell.map(d => d[DEPTH_COL]),
    line: { color: colorCol[key][0], width: LINE_WIDTH },
    name: col1,
    legendgroup: legends[nSeq - 1] || `legend${nSeq}`,
    showlegend: true,
    xaxis: `x${nSeq}`,
    yaxis: 'y',
  };
  dataBuilder.push(trace1 as Data);

  // Atur layout untuk sumbu-x pertama
  (layoutBuilder as any)[`xaxis${nSeq}`] = { // Keep as any for direct assignment
    side: 'top',
    range: range1,
    domain: domain,
  };

  // --- 2. Plot Kurva Kedua (mis. GR_NORM) sebagai Overlay ---
  currentCounter++;
  const overlayXaxisId = `x${nPlots + currentCounter}`;
  const col2 = dataCol[key][1];
  const range2 = rangeCol[key as keyof typeof rangeCol][1];

  const trace2: Partial<Data> = {
    type: 'scattergl',
    x: dfWell.map(d => d[col2]),
    y: dfWell.map(d => d[DEPTH_COL]),
    line: { color: colorCol[key][1], width: LINE_WIDTH },
    name: col2,
    legendgroup: legends[nSeq - 1] || `legend${nSeq}`,
    showlegend: true,
    xaxis: overlayXaxisId,
    yaxis: 'y',
  };
  dataBuilder.push(trace2 as Data);

  // Atur layout untuk sumbu-x kedua, dan set `overlaying`
  (layoutBuilder as any)[overlayXaxisId] = { // Keep as any for direct assignment
    side: 'top',
    range: range2,
    overlaying: `x${nSeq}`, // <-- Kunci untuk menumpuk sumbu ini di atas sumbu utama
  };

  // Kembalikan semua hasil yang telah diperbarui
  return { data: dataBuilder, layout: (layoutBuilder as any), counter: currentCounter }; // Keep as any for return
}

/**
 * Membuat plot GSA Crossover dengan dua kurva dan dua warna arsiran
 * yang berbeda tergantung pada kondisi persilangan.
 *
 * @returns Objek baru yang berisi `data`, `layout`, dan `counter` yang telah diperbarui.
 */
export function plotGsaCrossover(
  existingData: Data[],
  existingLayout: Partial<Layout>,
  dfWell: LogDataRow[],
  key: 'RT_RGSA' | 'NPHI_NGSA' | 'RHOB_DGSA', // Membatasi `key` yang valid
  nSeq: number,
  counter: number,
  nPlots: number,
  options: {
    fillColorRed?: string;
    fillColorBlue?: string;
    domain?: [number, number];
  } = {}
): PlotterResult & { counter: number } {
  const {
    fillColorRed = 'red',
    fillColorBlue = colorsDict.blue,
    domain
  } = options;

  const dataBuilder = [...existingData];
  const layoutBuilder = { ...existingLayout };
  let currentCounter = counter;

  // --- 1. Tentukan Kondisi Logika & Skala ---
  let logScale = false;
  const col1Name = dataCol[key][0];
  const col2Name = dataCol[key][1];

  switch (key) {
    case 'RT_RGSA':
      logScale = true;
      break;
    case 'NPHI_NGSA':
    case 'RHOB_DGSA':
      logScale = false;
      break;
  }

  // --- 2. Plot Dua Kurva Utama (Line Plots) ---
  // Kurva 1
  dataBuilder.push({
    type: 'scattergl', x: dfWell.map(d => d[col1Name]), y: dfWell.map(d => d[DEPTH_COL]),
    line: { color: colorCol[key][0], width: LINE_WIDTH }, name: col1Name,
    legendgroup: legends[nSeq - 1], showlegend: true, xaxis: `x${nSeq}`, yaxis: 'y'
  } as Data);

  // Kurva 2 (Overlay)
  currentCounter++;
  const overlayAxis2Id = `x${nPlots + currentCounter}`;
  dataBuilder.push({
    type: 'scattergl', x: dfWell.map(d => d[col2Name]), y: dfWell.map(d => d[DEPTH_COL]),
    line: { color: colorCol[key][1], width: LINE_WIDTH }, name: col2Name,
    legendgroup: legends[nSeq - 1], showlegend: true, xaxis: overlayAxis2Id, yaxis: 'y'
  } as Data);

  // --- 3. Process and Plot Area Arsiran ---
  const processAndPlotFill = (conditionKey: 'red' | 'blue', fillColor: string) => {
    currentCounter++;
    const fillAxisId = `x${nPlots + currentCounter}`;

    // Pelabelan
    const labeledData = dfWell.map(row => {
      let label = 0;
      if (conditionKey === 'red') {
        if (key === 'RT_RGSA') label = (row[col1Name] as number) > (row[col2Name] as number) ? 1 : 0;
        else label = (row[col1Name] as number) < (row[col2Name] as number) ? 1 : 0;
      } else { // blue condition
        if (key === 'RT_RGSA') label = (row[col1Name] as number) < (row[col2Name] as number) ? 1 : 0;
        else label = (row[col1Name] as number) > (row[col2Name] as number) ? 1 : 0;
      }
      return { ...row, label };
    });

    // Pengelompokan dan pemfilteran
    // (menggunakan logika dari xoverLabelDf)
    const segments: LogDataRow[][] = [];
    let currentSegment: LogDataRow[] = [];
    for (const row of labeledData) {
      if (currentSegment.length === 0 || row.label === currentSegment[0].label) {
        currentSegment.push(row);
      } else {
        segments.push(currentSegment);
        currentSegment = [row];
      }
    }
    if (currentSegment.length > 0) segments.push(currentSegment);

    const fillSegments = segments.filter(seg => seg.length > 0 && seg[0].label === 1);

    // Tambahkan trace untuk setiap segmen arsiran
    for (const segment of fillSegments) {
      dataBuilder.push({
        type: 'scatter', x: segment.map(d => d[col1Name]), y: segment.map(d => d[DEPTH_COL]),
        showlegend: false, line: { color: 'rgba(0,0,0,0)' }, hoverinfo: 'none',
        xaxis: fillAxisId, yaxis: 'y'
      } as Data);
      dataBuilder.push({
        type: 'scatter', x: segment.map(d => d[col2Name]), y: segment.map(d => d[DEPTH_COL]),
        showlegend: false, line: { color: 'rgba(0,0,0,0)' }, hoverinfo: 'none',
        fill: 'tonextx', fillcolor: fillColor,
        xaxis: fillAxisId, yaxis: 'y'
      } as Data);
    }

    // Atur layout untuk sumbu arsiran (tak terlihat)
    const fillRange = rangeCol[key as keyof typeof rangeCol][0];
    (layoutBuilder as any)[fillAxisId] = { // Keep as any for direct assignment
      visible: false, overlaying: `x${nSeq}`,
      range: logScale ? [Math.log10(fillRange[0]), Math.log10(fillRange[1])] : fillRange
    };
  };

  processAndPlotFill('red', fillColorRed);
  processAndPlotFill('blue', fillColorBlue);

  // --- 4. Atur Layout untuk Sumbu yang Terlihat ---
  const range1 = rangeCol[key as keyof typeof rangeCol][0];
  const range2 = rangeCol[key as keyof typeof rangeCol][1];

  (layoutBuilder as any)[`xaxis${nSeq}`] = { // Keep as any for direct assignment
    side: 'top', domain: domain,
    type: logScale ? 'log' : 'linear',
    range: logScale ? [Math.log10(range1[0]), Math.log10(range1[1])] : range1
  };
  (layoutBuilder as any)[overlayAxis2Id] = { // Keep as any for direct assignment
    side: 'top', overlaying: `x${nSeq}`,
    type: logScale ? 'log' : 'linear',
    range: logScale ? [Math.log10(range2[0]), Math.log10(range2[1])] : range2
  };

  return { data: dataBuilder, layout: (layoutBuilder as any), counter: currentCounter }; // Keep as any for return
}

/**
 * Membuat plot dengan dua kurva (fitur) yang saling tumpang tindih,
 * di mana kurva kedua memiliki gaya garis putus-putus (dashed).
 *
 * @returns Objek baru yang berisi `data`, `layout`, dan `counter` yang telah diperbarui.
 */
export function plotTwoFeaturesSimple(
  existingData: Data[],
  existingLayout: Partial<Layout>,
  dfWell: LogDataRow[],
  key: string,
  nSeq: number,
  counter: number,
  nPlots: number,
  options: {
    logScale?: boolean;
    domain?: [number, number];
  } = {}
): PlotterResult & { counter: number } {
  const { logScale = false, domain } = options;

  const dataBuilder = [...existingData]; // Use const as reassignment is not needed
  const layoutBuilder = { ...existingLayout };
  let currentCounter = counter;

  // --- 1. Plot Kurva Pertama (Garis Solid) ---
  const col1 = dataCol[key][0];
  const trace1: Partial<Data> = {
    type: 'scattergl',
    x: dfWell.map(d => d[col1]),
    y: dfWell.map(d => d[DEPTH_COL]),
    line: { color: colorCol[key][0], width: LINE_WIDTH },
    name: col1,
    legendgroup: legends[nSeq - 1] || `legend${nSeq}`,
    showlegend: true,
    xaxis: `x${nSeq}`,
    yaxis: 'y',
  };
  dataBuilder.push(trace1 as Data);

  // --- 2. Plot Kurva Kedua (Garis Putus-Putus) sebagai Overlay ---
  currentCounter++;
  const overlayXaxisId = `x${nPlots + currentCounter}`;
  const col2 = dataCol[key][1];
  const trace2: Partial<Data> = {
    type: 'scattergl',
    x: dfWell.map(d => d[col2]),
    y: dfWell.map(d => d[DEPTH_COL]),
    line: {
      color: colorCol[key][1],
      width: LINE_WIDTH,
      dash: 'dash', // <-- Perbedaan utama: garis putus-putus
    },
    name: col2,
    legendgroup: legends[nSeq - 1] || `legend${nSeq}`,
    showlegend: true,
    xaxis: overlayXaxisId,
    yaxis: 'y',
  };
  dataBuilder.push(trace2 as Data);

  // --- 3. Atur Layout untuk Kedua Sumbu-x ---
  const range1 = rangeCol[key as keyof typeof rangeCol][0];
  const range2 = rangeCol[key as keyof typeof rangeCol][1];

  // Layout untuk sumbu-x pertama
  (layoutBuilder as any)[`xaxis${nSeq}`] = { // Keep as any for direct assignment
    side: 'top',
    domain: domain,
    type: logScale ? 'log' : 'linear',
    range: logScale ? [Math.log10(range1[0]), Math.log10(range1[1])] : range1
  };

  // Layout untuk sumbu-x kedua (overlay)
  if (range2) {
    (layoutBuilder as any)[overlayXaxisId] = { // Keep as any for direct assignment
      side: 'top',
      overlaying: `x${nSeq}`,
      type: logScale ? 'log' : 'linear',
      range: logScale ? [Math.log10(range2[0]), Math.log10(range2[1])] : range2
    };
  }

  return { data: dataBuilder, layout: (layoutBuilder as any), counter: currentCounter }; // Keep as any for return
}

/**
 * Membuat plot dengan TIGA kurva yang saling tumpang tindih (overlay),
 * masing-masing dengan gaya garis yang berbeda (solid, dash, dot).
 *
 * @returns Objek baru yang berisi `data`, `layout`, dan `counter` yang telah diperbarui.
 */
export function plotThreeFeaturesSimple(
  existingData: Data[],
  existingLayout: Partial<Layout>,
  dfWell: LogDataRow[],
  key: string,
  nSeq: number,
  counter: number,
  nPlots: number,
  options: {
    logScale?: boolean;
    domain?: [number, number];
  } = {}
): PlotterResult & { counter: number } {
  const { logScale = false, domain } = options;

  const dataBuilder = [...existingData]; // Use const as reassignment is not needed
  const layoutBuilder = { ...existingLayout };
  let currentCounter = counter;

  // --- 1. Plot Kurva Pertama (Garis Solid) ---
  const col1 = dataCol[key][0];
  const trace1: Partial<Data> = {
    type: 'scattergl',
    x: dfWell.map(d => d[col1]),
    y: dfWell.map(d => d[DEPTH_COL]),
    line: { color: colorCol[key][0], width: LINE_WIDTH },
    name: col1,
    legendgroup: legends[nSeq - 1] || `legend${nSeq}`,
    showlegend: true,
    xaxis: `x${nSeq}`,
    yaxis: 'y',
  };
  dataBuilder.push(trace1 as Data);

  // --- 2. Plot Kurva Kedua (Garis Putus-Putus) ---
  currentCounter++;
  const overlayAxis2Id = `x${nPlots + currentCounter}`;
  const col2 = dataCol[key][1];
  const trace2: Partial<Data> = {
    type: 'scattergl',
    x: dfWell.map(d => d[col2]),
    y: dfWell.map(d => d[DEPTH_COL]),
    line: { color: colorCol[key][1], width: LINE_WIDTH, dash: 'dash' },
    name: col2,
    legendgroup: legends[nSeq - 1] || `legend${nSeq}`,
    showlegend: true,
    xaxis: overlayAxis2Id,
    yaxis: 'y',
  };
  dataBuilder.push(trace2 as Data);

  // --- 3. Plot Kurva Ketiga (Garis Titik-Titik) ---
  currentCounter++;
  const overlayAxis3Id = `x${nPlots + currentCounter}`;
  const col3 = dataCol[key][2];
  const trace3: Partial<Data> = {
    type: 'scattergl',
    x: dfWell.map(d => d[col3]),
    y: dfWell.map(d => d[DEPTH_COL]),
    line: { color: colorCol[key][2], width: LINE_WIDTH, dash: 'dot' },
    name: col3,
    legendgroup: legends[nSeq - 1] || `legend${nSeq}`,
    showlegend: true,
    xaxis: overlayAxis3Id,
    yaxis: 'y',
  };
  dataBuilder.push(trace3 as Data);

  // --- 4. Atur Layout untuk Ketiga Sumbu-x ---
  const range1 = rangeCol[key as keyof typeof rangeCol][0];
  const range2 = rangeCol[key as keyof typeof rangeCol][1];
  const range3 = rangeCol[key as keyof typeof rangeCol][2];

  // Layout untuk sumbu-x pertama (utama)
  (layoutBuilder as any)[`xaxis${nSeq}`] = { // Keep as any for direct assignment
    side: 'top', domain: domain,
    type: logScale ? 'log' : 'linear',
    range: logScale ? [Math.log10(range1[0]), Math.log10(range1[1])] : range1
  };

  // Layout untuk sumbu-x kedua (overlay)
  if (range2) {
    (layoutBuilder as any)[overlayAxis2Id] = { // Keep as any for direct assignment
      side: 'top', overlaying: `x${nSeq}`,
      type: logScale ? 'log' : 'linear',
      range: logScale ? [Math.log10(range2[0]), Math.log10(range2[1])] : range2
    };
  }

  // Layout untuk sumbu-x ketiga (overlay)
  if (range3) {
    (layoutBuilder as any)[overlayAxis3Id] = { // Keep as any for direct assignment
      side: 'top', overlaying: `x${nSeq}`,
      type: logScale ? 'log' : 'linear',
      range: logScale ? [Math.log10(range3[0]), Math.log10(range3[1])] : range3
    };
  }

  return { data: dataBuilder, layout: (layoutBuilder as any), counter: currentCounter }; // Keep as any for return
}

/**
 * Membuat plot dengan EMPAT kurva yang saling tumpang tindih (overlay),
 * semuanya dengan garis solid dan skala yang bisa berbeda.
 * Menggunakan loop untuk efisiensi.
 *
 * @returns Objek baru yang berisi `data`, `layout`, dan `counter` yang telah diperbarui.
 */
export function plotFourFeaturesSimple(
  existingData: Data[],
  existingLayout: Partial<Layout>,
  dfWell: LogDataRow[],
  key: string,
  nSeq: number,
  counter: number,
  nPlots: number,
  options: {
    logScale?: boolean;
    domain?: [number, number];
  } = {}
): PlotterResult & { counter: number } {
  const { logScale = false, domain } = options;

  const dataBuilder = [...existingData];
  const layoutBuilder = { ...existingLayout };

  // Loop untuk membuat 4 trace dan 4 axis layout
  for (let i = 0; i < 4; i++) {
    // Ambil konfigurasi untuk iterasi saat ini
    const col = dataCol[key]?.[i];
    const color = colorCol[key]?.[i];
    const range = rangeCol[key as keyof typeof rangeCol]?.[i];

    // Jika konfigurasi tidak ada, lewati iterasi ini
    if (!col || !color || !range) {
      console.warn(`Konfigurasi untuk ${key} pada indeks ${i} tidak lengkap.`);
      continue;
    }

    // Tentukan ID sumbu-x: yang pertama adalah sumbu utama, sisanya adalah overlay
    const xaxisId = i === 0 ? `x${nSeq}` : `x${nPlots + counter + i}`;

    // 1. Buat dan tambahkan trace ke data builder
    const newTrace: Partial<Data> = {
      type: 'scattergl',
      x: dfWell.map(d => d[col]),
      y: dfWell.map(d => d[DEPTH_COL]),
      line: { color: color, width: LINE_WIDTH },
      name: col,
      legendgroup: legends[nSeq - 1] || `legend${nSeq}`,
      showlegend: true,
      xaxis: xaxisId,
      yaxis: 'y',
    };
    dataBuilder.push(newTrace as Data);

    // 2. Buat dan tambahkan konfigurasi layout untuk sumbu-x
    let axisConfig: Partial<Layout['xaxis']> = {};

    if (i === 0) {
      // Konfigurasi untuk sumbu utama
      axisConfig = {
        side: 'top',
        domain: domain,
      };
    } else {
      // Konfigurasi untuk sumbu overlay
      axisConfig = {
        side: 'top',
        // RE-INTRODUCE 'as any' here
        overlaying: `x${nSeq}` as any, // This tells TypeScript to trust that this string will be a valid axis ID
      };
    }

    // Terapkan skala logaritmik jika diperlukan
    if (logScale) {
      axisConfig.type = 'log';
      axisConfig.range = [Math.log10(range[0]), Math.log10(range[1])];
    } else {
      axisConfig.range = range;
    }

    (layoutBuilder as any)[xaxisId] = axisConfig;
  }

  // Update counter dengan jumlah sumbu overlay yang ditambahkan (3)
  const finalCounter = counter + 3;

  return { data: dataBuilder, layout: (layoutBuilder as any), counter: finalCounter };
}

/**
 * Membuat plot crossover di mana dua kurva dan area arsirannya berbagi
 * skala sumbu-x yang sama.
 *
 * @returns Objek baru yang berisi `data`, `layout`, dan `counter` yang telah diperbarui.
 */
export function plotXover(
  existingData: Data[],
  existingLayout: Partial<Layout>,
  dfWell: LogDataRow[],
  key: string,
  nSeq: number,
  counter: number,
  nPlots: number,
  options: {
    yColor?: string;
    nColor?: string;
    domain?: [number, number];
  } = {}
): PlotterResult & { counter: number } {
  const { yColor = 'limegreen', nColor = 'lightgray', domain } = options;

  const dataBuilder = [...existingData]; // Use const
  const layoutBuilder = { ...existingLayout }; // Use const
  let currentCounter = counter;

  const mainXaxisId = `x${nSeq}`;

  // --- 1. Plot Area Arsiran (Fill Area) ---
  // Area arsiran digambar lebih dulu agar berada di lapisan paling bawah.
  const fillSegments = xoverLabelDf(dfWell, key, 1);

  for (const segment of fillSegments) {
    // Trace dummy sebagai batas kiri/kanan isian
    dataBuilder.push({
      type: 'scatter', x: segment.map(d => d[dataCol[key][0]]), y: segment.map(d => d[DEPTH_COL]),
      showlegend: false, line: { color: 'rgba(0,0,0,0)' }, hoverinfo: 'none',
      xaxis: mainXaxisId, yaxis: 'y',
    } as Data);

    // Trace kedua yang akan mengisi ke trace dummy sebelumnya
    dataBuilder.push({
      type: 'scatter', x: segment.map(d => d[dataCol[key][1]]), y: segment.map(d => d[DEPTH_COL]),
      fill: 'tonextx', fillcolor: fillcol(segment[0].label, yColor, nColor),
      showlegend: false, line: { color: 'rgba(0,0,0,0)' }, hoverinfo: 'none',
      xaxis: mainXaxisId, yaxis: 'y',
    } as Data);
  }

  // --- 2. Plot Garis Kurva (Line Plots) ---
  // Garis digambar setelah arsiran agar berada di atasnya.
  const col1 = dataCol[key][0];
  dataBuilder.push({
    type: 'scattergl', x: dfWell.map(d => d[col1]), y: dfWell.map(d => d[DEPTH_COL]),
    line: { color: colorCol[key][0], width: LINE_WIDTH }, name: col1,
    legendgroup: legends[nSeq - 1], showlegend: true,
    xaxis: mainXaxisId, yaxis: 'y',
  } as Data);

  const col2 = dataCol[key][1];
  dataBuilder.push({
    type: 'scattergl', x: dfWell.map(d => d[col2]), y: dfWell.map(d => d[DEPTH_COL]),
    line: { color: colorCol[key][1], width: LINE_WIDTH }, name: col2,
    legendgroup: legends[nSeq - 1], showlegend: true,
    xaxis: mainXaxisId, yaxis: 'y',
  } as Data);

  // --- 3. Atur Layout untuk Sumbu-x Utama ---
  const range = rangeCol[key as keyof typeof rangeCol][0];
  (layoutBuilder as any)[mainXaxisId] = { // Keep as any for direct assignment
    side: 'top',
    type: 'log',
    range: [Math.log10(range[0]), Math.log10(range[1])],
    domain: domain,
  };

  // --- 4. Buat Sumbu Overlay Kosong (sesuai logika Python asli) ---
  // Bagian ini mungkin merupakan trik untuk layout atau placeholder di skrip asli.
  currentCounter++;
  const emptyOverlayId = `x${nPlots + currentCounter}`;
  dataBuilder.push({
    type: 'scatter', x: [], y: [], showlegend: false, hoverinfo: 'skip',
    xaxis: emptyOverlayId, yaxis: 'y',
  } as Data);

  (layoutBuilder as any)[emptyOverlayId] = { // Keep as any for direct assignment
    overlaying: mainXaxisId, side: 'top', type: 'log',
    range: [Math.log10(range[0]), Math.log10(range[1])],
  };

  return { data: dataBuilder, layout: (layoutBuilder as any), counter: currentCounter }; // Keep as any for return
}

// Keep all the following functions from plot-display as they are new additions
export function plotXoverThres(
  existingData: Data[],
  existingLayout: Partial<Layout>,
  dfWell: LogDataRow[],
  key: string,
  nSeq: number,
  options: {
    yColor?: string;
    nColor?: string;
    domain?: [number, number];
  } = {}
): PlotterResult {
  const { yColor = colorsDict.red, nColor = 'lightgray', domain } = options;

  const dataBuilder = [...existingData];
  const layoutBuilder = { ...existingLayout };
  const mainXaxisId = `x${nSeq}`;
  const thresholdValue = thres[key];

  // --- 1. Plot Area Arsiran ---
  const fillSegments = xoverLabelDf(dfWell, key, 1);
  for (const segment of fillSegments) {
    dataBuilder.push({
      type: 'scatter', x: segment.map(d => d[dataCol[key][0]]), y: segment.map(d => d[DEPTH_COL]),
      showlegend: false, line: { color: 'rgba(0,0,0,0)' }, hoverinfo: 'none',
      xaxis: mainXaxisId, yaxis: 'y',
    } as Data);
    dataBuilder.push({
      type: 'scatter', x: segment.map(() => thresholdValue), y: segment.map(d => d[DEPTH_COL]),
      fill: 'tonextx', fillcolor: fillcol(segment[0].label, yColor, nColor),
      showlegend: false, line: { color: 'rgba(0,0,0,0)' }, hoverinfo: 'none',
      xaxis: mainXaxisId, yaxis: 'y',
    } as Data);
  }

  // --- 2. Plot Garis Data dan Garis Threshold ---
  const col = dataCol[key][0];
  dataBuilder.push({
    type: 'scattergl', x: dfWell.map(d => d[col]), y: dfWell.map(d => d[DEPTH_COL]),
    line: { color: colorCol[key][0], width: LINE_WIDTH }, name: col,
    legendgroup: legends[nSeq - 1], showlegend: true,
    xaxis: mainXaxisId, yaxis: 'y',
  } as Data);

  dataBuilder.push({
    type: 'scattergl', x: dfWell.map(() => thresholdValue), y: dfWell.map(d => d[DEPTH_COL]),
    line: { color: colorsDict.red, width: LINE_WIDTH }, name: 'Threshold',
    legendgroup: legends[nSeq - 1], showlegend: true,
    xaxis: mainXaxisId, yaxis: 'y',
  } as Data);

  // --- 3. Atur Layout Sumbu ---
  (layoutBuilder as any)[mainXaxisId] = {
    side: 'top',
    range: rangeCol[key as keyof typeof rangeCol][0],
    domain: domain,
  };

  return { data: dataBuilder, layout: (layoutBuilder as any) };
}

export function plotXoverLogNormal(
  existingData: Data[],
  existingLayout: Partial<Layout>,
  dfWell: LogDataRow[],
  key: string,
  nSeq: number,
  counter: number,
  nPlots: number,
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
  dataBuilder.push({
    type: 'scattergl', x: dfWell.map(d => d[col1]), y: dfWell.map(d => d[DEPTH_COL]),
    line: { color: colorCol[key][0], width: LINE_WIDTH }, name: col1, legendgroup: legends[nSeq - 1], showlegend: false,
    xaxis: `x${nSeq}`, yaxis: 'y',
  } as Data);
  (layoutBuilder as any)[`xaxis${nSeq}`] = { side: 'top', range: range1, domain: domain };

  currentCounter++;
  const overlayXaxisId = `x${nPlots + currentCounter}`;
  const col2 = dataCol[key][1];
  const range2 = rangeCol[key as keyof typeof rangeCol][1];
  dataBuilder.push({
    type: 'scattergl', x: dfWell.map(d => d[col2]), y: dfWell.map(d => d[DEPTH_COL]),
    line: { color: colorCol[key][1], width: LINE_WIDTH }, name: col2, legendgroup: legends[nSeq - 1], showlegend: false,
    xaxis: overlayXaxisId, yaxis: 'y',
  } as Data);
  (layoutBuilder as any)[overlayXaxisId] = { side: 'top', range: range2, overlaying: `x${nSeq}` };

  if (!excludeCrossover) {
    currentCounter++;
    const shadingXaxisId = `x${nPlots + currentCounter}`;
    const xoverDfs = xoverLabelDf(dfWell, key, type);
    for (const xoverDf of xoverDfs) {
      if (xoverDf.length === 0) continue;
      dataBuilder.push({ type: 'scatter', x: xoverDf.map(d => d[dataCol[key][2]]), y: xoverDf.map(d => d[DEPTH_COL]), showlegend: false, line: { color: 'rgba(0,0,0,0)' }, xaxis: shadingXaxisId, yaxis: 'y', hoverinfo: 'none' } as Data);
      dataBuilder.push({ type: 'scatter', x: xoverDf.map(d => d[dataCol[key][3]]), y: xoverDf.map(d => d[DEPTH_COL]), fill: 'tonextx', fillcolor: fillcol(xoverDf[0].label, yColor, nColor), showlegend: false, line: { color: 'rgba(0,0,0,0)' }, xaxis: shadingXaxisId, yaxis: 'y', hoverinfo: 'none' } as Data);
    }
    (layoutBuilder as any)[shadingXaxisId] = { visible: false, overlaying: `x${nSeq}`, range: range1 };
  }

  return { data: dataBuilder, layout: (layoutBuilder as any), counter: currentCounter };
}

export function plotFillXToZero(
  existingData: Data[],
  existingLayout: Partial<Layout>,
  dfWell: LogDataRow[],
  key: string,
  nSeq: number,
  index: number,
  options: {
    domain?: [number, number];
    fillColor?: string;
  } = {}
): PlotterResult {
  const { domain, fillColor = 'lightgray' } = options;

  const col = dataCol[key][index];
  const color = colorCol[key][index];
  const range = rangeCol[key as keyof typeof rangeCol][index];

  const newTrace: Partial<Data> = {
    type: 'scatter',
    x: dfWell.map(d => d[col]),
    y: dfWell.map(d => d[DEPTH_COL]),
    line: { color: color, width: LINE_WIDTH },
    name: col,
    legendgroup: legends[nSeq - 1] || `legend${nSeq}`,
    showlegend: true,
    fill: 'tozerox', // <-- Kunci untuk mengisi area ke garis x=0
    fillcolor: fillColor,
    xaxis: `x${nSeq}`,
    yaxis: 'y',
  };

  const dataBuilder = [...existingData, newTrace as Data];
  const layoutBuilder = { ...existingLayout };

  (layoutBuilder as any)[`xaxis${nSeq}`] = {
    side: 'top',
    range: range,
    domain: domain,
  };

  return { data: dataBuilder, layout: (layoutBuilder as any) };
}

/**
 * Membuat plot stacked area, berguna untuk menampilkan komposisi.
 * Menggunakan properti `fill: 'tonextx'`.
 *
 * @returns Objek baru yang berisi `data`, `layout`, dan `counter` yang telah diperbarui.
 */
export function plotNFillXToZero(
  existingData: Data[],
  existingLayout: Partial<Layout>,
  dfWell: LogDataRow[],
  key: string,
  nSeq: number,
  counter: number,
  nPlots: number,
  options: {
    domain?: [number, number];
  } = {}
): PlotterResult & { counter: number } {
  const { domain } = options;

  const dataBuilder = [...existingData];
  const layoutBuilder = { ...existingLayout };
  let currentCounter = counter;
  const mainXaxisId = `x${nSeq}`;

  // Loop melalui setiap kolom yang didefinisikan untuk 'key' ini
  const cols = dataCol[key] || [];
  cols.forEach((col, index) => {
    const trace: Partial<Data> = {
      type: 'scatter',
      x: dfWell.map(d => d[col]),
      y: dfWell.map(d => d[DEPTH_COL]),
      name: col,
      line: { color: colorCol[key][index], width: 0 }, // Garis dibuat tidak terlihat
      legendgroup: legends[nSeq - 1] || `legend${nSeq}`,
      showlegend: true,
      // Trace pertama mengisi ke nol, sisanya mengisi ke trace sebelumnya
      fill: index === 0 ? 'tozerox' : 'tonextx',
      xaxis: mainXaxisId,
      yaxis: 'y',
    };
    dataBuilder.push(trace as Data);
  });

  // Atur layout untuk sumbu-x utama
  (layoutBuilder as any)[mainXaxisId] = {
    side: 'top',
    range: rangeCol[key as keyof typeof rangeCol][0],
    domain: domain,
  };

  // Tambahkan sumbu overlay kosong sesuai logika Python asli
  for (let j = 1; j < cols.length; j++) {
    currentCounter++;
    const emptyOverlayId = `x${nPlots + currentCounter}`;
    dataBuilder.push({
      type: 'scatter', x: [], y: [], showlegend: false, hoverinfo: 'skip',
      xaxis: emptyOverlayId, yaxis: 'y',
    } as Data);
    (layoutBuilder as any)[emptyOverlayId] = {
      overlaying: mainXaxisId,
      side: 'top',
      range: rangeCol[key as keyof typeof rangeCol][0],
    };
  }

  return { data: dataBuilder, layout: (layoutBuilder as any), counter: currentCounter };
}

/**
 * Membuat track plot kategorikal (flag) menggunakan Heatmap.
 */
export function plotFlag(
  existingData: Data[],
  existingLayout: Partial<Layout>,
  dfWell: LogDataRow[],
  key: string,
  nSeq: number
): PlotterResult {
  const dataBuilder = [...existingData];
  const layoutBuilder = { ...existingLayout };

  let finalFlagColors: Record<number, string>;
  let finalFlagsNames: Record<number, string>;
  let maxVal: number;
  let currentDfWell = [...dfWell];
  const col = dataCol[key][0];

  if (['MARKER', 'RGBE', 'RPBE'].includes(key)) {
    const result = encodeWithNan(currentDfWell, col);
    currentDfWell = result.data;
    finalFlagsNames = result.names;
    maxVal = Object.keys(finalFlagsNames).length;

    const tempColors: Record<number, string> = {};
    for (let i = 0; i < maxVal; i++) {
      tempColors[i] = rgbToHex(generateNewColor({}, 0));
    }
    tempColors[0] = 'rgba(0,0,0,0)';
    finalFlagColors = tempColors;
  } else {
    finalFlagColors = flagColor[key];
    finalFlagsNames = flagsName[key];
    if (!finalFlagsNames) {
      console.error(`flagsName untuk key '${key}' tidak ditemukan.`);
      return { data: dataBuilder, layout: (layoutBuilder as any) };
    }
    maxVal = Math.max(...Object.keys(finalFlagsNames).map(Number)) + 1;
  }

  const zData = [currentDfWell.map(d => (d[col] as number) / maxVal)];
  const customData = currentDfWell.map(row => finalFlagsNames[row[col] as number] || '');

  const bvals = Array.from({ length: maxVal + 1 }, (_, i) => i);
  const colors = Object.values(finalFlagColors);
  const colorscale = discreteColorscale(bvals, colors);

  const trace: Partial<Data> = {
    type: 'heatmap', z: zData, zmin: 0, zmax: 1,
    y: currentDfWell.map(d => d[DEPTH_COL]), customdata: customData,
    hovertemplate: '%{customdata}<extra></extra>', colorscale: colorscale as any,
    showscale: false, xaxis: `x${nSeq}`, yaxis: 'y',
  };

  dataBuilder.push(trace as Data);
  (layoutBuilder as any)[`xaxis${nSeq}`] = {
    side: 'top', zeroline: false, showgrid: false, showticklabels: false,
  };

  return { data: dataBuilder, layout: (layoutBuilder as any) };
}

/**
 * Membuat plot yang menampilkan titik-titik data sebagai simbol (marker)
 * pada sebuah track dengan rentang [0, 1].
 */
export function plotXptPoint(
  existingData: Data[],
  existingLayout: Partial<Layout>,
  dfWell: LogDataRow[],
  key: string,
  nSeq: number,
  options: {
    domain?: [number, number];
  } = {}
): PlotterResult {
  const { domain } = options;
  const col = dataCol[key][0];

  const dataBuilder = [...existingData];
  const layoutBuilder = { ...existingLayout };
  const mainXaxisId = `x${nSeq}`;

  // Trace untuk simbol/marker
  dataBuilder.push({
    type: 'scattergl',
    mode: 'markers',
    x: dfWell.map(d => d[col]),
    y: dfWell.map(d => d[DEPTH_COL]),
    marker: {
      symbol: 'circle-open',
      color: colorCol[key][0] || 'black',
      size: 8,
      line: { width: 1.5 }
    },
    name: col,
    showlegend: true,
    xaxis: mainXaxisId,
    yaxis: 'y',
  } as Data);

  // Trace dummy tak terlihat untuk menetapkan batas kanan sumbu-x ke 1
  dataBuilder.push({
    type: 'scatter', x: dfWell.map(() => 1), y: dfWell.map(d => d[DEPTH_COL]),
    line: { color: 'rgba(0,0,0,0)', width: 0 },
    showlegend: false, hoverinfo: 'skip',
    xaxis: mainXaxisId, yaxis: 'y',
  } as Data);

  // Atur layout sumbu
  (layoutBuilder as any)[mainXaxisId] = {
    side: 'top',
    range: [0, 1], // Rentang tetap
    domain: domain,
    showticklabels: false, // Sembunyikan label angka pada sumbu ini
  };

  return { data: dataBuilder, layout: (layoutBuilder as any) };
}

/**
 * Menambahkan anotasi teks dengan panah penunjuk pada kedalaman tertentu.
 */
export function plotTextsXpt(
  existingLayout: Partial<Layout>,
  dfText: XptNote[], // Menggunakan tipe data baru
  nSeq: number
): Partial<Layout> {
  if (!dfText || dfText.length === 0) {
    return existingLayout;
  }

  const newAnnotations = dfText.map(row => ({
    x: 0.1, // Posisi x panah dimulai (10% dari kiri)
    y: row['Depth (m)'],
    xref: `x${nSeq}`,
    yref: 'y',
    xanchor: 'left',
    yanchor: 'middle',
    text: row['Note'].substring(0, 20), // Batasi panjang teks
    showarrow: true,
    font: { size: 10, color: "black" },
    align: "left",
    arrowhead: 0,
    arrowsize: 1,
    arrowwidth: 1,
    arrowcolor: "black",
    ax: 20,
    ay: 0,
  } as Partial<Layout['annotations'][0]>));

  const existingAnnotations = existingLayout.annotations || [];
  return {
    ...existingLayout,
    annotations: [...existingAnnotations, ...newAnnotations]
  };
}

/**
 * Menambahkan anotasi teks untuk puncak formasi (marker).
 * Ini adalah versi final yang telah kita sempurnakan sebelumnya.
 */
export function plotTextsMarker(
  existingLayout: Partial<Layout>,
  dfText: MarkerData[],
  depthBtm: number,
  nSeq: number
): Partial<Layout> {
  if (!dfText || dfText.length === 0) {
    return existingLayout;
  }

  const newAnnotations = dfText
    .map(row => {
      const y = row['Mean Depth'];
      if (y >= depthBtm) return null;

      return {
        x: 0.5,
        y: y,
        xref: `x${nSeq} domain`,
        yref: 'y',
        xanchor: 'center',
        yanchor: 'middle',
        text: `<b>${row.Surface.substring(0, 8)}</b>`,
        showarrow: false,
        font: { size: 10, color: 'black' },
        bgcolor: 'rgba(255, 255, 255, 0.7)',
        borderpad: 2,
      } as Partial<Layout['annotations'][0]>;
    }).filter(
      (ann): ann is Partial<Layout['annotations'][0]> => ann !== null
    );

  const existingAnnotations = existingLayout.annotations || [];
  return {
    ...existingLayout,
    annotations: [...existingAnnotations, ...newAnnotations]
  };
}

/**
 * Membuat sebuah track yang hanya berisi anotasi teks (misalnya untuk Marker).
 * Fungsi ini menggunakan "dummy trace" yang tidak terlihat untuk memastikan
 * subplot dan sumbu-x nya dibuat, lalu menambahkan teks sebagai anotasi.
 *
 * @param existingData - Array `data` Plotly yang sudah ada.
 * @param existingLayout - Objek `layout` Plotly yang sudah ada.
 * @param textData - Array data yang berisi teks dan kedalaman (menggunakan tipe MarkerData).
 * @param depthBtm - Batas kedalaman bawah untuk filtering.
 * @param nSeq - Nomor urutan track plot.
 * @param options - Opsi tambahan seperti domain.
 * @returns Objek baru yang berisi `data` dan `layout` yang telah diperbarui.
 */
export function plotTextValues(
  existingData: Data[],
  existingLayout: Partial<Layout>,
  textData: MarkerData[],
  depthBtm: number,
  nSeq: number,
  options: {
    domain?: [number, number];
  } = {}
): PlotterResult {
  const { domain } = options;

  const dataBuilder = [...existingData];
  const layoutBuilder = { ...existingLayout };
  const mainXaxisId = `x${nSeq}`;

  // Lanjutkan hanya jika ada data teks untuk diplot
  if (textData && textData.length > 0) {
    // --- 1. Buat "Dummy Trace" untuk Inisialisasi Sumbu ---
    const depths = textData.map(d => d['Mean Depth']);
    const minDepth = Math.min(...depths);
    const maxDepth = Math.max(...depths);

    dataBuilder.push({
      type: 'scatter',
      x: [0, 1], // Rentang x sederhana untuk membuat sumbu
      y: [minDepth, maxDepth], // Rentang y sesuai data marker
      mode: 'markers',
      marker: { size: 0, color: 'rgba(0,0,0,0)' }, // Marker dibuat transparan/tak terlihat
      showlegend: false,
      hoverinfo: 'skip',
      xaxis: mainXaxisId,
      yaxis: 'y', // Selalu gunakan sumbu Y utama untuk konsistensi
    } as Data);

    // --- 2. Buat Anotasi Teks ---
    const newAnnotations = textData
      .map(row => {
        const y = row['Mean Depth'];
        const text = `<b>${row['Surface'].substring(0, 8)}</b>`;

        // Filter anotasi yang berada di luar jangkauan kedalaman
        if (y >= depthBtm) {
          return null;
        }

        return {
          x: 0.5, // Posisi horizontal di tengah track
          y: y,
          xref: `${mainXaxisId} domain`, // Anotasi relatif terhadap domain sumbu-x
          yref: 'y', // Anotasi relatif terhadap sumbu-y utama
          xanchor: 'center',
          yanchor: 'middle',
          text: text,
          showarrow: false, // Diubah dari Python, karena ax=0 ay=0 tidak menampilkan panah
          font: { size: 10, color: "black" },
          align: "center",
          bgcolor: 'rgba(255, 255, 255, 0.7)',
          borderpad: 2,
        } as Partial<Layout['annotations'][0]>;
      })
      .filter(Boolean); // Hapus semua entri null

    // Gabungkan anotasi baru dengan yang sudah ada
    const existingAnnotations = (layoutBuilder as any).annotations || [];
    (layoutBuilder as any).annotations = [...existingAnnotations, ...newAnnotations];
  }

  // --- 3. Atur Layout Sumbu-x ---
  (layoutBuilder as any)[mainXaxisId] = {
    side: 'top',
    domain: domain,
    showticklabels: false, // Tidak perlu menampilkan angka pada sumbu untuk track teks
    showgrid: false,
    zeroline: false,
  };

  return { data: dataBuilder, layout: (layoutBuilder as any) };
}

/**
 * Membuat kolom NPHI_NORM dan RHOB_NORM untuk visualisasi crossover.
 * Fungsi ini mengembalikan array baru (immutable).
 *
 * @param data - Array data log.
 * @param log1Key - Kunci untuk kurva pertama (misalnya, 'NPHI').
 * @param log2Key - Kunci untuk kurva kedua (misalnya, 'RHOB').
 * @returns Array LogDataRow baru dengan tambahan kolom normalisasi.
 */
export function normalizeXover(
  data: LogDataRow[],
  log1Key: keyof LogDataRow,
  log2Key: keyof LogDataRow
): LogDataRow[] {
  const logMergeKey = `${String(log1Key)}_${String(log2Key)}` as keyof typeof rangeCol;
  const ranges = rangeCol[logMergeKey];

  if (!ranges) {
    console.error(`Rentang untuk ${logMergeKey} tidak ditemukan di 'rangeCol'.`);
    return data;
  }

  const [log1Range, log2Range] = ranges;
  const [minLog1, maxLog1] = log1Range;
  const [minLog2, maxLog2] = log2Range;

  const log1NormKey = `${String(log1Key)}_NORM`;
  const log2NormKey = `${String(log2Key)}_NORM_${String(log1Key)}`;

  // Gunakan .map untuk membuat array baru, menjaga immutability
  return data.map(row => {
    const newRow = { ...row };

    // 1. Salin nilai log_1 ke kolom _NORM-nya
    const log1Value = row[log1Key] as number;
    (newRow as any)[log1NormKey] = log1Value;

    // 2. Lakukan interpolasi linier untuk log_2
    const log2Value = row[log2Key] as number;
    if (typeof log2Value === 'number' && !isNaN(log2Value)) {
      const normalizedValue = minLog1 + (log2Value - minLog2) * (maxLog1 - minLog1) / (maxLog2 - minLog2);
      (newRow as any)[log2NormKey] = normalizedValue;
    } else {
      (newRow as any)[log2NormKey] = null;
    }

    return newRow;
  });
}

/**
 * Versi generic untuk mengekstrak data kategorikal dari sebuah kolom,
 * mengelompokkannya, dan menghitung rata-rata kedalamannya.
 * Ini adalah inti logika yang mereplikasi `groupby().mean()` dari Pandas.
 *
 * @param data - Array data log lengkap.
 * @param key - Nama kolom yang akan digunakan untuk pengelompokan (misalnya, 'MARKER').
 * @returns Array objek MarkerData.
 */
export function extractMarkersCustomize(
  data: LogDataRow[],
  key: keyof LogDataRow // Menggunakan `keyof` untuk type safety
): MarkerData[] {
  // Jika tidak ada data, kembalikan array kosong
  if (!data || data.length === 0) {
    return [];
  }

  // Gunakan Map untuk mengelompokkan data: { nama_marker: { sum: total_depth, count: jumlah } }
  const markerGroups = new Map<string, { sum: number; count: number }>();

  for (const row of data) {
    const markerValue = row[key];

    // Lewati baris jika nilai marker kosong, null, atau undefined
    if (markerValue == null || String(markerValue).trim() === '') {
      continue;
    }

    // FIX: Konversi nilai marker ke string untuk memastikan konsistensi.
    // Ini setara dengan `.astype(str)` di Python untuk keamanan.
    const markerString = String(markerValue);

    // Ambil data grup yang ada atau buat baru jika belum ada
    const group = markerGroups.get(markerString) || { sum: 0, count: 0 };

    // Update sum dan count
    group.sum += row.DEPTH;
    group.count += 1;

    // Simpan kembali ke Map
    markerGroups.set(markerString, group);
  }

  // Olah Map yang sudah dikelompokkan untuk menghitung rata-rata
  const result: MarkerData[] = [];
  markerGroups.forEach((value, key) => {
    result.push({
      Surface: key,
      'Mean Depth': value.sum / value.count,
    });
  });

  return result;
}

/**
 * Fungsi spesifik untuk mengekstrak data dari kolom 'MARKER'.
 * Fungsi ini hanya sebuah pemanggil (wrapper) untuk versi generic-nya.
 *
 * @param data - Array data log lengkap.
 * @returns Array objek MarkerData.
 */
export function extractMarkersWithMeanDepth(data: LogDataRow[]): MarkerData[] {
  return extractMarkersCustomize(data, 'MARKER');
}