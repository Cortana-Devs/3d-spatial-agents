import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useWorkerAI } from './useWorkerAI';
import { useFrame } from '@react-three/fiber';

export default function BaymaxRobot({
    initialPosition = [0, 5, 0],
    system,
    id
}: {
    initialPosition?: [number, number, number],
    system: any, // OfficeWorkSystem reference
    id: string
}) {
    const groupRef = useRef<THREE.Group>(null);
    const bodyRef = useRef<THREE.Mesh>(null);
    const headRef = useRef<THREE.Group>(null);
    const leftArmRef = useRef<THREE.Mesh>(null);
    const rightArmRef = useRef<THREE.Mesh>(null);
    const leftLegRef = useRef<THREE.Mesh>(null);
    const rightLegRef = useRef<THREE.Mesh>(null);
    const carryPointRef = useRef<THREE.Group>(null);

    // AI & Logic
    const { state, holdingBox, active } = useWorkerAI(groupRef, system, id, carryPointRef);

    // Materials
    const { whiteMat, blackMat, eyeMat, eyeOffMat } = useMemo(() => {
        const white = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.4,
            metalness: 0.1,
        });
        const black = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const eye = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const eyeOff = new THREE.MeshBasicMaterial({ color: 0x333333 }); // Dim gray
        return { whiteMat: white, blackMat: black, eyeMat: eye, eyeOffMat: eyeOff };
    }, []);

    // Procedural Animation (Waddle & Actions)
    useFrame((state, delta) => {
        if (!groupRef.current) return;

        const velocity = groupRef.current.userData.velocity;
        const speed = velocity ? Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) : 0;
        const isMoving = speed > 0.1;
        const time = state.clock.elapsedTime * 8; // Waddle Frequency

        const lerpFactor = 0.1;

        if (isMoving) {
            // Waddle - Rotation
            if (bodyRef.current) bodyRef.current.rotation.z = THREE.MathUtils.lerp(bodyRef.current.rotation.z, Math.sin(time) * 0.05, lerpFactor);
            if (headRef.current) headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, Math.sin(time - 0.5) * 0.03, lerpFactor);

            // Legs - Walk Cycle
            if (leftLegRef.current) leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, Math.sin(time) * 0.8, lerpFactor);
            if (rightLegRef.current) rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, Math.sin(time + Math.PI) * 0.8, lerpFactor);

            // Arms - Swing (Counter to legs)
            if (!holdingBox) {
                if (leftArmRef.current) {
                    leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, Math.sin(time + Math.PI) * 0.6, lerpFactor);
                    leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, 0.2, lerpFactor); // Relaxed
                }
                if (rightArmRef.current) {
                    rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, Math.sin(time) * 0.6, lerpFactor);
                    rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, -0.2, lerpFactor);
                }
            }
        } else {
            // Idle - Breathing
            const breath = Math.sin(state.clock.elapsedTime * 2) * 0.02;
            if (bodyRef.current) {
                bodyRef.current.scale.set(1 + breath * 0.05, 1 + breath * 0.05, 1 + breath * 0.05);
                bodyRef.current.rotation.z = THREE.MathUtils.lerp(bodyRef.current.rotation.z, 0, lerpFactor);
            }

            // Reset Limbs
            if (leftLegRef.current) leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0, lerpFactor);
            if (rightLegRef.current) rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, 0, lerpFactor);

            if (!holdingBox) {
                if (leftArmRef.current) {
                    leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0, lerpFactor);
                    leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, 0.2, lerpFactor);
                }
                if (rightArmRef.current) {
                    rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0, lerpFactor);
                    rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, -0.2, lerpFactor);
                }
            }
        }

        // Holding Box Animation (Arms Hugging)
        if (holdingBox) {
            // Arms forward and hugging
            const hugAngle = -0.5;
            const liftAngle = -1.3;
            if (leftArmRef.current) {
                leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, liftAngle, lerpFactor);
                leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, -hugAngle, lerpFactor);
            }
            if (rightArmRef.current) {
                rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, liftAngle, lerpFactor);
                rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, hugAngle, lerpFactor);
            }
        }
    });

    return (
        <group ref={groupRef} position={new THREE.Vector3(...initialPosition)}>
            {/* DEBUG: Status Text */}
            <mesh position={[0, 4, 0]}>
                {/* <textGeometry args={[state, { size: 0.5, height: 0.1 }]} /> */}
                {/* Skipping text geo for simplicity, maybe add later */}
            </mesh>

            <group position={[0, 2, 0]}>
                {/* Body: Puffy Capsule */}
                <mesh ref={bodyRef} material={whiteMat} castShadow receiveShadow>
                    <capsuleGeometry args={[1.1, 1.8, 16, 16]} />
                </mesh>

                {/* Head */}
                <group ref={headRef} position={[0, 1.9, 0]}>
                    <mesh material={whiteMat} castShadow receiveShadow>
                        <capsuleGeometry args={[0.45, 0.35, 16, 16]} />
                        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} />
                    </mesh>
                    {/* Eyes */}
                    <mesh position={[0.18, 0.05, 0.42]} material={eyeMat}>
                        <circleGeometry args={[0.07, 16]} />
                    </mesh>
                    <mesh position={[-0.18, 0.05, 0.42]} material={eyeMat}>
                        <circleGeometry args={[0.07, 16]} />
                    </mesh>
                    <mesh position={[0, 0.05, 0.42]} material={eyeMat}>
                        <planeGeometry args={[0.36, 0.02]} />
                    </mesh>
                </group>

                {/* Arms with Hands */}
                <group ref={leftArmRef} position={[1.2, 0.8, 0]}>
                    <mesh position={[0, -0.6, 0]} material={whiteMat} castShadow receiveShadow>
                        <capsuleGeometry args={[0.3, 1.4, 8, 16]} />
                    </mesh>
                    {/* Hand Stub */}
                    <mesh position={[0, -1.4, 0]} material={whiteMat}>
                        <sphereGeometry args={[0.32, 16, 16]} />
                    </mesh>
                    <mesh position={[0.1, -1.5, 0.1]} material={whiteMat}>
                        <capsuleGeometry args={[0.08, 0.2, 8, 8]} /> {/* Thumb */}
                    </mesh>
                </group>

                <group ref={rightArmRef} position={[-1.2, 0.8, 0]}>
                    <mesh position={[0, -0.6, 0]} material={whiteMat} castShadow receiveShadow>
                        <capsuleGeometry args={[0.3, 1.4, 8, 16]} />
                    </mesh>
                    {/* Hand Stub */}
                    <mesh position={[0, -1.4, 0]} material={whiteMat}>
                        <sphereGeometry args={[0.32, 16, 16]} />
                    </mesh>
                    <mesh position={[-0.1, -1.5, 0.1]} material={whiteMat}>
                        <capsuleGeometry args={[0.08, 0.2, 8, 8]} /> {/* Thumb */}
                    </mesh>
                </group>

                {/* Legs */}
                <group ref={leftLegRef} position={[0.5, -1.5, 0]}>
                    <mesh position={[0, -0.6, 0]} material={whiteMat} castShadow receiveShadow>
                        <capsuleGeometry args={[0.35, 1.2, 8, 16]} />
                    </mesh>
                </group>

                <group ref={rightLegRef} position={[-0.5, -1.5, 0]}>
                    <mesh position={[0, -0.6, 0]} material={whiteMat} castShadow receiveShadow>
                        <capsuleGeometry args={[0.35, 1.2, 8, 16]} />
                    </mesh>
                </group>

                {/* Carry Point */}
                <group ref={carryPointRef} position={[0, 0, 1.2]} />
            </group>
        </group>
    );
}
