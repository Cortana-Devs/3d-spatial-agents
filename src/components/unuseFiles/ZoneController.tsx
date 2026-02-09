import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '@/store/gameStore';
import * as THREE from 'three';
import { useRef } from 'react';

export default function ZoneController({ robotRef }: { robotRef: React.RefObject<THREE.Group | null> }) {
    const { scene } = useThree();

    // Zone Configuration
    const cityStartZ = -250; // Where the transition starts (on the bridge)
    const cityFullZ = -350;  // Where the transition is complete (in the city)

    // Island Atmosphere (Sunny)
    const islandFogColor = new THREE.Color(0xd6eaf8);
    const islandFogDensity = 0.0015;
    const islandAmbientColor = new THREE.Color(0xccddff);
    const islandAmbientIntensity = 0.4;

    // City/Park Atmosphere (Sunny Tech Park)
    const cityFogColor = new THREE.Color(0xe6f7ff); // Light blueish white
    const cityFogDensity = 0.005; // Less dense
    const cityAmbientColor = new THREE.Color(0xffffee); // Warm white
    const cityAmbientIntensity = 0.8; // Brighter

    useFrame(() => {
        if (!robotRef.current) return;
        const z = robotRef.current.position.z;

        // Calculate transition factor (0 = Island, 1 = City)
        let t = (z - cityStartZ) / (cityFullZ - cityStartZ);
        t = Math.max(0, Math.min(1, t));

        // Interpolate Fog
        if (scene.fog && scene.fog instanceof THREE.FogExp2) {
            scene.fog.color.lerpColors(islandFogColor, cityFogColor, t);
            scene.fog.density = THREE.MathUtils.lerp(islandFogDensity, cityFogDensity, t);
        }

        // Interpolate Ambient Light (assuming it's the first ambient light in the scene)
        // This is a bit hacky, better to pass a ref to the light if possible.
        // But for now, let's search for it or assume it's set globally.
        // Actually, we can't easily access the light component's props from here without a ref.
        // So we'll modify the scene's environment or just rely on fog for now.

        // Alternative: Modify the background color if no environment map
        if (!scene.environment) {
            scene.background = new THREE.Color().lerpColors(islandFogColor, cityFogColor, t);
        }
    });

    return null;
}
