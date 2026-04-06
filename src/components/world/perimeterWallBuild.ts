import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Obstacle } from "@/store/gameStore";

/** One axis-aligned wall strip: same layout as OfficeHub `wallGeoms` entries. */
export interface FloorWallSegment {
  pos: [number, number, number];
  args: [number, number, number];
  rot?: number;
  name: string;
  isWindow?: boolean;
}

export interface FloorPerimeterParams {
  hubCenter: { x: number; y: number; z: number };
  bWidth: number;
  bDepth: number;
  /** Vertical extent of walls (matches OfficeHub default 30). */
  wallHeight?: number;
  wallThickness?: number;
  /** If true, south wall uses thin glass like the full lab; otherwise solid concrete. */
  southWindow?: boolean;
}

/**
 * Four perimeter walls around the main floor rectangle (same bounds as the floor slab).
 * Geometry and OBB obstacles match `ResearchLabHub` / OfficeHub `createWall` behavior.
 */
export function buildFloorPerimeterWalls(
  p: FloorPerimeterParams,
): { segments: FloorWallSegment[]; obstacles: Obstacle[] } {
  const {
    hubCenter,
    bWidth,
    bDepth,
    wallHeight = 30,
    wallThickness = 1.0,
    southWindow = false,
  } = p;

  const segments: FloorWallSegment[] = [];
  const obstacles: Obstacle[] = [];

  const createWall = (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    name: string,
    thickness: number = wallThickness,
    isWindow: boolean = false,
  ) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const ang = Math.atan2(z2 - z1, x2 - x1);
    const mx = (x1 + x2) / 2;
    const mz = (z1 + z2) / 2;

    segments.push({
      pos: [mx, hubCenter.y + wallHeight / 2, mz],
      args: [len, wallHeight, thickness],
      rot: -ang,
      name,
      isWindow,
    });

    obstacles.push({
      position: new THREE.Vector3(mx, hubCenter.y + wallHeight / 2, mz),
      radius: 0,
      type: "wall",
      halfExtents: new THREE.Vector3(len / 2, wallHeight / 2, thickness / 2),
      rotation: -ang,
    });
  };

  const left = hubCenter.x - bWidth / 2;
  const right = hubCenter.x + bWidth / 2;
  const front = hubCenter.z + bDepth / 2;
  const back = hubCenter.z - bDepth / 2;

  createWall(left, back, right, back, "Wall-North");
  createWall(right, back, right, front, "Wall-East");
  createWall(left, front, left, back, "Wall-West");
  createWall(left, front, right, front, "Wall-South", southWindow ? 0.2 : wallThickness, southWindow);

  return { segments, obstacles };
}

export interface FacilityOuterWallParams {
  hubCenter: { x: number; y: number; z: number };
  /** Outer edge of the walkable floor ring; wall sits just outside this radius. */
  outerRadius: number;
  wallHeight?: number;
  wallThickness?: number;
  segmentCount?: number;
}

/**
 * Faceted outer wall only (no inner cylinder). Segments lie on a circle through wall centers.
 */
export function buildFacilityOuterWallSegments(
  p: FacilityOuterWallParams,
): { segments: FloorWallSegment[]; obstacles: Obstacle[] } {
  const {
    hubCenter,
    outerRadius,
    wallHeight = 30,
    wallThickness = 1.0,
    segmentCount = 48,
  } = p;

  const segments: FloorWallSegment[] = [];
  const obstacles: Obstacle[] = [];
  const cx = hubCenter.x;
  const cz = hubCenter.z;
  const hubY = hubCenter.y;

  const Rm = outerRadius + wallThickness / 2;
  const halfAngle = Math.PI / segmentCount;

  for (let i = 0; i < segmentCount; i++) {
    const theta = (i + 0.5) * ((2 * Math.PI) / segmentCount);
    const t0 = theta - halfAngle;
    const t1 = theta + halfAngle;
    const x1 = cx + Math.cos(t0) * Rm;
    const z1 = cz + Math.sin(t0) * Rm;
    const x2 = cx + Math.cos(t1) * Rm;
    const z2 = cz + Math.sin(t1) * Rm;
    const len = Math.hypot(x2 - x1, z2 - z1);
    const wallRot = -Math.atan2(z2 - z1, x2 - x1);
    const mx = (x1 + x2) / 2;
    const mz = (z1 + z2) / 2;

    segments.push({
      pos: [mx, hubY + wallHeight / 2, mz],
      args: [len, wallHeight, wallThickness],
      rot: wallRot,
      name: `Wall-Outer-${i}`,
      isWindow: false,
    });

    obstacles.push({
      position: new THREE.Vector3(mx, hubY + wallHeight / 2, mz),
      radius: 0,
      type: "wall",
      halfExtents: new THREE.Vector3(len / 2, wallHeight / 2, wallThickness / 2),
      rotation: wallRot,
    });
  }

  return { segments, obstacles };
}

/**
 * Single draw-call mesh for all solid (non-window) segments. Caller owns disposal of the result.
 */
export function mergeWallSegmentGeometries(
  segments: FloorWallSegment[],
): THREE.BufferGeometry | null {
  if (segments.length === 0) return null;

  const parts: THREE.BufferGeometry[] = [];
  const yAxis = new THREE.Vector3(0, 1, 0);

  for (const seg of segments) {
    const g = new THREE.BoxGeometry(seg.args[0], seg.args[1], seg.args[2]);
    const quat = new THREE.Quaternion().setFromAxisAngle(
      yAxis,
      seg.rot ?? 0,
    );
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(seg.pos[0], seg.pos[1], seg.pos[2]),
      quat,
      new THREE.Vector3(1, 1, 1),
    );
    g.applyMatrix4(matrix);
    parts.push(g);
  }

  const merged = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return merged;
}
