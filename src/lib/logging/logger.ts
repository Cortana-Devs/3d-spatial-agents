/**
 * Client-safe simulation log dispatcher.
 *
 * This module is safe to import in client components — it only uses fetch().
 * The server-side CSV logger lives in agent-logger.ts (server-only).
 */

// ── Simulation State Dispatcher (client-side fetch) ───────────────────────────

export interface SimulationLog {
  timestamp: string; // ISO 8601
  agent_id: string;
  run_id: string; // UUID for reproducibility
  perception: string; // Full Context Mixer output
  response: {
    text: string;
    tool_calls: Array<any>;
  };
  verification: boolean; // Did the Capability Adaptor approve?
  execution: {
    action: string;
    outcome: string;
  };
  metrics: {
    latency_ms: number; // From worker thread timing
    token_count: number; // From Groq response headers
    fps: number; // From R3F / Zustand
    spatial_language_freq: number; // Ratio of spatial prepositions
  };
}

export async function dispatchSimulationLog(log: SimulationLog) {
  try {
    const res = await fetch("/api/logs/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log),
    });
    if (!res.ok) {
      console.error("Failed to push SimulationLog. Status:", res.status);
    }
  } catch (err) {
    console.error("SimulationLog dispatch error:", err);
  }
}
