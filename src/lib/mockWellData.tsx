// src/lib/mockWellData.ts

// Mendefinisikan bentuk (tipe) dari satu baris data log
export interface LogDataRow {
  DEPT: number;
  GR: number | null;
  RHOB: number | null;
  NPHI: number | null;
  RT: number | null;
}

// Data sampel untuk sumur ABB-036, diekstrak dari notebook Anda
export const wellLogDataABB036: LogDataRow[] = [
  { DEPT: 1400, GR: 78, RHOB: 1.71, NPHI: 0.2, RT: 250 },
  { DEPT: 1401, GR: 79, RHOB: 1.72, NPHI: 0.21, RT: 245 },
  { DEPT: 1402, GR: 85, RHOB: 1.75, NPHI: 0.22, RT: 230 },
  { DEPT: 1403, GR: 90, RHOB: 1.80, NPHI: 0.24, RT: 220 },
  { DEPT: 1404, GR: 92, RHOB: 1.82, NPHI: 0.25, RT: 210 },
  { DEPT: 1405, GR: 88, RHOB: 1.79, NPHI: 0.23, RT: 215 },
  { DEPT: 1406, GR: 45, RHOB: 2.50, NPHI: 0.15, RT: 800 },
  { DEPT: 1407, GR: 46, RHOB: 2.51, NPHI: 0.14, RT: 810 },
  { DEPT: 1408, GR: 44, RHOB: 2.52, NPHI: 0.13, RT: 820 },
  { DEPT: 1409, GR: 47, RHOB: 2.50, NPHI: 0.15, RT: 805 },
  { DEPT: 1410, GR: 50, RHOB: 2.48, NPHI: 0.16, RT: 790 },
];