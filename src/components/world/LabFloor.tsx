"use client";

import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";
import { createMaterials } from "@/systems/Materials";
import { createRingExtrudeGeometry } from "@/components/world/donutFloorGeometry";
import {
  DEFAULT_LAB_HUB,
  DEFAULT_RING_CURVE_SEGMENTS,
  DEFAULT_RING_INNER_RADIUS,
  DEFAULT_RING_OUTER_RADIUS,
  type LabHubCenter,
} from "@/components/world/labFloorConstants";

const FOUNDATION_HEIGHT = 6;
const SLAB_THICKNESS = 0.4;

export interface LabFloorProps {
  hubCenter?: LabHubCenter;
  innerRadius?: number;
  outerRadius?: number;
  curveSegments?: number;
}

/**
 * Donut-shaped foundation + tiled slab (open center, no inner wall). Registers collidables only.
 */
export default function LabFloor({
  hubCenter = DEFAULT_LAB_HUB,
  innerRadius = DEFAULT_RING_INNER_RADIUS,
  outerRadius = DEFAULT_RING_OUTER_RADIUS,
  curveSegments = DEFAULT_RING_CURVE_SEGMENTS,
}: LabFloorProps) {
  const addCollidableMesh = useGameStore((state) => state.addCollidableMesh);
  const removeCollidableMesh = useGameStore(
    (state) => state.removeCollidableMesh,
  );

  const groundRef = useRef<THREE.Mesh>(null);
  const floorRef = useRef<THREE.Mesh>(null);

  const { materials } = useMemo(() => ({ materials: createMaterials() }), []);

  const groundGeometry = useMemo(
    () =>
      createRingExtrudeGeometry(
        innerRadius,
        outerRadius,
        FOUNDATION_HEIGHT,
        curveSegments,
      ),
    [innerRadius, outerRadius, curveSegments],
  );

  const floorGeometry = useMemo(
    () =>
      createRingExtrudeGeometry(
        innerRadius,
        outerRadius,
        SLAB_THICKNESS,
        curveSegments,
      ),
    [innerRadius, outerRadius, curveSegments],
  );

  useEffect(
    () => () => {
      groundGeometry.dispose();
    },
    [groundGeometry],
  );

  useEffect(
    () => () => {
      floorGeometry.dispose();
    },
    [floorGeometry],
  );

  useEffect(() => {
    const ground = groundRef.current;
    const floor = floorRef.current;
    const groundUuid = ground?.uuid;
    const floorUuid = floor?.uuid;
    if (ground) addCollidableMesh(ground);
    if (floor) addCollidableMesh(floor);
    return () => {
      if (groundUuid) removeCollidableMesh(groundUuid);
      if (floorUuid) removeCollidableMesh(floorUuid);
    };
  }, [addCollidableMesh, removeCollidableMesh, groundGeometry, floorGeometry]);

  const { x, y, z } = hubCenter;

  return (
    <group name="LabFloor">
      <mesh
        ref={groundRef}
        geometry={groundGeometry}
        position={[x, 0, z]}
        receiveShadow
        userData={{
          type: "Structure",
          id: "ground-main",
          name: "Lab Ground",
        }}
        onUpdate={(self) => {
          self.layers.enable(1);
        }}
      >
        <meshStandardMaterial color="#2a2f38" />
      </mesh>

      <mesh
        ref={floorRef}
        name="Floor-Main-Slab"
        geometry={floorGeometry}
        position={[x, y - SLAB_THICKNESS / 2, z]}
        receiveShadow
        userData={{
          type: "Structure",
          id: "Floor-Main-Slab",
          name: "Lab Floor",
        }}
        onUpdate={(self) => {
          self.layers.enable(1);
        }}
      >
        <primitive object={materials.tile} attach="material" />
      </mesh>
    </group>
  );
}
