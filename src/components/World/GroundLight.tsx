import React from 'react';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

export default function GroundLight({ position }: { position: [number, number, number] }) {
    const isNight = useGameStore((state) => state.isNight);

    return (
        <group position={position}>
            {/* Fixture Ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <ringGeometry args={[1.2, 1.6, 32]} />
                <meshStandardMaterial color="#222" />
            </mesh>
            {/* Glass Cover */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[1.2, 32]} />
                <meshBasicMaterial color={isNight ? "#ccddff" : "#445566"} toneMapped={false} />
            </mesh>

            {/* Fake Light Pool (Optimization: Replaces expensive PointLight) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} visible={isNight}>
                <circleGeometry args={[10, 32]} />
                <meshBasicMaterial
                    color="#ccddff"
                    transparent
                    opacity={0.4}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Glow Volume */}
            <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={isNight}>
                <circleGeometry args={[6, 32]} />
                <meshBasicMaterial color="#ccddff" transparent opacity={0.1} depthWrite={false} />
            </mesh>
        </group>
    );
}
