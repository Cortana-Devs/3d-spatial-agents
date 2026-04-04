import { SUBCONSCIOUS_AFTER_LLM_SUPPRESS_MS } from "@/constants/simulation";

const lastLlmSpeechMs = new Map<string, number>();

export function markAgentLlmSpeech(agentId: string): void {
  lastLlmSpeechMs.set(agentId, Date.now());
}

export function allowSubconsciousUtterance(
  agentId: string,
  suppressMs: number = SUBCONSCIOUS_AFTER_LLM_SUPPRESS_MS,
): boolean {
  const t = lastLlmSpeechMs.get(agentId);
  if (t == null) return true;
  return Date.now() - t >= suppressMs;
}
