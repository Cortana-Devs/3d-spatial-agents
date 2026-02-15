import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";
import { Text } from "@react-three/drei";
import { useInteractable } from "../Systems/useInteractable"; // Import hook
import { usePlacingArea } from "../Systems/usePlacingArea";

// --- MATERIALS ---
const plasticWhite = new THREE.MeshStandardMaterial({
  color: "#eeeeee",
  roughness: 0.2,
});
const plasticBlack = new THREE.MeshStandardMaterial({
  color: "#111111",
  roughness: 0.3,
});
const metalRed = new THREE.MeshStandardMaterial({
  color: "#cc0000",
  roughness: 0.3,
  metalness: 0.6,
});
const paperBlue = new THREE.MeshStandardMaterial({
  color: "#0066cc",
  roughness: 0.8,
});
const paperWhite = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  roughness: 0.9,
});
const paperRed = new THREE.MeshStandardMaterial({
  color: "#ff3333",
  roughness: 0.9,
});

// --- PRINTER ---
export function Printer({
  position,
  rotation = 0,
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
}) {
  const meshRef = useRef<THREE.Group>(null);
  useInteractable(meshRef, userData);
  return (
    <group
      ref={meshRef}
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      {/* Main Body */}
      <mesh
        position={[0, 1.5, 0]}
        castShadow
        receiveShadow
        material={plasticWhite}
      >
        <boxGeometry args={[3, 3, 3]} />
      </mesh>
      {/* Paper Tray */}
      <mesh
        position={[0, 2.0, 1.6]}
        rotation={[0.2, 0, 0]}
        material={
          new THREE.MeshStandardMaterial({
            color: "#dddddd",
            transparent: true,
            opacity: 0.8,
          })
        }
      >
        <boxGeometry args={[2.5, 0.1, 1.5]} />
      </mesh>
      {/* Control Panel */}
      <mesh position={[1, 3.01, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8, 0.5]} />
        <meshBasicMaterial color="#222" />
      </mesh>
      {/* Screen */}
      <mesh position={[1, 3.02, 1.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.6, 0.3]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>
    </group>
  );
}

// --- FIRE EXTINGUISHER ---
export function FireExtinguisher({
  position,
  rotation = 0,
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
}) {
  const meshRef = useRef<THREE.Group>(null);
  useInteractable(meshRef, userData);
  return (
    <group
      ref={meshRef}
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      {/* Tank */}
      <mesh position={[0, 1.5, 0]} castShadow material={metalRed}>
        <cylinderGeometry args={[0.5, 0.5, 3, 16]} />
      </mesh>
      {/* Top Dome */}
      <mesh position={[0, 3.0, 0]} castShadow material={metalRed}>
        <sphereGeometry args={[0.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {/* Nozzle/Hose */}
      <mesh
        position={[0.3, 2.8, 0]}
        rotation={[0, 0, -0.5]}
        material={plasticBlack}
      >
        <cylinderGeometry args={[0.1, 0.1, 0.8]} />
      </mesh>
      <mesh position={[0.6, 2.5, 0]} material={plasticBlack}>
        <cylinderGeometry args={[0.15, 0.15, 1.5]} />
      </mesh>
    </group>
  );
}

// --- FILE / FOLDER ---
export function FileFolder({
  position,
  rotation = 0,
  color = "generic",
  label,
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  color?: "blue" | "generic" | "red";
  label?: string;
  userData?: any;
}) {
  const meshRef = useRef<THREE.Group>(null);
  useInteractable(meshRef, userData);

  const material =
    color === "blue" ? paperBlue : color === "red" ? paperRed : paperWhite;

  return (
    <group ref={meshRef} position={position} rotation={[0, rotation, 0]}>
      {/* Stack of files or single folder */}
      <mesh position={[0, 0.1, 0]} castShadow material={material}>
        <boxGeometry args={[1.0, 0.2, 1.4]} />
      </mesh>
      {/* Label tab */}
      <mesh position={[-0.4, 0.1, -0.7]} material={material}>
        <boxGeometry args={[0.3, 0.25, 0.1]} />
      </mesh>
      {label && (
        <Text
          position={[0, 0.22, 0]}
          rotation={[-Math.PI / 2, 0, Math.PI / 2]}
          fontSize={0.4}
          color="black"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      )}
    </group>
  );
}

// --- WHITEBOARD ---
export function Whiteboard({
  position,
  rotation = 0,
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
}) {
  const meshRef = useRef<THREE.Group>(null);
  useInteractable(meshRef, userData);
  return (
    <group
      ref={meshRef}
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      {/* Legs/Frame */}
      <mesh position={[-4, 3, 0]} material={plasticBlack}>
        <cylinderGeometry args={[0.2, 0.2, 6]} />
      </mesh>
      <mesh position={[4, 3, 0]} material={plasticBlack}>
        <cylinderGeometry args={[0.2, 0.2, 6]} />
      </mesh>
      <mesh
        position={[0, 1, 0]}
        rotation={[0, 0, Math.PI / 2]}
        material={plasticBlack}
      >
        <cylinderGeometry args={[0.2, 0.2, 8]} />
      </mesh>

      {/* Board */}
      <mesh
        position={[0, 4, 0]}
        castShadow
        receiveShadow
        material={
          new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.1 })
        }
      >
        <boxGeometry args={[8, 4, 0.2]} />
      </mesh>
      {/* Frame Border */}
      <mesh
        position={[0, 4, 0]}
        material={new THREE.MeshStandardMaterial({ color: "#aaaaaa" })}
      >
        <boxGeometry args={[8.2, 4.2, 0.1]} />
      </mesh>

      {/* Tray */}
      <mesh
        position={[0, 2.1, 0.3]}
        material={new THREE.MeshStandardMaterial({ color: "#aaaaaa" })}
      >
        <boxGeometry args={[6, 0.2, 0.4]} />
      </mesh>
    </group>
  );
}

// --- PROJECTOR SCREEN ---
export function ProjectorScreen({
  position,
  rotation = 0,
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
}) {
  const meshRef = useRef<THREE.Group>(null);
  useInteractable(meshRef, userData);
  return (
    <group
      ref={meshRef}
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      {/* Screen Canvas (White) */}
      <mesh
        position={[0, 15, 0.2]}
        receiveShadow
        material={
          new THREE.MeshStandardMaterial({ color: "#fff", roughness: 0.5 })
        }
      >
        <boxGeometry args={[20, 12, 0.1]} />
      </mesh>
      {/* Frame / Casing */}
      <mesh
        position={[0, 21.5, 0]}
        material={new THREE.MeshStandardMaterial({ color: "#222" })}
      >
        <boxGeometry args={[22, 1, 1]} />
      </mesh>
      {/* Mounting Pole? Or just wall mounted. Let's assume wall mounted casing */}
    </group>
  );
}

// --- LAPTOP ---
export function Laptop({
  position,
  rotation = 0,
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
}) {
  const meshRef = useRef<THREE.Group>(null);
  useInteractable(meshRef, userData);
  return (
    <group ref={meshRef} position={position} rotation={[0, rotation, 0]}>
      {/* Base */}
      <mesh
        position={[0, 0.1, 0]}
        material={new THREE.MeshStandardMaterial({ color: "#333" })}
      >
        <boxGeometry args={[2.5, 0.2, 1.8]} />
      </mesh>
      {/* Screen (Open) */}
      <group position={[0, 0.2, -0.8]} rotation={[0.4, 0, 0]}>
        <mesh
          position={[0, 0.8, 0]}
          material={new THREE.MeshStandardMaterial({ color: "#222" })}
        >
          <boxGeometry args={[2.5, 1.6, 0.1]} />
        </mesh>
        <mesh
          position={[0, 0.8, 0.06]}
          material={
            new THREE.MeshStandardMaterial({
              color: "#4488ff",
              emissive: "#001133",
            })
          }
        >
          <planeGeometry args={[2.3, 1.4]} />
        </mesh>
      </group>
    </group>
  );
}

// --- PEN DRIVE ---
export function PenDrive({
  position,
  rotation = 0,
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
}) {
  const meshRef = useRef<THREE.Group>(null);
  useInteractable(meshRef, userData);
  return (
    <group
      ref={meshRef}
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      <mesh
        position={[0, 0.1, 0]}
        material={
          new THREE.MeshStandardMaterial({ color: "#00ffff", metalness: 0.8 })
        }
      >
        <boxGeometry args={[0.8, 0.2, 0.2]} />
      </mesh>
      <mesh
        position={[0.5, 0.1, 0]}
        material={new THREE.MeshStandardMaterial({ color: "#111" })}
      >
        <boxGeometry args={[0.3, 0.21, 0.21]} />
      </mesh>
    </group>
  );
}

// --- SMALL RACK ---
export function SmallRack({
  position,
  rotation = 0,
  userData,
  children,
  initialItems,
  initialItemsMiddle,
  initialItemsBottom,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
  children?: React.ReactNode;
  initialItems?: string[];
  initialItemsMiddle?: string[];
  initialItemsBottom?: string[];
}) {
  const meshRef = useRef<THREE.Group>(null);
  const surfaceRef = useRef<THREE.Mesh>(null);
  const middleRef = useRef<THREE.Mesh>(null);
  const bottomRef = useRef<THREE.Mesh>(null);
  useInteractable(meshRef, userData);
  usePlacingArea(surfaceRef, {
    id: userData?.id ? `${userData.id}-surface-top` : "small-rack-surface-top",
    name: userData?.name ? `${userData.name} Top` : "Small Rack Top",
    capacity: 2,
    dimensions: [3.8, 0.1, 1.8],
    initialItems,
  });
  usePlacingArea(middleRef, {
    id: userData?.id ? `${userData.id}-surface-mid` : "small-rack-surface-mid",
    name: userData?.name ? `${userData.name} Middle` : "Small Rack Middle",
    capacity: 2,
    dimensions: [3.8, 0.1, 1.8],
    initialItems: initialItemsMiddle,
  });
  usePlacingArea(bottomRef, {
    id: userData?.id ? `${userData.id}-surface-bot` : "small-rack-surface-bot",
    name: userData?.name ? `${userData.name} Bottom` : "Small Rack Bottom",
    capacity: 2,
    dimensions: [3.8, 0.1, 1.8],
    initialItems: initialItemsBottom,
  });
  const addObstacles = useGameStore((s) => s.addObstacles);
  const removeObstacles = useGameStore((s) => s.removeObstacles);
  const posVec = useMemo(
    () => new THREE.Vector3(...position),
    [position[0], position[1], position[2]],
  );
  useEffect(() => {
    // SmallRack: 4 x 4 x 2 — single box obstacle
    const obs = [
      {
        position: posVec.clone().add(new THREE.Vector3(0, 2, 0)),
        radius: 0,
        type: "furniture" as const,
        halfExtents: new THREE.Vector3(2, 2, 1),
        rotation,
      },
    ];
    addObstacles(obs);
    return () => removeObstacles(obs);
  }, [posVec, rotation, addObstacles, removeObstacles]);
  return (
    <group
      ref={meshRef}
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      <mesh
        position={[0, 2, 0]}
        castShadow
        receiveShadow
        material={new THREE.MeshStandardMaterial({ color: "#554433" })}
      >
        <boxGeometry args={[4, 4, 2]} />
      </mesh>
      {/* Top shelf surface (placing area) */}
      <mesh ref={surfaceRef} position={[0, 4.05, 0]} visible={false}>
        <boxGeometry args={[3.8, 0.1, 1.8]} />
      </mesh>
      {/* Middle Surface */}
      <mesh ref={middleRef} position={[0, 2.05, 0]} visible={false}>
        <boxGeometry args={[3.8, 0.1, 1.8]} />
      </mesh>
      {/* Bottom Surface */}
      <mesh ref={bottomRef} position={[0, 0.05, 0]} visible={false}>
        <boxGeometry args={[3.8, 0.1, 1.8]} />
      </mesh>
      <mesh
        position={[0, 3, 0]}
        receiveShadow
        material={new THREE.MeshStandardMaterial({ color: "#443322" })}
      >
        <boxGeometry args={[3.8, 0.1, 1.8]} />
      </mesh>
      <mesh
        position={[0, 1, 0]}
        receiveShadow
        material={new THREE.MeshStandardMaterial({ color: "#443322" })}
      >
        <boxGeometry args={[3.8, 0.1, 1.8]} />
      </mesh>
      {/* Children (objects placed on rack surfaces) */}
      {children}
    </group>
  );
}

// --- FLOWER POT ---
export function FlowerPot({
  position,
  rotation = 0,
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
}) {
  const meshRef = useRef<THREE.Group>(null);
  useInteractable(meshRef, userData);
  return (
    <group
      ref={meshRef}
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      {/* Pot */}
      <mesh
        position={[0, 0.5, 0]}
        castShadow
        material={new THREE.MeshStandardMaterial({ color: "#cc5500" })}
      >
        <cylinderGeometry args={[0.6, 0.4, 1.0, 16]} />
      </mesh>
      {/* Plant */}
      <mesh
        position={[0, 1.5, 0]}
        castShadow
        material={new THREE.MeshStandardMaterial({ color: "#228822" })}
      >
        <dodecahedronGeometry args={[0.8]} />
      </mesh>
    </group>
  );
}

// --- SOFA ---
export function Sofa({
  position,
  rotation = 0,
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
}) {
  const meshRef = useRef<THREE.Group>(null);
  useInteractable(meshRef, userData);
  const addObstacles = useGameStore((s) => s.addObstacles);
  const removeObstacles = useGameStore((s) => s.removeObstacles);
  const posVec = useMemo(
    () => new THREE.Vector3(...position),
    [position[0], position[1], position[2]],
  );
  useEffect(() => {
    // Sofa: Split into Seat, Backrest, Armrests
    const rotQ = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      rotation,
    );

    // 1. Seat: [8, 1.5, 3] at [0, 1.5, 0]
    const seat = {
      position: new THREE.Vector3(0, 1.5, 0).applyQuaternion(rotQ).add(posVec),
      radius: 0,
      type: "furniture" as const,
      halfExtents: new THREE.Vector3(4, 0.75, 1.5),
      rotation,
    };

    // 2. Backrest: [8, 2, 0.6] at [0, 3, -1.2]
    const backrest = {
      position: new THREE.Vector3(0, 3, -1.2).applyQuaternion(rotQ).add(posVec),
      radius: 0,
      type: "furniture" as const,
      halfExtents: new THREE.Vector3(4, 1.0, 0.3),
      rotation,
    };

    // 3. Armrests: [0.8, 1.5, 3] at [±3.6, 2.5, 0]
    const armLeft = {
      position: new THREE.Vector3(-3.6, 2.5, 0)
        .applyQuaternion(rotQ)
        .add(posVec),
      radius: 0,
      type: "furniture" as const,
      halfExtents: new THREE.Vector3(0.4, 0.75, 1.5),
      rotation,
    };
    const armRight = {
      position: new THREE.Vector3(3.6, 2.5, 0)
        .applyQuaternion(rotQ)
        .add(posVec),
      radius: 0,
      type: "furniture" as const,
      halfExtents: new THREE.Vector3(0.4, 0.75, 1.5),
      rotation,
    };

    const obs = [seat, backrest, armLeft, armRight];
    addObstacles(obs);
    return () => removeObstacles(obs);
  }, [posVec, rotation, addObstacles, removeObstacles]);
  return (
    <group
      ref={meshRef}
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      <mesh
        position={[0, 1.5, 0]}
        castShadow
        receiveShadow
        material={new THREE.MeshStandardMaterial({ color: "#334455" })}
      >
        <boxGeometry args={[8, 1.5, 3]} />
      </mesh>
      {/* Backrest */}
      <mesh
        position={[0, 3, -1.2]}
        castShadow
        receiveShadow
        material={new THREE.MeshStandardMaterial({ color: "#334455" })}
      >
        <boxGeometry args={[8, 2, 0.6]} />
      </mesh>
      {/* Armrests */}
      <mesh
        position={[-3.6, 2.5, 0]}
        castShadow
        receiveShadow
        material={new THREE.MeshStandardMaterial({ color: "#334455" })}
      >
        <boxGeometry args={[0.8, 1.5, 3]} />
      </mesh>
      <mesh
        position={[3.6, 2.5, 0]}
        castShadow
        receiveShadow
        material={new THREE.MeshStandardMaterial({ color: "#334455" })}
      >
        <boxGeometry args={[0.8, 1.5, 3]} />
      </mesh>
    </group>
  );
}

// --- TV ---
export function TV({
  position,
  rotation = 0,
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
}) {
  const meshRef = useRef<THREE.Group>(null);
  useInteractable(meshRef, userData);
  return (
    <group
      ref={meshRef}
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      {/* Screen */}
      <mesh
        position={[0, 4, 0]}
        castShadow
        material={new THREE.MeshStandardMaterial({ color: "#111" })}
      >
        <boxGeometry args={[8, 4.5, 0.2]} />
      </mesh>
      <mesh
        position={[0, 4, 0.11]}
        material={new THREE.MeshStandardMaterial({ color: "#000" })}
      >
        <planeGeometry args={[7.6, 4.2]} />
      </mesh>
      {/* Stand */}
      <mesh
        position={[0, 1, 0]}
        material={new THREE.MeshStandardMaterial({ color: "#222" })}
      >
        <cylinderGeometry args={[0.5, 2, 2]} />
      </mesh>
    </group>
  );
}

// --- COFFEE MACHINE ---
export function CoffeeMachine({
  position,
  rotation = 0,
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
}) {
  const meshRef = useRef<THREE.Group>(null);
  useInteractable(meshRef, userData);
  return (
    <group
      ref={meshRef}
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      <mesh
        position={[0, 1.5, 0]}
        castShadow
        material={
          new THREE.MeshStandardMaterial({ color: "#111", metalness: 0.5 })
        }
      >
        <boxGeometry args={[2, 3, 2]} />
      </mesh>
      <mesh position={[0, 3, 0]} material={plasticBlack}>
        <cylinderGeometry args={[0.5, 0.5, 0.5]} />
      </mesh>
    </group>
  );
}

// --- COFFEE CUP ---
export function CoffeeCup({
  position,
  rotation = 0,
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
}) {
  const meshRef = useRef<THREE.Group>(null);
  useInteractable(meshRef, userData);
  return (
    <group ref={meshRef} position={position} rotation={[0, rotation, 0]}>
      <mesh
        position={[0, 0.25, 0]}
        castShadow
        material={new THREE.MeshStandardMaterial({ color: "#fff" })}
      >
        <cylinderGeometry args={[0.25, 0.2, 0.5]} />
      </mesh>
    </group>
  );
}

// --- TELEPHONE ---
export function Telephone({
  position,
  rotation = 0,
  userData,
}: {
  position: [number, number, number];
  rotation?: number;
  userData?: any;
}) {
  const meshRef = useRef<THREE.Group>(null);
  useInteractable(meshRef, userData);
  return (
    <group
      ref={meshRef}
      position={new THREE.Vector3(...position)}
      rotation={[0, rotation, 0]}
      userData={userData}
    >
      {/* Base */}
      <mesh
        position={[0, 0.2, 0]}
        material={new THREE.MeshStandardMaterial({ color: "#222" })}
      >
        <boxGeometry args={[1.5, 0.4, 1.5]} />
      </mesh>
      {/* Handset */}
      <mesh
        position={[0, 0.6, 0]}
        rotation={[0, 0, Math.PI / 2]}
        material={new THREE.MeshStandardMaterial({ color: "#222" })}
      >
        <cylinderGeometry args={[0.2, 0.2, 2]} />
      </mesh>
      {/* Keypad area */}
      <mesh
        position={[0, 0.41, 0.3]}
        rotation={[-0.2, 0, 0]}
        material={new THREE.MeshStandardMaterial({ color: "#555" })}
      >
        <planeGeometry args={[0.8, 0.6]} />
      </mesh>
    </group>
  );
}

// --- COFFEE STATION ---
export function CoffeeStation({
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
  const surfaceRef = useRef<THREE.Mesh>(null);
  usePlacingArea(surfaceRef, {
    id: userData?.id ? `${userData.id}-surface` : "coffee-station-surface",
    name: userData?.name || "Coffee Station",
    capacity: 3,
    dimensions: [5.5, 0.2, 2.5],
    initialItems,
  });
  const addObstacles = useGameStore((s) => s.addObstacles);
  const removeObstacles = useGameStore((s) => s.removeObstacles);
  const posVec = useMemo(
    () => new THREE.Vector3(...position),
    [position[0], position[1], position[2]],
  );
  useEffect(() => {
    const obs = [
      {
        position: posVec.clone().add(new THREE.Vector3(0, 2, 0)),
        radius: 0,
        type: "furniture" as const,
        halfExtents: new THREE.Vector3(3, 2, 1.5),
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
      {/* Counter body */}
      <mesh
        position={[0, 2, 0]}
        castShadow
        receiveShadow
        material={new THREE.MeshStandardMaterial({ color: "#333" })}
      >
        <boxGeometry args={[6, 4, 3]} />
      </mesh>
      {/* Counter surface (placing area) */}
      <mesh ref={surfaceRef} position={[0, 4.05, 0]} visible={false}>
        <boxGeometry args={[5.5, 0.2, 2.5]} />
      </mesh>
      {/* Children (objects placed on counter) */}
      {children}
    </group>
  );
}
