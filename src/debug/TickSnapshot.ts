/**
 * Tick Snapshot Ring Buffer — Per-agent cognitive state history.
 *
 * Captures a lightweight snapshot of each agent's state at every LLM
 * invocation, stored in a fixed-size ring buffer (default 60 snapshots).
 * Enables the Cognitive Dashboard to display a "time-travel" decision
 * timeline without any server round-trips.
 *
 * Performance characteristics:
 *  - O(1) push (oldest evicted when full)
 *  - O(n) read (n = maxSize ≤ 60, negligible)
 *  - No IDB persistence — data is in-memory only, clears on reload.
 *    (The timeline is a debugging aid; durability belongs to MemoryStream.)
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface AgentSnapshot {
  /** Monotonic counter (unique within this agent's buffer lifetime). */
  tickId: number;
  /** Unix epoch ms when the LLM response was received. */
  timestamp: number;
  /** Agent ID this snapshot belongs to. */
  agentId: string;

  // ── Cognitive state at this tick ───────────────────────────────────────
  /** Serializable copy of drive values (from UtilityBrain / DriveManager). */
  drives: Record<string, number>;
  /** Task queue phase label (IDLE, NAVIGATING, SEATED, etc.) */
  taskPhase: string;
  /** Current task type or null if no active task. */
  currentTaskType: string | null;
  /** Number of tasks waiting in the queue at this tick. */
  queuedTaskCount: number;

  // ── LLM decision ──────────────────────────────────────────────────────
  /** Whether the agent took an action or just observed. */
  decision: "OBSERVE" | "INTERFERE_SCRIPT";
  /** The agent's thought / spoken content for this tick. */
  thought: string;
  /** Names of tool functions invoked (empty if OBSERVE). */
  toolCalls: string[];

  // ── Spatial context ────────────────────────────────────────────────────
  /** Zone ID at time of decision, if known. */
  zoneId: string | null;
  /** Total number of nearby entities perceived. */
  nearbyEntityCount: number;
  /** IDs of other agents in the perception window. */
  nearbyAgentIds: string[];

  // ── Performance metrics ────────────────────────────────────────────────
  /** Wall-clock LLM round-trip latency in milliseconds. */
  latencyMs: number;
  /** Total LLM tokens consumed this tick. */
  tokenCount: number;
  /** Ratio of spatial prepositions in the thought text (research DV). */
  spatialLanguageFreq: number;

  // ── Provenance ─────────────────────────────────────────────────────────
  /** True when UtilityBrain acted instead of the LLM (subconscious tick). */
  wasSubconscious: boolean;
  /** Number of Critic Loop retries before the LLM response was accepted. */
  criticRetries: number;
}

// ── TickSnapshotBuffer ───────────────────────────────────────────────────────

const DEFAULT_MAX_SIZE = 60;

export class TickSnapshotBuffer {
  private static instances = new Map<string, TickSnapshotBuffer>();

  private buffer: (AgentSnapshot | null)[];
  private maxSize: number;
  private head = 0;
  private length = 0;
  private tickCounter = 0;
  private readonly agentId: string;

  private constructor(agentId: string, maxSize: number) {
    this.agentId = agentId;
    this.maxSize = maxSize;
    this.buffer = new Array(maxSize).fill(null);
  }

  /**
   * Retrieve (or create) the singleton buffer for a given agent.
   * @param maxSize Overrides default ring size on first creation only.
   */
  public static getInstance(
    agentId: string,
    maxSize: number = DEFAULT_MAX_SIZE,
  ): TickSnapshotBuffer {
    if (!TickSnapshotBuffer.instances.has(agentId)) {
      TickSnapshotBuffer.instances.set(
        agentId,
        new TickSnapshotBuffer(agentId, maxSize),
      );
    }
    return TickSnapshotBuffer.instances.get(agentId)!;
  }

  // ── Write ──────────────────────────────────────────────────────────────────

  /**
   * Push a new snapshot into the ring buffer.
   * O(1) time and memory — overwrites oldest entry.
   */
  public push(snapshot: Omit<AgentSnapshot, "tickId">): AgentSnapshot {
    const full = { ...snapshot, tickId: this.tickCounter++ };
    
    this.buffer[this.head] = full;
    this.head = (this.head + 1) % this.maxSize;
    
    if (this.length < this.maxSize) {
      this.length++;
    }
    
    return full;
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  /**
   * All snapshots currently in the buffer, oldest first.
   * Returns a new array.
   */
  public getAll(): AgentSnapshot[] {
    const result: AgentSnapshot[] = [];
    const start = this.length < this.maxSize ? 0 : this.head;
    
    for (let i = 0; i < this.length; i++) {
        const idx = (start + i) % this.maxSize;
        const val = this.buffer[idx];
        if (val) result.push(val);
    }
    return result;
  }

  /**
   * Last N snapshots, newest last.
   * @param n Number of snapshots to retrieve (clamped to buffer length).
   */
  public getRecent(n: number): AgentSnapshot[] {
    const count = Math.min(n, this.length);
    const result: AgentSnapshot[] = [];
    
    for (let i = 0; i < count; i++) {
        const idx = (this.head - count + i + this.maxSize) % this.maxSize;
        const val = this.buffer[idx];
        if (val) result.push(val);
    }
    return result;
  }

  /**
   * Retrieve a snapshot by its tick ID.
   * Searches the buffer — O(length).
   */
  public getByTick(tickId: number): AgentSnapshot | null {
    for (let i = 0; i < this.length; i++) {
        const val = this.buffer[i];
        if (val && val.tickId === tickId) return val;
    }
    return null;
  }

  // ── Metadata ───────────────────────────────────────────────────────────────

  /** Total ticks ever pushed to this buffer (including evicted ones). */
  public getTotalTicks(): number {
    return this.tickCounter;
  }

  /** Current number of snapshots in the ring (0 to maxSize). */
  public getSize(): number {
    return this.length;
  }

  /** Agent ID this buffer belongs to. */
  public getAgentId(): string {
    return this.agentId;
  }

  // ── Maintenance ────────────────────────────────────────────────────────────

  /** Discard all snapshots. Useful for test resets or scenario changes. */
  public clear(): void {
    this.buffer.fill(null);
    this.head = 0;
    this.length = 0;
    this.tickCounter = 0;
  }
}
