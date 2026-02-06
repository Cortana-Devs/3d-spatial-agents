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
  StorageShelf,
  ReceptionDesk,
  ManagersDesk,
} from "./Furniture";
import { Elevator } from "./Elevator";
import { Printer, FireExtinguisher, FileFolder, Whiteboard, ProjectorScreen, Laptop, PenDrive, SmallRack, FlowerPot, Sofa, TV, CoffeeMachine, CoffeeCup } from "./Props";

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
    const buildingObstacles: { position: THREE.Vector3; radius: number }[] = [];
    const wallGeoms: {
      pos: [number, number, number];
      args: [number, number, number];
      rot?: number;
      name: string;
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
      });

      // Collision
      const sphereRadius = 2.0;
      const step = 1.5;
      const steps = Math.ceil(len / step);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        buildingObstacles.push({
          position: new THREE.Vector3(
            x1 + (x2 - x1) * t,
            hubCenter.y,
            z1 + (z2 - z1) * t,
          ),
          radius: sphereRadius,
        });
      }
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
    const createFurniture = (
      x: number,
      z: number,
      w: number,
      h: number,
      d: number,
      color: string,
      rot: number = 0,
    ) => {
      // Visual
      furnitureGeoms.push({
        pos: [x, hubCenter.y + h / 2, z],
        args: [w, h, d],
        color: color,
        rot: rot,
      });

      // Collision (Spheres along the major axis)
      // Adjust W/D for rotation (Only supports 0 or 90 approx for now)
      let effW = w;
      let effD = d;
      if (
        Math.abs(rot - Math.PI / 2) < 0.1 ||
        Math.abs(rot + Math.PI / 2) < 0.1
      ) {
        effW = d;
        effD = w;
      }

      const minDim = Math.min(effW, effD);
      const maxDim = Math.max(effW, effD);

      // If generic small object or square-ish
      if (maxDim < minDim * 1.5) {
        buildingObstacles.push({
          position: new THREE.Vector3(x, hubCenter.y, z),
          radius: maxDim / 1.5,
        });
      } else {
        // Long object - place spheres along longest axis
        const sphereRadius = minDim * 0.7; // Tighter fit
        const step = sphereRadius * 1.5;
        const count = Math.ceil(maxDim / step);

        // Direction
        const dx = effW >= effD ? 1 : 0;
        const dz = effW < effD ? 1 : 0;

        for (let i = 0; i <= count; i++) {
          // t from -0.5 to 0.5
          const t = i / count - 0.5;
          // position offset
          const ox = dx * t * maxDim;
          const oz = dz * t * maxDim;

          buildingObstacles.push({
            position: new THREE.Vector3(x + ox, hubCenter.y, z + oz),
            radius: sphereRadius,
          });
        }
      }
    };

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
    createWall(hubCenter.x + 15, front, right, front, "Wall-South-Right");

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
      position: new THREE.Vector3(hubCenter.x, hubCenter.y, roomDividerZ),
      radius: 1.5,
    });
    // We need a visual pillar
    wallGeoms.push({
      pos: [hubCenter.x, hubCenter.y + bHeight / 2, roomDividerZ],
      args: [2, bHeight, 2],
      name: "Pillar-Center-Spine",
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
      "Wall-Manager-North"
    );
    // Wall-East at X=-30 from Z=10 to Z=40
    // Door gap: Z=25 (width 12) -> Gap 19 to 31
    createWall(
      hubCenter.x - 30,
      hubCenter.z + 10,
      hubCenter.x - 30,
      hubCenter.z + 19,
      "Wall-Manager-East-1"
    );
    createWall(
      hubCenter.x - 30,
      hubCenter.z + 31,
      hubCenter.x - 30,
      lobbyDividerZ,
      "Wall-Manager-East-2"
    );

    // D. Break Room (South-East Corner: X > 30, Z > 10)
    // Wall-North at Z=10 from X=30 to X=100
    createWall(
      hubCenter.x + 30,
      hubCenter.z + 10,
      right,
      hubCenter.z + 10,
      "Wall-Break-North"
    );
    // Wall-West at X=30 from Z=10 to Z=40
    // Narrow Door gap: Z=25 (width 8) -> Gap 21 to 29
    createWall(
      hubCenter.x + 30,
      hubCenter.z + 10,
      hubCenter.x + 30,
      hubCenter.z + 21,
      "Wall-Break-West-1"
    );
    createWall(
      hubCenter.x + 30,
      hubCenter.z + 29,
      hubCenter.x + 30,
      lobbyDividerZ,
      "Wall-Break-West-2"
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

    // A. Conference Room (North-East: X > 0, Z < -20)
    // Detailed: X range [0, 100], Z range [-75, -20]
    // Big Table
    createFurniture(
      hubCenter.x + 50,
      hubCenter.z - 47.5,
      40,
      4,
      20,
      "#5a3a2a", // Brown Table
    );
    // Chairs (implied by obstacles or small boxes)
    // North side chairs
    for (let i = 0; i < 3; i++) {
      createFurniture(
        hubCenter.x + 35 + i * 15,
        hubCenter.z - 60,
        4,
        4,
        4,
        "#333",
      );
    }
    // South side chairs
    for (let i = 0; i < 3; i++) {
      createFurniture(
        hubCenter.x + 35 + i * 15,
        hubCenter.z - 35,
        4,
        4,
        4,
        "#333",
      );
    }

    // B. Storage Room (North-West: X < 0, Z < -20)
    // Refactored Shelves (2 Units) matching <StorageShelf>
    createFurniture(hubCenter.x - 50, hubCenter.z - 60, 80, 12, 5, "#667788");
    createFurniture(hubCenter.x - 50, hubCenter.z - 40, 80, 12, 5, "#667788");

    // C. Open Office (Center: Z [-20, 40])
    // Desks in grid
    // 2 Rows of 3 Desks on each side of corridor?
    // Corridor X: -5 to 5.

    // Left Block (X < -5)
    for (let r = 0; r < 2; r++) {
      // 2 rows deep
      for (let c = 0; c < 3; c++) {
        // 3 desks wide
        const dx = hubCenter.x - 20 - c * 20;
        const dz = hubCenter.z + r * 30;

        // Remove Manager's Office overlaps (X < -30 && Z > 10)
        if (dx < hubCenter.x - 30 && dz > hubCenter.z + 10) continue;

        createFurniture(
          dx,
          dz,
          12,
          3,
          6,
          "#ffffff",
        );
        // Chair
        createFurniture(
          hubCenter.x - 20 - c * 20,
          hubCenter.z + r * 30 + 5,
          3,
          3,
          3,
          "#222",
        );
      }
    }
    // Right Block (X > 5)
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        createFurniture(
          hubCenter.x + 20 + c * 20,
          hubCenter.z + r * 30,
          12,
          3,
          6,
          "#ffffff",
        );
        // Chair (Opposite side?)
        createFurniture(
          hubCenter.x + 20 + c * 20,
          hubCenter.z + r * 30 + 5,
          3,
          3,
          3,
          "#222",
        );
      }
    }

    // D. Lobby
    // Reception Desk (Centered)
    createFurniture(hubCenter.x, hubCenter.z + 55, 20, 4, 5, "#222");

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
    addObstacles(obstacles);
    return () => {
      if (groundRef.current) removeCollidableMesh(groundRef.current.uuid);
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
          >
            <boxGeometry args={f.args} />
            {/* @ts-ignore */}
            <primitive object={materials.tile} attach="material" />
          </mesh>
        ))}

        {/* Ceiling */}
        <mesh position={new THREE.Vector3(...ceiling.pos)} name="Ceiling-Main">
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
          >
            <boxGeometry args={[w.args[0], w.args[1], w.args[2]]} />
            {/* @ts-ignore */}
            <primitive object={materials.concrete} attach="material" />
          </mesh>
        ))}
      </group>

      {/* FURNITURE & DOORS (Interactive Components) */}

      {/* 1. Conference Room */}
      <ConferenceTable
        position={[hubCenter.x + 50, hubCenter.y, hubCenter.z - 47.5]}
      />
      {/* Chairs North (along north edge of table) */}
      {[-1, 0, 1].map((i) => (
        <OfficeChair
          key={`conf-n-${i + 1}`}
          id={`conf-n-${i + 1}`}
          position={[hubCenter.x + 50 + i * 15, hubCenter.y, hubCenter.z - 60]}
          rotation={0} // Facing south (toward table)
        />
      ))}
      {/* Chairs South (along south edge of table) */}
      {[-1, 0, 1].map((i) => (
        <OfficeChair
          key={`conf-s-${i + 1}`}
          id={`conf-s-${i + 1}`}
          position={[hubCenter.x + 50 + i * 15, hubCenter.y, hubCenter.z - 35]}
          rotation={Math.PI} // Facing north (toward table)
        />
      ))}

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
                position={[
                  dx,
                  hubCenter.y,
                  dz,
                ]}
              />
              <OfficeChair
                id={`chair-l-${r}-${c}`}
                position={[
                  dx,
                  hubCenter.y,
                  dz + 5,
                ]}
                rotation={Math.PI}
              />
              {/* Only ONE computer table gets red file (e.g., Row 0, Col 0, Left Block) */}
              {r === 0 && c === 0 && (
                <FileFolder
                  position={[dx - 3, hubCenter.y + 4.1, dz]}
                  color="red"
                  rotation={0.1}
                />
              )}
            </group>
          )
        })
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
              />
              <OfficeChair
                id={`chair-r-${r}-${c}`}
                position={[
                  hubCenter.x + 20 + c * 20,
                  hubCenter.y,
                  hubCenter.z + r * 30 + 5,
                ]}
                rotation={Math.PI} // Facing desk (North)
              />
              {/* Printer on specific desk: Right Block, Row 0, Col 0 */}
              {r === 0 && c === 0 && (
                <Printer
                  position={[hubCenter.x + 20 + c * 20 + 3, hubCenter.y + 2.6, hubCenter.z + r * 30]}
                  rotation={Math.PI / 4}
                />
              )}
              {/* Pen Drive on Right Block, Row 0, Col 1 (Next to printer desk) or same desk */}
              {r === 0 && c === 0 && (
                <PenDrive position={[hubCenter.x + 20 + c * 20 - 3, hubCenter.y + 0.1, hubCenter.z + r * 30 + 2]} rotation={0.5} />
              )}
              {/* Remove Red Files from all other tables logic - user said "dont add all computer tables to red file only add file in one cumputer table" */}
              {/* We added one in Left Block above. So none here. */}
            </group>
          )
        })
      )}

      {/* 3. Storage Room Shelves (Refactored) */}
      <StorageShelf
        position={[hubCenter.x - 50, hubCenter.y, hubCenter.z - 60]}
      />
      <StorageShelf
        position={[hubCenter.x - 50, hubCenter.y, hubCenter.z - 40]}
      />
      {/* Fill Storage Shelves with Files (Generic and Blue/Red) */}
      {/* Rack 1: [-50, ..., -60] */}
      {
        [2, 7, 12].map((y) =>
          [-35, -20, -5, 10, 25].map((off, i) => (
            <FileFolder
              key={`file-s1-${y}-${i}`}
              position={[hubCenter.x - 50 + off, hubCenter.y + y + 0.5, hubCenter.z - 60]}
              color={i % 2 === 0 ? "blue" : (i % 3 === 0 ? "red" : "generic")}
              rotation={Math.random() * 0.5}
              label={(i + (y * 5) + 1).toString()} // Numbered Label
            />
          ))
        )
      }
      {/* Rack 2: [-50, ..., -40] */}
      {
        [2, 7, 12].map((y) =>
          [-30, -10, 5, 20, 30].map((off, i) => (
            <FileFolder
              key={`file-s2-${y}-${i}`}
              position={[hubCenter.x - 50 + off, hubCenter.y + y + 0.5, hubCenter.z - 40]}
              color={i % 3 === 0 ? "blue" : "generic"}
              rotation={Math.random() * 0.5}
              label={(i + (y * 5) + 100).toString()} // Numbered Label
            />
          ))
        )
      }

      {/* 4. Reception Info Desk (Lobby) - Centered */}
      <ReceptionDesk
        position={[hubCenter.x, hubCenter.y, hubCenter.z + 55]}
        rotation={Math.PI} // Facing Entrance
      />


      {/* Elevator Removed */}

      {/* 5. Manager's Office */}
      <ManagersDesk
        position={[hubCenter.x - 65, hubCenter.y, hubCenter.z + 25]}
        rotation={Math.PI / 2} // Facing East (Door)
      />
      <OfficeChair
        id="chair-manager"
        position={[hubCenter.x - 75, hubCenter.y, hubCenter.z + 25]}
        rotation={Math.PI / 2}
      />
      <FileFolder
        position={[hubCenter.x - 65, hubCenter.y + 4.1, hubCenter.z + 25]}
        color="blue"
        rotation={0.2}
      />
      {/* Laptop & Pen Drive */}
      {/* Laptop: rotation 0 is open towards +Z (South). Manager chair faces East (+X). Screen should face West (-X). 
          If rotation is -Math.PI/2, screen faces West.
      */}
      <Laptop position={[hubCenter.x - 65, hubCenter.y + 3.8, hubCenter.z + 25]} rotation={-Math.PI / 2} />
      {/* Pen Drive: Left side of desk. Desk center Z=25. Facing East => Left is North (Z < 25). */}

      {/* Small Rack with Rose Files & Flower Pot */}
      <SmallRack position={[hubCenter.x - 75, hubCenter.y, hubCenter.z + 15]} rotation={Math.PI / 4} />
      <FileFolder position={[hubCenter.x - 75, hubCenter.y + 3.1, hubCenter.z + 15]} color="red" rotation={0.1} />
      <FileFolder position={[hubCenter.x - 75, hubCenter.y + 3.1, hubCenter.z + 15.5]} color="red" rotation={-0.1} />
      <FlowerPot position={[hubCenter.x - 75, hubCenter.y + 4.2, hubCenter.z + 15]} />

      {/* 6. Break Room (South-East) */}
      {/* Two Sofas facing North (towards TV on North Wall) - Moved back to South Wall (Z=35) to clear door path */}
      <Sofa position={[hubCenter.x + 60, hubCenter.y, hubCenter.z + 35]} rotation={Math.PI} />
      <Sofa position={[hubCenter.x + 40, hubCenter.y, hubCenter.z + 35]} rotation={Math.PI} />

      {/* TV on North Wall (Z=10) centered between sofas approx X=50 */}
      <TV position={[hubCenter.x + 50, hubCenter.y + 2, hubCenter.z + 10.5]} rotation={0} />

      {/* Coffee Station in Corner (South-East Corner: X approx 90, Z approx 35) */}
      <group position={[hubCenter.x + 90, hubCenter.y, hubCenter.z + 35]}>
        <mesh position={[0, 2, 0]} material={new THREE.MeshStandardMaterial({ color: "#333" })}>
          <boxGeometry args={[6, 4, 3]} />
        </mesh>
        <CoffeeMachine position={[0, 4, 0]} />
        <CoffeeCup position={[2, 4.1, 0.5]} />
      </group>

      <FireExtinguisher
        position={[hubCenter.x + 8, hubCenter.y, hubCenter.z + 41]} // Near Lobby Door inside
        rotation={0}
      />
      {/* Projector Screen on Right Wall (East) of Conference Room */}
      <ProjectorScreen
        position={[hubCenter.x + 99, hubCenter.y, hubCenter.z - 47.5]}
        rotation={Math.PI / 2} // Facing West (into room)
      />
      {/* Laptop on Conf Table */}
      <FileFolder position={[hubCenter.x + 55, hubCenter.y + 4.5, hubCenter.z - 47.5]} />

      {/* DOORS */}
      {/* Lobby: Single Centered Door at Z=40 (Matches lobbyDividerZ) */}
      <OfficeDoor
        id="door-main"
        position={[hubCenter.x, hubCenter.y, hubCenter.z + 40]}
        label="Lobby"
      />

      {/* New Room Doors */}
      <OfficeDoor
        id="door-manager"
        position={[hubCenter.x - 30, hubCenter.y, hubCenter.z + 25]}
        rotation={Math.PI / 2}
        label="Manager"
        width={12}
      />
      <OfficeDoor
        id="door-break"
        position={[hubCenter.x + 30, hubCenter.y, hubCenter.z + 25]}
        rotation={-Math.PI / 2}
        label="Break"
        width={8} // Narrow Passage
      />

      {/* Conference Room Door */}
      {/* Wall at Z=-20. Doors centered at -50 and +50. Gap is -57 to -43 and 43 to 57 (Width 14). */}
      <OfficeDoor
        id="door-storage"
        position={[hubCenter.x - 50, hubCenter.y, hubCenter.z - 20]}
        label="Storage"
      />
      <OfficeDoor
        id="door-conf"
        position={[hubCenter.x + 50, hubCenter.y, hubCenter.z - 20]}
        label="Conference"
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

      {/* 1. LOBBY */}
      <CeilingLight
        position={[hubCenter.x, hubCenter.y + 28, hubCenter.z + 55]}
        isOn={true}
        color="#ffeedd"
        intensity={1000}
        distance={80}
      />

      {/* 2. OPEN OFFICE */}
      <CeilingLight
        position={[hubCenter.x, hubCenter.y + 28, hubCenter.z + 10]}
        isOn={true}
        color="#ffffff"
        intensity={1500}
        distance={100}
      />

      {/* 3. CONFERENCE ROOM */}
      <CeilingLight
        position={[hubCenter.x + 50, hubCenter.y + 28, hubCenter.z - 45]}
        isOn={true}
        color="#fff0e0"
        intensity={1200}
        distance={60}
      />

      {/* 4. STORAGE ROOM */}
      <CeilingLight
        position={[hubCenter.x - 50, hubCenter.y + 28, hubCenter.z - 50]}
        isOn={true}
        color="#e0e0ff"
        intensity={800}
        distance={60}
      />

      {/* Placed Boxes (Construction) */}
      {
        placedBoxes.map((pos, i) => (
          <mesh key={i} position={pos} castShadow>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="#aa8800" />
          </mesh>
        ))
      }

      {/* ZONE LABELS REMOVED */}
    </group>
  );
}
