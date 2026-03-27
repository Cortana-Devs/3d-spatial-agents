"use client";

/**
 * Minimal world: same ground + main floor slab as ResearchLabHub (OfficeHub.tsx),
 * without walls, ceiling, furniture, or props. Full lab remains in the codebase
 * — switch back in Scene.tsx via USE_FULL_RESEARCH_LAB.
 *
 * Omitted from the scene (still defined in ResearchLabHub):
 * - Building shell: all wall meshes, ceiling, inner dividers, windows
 * - ConferenceTable, OfficeChair, LabWorkbench, OfficeDesk, CupboardUnit,
 *   ManagersDesk, SmallRack, Sofa, TV, CoffeeStation (+ CoffeeMachine, CoffeeCup),
 *   ProjectorScreen, OfficeDoor, WallSwitch, Whiteboard, CeilingLight
 * - Props: Laptop, FileFolder, PenDrive, Telephone, FlowerPot, Text labels, etc.
 */
import React, { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";
import { createMaterials } from "@/components/systems/Materials";

export default function MinimalFloorWorld() {
  const addCollidableMesh = useGameStore((state) => state.addCollidableMesh);
  const removeCollidableMesh = useGameStore(
    (state) => state.removeCollidableMesh,
  );
  const addObstacles = useGameStore((state) => state.addObstacles);
  const removeObstacles = useGameStore((state) => state.removeObstacles);

  const groundRef = useRef<THREE.Mesh>(null);
  const floorRef = useRef<THREE.Mesh>(null);

  const hubCenter = useMemo(() => new THREE.Vector3(0, 4, 0), []);
  const bWidth = 200;
  const bDepth = 150;

  const { materials } = useMemo(() => {
    const mats = createMaterials();
    return { materials: mats };
  }, []);

  const emptyObstacles = useMemo(() => [] as never[], []);

  useEffect(() => {
    if (groundRef.current) addCollidableMesh(groundRef.current);
    if (floorRef.current) addCollidableMesh(floorRef.current);
    addObstacles(emptyObstacles);
    return () => {
      if (groundRef.current) removeCollidableMesh(groundRef.current.uuid);
      if (floorRef.current) removeCollidableMesh(floorRef.current.uuid);
      removeObstacles(emptyObstacles);
    };
  }, [
    addCollidableMesh,
    removeCollidableMesh,
    addObstacles,
    removeObstacles,
    emptyObstacles,
  ]);

  return (
    <group>
      <mesh
        ref={groundRef}
        position={[hubCenter.x, hubCenter.y - 1, hubCenter.z]}
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
        <boxGeometry args={[bWidth + 10, 5, bDepth + 10]} />
        <meshStandardMaterial color="#2a2f38" />
      </mesh>

      <mesh
        ref={floorRef}
        name="Floor-Main-Slab"
        position={[hubCenter.x, hubCenter.y - 0.2, hubCenter.z]}
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
        <boxGeometry args={[bWidth, 0.4, bDepth]} />
        <primitive object={materials.tile} attach="material" />
      </mesh>
    </group>
  );
}
