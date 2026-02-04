import { MemoryObject, MemoryType, RetrievalContext, MemoryConfig } from './types';
import { memoryStorage } from './idb-adapter';
import { getGroqClient } from '../groq';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_CONFIG: MemoryConfig = {
    maxMemories: 500,
    compactionThreshold: 400
};

export class MemoryStream {
    private isCompacting = false;

    constructor(private config: MemoryConfig = DEFAULT_CONFIG) { }

    async init() {
        // Any async setup if needed, IDB open is handled in adapter lazy-load
        const count = await this.count();
        console.log(`[MemoryStream] Initialized with ${count} memories.`);
    }

    /**
     * Add a new memory to the stream.
     * Heuristic importance is calculated here to avoid LLM calls.
     */
    async add(type: MemoryType, content: string, tags: string[] = []): Promise<void> {
        const importance = this.calculateHeuristicImportance(type, tags);
        const memory: MemoryObject = {
            id: uuidv4(),
            type,
            content,
            timestamp: Date.now(),
            importance,
            tags,
            isInsight: false
        };

        await memoryStorage.add(memory);
        this.checkCompaction();
    }

    /**
     * Retrieve relevant memories based on context.
     * Uses Heuristic Scoring: (Importance * 0.7) + (Recency * 0.3)
     */
    async retrieve(context: RetrievalContext): Promise<MemoryObject[]> {
        const allMemories = await memoryStorage.getAll();
        const limit = context.limit || 10;
        const now = Date.now();

        // 1. Filter
        let candidates = allMemories;
        if (context.tags && context.tags.length > 0) {
            candidates = candidates.filter(m =>
                // If any tag matches
                context.tags!.some(t => m.tags.includes(t)) ||
                // OR if it's an "Insight" (always relevant as context)
                m.isInsight
            );
        }

        // 2. Score
        const scored = candidates.map(m => {
            const importanceScore = m.importance / 10; // 0.1 to 1.0

            // Decay: 1 hour = 0.9, 24 hours = 0.5 (approx)
            const hoursOld = (now - m.timestamp) / (1000 * 60 * 60);
            const recencyScore = 1 / (1 + (hoursOld * 0.1));

            // Weighted Total
            const finalScore = (importanceScore * 0.7) + (recencyScore * 0.3);

            return { memory: m, score: finalScore };
        });

        // 3. Sort & Slice
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, limit).map(s => s.memory);
    }

    private calculateHeuristicImportance(type: MemoryType, tags: string[]): number {
        if (type === 'DIALOGUE') return 9;
        if (type === 'ACTION') return 7;
        if (type === 'THOUGHT') return 5;
        if (type === 'OBSERVATION') {
            if (tags.some(t => t.includes('player') || t.includes('user'))) return 6;
            return 2;
        }
        return 5;
    }

    private async count(): Promise<number> {
        return memoryStorage.count();
    }

    /**
     * Checks if memory limit is reached and triggers compaction if needed.
     */
    private async checkCompaction() {
        if (this.isCompacting) return;

        const count = await this.count();
        if (count >= this.config.compactionThreshold) {
            console.log(`[MemoryStream] Compaction threshold reached (${count}/${this.config.maxMemories}). triggering reflection...`);
            this.reflect().catch(err => console.error("[MemoryStream] Reflection failed:", err));
        }
    }

    /**
     * Compaction Process:
     * 1. Get oldest 50 memories.
     * 2. Summarize them into an "Insight".
     * 3. Delete the original 50.
     * 4. Add the Insight.
     */
    async reflect() {
        this.isCompacting = true;
        try {
            const batchSize = 50;
            const oldest = await memoryStorage.getOldest(batchSize);

            if (oldest.length === 0) return;

            // Simple text block for LLM
            const textToSummarize = oldest
                .map(m => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.type}: ${m.content}`)
                .join('\n');

            const client = getGroqClient();
            const completion = await client.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are an agent's memory manager. Summarize the following events into a single, concise 'Insight' or 'Fact' that captures the key context. Ignore mundane details."
                    },
                    {
                        role: "user",
                        content: textToSummarize
                    }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.5,
                max_completion_tokens: 200,
            });

            const summary = completion.choices[0]?.message?.content?.trim();

            if (summary) {
                // Add Insight
                const insight: MemoryObject = {
                    id: uuidv4(),
                    type: 'THOUGHT',
                    content: `[REFLECTION] ${summary}`,
                    timestamp: Date.now(),
                    importance: 10, // High importance for insights
                    tags: ['insight'],
                    isInsight: true
                };
                await memoryStorage.add(insight);
                console.log(`[MemoryStream] Generated insight: "${summary.substring(0, 50)}..."`);

                // Prune old memories
                const idsToDelete = oldest.map(m => m.id);
                await memoryStorage.delete(idsToDelete);
                console.log(`[MemoryStream] Pruned ${idsToDelete.length} old memories.`);
            }

        } finally {
            this.isCompacting = false;
        }
    }
}

export const memoryStream = new MemoryStream();
