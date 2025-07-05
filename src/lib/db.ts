// /src/lib/db.ts

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { nanoid } from 'nanoid';
import { FileData, ProcessedFileDataForDisplay } from '../features/file_upload/types';

const DB_NAME = 'file-storage-db';
const STORE_UPLOADS = 'uploaded-files';
const STORE_LOGS = 'well-logs';
const STORE_PROCESSED = 'processed-wells';
const STORE_WELL_SETS = 'well-data-sets';
const STORE_PLOTS = 'saved-plots';

const DB_VERSION = 4;

// Structure for a single log
export interface LogCurve {
    curveName: string;
    unit: string;
    data: [number, number | null][];
}

// Structure for a single "Set" of data.
export interface WellDataSet {
    wellName: string;
    setName: string;
    logs: LogCurve[];
    createdAt: Date;
}

// Structure for a saved Plotly chart configuration.
export interface SavedPlot {
    id: string;
    plotName: string; // User-friendly like "Porosity Crossplot"
    wellName: string; // The well this plot is associated with
    plotJSON: object; // The Plotly figure object (as JSON)
    createdAt: Date;
}

// An interface for the legacy processed well store
interface ProcessedWell {
    wellName: string;
    csvContent: string;
}

// UPDATED: Define the complete database schema.
interface FileDB extends DBSchema {
    [STORE_UPLOADS]: { key: string; value: FileData; };
    [STORE_LOGS]: { key: string; value: ProcessedFileDataForDisplay; indexes: { 'by-well': string }; };
    [STORE_PROCESSED]: { key: string; value: ProcessedWell; };
    // NEW: Add the well data sets store.
    [STORE_WELL_SETS]: {
        key: [string, string]; // Composite key: [wellName, setName]
        value: WellDataSet;
    };
    // NEW: Add the saved plots store.
    [STORE_PLOTS]: {
        key: string;
        value: SavedPlot;
        indexes: { 'by-well': string };
    };
}

let dbPromise: Promise<IDBPDatabase<FileDB>> | null = null;

const initDB = () => {
    if (dbPromise) return dbPromise;
    dbPromise = openDB<FileDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
            // Keep old migrations for users who are on older versions
            if (oldVersion < 2) {
                if (!db.objectStoreNames.contains(STORE_UPLOADS)) {
                    db.createObjectStore(STORE_UPLOADS, { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains(STORE_LOGS)) {
                    const logStore = db.createObjectStore(STORE_LOGS, { keyPath: 'id' });
                    logStore.createIndex('by-well', 'structurePath');
                }
            }
            if (oldVersion < 3) {
                if (!db.objectStoreNames.contains(STORE_PROCESSED)) {
                    db.createObjectStore(STORE_PROCESSED, { keyPath: 'wellName' });
                }
            }
            // NEW: Our migration to version 4 adds the new stores.
            if (oldVersion < 4) {
                if (!db.objectStoreNames.contains(STORE_WELL_SETS)) {
                    // Using a composite key is highly efficient for fetching a specific set.
                    db.createObjectStore(STORE_WELL_SETS, { keyPath: ['wellName', 'setName'] });
                }
                if (!db.objectStoreNames.contains(STORE_PLOTS)) {
                    const plotStore = db.createObjectStore(STORE_PLOTS, { keyPath: 'id' });
                    // Indexing by wellName allows to quickly find all plots for a well.
                    plotStore.createIndex('by-well', 'wellName');
                }
            }
        },
    });
    return dbPromise;
};

// --- CRUD for Well Data Sets ---

/**
 * Saves or updates a complete set of log data for a well.
 * @param wellName - The name of the well.
 * @param setName - The name of the set (e.g., 'RAW_DATA', 'NORMALIZED_GR').
 * @param logs - An array of LogCurve objects.
 */
export const saveWellDataSet = async (wellName: string, setName: string, logs: LogCurve[]): Promise<void> => {
    const db = await initDB();
    const dataSet: WellDataSet = {
        wellName,
        setName,
        logs,
        createdAt: new Date(),
    };
    await db.put(STORE_WELL_SETS, dataSet);
};

/**
 * Retrieves a specific data set for a given well.
 * @param wellName - The name of the well.
 * @param setName - The name of the set.
 * @returns The WellDataSet object or undefined if not found.
 */
export const getWellDataSet = async (wellName: string, setName: string): Promise<WellDataSet | undefined> => {
    const db = await initDB();
    return db.get(STORE_WELL_SETS, [wellName, setName]);
};

/**
 * Gets all set names available for a specific well.
 * @param wellName - The name of the well.
 * @returns A string array of set names.
 */
export const getSetNamesForWell = async (wellName: string): Promise<string[]> => {
    const db = await initDB();
    // Use a key range to efficiently query by the first part of the composite key.
    const range = IDBKeyRange.bound([wellName, ''], [wellName, '\uffff']);
    const keys = await db.getAllKeys(STORE_WELL_SETS, range);
    return keys.map(key => key[1]); // Return only the setName part of the key
};

/**
 * Deletes a specific data set from a well.
 * @param wellName - The name of the well.
 * @param setName - The name of the set to delete.
 */
export const deleteWellDataSet = async (wellName: string, setName: string): Promise<void> => {
    const db = await initDB();
    await db.delete(STORE_WELL_SETS, [wellName, setName]);
};


// --- CRUD for Saved Plots (Plotly JSON) ---

/**
 * Saves or updates a Plotly chart configuration.
 * If plotData.id is provided, it updates; otherwise, it creates a new record with a new ID.
 * @param plotData - An object containing plot details.
 * @returns The final ID of the saved plot.
 */
export const savePlot = async (plotData: Omit<SavedPlot, 'id' | 'createdAt'> & { id?: string }): Promise<string> => {
    const db = await initDB();
    const id = plotData.id || nanoid();
    const record: SavedPlot = {
        ...plotData,
        id,
        createdAt: new Date(),
    };
    await db.put(STORE_PLOTS, record);
    return id;
};

/**
 * Retrieves all saved plots for a specific well.
 * @param wellName - The name of the well.
 * @returns An array of SavedPlot objects.
 */
export const getPlotsForWell = async (wellName: string): Promise<SavedPlot[]> => {
    const db = await initDB();
    return db.getAllFromIndex(STORE_PLOTS, 'by-well', wellName);
};

/**
 * Retrieves a single plot by its unique ID.
 * @param id - The unique ID of the plot.
 * @returns The SavedPlot object or undefined if not found.
 */
export const getPlot = async (id: string): Promise<SavedPlot | undefined> => {
    const db = await initDB();
    return db.get(STORE_PLOTS, id);
};

/**
 * Deletes a plot by its unique ID.
 * @param id - The unique ID of the plot to delete.
 */
export const deletePlot = async (id: string): Promise<void> => {
    const db = await initDB();
    await db.delete(STORE_PLOTS, id);
};

export const saveProcessedWell = async (wellName: string, csvContent: string) => {
    const db = await initDB();
    await db.put(STORE_PROCESSED, { wellName, csvContent });
};

export const getProcessedWellList = async (): Promise<string[]> => {
    const db = await initDB();
    const keys = await db.getAllKeys(STORE_PROCESSED);
    return keys.sort();
};

export const getProcessedWellData = async (wellName: string): Promise<string | undefined> => {
    const db = await initDB();
    const record = await db.get(STORE_PROCESSED, wellName);
    return record?.csvContent;
};

// This function for the original uploads remains the same
export const addMultipleFiles = async (files: FileData[]) => {
    const db = await initDB();
    const tx = db.transaction(STORE_UPLOADS, 'readwrite');
    await Promise.all([
        ...files.map(file => tx.store.put(file)),
        tx.done,
    ]);
};


export const addWellLogs = async (logs: ProcessedFileDataForDisplay[]) => {
    const db = await initDB();
    const tx = db.transaction(STORE_LOGS, 'readwrite');
    await Promise.all([
        ...logs.map(log => tx.store.put(log)),
        tx.done,
    ]);
    console.log(`Saved ${logs.length} individual well logs to IndexedDB.`);
};

export const getWellList = async (): Promise<string[]> => {
    const db = await initDB();
    const allLogs = await db.getAll(STORE_LOGS);
    const wellNames = new Set<string>();

    allLogs.forEach(log => {
        if (log.structurePath && log.structurePath !== log.name) {
            wellNames.add(log.structurePath);
        } else if (log.originalName?.toLowerCase().endsWith('.las')) {
            wellNames.add(log.originalName.replace(/\.las$/i, ''));
        }
    });

    return Array.from(wellNames).sort();
};

export const getAllWellLogs = async (): Promise<ProcessedFileDataForDisplay[]> => {
    const db = await initDB();
    return db.getAll(STORE_LOGS);
};

export const getAllFiles = async (): Promise<FileData[]> => {
    const db = await initDB();
    const allFiles = await db.getAll(STORE_UPLOADS);
    return allFiles.sort((a, b) => a.name.localeCompare(b.name));
};

export const deleteFile = async (id: string) => {
    const db = await initDB();
    await db.delete(STORE_UPLOADS, id);
};

export const clearAllFiles = async () => {
    const db = await initDB();
    // Now clears BOTH stores
    await db.clear(STORE_UPLOADS);
    await db.clear(STORE_LOGS);
    console.log('All IndexedDB stores have been cleared.');
};