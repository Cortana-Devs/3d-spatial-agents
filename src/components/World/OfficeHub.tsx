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
  ReceptionDesk,
  ManagersDesk,
} from "./Furniture";
import { Elevator } from "./Elevator";
import {
  Printer,
  FireExtinguisher,
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
  Telephone,
  CoffeeStation,
} from "./Props";

interface Box {
  id: string;
  position: THREE.Vector3;
  claimedBy?: string; // ID of robot
}

export default function OfficeHub() {
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
    lobby: true,
    office: true,
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
      claimBox: (boxId: string, agentId: string) => {},
      pickUpBox: (boxId: string, agentId: string) => {},
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

    // South Wall (Entrance)
    // Entrance: x: -15 to +15
    createWall(left, front, hubCenter.x - 15, front, "Wall-South-Left");
    // Split Right Wall for Window
    // Wall 15 to 40
    createWall(
      hubCenter.x + 15,
      front,
      hubCenter.x + 40,
      front,
      "Wall-South-Right-1",
    );
    // Window 40 to 80
    createWall(
      hubCenter.x + 40,
      front,
      hubCenter.x + 80,
      front,
      "Window-Lobby",
      0.2,
      true,
    );
    // Wall 80 to 100
    createWall(hubCenter.x + 80, front, right, front, "Wall-South-Right-2");

    // --- 2. Zoning ---
    // Z-Zones:
    // Back (North): z < -20 (Rooms: Conference & Storage)
    // Mid (Center): z > -20 && z < 40 (Open Office)
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

    // B. Lobby Divider
    // Wall across X with wide entrance
    createWall(
      left,
      lobbyDividerZ,
      hubCenter.x - 9, // Fixed: narrowed from -15 to match 18-unit door
      lobbyDividerZ,
      "Wall-Lobby-Left",
      0.5,
    );
    createWall(
      hubCenter.x + 9, // Fixed: narrowed from 15 to match 18-unit door
      lobbyDividerZ,
      right,
      lobbyDividerZ,
      "Wall-Lobby-Right",
      0.5,
    );

    // C. Manager's Office (South-West Corner: X < -30, Z > 10)
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
    // (OfficeChair, OfficeDesk, ConferenceTable, Sofa, ManagersDesk, ReceptionDesk, CupboardUnit, etc.)
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
          name: "Office Ground",
        }}
      >
        <boxGeometry args={[bWidth + 10, 5, bDepth + 10]} />
        <meshStandardMaterial color="#222222" />
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
              name: "Office Floor",
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
            name: "Office Ceiling",
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
                      color: 0x88ccff,
                      metalness: 0,
                      roughness: 0,
                      transmission: 0.9,
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

      {/* 2. Workstations (Open Office) */}
      {/* Left Block */}
      {[0, 1].map((r) =>
        [0, 1, 2].map((c) => {
          const dx = hubCenter.x - 20 - c * 20;
          const dz = hubCenter.z + r * 30;

          if (dx < hubCenter.x - 30 && dz > hubCenter.z + 10) return null;
          // Also remove desk blocking Manager's Door (Row 1, Col 0 -> X=-20, Z=30)
          if (r === 1 && c === 0) return null;

          return (
            <group key={`desk-l-${r}-${c}`}>
              <OfficeDesk
                position={[dx, hubCenter.y, dz]}
                userData={{
                  type: "Furniture",
                  id: `desk-l-${r}-${c}`,
                  name: `Office Desk ${String.fromCharCode(65 + r * 3 + c)}`,
                  interactable: true,
                }}
                initialItems={r === 0 && c === 0 ? ["red-file-01"] : undefined}
              >
                {/* Objects on desk surface (relative to desk position) */}
                {r === 0 && c === 0 && (
                  <FileFolder
                    position={[-3, 4.1, 0]}
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
                )}
              </OfficeDesk>
              <OfficeChair
                id={`chair-l-${r}-${c}`}
                position={[dx, hubCenter.y, dz + 5]}
                rotation={Math.PI}
                userData={{
                  type: "Furniture",
                  id: `chair-l-${r}-${c}`,
                  name: "Office Chair",
                }}
              />
              <Text
                position={[dx - 5.5, hubCenter.y + 4.1, dz - 2.5]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={1}
                color="black"
                anchorX="center"
                anchorY="middle"
              >
                {String.fromCharCode(65 + r * 3 + c)}
              </Text>
            </group>
          );
        }),
      )}
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
                  hubCenter.z + r * 30,
                ]}
                userData={{
                  type: "Furniture",
                  id: `desk-r-${r}-${c}`,
                  name: `Office Desk ${String.fromCharCode(65 + 6 + r * 3 + c)}`,
                  interactable: true,
                }}
                initialItems={
                  r === 0 && c === 0 ? ["printer-office"] : undefined
                }
              >
                {/* Objects on desk surface (relative to desk position) */}
                {r === 0 && c === 0 && (
                  <Printer
                    position={[4.4, 4, 0]}
                    rotation={Math.PI / 2}
                    userData={{
                      type: "Prop",
                      id: "printer-office",
                      name: "Office Printer",
                      interactable: true,
                      description: "A standard office printer.",
                      objectType: "printer",
                    }}
                  />
                )}
              </OfficeDesk>
              <OfficeChair
                id={`chair-r-${r}-${c}`}
                position={[
                  hubCenter.x + 20 + c * 20,
                  hubCenter.y,
                  hubCenter.z + r * 30 + 5,
                ]}
                rotation={Math.PI}
                userData={{
                  type: "Furniture",
                  id: `chair-r-${r}-${c}`,
                  name: "Office Chair",
                }}
              />
              <Text
                position={[
                  hubCenter.x + 20 + c * 20 - 5.5,
                  hubCenter.y + 4.1,
                  hubCenter.z + r * 30 - 2.5,
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

      {/* 3. Storage Room Cupboards (10 Units, 2 Rows x 5 Cols) */}
      {/* Row 1 (Back): Units 1-5 */}
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

      {/* Row 2 (Front): Units 6-10 */}
      {Array.from({ length: 5 }).map((_, i) => (
        <CupboardUnit
          key={`cupboard-r2-${i}`}
          position={[hubCenter.x - 90 + i * 20, hubCenter.y, hubCenter.z - 40]}
          label={(i + 6).toString()}
          userData={{
            type: "Furniture",
            id: `cupboard-unit-${i + 6}`,
            name: `Cupboard ${i + 6}`,
          }}
        />
      ))}

      {/* 4. Reception Info Desk (Lobby) - Centered */}
      <ReceptionDesk
        position={[hubCenter.x, hubCenter.y, hubCenter.z + 55]}
        rotation={Math.PI}
        userData={{
          type: "Furniture",
          id: "reception-desk",
          name: "Reception Desk",
          interactable: true,
        }}
        initialItems={["laptop-reception", "telephone-reception"]}
      >
        {/* Objects on reception counter — local coords, desk rotated π */}
        <Laptop
          position={[0, 4.1, 0]}
          rotation={0}
          userData={{
            type: "Prop",
            id: "laptop-reception",
            name: "Reception Laptop",
            interactable: true,
            pickable: true,
            objectType: "laptop",
          }}
        />
        <Telephone
          position={[-4, 4.1, 0]}
          rotation={0}
          userData={{
            type: "Prop",
            id: "telephone-reception",
            name: "Reception Telephone",
            interactable: true,
            pickable: true,
            objectType: "telephone",
          }}
        />
      </ReceptionDesk>
      <OfficeChair
        id="chair-reception"
        position={[hubCenter.x, hubCenter.y, hubCenter.z + 50]}
        rotation={0}
        userData={{
          type: "Furniture",
          id: "chair-reception",
          name: "Reception Chair",
        }}
      />

      {/* Lobby Sofas - 4 units aligned to walls */}
      {/* West Wall (Left side of lobby) - Facing East */}
      <Sofa
        position={[hubCenter.x - 80, hubCenter.y, hubCenter.z + 50]}
        rotation={Math.PI / 2}
        userData={{
          type: "Furniture",
          id: "sofa-lobby-1",
          name: "Lobby Sofa 1",
          interactable: true,
          objectType: "sofa",
        }}
      />
      <Sofa
        position={[hubCenter.x - 80, hubCenter.y, hubCenter.z + 65]}
        rotation={Math.PI / 2}
        userData={{
          type: "Furniture",
          id: "sofa-lobby-2",
          name: "Lobby Sofa 2",
          interactable: true,
          objectType: "sofa",
        }}
      />
      {/* East Wall (Right side of lobby) - Facing West */}
      <Sofa
        position={[hubCenter.x + 80, hubCenter.y, hubCenter.z + 50]}
        rotation={-Math.PI / 2}
        userData={{
          type: "Furniture",
          id: "sofa-lobby-3",
          name: "Lobby Sofa 3",
          interactable: true,
          objectType: "sofa",
        }}
      />
      <Sofa
        position={[hubCenter.x + 80, hubCenter.y, hubCenter.z + 65]}
        rotation={-Math.PI / 2}
        userData={{
          type: "Furniture",
          id: "sofa-lobby-4",
          name: "Lobby Sofa 4",
          interactable: true,
          objectType: "sofa",
        }}
      />

      {/* Elevator Removed */}

      {/* 5. Manager's Office */}
      <ManagersDesk
        position={[hubCenter.x - 65, hubCenter.y, hubCenter.z + 25]}
        rotation={Math.PI / 2}
        userData={{
          type: "Furniture",
          id: "desk-manager",
          name: "Manager Desk",
        }}
        initialItems={[
          "file-manager-blue",
          "laptop-manager",
          "pendrive-manager",
        ]}
      >
        {/* Objects on Manager desk — local coords, desk rotated π/2 */}
        {/* inverse(π/2): local_x = -wz, local_z = wx */}
        <FileFolder
          position={[5, 4, -1]}
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
          position={[0, 4, 0]}
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
          position={[2, 4.1, -2]}
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

      <FireExtinguisher
        position={[hubCenter.x + 39, hubCenter.y + 2, hubCenter.z + 73.5]} // Near Window
        rotation={0}
        userData={{
          type: "Prop",
          id: "fire-extinguisher-1",
          name: "Fire Extinguisher",
          interactable: true,
          description: "Safety first.",
        }}
      />
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
      {/* Lobby: Single Centered Door at Z=40 (Matches lobbyDividerZ) */}
      <OfficeDoor
        id="door-main"
        position={[hubCenter.x, hubCenter.y, hubCenter.z + 40]}
        label="Lobby"
        userData={{ type: "Furniture", id: "door-main", name: "Lobby Door" }}
      />

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
        isOn={lights.office} // Example
        onToggle={() => toggleLight("office")}
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
          color="#00aaff"
          anchorX="center"
          anchorY="middle"
          rotation={[0, Math.PI, 0]}
        >
          OFFICE HQ
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

      {/* 1. LOBBY */}
      <CeilingLight
        position={[hubCenter.x, hubCenter.y + 28, hubCenter.z + 55]}
        isOn={true}
        color="#ffeedd"
        intensity={1000}
        distance={80}
        userData={{ type: "Device", id: "light-lobby", name: "Lobby Light" }}
      />

      {/* 2. OPEN OFFICE */}
      <CeilingLight
        position={[hubCenter.x, hubCenter.y + 28, hubCenter.z + 10]}
        isOn={true}
        color="#ffffff"
        intensity={1500}
        distance={100}
        userData={{ type: "Device", id: "light-office", name: "Office Light" }}
      />

      {/* 3. CONFERENCE ROOM */}
      <CeilingLight
        position={[hubCenter.x + 50, hubCenter.y + 28, hubCenter.z - 45]}
        isOn={true}
        color="#fff0e0"
        intensity={1200}
        distance={60}
        userData={{
          type: "Device",
          id: "light-conf",
          name: "Conference Light",
        }}
      />

      {/* 4. STORAGE ROOM */}
      <CeilingLight
        position={[hubCenter.x - 50, hubCenter.y + 28, hubCenter.z - 50]}
        isOn={true}
        color="#e0e0ff"
        intensity={800}
        distance={60}
        userData={{
          type: "Device",
          id: "light-storage",
          name: "Storage Light",
        }}
      />

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
