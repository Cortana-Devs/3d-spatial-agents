import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';
import { createMaterials } from '../Systems/Materials';
import { Text } from '@react-three/drei';
import BaymaxRobot from '../Entities/BaymaxRobot';

interface Box {
    id: string;
    position: THREE.Vector3;
    claimedBy?: string; // ID of robot
}

export default function OfficeHub() {
    const addCollidableMesh = useGameStore((state) => state.addCollidableMesh);
    const removeCollidableMesh = useGameStore((state) => state.removeCollidableMesh);
    const addObstacles = useGameStore((state) => state.addObstacles);
    const removeObstacles = useGameStore((state) => state.removeObstacles);

    const groundRef = useRef<THREE.Mesh>(null);
    const deskRef = useRef<THREE.InstancedMesh>(null);
    const chairRef = useRef<THREE.InstancedMesh>(null);

    // Position: East of the Island/Social pair
    const hubCenter = new THREE.Vector3(350, 4, -250);
    const hubSize = 250;

    // --- WORKER SYSTEM STATE ---
    const [looseBoxes, setLooseBoxes] = useState<Box[]>([]);
    const [placedBoxes, setPlacedBoxes] = useState<THREE.Vector3[]>([]);

    // Initialize Scattered Boxes
    useEffect(() => {
        const boxes: Box[] = [];
        for (let i = 0; i < 20; i++) {
            boxes.push({
                id: `box-${i}`,
                position: new THREE.Vector3(
                    hubCenter.x + (Math.random() - 0.5) * 100,
                    hubCenter.y + 1, // On floor
                    hubCenter.z + (Math.random() - 0.5) * 100
                )
            });
        }
        setLooseBoxes(boxes);
    }, []);

    // System Interface for Robots
    const system = useMemo(() => ({
        findAvailableBox: (agentPos: any) => {
            // Find closest unclaimed box
            let closest: Box | null = null;
            let minStartDist = Infinity;

            // Access current state via closure? No, stale state issue.
            // Ideally use a Ref for mutable system state to avoid re-renders or passing stale logic.
            // Let's use a Ref-based manager for the "Logic" part, and sync to State for render.
            return null; // Implemented below
        },
        claimBox: (boxId: string, agentId: string) => { },
        pickUpBox: (boxId: string, agentId: string) => { },
        getNextConstructionSlot: () => new THREE.Vector3(), // Placeholder
        placeBox: (pos: THREE.Vector3) => { }
    }), []);

    // Mutable System State (Ref Pattern for High Frequency AI)
    const stateRef = useRef({
        looseBoxes: [] as Box[],
        placedBoxes: [] as THREE.Vector3[],
        nextSlotIndex: 0
    });

    // Sync State -> Ref (Initial)
    useEffect(() => {
        stateRef.current.looseBoxes = looseBoxes;
    }, [looseBoxes.length === 0]); // Only allow initial sync to not overwrite logic updates? No..
    // Actually, let's purely control finding/claiming via Ref methods to avoid loops.

    // Re-bind methods
    system.findAvailableBox = (agentPos: any) => {
        const agentVec = new THREE.Vector3(agentPos.x, agentPos.y, agentPos.z);
        let closest: Box | null = null;
        let minDist = Infinity;

        stateRef.current.looseBoxes.forEach(box => {
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
        const box = stateRef.current.looseBoxes.find(b => b.id === boxId);
        if (box) box.claimedBy = agentId;
    };

    system.pickUpBox = (boxId: string, agentId: string) => {
        // Remove from loose
        stateRef.current.looseBoxes = stateRef.current.looseBoxes.filter(b => b.id !== boxId);
        // Force Render Update
        setLooseBoxes([...stateRef.current.looseBoxes]);
    };

    system.getNextConstructionSlot = () => {
        // Simple Wall Builder
        const idx = stateRef.current.nextSlotIndex;
        stateRef.current.nextSlotIndex++;

        const row = Math.floor(idx / 10);
        const col = idx % 10;

        // Build a wall at relative offset
        const startX = hubCenter.x + 50;
        const startZ = hubCenter.z - 50;

        return new THREE.Vector3(startX + col * 2.5, hubCenter.y + 1 + row * 2.5, startZ);
    };

    system.placeBox = (pos: THREE.Vector3) => {
        stateRef.current.placedBoxes.push(pos);
        setPlacedBoxes([...stateRef.current.placedBoxes]);
    };


    const { materials } = useMemo(() => {
        const mats = createMaterials();
        return { materials: mats };
    }, []);

    // Generate Layout (Simplified Office Layout)
    const { deskMatrices, chairMatrices, obstacles } = useMemo(() => {
        const desks: THREE.Matrix4[] = [];
        const chairs: THREE.Matrix4[] = [];
        const obs: { position: THREE.Vector3; radius: number }[] = [];

        // Grid of Desks
        const rows = 4;
        const cols = 6;
        const spacingX = 20;
        const spacingZ = 15;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = hubCenter.x - (cols * spacingX) / 2 + c * spacingX;
                const z = hubCenter.z - (rows * spacingZ) / 2 + r * spacingZ;

                const pos = new THREE.Vector3(x, hubCenter.y, z);

                // Desk
                const deskMatrix = new THREE.Matrix4();
                deskMatrix.compose(pos.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Quaternion(), new THREE.Vector3(6, 0.2, 4));
                desks.push(deskMatrix);
                obs.push({ position: pos, radius: 4 });

                // Chair
                const chairMatrix = new THREE.Matrix4();
                chairMatrix.compose(pos.clone().add(new THREE.Vector3(0, 1, 3)), new THREE.Quaternion(), new THREE.Vector3(2, 2, 2));
                chairs.push(chairMatrix);
            }
        }

        return { deskMatrices: desks, chairMatrices: chairs, obstacles: obs };
    }, [hubCenter]);

    // Update Instances
    React.useLayoutEffect(() => {
        if (deskRef.current) {
            deskMatrices.forEach((m, i) => deskRef.current!.setMatrixAt(i, m));
            deskRef.current.instanceMatrix.needsUpdate = true;
        }
        if (chairRef.current) {
            chairMatrices.forEach((m, i) => chairRef.current!.setMatrixAt(i, m));
            chairRef.current.instanceMatrix.needsUpdate = true;
        }
    }, [deskMatrices, chairMatrices]);

    // Register Colliders
    useEffect(() => {
        if (groundRef.current) {
            addCollidableMesh(groundRef.current);
        }
        addObstacles(obstacles);

        return () => {
            if (groundRef.current) removeCollidableMesh(groundRef.current.uuid);
            removeObstacles(obstacles);
        };
    }, [addCollidableMesh, removeCollidableMesh, addObstacles, removeObstacles, obstacles]);

    return (
        <group>
            {/* Wooden Floor */}
            <mesh ref={groundRef} position={[hubCenter.x, hubCenter.y - 1, hubCenter.z]} receiveShadow>
                <boxGeometry args={[hubSize, 2, hubSize]} />
                <primitive object={materials.wood} attach="material" />
            </mesh>

            {/* Desks */}
            <instancedMesh ref={deskRef} args={[undefined, undefined, deskMatrices.length]} castShadow receiveShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#333" roughness={0.5} />
            </instancedMesh>

            {/* Chairs */}
            <instancedMesh ref={chairRef} args={[undefined, undefined, chairMatrices.length]} castShadow receiveShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#666" roughness={0.7} />
            </instancedMesh>

            {/* Signage */}
            <group position={[hubCenter.x, hubCenter.y + 15, hubCenter.z - 50]}>
                <Text
                    fontSize={10}
                    color="#00ffff"
                    anchorX="center"
                    anchorY="middle"
                >
                    OFFICE HUB
                </Text>
            </group>

            {/* --- LIGHTING --- */}

            {/* General Overhead Ambiance (Soft, Cool Office Light) */}
            <hemisphereLight intensity={0.5} groundColor="#444" skyColor="#fff" />

            {/* Key Construction Area Light */}
            <spotLight
                position={[hubCenter.x + 30, hubCenter.y + 40, hubCenter.z - 30]}
                target-position={[hubCenter.x + 50, hubCenter.y, hubCenter.z - 50]}
                intensity={4}
                angle={0.5}
                penumbra={0.5}
                castShadow
                shadow-bias={-0.0001}
            />

            {/* Desk Lamps (Simulated Points) */}
            <pointLight position={[hubCenter.x, hubCenter.y + 8, hubCenter.z]} intensity={1.5} distance={30} color="#ffaa00" />
            <pointLight position={[hubCenter.x + 40, hubCenter.y + 8, hubCenter.z - 20]} intensity={1.5} distance={30} color="#00aaff" />
            <pointLight position={[hubCenter.x - 40, hubCenter.y + 8, hubCenter.z + 20]} intensity={1.5} distance={30} color="#ffaa00" />

            {/* --- WORKER SYSTEM --- */}

            {/* Robots */}
            <BaymaxRobot id="baymax-1" system={system} initialPosition={[hubCenter.x, hubCenter.y + 2, hubCenter.z + 10]} />
            <BaymaxRobot id="baymax-2" system={system} initialPosition={[hubCenter.x + 10, hubCenter.y + 2, hubCenter.z + 10]} />
            <BaymaxRobot id="baymax-3" system={system} initialPosition={[hubCenter.x - 10, hubCenter.y + 2, hubCenter.z + 10]} />

            {/* Loose Boxes */}
            {looseBoxes.map(box => (
                <mesh key={box.id} position={box.position} castShadow>
                    <boxGeometry args={[2, 2, 2]} />
                    <meshStandardMaterial color="orange" />
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
