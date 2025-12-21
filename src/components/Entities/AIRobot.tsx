/* eslint-disable react-hooks/immutability */
import React, { useRef, useMemo } from "react";
import * as THREE from "three";
import { useYukaAI } from "./useYukaAI";
import { createMaterials } from "../Systems/Materials";
import { Joints } from "./useRobotController";

export default function AIRobot({
  playerRef,
  initialPosition = [10, 5, -330],
}: {
  playerRef: React.RefObject<THREE.Group | null>;
  initialPosition?: [number, number, number];
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

  const { suitMat, shirtMat, tieMat, skinMat } = useMemo(() => {
    // Office AI assistant - lighter gray suit to differentiate from player
    const graySuit = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.3,
      metalness: 0.2,
    });
    const lightShirt = new THREE.MeshStandardMaterial({
      color: 0xe8e8e8,
      roughness: 0.6,
    });
    const redTie = new THREE.MeshStandardMaterial({
      color: 0x8b0000,
      roughness: 0.5,
    }); // Red tie for AI
    const paleSkin = new THREE.MeshStandardMaterial({
      color: 0xffd9c3,
      roughness: 0.8,
    });
    return {
      suitMat: graySuit,
      shirtMat: lightShirt,
      tieMat: redTie,
      skinMat: paleSkin,
    };
  }, []);

  return (
    <group ref={groupRef} position={initialPosition}>
      <group
        ref={(el) => {
          if (el && joints.current) joints.current.hips = el;
        }}
        position={[0, 3.5, 0]}
      >
        {/* Pelvis/Hips - Rounded gray suit pants */}
        <mesh
          material={suitMat}
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
          {/* Waist - Rounded suit jacket bottom */}
          <mesh
            position={[0, 0.65, 0]}
            material={suitMat}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.5, 0.6, 1.3, 16]} />
          </mesh>
          {/* Upper torso - Rounded gray suit jacket */}
          <mesh
            position={[0, 1.8, 0]}
            material={suitMat}
            castShadow
            receiveShadow
            scale={[1.8, 1.6, 1.0]}
          >
            <sphereGeometry args={[0.6, 16, 16]} />
          </mesh>
          {/* Shirt front - rounded */}
          <mesh
            position={[0, 2.3, 0.56]}
            material={shirtMat}
            castShadow
            scale={[0.7, 0.8, 0.15]}
          >
            <sphereGeometry args={[0.5, 12, 12]} />
          </mesh>
          {/* Red tie for AI identification - slightly rounded */}
          <mesh position={[0, 1.9, 0.61]} material={tieMat} castShadow>
            <capsuleGeometry args={[0.08, 0.9, 8, 12]} />
          </mesh>

          <group
            ref={(el) => {
              if (el && joints.current) joints.current.neck = el;
            }}
            position={[0, 2.6, 0]}
          >
            {/* Head - rounded */}
            <mesh
              position={[0, 0.45, 0]}
              material={skinMat}
              castShadow
              receiveShadow
              scale={[0.9, 1.0, 0.95]}
            >
              <sphereGeometry args={[0.45, 16, 16]} />
            </mesh>
            {/* Visor - darker rounded for AI */}
            <mesh
              position={[0, 0.5, 0.43]}
              material={
                new THREE.MeshStandardMaterial({
                  color: 0x1a1a1a,
                  metalness: 0.6,
                  emissive: 0x440000,
                  emissiveIntensity: 0.3,
                })
              }
              scale={[1.3, 1, 0.3]}
            >
              <sphereGeometry args={[0.25, 12, 8]} />
            </mesh>
          </group>

          {/* Arms */}
          <Arm
            side="left"
            joints={joints}
            suitMat={suitMat}
            shirtMat={shirtMat}
          />
          <Arm
            side="right"
            joints={joints}
            suitMat={suitMat}
            shirtMat={shirtMat}
          />
        </group>

        {/* Legs */}
        <Leg side="left" joints={joints} suitMat={suitMat} skinMat={skinMat} />
        <Leg side="right" joints={joints} suitMat={suitMat} skinMat={skinMat} />
      </group>
    </group>
  );
}

function Arm({
  side,
  joints,
  suitMat,
  shirtMat,
}: {
  side: "left" | "right";
  joints: React.MutableRefObject<Joints>;
  suitMat: THREE.Material;
  shirtMat: THREE.Material;
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
      {/* Shoulder */}
      <mesh material={suitMat} castShadow receiveShadow>
        <sphereGeometry args={[0.35, 12, 12]} />
      </mesh>
      {/* Upper arm */}
      <mesh position={[0, -0.7, 0]} material={suitMat} castShadow receiveShadow>
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
        <mesh material={suitMat} castShadow receiveShadow>
          <sphereGeometry args={[0.28, 10, 10]} />
        </mesh>
        <mesh
          position={[0, -0.6, 0]}
          material={suitMat}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.22, 0.25, 1.2, 10]} />
        </mesh>
        <mesh
          position={[0, -1.3, 0]}
          material={shirtMat}
          castShadow
          rotation={[Math.PI / 2, 0, 0]}
        >
          <capsuleGeometry args={[0.12, 0.15, 8, 8]} />
        </mesh>
      </group>
    </group>
  );
}

function Leg({
  side,
  joints,
  suitMat,
  skinMat,
}: {
  side: "left" | "right";
  joints: React.MutableRefObject<Joints>;
  suitMat: THREE.Material;
  skinMat: THREE.Material;
}) {
  const dir = side === "left" ? 1 : -1;
  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.4,
    metalness: 0.3,
  });
  return (
    <group
      ref={(el) => {
        if (el && joints.current) joints.current[`${side}Hip`] = el;
      }}
      position={[dir * 0.45, 0, 0]}
    >
      {/* Thigh */}
      <mesh
        position={[0, -0.75, 0]}
        material={suitMat}
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
        <mesh material={suitMat} castShadow receiveShadow>
          <sphereGeometry args={[0.32, 10, 10]} />
        </mesh>
        <mesh
          position={[0, -0.75, 0]}
          material={suitMat}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.25, 0.28, 1.5, 10]} />
        </mesh>
        <mesh
          position={[0, -1.6, 0.15]}
          material={shoeMat}
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
