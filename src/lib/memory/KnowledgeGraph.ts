import { memoryStorage } from "./idb-adapter";
import { v4 as uuidv4 } from "uuid";
import type { MemorySource } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single semantic fact stored in triple form: (subject, predicate, object).
 *
 * Examples:
 *   ("coffee-machine",  "status",       "broken")         confidence=0.9
 *   ("agent-02",        "prefers_zone", "break-room")      confidence=0.7
 *   ("player-01",       "asked_about",  "experiment-data") confidence=0.85
 */
export interface KnowledgeFact {
  id: string;                   // Stable key = subject:predicate:object (URL-encoded)
  agentId: string;              // Which agent holds this belief
  subject: string;              // Entity ID or label
  predicate: string;            // Relationship type (snake_case convention)
  object: string;               // Target value or entity ID
  confidence: number;           // 0.0 – 1.0
  source: MemorySource;         // Provenance (from Phase 1 types)
  createdAt: number;            // epoch ms
  updatedAt: number;            // epoch ms
  sourceAgentId?: string;       // Who told us (if source is 'peer')
  expiresAt?: number;           // Optional TTL (epoch ms); undefined = permanent
}

// ---------------------------------------------------------------------------
// Decay & prune constants
// ---------------------------------------------------------------------------

/** Confidence decays by this fraction per hour of inactivity. */
const HOURLY_DECAY = 0.005;

/** Facts below this confidence are pruned automatically. */
const PRUNE_THRESHOLD = 0.15;

/** Confidence bonus when the same fact is observed again (reinforcement). */
const REINFORCE_DELTA = 0.1;

// ---------------------------------------------------------------------------
// KnowledgeGraph
// ---------------------------------------------------------------------------

/**
 * Per-agent semantic memory — stores (subject, predicate, object) triples
 * with confidence scores, provenance, and optional TTL.
 *
 * Persistence: serialized to the IDB 'knowledge-facts' store so facts
 * survive page reloads. Use `clearAll()` or `clearFact()` to clean up.
 *
 * Retrieval: `toContextString(relevantEntityIds)` formats the top-N
 * most confident, relevant facts as a Markdown table ready for LLM injection.
 */
export class KnowledgeGraph {
  private static instances = new Map<string, KnowledgeGraph>();

  /** agentId → map of fact id → fact */
  private facts = new Map<string, KnowledgeFact>();
  private agentId: string;
  private loaded = false;

  private constructor(agentId: string) {
    this.agentId = agentId;
  }

  public static getInstance(agentId: string): KnowledgeGraph {
    if (!KnowledgeGraph.instances.has(agentId)) {
      KnowledgeGraph.instances.set(agentId, new KnowledgeGraph(agentId));
    }
    return KnowledgeGraph.instances.get(agentId)!;
  }

  /** Lazy-load facts from IDB on first read. */
  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const rows = await memoryStorage.getKnowledgeFacts(this.agentId);
      for (const fact of rows) {
        this.facts.set(fact.id, fact);
      }
    } catch {
      // IDB not available (e.g. SSR) — continue in-memory only
    }
  }

  // ── Stable ID ─────────────────────────────────────────────────────────────

  private factId(subject: string, predicate: string, object: string): string {
    // Deterministic key so duplicate observations reinforce instead of duplicate
    return [this.agentId, subject, predicate, object]
      .map(encodeURIComponent)
      .join(":");
  }

  // ── Write API ─────────────────────────────────────────────────────────────

  /**
   * Add or reinforce a fact.
   * - If the same (subject, predicate, object) already exists, confidence is
   *   bumped by REINFORCE_DELTA (capped at 1.0) and updatedAt is refreshed.
   * - If completely new, it is inserted at the supplied confidence.
   */
  async upsert(
    subject: string,
    predicate: string,
    object: string,
    confidence: number,
    source: MemorySource,
    sourceAgentId?: string,
    expiresAt?: number,
  ): Promise<KnowledgeFact> {
    await this.ensureLoaded();

    const id = this.factId(subject, predicate, object);
    const existing = this.facts.get(id);
    const now = Date.now();

    let fact: KnowledgeFact;
    if (existing) {
      // Reinforce existing belief
      fact = {
        ...existing,
        confidence: Math.min(1.0, existing.confidence + REINFORCE_DELTA),
        source,
        sourceAgentId: sourceAgentId ?? existing.sourceAgentId,
        updatedAt: now,
        expiresAt: expiresAt ?? existing.expiresAt,
      };
    } else {
      fact = {
        id,
        agentId: this.agentId,
        subject,
        predicate,
        object,
        confidence: Math.max(0, Math.min(1, confidence)),
        source,
        sourceAgentId,
        createdAt: now,
        updatedAt: now,
        expiresAt,
      };
    }

    this.facts.set(id, fact);
    await memoryStorage.putKnowledgeFact(fact).catch(() => {});
    return fact;
  }

  /**
   * Remove exactly one fact by (subject, predicate, object).
   * Returns true if the fact existed and was removed.
   */
  async clearFact(
    subject: string,
    predicate: string,
    object: string,
  ): Promise<boolean> {
    await this.ensureLoaded();
    const id = this.factId(subject, predicate, object);
    const existed = this.facts.delete(id);
    if (existed) {
      await memoryStorage.deleteKnowledgeFacts([id]).catch(() => {});
    }
    return existed;
  }

  /**
   * Wipe ALL facts for this agent from memory and IDB.
   */
  async clearAll(): Promise<void> {
    await this.ensureLoaded();
    const ids = Array.from(this.facts.keys());
    this.facts.clear();
    if (ids.length > 0) {
      await memoryStorage.deleteKnowledgeFacts(ids).catch(() => {});
    }
  }

  // ── Read API ──────────────────────────────────────────────────────────────

  /** All facts where subject matches the given entity ID. */
  async aboutSubject(subject: string): Promise<KnowledgeFact[]> {
    await this.ensureLoaded();
    return Array.from(this.facts.values()).filter(
      (f) => f.subject === subject && this.isAlive(f),
    );
  }

  /** All facts with a specific predicate (e.g. all "status" facts). */
  async withPredicate(predicate: string): Promise<KnowledgeFact[]> {
    await this.ensureLoaded();
    return Array.from(this.facts.values()).filter(
      (f) => f.predicate === predicate && this.isAlive(f),
    );
  }

  /** All facts where subject OR object matches the entity ID (bidirectional). */
  async involving(entityId: string): Promise<KnowledgeFact[]> {
    await this.ensureLoaded();
    return Array.from(this.facts.values()).filter(
      (f) =>
        this.isAlive(f) &&
        (f.subject === entityId || f.object === entityId),
    );
  }

  /**
   * Highest-confidence fact for (subject, predicate).
   * Useful for "what is the current status of X?".
   */
  async getBelief(
    subject: string,
    predicate: string,
  ): Promise<KnowledgeFact | null> {
    await this.ensureLoaded();
    const candidates = Array.from(this.facts.values()).filter(
      (f) =>
        f.subject === subject && f.predicate === predicate && this.isAlive(f),
    );
    if (candidates.length === 0) return null;
    return candidates.reduce((best, c) =>
      c.confidence > best.confidence ? c : best,
    );
  }

  /** Get all facts for this agent (raw, sorted by confidence desc). */
  async getAll(): Promise<KnowledgeFact[]> {
    await this.ensureLoaded();
    return Array.from(this.facts.values())
      .filter((f) => this.isAlive(f))
      .sort((a, b) => b.confidence - a.confidence);
  }

  // ── Maintenance ───────────────────────────────────────────────────────────

  /**
   * Apply confidence decay and remove expired / low-confidence facts.
   * Call this periodically (e.g. once per session or on menu open).
   * Returns number of pruned facts.
   */
  async prune(): Promise<number> {
    await this.ensureLoaded();
    const now = Date.now();
    const toPrune: string[] = [];

    for (const [id, fact] of this.facts.entries()) {
      // Check TTL expiry
      if (fact.expiresAt && now >= fact.expiresAt) {
        toPrune.push(id);
        continue;
      }

      // Apply hourly confidence decay
      const hoursOld = (now - fact.updatedAt) / (1000 * 60 * 60);
      const decayed = fact.confidence * Math.pow(1 - HOURLY_DECAY, hoursOld);

      if (decayed < PRUNE_THRESHOLD) {
        toPrune.push(id);
      } else {
        // Update in-place if significantly decayed
        if (Math.abs(decayed - fact.confidence) > 0.01) {
          const updated = { ...fact, confidence: decayed, updatedAt: now };
          this.facts.set(id, updated);
          await memoryStorage.putKnowledgeFact(updated).catch(() => {});
        }
      }
    }

    for (const id of toPrune) this.facts.delete(id);
    if (toPrune.length > 0) {
      await memoryStorage.deleteKnowledgeFacts(toPrune).catch(() => {});
    }
    return toPrune.length;
  }

  // ── LLM Prompt Injection ──────────────────────────────────────────────────

  /**
   * Format top-N relevant facts for LLM prompt injection.
   * Filters to facts involving the supplied entity IDs, then sorts by
   * confidence descending, returning a compact Markdown table.
   *
   * @param relevantEntityIds  Entity IDs currently in scope (nearby, in task, etc.)
   * @param maxFacts           Maximum rows (default 8)
   */
  toContextString(
    relevantEntityIds: string[],
    maxFacts: number = 8,
  ): string {
    if (this.facts.size === 0) return "";

    const idSet = new Set(relevantEntityIds);
    const relevant = Array.from(this.facts.values())
      .filter(
        (f) =>
          this.isAlive(f) &&
          (idSet.size === 0 || idSet.has(f.subject) || idSet.has(f.object)),
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxFacts);

    if (relevant.length === 0) return "";

    const rows = relevant
      .map(
        (f) =>
          `| ${f.subject} | ${f.predicate} | ${f.object} | ${Math.round(f.confidence * 100)}% |`,
      )
      .join("\n");

    return (
      `## Known Facts (Semantic Memory)\n` +
      `| Subject | Relation | Value | Confidence |\n` +
      `|---|---|---|---|\n` +
      rows
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private isAlive(fact: KnowledgeFact): boolean {
    if (fact.expiresAt && Date.now() >= fact.expiresAt) return false;
    return fact.confidence >= PRUNE_THRESHOLD;
  }

  /** Sync snapshot of all facts for the observability dashboard (no IDB call). */
  getSnapshot(): KnowledgeFact[] {
    return Array.from(this.facts.values()).sort(
      (a, b) => b.confidence - a.confidence,
    );
  }
}
