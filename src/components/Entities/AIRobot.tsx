/* eslint-disable react-hooks/immutability */
import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useYukaAI } from "./useYukaAI";
import { ThoughtBubble } from "../UI/ThoughtBubble";
import { ErrorBoundary } from "../UI/ErrorBoundary";
import { useGameStore } from "@/store/gameStore";

// Shared Geometry/Material logic ported from Robot.tsx
// to ensure AI looks exactly like the Player.

export default function AIRobot({
  playerRef,
  initialPosition = [0, 4, 10],
  id = "agent-01",
}: {
  playerRef: React.RefObject<THREE.Group | null>;
  initialPosition?: [number, number, number];
  id?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const joints = useRef<any>({});

  const { vehicle, brain, animationState } = useYukaAI(id, groupRef, playerRef, joints);
  const isMenuOpen = useGameStore((state) => state.isMenuOpen);
  const inspectedAgentId = useGameStore((state) => state.inspectedAgentId);
  const setInspectedAgentId = useGameStore((state) => state.setInspectedAgentId);

  const handleClick = (e: any) => {
    if (isMenuOpen) {
      e.stopPropagation();
      setInspectedAgentId(id);
      // console.log("Inspecting Agent:", id);
    }
  };

  return (
    <group
      ref={groupRef}
      position={initialPosition}
      name="AIRobot"
      userData={{
        type: "AI Entity",
        id: id,
        description: "Autonomous Office Assistant",
      }}
      onClick={handleClick}
    >
      <ThoughtBubble brain={brain} isInspected={inspectedAgentId === id} />
      {/* We use the same procedural model as Robot.tsx */}
      <ProceduralRobotModel joints={joints} id={id} />
    </group>
  );
}

// ----------------------------------------------------------------------------
// procedural "Office Robot" Model (Ported from Robot.tsx)
// ----------------------------------------------------------------------------
function ProceduralRobotModel({ joints, id }: { joints: any; id: string }) {
  const { suitMat, shirtMat, tieMat, skinMat, shoeMat } = useMemo(() => {
    // Office professional appearance - Identical to Robot.tsx
    const darkSuit = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.3,
      metalness: 0.2,
    });
    const whiteShirt = new THREE.MeshStandardMaterial({
      color: 0xf0f0f0,
      roughness: 0.6,
    });
    const blueTie = new THREE.MeshStandardMaterial({
      color: 0x0f4c81,
      roughness: 0.5,
    });
    const beigeSkin = new THREE.MeshStandardMaterial({
      color: 0xf5d5c0,
      roughness: 0.8,
    });
    const shoes = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.4,
      metalness: 0.3,
    });
    return {
      suitMat: darkSuit,
      shirtMat: whiteShirt,
      tieMat: blueTie,
      skinMat: beigeSkin,
      shoeMat: shoes,
    };
  }, []);

  return (
    <group>
      <group
        ref={(el) => {
          if (el && joints.current) joints.current.hips = el;
        }}
        position={[0, 3.5, 0]}
      >
        {/* Pelvis/Hips - Rounded suit pants */}
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
          {/* Waist/Lower torso - Rounded suit jacket bottom */}
          <mesh
            position={[0, 0.65, 0]}
            material={suitMat}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.5, 0.6, 1.3, 16]} />
          </mesh>

          {/* Upper torso - Rounded suit jacket */}
          <mesh
            position={[0, 1.8, 0]}
            material={suitMat}
            castShadow
            receiveShadow
            scale={[1.8, 1.6, 1.0]}
          >
            <sphereGeometry args={[0.6, 16, 16]} />
          </mesh>

          {/* Shirt collar/front - rounded */}
          <mesh
            position={[0, 2.3, 0.56]}
            material={shirtMat}
            castShadow
            scale={[0.7, 0.8, 0.15]}
          >
            <sphereGeometry args={[0.5, 12, 12]} />
          </mesh>

          {/* Tie - slightly rounded */}
          <mesh position={[0, 1.9, 0.61]} material={tieMat} castShadow>
            <capsuleGeometry args={[0.08, 0.9, 8, 12]} />
          </mesh>

          {/* Neck/Head */}
          <group
            ref={(el) => {
              if (el && joints.current) joints.current.neck = el;
            }}
            position={[0, 2.6, 0]}
          >
            {/* Head - rounded professional appearance */}
            <mesh
              position={[0, 0.45, 0]}
              material={skinMat}
              castShadow
              receiveShadow
              scale={[0.9, 1.0, 0.95]}
            >
              <sphereGeometry args={[0.45, 16, 16]} />
            </mesh>
            {/* Visor/Eyes - rounded business professional */}
            <mesh
              position={[0, 0.5, 0.43]}
              material={
                new THREE.MeshStandardMaterial({
                  color: 0x333333,
                  metalness: 0.5,
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
        <Leg side="left" joints={joints} suitMat={suitMat} skinMat={skinMat} shoeMat={shoeMat} />
        <Leg side="right" joints={joints} suitMat={suitMat} skinMat={skinMat} shoeMat={shoeMat} />
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
  joints: React.MutableRefObject<any>;
  suitMat: THREE.Material;
  shirtMat: THREE.Material;
}) {
  const dir = side === "left" ? 1 : -1;
  return (
    <group
      ref={(el) => {
        if (!joints.current[`${side}Arm`])
          joints.current[`${side}Arm`] = {} as any;
        joints.current[`${side}Arm`]!.shoulder = el!;
      }}
      position={[dir * 1.0, 2.2, 0]}
    >
      {/* Shoulder - suit jacket */}
      <mesh material={suitMat} castShadow receiveShadow>
        <sphereGeometry args={[0.35, 12, 12]} />
      </mesh>
      {/* Upper arm - suit sleeve */}
      <mesh position={[0, -0.7, 0]} material={suitMat} castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.3, 1.3, 10]} />
      </mesh>
      <group
        ref={(el) => {
          if (!joints.current[`${side}Arm`])
            joints.current[`${side}Arm`] = {} as any;
          joints.current[`${side}Arm`]!.elbow = el!;
        }}
        position={[0, -1.4, 0]}
      >
        {/* Elbow joint */}
        <mesh material={suitMat} castShadow receiveShadow>
          <sphereGeometry args={[0.28, 10, 10]} />
        </mesh>
        {/* Forearm - suit sleeve */}
        <mesh
          position={[0, -0.6, 0]}
          material={suitMat}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.22, 0.25, 1.2, 10]} />
        </mesh>
        {/* Hand - rounded shirt cuff visible */}
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
  shoeMat
}: {
  side: "left" | "right";
  joints: React.MutableRefObject<any>;
  suitMat: THREE.Material;
  skinMat: THREE.Material;
  shoeMat: THREE.Material;
}) {
  const dir = side === "left" ? 1 : -1;

  return (
    <group
      ref={(el) => {
        if (el && joints.current) joints.current[`${side}Hip`] = el;
      }}
      position={[dir * 0.45, 0, 0]}
    >
      {/* Thigh - suit pants */}
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
        {/* Knee joint */}
        <mesh material={suitMat} castShadow receiveShadow>
          <sphereGeometry args={[0.32, 10, 10]} />
        </mesh>
        {/* Lower leg - suit pants */}
        <mesh
          position={[0, -0.75, 0]}
          material={suitMat}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.25, 0.28, 1.5, 10]} />
        </mesh>
        {/* Professional shoes - rounded */}
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
