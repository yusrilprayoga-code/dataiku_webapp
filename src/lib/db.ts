/* eslint-disable */
// /src/lib/db.ts

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { nanoid } from 'nanoid';
import { FileData } from '../features/file_upload/types';

const DB_NAME = 'file-storage-db';
const STORE_UPLOADS = 'uploaded-files';
const STORE_LOGS = 'well-logs';
const STORE_PROCESSED = 'processed-wells';
const STORE_WELL_SETS = 'well-data-sets';
const STORE_PLOTS = 'saved-plots';

const DB_VERSION = 5;

// Structure for a single log
export interface LogCurve {
    curveName: string;
    data: [number, number | null][];
    wellName: string; // Added to track which well this log belongs to
    plotData?: any; // Store the complete Plotly trace data
}

// Structure for a set of correlated data from multiple wells
export interface WellDataSet {
    setName: string;
    wells: string[]; // List of wells included in this set
    logs: LogCurve[];
    createdAt: Date;
    displayedLogs?: string[]; // Track which logs are currently displayed
    lastModified?: Date; // Track when the set was last modified
    markers?: { // Optional markers for visualization
        [key: string]: {
            x: number;
            y: number;
            text: string;
            wellName: string;
        }[];
    };
    selectedLogs?: string[]; // Track which logs are currently selected for display
}

// Structure for a saved Plotly chart configuration.
export interface SavedPlot {
    id: string;
    plotName: string;
    wellNames: string[]; // Changed to support multiple wells
    plotJSON: object;
    createdAt: Date;
}

// An interface for the legacy processed well store
interface ProcessedWell {
    wellName: string;
    csvContent: string;
}

// UPDATED: Define the complete database schema.
// interface FileDB extends DBSchema {
//     [STORE_UPLOADS]: { key: string; value: FileData; };
//     [STORE_LOGS]: { key: string; value: ProcessedFileDataForDisplay; indexes: { 'by-well': string }; };
//     [STORE_PROCESSED]: { key: string; value: ProcessedWell; };
//     [STORE_WELL_SETS]: {
//         key: string; // Using setName as the key
//         value: WellDataSet;
//         indexes: { 'by-well': string[] }; // Index on wells array
//     };
//     [STORE_PLOTS]: {
//         key: string;
//         value: SavedPlot;
//         indexes: { 'by-well': string[] }; // Updated to match new schema
//     };
// }

// let dbPromise: Promise<IDBPDatabase<FileDB>> | null = null;

// const initDB = () => {
//     if (dbPromise) return dbPromise;
//     dbPromise = openDB<FileDB>(DB_NAME, DB_VERSION, {
//         upgrade(db, oldVersion) {
//             // Keep old migrations for users who are on older versions
//             if (oldVersion < 2) {
//                 if (!db.objectStoreNames.contains(STORE_UPLOADS)) {
//                     db.createObjectStore(STORE_UPLOADS, { keyPath: 'id' });
//                 }
//                 if (!db.objectStoreNames.contains(STORE_LOGS)) {
//                     const logStore = db.createObjectStore(STORE_LOGS, { keyPath: 'id' });
//                     logStore.createIndex('by-well', 'structurePath');
//                 }
//             }
//             if (oldVersion < 3) {
//                 if (!db.objectStoreNames.contains(STORE_PROCESSED)) {
//                     db.createObjectStore(STORE_PROCESSED, { keyPath: 'wellName' });
//                 }
//             }
//             // Version 4 adds the initial well sets stores
//             if (oldVersion < 4) {
//                 if (!db.objectStoreNames.contains(STORE_WELL_SETS)) {
//                     db.createObjectStore(STORE_WELL_SETS, { keyPath: ['wellName', 'setName'] });
//                 }
//                 if (!db.objectStoreNames.contains(STORE_PLOTS)) {
//                     const plotStore = db.createObjectStore(STORE_PLOTS, { keyPath: 'id' });
//                     plotStore.createIndex('by-well', 'wellName');
//                 }
//             }

//             // Version 5 updates the schema for multi-well support
//             if (oldVersion < 5) {
//                 // Recreate the store with proper indexing
//                 if (db.objectStoreNames.contains(STORE_WELL_SETS)) {
//                     db.deleteObjectStore(STORE_WELL_SETS);
//                 }
//                 const wellSetsStore = db.createObjectStore(STORE_WELL_SETS, { keyPath: 'setName' });
//                 // Create an index that will match individual well names from the wells array
//                 wellSetsStore.createIndex('by-well', 'wells', { multiEntry: true });
//             }
//         },
//     });
//     return dbPromise;
// };

// --- CRUD for Well Data Sets ---

/**
 * Creates or updates a set of log data.
 * @param setName - The name of the set
 * @param logs - Array of LogCurve objects from one or more wells
 * @param options - Additional set options (markers, selected logs)
 */
// export const saveWellDataSet = async (
//     setName: string,
//     logs: LogCurve[],
//     options?: {
//         markers?: WellDataSet['markers'];
//         selectedLogs?: string[];
//     }
// ): Promise<void> => {
//     const db = await initDB();

//     try {
//         // Get unique well names from logs
//         const wells = [...new Set(logs.map(log => log.wellName))];
//         console.log('Saving set with wells:', wells);

//         const dataSet: WellDataSet = {
//             setName,
//             wells,
//             logs,
//             createdAt: new Date(),
//             lastModified: new Date(),
//             ...(options?.markers && { markers: options.markers }),
//             ...(options?.selectedLogs && { selectedLogs: options.selectedLogs }),
//             displayedLogs: logs.map(log => log.curveName)
//         };

//         console.log('Saving dataset:', dataSet);
//         await db.put(STORE_WELL_SETS, dataSet);

//         // Verify the save
//         const saved = await db.get(STORE_WELL_SETS, setName);
//         console.log('Verified saved set:', saved);
//     } catch (error) {
//         console.error('Error saving well data set:', error);
//         throw error;
//     }
// };

// /**
//  * Adds logs to an existing set or creates a new one
//  * @param setName - The name of the set
//  * @param newLogs - Logs to add to the set
//  */
// export const addLogsToSet = async (setName: string, newLogs: LogCurve[]): Promise<void> => {
//     const db = await initDB();
//     const existingSet = await db.get(STORE_WELL_SETS, setName);

//     if (existingSet) {
//         // Combine existing and new logs, update wells list
//         const allLogs = [...existingSet.logs, ...newLogs];
//         const wells = [...new Set([...existingSet.wells, ...newLogs.map(log => log.wellName)])];

//         // Keep track of newly added logs as displayed
//         const displayedLogs = [...(existingSet.displayedLogs || []), ...newLogs.map(log => log.curveName)];

//         await db.put(STORE_WELL_SETS, {
//             ...existingSet,
//             wells,
//             logs: allLogs,
//             displayedLogs,
//             lastModified: new Date()
//         });
//     } else {
//         // Create new set if it doesn't exist
//         await saveWellDataSet(setName, newLogs);
//     }
// };

// /**
//  * Gets all sets that include data from a specific well
//  * @param wellName - The name of the well
//  * @returns Array of WellDataSet objects
//  */
// export const getSetsForWell = async (wellName: string): Promise<WellDataSet[]> => {
//     const db = await initDB();
//     try {
//         // First try to get all sets
//         const allSets = await db.getAll(STORE_WELL_SETS);
//         console.log('All sets in DB:', allSets);

//         // Then filter for the ones that include this well
//         const setsForWell = allSets.filter(set =>
//             set.wells.includes(wellName)
//         );
//         console.log(`Sets found for well ${wellName}:`, setsForWell);

//         return setsForWell;
//     } catch (error) {
//         console.error('Error getting sets for well:', error);
//         return [];
//     }
// };

// /**
//  * Gets a specific set by name
//  * @param setName - The name of the set
//  */
// export const getWellDataSet = async (setName: string): Promise<WellDataSet | undefined> => {
//     const db = await initDB();
//     return db.get(STORE_WELL_SETS, setName);
// };

// /**
//  * Gets all logs from a specific well within a set
//  * @param setName - The name of the set
//  * @param wellName - The name of the well
//  * @returns Array of LogCurve objects for the specified well
//  */
// export const getWellLogsFromSet = async (setName: string, wellName: string): Promise<LogCurve[]> => {
//     const db = await initDB();
//     const set = await db.get(STORE_WELL_SETS, setName);

//     if (!set) return [];

//     return set.logs.filter(log => log.wellName === wellName);
// };

// /**
//  * Updates the selected logs for a set
//  * @param setName - The name of the set
//  * @param selectedLogs - Array of selected log names
//  */
// export const updateSetDisplayedLogs = async (setName: string, displayedLogs: string[]): Promise<void> => {
//     const db = await initDB();
//     const existingSet = await db.get(STORE_WELL_SETS, setName);
//     if (existingSet) {
//         await db.put(STORE_WELL_SETS, {
//             ...existingSet,
//             displayedLogs,
//             lastModified: new Date()
//         });
//     }
// };

// export const updateSetSelectedLogs = async (setName: string, selectedLogs: string[]): Promise<void> => {
//     const db = await initDB();
//     const existingSet = await db.get(STORE_WELL_SETS, setName);
//     if (existingSet) {
//         await db.put(STORE_WELL_SETS, {
//             ...existingSet,
//             selectedLogs,
//             lastModified: new Date()
//         });
//     }
// };

// /**
//  * Deletes a set by name
//  * @param setName - The name of the set to delete
//  */
// /**
//  * Removes specific logs from a set
//  * @param setName - The name of the set
//  * @param logNames - Array of log names to remove
//  * @param wellName - Optional well name to ensure we remove the correct logs
//  */
// export const removeLogsFromSet = async (
//     setName: string,
//     logNames: string[],
//     wellName?: string
// ): Promise<void> => {
//     const db = await initDB();
//     const existingSet = await db.get(STORE_WELL_SETS, setName);

//     if (existingSet) {
//         // Filter out the logs to remove
//         const filteredLogs = existingSet.logs.filter(log => {
//             if (wellName) {
//                 return !(logNames.includes(log.curveName) && log.wellName === wellName);
//             }
//             return !logNames.includes(log.curveName);
//         });

//         // Update wells list based on remaining logs
//         const remainingWells = [...new Set(filteredLogs.map(log => log.wellName))];

//         // Update displayed logs
//         const displayedLogs = (existingSet.displayedLogs || [])
//             .filter(logName => !logNames.includes(logName));

//         // Update selected logs
//         const selectedLogs = (existingSet.selectedLogs || [])
//             .filter(logName => !logNames.includes(logName));

//         // If there are still logs in the set, update it
//         if (filteredLogs.length > 0) {
//             await db.put(STORE_WELL_SETS, {
//                 ...existingSet,
//                 logs: filteredLogs,
//                 wells: remainingWells,
//                 displayedLogs,
//                 selectedLogs,
//                 lastModified: new Date()
//             });
//         } else {
//             // If no logs remain, delete the entire set
//             await db.delete(STORE_WELL_SETS, setName);
//         }
//     }
// };

// export const deleteWellDataSet = async (setName: string): Promise<void> => {
//     const db = await initDB();
//     await db.delete(STORE_WELL_SETS, setName);
// };


// // --- CRUD for Saved Plots (Plotly JSON) ---

// /**
//  * Saves or updates a Plotly chart configuration.
//  * If plotData.id is provided, it updates; otherwise, it creates a new record with a new ID.
//  * @param plotData - An object containing plot details.
//  * @returns The final ID of the saved plot.
//  */
// export const savePlot = async (plotData: Omit<SavedPlot, 'id' | 'createdAt'> & { id?: string }): Promise<string> => {
//     const db = await initDB();
//     const id = plotData.id || nanoid();
//     const record: SavedPlot = {
//         ...plotData,
//         id,
//         createdAt: new Date(),
//     };
//     await db.put(STORE_PLOTS, record);
//     return id;
// };

// /**
//  * Retrieves all saved plots for a specific well.
//  * @param wellName - The name of the well.
//  * @returns An array of SavedPlot objects.
//  */
// export const getPlotsForWell = async (wellName: string): Promise<SavedPlot[]> => {
//     const db = await initDB();
//     return db.getAllFromIndex(STORE_PLOTS, 'by-well', [wellName]);
// };

// /**
//  * Retrieves a single plot by its unique ID.
//  * @param id - The unique ID of the plot.
//  * @returns The SavedPlot object or undefined if not found.
//  */
// export const getPlot = async (id: string): Promise<SavedPlot | undefined> => {
//     const db = await initDB();
//     return db.get(STORE_PLOTS, id);
// };

// /**
//  * Deletes a plot by its unique ID.
//  * @param id - The unique ID of the plot to delete.
//  */
// export const deletePlot = async (id: string): Promise<void> => {
//     const db = await initDB();
//     await db.delete(STORE_PLOTS, id);
// };

// export const saveProcessedWell = async (wellName: string, csvContent: string) => {
//     const db = await initDB();
//     await db.put(STORE_PROCESSED, { wellName, csvContent });
// };

// export const getProcessedWellList = async (): Promise<string[]> => {
//     const db = await initDB();
//     const keys = await db.getAllKeys(STORE_PROCESSED);
//     return keys.sort();
// };

// export const getProcessedWellData = async (wellName: string): Promise<string | undefined> => {
//     const db = await initDB();
//     const record = await db.get(STORE_PROCESSED, wellName);
//     return record?.csvContent;
// };

// // This function for the original uploads remains the same
// export const addMultipleFiles = async (files: FileData[]) => {
//     const db = await initDB();
//     const tx = db.transaction(STORE_UPLOADS, 'readwrite');
//     await Promise.all([
//         ...files.map(file => tx.store.put(file)),
//         tx.done,
//     ]);
// };


// export const addWellLogs = async (logs: ProcessedFileDataForDisplay[]) => {
//     const db = await initDB();
//     const tx = db.transaction(STORE_LOGS, 'readwrite');
//     await Promise.all([
//         ...logs.map(log => tx.store.put(log)),
//         tx.done,
//     ]);
//     console.log(`Saved ${logs.length} individual well logs to IndexedDB.`);
// };

// export const getWellList = async (): Promise<string[]> => {
//     const db = await initDB();
//     const allLogs = await db.getAll(STORE_LOGS);
//     const wellNames = new Set<string>();

//     allLogs.forEach(log => {
//         if (log.structurePath && log.structurePath !== log.name) {
//             wellNames.add(log.structurePath);
//         } else if (log.originalName?.toLowerCase().endsWith('.las')) {
//             wellNames.add(log.originalName.replace(/\.las$/i, ''));
//         }
//     });

//     return Array.from(wellNames).sort();
// };

// export const getAllWellLogs = async (): Promise<ProcessedFileDataForDisplay[]> => {
//     const db = await initDB();
//     return db.getAll(STORE_LOGS);
// };

// export const getAllFiles = async (): Promise<FileData[]> => {
//     const db = await initDB();
//     const allFiles = await db.getAll(STORE_UPLOADS);
//     return allFiles.sort((a, b) => a.name.localeCompare(b.name));
// };

// export const deleteFile = async (id: string) => {
//     const db = await initDB();
//     await db.delete(STORE_UPLOADS, id);
// };

// export const clearAllFiles = async () => {
//     const db = await initDB();
//     // Now clears BOTH stores
//     await db.clear(STORE_UPLOADS);
//     await db.clear(STORE_LOGS);
//     console.log('All IndexedDB stores have been cleared.');
// };