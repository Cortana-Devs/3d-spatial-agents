/* eslint-disable react-hooks/immutability */
import React, { useRef, useMemo, useEffect, Suspense } from "react";
import * as THREE from "three";
import { useYukaAI } from "./useYukaAI";
import { ThoughtBubble } from "../UI/ThoughtBubble";
import { useGLTF, useAnimations, Html } from "@react-three/drei";
import { ErrorBoundary } from "../UI/ErrorBoundary";
import { useGameStore } from "@/store/gameStore";

// Preload the model if it exists to avoid stutter
// Note: If the file is missing, this might log a warning but won't crash until used
try {
  useGLTF.preload("/models/robot.glb");
} catch (e) {
  // Ignore preload errors
}

export default function AIRobot({
  playerRef,
  initialPosition = [10, 5, -330],
  id = "agent-01",
}: {
  playerRef: React.RefObject<THREE.Group | null>;
  initialPosition?: [number, number, number];
  id?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  // We pass a dummy joints ref because we are moving away from manual joint control
  // But useYukaAI still expects it for now (we can refactor useYukaAI later to make it optional)
  const joints = useRef<any>({});

  const { vehicle, brain, animationState } = useYukaAI(id, groupRef, playerRef, joints);
  const isMenuOpen = useGameStore((state) => state.isMenuOpen);
  const inspectedAgentId = useGameStore((state) => state.inspectedAgentId);
  const setInspectedAgentId = useGameStore((state) => state.setInspectedAgentId);

  const handleClick = (e: any) => {
    if (isMenuOpen) {
      e.stopPropagation();
      setInspectedAgentId(id);
      console.log("Inspecting Agent:", id);
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
      <ErrorBoundary fallback={<HighFiPlaceholderRobot state={animationState} />}>
        <Suspense fallback={<HighFiPlaceholderRobot state={animationState} />}>
          <RobotModel animationState={animationState} />
        </Suspense>
      </ErrorBoundary>
    </group >
  );
}

// ----------------------------------------------------------------------------
// 1. GLTF Mode (If /models/robot.glb exists)
// ----------------------------------------------------------------------------
function RobotModel({ animationState }: { animationState: string }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/models/robot.glb") as any;
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    // Play Animation based on state
    // We assume standard Mixamo naming conventions or similar
    // Fallback: search for something containing "Idle", "Walk", "Run", "Wave"

    const playAction = (name: string) => {
      if (!actions) return;

      // Find action that matches name (case insensitive partial match)
      const actionName = Object.keys(actions).find(key => key.toLowerCase().includes(name.toLowerCase()));
      const action = actions[actionName || ""];

      if (action) {
        action.reset().fadeIn(0.5).play();
        return action;
      }
      // If no match, try "Idle" or first animation
      if (name !== 'Idle') {
        const idleName = Object.keys(actions).find(key => key.toLowerCase().includes("idle"));
        const idle = actions[idleName || ""] || Object.values(actions)[0];
        idle?.reset().fadeIn(0.5).play();
        return idle;
      }
    };

    // Fade out all current actions
    Object.values(actions).forEach(action => action?.fadeOut(0.5));

    playAction(animationState);

  }, [animationState, actions]);

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} scale={[1.5, 1.5, 1.5]} position={[0, 0, 0]} />
    </group>
  );
}

// ----------------------------------------------------------------------------
// 2. High-Fidelity Placeholder (If model missing or loading)
// ----------------------------------------------------------------------------
function HighFiPlaceholderRobot({ state }: { state: string }) {
  // A cleaner, more "Apple-like" or "Sci-Fi" robot representation
  // Instead of capsules, we use sleek geometry with EnvMap materials

  const bodyMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: 0xeeeeee,
    metalness: 0.8,
    roughness: 0.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
  }), []);

  const jointMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.5,
    roughness: 0.5,
  }), []);

  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0x00ffff,
  }), []);

  // Simple procedural animation for the placeholder
  const group = useRef<THREE.Group>(null);

  // We can use useFrame to animate the placeholder based on state locally 
  // if we wanted, but for a placeholder, static or simple bobbing is fine.

  return (
    <group ref={group} position={[0, 0, 0]}>
      {/* Head */}
      <mesh material={bodyMat} position={[0, 3.8, 0]} castShadow>
        <boxGeometry args={[0.5, 0.4, 0.5]} />
      </mesh>
      {/* Visor */}
      <mesh material={glowMat} position={[0, 3.8, 0.26]}>
        <planeGeometry args={[0.4, 0.1]} />
      </mesh>

      {/* Neck */}
      <mesh material={jointMat} position={[0, 3.5, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.2]} />
      </mesh>

      {/* Torso */}
      <mesh material={bodyMat} position={[0, 2.8, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.3, 1.2, 8]} />
      </mesh>

      {/* Arms (Static in placeholder, but stylized) */}
      <mesh material={bodyMat} position={[-0.6, 2.8, 0]} rotation={[0, 0, 0.2]}>
        <capsuleGeometry args={[0.12, 1.0]} />
      </mesh>
      <mesh material={bodyMat} position={[0.6, 2.8, 0]} rotation={[0, 0, -0.2]}>
        <capsuleGeometry args={[0.12, 1.0]} />
      </mesh>

      {/* Legs */}
      <mesh material={bodyMat} position={[-0.3, 1.0, 0]}>
        <cylinderGeometry args={[0.15, 0.1, 2.0]} />
      </mesh>
      <mesh material={bodyMat} position={[0.3, 1.0, 0]}>
        <cylinderGeometry args={[0.15, 0.1, 2.0]} />
      </mesh>

      {/* Status Text */}
      <Html position={[0, 4.5, 0]} center>
        <div style={{ color: 'white', background: 'rgba(0,0,0,0.5)', padding: '2px 5px', borderRadius: '4px', fontSize: '10px' }}>
          Mode: {state} <br />
          (No Model Found)
        </div>
      </Html>
    </group>
  );
}
