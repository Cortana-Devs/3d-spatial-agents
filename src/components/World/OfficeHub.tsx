import React, { useMemo, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";
import { createMaterials } from "../Systems/Materials";
import { Text } from "@react-three/drei";

import {
  OfficeChair,
  OfficeDesk,
  OfficeDoor,
  ConferenceTable,
  CeilingLight,
  WallSwitch,
  CupboardUnit,
  ManagersDesk,
  LabWorkbench,
} from "./Furniture";
import { Elevator } from "./Elevator";
import {
  FileFolder,
  Whiteboard,
  ProjectorScreen,
  Laptop,
  PenDrive,
  SmallRack,
  FlowerPot,
  Sofa,
  TV,
  CoffeeMachine,
  CoffeeCup,
  CoffeeStation,
} from "./Props";

interface Box {
  id: string;
  position: THREE.Vector3;
  claimedBy?: string; // ID of robot
}

export default function ResearchLabHub() {
  const addCollidableMesh = useGameStore((state) => state.addCollidableMesh);
  const removeCollidableMesh = useGameStore(
    (state) => state.removeCollidableMesh,
  );
  const addObstacles = useGameStore((state) => state.addObstacles);
  const removeObstacles = useGameStore((state) => state.removeObstacles);

  const groundRef = useRef<THREE.Mesh>(null);
  const buildingRef = useRef<THREE.Group>(null);

  // Position: Center of the World
  const hubCenter = new THREE.Vector3(0, 4, 0);
  const hubSize = 400; // Large Island

  // Building Specs
  const bWidth = 200;
  const bDepth = 150;
  const bHeight = 30;

  // --- WORKER SYSTEM STATE ---
  const [placedBoxes, setPlacedBoxes] = useState<THREE.Vector3[]>([]);

  // --- LIGHTING STATE ---
  const [lights, setLights] = useState({
    lab: true,
    conf: true,
    storage: false, // Storage starts dark for effect
  });

  const toggleLight = (zone: keyof typeof lights) => {
    setLights((prev) => ({ ...prev, [zone]: !prev[zone] }));
  };

  // System Interface for Robots
  const system = useMemo(
    () => ({
      findAvailableBox: (agentPos: any) => null, // Box collection disabled
      claimBox: (boxId: string, agentId: string) => { },
      pickUpBox: (boxId: string, agentId: string) => { },
      getNextConstructionSlot: () => {
        const idx = stateRef.current.nextSlotIndex;
        stateRef.current.nextSlotIndex++;
        const row = Math.floor(idx / 6);
        const col = idx % 6;
        const startX = hubCenter.x + 130;
        const startZ = hubCenter.z + 80;
        return new THREE.Vector3(
          startX + col * 3.0,
          hubCenter.y + 1,
          startZ + row * 3.0,
        );
      },
      placeBox: (pos: THREE.Vector3) => {
        stateRef.current.placedBoxes.push(pos);
        setPlacedBoxes([...stateRef.current.placedBoxes]);
      },
    }),
    [],
  );

  // Mutable System State
  const stateRef = useRef({
    placedBoxes: [] as THREE.Vector3[],
    nextSlotIndex: 0,
  });

  const { materials } = useMemo(() => {
    const mats = createMaterials();
    return { materials: mats };
  }, []);

  // --- BUILDING GENERATION ---
  const { walls, floors, ceiling, obstacles } = useMemo(() => {
    const buildingObstacles: {
      position: THREE.Vector3;
      radius: number;
      type?: "wall" | "furniture" | "cupboard";
      halfExtents?: THREE.Vector3;
      rotation?: number;
    }[] = [];
    const wallGeoms: {
      pos: [number, number, number];
      args: [number, number, number];
      rot?: number;
      name: string;
      isWindow?: boolean;
      userData?: any;
    }[] = [];
    const floorGeoms: {
      pos: [number, number, number];
      args: [number, number, number];
      name: string;
    }[] = [];
    const furnitureGeoms: {
      pos: [number, number, number];
      args: [number, number, number];
      color: string;
      rot?: number;
    }[] = [];

    // Floor Plate
    floorGeoms.push({
      pos: [hubCenter.x, hubCenter.y - 0.2, hubCenter.z],
      args: [bWidth, 0.4, bDepth],
      name: "Floor-Main-Slab",
    });

    // --- HELPER: Walls ---
    const createWall = (
      x1: number,
      z1: number,
      x2: number,
      z2: number,
      name: string,
      thickness: number = 1.0,
      isWindow: boolean = false,
    ) => {
      const len = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
      const ang = Math.atan2(z2 - z1, x2 - x1);
      const mx = (x1 + x2) / 2;
      const mz = (z1 + z2) / 2;

      wallGeoms.push({
        pos: [mx, hubCenter.y + bHeight / 2, mz],
        args: [len, bHeight, thickness],
        rot: -ang,
        name: name,
        isWindow: isWindow,
      });

      // Collision (OBB) - Single box per wall
      // Match visual mesh parameters exactly
      const halfX = len / 2;
      const halfY = bHeight / 2;
      const halfZ = thickness / 2;

      buildingObstacles.push({
        position: new THREE.Vector3(mx, hubCenter.y + halfY, mz),
        radius: 0, // Ignored for OBB
        type: "wall" as const,
        halfExtents: new THREE.Vector3(halfX, halfY, halfZ),
        rotation: -ang,
      });
    };

    // --- HELPER: Ceiling ---
    const ceilingGeom = {
      pos: [hubCenter.x, hubCenter.y + bHeight, hubCenter.z] as [
        number,
        number,
        number,
      ],
      args: [bWidth, 1.0, bDepth] as [number, number, number],
    };

    // --- HELPER: Furniture ---
    // --- HELPER: Furniture ---
    // (Removed legacy sphere-based createFurniture function)

    // Coordinates
    const left = hubCenter.x - bWidth / 2;
    const right = hubCenter.x + bWidth / 2;
    const front = hubCenter.z + bDepth / 2;
    const back = hubCenter.z - bDepth / 2;

    // --- 1. Outer Shell ---
    // --- 1. Outer Shell ---
    createWall(left, back, right, back, "Wall-North"); // North
    createWall(right, back, right, front, "Wall-East"); // East
    createWall(left, front, left, back, "Wall-West"); // West

    // South Wall — full-width window
    createWall(left, front, right, front, "Window-South", 0.2, true);

    // --- 2. Zoning ---
    // Z-Zones:
    // Back (North): z < -20 (Rooms: Conference & Storage)
    // Mid (Center): z > -20 && z < 40 (Open Lab)
    // Front (South): z > 40 (Lobby)

    const roomDividerZ = hubCenter.z - 20;
    const lobbyDividerZ = hubCenter.z + 40;

    // A. Back Rooms Divider (Z = -20)
    // We need gaps for the Central Corridor (-5 to 5) AND the Doors (approx -50 and 50)
    // Storage Side (Left): Gap centered at -50, width 18 -> -59 to -41
    createWall(
      left,
      roomDividerZ,
      hubCenter.x - 59,
      roomDividerZ,
      "Wall-Divide-Storage-Left",
    ); // Far Left Wall
    createWall(
      hubCenter.x - 41,
      roomDividerZ,
      hubCenter.x - 1.0, // Fixed: Extend to touch Pillar (Width 2 -> Edge at 1.0)
      roomDividerZ,
      "Wall-Divide-Storage-Right",
    ); // Mid Left Wall

    // Conference Side (Right): Gap centered at 50, width 18 -> 41 to 59
    createWall(
      hubCenter.x + 1.0, // Fixed: Extend to touch Pillar
      roomDividerZ,
      hubCenter.x + 41,
      roomDividerZ,
      "Wall-Divide-Conf-Left",
    ); // Mid Right Wall
    createWall(
      hubCenter.x + 59,
      roomDividerZ,
      right,
      roomDividerZ,
      "Wall-Divide-Conf-Right",
    ); // Far Right Wall

    // Split Back Zone into Left (Storage) and Right (Conference)
    // Wall along Z axis at X=0
    createWall(
      hubCenter.x,
      roomDividerZ,
      hubCenter.x,
      back,
      "Wall-Divide-Center-Back",
    );

    // Fixed: End-Cap Pillar for Spine Wall
    buildingObstacles.push({
      position: new THREE.Vector3(
        hubCenter.x,
        hubCenter.y + bHeight / 2,
        roomDividerZ,
      ),
      radius: 0,
      type: "wall" as const,
      halfExtents: new THREE.Vector3(1, bHeight / 2, 1), // 2x30x2 box
    });
    // We need a visual pillar
    wallGeoms.push({
      pos: [hubCenter.x, hubCenter.y + bHeight / 2, roomDividerZ],
      args: [2, bHeight, 2],
      name: "Pillar-Center-Spine",
      userData: {
        type: "Structure",
        id: "pillar-center",
        name: "Center Pillar",
      },
    });

    // B. Lobby Divider — Solid wall (lobby removed)
    createWall(
      left,
      lobbyDividerZ,
      right,
      lobbyDividerZ,
      "Wall-Lobby-Solid",
    );

    // C. PI Office (South-West Corner: X < -30, Z > 10)
    // Wall-North at Z=10 from X=-100 to X=-30
    createWall(
      left,
      hubCenter.z + 10,
      hubCenter.x - 30,
      hubCenter.z + 10,
      "Wall-Manager-North",
    );
    // Wall-East at X=-30 from Z=10 to Z=40
    // Door gap: Z=25 (width 18) -> Gap 16 to 34
    createWall(
      hubCenter.x - 30,
      hubCenter.z + 10,
      hubCenter.x - 30,
      hubCenter.z + 16,
      "Wall-Manager-East-1",
    );
    createWall(
      hubCenter.x - 30,
      hubCenter.z + 34,
      hubCenter.x - 30,
      lobbyDividerZ,
      "Wall-Manager-East-2",
    );

    // D. Break Room (South-East Corner: X > 30, Z > 10)
    // Wall-North at Z=10 from X=30 to X=100
    createWall(
      hubCenter.x + 30,
      hubCenter.z + 10,
      right,
      hubCenter.z + 10,
      "Wall-Break-North",
    );
    // Wall-West at X=30 from Z=10 to Z=40
    // Door gap: Z=25 (width 18) -> Gap 16 to 34
    createWall(
      hubCenter.x + 30,
      hubCenter.z + 10,
      hubCenter.x + 30,
      hubCenter.z + 16,
      "Wall-Break-West-1",
    );
    createWall(
      hubCenter.x + 30,
      hubCenter.z + 34,
      hubCenter.x + 30,
      lobbyDividerZ,
      "Wall-Break-West-2",
    );

    // --- 3. FURNITURE ---
    // ...
    // (Existing furniture calls...)
    // ...
    // (At the bottom, update door positions)

    /* ... skipping to lower section for ReplaceChunk context ... */
    // Actually, I should do the walls first in one replace, and then the doors in another if needed,
    // or if the chunk is contiguous. The 'view_file' shows walls at 328 and doors at 584.
    // They are far apart. I must use multi_replace or two replaces.
    // I am instructed to use replace_file_content for single contiguous block.
    // I will use multi_replace_file_content.

    // --- 3. FURNITURE ---
    // NOTE: All furniture obstacles are now managed by their individual React components
    // (OfficeChair, OfficeDesk, ConferenceTable, Sofa, ManagersDesk, ReceptionDesk, CupboardUnit, etc. — component names kept for compatibility)
    // Do NOT add createFurniture() calls here — they would create duplicate colliders.

    return {
      walls: wallGeoms,
      floors: floorGeoms,
      ceiling: ceilingGeom,
      obstacles: buildingObstacles,
    };
  }, []);

  // Register Colliders
  useEffect(() => {
    if (groundRef.current) addCollidableMesh(groundRef.current);
    if (buildingRef.current) addCollidableMesh(buildingRef.current);
    addObstacles(obstacles);
    return () => {
      if (groundRef.current) removeCollidableMesh(groundRef.current.uuid);
      if (buildingRef.current) removeCollidableMesh(buildingRef.current.uuid);
      removeObstacles(obstacles);
    };
  }, [
    addCollidableMesh,
    removeCollidableMesh,
    addObstacles,
    removeObstacles,
    obstacles,
  ]);

  return (
    <group>
      {/* Main Island Ground (Plaza) */}
      {/* Main Ground (Base for the building) */}
      <mesh
        ref={groundRef}
        position={[hubCenter.x, hubCenter.y - 1, hubCenter.z]}
        receiveShadow
        userData={{
          type: "Structure",
          id: "ground-main",
          name: "Lab Ground",
        }}
      >
        <boxGeometry args={[bWidth + 10, 5, bDepth + 10]} />
        <meshStandardMaterial color="#2a2f38" />
      </mesh>

      {/* Enclosed Building Structure */}
      <group ref={buildingRef}>
        {/* Floor (Tile) */}
        {floors.map((f, i) => (
          <mesh
            key={`floor-${i}`}
            name={f.name || `Floor-${i}`}
            position={new THREE.Vector3(...f.pos)}
            receiveShadow
            userData={{
              type: "Structure",
              id: f.name || `floor-${i}`,
              name: "Lab Floor",
            }}
          >
            <boxGeometry args={f.args} />
            {/* @ts-ignore */}
            <primitive object={materials.tile} attach="material" />
          </mesh>
        ))}

        {/* Ceiling */}
        <mesh
          position={new THREE.Vector3(...ceiling.pos)}
          name="Ceiling-Main"
          userData={{
            type: "Structure",
            id: "ceiling-main",
            name: "Lab Ceiling",
          }}
        >
          <boxGeometry args={ceiling.args} />
          {/* @ts-ignore */}
          <primitive object={materials.concrete} attach="material" />
        </mesh>

        {/* Walls (Solid Opaque) */}
        {walls.map((w, i) => (
          <mesh
            key={`wall-${i}`}
            name={w.name}
            position={new THREE.Vector3(...w.pos)}
            rotation={[0, w.rot || 0, 0]}
            receiveShadow
            castShadow
            userData={
              w.userData || {
                type: "Structure",
                id: w.name,
                name: w.name.replace(/-/g, " "),
              }
            }
          >
            <boxGeometry args={[w.args[0], w.args[1], w.args[2]]} />
            {/* @ts-ignore */}
            <primitive
              object={
                w.isWindow
                  ? new THREE.MeshPhysicalMaterial({
                    color: 0xc0dff0,
                    metalness: 0,
                    roughness: 0,
                    transmission: 0.92,
                    transparent: true,
                    thickness: 0.5,
                  })
                  : materials.concrete
              }
              attach="material"
            />
          </mesh>
        ))}
      </group>

      {/* FURNITURE & DOORS (Interactive Components) */}

      {/* 1. Conference Room */}
      <ConferenceTable
        position={[hubCenter.x + 50, hubCenter.y, hubCenter.z - 47.5]}
        userData={{
          type: "Furniture",
          name: "Conference Table",
          description: "A large table for meetings.",
        }}
        initialItems={["file-conf-table"]}
        initialItemsCenter={["file-conf-table"]}
      >
        {/* Objects on conference table (relative to table) */}
        <FileFolder
          position={[5, 4.5, 0]}
          userData={{
            type: "Prop",
            id: "file-conf-table",
            name: "Conference File",
            interactable: true,
            pickable: true,
            objectType: "file",
          }}
        />
      </ConferenceTable>
      {/* Chairs North (along north edge of table) */}
      {[-1, 0, 1].map((i) => (
        <OfficeChair
          key={`conf-n-${i + 1}`}
          id={`conf-n-${i + 1}`}
          position={[hubCenter.x + 50 + i * 15, hubCenter.y, hubCenter.z - 60]}
          rotation={0} // Facing south (toward table)
          userData={{
            type: "Furniture",
            id: `conf-n-${i + 1}`,
            name: "Conference Chair",
          }}
        />
      ))}
      {/* Chairs South (along south edge of table) */}
      {[-1, 0, 1].map((i) => (
        <OfficeChair
          key={`conf-s-${i + 1}`}
          id={`conf-s-${i + 1}`}
          position={[hubCenter.x + 50 + i * 15, hubCenter.y, hubCenter.z - 35]}
          rotation={Math.PI} // Facing north (toward table)
          userData={{
            type: "Furniture",
            id: `conf-s-${i + 1}`,
            name: "Conference Chair",
          }}
        />
      ))}

      {/* Chair East (End, facing West) */}
      <OfficeChair
        key="conf-e"
        id="conf-e"
        position={[hubCenter.x + 75, hubCenter.y, hubCenter.z - 47.5]}
        rotation={Math.PI * 1.5}
        userData={{
          type: "Furniture",
          id: "conf-e",
          name: "Conference Chair East",
        }}
      />

      {/* Chair West (End, facing East) */}
      <OfficeChair
        key="conf-w"
        id="conf-w"
        position={[hubCenter.x + 25, hubCenter.y, hubCenter.z - 47.5]}
        rotation={Math.PI * 0.5}
        userData={{
          type: "Furniture",
          id: "conf-w",
          name: "Conference Chair West",
        }}
      />

      {/* 2. Workstations (Open Lab) */}
      {/* Left Block — Row 0 replaced with a single large Workbench */}
      <LabWorkbench
        position={[hubCenter.x - 40, hubCenter.y, hubCenter.z - 5]}
        userData={{
          type: "Furniture",
          id: "workbench-main",
          name: "Main Lab Workbench",
          interactable: true,
        }}
      >
        {/* Red File on workbench surface */}
        <FileFolder
          position={[16, 4.5, 0]}
          color="red"
          rotation={0.1}
          userData={{
            type: "Prop",
            id: "red-file-01",
            name: "Confidential Red File",
            description:
              "A highly important confidential file containing sensitive data.",
            interactable: true,
            pickable: true,
            objectType: "file",
            owner: "System",
          }}
        />
      </LabWorkbench>
      {/* Right Block */}
      {[0, 1].map((r) =>
        [0, 1, 2].map((c) => {
          // Check if desk falls into Break Room (X > 30, Z > 10)
          // X: 20, 40, 60. Z: 0, 30.
          // Desks at (40, 30) and (60, 30) are INSIDE Break Room.
          const dx = hubCenter.x + 20 + c * 20;
          const dz = hubCenter.z + r * 30;
          if (dx > hubCenter.x + 30 && dz > hubCenter.z + 10) return null;
          // Also remove desk blocking Break Room Door (Row 1, Col 0 -> X=20, Z=30)
          if (r === 1 && c === 0) return null;

          return (
            <group key={`desk-r-${r}-${c}`}>
              <OfficeDesk
                position={[
                  hubCenter.x + 20 + c * 20,
                  hubCenter.y,
                  hubCenter.z + r * 30 - 5,
                ]}
                userData={{
                  type: "Furniture",
                  id: `desk-r-${r}-${c}`,
                  name: `Lab Desk ${String.fromCharCode(65 + 6 + r * 3 + c)}`,
                  interactable: true,
                }}
              />
              <OfficeChair
                id={`chair-r-${r}-${c}`}
                position={[
                  hubCenter.x + 20 + c * 20,
                  hubCenter.y,
                  hubCenter.z + r * 30 + 2,
                ]}
                rotation={Math.PI}
                userData={{
                  type: "Furniture",
                  id: `chair-r-${r}-${c}`,
                  name: "Lab Chair",
                }}
              />
              <Text
                position={[
                  hubCenter.x + 20 + c * 20 - 5.5,
                  hubCenter.y + 4.1,
                  hubCenter.z + r * 30 - 7.5,
                ]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={1}
                color="black"
                anchorX="center"
                anchorY="middle"
              >
                {String.fromCharCode(65 + 6 + r * 3 + c)}
              </Text>
            </group>
          );
        }),
      )}

      {/* 3. Storage Room: Back row cupboards (1–5) and front row tables (6–10) */}
      {/* Row 1 (Back): Cupboards 1-5 remain for bulk storage */}
      {Array.from({ length: 5 }).map((_, i) => (
        <CupboardUnit
          key={`cupboard-r1-${i}`}
          position={[
            hubCenter.x - 90 + i * 20, // Wide spacing (20)
            hubCenter.y,
            hubCenter.z - 60,
          ]}
          label={(i + 1).toString()}
          userData={{
            type: "Furniture",
            id: `cupboard-unit-${i + 1}`,
            name: `Cupboard ${i + 1}`,
          }}
        />
      ))}

      {/* Row 2 (Front): Replace cupboards 6–10 with research tables 6–10 */}
      {Array.from({ length: 5 }).map((_, i) => {
        const tableIndex = i + 6;
        const x = hubCenter.x - 90 + i * 20;
        const z = hubCenter.z - 40;
        const tableLabel = String.fromCharCode(65 + i); // A–E for tables 6–10

        return (
          <group key={`storage-table-${tableIndex}`}>
            <OfficeDesk
              position={[x, hubCenter.y, z]}
              withDesktopPC={false}
              userData={{
                type: "Furniture",
                id: `storage-table-${tableIndex}`,
                name: `Storage Table ${tableIndex}`,
                interactable: true,
              }}
            >
              {/* Light research equipment on each table */}
              {tableIndex === 6 && (
                <>
                  {/* Data analysis workstation */}
                  <Laptop
                    position={[0, 4.2, 0]}
                    rotation={Math.PI}
                    userData={{
                      type: "Prop",
                      id: "storage-table-6-laptop",
                      name: "Data Analysis Laptop",
                      interactable: true,
                      pickable: true,
                      objectType: "laptop",
                    }}
                  />
                  <FileFolder
                    position={[-3, 4.1, 1]}
                    rotation={0.2}
                    color="blue"
                    userData={{
                      type: "Prop",
                      id: "storage-table-6-protocols",
                      name: "Experiment Protocols",
                      interactable: true,
                      pickable: true,
                      objectType: "file",
                    }}
                  />
                </>
              )}
              {tableIndex === 7 && (
                <>
                  {/* Sample logging and labeling */}
                  <FileFolder
                    position={[2.5, 4.1, 0.5]}
                    rotation={-0.1}
                    color="red"
                    userData={{
                      type: "Prop",
                      id: "storage-table-7-sample-logs",
                      name: "Sample Log Files",
                      interactable: true,
                      pickable: true,
                      objectType: "file",
                    }}
                  />
                  <PenDrive
                    position={[-2, 4.1, 0.3]}
                    rotation={0.4}
                    userData={{
                      type: "Prop",
                      id: "storage-table-7-backup-drive",
                      name: "Backup USB Drive",
                      interactable: true,
                      pickable: true,
                      objectType: "pendrive",
                    }}
                  />
                </>
              )}
              {tableIndex === 8 && (
                <>
                  {/* General lab documentation */}
                  <FileFolder
                    position={[0, 4.1, 0.5]}
                    rotation={0.05}
                    userData={{
                      type: "Prop",
                      id: "storage-table-8-sops",
                      name: "Lab SOP Binder",
                      interactable: true,
                      pickable: true,
                      objectType: "file",
                    }}
                  />
                  <FileFolder
                    position={[-2.5, 4.1, -0.5]}
                    rotation={-0.15}
                    color="blue"
                    userData={{
                      type: "Prop",
                      id: "storage-table-8-manuals",
                      name: "Equipment Manuals",
                      interactable: true,
                      pickable: true,
                      objectType: "file",
                    }}
                  />
                </>
              )}
              {tableIndex === 9 && (
                <>
                  {/* Digital media & transfers */}
                  <Laptop
                    position={[1.5, 4.2, -0.3]}
                    rotation={Math.PI}
                    userData={{
                      type: "Prop",
                      id: "storage-table-9-laptop",
                      name: "Data Transfer Laptop",
                      interactable: true,
                      pickable: true,
                      objectType: "laptop",
                    }}
                  />
                  <PenDrive
                    position={[-1.5, 4.1, 0]}
                    rotation={0.2}
                    userData={{
                      type: "Prop",
                      id: "storage-table-9-usb",
                      name: "Experiment USB Stick",
                      interactable: true,
                      pickable: true,
                      objectType: "pendrive",
                    }}
                  />
                </>
              )}
              {tableIndex === 10 && (
                <>
                  {/* Overflow documents and backup media */}
                  <FileFolder
                    position={[2.5, 4.1, -0.3]}
                    rotation={0.1}
                    color="red"
                    userData={{
                      type: "Prop",
                      id: "storage-table-10-archive",
                      name: "Archived Experiment Files",
                      interactable: true,
                      pickable: true,
                      objectType: "file",
                    }}
                  />
                  <PenDrive
                    position={[-2.5, 4.1, -0.2]}
                    rotation={-0.3}
                    userData={{
                      type: "Prop",
                      id: "storage-table-10-archive-usb",
                      name: "Archive USB Drive",
                      interactable: true,
                      pickable: true,
                      objectType: "pendrive",
                    }}
                  />
                </>
              )}
            </OfficeDesk>
            {/* Floor label for quick identification (A–E), aligned at front-left of table */}
            <Text
              position={[x - 5.5, hubCenter.y + 4.1, z - 2.5]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={1}
              color="black"
              anchorX="center"
              anchorY="middle"
            >
              {tableLabel}
            </Text>
          </group>
        );
      })}

      {/* Lobby section removed — wall is now solid at lobbyDividerZ */}

      {/* Elevator Removed */}

      <ManagersDesk
        position={[hubCenter.x - 65, hubCenter.y, hubCenter.z + 25]}
        rotation={Math.PI / 2}
        userData={{
          type: "Furniture",
          id: "desk-manager",
          name: "Manager Desk",
        }}
        initialItemsLeft={["file-manager-blue"]}
        initialItemsMid={["laptop-manager"]}
        initialItemsRight={["pendrive-manager"]}
      >
        {/* Objects on Manager desk placed in exact slot positions */}
        <FileFolder
          position={[-5, 4.1, -2]}
          color="blue"
          userData={{
            type: "Prop",
            id: "file-manager-blue",
            name: "Blue Manager File",
            interactable: true,
            pickable: true,
            objectType: "file",
          }}
        />
        <Laptop
          position={[0, 4.1, -2]}
          rotation={-Math.PI}
          userData={{
            type: "Prop",
            id: "laptop-manager",
            name: "Manager Laptop",
            interactable: true,
            pickable: true,
            objectType: "laptop",
          }}
        />
        <PenDrive
          position={[5, 4.1, -2]}
          rotation={0.3}
          userData={{
            type: "Prop",
            id: "pendrive-manager",
            name: "USB Drive",
            interactable: true,
            pickable: true,
            objectType: "pendrive",
          }}
        />
      </ManagersDesk>
      <OfficeChair
        id="chair-manager"
        position={[hubCenter.x - 75, hubCenter.y, hubCenter.z + 25]}
        rotation={Math.PI / 2}
        userData={{
          type: "Furniture",
          id: "chair-manager",
          name: "Manager Chair",
        }}
      />
      <OfficeChair
        id="chair-manager-visitor-1"
        position={[hubCenter.x - 48, hubCenter.y, hubCenter.z + 21]}
        rotation={-Math.PI / 2}
        userData={{
          type: "Furniture",
          id: "chair-manager-visitor-1",
          name: "Manager Visitor Chair 1",
        }}
      />
      <OfficeChair
        id="chair-manager-visitor-2"
        position={[hubCenter.x - 48, hubCenter.y, hubCenter.z + 29]}
        rotation={-Math.PI / 2}
        userData={{
          type: "Furniture",
          id: "chair-manager-visitor-2",
          name: "Manager Visitor Chair 2",
        }}
      />

      {/* Small Rack with Files & Flower Pot (objects as children) */}
      <SmallRack
        position={[hubCenter.x - 75, hubCenter.y, hubCenter.z + 15]}
        rotation={Math.PI / 4}
        userData={{
          type: "Furniture",
          id: "rack-manager",
          name: "Manager Rack",
          interactable: true,
        }}
        initialItems={["flower-manager"]}
        initialItemsMiddle={["file-manager-red-1", "file-manager-red-2"]}
      >
        {/* Red files on middle shelf, flower pot on top — local coords, rack rotated π/4 */}
        {/* inverse(π/4): local = R(-π/4) × world */}
        <FileFolder
          position={[0, 3.1, 0]}
          color="red"
          rotation={0.1}
          userData={{
            type: "Prop",
            id: "file-manager-red-1",
            name: "Red Manager File 1",
            interactable: true,
            pickable: true,
            objectType: "file",
          }}
        />
        <FileFolder
          position={[-0.35, 3.1, 0.35]}
          color="red"
          rotation={-0.1}
          userData={{
            type: "Prop",
            id: "file-manager-red-2",
            name: "Red Manager File 2",
            interactable: true,
            pickable: true,
            objectType: "file",
          }}
        />
        <FlowerPot
          position={[0, 4.2, 0]}
          userData={{
            type: "Prop",
            id: "flower-manager",
            name: "Manager Flower Pot",
            interactable: true,
          }}
        />
      </SmallRack>

      {/* 6. Break Room (South-East) */}
      {/* Two Sofas facing North (towards TV on North Wall) - Moved back to South Wall (Z=35) to clear door path */}
      <Sofa
        position={[hubCenter.x + 55, hubCenter.y, hubCenter.z + 35]}
        rotation={Math.PI}
        userData={{
          type: "Furniture",
          id: "sofa-break-1",
          name: "Break Room Sofa 1",
          interactable: true,
          objectType: "sofa",
        }}
      />
      <Sofa
        position={[hubCenter.x + 45, hubCenter.y, hubCenter.z + 35]}
        rotation={Math.PI}
        userData={{
          type: "Furniture",
          id: "sofa-break-2",
          name: "Break Room Sofa 2",
          interactable: true,
          objectType: "sofa",
        }}
      />

      {/* TV on North Wall (Z=10) centered between sofas approx X=50 */}
      <TV
        position={[hubCenter.x + 51, hubCenter.y + 2, hubCenter.z + 12.8]}
        rotation={0}
        userData={{
          type: "Furniture",
          id: "tv-break",
          name: "Break Room TV",
          interactable: true,
          description: "A large flat screen TV.",
          objectType: "tv",
        }}
      />

      {/* Coffee Station in Corner (South-East Corner) */}
      <CoffeeStation
        position={[hubCenter.x + 90, hubCenter.y, hubCenter.z + 35]}
        userData={{
          type: "Furniture",
          id: "coffee-station",
          name: "Coffee Station",
        }}
        initialItems={["coffee-machine", "cup-coffee"]}
      >
        <CoffeeMachine
          position={[0, 4, 0]}
          userData={{
            type: "Prop",
            id: "coffee-machine",
            name: "Coffee Machine",
            interactable: true,
            description: "Brew a fresh cup of coffee.",
            objectType: "coffee_machine",
          }}
        />
        <CoffeeCup
          position={[2, 4.1, 0.5]}
          userData={{
            type: "Prop",
            id: "cup-coffee",
            name: "Coffee Cup",
            interactable: true,
            pickable: true,
            objectType: "coffeecup",
          }}
        />
      </CoffeeStation>

      {/* Projector Screen on Right Wall (East) of Conference Room */}
      <ProjectorScreen
        position={[hubCenter.x + 99, hubCenter.y, hubCenter.z - 47.5]}
        rotation={Math.PI / 2} // Facing West (into room)
        userData={{
          type: "Furniture",
          id: "projector-screen",
          name: "Projector Screen",
          interactable: true,
          objectType: "projector_screen",
        }}
      />
      {/* Physical Projector Device (Ceiling Mounted) */}
      <group
        position={[hubCenter.x + 50, hubCenter.y + 25, hubCenter.z - 47.5]}
        userData={{ type: "Device", id: "projector-device", name: "Projector" }}
      >
        <mesh
          castShadow
          material={new THREE.MeshStandardMaterial({ color: "#fff" })}
        >
          <boxGeometry args={[4, 2, 4]} />
        </mesh>
        <mesh
          position={[0, -1, 0]}
          material={new THREE.MeshStandardMaterial({ color: "#222" })}
        >
          <cylinderGeometry args={[0.5, 0.5, 0.5]} />
        </mesh>
      </group>
      {/* Conference Table File is now a child of ConferenceTable */}

      {/* DOORS */}

      {/* New Room Doors */}
      <OfficeDoor
        id="door-manager"
        position={[hubCenter.x - 30, hubCenter.y, hubCenter.z + 25]}
        rotation={Math.PI / 2}
        label="Manager"
        userData={{
          type: "Furniture",
          id: "door-manager",
          name: "Manager Door",
        }}
      />
      <OfficeDoor
        id="door-break"
        position={[hubCenter.x + 30, hubCenter.y, hubCenter.z + 25]}
        rotation={-Math.PI / 2}
        label="Break"
        userData={{
          type: "Furniture",
          id: "door-break",
          name: "Break Room Door",
        }}
      />

      {/* Wall Switch near Break Room Door */}
      <WallSwitch
        position={[hubCenter.x + 30.1, hubCenter.y + 4, hubCenter.z + 16]}
        rotation={Math.PI / 2}
        id="switch-break-1"
        isOn={lights.lab} // Example
        onToggle={() => toggleLight("lab")}
        userData={{ type: "Device", id: "switch-break", name: "Light Switch" }}
      />

      {/* Conference Room Door */}
      {/* Wall at Z=-20. Doors centered at -50 and +50. Gap is -57 to -43 and 43 to 57 (Width 14). */}
      <OfficeDoor
        id="door-storage"
        position={[hubCenter.x - 50, hubCenter.y, hubCenter.z - 20]}
        label="Storage"
        userData={{
          type: "Furniture",
          id: "door-storage",
          name: "Storage Room Door",
        }}
      />
      <OfficeDoor
        id="door-conf"
        position={[hubCenter.x + 50, hubCenter.y, hubCenter.z - 20]}
        label="Conference"
        userData={{
          type: "Furniture",
          id: "door-conf",
          name: "Conference Room Door",
        }}
      />

      {/* Signage */}
      <group
        position={[
          hubCenter.x,
          hubCenter.y + bHeight + 10,
          hubCenter.z + bDepth / 2,
        ]}
      >
        <Text
          fontSize={15}
          color="#00c8a0"
          anchorX="center"
          anchorY="middle"
          rotation={[0, Math.PI, 0]}
        >
          RESEARCH LAB
        </Text>
      </group>

      {/* --- LIGHTING (Always On) --- */}
      {/* <ambientLight intensity={0.2} color="#ffffff" /> handled by Scene Environment */}

      <Whiteboard
        position={[hubCenter.x + 35, hubCenter.y, hubCenter.z - 74]}
        rotation={0}
        userData={{
          type: "Furniture",
          id: "whiteboard-conf",
          name: "Conference Whiteboard",
          interactable: true,
          objectType: "whiteboard",
        }}
      />

      {/* Lobby light removed — lobby section removed */}

      {/* 2. OPEN LAB */}
      <CeilingLight
        position={[hubCenter.x, hubCenter.y + 28, hubCenter.z + 10]}
        isOn={true}
        color="#f0f4ff"
        intensity={1800}
        distance={100}
        userData={{ type: "Device", id: "light-lab", name: "Lab Light" }}
      />

      {/* 3. MEETING ROOM */}
      <CeilingLight
        position={[hubCenter.x + 50, hubCenter.y + 28, hubCenter.z - 45]}
        isOn={true}
        color="#f0f4ff"
        intensity={1400}
        distance={60}
        userData={{
          type: "Device",
          id: "light-conf",
          name: "Meeting Room Light",
        }}
      />

      {/* 4. STORAGE ROOM */}
      <CeilingLight
        position={[hubCenter.x - 50, hubCenter.y + 28, hubCenter.z - 50]}
        isOn={true}
        color="#e8ecff"
        intensity={1000}
        distance={60}
        userData={{
          type: "Device",
          id: "light-storage",
          name: "Storage Light",
        }}
      />

      {/* ============ LAB WALL ART ============ */}

      {/* 1. PERIODIC TABLE — West wall, Open Lab area */}
      <group position={[-99, hubCenter.y + 16, 0]} rotation={[0, Math.PI / 2, 0]}>
        {/* Frame */}
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[16, 10, 0.1]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>
        {/* Background */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[15.4, 9.4, 0.05]} />
          <meshStandardMaterial color="#f0f4f8" />
        </mesh>
        {/* Title */}
        <Text position={[0, 4.0, 0.04]} fontSize={0.8} color="#1a1a2e" anchorX="center">
          PERIODIC TABLE OF ELEMENTS
        </Text>
        {/* Mini element grid (representative colored blocks) */}
        {Array.from({ length: 8 }).map((_, row) =>
          Array.from({ length: 14 }).map((_, col) => {
            const colors = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#34495e"];
            return (
              <mesh
                key={`pt-${row}-${col}`}
                position={[-6.2 + col * 0.95, 2.5 - row * 0.95, 0.04]}
              >
                <boxGeometry args={[0.8, 0.8, 0.02]} />
                <meshStandardMaterial color={colors[(row + col) % colors.length]} />
              </mesh>
            );
          }),
        )}
      </group>

      {/* 2. DNA DOUBLE HELIX — East wall, Open Lab area */}
      <group position={[99, hubCenter.y + 16, 5]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[10, 14, 0.1]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[9.4, 13.4, 0.05]} />
          <meshStandardMaterial color="#0d1b2a" />
        </mesh>
        <Text position={[0, 6.0, 0.04]} fontSize={0.65} color="#00c8a0" anchorX="center">
          MOLECULAR BIOLOGY
        </Text>
        <Text position={[0, 5.2, 0.04]} fontSize={0.4} color="#5588aa" anchorX="center">
          DNA Double Helix Structure
        </Text>
        {/* DNA helix backbone strands */}
        {Array.from({ length: 20 }).map((_, i) => {
          const t = i * 0.55 - 5;
          const x1 = Math.sin(t * 0.8) * 2.5;
          const x2 = Math.sin(t * 0.8 + Math.PI) * 2.5;
          return (
            <group key={`dna-${i}`}>
              {/* Left strand node */}
              <mesh position={[x1, t, 0.04]}>
                <sphereGeometry args={[0.25, 8, 8]} />
                <meshStandardMaterial color="#00aacc" emissive="#004455" emissiveIntensity={0.3} />
              </mesh>
              {/* Right strand node */}
              <mesh position={[x2, t, 0.04]}>
                <sphereGeometry args={[0.25, 8, 8]} />
                <meshStandardMaterial color="#cc4488" emissive="#440022" emissiveIntensity={0.3} />
              </mesh>
              {/* Base pair connecting bar */}
              {i % 2 === 0 && (
                <mesh position={[(x1 + x2) / 2, t, 0.04]} rotation={[0, 0, Math.atan2(0, x2 - x1)]}>
                  <boxGeometry args={[Math.abs(x2 - x1) - 0.3, 0.12, 0.02]} />
                  <meshStandardMaterial color="#55ddaa" />
                </mesh>
              )}
            </group>
          );
        })}
      </group>

      {/* 3. LAB SAFETY — Storage room, North wall */}
      <group position={[-60, hubCenter.y + 16, -74]} rotation={[0, 0, 0]}>
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[10, 12, 0.1]} />
          <meshStandardMaterial color="#222222" />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[9.4, 11.4, 0.05]} />
          <meshStandardMaterial color="#ffd700" />
        </mesh>
        <Text position={[0, 4.8, 0.04]} fontSize={0.8} color="#1a1a1a" anchorX="center" fontWeight="bold">
          LAB SAFETY
        </Text>
        <Text position={[0, 3.8, 0.04]} fontSize={0.45} color="#333333" anchorX="center">
          GUIDELINES
        </Text>
        {/* Warning triangle */}
        <mesh position={[0, 1.5, 0.04]} rotation={[0, 0, 0]}>
          <coneGeometry args={[2, 3.5, 3]} />
          <meshStandardMaterial color="#ff6600" />
        </mesh>
        <Text position={[0, 1.2, 0.08]} fontSize={1.5} color="#1a1a1a" anchorX="center">
          !
        </Text>
        {/* Safety rules text */}
        <Text position={[0, -1.5, 0.04]} fontSize={0.35} color="#1a1a1a" anchorX="center">
          Always wear PPE
        </Text>
        <Text position={[0, -2.2, 0.04]} fontSize={0.35} color="#1a1a1a" anchorX="center">
          Handle chemicals with care
        </Text>
        <Text position={[0, -2.9, 0.04]} fontSize={0.35} color="#1a1a1a" anchorX="center">
          Report all incidents
        </Text>
        <Text position={[0, -3.6, 0.04]} fontSize={0.35} color="#1a1a1a" anchorX="center">
          Know emergency exits
        </Text>
      </group>

      {/* 4. BRAIN / NEUROSCIENCE — Meeting room divider wall (south face) */}
      <group position={[70, hubCenter.y + 16, -19]} rotation={[0, 0, 0]}>
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[10, 10, 0.1]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[9.4, 9.4, 0.05]} />
          <meshStandardMaterial color="#0a0f1a" />
        </mesh>
        <Text position={[0, 4.0, 0.04]} fontSize={0.6} color="#ff6688" anchorX="center">
          NEUROSCIENCE
        </Text>
        <Text position={[0, 3.3, 0.04]} fontSize={0.35} color="#6688aa" anchorX="center">
          Functional Brain Mapping
        </Text>
        {/* Simplified brain shape — overlapping hemispheres */}
        <mesh position={[-1.2, 0, 0.04]} scale={[1.3, 1.5, 0.1]}>
          <sphereGeometry args={[2, 16, 16]} />
          <meshStandardMaterial color="#e8a0b0" emissive="#331122" emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[1.2, 0, 0.04]} scale={[1.3, 1.5, 0.1]}>
          <sphereGeometry args={[2, 16, 16]} />
          <meshStandardMaterial color="#a0b8e8" emissive="#112233" emissiveIntensity={0.2} />
        </mesh>
        {/* Brain stem */}
        <mesh position={[0, -2.8, 0.04]}>
          <cylinderGeometry args={[0.4, 0.6, 1.5, 8]} />
          <meshStandardMaterial color="#c8a8b8" />
        </mesh>
        {/* Region labels */}
        <Text position={[-1.5, 1.5, 0.08]} fontSize={0.25} color="#ffffff" anchorX="center">
          Frontal
        </Text>
        <Text position={[1.5, 1.5, 0.08]} fontSize={0.25} color="#ffffff" anchorX="center">
          Parietal
        </Text>
        <Text position={[0, -1.0, 0.08]} fontSize={0.25} color="#ffffff" anchorX="center">
          Temporal
        </Text>
      </group>

      {/* Atom model removed — was on lobby west wall */}

      {/* 6. CHEMICAL FORMULAS — Open lab divider wall, left side (south face) */}
      <group position={[-25, hubCenter.y + 16, -19]} rotation={[0, 0, 0]}>
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[12, 8, 0.1]} />
          <meshStandardMaterial color="#222222" />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[11.4, 7.4, 0.05]} />
          <meshStandardMaterial color="#1a2030" />
        </mesh>
        <Text position={[0, 3.0, 0.04]} fontSize={0.5} color="#44ddaa" anchorX="center">
          KEY EQUATIONS
        </Text>
        <Text position={[0, 1.8, 0.04]} fontSize={0.45} color="#e0e8ff" anchorX="center">
          E = mc²
        </Text>
        <Text position={[0, 0.8, 0.04]} fontSize={0.4} color="#c0d0e0" anchorX="center">
          ΔG = ΔH - TΔS
        </Text>
        <Text position={[0, -0.2, 0.04]} fontSize={0.4} color="#c0d0e0" anchorX="center">
          PV = nRT
        </Text>
        <Text position={[0, -1.2, 0.04]} fontSize={0.4} color="#c0d0e0" anchorX="center">
          F = ma
        </Text>
        <Text position={[0, -2.2, 0.04]} fontSize={0.38} color="#c0d0e0" anchorX="center">
          ∇ × E = -∂B/∂t
        </Text>
      </group>

      {/* 7. RESEARCH DATA CHART — PI Office north wall */}
      <group position={[-65, hubCenter.y + 16, 11]} rotation={[0, 0, 0]}>
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[12, 9, 0.1]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[11.4, 8.4, 0.05]} />
          <meshStandardMaterial color="#f5f7fa" />
        </mesh>
        <Text position={[0, 3.5, 0.04]} fontSize={0.5} color="#2c3e50" anchorX="center">
          RESEARCH PROGRESS 2026
        </Text>
        {/* Bar chart */}
        {[
          { x: -4, h: 3.0, c: "#3498db", l: "Q1" },
          { x: -2, h: 4.5, c: "#2ecc71", l: "Q2" },
          { x: 0, h: 3.8, c: "#e74c3c", l: "Q3" },
          { x: 2, h: 5.2, c: "#f39c12", l: "Q4" },
          { x: 4, h: 4.0, c: "#9b59b6", l: "YTD" },
        ].map((bar) => (
          <group key={bar.l}>
            <mesh position={[bar.x, -3.5 + bar.h / 2, 0.04]}>
              <boxGeometry args={[1.2, bar.h, 0.02]} />
              <meshStandardMaterial color={bar.c} />
            </mesh>
            <Text position={[bar.x, -3.8, 0.04]} fontSize={0.3} color="#555555" anchorX="center">
              {bar.l}
            </Text>
          </group>
        ))}
        {/* Y-axis */}
        <mesh position={[-5.2, -1.0, 0.04]}>
          <boxGeometry args={[0.04, 6, 0.01]} />
          <meshStandardMaterial color="#888888" />
        </mesh>
        {/* X-axis */}
        <mesh position={[0, -3.5, 0.04]}>
          <boxGeometry args={[10.5, 0.04, 0.01]} />
          <meshStandardMaterial color="#888888" />
        </mesh>
      </group>

      {/* 8. BENZENE RING / ORGANIC CHEMISTRY — Break room north wall */}
      <group position={[80, hubCenter.y + 16, 11]} rotation={[0, 0, 0]}>
        <mesh position={[0, 0, -0.06]}>
          <boxGeometry args={[10, 10, 0.1]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[9.4, 9.4, 0.05]} />
          <meshStandardMaterial color="#0a1520" />
        </mesh>
        <Text position={[0, 4.0, 0.04]} fontSize={0.55} color="#55ddaa" anchorX="center">
          ORGANIC CHEMISTRY
        </Text>
        <Text position={[0, 3.2, 0.04]} fontSize={0.32} color="#5588aa" anchorX="center">
          Molecular Structures
        </Text>
        {/* Benzene ring — 6 nodes connected */}
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
          const r = 2.2;
          const nx = Math.cos(angle) * r;
          const ny = Math.sin(angle) * r;
          const nextAngle = ((i + 1) * Math.PI * 2) / 6 - Math.PI / 2;
          const nnx = Math.cos(nextAngle) * r;
          const nny = Math.sin(nextAngle) * r;
          const mx = (nx + nnx) / 2;
          const my = (ny + nny) / 2;
          const bondLen = Math.sqrt((nnx - nx) ** 2 + (nny - ny) ** 2);
          const bondAngle = Math.atan2(nny - ny, nnx - nx);
          return (
            <group key={`benz-${i}`}>
              {/* Carbon node */}
              <mesh position={[nx, ny, 0.04]}>
                <sphereGeometry args={[0.3, 8, 8]} />
                <meshStandardMaterial color="#44ccaa" emissive="#226655" emissiveIntensity={0.3} />
              </mesh>
              {/* Bond */}
              <mesh position={[mx, my, 0.04]} rotation={[0, 0, bondAngle]}>
                <boxGeometry args={[bondLen - 0.4, 0.1, 0.02]} />
                <meshStandardMaterial color="#88eedd" />
              </mesh>
              {/* C label */}
              <Text position={[nx * 1.35, ny * 1.35, 0.06]} fontSize={0.25} color="#88ccbb" anchorX="center">
                C
              </Text>
            </group>
          );
        })}
        {/* Inner circle for aromatic ring */}
        <mesh position={[0, 0, 0.05]}>
          <torusGeometry args={[1.3, 0.04, 8, 32]} />
          <meshStandardMaterial color="#44aa88" emissive="#226655" emissiveIntensity={0.3} />
        </mesh>
        <Text position={[0, -3.8, 0.04]} fontSize={0.28} color="#5588aa" anchorX="center">
          Benzene (C₆H₆)
        </Text>
      </group>

      {/* Placed Boxes (Construction) */}
      {placedBoxes.map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#aa8800" />
        </mesh>
      ))}

      {/* ZONE LABELS REMOVED */}
    </group>
  );
}
