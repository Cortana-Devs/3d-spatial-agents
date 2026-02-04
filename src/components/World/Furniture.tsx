import React, { useRef, useEffect, useState, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/store/gameStore";
import { Text } from "@react-three/drei";

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
}: CeilingLightProps) {
  return (
    <group position={new THREE.Vector3(...position)}>
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
}: WallSwitchProps) {
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
    <group position={posVec} rotation={[0, rotation, 0]}>
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
}: {
  position: [number, number, number];
  rotation?: number;
  id: string;
}) {
  const addInteractables = useGameStore((state) => state.addInteractables);
  const removeInteractables = useGameStore(
    (state) => state.removeInteractables,
  );

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

    return () => removeInteractables([id]);
  }, [id, posVec, rotation, addInteractables, removeInteractables]);

  return (
    <group position={posVec} rotation={[0, rotation, 0]}>
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
}: {
  position: [number, number, number];
}) {
  return (
    <group position={position}>
      {/* Main Rectangular Table Top */}
      <mesh position={[0, 4, 0]} castShadow receiveShadow>
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
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  return (
    <group
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
    >
      {/* Table Top */}
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
      <group position={[0, 4.0, -1.5]}>
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

// --- STORAGE SHELF (3-Tier) ---
export function StorageShelf({
  position,
  rotation = 0,
}: {
  position: [number, number, number];
  rotation?: number;
}) {
  const w = 80;
  const h = 12; // Total height
  const d = 5; // Depth
  const rackThickness = 0.5;

  return (
    <group
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
    >
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

      {/* 3 Racks (Planes) */}
      {[2, 7, 12].map((y, i) => (
        <mesh
          key={`rack-${i}`}
          position={[0, y - rackThickness / 2, 0]}
          castShadow
          receiveShadow
          material={metalMaterial}
        >
          <boxGeometry args={[w, rackThickness, d]} />
        </mesh>
      ))}
    </group>
  );
}

// --- OFFICE DOOR (Futuristic Vertical Slide) ---
export function OfficeDoor({
  position,
  rotation = 0,
  id,
  label,
}: {
  position: [number, number, number];
  rotation?: number;
  id: string;
  label?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const doorPanelRef = useRef<THREE.Group>(null); // The sliding part

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
  useEffect(() => {
    const obstacles: { position: THREE.Vector3; radius: number }[] = [];
    // Door is approx 14 units wide
    const step = 2.0;
    const count = Math.ceil(14 / step);

    if (!isOpen) {
      const dir = new THREE.Vector3(1, 0, 0).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        rotation,
      );
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1) - 0.5;
        const offset = dir.clone().multiplyScalar(t * 14);
        obstacles.push({
          position: posVec.clone().add(offset),
          radius: 1.5,
        });
      }
      addObstacles(obstacles);
    }

    return () => {
      if (obstacles.length > 0) removeObstacles(obstacles);
    };
  }, [isOpen, posVec, rotation, addObstacles, removeObstacles]);

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
    <group ref={groupRef} position={posVec} rotation={[0, rotation, 0]}>
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
