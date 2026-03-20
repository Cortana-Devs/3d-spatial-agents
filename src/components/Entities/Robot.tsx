/* eslint-disable react-hooks/immutability */
import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useRobotController, Joints } from "./useRobotController";

export default function Robot({
  controller = useRobotController,
  groupRef: externalRef,
  initialPosition = [0, 5, 0],
}: {
  controller?: typeof useRobotController;
  groupRef?: React.RefObject<THREE.Group | null>;
  initialPosition?: [number, number, number];
}) {
  const internalRef = useRef<THREE.Group>(null);
  const groupRef = externalRef || internalRef;
  const { joints } = controller(groupRef);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(...initialPosition);
    }
  }, []); // Only apply initial position on mount

  const mats = useMemo(() => {
    const labCoat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f0,
      roughness: 0.7,
      metalness: 0.0,
    });
    const shirt = new THREE.MeshStandardMaterial({
      color: 0x26a69a,
      roughness: 0.6,
    });
    const pants = new THREE.MeshStandardMaterial({
      color: 0x34495e,
      roughness: 0.5,
      metalness: 0.1,
    });
    const skin = new THREE.MeshStandardMaterial({
      color: 0xf5d5c0,
      roughness: 0.8,
    });
    const shoes = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.6,
      metalness: 0.1,
    });
    const hair = new THREE.MeshStandardMaterial({
      color: 0x2c1a0e,
      roughness: 0.9,
    });
    const glasses = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.3,
      metalness: 0.5,
    });
    const badge = new THREE.MeshStandardMaterial({
      color: 0x4caf50,
      roughness: 0.4,
      metalness: 0.2,
    });
    const eyeWhite = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
    });
    const pupil = new THREE.MeshStandardMaterial({
      color: 0x2e1a0e,
      roughness: 0.4,
    });
    return { labCoat, shirt, pants, skin, shoes, hair, glasses, badge, eyeWhite, pupil };
  }, []);

  return (
    <group ref={groupRef} name="Robot">
      <group
        ref={(el) => {
          if (el && joints.current) joints.current.hips = el;
        }}
        position={[0, 3.1, 0]}
      >
        {/* Pelvis/Hips */}
        <mesh
          material={mats.pants}
          castShadow
          receiveShadow
          rotation={[0, 0, Math.PI / 2]}
        >
          <capsuleGeometry args={[0.45, 0.8, 12, 16]} />
        </mesh>

        <group
          ref={(el) => {
            if (el && joints.current) joints.current.torso = el;
          }}
          position={[0, 0.25, 0]}
        >
          {/* Waist — lab coat lower */}
          <mesh
            position={[0, 0.65, 0]}
            material={mats.labCoat}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.5, 0.6, 1.3, 16]} />
          </mesh>

          {/* Upper torso — lab coat body */}
          <mesh
            position={[0, 1.8, 0]}
            material={mats.labCoat}
            castShadow
            receiveShadow
            scale={[1.8, 1.6, 1.0]}
          >
            <sphereGeometry args={[0.6, 16, 16]} />
          </mesh>

          {/* ID Badge — green badge to distinguish player */}
          <mesh
            position={[0.45, 2.0, 0.62]}
            material={mats.badge}
            castShadow
          >
            <boxGeometry args={[0.3, 0.4, 0.04]} />
          </mesh>
          {/* Badge clip */}
          <mesh
            position={[0.45, 2.22, 0.62]}
            material={mats.glasses}
          >
            <boxGeometry args={[0.15, 0.06, 0.05]} />
          </mesh>

          {/* Breast pocket on right side */}
          <mesh
            position={[-0.38, 2.05, 0.6]}
            material={mats.labCoat}
            castShadow
          >
            <boxGeometry args={[0.25, 0.2, 0.03]} />
          </mesh>
          {/* Pen in pocket */}
          <mesh
            position={[-0.38, 2.2, 0.62]}
            material={mats.badge}
            rotation={[0, 0, 0.05]}
          >
            <cylinderGeometry args={[0.015, 0.015, 0.2, 6]} />
          </mesh>

          {/* Neck */}
          <mesh
            position={[0, 2.5, 0]}
            material={mats.skin}
            castShadow
          >
            <cylinderGeometry args={[0.18, 0.2, 0.3, 10]} />
          </mesh>

          {/* Head group */}
          <group
            ref={(el) => {
              if (el && joints.current) joints.current.neck = el;
            }}
            position={[0, 2.6, 0]}
          >
            {/* Head */}
            <mesh
              position={[0, 0.45, 0]}
              material={mats.skin}
              castShadow
              receiveShadow
              scale={[0.9, 1.0, 0.95]}
            >
              <sphereGeometry args={[0.45, 16, 16]} />
            </mesh>

            {/* Hair — top cap */}
            <mesh
              position={[0, 0.7, -0.02]}
              material={mats.hair}
              castShadow
              scale={[1.0, 0.5, 1.0]}
            >
              <sphereGeometry args={[0.42, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
            {/* Hair — sides & back fill */}
            <mesh
              position={[0, 0.55, -0.08]}
              material={mats.hair}
              castShadow
              scale={[1.02, 0.7, 1.05]}
            >
              <sphereGeometry args={[0.42, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            </mesh>

            {/* Left Eye — white */}
            <mesh position={[0.16, 0.48, 0.4]} material={mats.eyeWhite}>
              <sphereGeometry args={[0.08, 10, 10]} />
            </mesh>
            {/* Left Pupil */}
            <mesh position={[0.16, 0.48, 0.47]} material={mats.pupil}>
              <sphereGeometry args={[0.04, 8, 8]} />
            </mesh>
            {/* Right Eye — white */}
            <mesh position={[-0.16, 0.48, 0.4]} material={mats.eyeWhite}>
              <sphereGeometry args={[0.08, 10, 10]} />
            </mesh>
            {/* Right Pupil */}
            <mesh position={[-0.16, 0.48, 0.47]} material={mats.pupil}>
              <sphereGeometry args={[0.04, 8, 8]} />
            </mesh>

            {/* Glasses — left lens frame */}
            <mesh
              position={[0.16, 0.48, 0.42]}
              material={mats.glasses}
              scale={[1.0, 1.0, 0.15]}
            >
              <torusGeometry args={[0.11, 0.018, 8, 16]} />
            </mesh>
            {/* Glasses — right lens frame */}
            <mesh
              position={[-0.16, 0.48, 0.42]}
              material={mats.glasses}
              scale={[1.0, 1.0, 0.15]}
            >
              <torusGeometry args={[0.11, 0.018, 8, 16]} />
            </mesh>
            {/* Glasses bridge */}
            <mesh
              position={[0, 0.48, 0.44]}
              material={mats.glasses}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.015, 0.015, 0.12, 6]} />
            </mesh>
            {/* Glasses temple — left */}
            <mesh
              position={[0.28, 0.48, 0.25]}
              material={mats.glasses}
              rotation={[0, Math.PI / 2.4, 0]}
            >
              <cylinderGeometry args={[0.012, 0.012, 0.35, 6]} />
            </mesh>
            {/* Glasses temple — right */}
            <mesh
              position={[-0.28, 0.48, 0.25]}
              material={mats.glasses}
              rotation={[0, -Math.PI / 2.4, 0]}
            >
              <cylinderGeometry args={[0.012, 0.012, 0.35, 6]} />
            </mesh>

            {/* Nose */}
            <mesh
              position={[0, 0.38, 0.46]}
              material={mats.skin}
              rotation={[0.3, 0, 0]}
              scale={[0.6, 1.0, 0.8]}
            >
              <sphereGeometry args={[0.06, 8, 8]} />
            </mesh>

            {/* Mouth */}
            <mesh
              position={[0, 0.28, 0.43]}
              material={
                new THREE.MeshStandardMaterial({ color: 0xc49080, roughness: 0.7 })
              }
              rotation={[0, 0, Math.PI / 2]}
            >
              <capsuleGeometry args={[0.015, 0.12, 4, 6]} />
            </mesh>

            {/* Eyebrows */}
            <mesh
              position={[0.16, 0.57, 0.42]}
              material={mats.hair}
              rotation={[0.1, 0, 0.1]}
            >
              <boxGeometry args={[0.16, 0.025, 0.03]} />
            </mesh>
            <mesh
              position={[-0.16, 0.57, 0.42]}
              material={mats.hair}
              rotation={[0.1, 0, -0.1]}
            >
              <boxGeometry args={[0.16, 0.025, 0.03]} />
            </mesh>
          </group>

          {/* Arms */}
          <PlayerArm side="left" joints={joints} mats={mats} />
          <PlayerArm side="right" joints={joints} mats={mats} />
        </group>

        {/* Legs */}
        <PlayerLeg side="left" joints={joints} mats={mats} />
        <PlayerLeg side="right" joints={joints} mats={mats} />
      </group>
    </group>
  );
}

type PlayerMats = {
  labCoat: THREE.Material;
  shirt: THREE.Material;
  pants: THREE.Material;
  skin: THREE.Material;
  shoes: THREE.Material;
  hair: THREE.Material;
  glasses: THREE.Material;
  badge: THREE.Material;
  eyeWhite: THREE.Material;
  pupil: THREE.Material;
};

function PlayerArm({
  side,
  joints,
  mats,
}: {
  side: "left" | "right";
  joints: React.MutableRefObject<Joints>;
  mats: PlayerMats;
}) {
  const dir = side === "left" ? 1 : -1;
  return (
    <group
      ref={(el) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!joints.current[`${side}Arm`])
          joints.current[`${side}Arm`] = {} as any;
        joints.current[`${side}Arm`]!.shoulder = el!;
      }}
      position={[dir * 1.0, 2.2, 0]}
    >
      {/* Shoulder — lab coat */}
      <mesh material={mats.labCoat} castShadow receiveShadow>
        <sphereGeometry args={[0.35, 12, 12]} />
      </mesh>
      {/* Upper arm — lab coat sleeve */}
      <mesh position={[0, -0.7, 0]} material={mats.labCoat} castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.3, 1.3, 10]} />
      </mesh>
      <group
        ref={(el) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (!joints.current[`${side}Arm`])
            joints.current[`${side}Arm`] = {} as any;
          joints.current[`${side}Arm`]!.elbow = el!;
        }}
        position={[0, -1.4, 0]}
      >
        {/* Elbow — rolled-up sleeve cuff */}
        <mesh material={mats.labCoat} castShadow receiveShadow>
          <sphereGeometry args={[0.28, 10, 10]} />
        </mesh>
        {/* Forearm — exposed skin (sleeves rolled up) */}
        <mesh
          position={[0, -0.6, 0]}
          material={mats.skin}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.18, 0.22, 1.2, 10]} />
        </mesh>
        {/* Hand with Fingers */}
        <group position={[0, -1.3, 0]}>
          {/* Palm */}
          <mesh material={mats.skin} castShadow position={[0, -0.05, 0]}>
            <boxGeometry args={[0.2, 0.25, 0.12]} />
          </mesh>
          {/* Thumb */}
          <mesh material={mats.skin} castShadow position={[-dir * 0.12, -0.05, 0.05]} rotation={[Math.PI / 8, 0, -dir * Math.PI / 6]}>
            <capsuleGeometry args={[0.04, 0.1, 8, 8]} />
          </mesh>
          {/* Fingers */}
          {[-0.07, 0, 0.07].map((x, i) => (
            <mesh key={`finger-${i}`} material={mats.skin} castShadow position={[x, -0.22 - (i === 1 ? 0.02 : 0), 0]}>
              <capsuleGeometry args={[0.035, 0.12 + (i === 1 ? 0.04 : 0), 8, 8]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

function PlayerLeg({
  side,
  joints,
  mats,
}: {
  side: "left" | "right";
  joints: React.MutableRefObject<Joints>;
  mats: PlayerMats;
}) {
  const dir = side === "left" ? 1 : -1;
  return (
    <group
      ref={(el) => {
        if (el && joints.current) joints.current[`${side}Hip`] = el;
      }}
      position={[dir * 0.45, 0, 0]}
    >
      {/* Thigh — dark pants */}
      <mesh
        position={[0, -0.75, 0]}
        material={mats.pants}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.3, 0.35, 1.5, 10]} />
      </mesh>
      <group
        ref={(el) => {
          if (el && joints.current) joints.current[`${side}Knee`] = el;
        }}
        position={[0, -1.5, 0]}
      >
        {/* Knee joint */}
        <mesh material={mats.pants} castShadow receiveShadow>
          <sphereGeometry args={[0.32, 10, 10]} />
        </mesh>
        {/* Lower leg — dark pants */}
        <mesh
          position={[0, -0.75, 0]}
          material={mats.pants}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.25, 0.28, 1.5, 10]} />
        </mesh>
        {/* Comfortable lab shoes */}
        <mesh
          position={[0, -1.6, 0.15]}
          material={mats.shoes}
          castShadow
          receiveShadow
          scale={[1, 0.7, 1.6]}
        >
          <sphereGeometry args={[0.3, 12, 12]} />
        </mesh>
      </group>
    </group>
  );
}
