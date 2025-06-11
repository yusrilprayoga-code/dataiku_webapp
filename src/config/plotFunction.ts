import { type LogDataRow } from '@/types';
import { type Data, type Layout } from 'plotly.js';
import {
  dataCol,
  DEPTH_COL,
  colorCol,
  LINE_WIDTH,
  legends,
  rangeCol,
  thres,
  layoutBuilder
} from './plotConfig';

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
      if (row[cols[2]] > row[cols[3]]) {
        label = 1;
      }
    } else {
      if (row[cols[0]] > row[cols[1]]) {
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
    layoutBuilder[xaxisKey] = {
      side: 'top',
      type: 'log',
      range: [Math.log10(range[0]), Math.log10(range[1])],
      domain: domain,
    };
  } else {
    // Pengaturan untuk skala linear
    layoutBuilder[xaxisKey] = {
      side: 'top',
      range: range,
      domain: domain,
    };
  }

  return { data: dataBuilder, layout: layoutBuilder };
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
    layoutBuilder[xaxisKey] = {
      side: 'top',
      range: range,
      domain: domain,
    };
  }

  return { data: dataBuilder, layout: layoutBuilder };
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
  layoutBuilder[`xaxis${nSeq}`] = {
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
  layoutBuilder[overlayXaxisId] = {
    side: 'top',
    range: range2,
    overlaying: `x${nSeq}`, // <-- Kunci untuk menumpuk sumbu ini di atas sumbu utama
  };

  // Kembalikan semua hasil yang telah diperbarui
  return { data: dataBuilder, layout: layoutBuilder, counter: currentCounter };
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

  // --- 3. Proses dan Plot Area Arsiran ---
  const processAndPlotFill = (conditionKey: 'red' | 'blue', fillColor: string) => {
    currentCounter++;
    const fillAxisId = `x${nPlots + currentCounter}`;
    
    // Pelabelan
    const labeledData = dfWell.map(row => {
      let label = 0;
      if (conditionKey === 'red') {
        if (key === 'RT_RGSA') label = row[col1Name] > row[col2Name] ? 1 : 0;
        else label = row[col1Name] < row[col2Name] ? 1 : 0;
      } else { // blue condition
        if (key === 'RT_RGSA') label = row[col1Name] < row[col2Name] ? 1 : 0;
        else label = row[col1Name] > row[col2Name] ? 1 : 0;
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
    layoutBuilder[fillAxisId] = {
      visible: false, overlaying: `x${nSeq}`,
      range: logScale ? [Math.log10(fillRange[0]), Math.log10(fillRange[1])] : fillRange
    };
  };

  processAndPlotFill('red', fillColorRed);
  processAndPlotFill('blue', fillColorBlue);

  // --- 4. Atur Layout untuk Sumbu yang Terlihat ---
  const range1 = rangeCol[key as keyof typeof rangeCol][0];
  const range2 = rangeCol[key as keyof typeof rangeCol][1];

  layoutBuilder[`xaxis${nSeq}`] = {
    side: 'top', domain: domain,
    type: logScale ? 'log' : 'linear',
    range: logScale ? [Math.log10(range1[0]), Math.log10(range1[1])] : range1
  };
  layoutBuilder[overlayAxis2Id] = {
    side: 'top', overlaying: `x${nSeq}`,
    type: logScale ? 'log' : 'linear',
    range: logScale ? [Math.log10(range2[0]), Math.log10(range2[1])] : range2
  };
  
  return { data: dataBuilder, layout: layoutBuilder, counter: currentCounter };
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

  const dataBuilder = [...existingData];
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
  layoutBuilder[`xaxis${nSeq}`] = {
    side: 'top',
    domain: domain,
    type: logScale ? 'log' : 'linear',
    range: logScale ? [Math.log10(range1[0]), Math.log10(range1[1])] : range1
  };
  
  // Layout untuk sumbu-x kedua (overlay)
  if (range2) {
    layoutBuilder[overlayXaxisId] = {
      side: 'top',
      overlaying: `x${nSeq}`,
      type: logScale ? 'log' : 'linear',
      range: logScale ? [Math.log10(range2[0]), Math.log10(range2[1])] : range2
    };
  }

  return { data: dataBuilder, layout: layoutBuilder, counter: currentCounter };
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

  let dataBuilder = [...existingData];
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
  layoutBuilder[`xaxis${nSeq}`] = {
    side: 'top', domain: domain,
    type: logScale ? 'log' : 'linear',
    range: logScale ? [Math.log10(range1[0]), Math.log10(range1[1])] : range1
  };
  
  // Layout untuk sumbu-x kedua (overlay)
  if (range2) {
    layoutBuilder[overlayAxis2Id] = {
      side: 'top', overlaying: `x${nSeq}`,
      type: logScale ? 'log' : 'linear',
      range: logScale ? [Math.log10(range2[0]), Math.log10(range2[1])] : range2
    };
  }

  // Layout untuk sumbu-x ketiga (overlay)
  if (range3) {
    layoutBuilder[overlayAxis3Id] = {
      side: 'top', overlaying: `x${nSeq}`,
      type: logScale ? 'log' : 'linear',
      range: logScale ? [Math.log10(range3[0]), Math.log10(range3[1])] : range3
    };
  }

  return { data: dataBuilder, layout: layoutBuilder, counter: currentCounter };
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

  let dataBuilder = [...existingData];
  let layoutBuilder = { ...existingLayout };
  
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
        overlaying: `x${nSeq}`,
      };
    }

    // Terapkan skala logaritmik jika diperlukan
    if (logScale) {
      axisConfig.type = 'log';
      axisConfig.range = [Math.log10(range[0]), Math.log10(range[1])];
    } else {
      axisConfig.range = range;
    }
    
    layoutBuilder[xaxisId] = axisConfig;
  }

  // Update counter dengan jumlah sumbu overlay yang ditambahkan (3)
  const finalCounter = counter + 3;

  return { data: dataBuilder, layout: layoutBuilder, counter: finalCounter };
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

  let dataBuilder = [...existingData];
  let layoutBuilder = { ...existingLayout };
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
  layoutBuilder[mainXaxisId] = {
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

  layoutBuilder[emptyOverlayId] = {
    overlaying: mainXaxisId, side: 'top', type: 'log',
    range: [Math.log10(range[0]), Math.log10(range[1])],
  };

  return { data: dataBuilder, layout: layoutBuilder, counter: currentCounter };
}