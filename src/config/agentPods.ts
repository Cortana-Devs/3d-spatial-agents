import * as THREE from "three";
import {
  DEFAULT_LAB_HUB,
  DEFAULT_RING_OUTER_RADIUS,
} from "@/components/world/donut/labFloorConstants";
import type { GameInteractable } from "@/store/gameStoreTypes";

/** Outer walk radius — matches DonutLabFurniture OUTER_WALK. */
export const AGENT_POD_RING_RADIUS = DEFAULT_RING_OUTER_RADIUS - 6;

/** Five pods evenly spaced (degrees). 0° = +Z in ring space (same as furniture). */
export const AGENT_POD_ANGLES_DEG = [345, 72, 144, 216, 288] as const;

export type AgentPodLayoutSpec = {
  id: string;
  angle: number;
  facingY: number;
  worldPosition: { x: number; y: number; z: number };
};

function buildLayout(): AgentPodLayoutSpec[] {
  return AGENT_POD_ANGLES_DEG.map((deg, i) => {
    const angle = (deg * Math.PI) / 180;
    const x = DEFAULT_LAB_HUB.x + Math.sin(angle) * AGENT_POD_RING_RADIUS;
    const z = DEFAULT_LAB_HUB.z + Math.cos(angle) * AGENT_POD_RING_RADIUS;
    const facingY = angle + Math.PI;
    return {
      id: `pod-0${i + 1}`,
      angle,
      facingY,
      worldPosition: { x, y: DEFAULT_LAB_HUB.y, z },
    };
  });
}

export const AGENT_POD_LAYOUT: AgentPodLayoutSpec[] = buildLayout();

export function getPodLayoutById(podId: string): AgentPodLayoutSpec | undefined {
  return AGENT_POD_LAYOUT.find((p) => p.id === podId);
}

/** Stand point inside the pod (dock). */
export function getPodDockWorldPosition(podId: string): THREE.Vector3 | null {
  const spec = getPodLayoutById(podId);
  if (!spec) return null;
  const { x, y, z } = spec.worldPosition;
  const dockPos = new THREE.Vector3(x, y + 0.2, z);

  // Offset the dock position slightly backwards (towards the spine)
  // local -Z is outwards (towards the wall)
  // Wait, in my AgentPodsGroup.tsx, spine is at local Z = -1.35
  // And local +Z is inward towards the lab center.
  // So to be closer to the spine, we need to move in local -Z direction.
  const angle = spec.angle;
  // World direction for local -Z:
  // Since facingY = angle + PI, local +Z is towards center.
  // So local -Z is towards outer wall.
  // Let's use the facing direction to offset.
  const offsetDir = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)); // This is outwards
  dockPos.add(offsetDir.multiplyScalar(0.8));

  return dockPos;
}

export function getPodLookAtWorldPosition(podId: string): THREE.Vector3 | null {
  const spec = getPodLayoutById(podId);
  if (!spec) return null;
  // Make the agent look toward the center of the lab (face outwards from the pod)
  // The pod is on the outer ring, so looking towards (0,y,0) accomplishes this
  return new THREE.Vector3(DEFAULT_LAB_HUB.x, spec.worldPosition.y + 4.0, DEFAULT_LAB_HUB.z);
}

/**
 * A few units inward (toward lab center) so the agent walks out of the alcove.
 */
export function getPodDeployExitPosition(podId: string): THREE.Vector3 | null {
  const spec = getPodLayoutById(podId);
  if (!spec) return null;
  const { x, y, z } = spec.worldPosition;
  const inward = new THREE.Vector3(-x, 0, -z);
  if (inward.lengthSq() < 1e-6) inward.set(0, 0, -1);
  inward.normalize().multiplyScalar(8);
  return new THREE.Vector3(x + inward.x, y + 1, z + inward.z);
}

export function buildPodInteractables(): GameInteractable[] {
  return AGENT_POD_LAYOUT.map((spec) => ({
    id: spec.id,
    type: "pod",
    position: new THREE.Vector3(
      spec.worldPosition.x,
      spec.worldPosition.y + 4.0,
      spec.worldPosition.z,
    ),
    rotation: new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, spec.facingY, 0),
    ),
    name: `Agent Pod ${spec.id.replace("pod-", "")}`,
    description: "Deploy or recall research agents. Full neural activation when deployed.",
  }));
}
