/* eslint-disable react-hooks/immutability */
import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useYukaAI } from "./useYukaAI";
import { ThoughtBubble } from "../UI/ThoughtBubble";
import { AgentChatPrompt } from "../UI/AgentChatPrompt";
import { ErrorBoundary } from "../UI/ErrorBoundary";
import { useGameStore } from "@/store/gameStore";
import { useAudioController } from "@/lib/audio/useAudioController";
import { PositionalAudio } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

// Shared Geometry/Material logic ported from Robot.tsx
// to ensure AI looks exactly like the Player.

export default function AIRobot({
  playerRef,
  initialPosition = [0, 5.5, 10],
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

  const { currentBuffer, ensureAudioContext } = useAudioController();
  const audioRef = useRef<THREE.PositionalAudio>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    try {
      // Need to resume context on explicit user interaction elsewhere,
      // but ensure context exists here.
      ensureAudioContext();
      const ctx = audioRef.current.context;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      
      const gainNode = audioRef.current.getOutput();
      if (gainNode) {
        gainNode.connect(analyser);
      }
    } catch (e) {
      console.warn("Audio Context init deferred", e);
    }
  }, [ensureAudioContext]);

  useEffect(() => {
    if (audioRef.current && currentBuffer) {
      if (audioRef.current.isPlaying) audioRef.current.stop();
      audioRef.current.setBuffer(currentBuffer);
      audioRef.current.play();
    }
  }, [currentBuffer]);

  useFrame(() => {
    if (analyserRef.current && audioRef.current?.isPlaying && joints.current?.mouth) {
      const data = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      const avg = sum / data.length;
      
      // X scale is width, Y scale is height for mouth (assuming geometry orientation)
      // Base scale is 1. We stretch it based on volume.
      const scaleStretch = 1 + (avg / 255) * 3.0; 
      joints.current.mouth.scale.set(scaleStretch, scaleStretch, scaleStretch);
    } else if (joints.current?.mouth) {
      // Lerp back to resting state
      joints.current.mouth.scale.lerp(new THREE.Vector3(1, 1, 1), 0.2);
    }
  });

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
      <PositionalAudio ref={audioRef as any} url="" />
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

  const geos = useMemo(() => {
    return {
      hips: new THREE.CapsuleGeometry(0.45, 0.8, 12, 16),
      waist: new THREE.CylinderGeometry(0.5, 0.6, 1.3, 16),
      torso: new THREE.SphereGeometry(0.6, 16, 16),
      badge: new THREE.BoxGeometry(0.3, 0.4, 0.04),
      clip: new THREE.BoxGeometry(0.15, 0.06, 0.05),
      pocket: new THREE.BoxGeometry(0.25, 0.2, 0.03),
      pen: new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6),
      neck: new THREE.CylinderGeometry(0.18, 0.2, 0.3, 10),
      head: new THREE.SphereGeometry(0.45, 16, 16),
      hairCap: new THREE.SphereGeometry(0.42, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      hairFill: new THREE.SphereGeometry(0.42, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
      eye: new THREE.SphereGeometry(0.08, 10, 10),
      pupil: new THREE.SphereGeometry(0.04, 8, 8),
      lens: new THREE.TorusGeometry(0.11, 0.018, 8, 16),
      bridge: new THREE.CylinderGeometry(0.015, 0.015, 0.12, 6),
      temple: new THREE.CylinderGeometry(0.012, 0.012, 0.35, 6),
      nose: new THREE.SphereGeometry(0.06, 8, 8),
      mouth: new THREE.CapsuleGeometry(0.015, 0.12, 4, 6),
      eyebrow: new THREE.BoxGeometry(0.16, 0.025, 0.03),
      shoulder: new THREE.SphereGeometry(0.35, 12, 12),
      upperArm: new THREE.CylinderGeometry(0.25, 0.3, 1.3, 10),
      elbow: new THREE.SphereGeometry(0.28, 10, 10),
      forearm: new THREE.CylinderGeometry(0.18, 0.22, 1.2, 10),
      palm: new THREE.BoxGeometry(0.2, 0.25, 0.12),
      thumb: new THREE.CapsuleGeometry(0.04, 0.1, 8, 8),
      finger1: new THREE.CapsuleGeometry(0.035, 0.12, 8, 8),
      finger2: new THREE.CapsuleGeometry(0.035, 0.16, 8, 8),
      thigh: new THREE.CylinderGeometry(0.3, 0.35, 1.5, 10),
      knee: new THREE.SphereGeometry(0.32, 10, 10),
      calf: new THREE.CylinderGeometry(0.25, 0.28, 1.5, 10),
      shoe: new THREE.SphereGeometry(0.3, 12, 12),
    };
  }, []);

  return (
    <group>
      <group
        ref={(el) => {
          if (el && joints.current) joints.current.hips = el;
        }}
        position={[0, 3.3, 0]}
      >
        {/* Pelvis/Hips */}
        <mesh
          material={mats.pants}
          castShadow
          receiveShadow
          rotation={[0, 0, Math.PI / 2]}
          geometry={geos.hips}
        />

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
            geometry={geos.waist}
          />

          {/* Upper torso — lab coat body */}
          <mesh
            position={[0, 1.8, 0]}
            material={mats.labCoat}
            castShadow
            receiveShadow
            scale={[1.8, 1.6, 1.0]}
            geometry={geos.torso}
          />

          {/* ID Badge — clipped to left chest */}
          <mesh
            position={[0.45, 2.0, 0.62]}
            material={mats.badge}
            geometry={geos.badge}
          />
          {/* Badge clip */}
          <mesh
            position={[0.45, 2.22, 0.62]}
            material={mats.glasses}
            geometry={geos.clip}
          />

          {/* Breast pocket on right side */}
          <mesh
            position={[-0.38, 2.05, 0.6]}
            material={mats.labCoat}
            geometry={geos.pocket}
          />
          {/* Pen in pocket */}
          <mesh
            position={[-0.38, 2.2, 0.62]}
            material={mats.badge}
            rotation={[0, 0, 0.05]}
            geometry={geos.pen}
          />

          {/* Neck */}
          <mesh
            position={[0, 2.5, 0]}
            material={mats.skin}
            geometry={geos.neck}
          />

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
              geometry={geos.head}
            />

            {/* Hair — top cap */}
            <mesh
              position={[0, 0.7, -0.02]}
              material={mats.hair}
              castShadow
              scale={[1.0, 0.5, 1.0]}
              geometry={geos.hairCap}
            />
            {/* Hair — sides & back fill */}
            <mesh
              position={[0, 0.55, -0.08]}
              material={mats.hair}
              castShadow
              scale={[1.02, 0.7, 1.05]}
              geometry={geos.hairFill}
            />

            {/* Left Eye — white */}
            <mesh position={[0.16, 0.48, 0.4]} material={mats.eyeWhite} geometry={geos.eye} />
            {/* Left Pupil */}
            <mesh position={[0.16, 0.48, 0.47]} material={mats.pupil} geometry={geos.pupil} />
            {/* Right Eye — white */}
            <mesh position={[-0.16, 0.48, 0.4]} material={mats.eyeWhite} geometry={geos.eye} />
            {/* Right Pupil */}
            <mesh position={[-0.16, 0.48, 0.47]} material={mats.pupil} geometry={geos.pupil} />

            {/* Glasses — left lens frame */}
            <mesh
              position={[0.16, 0.48, 0.42]}
              material={mats.glasses}
              scale={[1.0, 1.0, 0.15]}
              geometry={geos.lens}
            />
            {/* Glasses — right lens frame */}
            <mesh
              position={[-0.16, 0.48, 0.42]}
              material={mats.glasses}
              scale={[1.0, 1.0, 0.15]}
              geometry={geos.lens}
            />
            {/* Glasses bridge */}
            <mesh
              position={[0, 0.48, 0.44]}
              material={mats.glasses}
              rotation={[0, 0, Math.PI / 2]}
              geometry={geos.bridge}
            />
            {/* Glasses temple — left */}
            <mesh
              position={[0.28, 0.48, 0.25]}
              material={mats.glasses}
              rotation={[0, Math.PI / 2.4, 0]}
              geometry={geos.temple}
            />
            {/* Glasses temple — right */}
            <mesh
              position={[-0.28, 0.48, 0.25]}
              material={mats.glasses}
              rotation={[0, -Math.PI / 2.4, 0]}
              geometry={geos.temple}
            />

            {/* Nose */}
            <mesh
              position={[0, 0.38, 0.46]}
              material={mats.skin}
              rotation={[0.3, 0, 0]}
              scale={[0.6, 1.0, 0.8]}
              geometry={geos.nose}
            />

            {/* Mouth — simple line */}
            <mesh
              ref={(el) => {
                if (el && joints.current) joints.current.mouth = el;
              }}
              position={[0, 0.28, 0.43]}
              material={
                new THREE.MeshStandardMaterial({ color: 0xc49080, roughness: 0.7 })
              }
              rotation={[0, 0, Math.PI / 2]}
              geometry={geos.mouth}
            />

            {/* Eyebrows */}
            <mesh
              position={[0.16, 0.57, 0.42]}
              material={mats.hair}
              rotation={[0.1, 0, 0.1]}
              geometry={geos.eyebrow}
            />
            <mesh
              position={[-0.16, 0.57, 0.42]}
              material={mats.hair}
              rotation={[0.1, 0, -0.1]}
              geometry={geos.eyebrow}
            />
          </group>

          {/* Arms */}
          <LabArm side="left" joints={joints} mats={mats} geos={geos} />
          <LabArm side="right" joints={joints} mats={mats} geos={geos} />
        </group>

        {/* Legs */}
        <LabLeg side="left" joints={joints} mats={mats} geos={geos} />
        <LabLeg side="right" joints={joints} mats={mats} geos={geos} />
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
  geos,
}: {
  side: "left" | "right";
  joints: React.MutableRefObject<any>;
  mats: LabMats;
  geos: any;
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
      <mesh material={mats.labCoat} castShadow receiveShadow geometry={geos.shoulder} />
      {/* Upper arm — lab coat sleeve */}
      <mesh position={[0, -0.7, 0]} material={mats.labCoat} castShadow receiveShadow geometry={geos.upperArm} />
      <group
        ref={(el) => {
          if (!joints.current[`${side}Arm`])
            joints.current[`${side}Arm`] = {} as any;
          joints.current[`${side}Arm`]!.elbow = el!;
        }}
        position={[0, -1.4, 0]}
      >
        {/* Elbow — rolled-up sleeve cuff */}
        <mesh material={mats.labCoat} castShadow receiveShadow geometry={geos.elbow} />
        {/* Forearm — exposed skin (sleeves rolled up) */}
        <mesh
          position={[0, -0.6, 0]}
          material={mats.skin}
          castShadow
          receiveShadow
          geometry={geos.forearm}
        />
        {/* Hand with Fingers */}
        <group position={[0, -1.3, 0]}>
          {/* Palm */}
          <mesh material={mats.skin} castShadow position={[0, -0.05, 0]} geometry={geos.palm} />
          {/* Thumb */}
          <mesh material={mats.skin} castShadow position={[-dir * 0.12, -0.05, 0.05]} rotation={[Math.PI / 8, 0, -dir * Math.PI / 6]} geometry={geos.thumb} />
          {/* Fingers */}
          {[-0.07, 0, 0.07].map((x, i) => (
            <mesh key={`finger-${i}`} material={mats.skin} castShadow position={[x, -0.22 - (i === 1 ? 0.02 : 0), 0]} geometry={i === 1 ? geos.finger2 : geos.finger1} />
          ))}
        </group>
      </group>
    </group>
  );
}

function LabLeg({
  side,
  joints,
  mats,
  geos,
}: {
  side: "left" | "right";
  joints: React.MutableRefObject<any>;
  mats: LabMats;
  geos: any;
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
        geometry={geos.thigh}
      />
      <group
        ref={(el) => {
          if (el && joints.current) joints.current[`${side}Knee`] = el;
        }}
        position={[0, -1.5, 0]}
      >
        {/* Knee joint */}
        <mesh material={mats.pants} castShadow receiveShadow geometry={geos.knee} />
        {/* Lower leg — dark pants */}
        <mesh
          position={[0, -0.75, 0]}
          material={mats.pants}
          castShadow
          receiveShadow
          geometry={geos.calf}
        />
        {/* Comfortable lab shoes */}
        <mesh
          position={[0, -1.6, 0.15]}
          material={mats.shoes}
          castShadow
          receiveShadow
          scale={[1, 0.7, 1.6]}
          geometry={geos.shoe}
        />
      </group>
    </group>
  );
}
