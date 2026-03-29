/**
 * Zone Influence System
 *
 * Each physical zone in the world registers an influence profile. The agent brain
 * reads the current zone on every LLM tick and:
 *   1. Applies per-second drive modifiers (passive restoration / depletion).
 *   2. Injects a mood label and environment description into the LLM system prompt.
 *
 * This makes the world feel alive — the garden heals, the workshop focuses,
 * the observatory inspires wonder — without requiring hard-coded agent behavior.
 */

import * as THREE from "three";
import type { AgentDrives } from "@/lib/agent-drives";

export interface ZoneInfluence {
  zoneId: string;
  zoneName: string;
  center: THREE.Vector3;
  /** Radius within which the zone influence applies. */
  radius: number;
  /**
   * Per-second drive modifiers while inside the zone.
   * Positive = recover; negative = deplete.
   */
  effects: Partial<Record<keyof AgentDrives, number>>;
  /** Short adjective for the zone mood — injected into LLM as "The atmosphere feels X." */
  moodLabel: string;
  /** One or two sentences injected into LLM describing the environment. */
  environmentDescription: string;
}

class ZoneInfluenceSystemImpl {
  private static instance: ZoneInfluenceSystemImpl;
  private zones: Map<string, ZoneInfluence> = new Map();

  private constructor() {}

  public static getInstance(): ZoneInfluenceSystemImpl {
    if (!ZoneInfluenceSystemImpl.instance) {
      ZoneInfluenceSystemImpl.instance = new ZoneInfluenceSystemImpl();
    }
    return ZoneInfluenceSystemImpl.instance;
  }

  public register(zone: ZoneInfluence): void {
    this.zones.set(zone.zoneId, zone);
  }

  public unregister(zoneId: string): void {
    this.zones.delete(zoneId);
  }

  /**
   * Returns the zone the agent is currently in.
   * If the agent is inside multiple zones, the nearest center wins.
   */
  public getCurrentZone(agentPosition: THREE.Vector3): ZoneInfluence | null {
    let nearest: ZoneInfluence | null = null;
    let nearestDist = Infinity;

    for (const zone of this.zones.values()) {
      const dist = agentPosition.distanceTo(zone.center);
      if (dist <= zone.radius && dist < nearestDist) {
        nearestDist = dist;
        nearest = zone;
      }
    }

    return nearest;
  }

  /**
   * Apply zone drive effects to a drives object for one frame tick.
   * Returns a new drives object with updated values (0–100 clamped).
   */
  public applyEffects(
    drives: AgentDrives,
    agentPosition: THREE.Vector3,
    deltaSec: number,
  ): AgentDrives {
    const zone = this.getCurrentZone(agentPosition);
    if (!zone) return drives;

    const updated = { ...drives };
    for (const [key, rate] of Object.entries(zone.effects) as [
      keyof AgentDrives,
      number,
    ][]) {
      if (updated[key] !== undefined) {
        updated[key] = Math.max(
          0,
          Math.min(100, updated[key] + rate * deltaSec),
        );
      }
    }
    return updated;
  }

  /**
   * Returns a sentence describing the current zone for LLM injection.
   * Falls back to a generic description if the agent is between zones.
   */
  public getContextString(agentPosition: THREE.Vector3): string {
    const zone = this.getCurrentZone(agentPosition);
    if (!zone)
      return "You are in an open transitional area between zones. The Ring stretches around you.";
    return `You are in the ${zone.zoneName}. ${zone.environmentDescription} The atmosphere feels ${zone.moodLabel}.`;
  }

  public getAllZones(): ZoneInfluence[] {
    return Array.from(this.zones.values());
  }

  public getZoneById(zoneId: string): ZoneInfluence | undefined {
    return this.zones.get(zoneId);
  }
}

export const ZoneInfluenceSystem = ZoneInfluenceSystemImpl.getInstance();
