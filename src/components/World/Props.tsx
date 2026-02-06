import React, { useMemo } from "react";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";
import { Text } from "@react-three/drei";

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
}: {
    position: [number, number, number];
    rotation?: number;
}) {
    return (
        <group
            position={new THREE.Vector3(...position)}
            rotation={[0, rotation, 0]}
        >
            {/* Main Body */}
            <mesh position={[0, 1.5, 0]} castShadow receiveShadow material={plasticWhite}>
                <boxGeometry args={[3, 3, 3]} />
            </mesh>
            {/* Paper Tray */}
            <mesh
                position={[0, 2.0, 1.6]}
                rotation={[0.2, 0, 0]}
                material={new THREE.MeshStandardMaterial({
                    color: "#dddddd",
                    transparent: true,
                    opacity: 0.8,
                })}
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
}: {
    position: [number, number, number];
    rotation?: number;
}) {
    return (
        <group
            position={new THREE.Vector3(...position)}
            rotation={[0, rotation, 0]}
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
            <mesh position={[0.3, 2.8, 0]} rotation={[0, 0, -0.5]} material={plasticBlack}>
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
}: {
    position: [number, number, number];
    rotation?: number;
    color?: "blue" | "generic" | "red";
    label?: string;
}) {
    const material = color === "blue" ? paperBlue : color === "red" ? paperRed : paperWhite;

    return (
        <group
            position={new THREE.Vector3(...position)}
            rotation={[0, rotation, 0]}
        >
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
}: {
    position: [number, number, number];
    rotation?: number;
}) {
    return (
        <group
            position={new THREE.Vector3(...position)}
            rotation={[0, rotation, 0]}
        >
            {/* Legs/Frame */}
            <mesh position={[-4, 3, 0]} material={plasticBlack}>
                <cylinderGeometry args={[0.2, 0.2, 6]} />
            </mesh>
            <mesh position={[4, 3, 0]} material={plasticBlack}>
                <cylinderGeometry args={[0.2, 0.2, 6]} />
            </mesh>
            <mesh position={[0, 1, 0]} rotation={[0, 0, Math.PI / 2]} material={plasticBlack}>
                <cylinderGeometry args={[0.2, 0.2, 8]} />
            </mesh>

            {/* Board */}
            <mesh position={[0, 4, 0]} castShadow receiveShadow material={new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.1 })}>
                <boxGeometry args={[8, 4, 0.2]} />
            </mesh>
            {/* Frame Border */}
            <mesh position={[0, 4, 0]} material={new THREE.MeshStandardMaterial({ color: "#aaaaaa" })}>
                <boxGeometry args={[8.2, 4.2, 0.1]} />
            </mesh>

            {/* Tray */}
            <mesh position={[0, 2.1, 0.3]} material={new THREE.MeshStandardMaterial({ color: "#aaaaaa" })}>
                <boxGeometry args={[6, 0.2, 0.4]} />
            </mesh>
        </group>
    );
}




// --- PROJECTOR SCREEN ---
export function ProjectorScreen({
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
            {/* Screen Canvas (White) */}
            <mesh position={[0, 15, 0.2]} receiveShadow material={new THREE.MeshStandardMaterial({ color: "#fff", roughness: 0.5 })}>
                <boxGeometry args={[20, 12, 0.1]} />
            </mesh>
            {/* Frame / Casing */}
            <mesh position={[0, 21.5, 0]} material={new THREE.MeshStandardMaterial({ color: "#222" })}>
                <boxGeometry args={[22, 1, 1]} />
            </mesh>
            {/* Mounting Pole? Or just wall mounted. Let's assume wall mounted casing */}
        </group>
    );
}

// --- LAPTOP ---
export function Laptop({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
    return (
        <group position={new THREE.Vector3(...position)} rotation={[0, rotation, 0]}>
            {/* Base */}
            <mesh position={[0, 0.1, 0]} material={new THREE.MeshStandardMaterial({ color: "#333" })}>
                <boxGeometry args={[2.5, 0.2, 1.8]} />
            </mesh>
            {/* Screen (Open) */}
            <group position={[0, 0.2, -0.8]} rotation={[0.4, 0, 0]}>
                <mesh position={[0, 0.8, 0]} material={new THREE.MeshStandardMaterial({ color: "#222" })}>
                    <boxGeometry args={[2.5, 1.6, 0.1]} />
                </mesh>
                <mesh position={[0, 0.8, 0.06]} material={new THREE.MeshStandardMaterial({ color: "#4488ff", emissive: "#001133" })}>
                    <planeGeometry args={[2.3, 1.4]} />
                </mesh>
            </group>
        </group>
    );
}

// --- PEN DRIVE ---
export function PenDrive({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
    return (
        <group position={new THREE.Vector3(...position)} rotation={[0, rotation, 0]}>
            <mesh position={[0, 0.1, 0]} material={new THREE.MeshStandardMaterial({ color: "#silver", metalness: 0.8 })}>
                <boxGeometry args={[0.8, 0.2, 0.2]} />
            </mesh>
            <mesh position={[0.5, 0.1, 0]} material={new THREE.MeshStandardMaterial({ color: "#111" })}>
                <boxGeometry args={[0.3, 0.21, 0.21]} />
            </mesh>
        </group>
    );
}

// --- SMALL RACK ---
export function SmallRack({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
    return (
        <group position={new THREE.Vector3(...position)} rotation={[0, rotation, 0]}>
            <mesh position={[0, 2, 0]} castShadow receiveShadow material={new THREE.MeshStandardMaterial({ color: "#554433" })}>
                <boxGeometry args={[4, 4, 2]} />
            </mesh>
            <mesh position={[0, 3, 0]} receiveShadow material={new THREE.MeshStandardMaterial({ color: "#443322" })}>
                <boxGeometry args={[3.8, 0.1, 1.8]} />
            </mesh>
            <mesh position={[0, 1, 0]} receiveShadow material={new THREE.MeshStandardMaterial({ color: "#443322" })}>
                <boxGeometry args={[3.8, 0.1, 1.8]} />
            </mesh>
        </group>
    );
}

// --- FLOWER POT ---
export function FlowerPot({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
    return (
        <group position={new THREE.Vector3(...position)} rotation={[0, rotation, 0]}>
            {/* Pot */}
            <mesh position={[0, 0.5, 0]} castShadow material={new THREE.MeshStandardMaterial({ color: "#cc5500" })}>
                <cylinderGeometry args={[0.6, 0.4, 1.0, 16]} />
            </mesh>
            {/* Plant */}
            <mesh position={[0, 1.5, 0]} castShadow material={new THREE.MeshStandardMaterial({ color: "#228822" })}>
                <dodecahedronGeometry args={[0.8]} />
            </mesh>
        </group>
    );
}

// --- SOFA ---
export function Sofa({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
    return (
        <group position={new THREE.Vector3(...position)} rotation={[0, rotation, 0]}>
            <mesh position={[0, 1.5, 0]} castShadow receiveShadow material={new THREE.MeshStandardMaterial({ color: "#334455" })}>
                <boxGeometry args={[8, 1.5, 3]} />
            </mesh>
            {/* Backrest */}
            <mesh position={[0, 3, -1.2]} castShadow receiveShadow material={new THREE.MeshStandardMaterial({ color: "#334455" })}>
                <boxGeometry args={[8, 2, 0.6]} />
            </mesh>
            {/* Armrests */}
            <mesh position={[-3.6, 2.5, 0]} castShadow receiveShadow material={new THREE.MeshStandardMaterial({ color: "#334455" })}>
                <boxGeometry args={[0.8, 1.5, 3]} />
            </mesh>
            <mesh position={[3.6, 2.5, 0]} castShadow receiveShadow material={new THREE.MeshStandardMaterial({ color: "#334455" })}>
                <boxGeometry args={[0.8, 1.5, 3]} />
            </mesh>
        </group>
    );
}

// --- TV ---
export function TV({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
    return (
        <group position={new THREE.Vector3(...position)} rotation={[0, rotation, 0]}>
            {/* Screen */}
            <mesh position={[0, 4, 0]} castShadow material={new THREE.MeshStandardMaterial({ color: "#111" })}>
                <boxGeometry args={[8, 4.5, 0.2]} />
            </mesh>
            <mesh position={[0, 4, 0.11]} material={new THREE.MeshStandardMaterial({ color: "#000" })}>
                <planeGeometry args={[7.6, 4.2]} />
            </mesh>
            {/* Stand */}
            <mesh position={[0, 1, 0]} material={new THREE.MeshStandardMaterial({ color: "#222" })}>
                <cylinderGeometry args={[0.5, 2, 2]} />
            </mesh>
        </group>
    );
}

// --- COFFEE MACHINE ---
export function CoffeeMachine({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
    return (
        <group position={new THREE.Vector3(...position)} rotation={[0, rotation, 0]}>
            <mesh position={[0, 1.5, 0]} castShadow material={new THREE.MeshStandardMaterial({ color: "#111", metalness: 0.5 })}>
                <boxGeometry args={[2, 3, 2]} />
            </mesh>
            <mesh position={[0, 3, 0]} material={plasticBlack}>
                <cylinderGeometry args={[0.5, 0.5, 0.5]} />
            </mesh>
        </group>
    );
}

// --- COFFEE CUP ---
export function CoffeeCup({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
    return (
        <group position={new THREE.Vector3(...position)} rotation={[0, rotation, 0]}>
            <mesh position={[0, 0.25, 0]} castShadow material={new THREE.MeshStandardMaterial({ color: "#fff" })}>
                <cylinderGeometry args={[0.25, 0.2, 0.5]} />
            </mesh>
        </group>
    );
}
