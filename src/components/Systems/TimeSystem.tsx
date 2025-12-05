import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '@/store/gameStore';

export default function TimeSystem() {
    // 0 = Midnight, 6 = Sunrise, 12 = Noon, 18 = Sunset, 24 = Midnight
    const timeRef = useRef(10); // Start at 10 AM
    const directionalLightRef = useRef<THREE.DirectionalLight>(null);
    const ambientLightRef = useRef<THREE.AmbientLight>(null);
    const hemiLightRef = useRef<THREE.HemisphereLight>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const skyRef = useRef<any>(null);

    // Configuration
    const dayDuration = 120; // Seconds for a full 24h cycle

    useFrame((state, delta) => {
        // Advance time
        timeRef.current += (delta / dayDuration) * 24;
        if (timeRef.current >= 24) timeRef.current = 0;

        const time = timeRef.current;

        // Calculate Sun/Moon Position (Circular Orbit)
        // Noon (12) = Top (Y+), Midnight (0) = Bottom (Y-)
        // Rise East (X+), Set West (X-)
        const angle = ((time - 6) / 24) * Math.PI * 2;
        const radius = 400;
        const sX = Math.cos(angle) * radius;
        const sY = Math.sin(angle) * radius;
        const sZ = 50; // Tilt

        const sunPosition = new THREE.Vector3(sX, sY, sZ);
        const moonPosition = new THREE.Vector3(-sX, -sY, -sZ); // Opposite

        // Update Sky Uniforms directly (No React Re-render)
        if (skyRef.current && skyRef.current.material) {
            skyRef.current.material.uniforms.sunPosition.value.copy(sunPosition);
        }

        // Lighting Logic
        const isDay = time > 6 && time < 18;
        const isNight = !isDay;

        // Colors
        const daySky = new THREE.Color('#87CEEB');
        const nightSky = new THREE.Color('#000011');
        const sunsetOrange = new THREE.Color('#fd5e53');
        const dayGround = new THREE.Color('#665544');
        const nightGround = new THREE.Color('#050505');

        let skyColor = daySky;
        let groundColor = dayGround;
        let sunIntensity = 1.5;
        let ambientIntensity = 0.5;
        let fogColor = new THREE.Color('#d6eaf8');

        // Transitions
        if (time >= 17 && time < 19) { // Sunset
            skyColor = sunsetOrange;
            fogColor = new THREE.Color('#ffccaa');
            sunIntensity = 0.5;
        } else if (time >= 5 && time < 7) { // Sunrise
            skyColor = sunsetOrange;
            fogColor = new THREE.Color('#ffccaa');
            sunIntensity = 0.5;
        } else if (isNight) {
            skyColor = nightSky;
            fogColor = new THREE.Color('#000011');
            sunIntensity = 0.0; // Sun is gone
            ambientIntensity = 0.1; // Dark
        }

        // Directional Light: Sun vs Moon
        if (directionalLightRef.current) {
            if (isDay || (time >= 5 && time < 19)) {
                // Sun is dominant
                directionalLightRef.current.position.copy(sunPosition);
                directionalLightRef.current.intensity = THREE.MathUtils.lerp(directionalLightRef.current.intensity, sunIntensity, 0.05);
                directionalLightRef.current.color.setHSL(0.1, 0.5, 0.9); // Warm Sun
                directionalLightRef.current.castShadow = true;
            } else {
                // Moon is dominant
                directionalLightRef.current.position.copy(moonPosition);
                directionalLightRef.current.intensity = THREE.MathUtils.lerp(directionalLightRef.current.intensity, 0.3, 0.05); // Dim Moon
                directionalLightRef.current.color.setHSL(0.6, 0.5, 0.9); // Cool Moon
                directionalLightRef.current.castShadow = true; // Moon shadows!
            }
        }

        // Ambient & Hemi
        if (ambientLightRef.current) {
            ambientLightRef.current.intensity = THREE.MathUtils.lerp(ambientLightRef.current.intensity, ambientIntensity, 0.05);
        }
        if (hemiLightRef.current) {
            hemiLightRef.current.color.lerp(isNight ? new THREE.Color('#000044') : new THREE.Color('#ffffee'), 0.05);
            hemiLightRef.current.groundColor.lerp(isNight ? nightGround : dayGround, 0.05);
            hemiLightRef.current.intensity = THREE.MathUtils.lerp(hemiLightRef.current.intensity, ambientIntensity, 0.05);
        }

        // Fog & Background
        state.scene.fog?.color.lerp(fogColor, 0.05);
        state.scene.background = fogColor;
    });

    return (
        <>
            <ambientLight ref={ambientLightRef} intensity={0.5} />
            <hemisphereLight ref={hemiLightRef} intensity={0.5} />
            <directionalLight
                ref={directionalLightRef}
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-camera-left={-300}
                shadow-camera-right={300}
                shadow-camera-top={300}
                shadow-camera-bottom={-300}
                shadow-bias={-0.0005}
            />

            {/* Visual Sky (Sun) */}
            <Sky
                ref={skyRef}
                distance={450000}
                inclination={0}
                azimuth={0.25}
            />

            {/* Visual Moon (Manual position update needed if we want it to move without re-render) */}
            {/* Since we removed state, we need to update Moon mesh position in useFrame too. */}
            {/* Let's use a ref for the Moon mesh */}
            <MoonMesh timeRef={timeRef} />

            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        </>
    );
}

function MoonMesh({ timeRef }: { timeRef: React.MutableRefObject<number> }) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame(() => {
        if (!meshRef.current) return;
        const time = timeRef.current;
        const angle = ((time - 6) / 24) * Math.PI * 2;
        const radius = 400;
        const sX = Math.cos(angle) * radius;
        const sY = Math.sin(angle) * radius;
        const sZ = 50;

        // Moon is opposite to Sun
        meshRef.current.position.set(-sX, -sY, -sZ);
        meshRef.current.lookAt(0, 0, 0); // Face earth
    });

    return (
        <mesh ref={meshRef}>
            <sphereGeometry args={[20, 16, 16]} />
            <meshBasicMaterial color="#ddddff" />
        </mesh>
    );
}
