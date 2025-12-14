'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import { Sky, Stats, Environment, AdaptiveDpr, AdaptiveEvents } from '@react-three/drei';
import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import Terrain from '../World/Terrain';
import Bridge from '../World/Bridge';
import SocialWorkHub from '../World/SocialWorkHub';
import OfficeHub from '../World/OfficeHub';
import Robot from '../Entities/Robot';
import AIRobot from '../Entities/AIRobot';
import YukaSystem from '../Systems/YukaSystem';
import TimeSystem from '../Systems/TimeSystem';
import StreetLamp from '../World/StreetLamp';
import GroundLight from '../World/GroundLight';
import LevelBoundaries from '../Systems/LevelBoundaries';
import ZoneController from '../Systems/ZoneController';
import Portal from '../World/Portal';
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

    const invertedMouse = useGameStore((state) => state.invertedMouse);
    const sensitivity = useGameStore((state) => state.sensitivity);

    const cameraState = useRef({ yaw: 0, pitch: 0 });

    useEffect(() => {
        const onMouseMove = (event: MouseEvent) => {
            if (!document.pointerLockElement) return;
            
            // Apply sensitivity (base multiplier 0.002)
            const multiplier = 0.002 * sensitivity;
            
            cameraState.current.yaw -= event.movementX * multiplier;
            
            // Apply inverted mouse
            const pitchDelta = event.movementY * multiplier;
            cameraState.current.pitch -= invertedMouse ? -pitchDelta : pitchDelta;
            
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
    }, [gl, setCameraLocked, setDebugText, invertedMouse, sensitivity]);

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
            <Canvas shadows dpr={[1, 1.5]} performance={{ min: 0.5 }} camera={{ position: [0, 10, -20], fov: 60 }} gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.8 }}>
                {/* <AdaptiveDpr pixelated /> */}
                <AdaptiveEvents />
                <fog attach="fog" args={[0xd6eaf8, 0.0015]} />
                <TimeSystem />
                <WaterComponent />

                <Terrain />

                {/* --- Bridges (Triangle Network) --- */}
                {/* 1. Main: Island -> Social Hub */}
                <Bridge start={[0, 5, -120]} end={[0, 4, -300]} />

                {/* 2. Island -> Office Hub (East) */}
                <Bridge start={[20, 5, -120]} end={[350, 4, -200]} />

                {/* 3. Social Hub -> Office Hub */}
                <Bridge start={[50, 4, -350]} end={[350, 4, -300]} />

                <SocialWorkHub />
                <OfficeHub />

                {/* Street Lamps */}
                {/* Street Lamps (8 Total - 4 Outer, 4 Inner) */}
                {/* Outer Corners */}
                <StreetLamp position={[120, 2, -495]} />
                <StreetLamp position={[-120, 2, -495]} />
                <StreetLamp position={[120, 2, -255]} />
                <StreetLamp position={[-120, 2, -255]} />

                {/* Inner Ring */}
                <StreetLamp position={[50, 2, -425]} />
                <StreetLamp position={[-50, 2, -425]} />
                <StreetLamp position={[50, 2, -325]} />
                <StreetLamp position={[-50, 2, -325]} />

                {/* Ground Lights (Social Hub Corners) */}
                <GroundLight position={[-115, 2.05, -490]} />
                <GroundLight position={[115, 2.05, -490]} />
                <GroundLight position={[-115, 2.05, -260]} />
                <GroundLight position={[115, 2.05, -260]} />

                {/* Spawn Area Ground Light */}
                <GroundLight position={[-5, 0.05, -40]} />

                {/* Portal - Beach Area (Near Spawn) */}
                <Portal
                    position={[-20, 2, -50]}
                    rotation={[0, 0.5, 0]}
                    playerRef={robotRef}
                    onTeleport={() => {
                        // Teleport Logic
                        if (robotRef.current) {
                            // 1. Trigger Fade Out
                            useGameStore.getState().setTeleporting(true);

                            // 2. Wait for Fade (500ms)
                            setTimeout(() => {
                                if (robotRef.current) {
                                    // 3. Move Robot (Entrance of OFFICE Hub)
                                    // New Office X = 350. Entrance near Z=-200 or -250?
                                    // Let's target the entrance side near Bridge 2.
                                    robotRef.current.position.set(350, 5, -220);

                                    // 4. Force Rotation (Face South/Inward)
                                    robotRef.current.rotation.set(0, Math.PI, 0);

                                    // 5. Trigger Fade In after short delay
                                    setTimeout(() => {
                                        useGameStore.getState().setTeleporting(false);
                                    }, 500);
                                }
                            }, 500);
                        }
                    }}
                />

                <Robot groupRef={robotRef} />
                <AIRobot playerRef={robotRef} initialPosition={[10, 5, -330]} />
                <AIRobot playerRef={robotRef} initialPosition={[15, 5, -330]} />
                <YukaSystem />
                <LevelBoundaries />
                <ZoneController robotRef={robotRef} />
                <CameraRig target={robotRef as React.RefObject<THREE.Group | null>} />

                <Stats />
            </Canvas>
        </div>
    );
}
