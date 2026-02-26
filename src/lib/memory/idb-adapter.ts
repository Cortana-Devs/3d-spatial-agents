import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { MemoryObject } from './types';

interface MemoryDB extends DBSchema {
    memories: {
        key: string;
        value: MemoryObject;
        indexes: { 'by-timestamp': number };
    };
}

const DB_NAME = 'agent-memory-db';
const STORE_NAME = 'memories';

class IDBAdapter {
    private dbPromise: Promise<IDBPDatabase<MemoryDB>> | null = null;

    private getDb() {
        if (typeof window === 'undefined') return null; // Server-side guard
        if (!this.dbPromise) {
            this.dbPromise = openDB<MemoryDB>(DB_NAME, 1, {
                upgrade(db) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    store.createIndex('by-timestamp', 'timestamp');
                },
            });
        }
        return this.dbPromise;
    }

    async add(memory: MemoryObject): Promise<void> {
        const db = this.getDb();
        if (!db) return; // No-op on server
        (await db).put(STORE_NAME, memory);
    }

    async getAll(): Promise<MemoryObject[]> {
        const db = this.getDb();
        if (!db) return [];
        // Get all memories sorted by timestamp
        return (await db).getAllFromIndex(STORE_NAME, 'by-timestamp');
    }

    async delete(ids: string[]): Promise<void> {
        const db = this.getDb();
        if (!db) return;
        const tx = (await db).transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        await Promise.all(ids.map(id => store.delete(id)));
        await tx.done;
    }

    async count(): Promise<number> {
        const db = this.getDb();
        if (!db) return 0;
        return (await db).count(STORE_NAME);
    }

    /** Wipes every record from the store in a single transaction. */
    async clearAll(): Promise<void> {
        const db = this.getDb();
        if (!db) return;
        const tx = (await db).transaction(STORE_NAME, 'readwrite');
        await tx.objectStore(STORE_NAME).clear();
        await tx.done;
    }

    // Efficiently get oldest N memories for pruning
    async getOldest(count: number): Promise<MemoryObject[]> {
        const db = this.getDb();
        if (!db) return [];
        const tx = (await db).transaction(STORE_NAME, 'readonly');
        const index = tx.objectStore(STORE_NAME).index('by-timestamp');

        let cursor = await index.openCursor(null, 'next'); // 'next' = ascending (oldest first)
        const results: MemoryObject[] = [];

        while (cursor && results.length < count) {
            results.push(cursor.value);
            cursor = await cursor.continue();
        }

        return results;
    }
}

export const memoryStorage = new IDBAdapter();
