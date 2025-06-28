/* eslint-disable @typescript-eslint/no-explicit-any */
// app/your-route/utils/fileParsers.ts
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ParsedFileData } from '@/types'; // Adjust path if needed

export const parseLASFile = (fileContent: string): ParsedFileData => {
  const lines = fileContent.split('\n');
  let parsedHeaders: string[] = [];
  const parsedData: any[] = [];
  let inCurveSection = false;
  let inDataSection = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.toUpperCase().startsWith('~C')) { inCurveSection = true; continue; }
    if (inCurveSection) {
      if (trimmedLine.startsWith('~')) { inCurveSection = false; continue; }
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const mnemonicMatch = trimmedLine.match(/^([^\s.:]+)/);
        if (mnemonicMatch && mnemonicMatch[1]) parsedHeaders.push(mnemonicMatch[1]);
      }
    }
  }
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.toUpperCase().startsWith('~A')) { inDataSection = true; continue; }
    if (inDataSection) {
      if (trimmedLine.startsWith('~')) { inDataSection = false; break; }
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const values = trimmedLine.split(/\s+/).filter(v => v.trim() !== "");
        if (values.length > 0) {
          if (parsedHeaders.length === 0) parsedHeaders = values.map((_, index) => `Column ${index + 1}`);
          const row: any = {};
          const columnCount = Math.min(parsedHeaders.length, values.length);
          for (let i = 0; i < columnCount; i++) row[parsedHeaders[i]] = values[i];
          parsedData.push(row);
        }
      }
    }
  }
  return { headers: parsedHeaders, data: parsedData };
};

export const parseXLSXFileWithSheetJS = (arrayBuffer: ArrayBuffer): ParsedFileData => {
  // ... your existing parseXLSXFileWithSheetJS logic ...
  // Ensure it returns { headers: string[], data: any[] }
  try {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error('XLSX file contains no sheets.');
    const worksheet = workbook.Sheets[firstSheetName];
    const sheetDataAsArrayOfArrays: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    if (!sheetDataAsArrayOfArrays || sheetDataAsArrayOfArrays.length === 0) return { headers: [], data: [] };
    const headers: string[] = sheetDataAsArrayOfArrays[0].map(String);
    const dataRows = sheetDataAsArrayOfArrays.slice(1);
    const data: any[] = dataRows.map(rowArray => {
      const rowObject: any = {};
      headers.forEach((header, index) => {
        rowObject[header] = rowArray[index] !== undefined ? rowArray[index] : "";
      });
      return rowObject;
    });
    return { headers, data };
  } catch (error) {
    console.error("Error parsing XLSX with SheetJS:", error);
    throw error instanceof Error ? new Error(`SheetJS XLSX parsing failed: ${error.message}`) : new Error("Unknown XLSX parsing error.");
  }
};

export const parseCSVFile = (content: string): Promise<ParsedFileData> => {
  // ... your existing parseCSVFile logic ...
  // Ensure it returns Promise<{ headers: string[], data: any[] }>
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: true, skipEmptyLines: true, dynamicTyping: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.error('CSV parsing errors:', results.errors);
          reject(new Error(`CSV error: ${results.errors[0].message} (Row: ${results.errors[0].row})`));
        } else {
          resolve({ headers: results.meta.fields || [], data: results.data as any[] });
        }
      },
      error: (error: Error) => reject(new Error(`CSV parsing failed: ${error.message}`))
    });
  });
};
