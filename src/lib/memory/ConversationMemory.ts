import { memoryStorage } from "./idb-adapter";
import type { ConversationRecord } from "./conversationTypes";

/** Matches perception id for the human player in useAgentBrain. */
export const PLAYER_CONVERSATION_ENTITY_ID = "player-01";

const MAX_RECORDS_PER_AGENT = 100;
const MAX_HISTORY_IN_PROMPT = 3;

function extractTopics(lines: string[]): string[] {
  const text = lines.join(" ").toLowerCase();
  const topics: string[] = [];
  const keywords = [
    "keycard",
    "terminal",
    "door",
    "locked",
    "generator",
    "power",
    "east",
    "west",
    "north",
    "south",
    "corridor",
    "secret",
    "code",
    "password",
    "broken",
    "fixed",
    "experiment",
    "research",
    "data",
    "warning",
    "danger",
  ];
  for (const kw of keywords) {
    if (text.includes(kw)) topics.push(kw);
  }
  return topics;
}

function pickKeyLines(lines: string[], max: number = 4): string[] {
  if (lines.length <= max) return [...lines];

  const scored = lines.map((line, i) => {
    let score = 0;
    score += line.length > 40 ? 2 : 0;
    score += line.includes("?") ? 3 : 0;
    score += line.includes("!") ? 1 : 0;
    score += /\b(secret|important|warning|never|always|must|need)\b/i.test(line)
      ? 3
      : 0;
    score += i >= lines.length - 3 ? 1 : 0;
    return { line, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .sort((a, b) => lines.indexOf(a.line) - lines.indexOf(b.line))
    .map((s) => s.line);
}

export class ConversationMemory {
  private records: ConversationRecord[] = [];
  private loaded = false;
  private idCounter = 0;

  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      this.records = await memoryStorage.getAllConversationRecords();
      this.idCounter = this.records.length;
    } catch {
      this.records = [];
    }
    this.loaded = true;
  }

  async record(params: {
    listenerAgentId: string;
    entityId: string;
    entityName: string;
    locationLabel: string;
    theirLines: string[];
    agentLines: string[];
    wasPositive?: boolean;
    wasUseful?: boolean;
  }): Promise<ConversationRecord> {
    await this.ensureLoaded();
    const keyLines = pickKeyLines(params.theirLines);
    const agentKeyLines = pickKeyLines(params.agentLines);
    const topics = extractTopics([...params.theirLines, ...params.agentLines]);

    const summary =
      keyLines.length > 0
        ? `Talked to ${params.entityName} about ${topics.length > 0 ? topics.join(", ") : "general topics"}. They said: "${keyLines[0]}"`
        : `Brief exchange with ${params.entityName}.`;

    const record: ConversationRecord = {
      id: `conv_${params.listenerAgentId}_${Date.now()}_${this.idCounter++}`,
      listenerAgentId: params.listenerAgentId,
      entityId: params.entityId,
      entityName: params.entityName,
      timestamp: Date.now(),
      locationLabel: params.locationLabel,
      keyLines,
      agentLines: agentKeyLines,
      summary,
      topics,
      wasPositive: params.wasPositive ?? true,
      wasUseful: params.wasUseful ?? false,
    };

    this.records.push(record);
    await memoryStorage.putConversationRecord(record);

    const forAgent = this.records.filter(
      (r) => r.listenerAgentId === params.listenerAgentId,
    );
    if (forAgent.length > MAX_RECORDS_PER_AGENT) {
      const sorted = [...forAgent].sort((a, b) => a.timestamp - b.timestamp);
      const toDrop = sorted.slice(0, forAgent.length - MAX_RECORDS_PER_AGENT);
      const dropIds = new Set(toDrop.map((r) => r.id));
      this.records = this.records.filter((r) => !dropIds.has(r.id));
      // Note: orphaned rows remain in IDB until a future compaction pass; bounded by usage.
    }

    return record;
  }

  recallEntity(listenerAgentId: string, entityId: string): ConversationRecord[] {
    return this.records.filter(
      (r) => r.listenerAgentId === listenerAgentId && r.entityId === entityId,
    );
  }

  formatForPrompt(listenerAgentId: string, entityId: string): string {
    const history = this.recallEntity(listenerAgentId, entityId)
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-MAX_HISTORY_IN_PROMPT);

    if (history.length === 0) {
      return "You have never spoken to this person before.";
    }

    const entries = history.map((r, i) => {
      const ago = this.timeAgo(r.timestamp);
      const lines = r.keyLines.map((l) => `  "${l}"`).join("\n");
      const yourLines = r.agentLines.map((l) => `  You said: "${l}"`).join("\n");
      return [
        `[Conversation ${i + 1} — ${ago}, at ${r.locationLabel}]`,
        r.summary,
        `Key things they said:`,
        lines,
        yourLines ? `What you said:\n${yourLines}` : "",
        r.topics.length > 0 ? `Topics: ${r.topics.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    });

    return [
      `You have spoken to ${history[0].entityName} ${history.length} time(s) before:`,
      "",
      ...entries,
      "",
      "Use this history naturally. Reference specific things they told you when relevant.",
    ].join("\n");
  }

  recallByTopic(listenerAgentId: string, topic: string): ConversationRecord[] {
    const t = topic.toLowerCase();
    return this.records.filter(
      (r) =>
        r.listenerAgentId === listenerAgentId &&
        (r.topics.includes(t) ||
          r.keyLines.some((l) => l.toLowerCase().includes(t))),
    );
  }

  recent(listenerAgentId: string, n: number = 3): ConversationRecord[] {
    const mine = this.records.filter((r) => r.listenerAgentId === listenerAgentId);
    return mine.sort((a, b) => a.timestamp - b.timestamp).slice(-n);
  }

  formatRecentForPrompt(listenerAgentId: string, n: number = 3): string {
    const recent = this.recent(listenerAgentId, n);
    if (recent.length === 0) return "";

    return [
      "Recent conversations you've had:",
      ...recent.map((r) => `- ${r.summary} (${this.timeAgo(r.timestamp)})`),
    ].join("\n");
  }

  private timeAgo(timestamp: number): string {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 5) return "a few minutes ago";
    if (minutes < 30) return `${minutes} minutes ago`;
    if (minutes < 60) return "about an hour ago";
    return `${Math.floor(minutes / 60)} hours ago`;
  }
}

export const conversationMemory = new ConversationMemory();
