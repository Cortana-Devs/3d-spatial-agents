import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import * as THREE from 'three';

export default function LevelBoundaries() {
    const addObstacles = useGameStore((state) => state.addObstacles);
    const removeObstacles = useGameStore((state) => state.removeObstacles);

    useEffect(() => {
        // Define River Obstacles (Invisible spheres to block water)
        // Bridge is roughly at Z = -280 to -320? Need to check coordinates.
        // Assuming Bridge connects Social Hub (Z ~ -350) to Island (Z ~ -200).
        // Let's block the water left and right of the bridge.

        const riverObstacles = [
            // Left of Bridge (West)
            { position: new THREE.Vector3(-60, 0, -280), radius: 30 },
            { position: new THREE.Vector3(-100, 0, -280), radius: 30 },

            // Right of Bridge (East)
            { position: new THREE.Vector3(60, 0, -280), radius: 30 },
            { position: new THREE.Vector3(100, 0, -280), radius: 30 },
        ];

        addObstacles(riverObstacles);

        return () => {
            removeObstacles(riverObstacles);
        };
    }, []);

    return null; // Invisible
}
