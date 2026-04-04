export type MemoryType =
  | "OBSERVATION"
  | "DIALOGUE"
  | "THOUGHT"
  | "ACTION"
  | "SCRIPT_OUTCOME";

/**
 * Provenance of a memory record — ordered by decreasing trustworthiness.
 * Used by the retrieval trust-weighting system to rank memories by reliability.
 */
export type MemorySource =
  | "direct_observation" // Agent's own SensorySystem saw / heard this (highest trust)
  | "self_action"        // Agent performed this action
  | "player"             // Human player said or did this
  | "peer"               // Another agent reported this to this agent
  | "llm_inference"      // LLM generated this as a thought or plan
  | "reflection"         // System-generated insight from compaction
  | "system";            // Session markers, resets (lowest trust)

export interface MemoryObject {
  id: string;           // UUID
  agentId?: string;     // Which agent this memory belongs to
  type: MemoryType;
  content: string;      // The actual text content
  timestamp: number;    // Unix epoch ms
  importance: number;   // 1–10 scale
  tags: string[];       // For fast filtering e.g. ['entity:player', 'location:desk']
  isInsight?: boolean;  // True if this is a system-generated summary / reflection

  // ── Provenance fields (Phase 1) ──────────────────────────────────────────
  /** How this memory was created. Required for trust-weighted retrieval. */
  source: MemorySource;
  /** If source is 'peer', the agent ID that communicated this fact. */
  sourceAgentId?: string;
  /** If source is 'llm_inference', the model version that generated it. */
  sourceModel?: string;
}

export interface RetrievalContext {
  agentId?: string;  // Filter by the specific agent
  query?: string;    // Natural language query (optional for now, future use)
  tags?: string[];   // Filter by tags (e.g. "What do I know about PLAYER?")
  limit?: number;    // Max memories to return (default 10)
}

export interface MemoryConfig {
  maxMemories: number;         // Hard cap (e.g. 500)
  compactionThreshold: number; // When to trigger summarization (e.g. 400)
}
