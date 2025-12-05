/* eslint-disable react-hooks/immutability */
import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useYukaAI } from './useYukaAI';
import { createMaterials } from '../Systems/Materials';
import { Joints } from './useRobotController';

export default function AIRobot({
    playerRef,
    initialPosition = [10, 5, -330]
}: {
    playerRef: React.RefObject<THREE.Group | null>,
    initialPosition?: [number, number, number]
}) {
    const groupRef = useRef<THREE.Group>(null);
    // We need to access joints for animation. 
    // Ideally useYukaAI should return joints or we separate animation logic.
    // For now, let's keep the visual structure but we need to re-bind joints.
    const joints = useRef<any>({});
    // Use the new Yuka-powered brain with animation support
    const { vehicle } = useYukaAI(groupRef, playerRef, joints);

    // ... (Rest of the component needs to be updated to handle animation if useYukaAI doesn't return joints)
    // Wait, useYukaAI currently returns { vehicle }. It doesn't handle animation yet.
    // We should probably port the animation logic to useYukaAI or a separate useRobotAnimation hook.
    // For this step, let's just swap the controller and see if it moves.
    // We will lose animations temporarily (he will slide), which is expected for Phase 1.


    const { bodyMat, jointMat, glowMat } = useMemo(() => {
        const mats = createMaterials();
        // Override glow to RED for AI
        const redGlow = new THREE.MeshBasicMaterial({ color: 0xff0000, toneMapped: false });
        return { bodyMat: mats.robotBody, jointMat: mats.robotJoint, glowMat: redGlow };
    }, []);

    return (
        <group ref={groupRef} position={initialPosition}>
            <group ref={(el) => { if (el && joints.current) joints.current.hips = el; }} position={[0, 3.5, 0]}>
                <mesh material={bodyMat} castShadow receiveShadow>
                    <boxGeometry args={[1.5, 0.5, 1]} />
                </mesh>

                <group ref={(el) => { if (el && joints.current) joints.current.torso = el; }} position={[0, 0.25, 0]}>
                    <mesh position={[0, 0.75, 0]} material={jointMat} castShadow receiveShadow>
                        <cylinderGeometry args={[0.4, 0.5, 1.5, 8]} />
                    </mesh>
                    <mesh position={[0, 1.8, 0]} material={bodyMat} castShadow receiveShadow>
                        <boxGeometry args={[2, 1.5, 1.2]} />
                    </mesh>
                    <mesh position={[0, 1.8, 0.61]} rotation={[Math.PI / 2, 0, 0]} material={glowMat}>
                        <cylinderGeometry args={[0.3, 0.3, 0.2, 16]} />
                    </mesh>

                    <group ref={(el) => { if (el && joints.current) joints.current.neck = el; }} position={[0, 2.6, 0]}>
                        <mesh position={[0, 0.45, 0]} material={bodyMat} castShadow receiveShadow>
                            <boxGeometry args={[0.8, 0.9, 0.9]} />
                        </mesh>
                        <mesh position={[0, 0.5, 0.46]} material={glowMat}>
                            <boxGeometry args={[0.7, 0.15, 0.1]} />
                        </mesh>
                    </group>

                    {/* Arms */}
                    <Arm side="left" joints={joints} bodyMat={bodyMat} jointMat={jointMat} />
                    <Arm side="right" joints={joints} bodyMat={bodyMat} jointMat={jointMat} />
                </group>

                {/* Legs */}
                <Leg side="left" joints={joints} bodyMat={bodyMat} jointMat={jointMat} />
                <Leg side="right" joints={joints} bodyMat={bodyMat} jointMat={jointMat} />
            </group>
        </group>
    );
}

function Arm({ side, joints, bodyMat, jointMat }: { side: 'left' | 'right', joints: React.MutableRefObject<Joints>, bodyMat: THREE.Material, jointMat: THREE.Material }) {
    const dir = side === 'left' ? 1 : -1;
    return (
        <group
            ref={(el) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (!joints.current[`${side}Arm`]) joints.current[`${side}Arm`] = {} as any;
                joints.current[`${side}Arm`]!.shoulder = el!;
            }}
            position={[dir * 1.2, 2.2, 0]}
        >
            <mesh material={jointMat} castShadow receiveShadow>
                <sphereGeometry args={[0.5]} />
            </mesh>
            <mesh position={[0, -0.8, 0]} material={bodyMat} castShadow receiveShadow>
                <boxGeometry args={[0.4, 1.2, 0.4]} />
            </mesh>
            <group
                ref={(el) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    if (!joints.current[`${side}Arm`]) joints.current[`${side}Arm`] = {} as any;
                    joints.current[`${side}Arm`]!.elbow = el!;
                }}
                position={[0, -1.5, 0]}
            >
                <mesh rotation={[0, 0, Math.PI / 2]} material={bodyMat} castShadow receiveShadow>
                    <cylinderGeometry args={[0.3, 0.3, 0.5, 8]} />
                </mesh>
                <mesh position={[0, -0.7, 0]} material={bodyMat} castShadow receiveShadow>
                    <boxGeometry args={[0.35, 1.2, 0.35]} />
                </mesh>
            </group>
        </group>
    );
}

function Leg({ side, joints, bodyMat, jointMat }: { side: 'left' | 'right', joints: React.MutableRefObject<Joints>, bodyMat: THREE.Material, jointMat: THREE.Material }) {
    const dir = side === 'left' ? 1 : -1;
    return (
        <group
            ref={(el) => { if (el && joints.current) joints.current[`${side}Hip`] = el; }}
            position={[dir * 0.5, 0, 0]}
        >
            <mesh position={[0, -0.8, 0]} material={bodyMat} castShadow receiveShadow>
                <boxGeometry args={[0.5, 1.5, 0.6]} />
            </mesh>
            <group
                ref={(el) => { if (el && joints.current) joints.current[`${side}Knee`] = el; }}
                position={[0, -1.6, 0]}
            >
                <mesh material={jointMat} castShadow receiveShadow>
                    <sphereGeometry args={[0.4]} />
                </mesh>
                <mesh position={[0, -0.8, 0]} material={bodyMat} castShadow receiveShadow>
                    <boxGeometry args={[0.4, 1.5, 0.5]} />
                </mesh>
                <mesh position={[0, -1.7, 0.2]} material={bodyMat} castShadow receiveShadow>
                    <boxGeometry args={[0.6, 0.3, 1.0]} />
                </mesh>
            </group>
        </group>
    );
}
