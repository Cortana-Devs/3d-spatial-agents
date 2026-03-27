/**
 * Park Routines — Agent startup and zone-specific positions for GuangmingPark.
 *
 * Replaces the OfficeHub-specific agentRoutines.ts for the park world.
 * Zone centers, bench positions, and podium locations are defined here.
 */

import * as THREE from "three";

// ============================================================================
// Zone centers (world-space XZ, Y = floor level 4)
// ============================================================================

export const ZONE_CENTERS: Record<string, THREE.Vector3> = {
  observatory: new THREE.Vector3(0, 4, -52),
  workshop:    new THREE.Vector3(47, 4, 0),
  garden:      new THREE.Vector3(0, 4, 0),
  arena:       new THREE.Vector3(-47, 4, 0),
  gallery:     new THREE.Vector3(0, 4, 52),
};

export const ALL_ZONE_IDS = ["observatory", "workshop", "garden", "arena", "gallery"];

// ============================================================================
// Bench / rest positions per zone (where agents sit or stand nearby)
// ============================================================================

export const BENCH_POSITIONS: Record<string, THREE.Vector3[]> = {
  observatory: [
    new THREE.Vector3(-6, 4, -57),
    new THREE.Vector3(6, 4, -57),
  ],
  garden: [
    new THREE.Vector3(0, 4, -12),
    new THREE.Vector3(12, 4, 0),
    new THREE.Vector3(0, 4, 12),
    new THREE.Vector3(-12, 4, 0),
  ],
  arena: [
    new THREE.Vector3(-45, 4, -5),
    new THREE.Vector3(-45, 4, 0),
    new THREE.Vector3(-45, 4, 5),
    new THREE.Vector3(-48, 4, -5),
    new THREE.Vector3(-48, 4, 0),
    new THREE.Vector3(-48, 4, 5),
  ],
};

// Arena podium position
export const ARENA_PODIUM_POS = new THREE.Vector3(-54, 4, 0);

// Gallery discovery station position
export const GALLERY_DISCOVERY_POS = new THREE.Vector3(0, 4, 48);

// Workshop project table
export const WORKSHOP_PROJECT_TABLE_POS = new THREE.Vector3(52, 4, 0);

// ============================================================================
// Helpers
// ============================================================================

/** Get the center position for a zone by ID. */
export function getZoneCenterPosition(zoneId: string): THREE.Vector3 | null {
  return ZONE_CENTERS[zoneId]?.clone() ?? null;
}

/** Get a rest position (bench) for the given zone. Returns a random bench in that zone. */
export function getRestPositionForZone(zoneId: string): THREE.Vector3 | null {
  const benches = BENCH_POSITIONS[zoneId];
  if (!benches || benches.length === 0) {
    // Fall back to zone center
    return ZONE_CENTERS[zoneId]?.clone() ?? null;
  }
  return benches[Math.floor(Math.random() * benches.length)].clone();
}

/** Get the preferred initial exploration zone for an agent from its personality. */
export function getStartingZoneForAgent(agentId: string, preferredZones: string[]): string {
  return preferredZones[0] ?? "garden";
}

/** Nearest bench to a given world position (across all zones). */
export function getNearestBench(position: THREE.Vector3): THREE.Vector3 | null {
  let best: THREE.Vector3 | null = null;
  let bestDist = Infinity;

  for (const benches of Object.values(BENCH_POSITIONS)) {
    for (const bench of benches) {
      const dist = position.distanceTo(bench);
      if (dist < bestDist) {
        bestDist = dist;
        best = bench;
      }
    }
  }

  return best?.clone() ?? null;
}
