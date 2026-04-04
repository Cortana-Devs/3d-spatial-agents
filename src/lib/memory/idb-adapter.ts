import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { MemoryObject } from './types';
import type { ConversationRecord } from './conversationTypes';
import type { KnowledgeFact } from './KnowledgeGraph';

interface MemoryDB extends DBSchema {
    memories: {
        key: string;
        value: MemoryObject;
        indexes: { 'by-timestamp': number; 'by-agent-ts': [string, number] };
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
    /** Semantic knowledge graph — Phase 2 */
    'knowledge-facts': {
        key: string;
        value: KnowledgeFact;
        indexes: { 'by-agent': string };
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
            this.dbPromise = openDB<MemoryDB>(DB_NAME, 4, {  // v4: compound index for per-agent queries
                upgrade(db, oldVersion) {
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                        store.createIndex('by-timestamp', 'timestamp');
                        store.createIndex('by-agent-ts', ['agentId', 'timestamp']);
                    } else if (oldVersion < 4) {
                        // Add the compound index to existing store
                        const tx = (db as any)._tx; // idb library exposes raw tx via upgrade
                        try {
                            const store = tx.objectStore(STORE_NAME);
                            if (!store.indexNames.contains('by-agent-ts')) {
                                store.createIndex('by-agent-ts', ['agentId', 'timestamp']);
                            }
                        } catch { /* index may already exist on parallel upgrades */ }
                    }
                    if (!db.objectStoreNames.contains(CONV_STORE)) {
                        const conv = db.createObjectStore(CONV_STORE, { keyPath: 'id' });
                        conv.createIndex('by-listener-agent', 'listenerAgentId');
                    }
                    if (!db.objectStoreNames.contains(EXPLORER_STORE)) {
                        db.createObjectStore(EXPLORER_STORE, { keyPath: 'agentId' });
                    }
                    // v3 — semantic knowledge graph
                    if (!db.objectStoreNames.contains('knowledge-facts')) {
                        const kgStore = db.createObjectStore('knowledge-facts', { keyPath: 'id' });
                        kgStore.createIndex('by-agent', 'agentId');
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

    // ── Knowledge Graph (Phase 2) ───────────────────────────────────────────

    async putKnowledgeFact(fact: KnowledgeFact): Promise<void> {
        const db = this.getDb();
        if (!db) return;
        await (await db).put('knowledge-facts', fact);
    }

    async getKnowledgeFacts(agentId: string): Promise<KnowledgeFact[]> {
        const db = this.getDb();
        if (!db) return [];
        const tx = (await db).transaction('knowledge-facts', 'readonly');
        return tx.store.index('by-agent').getAll(agentId);
    }

    async deleteKnowledgeFacts(ids: string[]): Promise<void> {
        const db = this.getDb();
        if (!db) return;
        const tx = (await db).transaction('knowledge-facts', 'readwrite');
        const store = tx.objectStore('knowledge-facts');
        await Promise.all(ids.map((id) => store.delete(id)));
        await tx.done;
    }

    /** Bulk-insert/update multiple memories in a single IDB transaction. */
    async putMemoryBatch(mems: MemoryObject[]): Promise<void> {
        if (mems.length === 0) return;
        const db = this.getDb();
        if (!db) return;
        const tx = (await db).transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        await Promise.all(mems.map((m) => store.put(m)));
        await tx.done;
    }

    /** Bulk-insert/update multiple knowledge facts in a single IDB transaction. */
    async putKnowledgeFactsBatch(facts: KnowledgeFact[]): Promise<void> {
        if (facts.length === 0) return;
        const db = this.getDb();
        if (!db) return;
        const tx = (await db).transaction('knowledge-facts', 'readwrite');
        const store = tx.objectStore('knowledge-facts');
        await Promise.all(facts.map((f) => store.put(f)));
        await tx.done;
    }

    /**
     * Get memories for a specific agent, sorted by timestamp, limited to `limit`.
     * Uses the compound index 'by-agent-ts' for O(log n) lookup.
     * Falls back to getAll() if the index isn't available yet (upgrade path).
     */
    async getByAgent(agentId: string, limit: number = 200): Promise<MemoryObject[]> {
        const db = this.getDb();
        if (!db) return [];
        try {
            const resolved = await db;
            const tx = resolved.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            if (!store.indexNames.contains('by-agent-ts')) {
                // Index not yet available after v3→v4 upgrade; fall back
                const all = await resolved.getAllFromIndex(STORE_NAME, 'by-timestamp');
                return all.filter((m) => !m.agentId || m.agentId === agentId).slice(-limit);
            }
            const idx = store.index('by-agent-ts');
            const range = IDBKeyRange.bound([agentId, 0], [agentId, Infinity]);
            const results: MemoryObject[] = [];
            let cursor = await idx.openCursor(range, 'prevunique');
            while (cursor && results.length < limit) {
                results.push(cursor.value);
                cursor = await cursor.continue();
            }
            return results.reverse(); // oldest-first
        } catch {
            return [];
        }
    }
}

export const memoryStorage = new IDBAdapter();
