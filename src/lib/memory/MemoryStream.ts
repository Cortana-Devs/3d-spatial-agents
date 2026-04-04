import {
  MemoryObject,
  MemoryType,
  MemorySource,
  RetrievalContext,
  MemoryConfig,
} from "./types";
import { memoryStorage } from "./idb-adapter";

/** Trust multiplier per provenance source — used in retrieval scoring. */
const TRUST_WEIGHT: Record<MemorySource, number> = {
  direct_observation: 1.0,
  self_action:        0.95,
  player:             0.9,
  peer:               0.8,
  reflection:         0.75,
  llm_inference:      0.6,
  system:             0.5,
};
import { generateReflection } from "@/app/actions";
import { v4 as uuidv4 } from "uuid";

const DEFAULT_CONFIG: MemoryConfig = {
  maxMemories: 500,
  compactionThreshold: 400,
};

export class MemoryStream {
  private isCompacting = false;
  /** In-memory count eliminates an IDB count() call on every add(). */
  private _memCount = 0;

  constructor(private config: MemoryConfig = DEFAULT_CONFIG) { }

  async init() {
    const count = await this.count();
    this._memCount = count;
  }

  /**
   * Add a new memory to the stream.
   * Heuristic importance is calculated here to avoid LLM calls.
   */
  async add(
    agentId: string | undefined,
    type: MemoryType,
    content: string,
    tags: string[] = [],
    sessionId?: string,
    /** Provenance — defaults to 'system' so all writes must explicitly declare origin. */
    source: MemorySource = "system",
    sourceAgentId?: string,
    sourceModel?: string,
  ): Promise<void> {
    const importance = this.calculateHeuristicImportance(type, tags);
    const memory: MemoryObject = {
      id: uuidv4(),
      agentId,
      type,
      content,
      timestamp: Date.now(),
      importance,
      tags,
      isInsight: false,
      source,
      sourceAgentId,
      sourceModel,
    };

    await memoryStorage.add(memory);
    this._memCount++;
    this.checkCompaction(sessionId);
  }

  /**
   * Retrieve relevant memories based on context.
   * Uses Heuristic Scoring: (Importance * 0.7) + (Recency * 0.3)
   */
  async retrieve(context: RetrievalContext): Promise<MemoryObject[]> {
    // Use agent-scoped index when available — avoids full-store scan
    const allMemories = context.agentId
      ? await memoryStorage.getByAgent(context.agentId, 200)
      : await memoryStorage.getAll();
    const limit = context.limit || 10;
    const now = Date.now();

    let candidates = allMemories;
    if (context.agentId) {
      // Already scoped by agent — also include global (no agentId) memories
      const globals = (await memoryStorage.getAll()).filter((m) => !m.agentId);
      candidates = [...allMemories, ...globals];
    }
    if (context.tags && context.tags.length > 0) {
      candidates = candidates.filter(
        (m) =>
          // If any tag matches
          context.tags!.some((t) => m.tags.includes(t)) ||
          // OR if it's an "Insight" (always relevant as context)
          m.isInsight,
      );
    }

    // 2. Score — importance × 0.5 + recency × 0.2 + trust × 0.3
    const scored = candidates.map((m) => {
      const importanceScore = m.importance / 10; // 0.1 to 1.0

      // Decay: 1 hour ≈ 0.9, 24 hours ≈ 0.5
      const hoursOld = (now - m.timestamp) / (1000 * 60 * 60);
      const recencyScore = 1 / (1 + hoursOld * 0.1);

      // Trust score from provenance — missing source defaults to 0.7
      const trustScore = TRUST_WEIGHT[m.source ?? "system"] ?? 0.7;

      // Weighted total: direct observations surface over LLM-inferred guesses
      const finalScore =
        importanceScore * 0.5 + recencyScore * 0.2 + trustScore * 0.3;

      return { memory: m, score: finalScore };
    });

    // 3. Sort & Slice
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.memory);
  }

  private calculateHeuristicImportance(
    type: MemoryType,
    tags: string[],
  ): number {
    if (type === "DIALOGUE") return 9;
    if (type === "ACTION") return 7;
    if (type === "THOUGHT") return 5;
    if (type === "OBSERVATION") {
      if (tags.some((t) => t.includes("player") || t.includes("user")))
        return 6;
      return 2;
    }
    return 5;
  }

  private async count(): Promise<number> {
    return memoryStorage.count();
  }

  /**
   * Wipes ALL memories from IndexedDB and writes a single SESSION_START anchor
   * so agents immediately know they are beginning a fresh observation cycle.
   * Call this after a loop has accumulated stale memories.
   */
  async reset(): Promise<void> {
    await memoryStorage.clearAll();
    await this.add(
      "system",
      "OBSERVATION",
      "SESSION_START: All previous memories have been cleared. Begin fresh observation from current state. Do not reference any earlier session.",
      ["session", "reset"],
      undefined,
      "system",
    );
    console.log("[MemoryStream] ✓ All memories cleared. Fresh session started.");
  }

  /**
   * Checks if memory limit is reached and triggers compaction if needed.
   * Synchronous: uses in-memory counter (no IDB call).
   */
  private checkCompaction(sessionId?: string) {
    if (this.isCompacting) return;
    if (this._memCount >= this.config.compactionThreshold) {
      this.reflect(sessionId).catch((err) =>
        console.error("[MemoryStream] Reflection failed:", err),
      );
    }
  }

  /**
   * Compaction Process:
   * 1. Get oldest 50 memories.
   * 2. Summarize them into an "Insight".
   * 3. Delete the original 50.
   * 4. Add the Insight.
   */
  async reflect(sessionId?: string) {
    this.isCompacting = true;
    try {
      const batchSize = 50;
      const oldest = await memoryStorage.getOldest(batchSize);

      if (oldest.length === 0) return;

      const textToSummarize = oldest
        .map(
          (m) =>
            `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.type}: ${m.content.length > 200
              ? m.content.substring(0, 200) + "..."
              : m.content
            }`,
        )
        .join("\n");

      const summary = await generateReflection(textToSummarize, sessionId);

      if (summary) {
        // Add Insight — tagged as 'reflection' so retrieval knows it is a synthesis
        const insight: MemoryObject = {
          id: uuidv4(),
          agentId: sessionId?.split('-')[0] || "system",
          type: "THOUGHT",
          content: `[REFLECTION] ${summary}`,
          timestamp: Date.now(),
          importance: 10,
          tags: ["insight"],
          isInsight: true,
          source: "reflection",
        };
        await memoryStorage.add(insight);
        /*
        console.log(
          `[MemoryStream] Generated insight: "${summary.substring(0, 50)}..."`,
        );
        */

        // Prune old memories
        const idsToDelete = oldest.map((m) => m.id);
        await memoryStorage.delete(idsToDelete);
        this._memCount = Math.max(0, this._memCount - idsToDelete.length);
      }
    } finally {
      this.isCompacting = false;
    }
  }
}

export const memoryStream = new MemoryStream();
