/**
 * AgentPod.tsx — deprecated individual pod component.
 *
 * All rendering is now handled by AgentPodsGroup.tsx which uses InstancedMesh
 * for all 5 pods in 4 draw calls with zero dynamic lights and no
 * MeshPhysicalMaterial, eliminating the 60→15 FPS performance regression.
 *
 * This file is kept as an empty re-export stub to avoid breaking any stale
 * import references. ResearchFacilityFurniture.tsx uses AgentPodsGroup directly.
 */
export default function AgentPod(_props: {
  podId: string;
  position: [number, number, number];
  rotationY: number;
}) {
  return null;
}
