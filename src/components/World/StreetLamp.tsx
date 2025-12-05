import React from 'react';

export default function StreetLamp({ position }: { position: [number, number, number] }) {
    return (
        <group position={position}>
            {/* Pole (Height 12m) */}
            <mesh position={[0, 6, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.2, 0.3, 12, 8]} />
                <meshStandardMaterial color="#222" roughness={0.8} />
            </mesh>
            {/* Arm */}
            <mesh position={[1.0, 11.5, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow receiveShadow>
                <cylinderGeometry args={[0.15, 0.15, 3, 8]} />
                <meshStandardMaterial color="#222" roughness={0.8} />
            </mesh>
            {/* Bulb Housing */}
            <mesh position={[2.0, 10.5, 0]}>
                <coneGeometry args={[0.6, 0.8, 8]} />
                <meshStandardMaterial color="#111" />
            </mesh>
            {/* Emissive Bulb */}
            <mesh position={[2.0, 10.2, 0]}>
                <sphereGeometry args={[0.3, 8, 8]} />
                <meshBasicMaterial color="#ffaa00" toneMapped={false} />
            </mesh>

            {/* Volumetric Glow (Fake) */}
            <mesh position={[2.0, 9.0, 0]}>
                <sphereGeometry args={[2.0, 16, 16]} />
                <meshBasicMaterial color="#ffaa00" transparent opacity={0.1} depthWrite={false} />
            </mesh>

            {/* Point Light */}
            <pointLight position={[2.0, 9.0, 0]} intensity={80.0} distance={40} decay={2} color="#ffaa00" castShadow={false} />

            {/* Base */}
            <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.5, 0.6, 1, 8]} />
                <meshStandardMaterial color="#333" />
            </mesh>
        </group>
    );
}
