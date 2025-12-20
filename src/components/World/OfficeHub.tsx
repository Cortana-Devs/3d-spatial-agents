import React, { useMemo, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";
import { createMaterials } from "../Systems/Materials";
import { Text } from "@react-three/drei";
import BaymaxRobot from "../Entities/BaymaxRobot";

interface Box {
  id: string;
  position: THREE.Vector3;
  claimedBy?: string; // ID of robot
}

export default function OfficeHub() {
  const addCollidableMesh = useGameStore((state) => state.addCollidableMesh);
  const removeCollidableMesh = useGameStore(
    (state) => state.removeCollidableMesh
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

  // Initialize Scattered Boxes -> Outside Plaza (Far from building)
  useEffect(() => {
    const boxes: Box[] = [];
    for (let i = 0; i < 20; i++) {
      boxes.push({
        id: `box-${i}`,
        position: new THREE.Vector3(
          hubCenter.x + 150 + (Math.random() - 0.5) * 60, // East Plaza Far
          hubCenter.y + 1,
          hubCenter.z + (Math.random() - 0.5) * 60
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
          (b) => b.id !== boxId
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
          startZ + row * 3.0
        );
      },
      placeBox: (pos: THREE.Vector3) => {
        stateRef.current.placedBoxes.push(pos);
        setPlacedBoxes([...stateRef.current.placedBoxes]);
      },
    }),
    []
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
      (b) => b.id !== boxId
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
      startZ + row * 3.0
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
  const { walls, floors, obstacles } = useMemo(() => {
    const buildingObstacles: { position: THREE.Vector3; radius: number }[] = [];
    const wallGeoms: {
      pos: [number, number, number];
      args: [number, number, number];
    }[] = [];
    const floorGeoms: {
      pos: [number, number, number];
      args: [number, number, number];
    }[] = [];

    // Floor Plate
    floorGeoms.push({
      pos: [hubCenter.x, hubCenter.y - 0.2, hubCenter.z],
      args: [bWidth, 0.4, bDepth],
    });

    // --- WALL GENERATION HELPER ---
    // Generates visual wall and collision spheres
    const createWall = (
      x1: number,
      z1: number,
      x2: number,
      z2: number,
      thickness: number = 1.0
    ) => {
      const len = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
      const ang = Math.atan2(z2 - z1, x2 - x1);
      const mx = (x1 + x2) / 2;
      const mz = (z1 + z2) / 2;

      // Visual
      wallGeoms.push({
        pos: [mx, hubCenter.y + bHeight / 2, mz],
        args: [len, bHeight, thickness],
        rot: -ang,
      }); // We need rotation logic in rendering loop

      // Collision (Spheres along the line)
      // Use sphere radius ~2. Spacing ~1.5 to overlap and prevent passing.
      const sphereRadius = 2.0;
      const step = 1.5;
      const steps = Math.ceil(len / step);

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const wx = x1 + (x2 - x1) * t;
        const wz = z1 + (z2 - z1) * t;
        buildingObstacles.push({
          position: new THREE.Vector3(wx, hubCenter.y, wz),
          radius: sphereRadius,
        });
      }
    };

    // Coordinates relative to center
    const left = hubCenter.x - bWidth / 2;
    const right = hubCenter.x + bWidth / 2;
    const front = hubCenter.z + bDepth / 2;
    const back = hubCenter.z - bDepth / 2;

    // 1. Outer Shell
    // North Wall
    createWall(left, back, right, back);
    // East Wall
    createWall(right, back, right, front);
    // West Wall
    createWall(left, front, left, back);

    // South Wall (With Entrance)
    // Split into Left and Right segments
    // Midpoint X = hubCenter.x. Gap width = 30.
    // Entrance: x: -15 to +15.
    // Left Segment: Left -> x=-15
    createWall(left, front, hubCenter.x - 15, front);
    // Right Segment: x=+15 -> Right
    createWall(hubCenter.x + 15, front, right, front);

    // 2. Internal Partitions
    // Lobby Partition (Z = +30) with central door gap (Width 30 -> -15 to +15)
    const lobbyZ = hubCenter.z + 30;
    createWall(left, lobbyZ, hubCenter.x - 15, lobbyZ, 0.5);
    createWall(hubCenter.x + 15, lobbyZ, right, lobbyZ, 0.5);

    // North Partition (Z = -30) with 2 doors
    // Doors at (-55 to -45) and (+45 to +55)
    const northZ = hubCenter.z - 30;
    // Segment 1 (Far Left to Door 1)
    createWall(left, northZ, hubCenter.x - 55, northZ, 0.5);
    // Segment 2 (Door 1 to Door 2)
    createWall(hubCenter.x - 45, northZ, hubCenter.x + 45, northZ, 0.5);
    // Segment 3 (Door 2 to Far Right)
    createWall(hubCenter.x + 55, northZ, right, northZ, 0.5);

    // Center Vertical Split (North Zone) (X = 0, Z from -30 to Back)
    createWall(hubCenter.x, northZ, hubCenter.x, back, 0.5);

    return {
      walls: wallGeoms,
      floors: floorGeoms,
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
      <mesh
        ref={groundRef}
        position={[hubCenter.x, hubCenter.y - 1, hubCenter.z]}
        receiveShadow
      >
        <boxGeometry args={[hubSize, 5, hubSize]} />
        <primitive object={materials.wood} attach="material" />
      </mesh>

      {/* Building Structure */}
      <group ref={buildingRef}>
        {floors.map((f, i) => (
          <mesh
            key={`floor-${i}`}
            position={new THREE.Vector3(...f.pos)}
            receiveShadow
          >
            <boxGeometry args={f.args} />
            <meshStandardMaterial color="#8899aa" roughness={0.5} />
          </mesh>
        ))}
        {walls.map((w, i) => (
          <mesh
            key={`wall-${i}`}
            position={new THREE.Vector3(...w.pos)}
            rotation={[0, w.rot || 0, 0]} // Apply calculated rotation
            receiveShadow
            castShadow
          >
            {/* Note: In createWall, args includes length. BoxGeometry needs width(X), height(Y), depth(Z). 
                            We used length as X. So rotation is needed.
                        */}
            <boxGeometry args={[w.args[0], w.args[1], w.args[2]]} />
            <meshPhysicalMaterial
              color="#e0f7ff"
              transmission={0.6}
              opacity={0.4}
              transparent
              roughness={0.1}
              metalness={0.1}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

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

      {/* --- LIGHTING --- */}
      <hemisphereLight intensity={0.4} groundColor="#444" skyColor="#fff" />

      {/* Zone Lights */}
      <pointLight
        position={[hubCenter.x, hubCenter.y + 20, hubCenter.z + 50]}
        intensity={0.8}
        distance={60}
        color="#fff0dd"
      />
      <pointLight
        position={[hubCenter.x, hubCenter.y + 20, hubCenter.z]}
        intensity={1.0}
        distance={80}
        color="#fff"
      />
      <pointLight
        position={[hubCenter.x - 50, hubCenter.y + 20, hubCenter.z - 50]}
        intensity={0.8}
        distance={60}
        color="#ffd"
      />
      <pointLight
        position={[hubCenter.x + 50, hubCenter.y + 20, hubCenter.z - 50]}
        intensity={0.8}
        distance={60}
        color="#ddf"
      />

      {/* --- WORKER SYSTEM --- */}
      {/* Move Baymax agents outside to plaza */}
      <BaymaxRobot
        id="baymax-1"
        system={system}
        initialPosition={[
          hubCenter.x - 120,
          hubCenter.y + 2,
          hubCenter.z + 100,
        ]}
      />
      <BaymaxRobot
        id="baymax-2"
        system={system}
        initialPosition={[
          hubCenter.x + 120,
          hubCenter.y + 2,
          hubCenter.z + 100,
        ]}
      />
      <BaymaxRobot
        id="baymax-3"
        system={system}
        initialPosition={[hubCenter.x, hubCenter.y + 2, hubCenter.z + 150]}
      />

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
