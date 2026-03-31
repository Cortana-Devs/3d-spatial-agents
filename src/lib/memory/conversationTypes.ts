/** Persisted conversation summary for structured recall in prompts. */
export interface ConversationRecord {
  id: string;
  /** Agent who had the conversation (our side). */
  listenerAgentId: string;
  entityId: string;
  entityName: string;
  timestamp: number;
  locationLabel: string;
  keyLines: string[];
  agentLines: string[];
  summary: string;
  topics: string[];
  wasPositive: boolean;
  wasUseful: boolean;
}
