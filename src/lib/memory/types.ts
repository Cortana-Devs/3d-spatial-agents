export type MemoryType =
  | "OBSERVATION"
  | "DIALOGUE"
  | "THOUGHT"
  | "ACTION"
  | "SCRIPT_OUTCOME";

export interface MemoryObject {
  id: string; // UUID
  type: MemoryType;
  content: string; // The actual text content
  timestamp: number; // Unix timestamp
  importance: number; // 1-10 scale
  tags: string[]; // For fast filtering (e.g. ['entity:player', 'location:desk'])
  isInsight?: boolean; // If true, this is a summary/reflection
}

export interface RetrievalContext {
  query?: string; // Natural language query (optional for now, future use)
  tags?: string[]; // Filter by tags (e.g. "What do I know about PLAYER?")
  limit?: number; // Max memories to return (default 10)
}

export interface MemoryConfig {
  maxMemories: number; // Hard cap (e.g. 500)
  compactionThreshold: number; // When to trigger summarization (e.g. 400)
}
