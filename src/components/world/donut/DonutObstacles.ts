import * as THREE from "three";
import { Obstacle } from "@/store/gameStore";
import { DEFAULT_LAB_HUB } from "./labFloorConstants";

export function buildDonutObstacles(): Obstacle[] {
  const obstacles: Obstacle[] = [];

  // 1. The Pond (Center Park) Exclusion Zone
  // The pond has radius 14.8, we use radius 18 to give agents a safe margin
  obstacles.push({
    position: new THREE.Vector3(DEFAULT_LAB_HUB.x, DEFAULT_LAB_HUB.y, DEFAULT_LAB_HUB.z),
    radius: 17,
    type: "furniture",
  });

  // 2. Outer Ring Boundary
  // We place 16 overlapping invisible spheres around the perimeter (radius ~155)
  // to create an invisible wall holding agents inside the walkable plaza.
  const BOUNDARY_RADIUS = 158;
  const SPHERE_RADIUS = 35; // Large overlapping spheres to block paths
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    obstacles.push({
      position: new THREE.Vector3(
        DEFAULT_LAB_HUB.x + Math.sin(angle) * BOUNDARY_RADIUS,
        DEFAULT_LAB_HUB.y,
        DEFAULT_LAB_HUB.z + Math.cos(angle) * BOUNDARY_RADIUS
      ),
      radius: SPHERE_RADIUS,
      type: "wall",
    });
  }
  
  // 3. Center Ring exclusion
  // Agents should primarily enter through the doors. We block the glass wall arcs.
  const INNER_BOUNDARY = 38;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    // Offset angle to avoid blocking the sliding doors which are at 0, 90, 180, 270 deg.
    const wallAngle = angle + (Math.PI / 8); 
    obstacles.push({
      position: new THREE.Vector3(
        DEFAULT_LAB_HUB.x + Math.sin(wallAngle) * INNER_BOUNDARY,
        DEFAULT_LAB_HUB.y,
        DEFAULT_LAB_HUB.z + Math.cos(wallAngle) * INNER_BOUNDARY
      ),
      radius: 5.5,
      type: "wall",
    });
  }

  return obstacles;
}
