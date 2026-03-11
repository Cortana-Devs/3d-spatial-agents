/* eslint-disable react-hooks/immutability */
import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useYukaAI } from "./useYukaAI";
import { ThoughtBubble } from "../UI/ThoughtBubble";
import { AgentChatPrompt } from "../UI/AgentChatPrompt";
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

  const { vehicle, brain, animationState } = useYukaAI(
    id,
    groupRef,
    playerRef,
    joints,
  );
  const isMenuOpen = useGameStore((state) => state.isMenuOpen);
  const inspectedAgentId = useGameStore((state) => state.inspectedAgentId);
  const setInspectedAgentId = useGameStore(
    (state) => state.setInspectedAgentId,
  );

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
        description: "Autonomous Research Lab Assistant",
      }}
      onClick={handleClick}
    >
      <ThoughtBubble brain={brain} isInspected={inspectedAgentId === id} />
      <AgentChatPrompt agentId={id} />
      {/* We use the same procedural model as Robot.tsx */}
      <ProceduralRobotModel joints={joints} id={id} />
    </group>
  );
}

// ----------------------------------------------------------------------------
// Procedural "Lab Assistant" Human Model
// ----------------------------------------------------------------------------
function ProceduralRobotModel({ joints, id }: { joints: any; id: string }) {
  const mats = useMemo(() => {
    const labCoat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f0,
      roughness: 0.7,
      metalness: 0.0,
    });
    const shirt = new THREE.MeshStandardMaterial({
      color: 0x5b9bd5,
      roughness: 0.6,
    });
    const pants = new THREE.MeshStandardMaterial({
      color: 0x2c3e50,
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
      color: 0x3b2316,
      roughness: 0.9,
    });
    const glasses = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.3,
      metalness: 0.5,
    });
    const badge = new THREE.MeshStandardMaterial({
      color: 0x2196f3,
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
    <group>
      <group
        ref={(el) => {
          if (el && joints.current) joints.current.hips = el;
        }}
        position={[0, 3.5, 0]}
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

          {/* ID Badge — clipped to left chest */}
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

            {/* Mouth — simple line */}
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
          <LabArm side="left" joints={joints} mats={mats} />
          <LabArm side="right" joints={joints} mats={mats} />
        </group>

        {/* Legs */}
        <LabLeg side="left" joints={joints} mats={mats} />
        <LabLeg side="right" joints={joints} mats={mats} />
      </group>
    </group>
  );
}

type LabMats = {
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

function LabArm({
  side,
  joints,
  mats,
}: {
  side: "left" | "right";
  joints: React.MutableRefObject<any>;
  mats: LabMats;
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
        {/* Hand */}
        <mesh
          position={[0, -1.3, 0]}
          material={mats.skin}
          castShadow
          rotation={[Math.PI / 2, 0, 0]}
        >
          <capsuleGeometry args={[0.12, 0.15, 8, 8]} />
        </mesh>
      </group>
    </group>
  );
}

function LabLeg({
  side,
  joints,
  mats,
}: {
  side: "left" | "right";
  joints: React.MutableRefObject<any>;
  mats: LabMats;
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
