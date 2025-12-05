import React from 'react';
import * as THREE from 'three';

export default function GroundLight({ position }: { position: [number, number, number] }) {
    return (
        <group position={position}>
            {/* Fixture Ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <ringGeometry args={[0.3, 0.4, 16]} />
                <meshStandardMaterial color="#333" />
            </mesh>
            {/* Glass Cover */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.3, 16]} />
                <meshBasicMaterial color="#ccddff" toneMapped={false} />
            </mesh>

            {/* Fake Light Pool (Optimization: Replaces expensive PointLight) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <circleGeometry args={[2.5, 32]} />
                <meshBasicMaterial
                    color="#ccddff"
                    transparent
                    opacity={0.2}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>

            {/* Glow Volume */}
            <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[1.5, 16]} />
                <meshBasicMaterial color="#ccddff" transparent opacity={0.1} depthWrite={false} />
            </mesh>
        </group>
    );
}
