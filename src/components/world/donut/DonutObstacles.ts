import * as THREE from "three";
import { Obstacle } from "@/store/gameStore";
import { DEFAULT_LAB_HUB, DEFAULT_RING_OUTER_RADIUS } from "./labFloorConstants";

// Park layout — must match DonutLabWorld.tsx
const POND_RADIUS = 16.0;
// Only the fishing dock bench remains — obstacle inlined directly below.
const TREE_POSITIONS: [number, number][] = [
  [-14, 16],
  [18, 20],
  [-22, -15],
  [12, -20],
];

export function buildDonutObstacles(): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const cx = DEFAULT_LAB_HUB.x;
  const cy = DEFAULT_LAB_HUB.y;
  const cz = DEFAULT_LAB_HUB.z;

  // ─────────────────────────────────────────────────────────────────────────
  // 1. POND — 20 thin OBB arc-segments arranged as a tight circle.
  //    Each segment is a flat wall tangent to the pond edge, ~3 units tall.
  //    This replaces the single huge sphere that was r=17.
  // ─────────────────────────────────────────────────────────────────────────
  const POND_SEGS = 20;
  const POND_WALL_H  = 6;     // tall enough to stop agents
  const POND_WALL_W  = (2 * Math.PI * POND_RADIUS) / POND_SEGS + 0.4; // arc length + overlap
  const POND_WALL_D  = 0.6;   // thin wall
  for (let i = 0; i < POND_SEGS; i++) {
    const angle = (i / POND_SEGS) * Math.PI * 2;
    const midAngle = angle + (Math.PI / POND_SEGS); // center of segment
    obstacles.push({
      position: new THREE.Vector3(
        cx + Math.sin(midAngle) * (POND_RADIUS + 0.5),
        cy,
        cz + Math.cos(midAngle) * (POND_RADIUS + 0.5),
      ),
      halfExtents: new THREE.Vector3(POND_WALL_W / 2, POND_WALL_H / 2, POND_WALL_D / 2),
      rotation: midAngle,   // Y-axis rotation aligns the box tangent to circle
      type: "furniture",
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. OUTER WALL — 32 OBB segments matching the actual cylindrical glass wall
  //    at radius 95 (DEFAULT_RING_OUTER_RADIUS). 4 gaps are left for the doors
  //    (at angles 0°, 90°, 180°, 270°). Each door gap is ~6° wide.
  // ─────────────────────────────────────────────────────────────────────────
  const OUTER_SEGS  = 32;
  const DOOR_ANGLES = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]; // door centers
  const DOOR_GAP_RAD = 0.14;  // ±0.14 rad (≈8°) gap around each door
  const WALL_ARC     = (2 * Math.PI) / OUTER_SEGS;
  const OUTER_WALL_W = DEFAULT_RING_OUTER_RADIUS * WALL_ARC + 0.5; // arc length + slight overlap
  const OUTER_WALL_H = 18;   // covers the full wall height
  const OUTER_WALL_D = 1.2;

  for (let i = 0; i < OUTER_SEGS; i++) {
    const segAngle = (i / OUTER_SEGS) * Math.PI * 2;
    const midAngle = segAngle + WALL_ARC / 2;

    // Skip segments that overlap a door opening
    let nearDoor = false;
    for (const da of DOOR_ANGLES) {
      let diff = Math.abs(midAngle - da) % (Math.PI * 2);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < DOOR_GAP_RAD) { nearDoor = true; break; }
    }
    if (nearDoor) continue;

    obstacles.push({
      position: new THREE.Vector3(
        cx + Math.sin(midAngle) * DEFAULT_RING_OUTER_RADIUS,
        cy,
        cz + Math.cos(midAngle) * DEFAULT_RING_OUTER_RADIUS,
      ),
      halfExtents: new THREE.Vector3(OUTER_WALL_W / 2, OUTER_WALL_H / 2, OUTER_WALL_D / 2),
      rotation: midAngle,
      type: "wall",
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. OUTER PERIMETER BOUNDARY — tight ring at r=155 to stop agents ever
  //    walking off the concrete plaza edge. Replaces the 16 giant r=35 spheres.
  // ─────────────────────────────────────────────────────────────────────────
  const BORDER_R     = 155;
  const BORDER_SEGS  = 24;
  const BORDER_ARC    = (2 * Math.PI) / BORDER_SEGS;
  const BORDER_W      = BORDER_R * BORDER_ARC + 1.0;
  const BORDER_H      = 20;
  const BORDER_D      = 3.0;
  for (let i = 0; i < BORDER_SEGS; i++) {
    const midAngle = ((i + 0.5) / BORDER_SEGS) * Math.PI * 2;
    obstacles.push({
      position: new THREE.Vector3(
        cx + Math.sin(midAngle) * BORDER_R,
        cy,
        cz + Math.cos(midAngle) * BORDER_R,
      ),
      halfExtents: new THREE.Vector3(BORDER_W / 2, BORDER_H / 2, BORDER_D / 2),
      rotation: midAngle,
      type: "wall",
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. TREE TRUNKS — small cylinder-approximated box per tree
  //    Matches the trunk geometry (CylinderGeometry r≈0.2..0.4 * scale ~3)
  // ─────────────────────────────────────────────────────────────────────────
  for (const [tx, tz] of TREE_POSITIONS) {
    obstacles.push({
      position: new THREE.Vector3(cx + tx, cy, cz + tz),
      halfExtents: new THREE.Vector3(0.9, 8, 0.9),  // radius ≈ 0.4 * scale 3 + margin
      rotation: 0,
      type: "furniture",
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. BENCH — one wide dock bench (widthScale 2.8)
  //    halfExtents.x = benchHalfWidth * widthScale = 2.8 * 2.8 ≈ 7.8
  //    halfExtents.z = bench depth, rotation = -PI/2 (oriented N-S along dock)
  // ─────────────────────────────────────────────────────────────────────────
  obstacles.push({
    position: new THREE.Vector3(cx + 15.5, cy, cz + 0),
    halfExtents: new THREE.Vector3(7.8, 2.5, 1.2), // wide footprint for 3-player bench
    rotation: -Math.PI / 2,
    type: "furniture",
  });

  return obstacles;
}
