import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { FileData } from '../features/file_upload/types'; // Adjust path based on your project structure

const DB_NAME = 'file-storage-db';
const STORE_NAME = 'uploaded-files';
const DB_VERSION = 1;

interface FileDB extends DBSchema {
    [STORE_NAME]: {
        key: string;
        value: FileData;
    };
}

let dbPromise: Promise<IDBPDatabase<FileDB>> | null = null;

const initDB = () => {
    if (dbPromise) {
        return dbPromise;
    }
    dbPromise = openDB<FileDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                // The 'id' property of our FileData object will be the key.
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        },
    });
    return dbPromise;
};

export const addMultipleFiles = async (files: FileData[]) => {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await Promise.all([
        ...files.map(file => tx.store.put(file)),
        tx.done,
    ]);
};

export const getAllFiles = async (): Promise<FileData[]> => {
    const db = await initDB();
    const allFiles = await db.getAll(STORE_NAME);
    // Sort files for consistent display order
    return allFiles.sort((a, b) => a.name.localeCompare(b.name));
};

export const deleteFile = async (id: string) => {
    const db = await initDB();
    await db.delete(STORE_NAME, id);
};

export const clearAllFiles = async () => {
    const db = await initDB();
    await db.clear(STORE_NAME);
    console.log('IndexedDB store has been cleared.');
};