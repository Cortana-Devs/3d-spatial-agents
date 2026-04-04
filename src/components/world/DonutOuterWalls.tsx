"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";
import { createMaterials } from "@/lib/materials";
import {
  DEFAULT_LAB_HUB,
  DEFAULT_RING_OUTER_RADIUS,
  DEFAULT_RING_WALL_SEGMENTS,
  type LabHubCenter,
} from "@/components/world/labFloorConstants";
import {
  buildDonutOuterWallSegments,
  mergeWallSegmentGeometries,
} from "@/components/world/perimeterWallBuild";

export interface DonutOuterWallsProps {
  enabled?: boolean;
  hubCenter?: LabHubCenter;
  outerRadius?: number;
  wallHeight?: number;
  wallThickness?: number;
  segmentCount?: number;
}

/**
 * Single outer circular wall (faceted OBBs), no inner wall around the hole.
 */
export default function DonutOuterWalls({
  enabled = true,
  hubCenter = DEFAULT_LAB_HUB,
  outerRadius = DEFAULT_RING_OUTER_RADIUS,
  wallHeight,
  wallThickness,
  segmentCount = DEFAULT_RING_WALL_SEGMENTS,
}: DonutOuterWallsProps) {
  const addCollidableMesh = useGameStore((state) => state.addCollidableMesh);
  const removeCollidableMesh = useGameStore(
    (state) => state.removeCollidableMesh,
  );
  const addObstacles = useGameStore((state) => state.addObstacles);
  const removeObstacles = useGameStore((state) => state.removeObstacles);

  const rootRef = useRef<THREE.Group>(null);

  const { segments, obstacles } = useMemo(
    () =>
      buildDonutOuterWallSegments({
        hubCenter: { x: hubCenter.x, y: hubCenter.y, z: hubCenter.z },
        outerRadius,
        wallHeight,
        wallThickness,
        segmentCount,
      }),
    [hubCenter, outerRadius, wallHeight, wallThickness, segmentCount],
  );

  const mergedSolidGeometry = useMemo(
    () => mergeWallSegmentGeometries(segments),
    [segments],
  );

  const concreteMat = useMemo(() => createMaterials().concrete, []);

  useEffect(
    () => () => {
      mergedSolidGeometry?.dispose();
    },
    [mergedSolidGeometry],
  );

  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    if (!root) return;
    const groupUuid = root.uuid;
    addCollidableMesh(root);
    addObstacles(obstacles);
    return () => {
      removeCollidableMesh(groupUuid);
      removeObstacles(obstacles);
    };
  }, [
    enabled,
    obstacles,
    addCollidableMesh,
    removeCollidableMesh,
    addObstacles,
    removeObstacles,
  ]);

  if (!enabled) return null;

  return (
    <group ref={rootRef} name="DonutOuterWalls">
      {mergedSolidGeometry ? (
        <mesh
          name="Walls-Outer-Merged"
          geometry={mergedSolidGeometry}
          receiveShadow
          castShadow
          userData={{
            type: "Structure",
            id: "walls-outer-merged",
            name: "Outer ring wall",
          }}
          onUpdate={(self) => {
            self.layers.enable(1);
          }}
        >
          <primitive object={concreteMat} attach="material" />
        </mesh>
      ) : null}
    </group>
  );
}
