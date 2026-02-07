import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/store/gameStore';

export default function Portal({ position = [0, 0, 0], rotation = [0, 0, 0], onTeleport, playerRef }: { position?: [number, number, number], rotation?: [number, number, number], onTeleport?: () => void, playerRef?: React.RefObject<THREE.Group | null> }) {

    // Portal Materials
    const { frameMat, voidMat, stoneMat } = useMemo(() => {
        const frame = new THREE.MeshStandardMaterial({
            color: 0x050505, // Obsidian Black
            roughness: 0.1,  // Glossy
            metalness: 0.9,
        });

        const voidM = new THREE.MeshBasicMaterial({
            color: 0x6600ff,
            side: THREE.DoubleSide
        });

        const stone = new THREE.MeshStandardMaterial({
            color: 0x443355,
            roughness: 0.8,
            metalness: 0.2
        });

        return { frameMat: frame, voidMat: voidM, stoneMat: stone };
    }, []);

    // Collidable Meshes
    const addCollidableMesh = useGameStore((state) => state.addCollidableMesh);
    const removeCollidableMesh = useGameStore((state) => state.removeCollidableMesh);
    const setDebugText = useGameStore((state) => state.setDebugText);

    const leftPillarRef = useRef<THREE.Mesh>(null);
    const rightPillarRef = useRef<THREE.Mesh>(null);
    const baseRef = useRef<THREE.Mesh>(null);

    // Interaction State
    const inRange = useRef(false);
    const groupRef = useRef<THREE.Group>(null);
    const voidRef = useRef<THREE.Mesh>(null);

    // Register Colliders for Physics
    useEffect(() => {
        const meshes = [leftPillarRef.current, rightPillarRef.current, baseRef.current];
        meshes.forEach(m => {
            if (m) addCollidableMesh(m);
        });

        return () => {
            meshes.forEach(m => {
                if (m) removeCollidableMesh(m.uuid);
            });
        };
    }, [addCollidableMesh, removeCollidableMesh]);

    // Magic Stones (Procedural Placement)
    const stones = useMemo(() => {
        const items: { pos: THREE.Vector3, scale: number, rot: THREE.Euler }[] = [];
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 18 + Math.random() * 5;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            items.push({
                pos: new THREE.Vector3(x, 1 + Math.random(), z),
                scale: 2 + Math.random() * 2,
                rot: new THREE.Euler(Math.random(), Math.random(), Math.random())
            });
        }
        return items;
    }, []);

    // Interaction Loop
    useFrame((state) => {
        if (!groupRef.current) return;

        // Find Player via Ref (Preferred) or Fallback
        const player = playerRef?.current || state.scene.getObjectByName("Robot_Group");

        if (player) {
            const worldPos = new THREE.Vector3();
            groupRef.current.getWorldPosition(worldPos);

            const dist = player.position.distanceTo(worldPos);
            // console.log("Portal Distance:", dist); // Debug log (can remove later)

            if (dist < 25) { // Increased range for larger portal
                if (!inRange.current) {
                    console.log("Portal: Player In Range!"); // Debug
                    inRange.current = true;
                    setDebugText("Press 'X' to Enter Portal");
                }
            } else {
                if (inRange.current) {
                    console.log("Portal: Player Left Range"); // Debug
                    inRange.current = false;
                    setDebugText("");
                }
            }
        }

        // Void Pulse Animation
        if (voidRef.current) {
            const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.02;
            voidRef.current.scale.set(s, s, 1);
        }
    });

    // Key Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'x' && inRange.current) {
                if (onTeleport) onTeleport();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onTeleport]);

    return (
        <group ref={groupRef} position={new THREE.Vector3(...position)} rotation={new THREE.Euler(...rotation)}>
            {/* Frame Construction */}

            {/* Left Pillar */}
            <mesh ref={leftPillarRef} position={[-12, 15, 0]} material={frameMat} castShadow receiveShadow>
                <boxGeometry args={[6, 30, 6]} />
            </mesh>

            {/* Right Pillar */}
            <mesh ref={rightPillarRef} position={[12, 15, 0]} material={frameMat} castShadow receiveShadow>
                <boxGeometry args={[6, 30, 6]} />
            </mesh>

            {/* Top Beam */}
            <mesh position={[0, 33, 0]} material={frameMat} castShadow receiveShadow>
                <boxGeometry args={[36, 6, 6]} />
            </mesh>

            {/* Bottom Base */}
            <mesh ref={baseRef} position={[0, 1.5, 0]} material={frameMat} castShadow receiveShadow>
                <boxGeometry args={[42, 3, 12]} />
            </mesh>

            {/* The Void (Inner Glow) */}
            <mesh ref={voidRef} position={[0, 16.5, 0]}>
                <planeGeometry args={[18, 27]} />
                <primitive object={voidMat} attach="material" />
            </mesh>

            {/* Backing Plate */}
            <mesh position={[0, 16.5, -0.1]}>
                <planeGeometry args={[18, 27]} />
                <meshStandardMaterial color="black" />
            </mesh>

            {/* Glowing Text Label */}
            <group position={[10, 28, 3.2]}>
                <Text
                    fontSize={5}
                    color="#ff0000"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.1}
                    outlineColor="black"
                >
                    JR 0
                </Text>
            </group>

            {/* Stronger Light */}
            <pointLight position={[0, 15, 5]} color="#8800ff" intensity={5} distance={50} />

            {/* Magic Stones */}
            {stones.map((s, i) => (
                <StoneCollider key={i} position={s.pos} rotation={s.rot} scale={s.scale} material={stoneMat} />
            ))}
        </group>
    );
}

function StoneCollider({ position, rotation, scale, material }: { position: THREE.Vector3, rotation: THREE.Euler, scale: number, material: THREE.Material }) {
    const meshRef = useRef<THREE.Mesh>(null);
    const addCollidableMesh = useGameStore((state) => state.addCollidableMesh);
    const removeCollidableMesh = useGameStore((state) => state.removeCollidableMesh);

    useEffect(() => {
        const mesh = meshRef.current;
        if (mesh) {
            addCollidableMesh(mesh);
            return () => removeCollidableMesh(mesh.uuid);
        }
    }, [addCollidableMesh, removeCollidableMesh]);

    return (
        <mesh ref={meshRef} position={position} rotation={rotation} scale={[scale, scale, scale]} material={material} castShadow receiveShadow>
            <dodecahedronGeometry args={[1, 0]} />
        </mesh>
    );
}
