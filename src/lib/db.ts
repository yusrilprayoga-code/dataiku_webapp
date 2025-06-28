// /src/lib/db.ts

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { FileData, ProcessedFileDataForDisplay } from '../features/file_upload/types'; // Adjust path

const DB_NAME = 'file-storage-db';
const STORE_UPLOADS = 'uploaded-files';
const STORE_LOGS = 'well-logs';
const DB_VERSION = 2;

// Define the shape of our database with TWO stores
interface FileDB extends DBSchema {
    [STORE_UPLOADS]: {
        key: string;
        value: FileData;
    };
    [STORE_LOGS]: {
        key: string;
        value: ProcessedFileDataForDisplay; // This store holds the processed files
        indexes: { 'by-well': string };     // Add an index for efficient lookups
    };
}

let dbPromise: Promise<IDBPDatabase<FileDB>> | null = null;

const initDB = () => {
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = openDB<FileDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
            // This runs if the DB version changes.
            if (oldVersion < 1) {
                db.createObjectStore(STORE_UPLOADS, { keyPath: 'id' });
            }
            if (oldVersion < 2) {
                // Create our new store for individual logs
                const logStore = db.createObjectStore(STORE_LOGS, { keyPath: 'id' });
                // An index on the well/structure name will be useful later
                logStore.createIndex('by-well', 'structurePath');
            }
        },
    });
    return dbPromise;
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

// --- NEW FUNCTIONS FOR THE 'well-logs' STORE ---

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