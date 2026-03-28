"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";
import { createMaterials } from "@/components/systems/Materials";
import {
  DEFAULT_LAB_FLOOR_DEPTH,
  DEFAULT_LAB_FLOOR_WIDTH,
  DEFAULT_LAB_HUB,
  type LabHubCenter,
} from "@/components/world/labFloorConstants";
import {
  buildFloorPerimeterWalls,
  mergeWallSegmentGeometries,
  type FloorPerimeterParams,
} from "@/components/world/perimeterWallBuild";

export type FloorPerimeterWallsProps = Partial<FloorPerimeterParams> & {
  /** When false, nothing is rendered and no physics registration runs. */
  enabled?: boolean;
};

function buildParams(
  hubCenter: LabHubCenter,
  bWidth: number,
  bDepth: number,
  wallHeight: number | undefined,
  wallThickness: number | undefined,
  southWindow: boolean,
): FloorPerimeterParams {
  return {
    hubCenter: { x: hubCenter.x, y: hubCenter.y, z: hubCenter.z },
    bWidth,
    bDepth,
    wallHeight,
    wallThickness,
    southWindow,
  };
}

/**
 * Perimeter walls around the lab floor: one merged mesh for all solid faces (fewer draw calls),
 * optional separate glass south face, shared materials, Yuka OBB obstacles + BVH collidables.
 */
export default function FloorPerimeterWalls({
  enabled = true,
  hubCenter = DEFAULT_LAB_HUB,
  bWidth = DEFAULT_LAB_FLOOR_WIDTH,
  bDepth = DEFAULT_LAB_FLOOR_DEPTH,
  wallHeight,
  wallThickness,
  southWindow = false,
}: FloorPerimeterWallsProps) {
  const addCollidableMesh = useGameStore((state) => state.addCollidableMesh);
  const removeCollidableMesh = useGameStore(
    (state) => state.removeCollidableMesh,
  );
  const addObstacles = useGameStore((state) => state.addObstacles);
  const removeObstacles = useGameStore((state) => state.removeObstacles);

  const rootRef = useRef<THREE.Group>(null);

  const { segments, obstacles } = useMemo(
    () =>
      buildFloorPerimeterWalls(
        buildParams(
          hubCenter,
          bWidth,
          bDepth,
          wallHeight,
          wallThickness,
          southWindow,
        ),
      ),
    [hubCenter, bWidth, bDepth, wallHeight, wallThickness, southWindow],
  );

  const solidSegments = useMemo(
    () => segments.filter((s) => !s.isWindow),
    [segments],
  );
  const glassSegments = useMemo(
    () => segments.filter((s) => s.isWindow),
    [segments],
  );

  const mergedSolidGeometry = useMemo(
    () => mergeWallSegmentGeometries(solidSegments),
    [solidSegments],
  );

  const { concreteMat, glassMat } = useMemo(() => {
    const { concrete } = createMaterials();
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xc0dff0,
      metalness: 0,
      roughness: 0,
      transmission: 0.92,
      transparent: true,
      thickness: 0.5,
    });
    return { concreteMat: concrete, glassMat: glass };
  }, []);

  useEffect(
    () => () => {
      mergedSolidGeometry?.dispose();
    },
    [mergedSolidGeometry],
  );

  useEffect(
    () => () => {
      glassMat.dispose();
    },
    [glassMat],
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
    <group ref={rootRef} name="FloorPerimeterWalls">
      {mergedSolidGeometry ? (
        <mesh
          name="Walls-Solid-Merged"
          geometry={mergedSolidGeometry}
          receiveShadow
          castShadow
          userData={{
            type: "Structure",
            id: "walls-solid-merged",
            name: "Perimeter walls",
          }}
          onUpdate={(self) => {
            self.layers.enable(1);
          }}
        >
          <primitive object={concreteMat} attach="material" />
        </mesh>
      ) : null}

      {glassSegments.map((w, i) => (
        <mesh
          key={`${w.name}-${i}`}
          name={w.name}
          position={new THREE.Vector3(...w.pos)}
          rotation={[0, w.rot ?? 0, 0]}
          receiveShadow
          castShadow
          userData={{
            type: "Structure",
            id: w.name,
            name: w.name.replace(/-/g, " "),
          }}
          onUpdate={(self) => {
            self.layers.enable(1);
          }}
        >
          <boxGeometry args={w.args} />
          <primitive object={glassMat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}
