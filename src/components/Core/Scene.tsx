'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { Sky, Stats, Environment, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import Terrain from '../World/Terrain';
import Bridge from '../World/Bridge';
import SocialWorkHub from '../World/SocialWorkHub';
import Robot from '../Entities/Robot';
import AIRobot from '../Entities/AIRobot';
import ZoneController from '../Systems/ZoneController';
import { useGameStore } from '@/store/gameStore';
import { createWaterNormalMap } from '../Systems/Utilities';

extend({ Water });

declare module '@react-three/fiber' {
    interface ThreeElements {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        water: any;
    }
}

function WaterComponent() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ref = useRef<any>(null);
    const waterNormals = useMemo(() => createWaterNormalMap(), []);

    const config = useMemo(() => ({
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: waterNormals || undefined,
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x004455,
        distortionScale: 3.7,
        fog: true
    }), [waterNormals]);

    useFrame((state, delta) => {
        if (ref.current) {
            ref.current.material.uniforms.time.value += delta;
        }
    });

    return (
        <water
            ref={ref}
            args={[new THREE.PlaneGeometry(10000, 10000), config]}
            rotation-x={-Math.PI / 2}
        />
    );
}

function CameraRig({ target }: { target: React.RefObject<THREE.Group | null> }) {
    const { camera, gl } = useThree();
    const setCameraLocked = useGameStore((state) => state.setCameraLocked);
    const setDebugText = useGameStore((state) => state.setDebugText);

    const cameraState = useRef({ yaw: 0, pitch: 0 });

    useEffect(() => {
        const onMouseMove = (event: MouseEvent) => {
            if (!document.pointerLockElement) return;
            cameraState.current.yaw -= event.movementX * 0.002;
            cameraState.current.pitch -= event.movementY * 0.002;
            const limit = Math.PI / 2 - 0.1;
            cameraState.current.pitch = Math.max(-limit, Math.min(limit, cameraState.current.pitch));
        };

        const onPointerLockChange = () => {
            const locked = document.pointerLockElement === gl.domElement;
            setCameraLocked(locked);
            if (locked) {
                setDebugText("Locked! Controls: WASD/Space/Shift | Click: View | E: Sit/Stand");
            } else {
                setDebugText("Click to Resume | WASD/Space/Shift | E: Sit/Stand");
            }
        };

        const onClick = () => {
            if (document.pointerLockElement !== gl.domElement) {
                try {
                    gl.domElement.requestPointerLock();
                } catch (e) {
                    console.warn("Pointer lock failed:", e);
                }
            }
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('pointerlockchange', onPointerLockChange);
        gl.domElement.addEventListener('click', onClick);

        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('pointerlockchange', onPointerLockChange);
            gl.domElement.removeEventListener('click', onClick);
        };
    }, [gl, setCameraLocked, setDebugText]);

    useFrame(() => {
        if (!target.current) return;
        const robotPos = target.current.position.clone().add(new THREE.Vector3(0, 6.0, 0)); // Head height approx

        const camDist = 20;
        const viewAngleOffset = 0; // Fixed to third person back view

        const cx = camDist * Math.sin(cameraState.current.yaw + viewAngleOffset);
        const cz = camDist * Math.cos(cameraState.current.yaw + viewAngleOffset);
        const cy = camDist * Math.sin(cameraState.current.pitch);

        camera.position.x = robotPos.x - cx * Math.cos(cameraState.current.pitch); // eslint-disable-line react-hooks/immutability
        camera.position.z = robotPos.z - cz * Math.cos(cameraState.current.pitch); // eslint-disable-line react-hooks/immutability
        camera.position.y = robotPos.y + cy; // eslint-disable-line react-hooks/immutability
        if (camera.position.y < 2.0) camera.position.y = 2.0; // eslint-disable-line react-hooks/immutability

        camera.lookAt(robotPos);
    });

    return null;
}

export default function Scene() {
    const robotRef = useRef<THREE.Group>(null);

    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 10, -20], fov: 60 }} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.5 }}>
                <AdaptiveDpr pixelated />
                <AdaptiveEvents />
                <fog attach="fog" args={[0xd6eaf8, 0.0015]} />
                <ambientLight intensity={0.7} color="#ffeebb" />
                <hemisphereLight intensity={0.6} groundColor="#665544" color="#ffffee" />
                <directionalLight
                    position={[100, 120, 100]} // Higher sun for visibility, but still angled
                    color="#fff5e6" // Subtle warm tint
                    intensity={1.2} // Slightly softer direct light
                    castShadow
                    shadow-mapSize={[1024, 1024]} // Optimized Shadow Map
                    shadow-camera-left={-300}
                    shadow-camera-right={300}
                    shadow-camera-top={300}
                    shadow-camera-bottom={-300}
                    shadow-bias={-0.0005}
                    shadow-normalBias={0.05}
                />
                <Environment preset="city" background={false} />
                <Sky
                    distance={450000}
                    sunPosition={[100, 120, 100]} // Matches directional light
                    inclination={0}
                    azimuth={0.25}
                    turbidity={0.1}
                    rayleigh={0.5}
                    mieCoefficient={0.005}
                    mieDirectionalG={0.7}
                />
                <WaterComponent />

                <Terrain />
                <Bridge />
                <SocialWorkHub />
                <Robot groupRef={robotRef} />
                <AIRobot playerRef={robotRef} />
                <ZoneController robotRef={robotRef} />
                <CameraRig target={robotRef as React.RefObject<THREE.Group | null>} />

                <Stats />
            </Canvas>
        </div>
    );
}
