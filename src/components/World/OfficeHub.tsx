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
} from "./Furniture";

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
  const [looseBoxes, setLooseBoxes] = useState<Box[]>([]);
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

  // Initialize Scattered Boxes -> Storage Room (North-West)
  useEffect(() => {
    const boxes: Box[] = [];
    for (let i = 0; i < 20; i++) {
      // Storage Room is roughly: X: [-90, -10], Z: [-70, -30]
      boxes.push({
        id: `box-${i}`,
        position: new THREE.Vector3(
          hubCenter.x - 50 + (Math.random() - 0.5) * 40,
          hubCenter.y + 1,
          hubCenter.z - 50 + (Math.random() - 0.5) * 30,
        ),
      });
    }
    setLooseBoxes(boxes);
  }, []);

  // System Interface for Robots
  const system = useMemo(
    () => ({
      findAvailableBox: (agentPos: any) => {
        const agentVec = new THREE.Vector3(agentPos.x, agentPos.y, agentPos.z);
        let closest: Box | null = null;
        let minDist = Infinity;
        stateRef.current.looseBoxes.forEach((box) => {
          if (!box.claimedBy) {
            const d = agentVec.distanceTo(box.position);
            if (d < minDist) {
              minDist = d;
              closest = box;
            }
          }
        });
        return closest;
      },
      claimBox: (boxId: string, agentId: string) => {
        const box = stateRef.current.looseBoxes.find((b) => b.id === boxId);
        if (box) box.claimedBy = agentId;
      },
      pickUpBox: (boxId: string, agentId: string) => {
        stateRef.current.looseBoxes = stateRef.current.looseBoxes.filter(
          (b) => b.id !== boxId,
        );
        setLooseBoxes([...stateRef.current.looseBoxes]);
      },
      getNextConstructionSlot: () => {
        // Construction Zone in Plaza (South East)
        const idx = stateRef.current.nextSlotIndex;
        stateRef.current.nextSlotIndex++;
        const row = Math.floor(idx / 6);
        const col = idx % 6;

        const startX = hubCenter.x + 120;
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
    looseBoxes: [] as Box[],
    placedBoxes: [] as THREE.Vector3[],
    nextSlotIndex: 0,
  });

  useEffect(() => {
    stateRef.current.looseBoxes = looseBoxes;
  }, [looseBoxes.length === 0]);

  // Re-bind methods
  system.findAvailableBox = (agentPos: any) => {
    const agentVec = new THREE.Vector3(agentPos.x, agentPos.y, agentPos.z);
    let closest: Box | null = null;
    let minDist = Infinity;
    stateRef.current.looseBoxes.forEach((box) => {
      if (!box.claimedBy) {
        const d = agentVec.distanceTo(box.position);
        if (d < minDist) {
          minDist = d;
          closest = box;
        }
      }
    });
    return closest;
  };
  system.claimBox = (boxId: string, agentId: string) => {
    const box = stateRef.current.looseBoxes.find((b) => b.id === boxId);
    if (box) box.claimedBy = agentId;
  };
  system.pickUpBox = (boxId: string, agentId: string) => {
    stateRef.current.looseBoxes = stateRef.current.looseBoxes.filter(
      (b) => b.id !== boxId,
    );
    setLooseBoxes([...stateRef.current.looseBoxes]);
  };
  system.getNextConstructionSlot = () => {
    const idx = stateRef.current.nextSlotIndex;
    stateRef.current.nextSlotIndex++;
    const row = Math.floor(idx / 6);
    const col = idx % 6;
    // Storage Zone (Outside)
    const startX = hubCenter.x + 130;
    const startZ = hubCenter.z + 80;
    return new THREE.Vector3(
      startX + col * 3.0,
      hubCenter.y + 1,
      startZ + row * 3.0,
    );
  };
  system.placeBox = (pos: THREE.Vector3) => {
    stateRef.current.placedBoxes.push(pos);
    setPlacedBoxes([...stateRef.current.placedBoxes]);
  };

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
    // Storage Side (Left): Gap centered at -50, width ~14 -> -57 to -43
    createWall(
      left,
      roomDividerZ,
      hubCenter.x - 57,
      roomDividerZ,
      "Wall-Divide-Storage-Left",
    ); // Far Left Wall
    createWall(
      hubCenter.x - 43,
      roomDividerZ,
      hubCenter.x - 5,
      roomDividerZ,
      "Wall-Divide-Storage-Right",
    ); // Mid Left Wall

    // Conference Side (Right): Gap centered at 50, width ~14 -> 43 to 57
    createWall(
      hubCenter.x + 5,
      roomDividerZ,
      hubCenter.x + 43,
      roomDividerZ,
      "Wall-Divide-Conf-Left",
    ); // Mid Right Wall
    createWall(
      hubCenter.x + 57,
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

    // B. Lobby Divider
    // Wall across X with wide entrance
    createWall(
      left,
      lobbyDividerZ,
      hubCenter.x - 15,
      lobbyDividerZ,
      "Wall-Lobby-Left",
      0.5,
    );
    createWall(
      hubCenter.x + 15,
      lobbyDividerZ,
      right,
      lobbyDividerZ,
      "Wall-Lobby-Right",
      0.5,
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
    // Rows of Shelves
    // X range [-100, 0]
    for (let i = 0; i < 3; i++) {
      // Shelf Row i
      const zPos = hubCenter.z - 65 + i * 15;
      // Long box
      createFurniture(hubCenter.x - 50, zPos, 80, 12, 4, "#667788");
    }

    // C. Open Office (Center: Z [-20, 40])
    // Desks in grid
    // 2 Rows of 3 Desks on each side of corridor?
    // Corridor X: -5 to 5.

    // Left Block (X < -5)
    for (let r = 0; r < 2; r++) {
      // 2 rows deep
      for (let c = 0; c < 3; c++) {
        // 3 desks wide
        createFurniture(
          hubCenter.x - 20 - c * 20,
          hubCenter.z + r * 30,
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
        [0, 1, 2].map((c) => (
          <group key={`desk-l-${r}-${c}`}>
            <OfficeDesk
              position={[
                hubCenter.x - 20 - c * 20,
                hubCenter.y,
                hubCenter.z + r * 30,
              ]}
            />
            <OfficeChair
              id={`chair-l-${r}-${c}`}
              position={[
                hubCenter.x - 20 - c * 20,
                hubCenter.y,
                hubCenter.z + r * 30 + 5,
              ]}
              rotation={Math.PI}
            />
          </group>
        )),
      )}
      {/* Right Block */}
      {[0, 1].map((r) =>
        [0, 1, 2].map((c) => (
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
          </group>
        )),
      )}

      {/* 3. Storage Room Shelves (Still simple boxes or upgrade?) */}
      {/* Leaving as simple boxes via createFurniture collision, but we need visual meshes since we removed 'furniture' map loop */}
      {/* Re-implementing visual shelves manually */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={`shelf-${i}`}
          position={[
            hubCenter.x - 50,
            hubCenter.y + 6,
            hubCenter.z - 65 + i * 15,
          ]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[80, 12, 4]} />
          <meshStandardMaterial color="#667788" />
        </mesh>
      ))}

      {/* 4. Reception Info Desk (Lobby) - Centered */}
      <mesh
        position={[hubCenter.x, hubCenter.y + 2, hubCenter.z + 55]}
        castShadow
      >
        <boxGeometry args={[20, 4, 5]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {/* DOORS */}
      {/* Lobby: Single Centered Door at Z=40 (Matches lobbyDividerZ) */}
      <OfficeDoor
        id="door-main"
        position={[hubCenter.x, hubCenter.y, hubCenter.z + 40]}
        label="Lobby"
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

      {/* --- WORKER SYSTEM --- */}
      {/* Move Baymax agents outside to plaza */}

      {/* Loose Boxes / Files */}
      {looseBoxes.map((box) => (
        <mesh key={box.id} position={box.position} castShadow>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#f0a050" />
        </mesh>
      ))}

      {/* Placed Boxes (Construction) */}
      {placedBoxes.map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#aa8800" />
        </mesh>
      ))}
    </group>
  );
}
