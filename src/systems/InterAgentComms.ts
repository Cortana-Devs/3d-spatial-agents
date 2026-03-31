import { AgentTaskRegistry } from "@/systems/AgentTaskQueue";

const MAX_ENTRIES_PER_AGENT = 10;

export interface PeerMessageEntry {
  fromId: string;
  text: string;
  broadcast: boolean;
  ts: number;
}

const buffers = new Map<string, PeerMessageEntry[]>();

function ensureBuffer(agentId: string): PeerMessageEntry[] {
  let b = buffers.get(agentId);
  if (!b) {
    b = [];
    buffers.set(agentId, b);
  }
  return b;
}

function pushEntry(receiverId: string, entry: PeerMessageEntry) {
  const b = ensureBuffer(receiverId);
  b.push(entry);
  while (b.length > MAX_ENTRIES_PER_AGENT) b.shift();
}

export const InterAgentComms = {
  emitDirect(fromId: string, toId: string, text: string): void {
    const trimmed = text?.trim();
    if (!trimmed || fromId === toId) return;
    const ids = AgentTaskRegistry.getInstance().getAllAgentIds();
    if (!ids.includes(toId)) return;
    pushEntry(toId, {
      fromId,
      text: trimmed,
      broadcast: false,
      ts: Date.now(),
    });
  },

  emitBroadcast(fromId: string, text: string): void {
    const trimmed = text?.trim();
    if (!trimmed) return;
    const ids = AgentTaskRegistry.getInstance().getAllAgentIds();
    for (const toId of ids) {
      if (toId === fromId) continue;
      pushEntry(toId, {
        fromId,
        text: trimmed,
        broadcast: true,
        ts: Date.now(),
      });
    }
  },

  formatForPrompt(receiverId: string): string {
    const b = buffers.get(receiverId);
    if (!b?.length) return "";
    return b
      .map((e) => {
        const tag = e.broadcast ? "everyone" : "direct";
        return `- From **${e.fromId}** (${tag}): ${e.text}`;
      })
      .join("\n");
  },

  clearForAgent(agentId: string): void {
    buffers.delete(agentId);
  },
};
