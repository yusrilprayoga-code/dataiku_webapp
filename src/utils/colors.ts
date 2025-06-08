/* eslint-disable @typescript-eslint/no-explicit-any */
// src/utils/colors.ts (VERSI FINAL LENGKAP)

/**
 * (FINAL) Menghasilkan satu warna acak, dengan opsi untuk membuatnya pastel.
 * Terjemahan dari `get_random_color`.
 */
function getRandomColor(pastelFactor = 0.5): [number, number, number] {
  const randomRGB = [Math.random(), Math.random(), Math.random()];
  const pastelRGB = randomRGB.map(x => (x + pastelFactor) / (1.0 + pastelFactor));
  return [pastelRGB[0], pastelRGB[1], pastelRGB[2]]; // Hasil dalam rentang 0-1
}

/**
 * (FINAL) Menghitung "Manhattan distance" antara dua warna dalam ruang RGB.
 * Terjemahan dari `color_distance`.
 */
function colorDistance(
  c1: [number, number, number],
  c2: [number, number, number]
): number {
  return Math.abs(c1[0] - c2[0]) + Math.abs(c1[1] - c2[1]) + Math.abs(c1[2] - c2[2]);
}

/**
 * (FINAL) Membuat warna baru yang paling berbeda dari warna yang sudah ada.
 * Terjemahan dari `generate_new_color`.
 */
export function generateNewColor(
  existingColors: Record<any, [number, number, number]>,
  pastelFactor = 0.5
): [number, number, number] {
  const existingColorValues = Object.values(existingColors);

  // Jika tidak ada warna, langsung kembalikan warna acak pertama
  if (existingColorValues.length === 0) {
    return getRandomColor(pastelFactor);
  }

  let maxDistance: number | null = null;
  let bestColor: [number, number, number] | null = null;

  // Lakukan iterasi untuk menemukan warna terbaik
  for (let i = 0; i < 100; i++) {
    const color = getRandomColor(pastelFactor);

    // Cari jarak terdekat dari warna baru ke salah satu warna yang ada
    const minDistanceToExisting = Math.min(
      ...existingColorValues.map(c => colorDistance(color, c))
    );

    if (maxDistance === null || minDistanceToExisting > maxDistance) {
      maxDistance = minDistanceToExisting;
      bestColor = color;
    }
  }
  return bestColor!;
}

/**
 * (FINAL) Mengubah nilai RGB (rentang 0-1) menjadi kode Hex.
 * Terjemahan dari `rgb_to_hex`.
 */
export function rgbToHex(rgb: [number, number, number]): string {
  if (!rgb || rgb.length !== 3) {
    return '#000000';
  }
  
  const toHex = (c: number) => {
    // Kalikan dengan 255 dan bulatkan
    const byte = Math.round(c * 255);
    // Pastikan nilai berada dalam rentang 0-255
    const clampedByte = Math.max(0, Math.min(255, byte));
    // Ubah ke hex dan pastikan memiliki 2 digit
    return clampedByte.toString(16).padStart(2, '0');
  };
  
  return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
}

/**
 * (FINAL) Membuat colorscale diskrit untuk Plotly.
 * Terjemahan dari `discrete_colorscale`.
 */
export function discreteColorscale(bvals: number[], colors: string[]): (string | number)[][] {
  if (bvals.length !== colors.length + 1) {
    console.error('Panjang `bvals` harus sama dengan panjang `colors` + 1');
    return [];
  }

  const sortedBvals = [...bvals].sort((a, b) => a - b);
  const min = sortedBvals[0];
  const max = sortedBvals[sortedBvals.length - 1];

  if (max === min) {
    return colors.map(color => [0, color]);
  }

  const nvals = sortedBvals.map(v => (v - min) / (max - min));

  const dcolorscale: (string | number)[][] = [];
  for (let k = 0; k < colors.length; k++) {
    dcolorscale.push([nvals[k], colors[k]]);
    dcolorscale.push([nvals[k + 1], colors[k]]);
  }

  return dcolorscale;
}