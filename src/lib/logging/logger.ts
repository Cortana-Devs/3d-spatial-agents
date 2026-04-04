/**
 * Client-safe simulation log dispatcher.
 *
 * Uses a fire-and-forget idle queue: logs are batched (max 200 pending) and
 * flushed in requestIdleCallback so LLM ticks are never blocked by network I/O.
 */

// ── Idle batch queue ───────────────────────────────────────────────────────────

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

// ── Idle-queue dispatcher ─────────────────────────────────────────────────────

const MAX_QUEUE = 200;
const BATCH_SIZE = 10;
const _queue: SimulationLog[] = [];
let _flushing = false;

function _scheduleDrain() {
  if (_flushing || _queue.length === 0) return;
  _flushing = true;
  const drain = () => {
    if (_queue.length === 0) {
      _flushing = false;
      return;
    }
    const batch = _queue.splice(0, BATCH_SIZE);
    fetch("/api/logs/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch.length === 1 ? batch[0] : batch),
      keepalive: true,
    }).catch(() => {
      // Silent fail — logs are non-critical
    });
    if (_queue.length > 0) {
      _scheduleRic(drain);
    } else {
      _flushing = false;
    }
  };
  _scheduleRic(drain);
}

function _scheduleRic(cb: () => void) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    (window as any).requestIdleCallback(cb, { timeout: 2000 });
  } else {
    setTimeout(cb, 200);
  }
}

/**
 * Enqueue a simulation log for background batch dispatch.
 * Returns immediately — no network overhead on the calling thread.
 */
export function dispatchSimulationLog(log: SimulationLog): void {
  if (_queue.length >= MAX_QUEUE) {
    _queue.shift(); // Evict oldest when queue full (ring semantics)
  }
  _queue.push(log);
  _scheduleDrain();
}
