import React from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

export default function StreetLamp({ position }: { position: [number, number, number] }) {
    const isNight = useGameStore((state) => state.isNight);

    return (
        <group position={position}>
            {/* Pole (Height 40m - Scaled 4x) */}
            <mesh position={[0, 20, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.8, 1.2, 40, 8]} />
                <meshStandardMaterial color="#222" roughness={0.8} />
            </mesh>
            {/* Arm */}
            <mesh position={[4.0, 38, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow receiveShadow>
                <cylinderGeometry args={[0.6, 0.6, 12, 8]} />
                <meshStandardMaterial color="#222" roughness={0.8} />
            </mesh>
            {/* Bulb Housing */}
            <mesh position={[8.0, 35, 0]}>
                <coneGeometry args={[2.4, 3.2, 8]} />
                <meshStandardMaterial color="#111" />
            </mesh>
            {/* Emissive Bulb */}
            <mesh position={[8.0, 34, 0]}>
                <sphereGeometry args={[1.2, 8, 8]} />
                <meshBasicMaterial color={isNight ? "#ffaa00" : "#333"} toneMapped={false} />
            </mesh>

            {/* Volumetric Glow (Fake) */}
            <mesh position={[8.0, 30, 0]} visible={isNight}>
                <sphereGeometry args={[8.0, 16, 16]} />
                <meshBasicMaterial color="#ffaa00" transparent opacity={0.15} depthWrite={false} />
            </mesh>

            {/* Volumetric Light Beam (Cone for Spread) */}
            <mesh position={[8.0, 14, 0]} visible={isNight}>
                <coneGeometry args={[12.0, 40, 32, 1, true]} />
                <meshBasicMaterial
                    color="#ffaa00"
                    transparent
                    opacity={0.1}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Fake Light Pool (Optimization: Replaces expensive SpotLight/PointLight) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8.0, 0.1, 0]} visible={isNight}>
                <circleGeometry args={[15.0, 32]} />
                <meshBasicMaterial
                    color="#ffaa00"
                    transparent
                    opacity={0.5}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Base */}
            <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[2.0, 2.4, 3.0, 8]} />
                <meshStandardMaterial color="#333" />
            </mesh>
        </group>
    );
}
