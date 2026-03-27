import React, { useState, useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGameStore } from "@/store/gameStore";

const metalMaterial = new THREE.MeshStandardMaterial({
    color: "#888888",
    roughness: 0.2,
    metalness: 0.8,
});

const darkMetal = new THREE.MeshStandardMaterial({
    color: "#222222",
    roughness: 0.4,
    metalness: 0.6,
});

export function Elevator({
    position,
    rotation = 0,
}: {
    position: [number, number, number];
    rotation?: number;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const leftDoorRef = useRef<THREE.Mesh>(null);
    const rightDoorRef = useRef<THREE.Mesh>(null);

    // Elevator logic: randomly open/close for ambiance or stay closed
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.7) {
                setIsOpen(prev => !prev);
            }
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    useFrame((state, delta) => {
        if (leftDoorRef.current && rightDoorRef.current) {
            const targetX = isOpen ? 1.5 : 0.75; // Closed ~0.75 (meeting in middle), Open ~1.5 (sliding out)

            // Left door slides left (-x local), Right door slides right (+x local)
            // Adjust based on initial positions
            // Actually, let's say center is 0. 
            // Left door target local X: -1.4 (open) vs -0.7 (closed)
            // Right door target local X: 1.4 (open) vs 0.7 (closed)

            const openOffset = 1.4;
            const closedOffset = 0.75;

            leftDoorRef.current.position.x = THREE.MathUtils.lerp(
                leftDoorRef.current.position.x,
                isOpen ? -openOffset : -closedOffset,
                delta * 2
            );
            rightDoorRef.current.position.x = THREE.MathUtils.lerp(
                rightDoorRef.current.position.x,
                isOpen ? openOffset : closedOffset,
                delta * 2
            );
        }
    });

    return (
        <group position={new THREE.Vector3(...position)} rotation={[0, rotation, 0]}>
            {/* Frame / Shaft Walls */}
            <mesh position={[0, 15, -2]} material={darkMetal}>
                <boxGeometry args={[6, 30, 1]} />
            </mesh>
            <mesh position={[-3.5, 15, 0]} material={darkMetal}>
                <boxGeometry args={[1, 30, 5]} />
            </mesh>
            <mesh position={[3.5, 15, 0]} material={darkMetal}>
                <boxGeometry args={[1, 30, 5]} />
            </mesh>
            <mesh position={[0, 31, 0]} material={darkMetal}>
                <boxGeometry args={[8, 2, 5]} />
            </mesh>

            {/* Floor Indicator Panel */}
            <mesh position={[0, 25, 2.6]} material={new THREE.MeshBasicMaterial({ color: "#000" })}>
                <boxGeometry args={[2, 1, 0.1]} />
            </mesh>
            <mesh position={[0, 25, 2.65]} material={new THREE.MeshBasicMaterial({ color: "#ff0000" })}>
                <planeGeometry args={[0.5, 0.5]} />
            </mesh>

            {/* Doors (Sliding) */}
            <group position={[0, 0, 2]}>
                <mesh ref={leftDoorRef} position={[-0.75, 12, 0]} material={metalMaterial} castShadow receiveShadow>
                    <boxGeometry args={[1.5, 24, 0.2]} />
                </mesh>
                <mesh ref={rightDoorRef} position={[0.75, 12, 0]} material={metalMaterial} castShadow receiveShadow>
                    <boxGeometry args={[1.5, 24, 0.2]} />
                </mesh>
            </group>
        </group>
    );
}
