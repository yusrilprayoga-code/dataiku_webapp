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
interface FileDB extends DBSchema {
    [STORE_UPLOADS]: { key: string; value: FileData; };
    [STORE_LOGS]: { key: string; value: ProcessedFileDataForDisplay; indexes: { 'by-well': string }; };
    [STORE_PROCESSED]: { key: string; value: ProcessedWell; };
    [STORE_WELL_SETS]: {
        key: string; // Using setName as the key
        value: WellDataSet;
        indexes: { 'by-well': string[] }; // Index on wells array
    };
    [STORE_PLOTS]: {
        key: string;
        value: SavedPlot;
        indexes: { 'by-well': string[] }; // Updated to match new schema
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
            // Version 4 adds the initial well sets stores
            if (oldVersion < 4) {
                if (!db.objectStoreNames.contains(STORE_WELL_SETS)) {
                    db.createObjectStore(STORE_WELL_SETS, { keyPath: ['wellName', 'setName'] });
                }
                if (!db.objectStoreNames.contains(STORE_PLOTS)) {
                    const plotStore = db.createObjectStore(STORE_PLOTS, { keyPath: 'id' });
                    plotStore.createIndex('by-well', 'wellName');
                }
            }

            // Version 5 updates the schema for multi-well support
            if (oldVersion < 5) {
                if (db.objectStoreNames.contains(STORE_WELL_SETS)) {
                    db.deleteObjectStore(STORE_WELL_SETS);
                }
                const wellSetsStore = db.createObjectStore(STORE_WELL_SETS, { keyPath: 'setName' });
                wellSetsStore.createIndex('by-well', 'wells', { multiEntry: true });
            }
        },
    });
    return dbPromise;
};

// --- CRUD for Well Data Sets ---

/**
 * Creates or updates a set of log data.
 * @param setName - The name of the set
 * @param logs - Array of LogCurve objects from one or more wells
 * @param options - Additional set options (markers, selected logs)
 */
export const saveWellDataSet = async (
    setName: string,
    logs: LogCurve[],
    options?: {
        markers?: WellDataSet['markers'];
        selectedLogs?: string[];
    }
): Promise<void> => {
    const db = await initDB();

    // Get unique well names from logs
    const wells = [...new Set(logs.map(log => log.wellName))];

    const dataSet: WellDataSet = {
        setName,
        wells,
        logs,
        createdAt: new Date(),
        ...(options?.markers && { markers: options.markers }),
        ...(options?.selectedLogs && { selectedLogs: options.selectedLogs })
    };

    await db.put(STORE_WELL_SETS, dataSet);
};

/**
 * Adds logs to an existing set or creates a new one
 * @param setName - The name of the set
 * @param newLogs - Logs to add to the set
 */
export const addLogsToSet = async (setName: string, newLogs: LogCurve[]): Promise<void> => {
    const db = await initDB();
    const existingSet = await db.get(STORE_WELL_SETS, setName);

    if (existingSet) {
        // Combine existing and new logs, update wells list
        const allLogs = [...existingSet.logs, ...newLogs];
        const wells = [...new Set([...existingSet.wells, ...newLogs.map(log => log.wellName)])];

        await db.put(STORE_WELL_SETS, {
            ...existingSet,
            wells,
            logs: allLogs
        });
    } else {
        // Create new set if it doesn't exist
        await saveWellDataSet(setName, newLogs);
    }
};

/**
 * Gets all sets that include data from a specific well
 * @param wellName - The name of the well
 * @returns Array of WellDataSet objects
 */
export const getSetsForWell = async (wellName: string): Promise<WellDataSet[]> => {
    const db = await initDB();
    return db.getAllFromIndex(STORE_WELL_SETS, 'by-well', [wellName]);
};

/**
 * Gets a specific set by name
 * @param setName - The name of the set
 */
export const getWellDataSet = async (setName: string): Promise<WellDataSet | undefined> => {
    const db = await initDB();
    return db.get(STORE_WELL_SETS, setName);
};

/**
 * Updates the selected logs for a set
 * @param setName - The name of the set
 * @param selectedLogs - Array of selected log names
 */
export const updateSetSelectedLogs = async (setName: string, selectedLogs: string[]): Promise<void> => {
    const db = await initDB();
    const existingSet = await db.get(STORE_WELL_SETS, setName);
    if (existingSet) {
        await db.put(STORE_WELL_SETS, {
            ...existingSet,
            selectedLogs
        });
    }
};

/**
 * Deletes a set by name
 * @param setName - The name of the set to delete
 */
export const deleteWellDataSet = async (setName: string): Promise<void> => {
    const db = await initDB();
    await db.delete(STORE_WELL_SETS, setName);
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
    return db.getAllFromIndex(STORE_PLOTS, 'by-well', [wellName]);
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