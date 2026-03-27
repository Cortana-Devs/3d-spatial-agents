/**
 * Point of Interest Registry
 *
 * World zones register POIs (viewpoints, exhibits, landmarks, social spots).
 * The agent brain queries this registry when wonder or curiosity is low to find
 * something worth navigating to and appreciating.
 *
 * Novelty decays after a visit and slowly recovers over real time, so agents
 * revisit POIs after some time has passed.
 */

import * as THREE from "three";

export interface PointOfInterest {
  id: string;
  name: string;
  position: THREE.Vector3;
  /** Where to look (LOOK_AT target) when standing at this POI. */
  lookTarget: THREE.Vector3;
  /** Short description injected into the LLM context when the agent is near. */
  description: string;
  zoneId: string;
  category: "view" | "exhibit" | "landmark" | "social_spot" | "workspace";
  /**
   * How fast novelty recovers per real minute after a visit.
   * 0 = permanently boring after first visit; 1 = fully novel again after 1 minute.
   */
  noveltyDecay: number;
  /** 0–1. Decays toward 0 on visit; recovers over time via noveltyDecay. */
  currentNovelty: number;
}

export class POIRegistry {
  private static instance: POIRegistry;
  private pois: Map<string, PointOfInterest> = new Map();
  private lastUpdateTime: number = Date.now();

  private constructor() {}

  public static getInstance(): POIRegistry {
    if (!POIRegistry.instance) {
      POIRegistry.instance = new POIRegistry();
    }
    return POIRegistry.instance;
  }

  public register(poi: PointOfInterest): void {
    this.pois.set(poi.id, poi);
  }

  public unregister(id: string): void {
    this.pois.delete(id);
  }

  /**
   * Recover novelty for all POIs. Call this periodically (e.g. every few seconds
   * from a world component's useFrame, throttled).
   */
  public update(): void {
    const now = Date.now();
    const dtMinutes = (now - this.lastUpdateTime) / 60_000;
    this.lastUpdateTime = now;

    for (const poi of this.pois.values()) {
      poi.currentNovelty = Math.min(
        1.0,
        poi.currentNovelty + poi.noveltyDecay * dtMinutes,
      );
    }
  }

  /** Reduces novelty of a POI when an agent visits / appreciates it. */
  public markVisited(id: string): void {
    const poi = this.pois.get(id);
    if (poi) {
      poi.currentNovelty = Math.max(0, poi.currentNovelty - 0.8);
    }
  }

  /**
   * Returns the most novel POI within `maxRadius` of `position`.
   * Score = novelty / (distance + 1) — prefers novel AND nearby.
   */
  public getMostNovelNearby(
    position: THREE.Vector3,
    maxRadius: number = 200,
    minNovelty: number = 0.15,
  ): PointOfInterest | null {
    let best: PointOfInterest | null = null;
    let bestScore = -Infinity;

    for (const poi of this.pois.values()) {
      if (poi.currentNovelty < minNovelty) continue;
      const dist = position.distanceTo(poi.position);
      if (dist > maxRadius) continue;

      const score = poi.currentNovelty / (dist + 1);
      if (score > bestScore) {
        bestScore = score;
        best = poi;
      }
    }

    return best;
  }

  /** Get POIs in a specific zone, sorted by novelty descending. */
  public getPOIsInZone(zoneId: string): PointOfInterest[] {
    return Array.from(this.pois.values())
      .filter((p) => p.zoneId === zoneId)
      .sort((a, b) => b.currentNovelty - a.currentNovelty);
  }

  public getById(id: string): PointOfInterest | undefined {
    return this.pois.get(id);
  }

  public getAll(): PointOfInterest[] {
    return Array.from(this.pois.values());
  }
}
