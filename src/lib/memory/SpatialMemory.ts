/**
 * Spatial Memory System
 *
 * Agents track where they have been, how long they stayed, what happened there.
 * This creates place attachment, informs EXPLORE decisions, and enriches LLM context.
 * The data is in-memory (per-session) and not persisted to IndexedDB — it resets on reload,
 * which keeps things fresh and avoids stale biases across sessions.
 */

export interface SpatialMemoryEntry {
  zoneId: string;
  zoneName: string;
  firstVisited: number;       // epoch ms
  lastVisited: number;        // epoch ms
  totalDuration: number;      // cumulative seconds spent in zone
  visitCount: number;
  avgSatisfaction: number;    // 0–100, EMA of drive improvement while here
  socialInteractions: string[]; // agent IDs met here
  discoveries: string[];        // POI / item IDs first observed here
}

export class SpatialMemory {
  private static instances: Map<string, SpatialMemory> = new Map();

  private entries: Map<string, SpatialMemoryEntry> = new Map();
  private currentZoneId: string | null = null;
  private currentZoneStart: number = 0;
  private agentId: string;

  private constructor(agentId: string) {
    this.agentId = agentId;
  }

  public static getInstance(agentId: string): SpatialMemory {
    if (!SpatialMemory.instances.has(agentId)) {
      SpatialMemory.instances.set(agentId, new SpatialMemory(agentId));
    }
    return SpatialMemory.instances.get(agentId)!;
  }

  /** Call each frame (or throttled) with the agent's current zone. */
  public updateZone(zoneId: string, zoneName: string): void {
    const now = Date.now();

    if (this.currentZoneId === zoneId) return; // same zone, nothing to do

    // Leaving previous zone — accumulate duration
    if (this.currentZoneId !== null) {
      const duration = (now - this.currentZoneStart) / 1000;
      const prev = this.entries.get(this.currentZoneId);
      if (prev) prev.totalDuration += duration;
    }

    // Entering new zone
    this.currentZoneId = zoneId;
    this.currentZoneStart = now;

    if (!this.entries.has(zoneId)) {
      this.entries.set(zoneId, {
        zoneId,
        zoneName,
        firstVisited: now,
        lastVisited: now,
        totalDuration: 0,
        visitCount: 1,
        avgSatisfaction: 50,
        socialInteractions: [],
        discoveries: [],
      });
    } else {
      const entry = this.entries.get(zoneId)!;
      entry.lastVisited = now;
      entry.visitCount++;
    }
  }

  public recordSocialInteraction(otherAgentId: string): void {
    if (!this.currentZoneId) return;
    const entry = this.entries.get(this.currentZoneId);
    if (!entry || entry.socialInteractions.includes(otherAgentId)) return;
    entry.socialInteractions.push(otherAgentId);
  }

  public recordDiscovery(itemId: string): void {
    if (!this.currentZoneId) return;
    const entry = this.entries.get(this.currentZoneId);
    if (!entry || entry.discoveries.includes(itemId)) return;
    entry.discoveries.push(itemId);
  }

  /** Update satisfaction EMA. delta is the net drive change this tick (positive = improving). */
  public recordSatisfaction(delta: number): void {
    if (!this.currentZoneId) return;
    const entry = this.entries.get(this.currentZoneId);
    if (!entry) return;
    const normalized = Math.max(0, Math.min(100, 50 + delta * 10));
    entry.avgSatisfaction = entry.avgSatisfaction * 0.85 + normalized * 0.15;
  }

  /** Return the zone from `zoneIds` with the oldest `lastVisited` timestamp. */
  public getLeastVisitedZone(zoneIds: string[]): string {
    let leastVisited = zoneIds[0];
    let oldestTime = Infinity;

    for (const zoneId of zoneIds) {
      const entry = this.entries.get(zoneId);
      if (!entry) return zoneId; // never visited = top priority
      if (entry.lastVisited < oldestTime) {
        oldestTime = entry.lastVisited;
        leastVisited = zoneId;
      }
    }
    return leastVisited;
  }

  /** Compact string injected into the LLM context. */
  public toContextString(): string {
    if (this.entries.size === 0) return "You have not explored any zone yet.";

    const now = Date.now();
    const lines: string[] = [];

    for (const entry of this.entries.values()) {
      const minsAgo = Math.round((now - entry.lastVisited) / 60_000);
      const timeStr = minsAgo < 1 ? "just now" : `${minsAgo}m ago`;
      const discStr =
        entry.discoveries.length > 0
          ? `, discovered: ${entry.discoveries.slice(-2).join(", ")}`
          : "";
      lines.push(
        `${entry.zoneName}: last visited ${timeStr}, ${Math.round(entry.totalDuration)}s spent${discStr}`,
      );
    }

    return lines.join(" | ");
  }

  public getEntry(zoneId: string): SpatialMemoryEntry | undefined {
    return this.entries.get(zoneId);
  }

  public getCurrentZone(): string | null {
    return this.currentZoneId;
  }

  public getAllEntries(): SpatialMemoryEntry[] {
    return Array.from(this.entries.values());
  }
}
