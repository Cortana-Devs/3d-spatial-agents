/**
 * Donut Lab Routines
 *
 * Single source of truth for zone positions, bench positions, and navigation
 * helpers for the Donut Research Lab world.
 *
 * All zone positions are derived DYNAMICALLY from ZoneInfluenceSystem at runtime,
 * which is registered by DonutLabWorld.tsx on mount. This means world layout
 * changes automatically propagate to agent navigation without touching this file.
 *
 * Replaces the old parkRoutines.ts (Guangming Science Park phantom zones).
 */

import * as THREE from "three";
import { ZoneInfluenceSystem } from "@/systems/ZoneInfluenceSystem";
import { InteractableRegistry } from "@/systems/InteractableRegistry";

// ============================================================================
// Zone IDs — must match what DonutLabWorld.tsx registers in ZoneInfluenceSystem
// ============================================================================

export const ALL_ZONE_IDS = [
  "center-park",
  "fishing-dock",
  "core-lab",
  "data-analysis",
  "break-room",
  "conference-area",
  "interior-ring",
  "exterior-plaza",
];

/** Human-readable names for each zone (for logging / UI). */
export const ZONE_NAMES: Record<string, string> = {
  "center-park":     "Center Garden",
  "fishing-dock":    "Fishing Dock",
  "core-lab":        "Core Lab",
  "data-analysis":   "Data Analysis Wing",
  "break-room":      "Break Room",
  "conference-area": "Conference Area",
  "interior-ring":   "Research Ring",
  "exterior-plaza":  "Exterior Plaza",
};

/** 
 * Semantic Location Aliases for LLM prompting.
 * These map common evocative names to the strict ALL_ZONE_IDS.
 */
export const SEMANTIC_LOCATION_MAP: Record<string, string> = {
  "Waterfall Dock": "fishing-dock",
  "Zen Garden": "center-park",
  "Fish Pond": "fishing-dock",
  "Main Research Lab": "core-lab",
  "Server Room": "data-analysis",
  "Kitchen": "break-room",
  "Meeting Arena": "conference-area",
  "Circular Hallway": "interior-ring",
  "Observation Deck": "exterior-plaza",
};

// ============================================================================
// Zone center resolution — dynamic, from ZoneInfluenceSystem
// ============================================================================

/**
 * Returns the world-space center Vector3 for a given zone ID.
 * Derives from ZoneInfluenceSystem to stay in sync with DonutLabWorld.tsx.
 */
export function getZoneCenterPosition(zoneId: string): THREE.Vector3 | null {
  const zone = ZoneInfluenceSystem.getZoneById(zoneId);
  return zone ? zone.center.clone() : null;
}

/**
 * Returns a random walkable position within the given zone radius.
 * Applies a small random offset from the zone center so agents don't
 * all converge on the exact same pixel.
 */
export function getRestPositionForZone(zoneId: string): THREE.Vector3 | null {
  const zone = ZoneInfluenceSystem.getZoneById(zoneId);
  if (!zone) return null;

  const angle = Math.random() * Math.PI * 2;
  const dist = Math.random() * Math.min(zone.radius * 0.5, 12); // stay well inside zone
  return new THREE.Vector3(
    zone.center.x + Math.cos(angle) * dist,
    zone.center.y,
    zone.center.z + Math.sin(angle) * dist,
  );
}

// ============================================================================
// Bench / rest positions — dynamic, from InteractableRegistry
// ============================================================================

/**
 * Returns the nearest bench/chair interactable to the given world position.
 * Queries InteractableRegistry so new benches added to DonutLabWorld.tsx
 * are automatically discovered.
 */
export function getNearestBench(position: THREE.Vector3): THREE.Vector3 | null {
  const registry = InteractableRegistry.getInstance();
  const nearby = registry.getNearby(position, 200); // search whole world

  let best: THREE.Vector3 | null = null;
  let bestDist = Infinity;

  for (const item of nearby) {
    if (item.type !== "chair") continue;
    const dist = position.distanceTo(item.position as unknown as THREE.Vector3);
    if (dist < bestDist) {
      bestDist = dist;
      best = (item.position as unknown as THREE.Vector3).clone();
    }
  }

  return best;
}

/**
 * Returns the preferred starting zone for an agent based on its personality.
 * Falls back to "center-park" if no preference is set.
 */
export function getStartingZoneForAgent(
  agentId: string,
  preferredZones: string[],
): string {
  return preferredZones[0] ?? "center-park";
}
