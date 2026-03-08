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

// --- CONFERENCE PAD ---
export function ConferencePad({
  position,
  rotation = 0,
  baseId,
  baseName,
  initialItemLeft,
  initialItemRight,
}: {
  position: [number, number, number];
  rotation?: number;
  baseId: string;
  baseName: string;
  initialItemLeft?: string;
  initialItemRight?: string;
}) {
  const padLeftRef = useRef<THREE.Mesh>(null);
  const padRightRef = useRef<THREE.Mesh>(null);

  usePlacingArea(padLeftRef, {
    id: `${baseId}-left`,
    name: `${baseName} Left`,
    capacity: 1,
    dimensions: [3.5, 0.4, 3.5],
    initialItems: initialItemLeft ? [initialItemLeft] : undefined,
  });
  usePlacingArea(padRightRef, {
    id: `${baseId}-right`,
    name: `${baseName} Right`,
    capacity: 1,
    dimensions: [3.5, 0.4, 3.5],
    initialItems: initialItemRight ? [initialItemRight] : undefined,
  });

  return (
    <group
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
    >
      {/* Left slot */}
      <mesh ref={padLeftRef} position={[-2, 0.05, 0]} visible={false}>
        <boxGeometry args={[3.5, 0.1, 3.5]} />
      </mesh>
      {/* Right slot */}
      <mesh ref={padRightRef} position={[2, 0.05, 0]} visible={false}>
        <boxGeometry args={[3.5, 0.1, 3.5]} />
      </mesh>
      {/* Visual Desk Pad (Black Leather) */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[7.5, 0.05, 3.5]} />
        <meshStandardMaterial color="#222222" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function ConferenceTable({
  position,
  rotation = 0,
  userData,
  children,
  initialItems,
  initialItemsCenter,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
  children?: React.ReactNode;
  initialItems?: string[];
  initialItemsCenter?: string[];
}) {
  const surfaceRef = useRef<THREE.Mesh>(null); // Kept for raycast or center
  const centerRef = useRef<THREE.Mesh>(null);

  // Center Zone (Shared)
  usePlacingArea(centerRef, {
    id: userData?.id ? `${userData.id}-center` : "conf-table-center",
    name: userData?.name
      ? `${userData.name} Center`
      : "Conference Table Center",
    capacity: 8, // 34×6 center zone → fits 8 items (2 rows of 4)
    dimensions: [34, 0.8, 6],
    initialItems: initialItemsCenter || initialItems, // Fallback for backward compat
  });
  const addObstacles = useGameStore((s) => s.addObstacles);
  const removeObstacles = useGameStore((s) => s.removeObstacles);
  const addCollidableMesh = useGameStore((state) => state.addCollidableMesh);
  const removeCollidableMesh = useGameStore(
    (state) => state.removeCollidableMesh,
  );

  const groupRef = useRef<THREE.Group>(null);

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

    if (groupRef.current) {
      addCollidableMesh(groupRef.current);
    }

    return () => {
      removeObstacles(obs);
      if (groupRef.current) {
        removeCollidableMesh(groupRef.current.uuid);
      }
    };
  }, [
    posVec,
    rotation,
    addObstacles,
    removeObstacles,
    addCollidableMesh,
    removeCollidableMesh,
  ]);
  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      {/* Main Rectangular Table Top - Visual */}
      <mesh ref={surfaceRef} position={[0, 4, 0]} castShadow receiveShadow>
        <boxGeometry args={[40, 0.8, 20]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Center Placing Area */}
      <mesh ref={centerRef} position={[0, 4.4, 0]} visible={false}>
        <boxGeometry args={[34, 0.1, 6]} />
      </mesh>

      {/* North Pads */}
      {[-15, 0, 15].map((x, i) => (
        <ConferencePad
          key={`pad-n-${i}`}
          position={[x, 4.425, -6.5]}
          baseId={
            userData?.id ? `${userData.id}-north-${i}` : `conf-north-${i}`
          }
          baseName={
            userData?.name ? `${userData.name} North ${i}` : `Conf North ${i}`
          }
        />
      ))}

      {/* South Pads */}
      {[-15, 0, 15].map((x, i) => (
        <ConferencePad
          key={`pad-s-${i}`}
          position={[x, 4.425, 6.5]}
          rotation={Math.PI}
          baseId={
            userData?.id ? `${userData.id}-south-${i}` : `conf-south-${i}`
          }
          baseName={
            userData?.name ? `${userData.name} South ${i}` : `Conf South ${i}`
          }
        />
      ))}

      {/* East Pad */}
      <ConferencePad
        position={[16, 4.425, 0]}
        rotation={-Math.PI / 2}
        baseId={userData?.id ? `${userData.id}-east` : `conf-east`}
        baseName={userData?.name ? `${userData.name} East` : `Conf East`}
      />

      {/* West Pad */}
      <ConferencePad
        position={[-16, 4.425, 0]}
        rotation={Math.PI / 2}
        baseId={userData?.id ? `${userData.id}-west` : `conf-west`}
        baseName={userData?.name ? `${userData.name} West` : `Conf West`}
      />

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
      {children}
    </group>
  );
}

// --- OFFICE DESK ---
export function OfficeDesk({
  position,
  rotation = 0,
  userData,
  children,
  initialItems,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
  children?: React.ReactNode;
  initialItems?: string[];
}) {
  const deskId = userData?.id || "office-desk";
  const deskName = userData?.name || "Office Desk";

  // 2 individual placing slots on the black desk pad (left / right)
  const padLeftRef = useRef<THREE.Mesh>(null);
  const padRightRef = useRef<THREE.Mesh>(null);

  // Pad is 10 wide × 3 deep. Left and right slots.
  usePlacingArea(padLeftRef, {
    id: `${deskId}-pad-left`,
    name: `${deskName} Pad Left`,
    capacity: 1,
    dimensions: [3.0, 0.4, 2.5],
    initialItems: initialItems,
  });
  usePlacingArea(padRightRef, {
    id: `${deskId}-pad-right`,
    name: `${deskName} Pad Right`,
    capacity: 1,
    dimensions: [3.0, 0.4, 2.5],
  });

  // No useEffect shift needed - we position the group directly
  const addObstacles = useGameStore((s) => s.addObstacles);
  const removeObstacles = useGameStore((s) => s.removeObstacles);
  const addCollidableMesh = useGameStore((state) => state.addCollidableMesh);
  const removeCollidableMesh = useGameStore(
    (state) => state.removeCollidableMesh,
  );

  const groupRef = useRef<THREE.Group>(null);

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

    if (groupRef.current) {
      addCollidableMesh(groupRef.current);
    }

    return () => {
      removeObstacles(obs);
      if (groupRef.current) {
        removeCollidableMesh(groupRef.current.uuid);
      }
    };
  }, [
    posVec,
    rotation,
    addObstacles,
    removeObstacles,
    addCollidableMesh,
    removeCollidableMesh,
  ]);
  return (
    <group
      ref={groupRef}
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      {/* Desk Pad Area — 2 individual placing slots */}
      <group position={[0, 3.8, 1.5]}>
        {/* Left slot */}
        <mesh ref={padLeftRef} position={[-3.3, 0, 0]} visible={false}>
          <boxGeometry args={[3.0, 0.4, 2.5]} />
        </mesh>
        {/* Right slot */}
        <mesh ref={padRightRef} position={[3.3, 0, 0]} visible={false}>
          <boxGeometry args={[3.0, 0.4, 2.5]} />
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

      {/* PC Placing Slot (back center) */}
      <group position={[0, 4.0, -1.5]}>
        {/* Invisible Slot Mesh */}
        <PCPlacingSlot
          id={`${deskId}-pc-slot`}
          name={`${deskName} PC Slot`}
          position={[0, 0, 0]}
          initialItem={
            userData?.id ? `${userData.id}-desktop-pc` : "desktop-pc"
          }
        />

        <DesktopPC
          id={userData?.id ? `${userData.id}-desktop-pc` : "desktop-pc"}
          position={[0, 0, 0]}
          rotation={0}
          userData={{
            type: "Prop",
            name: "Desktop PC",
            parentID: userData?.id,
          }}
        />
      </group>
      {children}
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
    capacity: 8, // 80×5 wide shelf → fits 8 items across
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

  const addObstacles = useGameStore((s) => s.addObstacles);
  const removeObstacles = useGameStore((s) => s.removeObstacles);
  const addCollidableMesh = useGameStore((s) => s.addCollidableMesh);
  const removeCollidableMesh = useGameStore((s) => s.removeCollidableMesh);
  const groupRef = useRef<THREE.Group>(null);
  const posVec = useMemo(
    () => new THREE.Vector3(...position),
    [position[0], position[1], position[2]],
  );
  useEffect(() => {
    // StorageShelf: 80 x 12 x 5 — single box obstacle
    const obs = [
      {
        position: posVec.clone().add(new THREE.Vector3(0, h / 2, 0)),
        radius: 0,
        type: "furniture" as const,
        halfExtents: new THREE.Vector3(w / 2, h / 2, d / 2),
        rotation,
      },
    ];
    addObstacles(obs);
    if (groupRef.current) addCollidableMesh(groupRef.current);
    return () => {
      removeObstacles(obs);
      if (groupRef.current) removeCollidableMesh(groupRef.current.uuid);
    };
  }, [
    posVec,
    rotation,
    addObstacles,
    removeObstacles,
    addCollidableMesh,
    removeCollidableMesh,
  ]);

  return (
    <group
      ref={groupRef}
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

function PCPlacingSlot({
  id,
  name,
  position,
  initialItem,
}: {
  id: string;
  name: string;
  position: [number, number, number];
  initialItem?: string;
}) {
  const surfaceRef = useRef<THREE.Mesh>(null);
  usePlacingArea(surfaceRef, {
    id,
    name,
    capacity: 1,
    dimensions: [5, 0.1, 3], // Approximate size of PC footprint area
    initialItems: initialItem ? [initialItem] : undefined,
  });

  return (
    <mesh
      ref={surfaceRef}
      position={new THREE.Vector3(...position)}
      visible={false}
    >
      <boxGeometry args={[5, 0.1, 3]} />
    </mesh>
  );
}

// --- DESKTOP PC ---
export function DesktopPC({
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

  const groupRef = useRef<THREE.Group>(null);
  const posVec = useMemo(
    () => new THREE.Vector3(...position),
    [position[0], position[1], position[2]],
  );

  useEffect(() => {
    const rotQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      rotation,
    );

    if (groupRef.current) {
      // Ensure world matrix is up to date
      groupRef.current.updateMatrixWorld(true);
      const worldPos = new THREE.Vector3();
      groupRef.current.getWorldPosition(worldPos);

      addInteractables([
        {
          id,
          type: "pc",
          position: worldPos, // Use calculated World Position
          rotation: rotQuat,
          pickable: true,
          name: "Desktop PC",
          description: "A high-performance workstation.",
          meshRef: groupRef.current || undefined,
        },
      ]);

      addCollidableMesh(groupRef.current);
    }

    return () => {
      removeInteractables([id]);
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
  ]);

  return (
    <group
      ref={groupRef}
      position={posVec}
      rotation={[0, rotation, 0]}
      userData={userData}
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
  const addCollidableMesh = useGameStore((s) => s.addCollidableMesh);
  const removeCollidableMesh = useGameStore((s) => s.removeCollidableMesh);

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
        isOpen: isOpen,
      },
    ]);
    return () => removeInteractables([id]);
  }, [id, posVec, addInteractables, removeInteractables, isOpen]);

  // Handle Interaction (Player)
  useEffect(() => {
    if (interactionTarget === id) {
      setIsOpen((prev) => !prev);
      setInteractionTarget(null);
    }
  }, [interactionTarget, id, setInteractionTarget]);

  // Handle Interaction (Agent Explicit Navigation)
  useEffect(() => {
    const handleAgentInteract = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail.targetId === id) {
        if (customEvent.detail.action === "open") {
          setIsOpen(true);
        } else if (customEvent.detail.action === "close") {
          setIsOpen(false);
        } else {
          setIsOpen((prev) => !prev);
        }
      }
    };
    window.addEventListener("agent-interact", handleAgentInteract);
    return () => {
      window.removeEventListener("agent-interact", handleAgentInteract);
    };
  }, [id]);

  // Manage Collision (Placing Obstacles for AI & Pathfinding)
  useEffect(() => {
    // 1. Static Pillars
    // They are centered at local X = -8 and +8, width 2 (halfX = 1)
    const rotQ = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      rotation,
    );

    const leftPillar = {
      position: new THREE.Vector3(-8, 15, 0).applyQuaternion(rotQ).add(posVec),
      radius: 0,
      type: "wall" as const,
      halfExtents: new THREE.Vector3(1, 15, 1.1),
      rotation,
    };
    const rightPillar = {
      position: new THREE.Vector3(8, 15, 0).applyQuaternion(rotQ).add(posVec),
      radius: 0,
      type: "wall" as const,
      halfExtents: new THREE.Vector3(1, 15, 1.1),
      rotation,
    };

    const staticObs = [leftPillar, rightPillar];

    // Dynamic Sliding Pane (blocks Player & physics if closed, but NavigationNetwork ignores "door" type)
    const dynamicObs = [];
    if (!isOpen) {
      dynamicObs.push({
        position: new THREE.Vector3(0, 15, 0).applyQuaternion(rotQ).add(posVec),
        radius: 0,
        type: "door" as const,
        halfExtents: new THREE.Vector3(7, 15, 0.5),
        rotation,
      });
    }

    const allObs = [...staticObs, ...dynamicObs];
    addObstacles(allObs);

    return () => {
      removeObstacles(allObs);
    };
  }, [posVec, rotation, isOpen, addObstacles, removeObstacles]);

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
  children,
  initialItemsLeft,
  initialItemsMid,
  initialItemsRight,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
  children?: React.ReactNode;
  initialItemsLeft?: string[];
  initialItemsMid?: string[];
  initialItemsRight?: string[];
}) {
  const deskId = userData?.id || "reception-desk";
  const deskName = userData?.name || "Reception Desk";

  const padLeftRef = useRef<THREE.Mesh>(null);
  const padMidRef = useRef<THREE.Mesh>(null);
  const padRightRef = useRef<THREE.Mesh>(null);

  usePlacingArea(padLeftRef, {
    id: `${deskId}-pad-left`,
    name: `${deskName} Left`,
    capacity: 1,
    dimensions: [4.0, 0.4, 2.5],
    initialItems: initialItemsLeft,
  });
  usePlacingArea(padMidRef, {
    id: `${deskId}-pad-middle`,
    name: `${deskName} Middle`,
    capacity: 1,
    dimensions: [4.0, 0.4, 2.5],
    initialItems: initialItemsMid,
  });
  usePlacingArea(padRightRef, {
    id: `${deskId}-pad-right`,
    name: `${deskName} Right`,
    capacity: 1,
    dimensions: [4.0, 0.4, 2.5],
    initialItems: initialItemsRight,
  });

  const addObstacles = useGameStore((s) => s.addObstacles);
  const removeObstacles = useGameStore((s) => s.removeObstacles);
  const addCollidableMesh = useGameStore((s) => s.addCollidableMesh);
  const removeCollidableMesh = useGameStore((s) => s.removeCollidableMesh);
  const groupRef = useRef<THREE.Group>(null);
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
    if (groupRef.current) addCollidableMesh(groupRef.current);
    return () => {
      removeObstacles(obs);
      if (groupRef.current) removeCollidableMesh(groupRef.current.uuid);
    };
  }, [
    posVec,
    rotation,
    addObstacles,
    removeObstacles,
    addCollidableMesh,
    removeCollidableMesh,
  ]);
  return (
    <group
      ref={groupRef}
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      {/* Rectangular Main Section */}
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

      {/* Counter Top */}
      <mesh
        position={[0, 4.1, 0]}
        material={new THREE.MeshStandardMaterial({ color: "#444" })}
      >
        <boxGeometry args={[20, 0.2, 6]} />
      </mesh>

      {/* Leather Pad */}
      <mesh
        position={[0, 4.21, -0.5]}
        material={new THREE.MeshStandardMaterial({ color: "#111" })}
      >
        <boxGeometry args={[16.0, 0.02, 4.0]} />
      </mesh>

      {/* 3 Placing Slots on the Pad */}
      <group position={[0, 4.21, -0.5]}>
        {/* Left slot */}
        <mesh ref={padLeftRef} position={[-5, 0, 0]} visible={false}>
          <boxGeometry args={[4.0, 0.4, 2.5]} />
        </mesh>
        {/* Middle slot */}
        <mesh ref={padMidRef} position={[0, 0, 0]} visible={false}>
          <boxGeometry args={[4.0, 0.4, 2.5]} />
        </mesh>
        {/* Right slot */}
        <mesh ref={padRightRef} position={[5, 0, 0]} visible={false}>
          <boxGeometry args={[4.0, 0.4, 2.5]} />
        </mesh>
      </group>

      {/* Front Panel Accents */}
      <mesh position={[0, 2, 3.1]} material={lightGlowMaterial}>
        <boxGeometry args={[18, 0.2, 0.1]} />
      </mesh>
      {children}
    </group>
  );
}

// --- MANAGERS DESK ---
export function ManagersDesk({
  position,
  rotation = 0,
  userData,
  children,
  initialItemsLeft,
  initialItemsMid,
  initialItemsRight,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
  children?: React.ReactNode;
  initialItemsLeft?: string[];
  initialItemsMid?: string[];
  initialItemsRight?: string[];
}) {
  const deskId = userData?.id || "managers-desk";
  const deskName = userData?.name || "Manager's Desk";

  // 3 individual placing slots on the leather pad (closer to chair side)
  const padLeftRef = useRef<THREE.Mesh>(null);
  const padMidRef = useRef<THREE.Mesh>(null);
  const padRightRef = useRef<THREE.Mesh>(null);

  // Pad is 15.6 wide x 3.5 deep. Placed at z=2.0
  usePlacingArea(padLeftRef, {
    id: `${deskId}-pad-left`,
    name: `${deskName} Pad Left`,
    capacity: 1,
    dimensions: [4.0, 0.4, 2.5],
    initialItems: initialItemsLeft,
  });
  usePlacingArea(padMidRef, {
    id: `${deskId}-pad-middle`,
    name: `${deskName} Pad Middle`,
    capacity: 1,
    dimensions: [4.0, 0.4, 2.5],
    initialItems: initialItemsMid,
  });
  usePlacingArea(padRightRef, {
    id: `${deskId}-pad-right`,
    name: `${deskName} Pad Right`,
    capacity: 1,
    dimensions: [4.0, 0.4, 2.5],
    initialItems: initialItemsRight,
  });
  const addObstacles = useGameStore((s) => s.addObstacles);
  const removeObstacles = useGameStore((s) => s.removeObstacles);
  const addCollidableMesh = useGameStore((s) => s.addCollidableMesh);
  const removeCollidableMesh = useGameStore((s) => s.removeCollidableMesh);
  const groupRef = useRef<THREE.Group>(null);
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
    if (groupRef.current) addCollidableMesh(groupRef.current);
    return () => {
      removeObstacles(obs);
      if (groupRef.current) removeCollidableMesh(groupRef.current.uuid);
    };
  }, [
    posVec,
    rotation,
    addObstacles,
    removeObstacles,
    addCollidableMesh,
    removeCollidableMesh,
  ]);
  const darkWood = new THREE.MeshStandardMaterial({
    color: "#3e2723",
    roughness: 0.4,
  });

  return (
    <group
      ref={groupRef}
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      {/* Executive Desktop */}
      <mesh position={[0, 3.8, 0]} castShadow receiveShadow material={darkWood}>
        <boxGeometry args={[16, 0.5, 8]} />
      </mesh>

      {/* 3 Placing Slots */}
      <group position={[0, 4.06, 0]}>
        {/* Left slot (opposite side) */}
        <mesh ref={padLeftRef} position={[5, 0, -2]} visible={false}>
          <boxGeometry args={[4.0, 0.4, 2.5]} />
        </mesh>
        {/* Middle slot (aligned with left and right) */}
        <mesh ref={padMidRef} position={[0, 0, -2]} visible={false}>
          <boxGeometry args={[4.0, 0.4, 2.5]} />
        </mesh>
        {/* Right slot (opposite side) */}
        <mesh ref={padRightRef} position={[-5, 0, -2]} visible={false}>
          <boxGeometry args={[4.0, 0.4, 2.5]} />
        </mesh>
      </group>
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
        position={[0, 4.06, -0.5]}
        material={new THREE.MeshStandardMaterial({ color: "#111" })}
      >
        <boxGeometry args={[15.6, 0.02, 6.0]} />
      </mesh>
      {children}
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
  const legHeight = 1.0; // Gap between floor and level 1 bottom
  const levelHeight = (h - baseHeight) / levels;

  // Self-managed obstacle registration
  const addObstacles = useGameStore((state) => state.addObstacles);
  const removeObstacles = useGameStore((state) => state.removeObstacles);
  const addCollidableMesh = useGameStore((s) => s.addCollidableMesh);
  const removeCollidableMesh = useGameStore((s) => s.removeCollidableMesh);
  const groupRef = useRef<THREE.Group>(null);

  const posVec = useMemo(
    () => new THREE.Vector3(position[0], position[1], position[2]),
    [position[0], position[1], position[2]],
  );

  useEffect(() => {
    // Cupboard: 8 x (h + legHeight) x 8 — single box obstacle
    const totalH = h + legHeight;
    const obs = [
      {
        position: posVec.clone().add(new THREE.Vector3(0, totalH / 2, 0)),
        radius: 0,
        type: "cupboard" as const,
        halfExtents: new THREE.Vector3(4, totalH / 2, 4),
        rotation,
      },
    ];
    addObstacles(obs);
    if (groupRef.current) addCollidableMesh(groupRef.current);
    return () => {
      removeObstacles(obs);
      if (groupRef.current) removeCollidableMesh(groupRef.current.uuid);
    };
  }, [
    posVec,
    rotation,
    addObstacles,
    removeObstacles,
    addCollidableMesh,
    removeCollidableMesh,
  ]);

  return (
    <group
      ref={groupRef}
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      {/* Base Plinth (Solid) */}
      <mesh position={[0, baseHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, baseHeight, d]} />
        <meshStandardMaterial color="#111" roughness={0.5} />
      </mesh>

      {/* Support Legs (4 corners) */}
      {[
        [-w / 2 + 0.4, -d / 2 + 0.4],
        [w / 2 - 0.4, -d / 2 + 0.4],
        [-w / 2 + 0.4, d / 2 - 0.4],
        [w / 2 - 0.4, d / 2 - 0.4],
      ].map(([lx, lz], li) => (
        <mesh
          key={`leg-${li}`}
          position={[lx, baseHeight + legHeight / 2, lz]}
          castShadow
        >
          <boxGeometry args={[0.4, legHeight, 0.4]} />
          <meshStandardMaterial color="#222" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {/* Main Cabinet Body (Glass) - Raised above legs */}
      <mesh
        position={[0, baseHeight + legHeight + (h - baseHeight) / 2, 0]}
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
        const yPos = baseHeight + legHeight + levelHeight / 2 + i * levelHeight;
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
      <group position={[0, h + legHeight + 0.75, 0]}>
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
        const yPos =
          baseHeight + legHeight + levelHeight / 2 + levelIndex * levelHeight;

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
  // Placing area is a thin slab on the bottom surface of the level
  const slabDimensions: [number, number, number] = [
    dimensions[0] - 0.4,
    0.2,
    dimensions[2] - 0.4,
  ];
  usePlacingArea(surfaceRef, {
    id,
    name,
    capacity: 4,
    dimensions: slabDimensions,
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
      {/* Invisible Collision/Area Volume — on the bottom surface */}
      <mesh
        ref={surfaceRef}
        position={[0, -dimensions[1] / 2 + 0.1, 0]}
        visible={false}
      >
        <boxGeometry args={slabDimensions} />
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
