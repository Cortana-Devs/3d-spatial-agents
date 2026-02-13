import React, { useRef, useEffect, useState, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/store/gameStore";
import { Text, Text3D, Center } from "@react-three/drei";
import { usePlacingArea } from "../Systems/usePlacingArea";

// Materials shared locally or we could import standard ones
const woodMaterial = new THREE.MeshStandardMaterial({
  color: "#5a3a2a",
  roughness: 0.6,
});
const metalMaterial = new THREE.MeshStandardMaterial({
  color: "#333333",
  roughness: 0.3,
  metalness: 0.6,
});
const whitePlastic = new THREE.MeshStandardMaterial({
  color: "#eeeeee",
  roughness: 0.2,
});
const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: "#aaddff",
  transmission: 0.9,
  opacity: 0.5,
  transparent: true,
  roughness: 0.1,
});
const lightGlowMaterial = new THREE.MeshBasicMaterial({ color: "#ffffee" });
const lightOffMaterial = new THREE.MeshStandardMaterial({ color: "#444444" });

// --- CEILING LIGHT ---
export interface CeilingLightProps {
  position: [number, number, number];
  isOn: boolean;
  color?: string;
  intensity?: number;
  distance?: number;
}

export function CeilingLight({
  position,
  isOn,
  color = "#ffffff",
  intensity = 1.0,
  distance = 60,
  userData,
}: CeilingLightProps & { userData?: any }) {
  return (
    <group position={new THREE.Vector3(...position)} userData={userData}>
      {/* Fixture Base */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[2, 2, 1, 16]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      {/* Bulb / Diffuser */}
      <mesh position={[0, -0.5, 0]}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <primitive
          object={isOn ? lightGlowMaterial : lightOffMaterial}
          attach="material"
        />
      </mesh>
      {/* Actual Light Source */}
      {isOn && (
        <pointLight
          position={[0, -2, 0]}
          intensity={intensity}
          distance={distance}
          decay={2}
          color={color}
          castShadow
          shadow-bias={-0.0001}
        />
      )}
    </group>
  );
}

// --- WALL SWITCH ---
export interface WallSwitchProps {
  position: [number, number, number];
  rotation?: number; // Y-rotation
  id: string;
  isOn: boolean;
  onToggle: () => void;
}

export function WallSwitch({
  position,
  rotation = 0,
  id,
  isOn,
  onToggle,
  userData,
}: WallSwitchProps & { userData?: any }) {
  const addInteractables = useGameStore((state) => state.addInteractables);
  const removeInteractables = useGameStore(
    (state) => state.removeInteractables,
  );
  const interactionTarget = useGameStore((state) => state.interactionTarget);
  const setInteractionTarget = useGameStore(
    (state) => state.setInteractionTarget,
  );

  const posVec = useMemo(
    () => new THREE.Vector3(position[0], position[1], position[2]),
    [position[0], position[1], position[2]],
  );

  // Register Interactable
  useEffect(() => {
    addInteractables([
      {
        id,
        type: "switch",
        position: posVec,
        rotation: new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          rotation,
        ),
        label: isOn ? "Turn Off" : "Turn On", // Optional hint
      },
    ]);
    return () => removeInteractables([id]);
  }, [id, posVec, rotation, addInteractables, removeInteractables, isOn]);

  // Handle Interaction
  useEffect(() => {
    if (interactionTarget === id) {
      onToggle();
      setInteractionTarget(null);
    }
  }, [interactionTarget, id, onToggle, setInteractionTarget]);

  return (
    <group position={posVec} rotation={[0, rotation, 0]} userData={userData}>
      {/* Switch Plate */}
      <mesh position={[0, 0, 0.05]} receiveShadow>
        <boxGeometry args={[1.2, 2.0, 0.1]} />
        <meshStandardMaterial color="#eeeeee" />
      </mesh>
      {/* Switch Toggle */}
      <mesh position={[0, 0, 0.15]} rotation={[isOn ? -0.2 : 0.2, 0, 0]}>
        <boxGeometry args={[0.5, 1.0, 0.2]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Indicator Light */}
      <mesh position={[0, 0.6, 0.1]}>
        <circleGeometry args={[0.1, 16]} />
        <meshBasicMaterial color={isOn ? "#00ff00" : "#ff0000"} />
      </mesh>
    </group>
  );
}

// --- OFFICE CHAIR ---
export function OfficeChair({
  position,
  rotation = 0,
  id,
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  id: string;
  userData?: any;
}) {
  const addInteractables = useGameStore((state) => state.addInteractables);
  const removeInteractables = useGameStore(
    (state) => state.removeInteractables,
  );
  const addCollidableMesh = useGameStore((state) => state.addCollidableMesh);
  const removeCollidableMesh = useGameStore(
    (state) => state.removeCollidableMesh,
  );
  const addObstacles = useGameStore((state) => state.addObstacles);
  const removeObstacles = useGameStore((state) => state.removeObstacles);

  const groupRef = useRef<THREE.Group>(null);

  // FIX: Memoize vector to prevent effect re-running on every parent render
  const posVec = useMemo(
    () => new THREE.Vector3(position[0], position[1], position[2]),
    [position[0], position[1], position[2]],
  );

  useEffect(() => {
    const rotQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      rotation,
    );

    addInteractables([
      {
        id,
        type: "chair", // or 'sofa' to match existing logic if we want to reuse that
        position: posVec,
        rotation: rotQuat,
      },
    ]);

    // Register Navigation Obstacle (Box)
    // Chair footprint approx 1.5x1.5, height 3
    const obstacle = {
      position: posVec.clone().add(new THREE.Vector3(0, 1.5, 0)),
      radius: 0,
      type: "furniture" as const,
      halfExtents: new THREE.Vector3(0.75, 1.5, 0.75),
      rotation,
    };
    addObstacles([obstacle]);

    // Register Collidable Mesh for Raycasting
    if (groupRef.current) {
      addCollidableMesh(groupRef.current);
    }

    return () => {
      removeInteractables([id]);
      removeObstacles([obstacle]);
      if (groupRef.current) {
        removeCollidableMesh(groupRef.current.uuid);
      }
    };
  }, [
    id,
    posVec,
    rotation,
    addInteractables,
    removeInteractables,
    addCollidableMesh,
    removeCollidableMesh,
    addObstacles,
    removeObstacles,
  ]);

  return (
    <group
      ref={groupRef}
      position={posVec}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      {/* Seat */}
      <mesh
        position={[0, 2.2, 0]}
        castShadow
        receiveShadow
        material={woodMaterial}
      >
        <boxGeometry args={[3, 0.4, 3]} />
      </mesh>
      {/* Backrest */}
      <mesh
        position={[0, 4.0, -1.4]}
        castShadow
        receiveShadow
        material={woodMaterial}
      >
        <boxGeometry args={[3, 3.5, 0.4]} />
      </mesh>
      {/* Legs (Central column + base) */}
      <mesh position={[0, 1.0, 0]} castShadow material={metalMaterial}>
        <cylinderGeometry args={[0.3, 0.3, 2.0, 8]} />
      </mesh>
      <mesh position={[0, 0.2, 0]} castShadow material={metalMaterial}>
        <cylinderGeometry args={[1.5, 1.5, 0.4, 8]} />
      </mesh>
    </group>
  );
}

export function ConferenceTable({
  position,
  rotation = 0,
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
}) {
  const surfaceRef = useRef<THREE.Mesh>(null);
  usePlacingArea(surfaceRef, {
    id: userData?.id || "conf-table",
    name: userData?.name || "Conference Table",
    capacity: 8,
    dimensions: [36, 0.8, 16], // Slightly smaller than top to keep items away from edge
  });
  const addObstacles = useGameStore((s) => s.addObstacles);
  const removeObstacles = useGameStore((s) => s.removeObstacles);
  const posVec = useMemo(
    () => new THREE.Vector3(...position),
    [position[0], position[1], position[2]],
  );
  useEffect(() => {
    // Conference Table: Split into Top and 4 Legs
    // Top: [40, 0.8, 20] at Y=4
    const top = {
      position: posVec.clone().add(new THREE.Vector3(0, 4, 0)),
      radius: 0,
      type: "furniture" as const,
      halfExtents: new THREE.Vector3(20, 0.4, 10),
      rotation,
    };

    // Legs: 4 cylinders at [±15, 2, ±7.5], height 4 (radius 0.5 -> box 0.5x2x0.5)
    const legPositions = [
      new THREE.Vector3(-15, 2, -7.5),
      new THREE.Vector3(15, 2, -7.5),
      new THREE.Vector3(-15, 2, 7.5),
      new THREE.Vector3(15, 2, 7.5),
    ];

    const rotQ = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      rotation,
    );

    const legs = legPositions.map((pos) => ({
      position: pos.clone().applyQuaternion(rotQ).add(posVec),
      radius: 0,
      type: "furniture" as const,
      halfExtents: new THREE.Vector3(0.5, 2.0, 0.5),
      rotation,
    }));

    const obs = [top, ...legs];
    addObstacles(obs);
    return () => removeObstacles(obs);
  }, [posVec, rotation, addObstacles, removeObstacles]);
  return (
    <group position={position} rotation={[0, rotation, 0]} userData={userData}>
      {/* Main Rectangular Table Top */}
      <mesh ref={surfaceRef} position={[0, 4, 0]} castShadow receiveShadow>
        <boxGeometry args={[40, 0.8, 20]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Table Legs */}
      <mesh position={[-15, 2, -7.5]} castShadow material={metalMaterial}>
        <cylinderGeometry args={[0.5, 0.5, 4, 8]} />
      </mesh>
      <mesh position={[15, 2, -7.5]} castShadow material={metalMaterial}>
        <cylinderGeometry args={[0.5, 0.5, 4, 8]} />
      </mesh>
      <mesh position={[-15, 2, 7.5]} castShadow material={metalMaterial}>
        <cylinderGeometry args={[0.5, 0.5, 4, 8]} />
      </mesh>
      <mesh position={[15, 2, 7.5]} castShadow material={metalMaterial}>
        <cylinderGeometry args={[0.5, 0.5, 4, 8]} />
      </mesh>
    </group>
  );
}

// --- OFFICE DESK ---
export function OfficeDesk({
  position,
  rotation = 0,
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
}) {
  const surfaceRef = useRef<THREE.Mesh>(null);
  usePlacingArea(surfaceRef, {
    id: userData?.id || "office-desk",
    name: userData?.name || "Office Desk",
    capacity: 2, // Reduced from 4 to avoid crowding
    dimensions: [10, 0.4, 3], // Only front half of desk
  });

  // No useEffect shift needed - we position the group directly
  const addObstacles = useGameStore((s) => s.addObstacles);
  const removeObstacles = useGameStore((s) => s.removeObstacles);
  const posVec = useMemo(
    () => new THREE.Vector3(...position),
    [position[0], position[1], position[2]],
  );
  useEffect(() => {
    // Office Desk: Split into Top and 2 Side Cabinets
    // Top: [12, 0.4, 6] at Y=3.8
    const top = {
      position: posVec.clone().add(new THREE.Vector3(0, 3.8, 0)),
      radius: 0,
      type: "furniture" as const,
      halfExtents: new THREE.Vector3(6, 0.2, 3),
      rotation,
    };

    // Cabinets: [1.8, 3.6, 5] at [±5, 1.8, 0]
    const cabinetPositions = [
      new THREE.Vector3(-5, 1.8, 0),
      new THREE.Vector3(5, 1.8, 0),
    ];

    const rotQ = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      rotation,
    );

    const cabinets = cabinetPositions.map((pos) => ({
      position: pos.clone().applyQuaternion(rotQ).add(posVec),
      radius: 0,
      type: "furniture" as const,
      halfExtents: new THREE.Vector3(0.9, 1.8, 2.5),
      rotation,
    }));

    const obs = [top, ...cabinets];
    addObstacles(obs);
    return () => removeObstacles(obs);
  }, [posVec, rotation, addObstacles, removeObstacles]);
  return (
    <group
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      {/* Placing Area Group (Logic + Visuals) */}
      <group position={[0, 3.8, 1.5]}>
        {/* Logical Surface (Invisible Raycast Target) */}
        <mesh visible={false} ref={surfaceRef}>
          <boxGeometry args={[10, 0.4, 3]} />
        </mesh>

        {/* Visual Desk Pad (Black Mat) */}
        <mesh position={[0, 0.205, 0]} receiveShadow>
          <boxGeometry args={[10.2, 0.05, 3.2]} />
          <meshStandardMaterial color="#222222" roughness={0.8} />
        </mesh>
      </group>

      {/* Table Top (Base) */}
      <mesh
        position={[0, 3.8, 0]}
        castShadow
        receiveShadow
        material={whitePlastic}
      >
        <boxGeometry args={[12, 0.4, 6]} />
      </mesh>
      {/* Legs / Cabinets sides */}
      <mesh
        position={[-5, 1.8, 0]}
        castShadow
        receiveShadow
        material={woodMaterial}
      >
        <boxGeometry args={[1.8, 3.6, 5]} />
      </mesh>
      <mesh
        position={[5, 1.8, 0]}
        castShadow
        receiveShadow
        material={woodMaterial}
      >
        <boxGeometry args={[1.8, 3.6, 5]} />
      </mesh>
      {/* Back Panel */}
      <mesh
        position={[0, 2.5, -2.0]}
        castShadow
        receiveShadow
        material={woodMaterial}
      >
        <boxGeometry args={[8, 2.5, 0.2]} />
      </mesh>

      {/* Monitor */}
      <group
        position={[0, 4.0, -1.5]}
        userData={
          userData
            ? {
                type: "Prop",
                id: `${userData.id}-monitor`,
                name: `${userData.name} - Monitor`,
                parentID: userData.id,
              }
            : undefined
        }
      >
        <mesh
          position={[0, 1.5, 0]}
          castShadow
          material={new THREE.MeshStandardMaterial({ color: "#111" })}
        >
          <boxGeometry args={[4, 2.5, 0.2]} />
        </mesh>
        <mesh position={[0, 0, 0]} castShadow material={metalMaterial}>
          <cylinderGeometry args={[0.2, 0.5, 0.5]} />
        </mesh>
        <mesh position={[0, -0.25, 0]} castShadow material={metalMaterial}>
          <boxGeometry args={[1.5, 0.1, 1]} />
        </mesh>
      </group>
    </group>
  );
}

// --- SHELF LEVEL COMPONENT ---
function ShelfLevel({
  position,
  dimensions,
  id,
  name,
  userData,
}: {
  position: [number, number, number];
  dimensions: [number, number, number];
  id: string;
  name: string;
  userData?: any;
}) {
  const surfaceRef = useRef<THREE.Mesh>(null);
  usePlacingArea(surfaceRef, {
    id,
    name,
    capacity: 6,
    dimensions,
  });

  return (
    <mesh
      ref={surfaceRef}
      position={new THREE.Vector3(...position)}
      castShadow
      receiveShadow
      material={metalMaterial}
      userData={userData}
    >
      <boxGeometry args={dimensions} />
    </mesh>
  );
}

// --- STORAGE SHELF (3-Tier) ---
export function StorageShelf({
  position,
  rotation = 0,
  label,
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  label?: string;
  userData?: any;
}) {
  const w = 80;
  const h = 12; // Total height (was 7)
  const d = 5; // Depth
  const rackThickness = 0.5;

  const levelLabels = ["Low", "Middle", "Top"];

  return (
    <group
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      {/* Rack Name Label */}
      {label && (
        <Text
          position={[0, h, 0]}
          fontSize={0.8}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          {label}
        </Text>
      )}

      {/* 4 Corner Legs */}
      {[
        [-w / 2 + 0.5, -d / 2 + 0.5],
        [w / 2 - 0.5, -d / 2 + 0.5],
        [-w / 2 + 0.5, d / 2 - 0.5],
        [w / 2 - 0.5, d / 2 - 0.5],
      ].map(([x, z], i) => (
        <mesh
          key={i}
          position={[x, h / 2, z]}
          castShadow
          material={metalMaterial}
        >
          <boxGeometry args={[1, h, 1]} />
        </mesh>
      ))}

      {/* 3 Racks (Planes) - Now using ShelfLevel for each */}
      {[2, 7, 12].map((y, i) => {
        const levelName = levelLabels[i];
        const specificUserData = userData
          ? {
              type: "Furniture Part",
              id: `${userData.id}-level-${i}`,
              name: `${userData.name} - ${levelName} Level`,
              parentID: userData.id,
            }
          : undefined;

        // Unique ID for placing area
        const shelfId = userData?.id
          ? `${userData.id}-level-${i}`
          : `shelf-level-${i}`;
        const shelfName = userData?.name
          ? `${userData.name} (${levelName})`
          : `Storage Shelf (${levelName})`;

        return (
          <group key={`rack-group-${i}`}>
            <ShelfLevel
              position={[0, y - rackThickness / 2, 0]}
              dimensions={[w, rackThickness, d]}
              id={shelfId}
              name={shelfName}
              userData={specificUserData}
            />
            {/* Level Label */}
            <Text
              position={[-w / 2 + 2, y + rackThickness / 2 + 0.02, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.6}
              color="white"
              anchorX="left"
              anchorY="middle"
              outlineWidth={0.03}
              outlineColor="#000000"
            >
              {levelLabels[i]}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

// --- OFFICE DOOR (Futuristic Vertical Slide) ---
export function OfficeDoor({
  position,
  rotation = 0,
  id,
  label,
  width,
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  id: string;
  label?: string;
  width?: number;
  userData?: any;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const doorPanelRef = useRef<THREE.Group>(null); // The sliding part

  // Defaults
  const doorWidth = width || 14;
  const slideDistance = doorWidth * 0.9; // Slide enough to open
  const panelHeight = 29;

  const interactionTarget = useGameStore((state) => state.interactionTarget);
  const setInteractionTarget = useGameStore(
    (state) => state.setInteractionTarget,
  );
  const addInteractables = useGameStore((state) => state.addInteractables);
  const removeInteractables = useGameStore(
    (state) => state.removeInteractables,
  );
  const addObstacles = useGameStore((state) => state.addObstacles);
  const removeObstacles = useGameStore((state) => state.removeObstacles);

  const posVec = useMemo(
    () => new THREE.Vector3(position[0], position[1], position[2]),
    [position[0], position[1], position[2]],
  );

  // Register Interactable
  useEffect(() => {
    addInteractables([
      {
        id,
        type: "door",
        position: posVec,
        rotation: new THREE.Quaternion(),
      },
    ]);
    return () => removeInteractables([id]);
  }, [id, posVec, addInteractables, removeInteractables]);

  // Handle Interaction
  useEffect(() => {
    if (interactionTarget === id) {
      setIsOpen((prev) => !prev);
      setInteractionTarget(null);
    }
  }, [interactionTarget, id, setInteractionTarget]);

  // Manage Collision
  // Manage Collision
  useEffect(() => {
    // Single Box Obstacle for Door
    // Width = doorWidth, Height = 29, Thickness = 2 (approx)
    // Only exists when !isOpen
    if (!isOpen) {
      const obstacle = {
        position: posVec.clone().add(new THREE.Vector3(0, 14.5, 0)), // Centered vertically
        radius: 0,
        type: "wall" as const,
        halfExtents: new THREE.Vector3(doorWidth / 2, 14.5, 1),
        rotation,
      };
      addObstacles([obstacle]);
      return () => removeObstacles([obstacle]);
    }
  }, [isOpen, posVec, rotation, addObstacles, removeObstacles, doorWidth]);

  // Animation (Vertical Slide)
  useFrame((state, delta) => {
    if (doorPanelRef.current) {
      // Target Y: 0 if closed, 25 (move up) if open
      const targetY = isOpen ? 25 : 0;
      doorPanelRef.current.position.y = THREE.MathUtils.lerp(
        doorPanelRef.current.position.y,
        targetY,
        delta * 5,
      );
    }
  });

  return (
    <group
      ref={groupRef}
      position={posVec}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      {/* --- Futurustic Frame --- */}
      {/* Side Pillars with Neon */}
      <group position={[8, 15, 0]}>
        <mesh material={metalMaterial} receiveShadow castShadow>
          <boxGeometry args={[2, 30, 2.2]} />
        </mesh>
        <mesh
          position={[0, 0, 1.15]}
          material={new THREE.MeshBasicMaterial({ color: "#00ffff" })}
        >
          <boxGeometry args={[0.2, 28, 0.1]} />
        </mesh>
        <mesh
          position={[0, 0, -1.15]}
          material={new THREE.MeshBasicMaterial({ color: "#00ffff" })}
        >
          <boxGeometry args={[0.2, 28, 0.1]} />
        </mesh>
      </group>
      <group position={[-8, 15, 0]}>
        <mesh material={metalMaterial} receiveShadow castShadow>
          <boxGeometry args={[2, 30, 2.2]} />
        </mesh>
        <mesh
          position={[0, 0, 1.15]}
          material={new THREE.MeshBasicMaterial({ color: "#00ffff" })}
        >
          <boxGeometry args={[0.2, 28, 0.1]} />
        </mesh>
        <mesh
          position={[0, 0, -1.15]}
          material={new THREE.MeshBasicMaterial({ color: "#00ffff" })}
        >
          <boxGeometry args={[0.2, 28, 0.1]} />
        </mesh>
      </group>

      {/* Top Header */}
      <mesh
        position={[0, 31, 0]}
        material={metalMaterial}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[18, 2, 3]} />
      </mesh>
      <mesh
        position={[0, 31, 1]}
        material={new THREE.MeshBasicMaterial({ color: "#00ffff" })}
      >
        <boxGeometry args={[16, 0.5, 0.2]} />
      </mesh>
      <mesh
        position={[0, 31, -1]}
        material={new THREE.MeshBasicMaterial({ color: "#00ffff" })}
      >
        <boxGeometry args={[16, 0.5, 0.2]} />
      </mesh>

      {/* --- Sliding Door Panel --- */}
      <group ref={doorPanelRef}>
        <mesh
          position={[0, 15, 0]}
          castShadow
          receiveShadow
          material={glassMaterial}
        >
          <boxGeometry args={[14, 29, 0.5]} />
        </mesh>
        {/* Metal borders on the glass */}
        <mesh position={[0, 15, 0]} material={metalMaterial}>
          <boxGeometry args={[14.2, 0.5, 0.6]} />
        </mesh>
        <mesh position={[0, 29, 0]} material={metalMaterial}>
          <boxGeometry args={[14.2, 0.5, 0.6]} />
        </mesh>

        {/* Center Handle / Lock Interface */}
        <mesh
          position={[0, 15, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          material={new THREE.MeshStandardMaterial({ color: "#222" })}
        >
          <cylinderGeometry args={[2, 2, 0.6, 32]} />
        </mesh>
        <mesh
          position={[0, 15, 0.35]}
          material={
            new THREE.MeshBasicMaterial({
              color: isOpen ? "#00ff00" : "#ff0000",
            })
          }
        >
          <ringGeometry args={[1, 1.2, 32]} />
        </mesh>

        {label && (
          <Text
            position={[0, 20, 0.4]}
            fontSize={2}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.1}
            outlineColor="#000000"
          >
            {label.toUpperCase()}
          </Text>
        )}
      </group>
    </group>
  );
}

// --- RECEPTION DESK ---
export function ReceptionDesk({
  position,
  rotation = 0,
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
}) {
  const surfaceRef = useRef<THREE.Mesh>(null);
  usePlacingArea(surfaceRef, {
    id: userData?.id || "reception-desk",
    name: userData?.name || "Reception Desk",
    capacity: 3,
    dimensions: [20, 0.2, 6],
  });
  const addObstacles = useGameStore((s) => s.addObstacles);
  const removeObstacles = useGameStore((s) => s.removeObstacles);
  const posVec = useMemo(
    () => new THREE.Vector3(...position),
    [position[0], position[1], position[2]],
  );
  useEffect(() => {
    // Reception Desk: 20 x 6 x 4 — single box obstacle
    const obs = [
      {
        position: posVec.clone().add(new THREE.Vector3(0, 2, 0)),
        radius: 0,
        type: "furniture" as const,
        halfExtents: new THREE.Vector3(10, 2, 3),
        rotation,
      },
    ];
    addObstacles(obs);
    return () => removeObstacles(obs);
  }, [posVec, rotation, addObstacles, removeObstacles]);
  return (
    <group
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      {/* L-Shape Main Section */}
      <mesh
        position={[0, 2, 0]}
        castShadow
        receiveShadow
        material={
          new THREE.MeshStandardMaterial({ color: "#222", roughness: 0.2 })
        }
      >
        <boxGeometry args={[20, 4, 6]} />
      </mesh>
      {/* Side Return (L-shape) */}
      <mesh
        position={[8, 2, 6]}
        castShadow
        receiveShadow
        material={
          new THREE.MeshStandardMaterial({ color: "#222", roughness: 0.2 })
        }
      >
        <boxGeometry args={[4, 4, 8]} />
      </mesh>
      {/* Counter Top */}
      <mesh
        ref={surfaceRef}
        position={[0, 4.1, 0]}
        material={new THREE.MeshStandardMaterial({ color: "#444" })}
      >
        <boxGeometry args={[20, 0.2, 6]} />
      </mesh>
      <mesh
        position={[8, 4.1, 6]}
        material={new THREE.MeshStandardMaterial({ color: "#444" })}
      >
        <boxGeometry args={[4, 0.2, 8]} />
      </mesh>

      {/* Front Panel Accents */}
      <mesh position={[0, 2, 3.1]} material={lightGlowMaterial}>
        <boxGeometry args={[18, 0.2, 0.1]} />
      </mesh>
    </group>
  );
}

// --- MANAGERS DESK ---
export function ManagersDesk({
  position,
  rotation = 0,
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
}) {
  const surfaceRef = useRef<THREE.Mesh>(null);
  usePlacingArea(surfaceRef, {
    id: userData?.id || "managers-desk",
    name: userData?.name || "Manager's Desk",
    capacity: 3,
    dimensions: [16, 0.5, 8],
  });
  const addObstacles = useGameStore((s) => s.addObstacles);
  const removeObstacles = useGameStore((s) => s.removeObstacles);
  const posVec = useMemo(
    () => new THREE.Vector3(...position),
    [position[0], position[1], position[2]],
  );
  useEffect(() => {
    // Manager Desk: 16 x 8 x 4 — single box obstacle
    const obs = [
      {
        position: posVec.clone().add(new THREE.Vector3(0, 2, 0)),
        radius: 0,
        type: "furniture" as const,
        halfExtents: new THREE.Vector3(8, 2, 4),
        rotation,
      },
    ];
    addObstacles(obs);
    return () => removeObstacles(obs);
  }, [posVec, rotation, addObstacles, removeObstacles]);
  const darkWood = new THREE.MeshStandardMaterial({
    color: "#3e2723",
    roughness: 0.4,
  });

  return (
    <group
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      {/* Executive Desktop */}
      <mesh
        ref={surfaceRef}
        position={[0, 3.8, 0]}
        castShadow
        receiveShadow
        material={darkWood}
      >
        <boxGeometry args={[16, 0.5, 8]} />
      </mesh>
      {/* Massive Legs/Cabinets */}
      <mesh
        position={[-6, 1.8, 0]}
        castShadow
        receiveShadow
        material={darkWood}
      >
        <boxGeometry args={[3, 3.6, 6]} />
      </mesh>
      <mesh position={[6, 1.8, 0]} castShadow receiveShadow material={darkWood}>
        <boxGeometry args={[3, 3.6, 6]} />
      </mesh>
      {/* Modesty Panel */}
      <mesh
        position={[0, 2.5, -2]}
        castShadow
        receiveShadow
        material={darkWood}
      >
        <boxGeometry args={[10, 3, 0.2]} />
      </mesh>
      {/* Leather Pad */}
      <mesh
        position={[0, 4.06, 1]}
        material={new THREE.MeshStandardMaterial({ color: "#111" })}
      >
        <boxGeometry args={[8, 0.02, 4]} />
      </mesh>
    </group>
  );
}

// --- CUPBOARD UNIT (Futuristic 3-Level) ---
// --- CUPBOARD UNIT (Futuristic 3-Level, 4-Sided) ---
export function CupboardUnit({
  position,
  rotation = 0,
  label = "1",
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  label?: string;
  userData?: any;
}) {
  const w = 8; // Width
  const h = 7.5; // Height (3 levels * 2.5) -- Reduced from 10 to be reachable
  const d = 8; // Depth

  const levels = 3;
  const baseHeight = 0.5; // Solid base
  const levelHeight = (h - baseHeight) / levels;

  // Self-managed obstacle registration
  const addObstacles = useGameStore((state) => state.addObstacles);
  const removeObstacles = useGameStore((state) => state.removeObstacles);

  const posVec = useMemo(
    () => new THREE.Vector3(position[0], position[1], position[2]),
    [position[0], position[1], position[2]],
  );

  useEffect(() => {
    // Cupboard: 8 x 10 x 8 — single box obstacle
    const obs = [
      {
        position: posVec.clone().add(new THREE.Vector3(0, 3.75, 0)),
        radius: 0,
        type: "cupboard" as const,
        halfExtents: new THREE.Vector3(4, 3.75, 4),
        rotation,
      },
    ];
    addObstacles(obs);
    return () => removeObstacles(obs);
  }, [posVec, rotation, addObstacles, removeObstacles]);

  return (
    <group
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      {/* Base Plinth (Solid) */}
      <mesh position={[0, baseHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, baseHeight, d]} />
        <meshStandardMaterial color="#111" roughness={0.5} />
      </mesh>

      {/* Main Cabinet Body (Glass) - Sitting on Base */}
      <mesh
        position={[0, baseHeight + (h - baseHeight) / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[w - 0.2, h - baseHeight, d - 0.2]} />
        <meshPhysicalMaterial
          color="#aaddff" // Light blue tint
          roughness={0.1}
          metalness={0.1}
          transmission={0.9} // Glass effect
          transparent={true}
          opacity={0.3}
          thickness={0.5}
        />
      </mesh>

      {/* Internal Placement Volume (Shared for all sides) */}
      {Array.from({ length: levels }).map((_, i) => {
        const levelNum = i + 1;
        const yPos = baseHeight + levelHeight / 2 + i * levelHeight;
        const levelId = userData?.id
          ? `${userData.id}-level-${levelNum}`
          : `cupboard-${label}-level-${levelNum}`;
        const levelName = userData?.name
          ? `${userData.name} - Level ${levelNum}`
          : `Cupboard ${label} Level ${levelNum}`;

        return (
          <CupboardLevel
            key={`level-vol-${i}`}
            position={[0, yPos, 0]}
            dimensions={[w, levelHeight - 0.5, d]}
            id={levelId}
            name={levelName}
          />
        );
      })}

      {/* Glowing Number at Top (Rotating billboard style or 4-sided text?) */}
      {/* Let's make it 4-sided text so it's visible from all angles */}
      {/* Top Fascia & Integrated Numbers (Sitting on Top) */}
      <group position={[0, h + 0.75, 0]}>
        {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((rot, i) => (
          <group key={`fascia-${i}`} rotation={[0, rot, 0]}>
            <mesh position={[0, 0, d / 2 + 0.05]} receiveShadow>
              <boxGeometry args={[w - 0.2, 1.5, 0.1]} />
              <meshPhysicalMaterial
                color="#000000" // Dark tint
                roughness={0.1}
                metalness={0.9}
                transmission={0.8} // See-through
                transparent={true}
                opacity={0.5}
              />
            </mesh>

            {/* Integrated Number */}
            <group position={[0, 0, d / 2 + 0.12]}>
              <Center>
                <Text3D
                  font="/fonts/helvetiker_regular.typeface.json"
                  size={1.2}
                  height={0.1}
                  curveSegments={12}
                  bevelEnabled
                  bevelThickness={0.01}
                  bevelSize={0.01}
                  bevelOffset={0}
                  bevelSegments={3}
                >
                  {label}
                  <meshStandardMaterial
                    color="#ffffff"
                    emissive="#ffffff"
                    emissiveIntensity={0.8}
                    toneMapped={false}
                  />
                </Text3D>
              </Center>
            </group>
          </group>
        ))}
      </group>

      {/* 3 Levels (Faces on 4 sides) */}
      {Array.from({ length: levels }).map((_, levelIndex) => {
        const levelNum = levelIndex + 1;
        const yPos = baseHeight + levelHeight / 2 + levelIndex * levelHeight;

        return (
          <group key={`level-${levelIndex}`} position={[0, yPos, 0]}>
            {/* Physical Shelf Floor */}
            <mesh
              position={[0, -levelHeight / 2 + 0.05, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[w - 0.2, 0.05, d - 0.2]} />
              <meshPhysicalMaterial
                color="#000000"
                metalness={0.8}
                roughness={0.2}
                transmission={0.2}
                transparent={true}
                opacity={0.8}
              />
            </mesh>

            {/* 4 Faces */}
            {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((rot, sideIndex) => (
              <group key={`side-${sideIndex}`} rotation={[0, rot, 0]}>
                {/* Drawer Face / Panel */}
                {/* Positioned slightly out from center */}
                <mesh position={[0, 0, d / 2]} castShadow>
                  <boxGeometry args={[w - 0.5, levelHeight - 0.2, 0.1]} />
                  <meshPhysicalMaterial
                    color="#ffffff"
                    roughness={0.1}
                    metalness={0.1}
                    transmission={0.9} // More clear
                    transparent={true}
                    opacity={0.2} // Less opaque
                  />
                </mesh>

                {/* Handle with Neon Strip (Thinner and sleeker) */}
                <mesh position={[0, -0.5, d / 2 + 0.1]}>
                  <boxGeometry args={[w - 2, 0.05, 0.05]} />
                  <meshBasicMaterial color="#00ffff" />
                </mesh>

                {/* Level Label */}
                <Text
                  position={[0, 0.2, d / 2 + 0.06]}
                  fontSize={0.8}
                  color="white"
                  anchorX="center"
                  anchorY="middle"
                  // font prop removed to use default (typeface.json is invalid for Text)
                >
                  {`Level 0${levelNum}`}
                </Text>
              </group>
            ))}
          </group>
        );
      })}
    </group>
  );
}

function CupboardLevel({
  position,
  dimensions,
  id,
  name,
}: {
  position: [number, number, number];
  dimensions: [number, number, number];
  id: string;
  name: string;
}) {
  const surfaceRef = useRef<THREE.Mesh>(null);
  usePlacingArea(surfaceRef, {
    id,
    name,
    capacity: 4,
    dimensions,
  });

  // Calculate generic 2x2 grid for slot visualization (matches 8x8 size approx)
  const slotOffsets = [
    [-2, -2],
    [2, -2],
    [-2, 2],
    [2, 2],
  ];

  return (
    <group position={new THREE.Vector3(...position)}>
      {/* Invisible Collision/Area Volume */}
      <mesh ref={surfaceRef} visible={false}>
        <boxGeometry args={dimensions} />
      </mesh>

      {/* Visual Slot Markers (Projected on the shelf floor) */}
      {/* Shelf floor is at y = -dimensions[1]/2. We want markers just above it. */}
      {slotOffsets.map((offset, i) => (
        <group
          key={`slot-mark-${i}`}
          position={[offset[0], -dimensions[1] / 2 + 0.1, offset[1]]}
        >
          {/* Glowing Frame */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[1.0, 1.2, 32]} />
            <meshBasicMaterial
              color="#00ffff"
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Faint Pad */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.0, 32]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.05} />
          </mesh>
          {/* Slot Number */}
          <Text
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.01, 1.6]}
            fontSize={0.4}
            color="#00ffff"
            anchorX="center"
            anchorY="middle"
          >
            {`Slot ${i + 1}`}
          </Text>
        </group>
      ))}
    </group>
  );
}
