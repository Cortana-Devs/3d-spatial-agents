import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { MemoryObject } from './types';
import type { ConversationRecord } from './conversationTypes';

interface MemoryDB extends DBSchema {
    memories: {
        key: string;
        value: MemoryObject;
        indexes: { 'by-timestamp': number };
    };
    'conversation-records': {
        key: string;
        value: ConversationRecord;
        indexes: { 'by-listener-agent': string };
    };
    'explorer-state': {
        key: string;
        value: { agentId: string; payload: string };
    };
}

const DB_NAME = 'agent-memory-db';
const STORE_NAME = 'memories';
const CONV_STORE = 'conversation-records';
const EXPLORER_STORE = 'explorer-state';

class IDBAdapter {
    private dbPromise: Promise<IDBPDatabase<MemoryDB>> | null = null;

    private getDb() {
        if (typeof window === 'undefined') return null; // Server-side guard
        if (!this.dbPromise) {
            this.dbPromise = openDB<MemoryDB>(DB_NAME, 2, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                        store.createIndex('by-timestamp', 'timestamp');
                    }
                    if (!db.objectStoreNames.contains(CONV_STORE)) {
                        const conv = db.createObjectStore(CONV_STORE, { keyPath: 'id' });
                        conv.createIndex('by-listener-agent', 'listenerAgentId');
                    }
                    if (!db.objectStoreNames.contains(EXPLORER_STORE)) {
                        db.createObjectStore(EXPLORER_STORE, { keyPath: 'agentId' });
                    }
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

    async putConversationRecord(record: ConversationRecord): Promise<void> {
        const db = this.getDb();
        if (!db) return;
        await (await db).put(CONV_STORE, record);
    }

    async getConversationRecordsForAgent(listenerAgentId: string): Promise<ConversationRecord[]> {
        const db = this.getDb();
        if (!db) return [];
        const tx = (await db).transaction(CONV_STORE, 'readonly');
        const idx = tx.store.index('by-listener-agent');
        return idx.getAll(listenerAgentId);
    }

    async getAllConversationRecords(): Promise<ConversationRecord[]> {
        const db = this.getDb();
        if (!db) return [];
        return (await db).getAll(CONV_STORE);
    }

    async putExplorerState(agentId: string, payload: string): Promise<void> {
        const db = this.getDb();
        if (!db) return;
        await (await db).put(EXPLORER_STORE, { agentId, payload });
    }

    async getExplorerState(agentId: string): Promise<string | null> {
        const db = this.getDb();
        if (!db) return null;
        const row = await (await db).get(EXPLORER_STORE, agentId);
        return row?.payload ?? null;
    }
}

export const memoryStorage = new IDBAdapter();
