/* eslint-disable react-hooks/immutability */
import React, { useRef, useMemo, useEffect, Suspense } from "react";
import * as THREE from "three";
import { useYukaAI } from "./useYukaAI";
import { ThoughtBubble } from "../UI/ThoughtBubble";
import { useGLTF, useAnimations, Text } from "@react-three/drei";
import { ErrorBoundary } from "../UI/ErrorBoundary";
import { useGameStore } from "@/store/gameStore";

// Preload the model if it exists to avoid stutter
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

// ============================================================================
// 1. GLTF Mode (If /models/robot.glb exists)
// ============================================================================
function RobotModel({ animationState }: { animationState: string }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF("/models/robot.glb") as any;
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    const playAction = (name: string) => {
      if (!actions) return;
      const actionName = Object.keys(actions).find((key) =>
        key.toLowerCase().includes(name.toLowerCase()),
      );
      const action = actions[actionName || ""];
      if (action) {
        action.reset().fadeIn(0.5).play();
        return action;
      }
      if (name !== "Idle") {
        const idleName = Object.keys(actions).find((key) =>
          key.toLowerCase().includes("idle"),
        );
        const idle =
          actions[idleName || ""] || Object.values(actions)[0];
        idle?.reset().fadeIn(0.5).play();
        return idle;
      }
    };
    Object.values(actions).forEach((action) => action?.fadeOut(0.5));
    playAction(animationState);
  }, [animationState, actions]);

  return (
    <group ref={group} dispose={null}>
      {/* Scale to match player character height (~7 units) */}
      <primitive
        object={scene}
        scale={[3.5, 3.5, 3.5]}
        position={[0, 0, 0]}
      />
    </group>
  );
}

// ============================================================================
// 2. "NEXUS" — High-Fidelity AI Android Character
//    Height: ~7.3 units (matches player character)
//    Design: Futuristic android with armored hull, glowing accents, visor
// ============================================================================
function NexusAndroid({ state, id }: { state: string; id: string }) {
  // ── Premium Materials ──
  const hullMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0xe0e0e8,
        metalness: 0.7,
        roughness: 0.15,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
      }),
    [],
  );

  const darkPanelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x1a1a2e,
        metalness: 0.6,
        roughness: 0.25,
      }),
    [],
  );

  const jointMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        metalness: 0.8,
        roughness: 0.15,
      }),
    [],
  );

  const glowMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x00ccff,
        emissive: 0x00ccff,
        emissiveIntensity: 2.0,
      }),
    [],
  );

  const softGlowMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x00ccff,
        emissive: 0x00ccff,
        emissiveIntensity: 0.8,
      }),
    [],
  );

  const visorMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0x002244,
        metalness: 0.3,
        roughness: 0.05,
        clearcoat: 1.0,
        transmission: 0.3,
        transparent: true,
        opacity: 0.85,
      }),
    [],
  );

  const coreGlowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x0088ff,
      }),
    [],
  );

  const shoeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x151520,
        roughness: 0.3,
        metalness: 0.5,
      }),
    [],
  );

  return (
    <group position={[0, 0, 0]}>
      {/* ═══════════════════════════════════════════ */}
      {/* ══ FEET / BOOTS (y ≈ 0 — 0.65)         ══ */}
      {/* ═══════════════════════════════════════════ */}

      {/* Left boot */}
      <mesh material={shoeMat} position={[-0.35, 0.28, 0.08]} castShadow scale={[1, 0.6, 1.5]}>
        <sphereGeometry args={[0.28, 12, 12]} />
      </mesh>
      {/* Left boot sole plate */}
      <mesh material={jointMat} position={[-0.35, 0.06, 0.08]}>
        <boxGeometry args={[0.52, 0.06, 0.72]} />
      </mesh>
      {/* Left boot ankle collar */}
      <mesh material={hullMat} position={[-0.35, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.28, 0.2, 12]} />
      </mesh>
      {/* Left ankle glow ring */}
      <mesh material={softGlowMat} position={[-0.35, 0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.23, 16]} />
      </mesh>

      {/* Right boot */}
      <mesh material={shoeMat} position={[0.35, 0.28, 0.08]} castShadow scale={[1, 0.6, 1.5]}>
        <sphereGeometry args={[0.28, 12, 12]} />
      </mesh>
      {/* Right boot sole plate */}
      <mesh material={jointMat} position={[0.35, 0.06, 0.08]}>
        <boxGeometry args={[0.52, 0.06, 0.72]} />
      </mesh>
      {/* Right boot ankle collar */}
      <mesh material={hullMat} position={[0.35, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.28, 0.2, 12]} />
      </mesh>
      {/* Right ankle glow ring */}
      <mesh material={softGlowMat} position={[0.35, 0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.23, 16]} />
      </mesh>

      {/* ═══════════════════════════════════════════ */}
      {/* ══ LOWER LEGS / SHINS (y ≈ 0.7 — 2.0)  ══ */}
      {/* ═══════════════════════════════════════════ */}

      {/* Left shin armor */}
      <mesh material={hullMat} position={[-0.35, 1.35, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.25, 1.3, 10]} />
      </mesh>
      {/* Left shin front accent strip */}
      <mesh material={softGlowMat} position={[-0.35, 1.35, 0.22]}>
        <boxGeometry args={[0.05, 1.0, 0.02]} />
      </mesh>
      {/* Left shin inner piston detail */}
      <mesh material={jointMat} position={[-0.35, 1.35, -0.15]}>
        <cylinderGeometry args={[0.05, 0.05, 0.9]} />
      </mesh>

      {/* Right shin armor */}
      <mesh material={hullMat} position={[0.35, 1.35, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.25, 1.3, 10]} />
      </mesh>
      {/* Right shin front accent strip */}
      <mesh material={softGlowMat} position={[0.35, 1.35, 0.22]}>
        <boxGeometry args={[0.05, 1.0, 0.02]} />
      </mesh>
      {/* Right shin inner piston detail */}
      <mesh material={jointMat} position={[0.35, 1.35, -0.15]}>
        <cylinderGeometry args={[0.05, 0.05, 0.9]} />
      </mesh>

      {/* ═══════════════════════════════════════════ */}
      {/* ══ KNEES (y ≈ 2.05)                     ══ */}
      {/* ═══════════════════════════════════════════ */}

      {/* Left knee joint */}
      <mesh material={jointMat} position={[-0.35, 2.05, 0]} castShadow>
        <sphereGeometry args={[0.28, 12, 12]} />
      </mesh>
      {/* Left knee glow ring */}
      <mesh material={glowMat} position={[-0.35, 2.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.3, 16]} />
      </mesh>

      {/* Right knee joint */}
      <mesh material={jointMat} position={[0.35, 2.05, 0]} castShadow>
        <sphereGeometry args={[0.28, 12, 12]} />
      </mesh>
      {/* Right knee glow ring */}
      <mesh material={glowMat} position={[0.35, 2.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.3, 16]} />
      </mesh>

      {/* ═══════════════════════════════════════════ */}
      {/* ══ UPPER LEGS / THIGHS (y ≈ 2.2 — 3.4) ══ */}
      {/* ═══════════════════════════════════════════ */}

      {/* Left thigh armor */}
      <mesh material={hullMat} position={[-0.35, 2.8, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.32, 1.2, 10]} />
      </mesh>
      {/* Left thigh side utility panel */}
      <mesh material={darkPanelMat} position={[-0.62, 2.8, 0]}>
        <boxGeometry args={[0.08, 0.7, 0.28]} />
      </mesh>

      {/* Right thigh armor */}
      <mesh material={hullMat} position={[0.35, 2.8, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.32, 1.2, 10]} />
      </mesh>
      {/* Right thigh side utility panel */}
      <mesh material={darkPanelMat} position={[0.62, 2.8, 0]}>
        <boxGeometry args={[0.08, 0.7, 0.28]} />
      </mesh>

      {/* ═══════════════════════════════════════════ */}
      {/* ══ HIP ASSEMBLY (y ≈ 3.5)               ══ */}
      {/* ═══════════════════════════════════════════ */}

      {/* Pelvis / hip core */}
      <mesh material={hullMat} position={[0, 3.5, 0]} castShadow rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.38, 0.7, 12, 16]} />
      </mesh>
      {/* Hip accent ring */}
      <mesh material={softGlowMat} position={[0, 3.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.56, 0.6, 24]} />
      </mesh>
      {/* Front utility belt plate */}
      <mesh material={darkPanelMat} position={[0, 3.5, 0.42]}>
        <boxGeometry args={[0.55, 0.22, 0.08]} />
      </mesh>
      {/* Belt buckle glow */}
      <mesh material={glowMat} position={[0, 3.5, 0.47]}>
        <boxGeometry args={[0.15, 0.08, 0.01]} />
      </mesh>

      {/* ═══════════════════════════════════════════ */}
      {/* ══ LOWER TORSO / WAIST (y ≈ 3.7 — 4.4) ══ */}
      {/* ═══════════════════════════════════════════ */}

      <mesh material={darkPanelMat} position={[0, 4.05, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.52, 0.8, 12]} />
      </mesh>
      {/* Waist accent line */}
      <mesh material={glowMat} position={[0, 3.7, 0.5]}>
        <boxGeometry args={[0.75, 0.04, 0.02]} />
      </mesh>
      {/* Side vent panels */}
      <mesh material={jointMat} position={[-0.48, 4.05, 0]}>
        <boxGeometry args={[0.06, 0.5, 0.3]} />
      </mesh>
      <mesh material={jointMat} position={[0.48, 4.05, 0]}>
        <boxGeometry args={[0.06, 0.5, 0.3]} />
      </mesh>

      {/* ═══════════════════════════════════════════ */}
      {/* ══ UPPER TORSO / CHEST (y ≈ 4.5 — 6.0) ══ */}
      {/* ═══════════════════════════════════════════ */}

      {/* Main chest volume */}
      <mesh material={hullMat} position={[0, 5.2, 0]} castShadow scale={[1.65, 1.45, 0.95]}>
        <sphereGeometry args={[0.6, 16, 16]} />
      </mesh>

      {/* Chest front armor plate */}
      <mesh material={darkPanelMat} position={[0, 5.2, 0.52]} scale={[1.3, 1.1, 0.1]}>
        <sphereGeometry args={[0.5, 12, 12]} />
      </mesh>

      {/* AI Core — glowing center ring */}
      <mesh material={glowMat} position={[0, 5.2, 0.58]}>
        <ringGeometry args={[0.12, 0.2, 24]} />
      </mesh>
      {/* AI Core — inner filled circle */}
      <mesh material={coreGlowMat} position={[0, 5.2, 0.59]}>
        <circleGeometry args={[0.12, 24]} />
      </mesh>
      {/* AI Core — outer pulse ring */}
      <mesh material={softGlowMat} position={[0, 5.2, 0.575]}>
        <ringGeometry args={[0.22, 0.25, 24]} />
      </mesh>

      {/* Chest vent accent lines — left */}
      {[0, 1].map((i) => (
        <mesh
          key={`vent-l-${i}`}
          material={softGlowMat}
          position={[-0.45 - i * 0.12, 5.0, 0.52]}
          rotation={[0, 0, 0.2]}
        >
          <boxGeometry args={[0.035, 0.45 - i * 0.1, 0.015]} />
        </mesh>
      ))}
      {/* Chest vent accent lines — right */}
      {[0, 1].map((i) => (
        <mesh
          key={`vent-r-${i}`}
          material={softGlowMat}
          position={[0.45 + i * 0.12, 5.0, 0.52]}
          rotation={[0, 0, -0.2]}
        >
          <boxGeometry args={[0.035, 0.45 - i * 0.1, 0.015]} />
        </mesh>
      ))}

      {/* Back panel */}
      <mesh material={darkPanelMat} position={[0, 5.0, -0.5]} scale={[1.0, 0.8, 0.1]}>
        <sphereGeometry args={[0.5, 12, 12]} />
      </mesh>
      {/* Back data port cluster */}
      <mesh material={jointMat} position={[0, 5.3, -0.56]}>
        <boxGeometry args={[0.4, 0.25, 0.06]} />
      </mesh>
      {/* Back status LEDs */}
      {[-0.12, 0, 0.12].map((x, i) => (
        <mesh key={`back-led-${i}`} position={[x, 5.15, -0.58]}>
          <circleGeometry args={[0.03, 8]} />
          <meshBasicMaterial color={i === 1 ? 0x00ff44 : 0x00ccff} />
        </mesh>
      ))}

      {/* ═══════════════════════════════════════════ */}
      {/* ══ SHOULDER ARMOR                        ══ */}
      {/* ═══════════════════════════════════════════ */}

      {/* Left shoulder cap */}
      <mesh material={hullMat} position={[-0.95, 5.85, 0]} castShadow scale={[1.2, 0.7, 1.0]}>
        <sphereGeometry args={[0.34, 12, 12]} />
      </mesh>
      {/* Left shoulder LED strip */}
      <mesh material={softGlowMat} position={[-1.02, 5.68, 0.26]}>
        <boxGeometry args={[0.3, 0.04, 0.02]} />
      </mesh>
      {/* Left shoulder panel accent */}
      <mesh material={darkPanelMat} position={[-1.08, 5.85, 0]}>
        <boxGeometry args={[0.06, 0.3, 0.4]} />
      </mesh>

      {/* Right shoulder cap */}
      <mesh material={hullMat} position={[0.95, 5.85, 0]} castShadow scale={[1.2, 0.7, 1.0]}>
        <sphereGeometry args={[0.34, 12, 12]} />
      </mesh>
      {/* Right shoulder LED strip */}
      <mesh material={softGlowMat} position={[1.02, 5.68, 0.26]}>
        <boxGeometry args={[0.3, 0.04, 0.02]} />
      </mesh>
      {/* Right shoulder panel accent */}
      <mesh material={darkPanelMat} position={[1.08, 5.85, 0]}>
        <boxGeometry args={[0.06, 0.3, 0.4]} />
      </mesh>

      {/* ═══════════════════════════════════════════ */}
      {/* ══ LEFT ARM                              ══ */}
      {/* ═══════════════════════════════════════════ */}

      {/* Upper arm */}
      <mesh material={hullMat} position={[-0.95, 5.15, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.23, 1.2, 10]} />
      </mesh>
      {/* Upper arm accent line */}
      <mesh material={softGlowMat} position={[-0.95, 5.15, 0.2]}>
        <boxGeometry args={[0.035, 0.8, 0.015]} />
      </mesh>
      {/* Elbow joint */}
      <mesh material={jointMat} position={[-0.95, 4.45, 0]} castShadow>
        <sphereGeometry args={[0.23, 10, 10]} />
      </mesh>
      {/* Elbow glow ring */}
      <mesh material={glowMat} position={[-0.95, 4.45, 0]} rotation={[0, 0, Math.PI / 2]}>
        <ringGeometry args={[0.19, 0.23, 12]} />
      </mesh>
      {/* Forearm */}
      <mesh material={hullMat} position={[-0.95, 3.75, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 1.1, 10]} />
      </mesh>
      {/* Forearm armor plate */}
      <mesh material={darkPanelMat} position={[-0.95, 3.75, 0.18]}>
        <boxGeometry args={[0.22, 0.7, 0.06]} />
      </mesh>
      {/* Wrist holographic display */}
      <mesh material={darkPanelMat} position={[-0.95, 3.25, 0.2]}>
        <boxGeometry args={[0.26, 0.22, 0.08]} />
      </mesh>
      <mesh position={[-0.95, 3.25, 0.25]}>
        <planeGeometry args={[0.2, 0.14]} />
        <meshBasicMaterial color={0x003355} transparent opacity={0.7} />
      </mesh>
      {/* Hand */}
      <mesh material={hullMat} position={[-0.95, 3.0, 0]} castShadow rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.1, 0.18, 8, 8]} />
      </mesh>
      {/* Finger segments (2 visible) */}
      <mesh material={jointMat} position={[-0.95, 2.88, 0.1]}>
        <boxGeometry args={[0.15, 0.06, 0.08]} />
      </mesh>
      <mesh material={jointMat} position={[-0.95, 2.88, -0.06]}>
        <boxGeometry args={[0.15, 0.06, 0.08]} />
      </mesh>

      {/* ═══════════════════════════════════════════ */}
      {/* ══ RIGHT ARM                             ══ */}
      {/* ═══════════════════════════════════════════ */}

      {/* Upper arm */}
      <mesh material={hullMat} position={[0.95, 5.15, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.23, 1.2, 10]} />
      </mesh>
      {/* Upper arm accent line */}
      <mesh material={softGlowMat} position={[0.95, 5.15, 0.2]}>
        <boxGeometry args={[0.035, 0.8, 0.015]} />
      </mesh>
      {/* Elbow joint */}
      <mesh material={jointMat} position={[0.95, 4.45, 0]} castShadow>
        <sphereGeometry args={[0.23, 10, 10]} />
      </mesh>
      {/* Elbow glow ring */}
      <mesh material={glowMat} position={[0.95, 4.45, 0]} rotation={[0, 0, Math.PI / 2]}>
        <ringGeometry args={[0.19, 0.23, 12]} />
      </mesh>
      {/* Forearm */}
      <mesh material={hullMat} position={[0.95, 3.75, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 1.1, 10]} />
      </mesh>
      {/* Forearm armor plate */}
      <mesh material={darkPanelMat} position={[0.95, 3.75, 0.18]}>
        <boxGeometry args={[0.22, 0.7, 0.06]} />
      </mesh>
      {/* Wrist holographic display */}
      <mesh material={darkPanelMat} position={[0.95, 3.25, 0.2]}>
        <boxGeometry args={[0.26, 0.22, 0.08]} />
      </mesh>
      <mesh position={[0.95, 3.25, 0.25]}>
        <planeGeometry args={[0.2, 0.14]} />
        <meshBasicMaterial color={0x003355} transparent opacity={0.7} />
      </mesh>
      {/* Hand */}
      <mesh material={hullMat} position={[0.95, 3.0, 0]} castShadow rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.1, 0.18, 8, 8]} />
      </mesh>
      {/* Finger segments (2 visible) */}
      <mesh material={jointMat} position={[0.95, 2.88, 0.1]}>
        <boxGeometry args={[0.15, 0.06, 0.08]} />
      </mesh>
      <mesh material={jointMat} position={[0.95, 2.88, -0.06]}>
        <boxGeometry args={[0.15, 0.06, 0.08]} />
      </mesh>

      {/* ═══════════════════════════════════════════ */}
      {/* ══ NECK (y ≈ 6.0 — 6.35)                ══ */}
      {/* ═══════════════════════════════════════════ */}

      {/* Neck column */}
      <mesh material={jointMat} position={[0, 6.2, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.35, 12]} />
      </mesh>
      {/* Neck base glow ring */}
      <mesh material={softGlowMat} position={[0, 6.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.24, 16]} />
      </mesh>
      {/* Neck segments (visible actuators) */}
      <mesh material={hullMat} position={[0, 6.25, 0.12]}>
        <boxGeometry args={[0.12, 0.15, 0.06]} />
      </mesh>
      <mesh material={hullMat} position={[0, 6.25, -0.12]}>
        <boxGeometry args={[0.12, 0.15, 0.06]} />
      </mesh>

      {/* ═══════════════════════════════════════════ */}
      {/* ══ HEAD / HELMET (y ≈ 6.35 — 7.3)       ══ */}
      {/* ═══════════════════════════════════════════ */}

      {/* Main helmet shell */}
      <mesh material={hullMat} position={[0, 6.75, 0]} castShadow scale={[0.95, 1.0, 0.92]}>
        <sphereGeometry args={[0.48, 16, 16]} />
      </mesh>

      {/* Wrap-around visor */}
      <mesh material={visorMat} position={[0, 6.72, 0.22]} scale={[1.35, 0.55, 0.45]}>
        <sphereGeometry args={[0.38, 16, 8]} />
      </mesh>
      {/* Visor inner glow (eyes) */}
      <mesh position={[-0.15, 6.73, 0.44]}>
        <circleGeometry args={[0.06, 12]} />
        <meshBasicMaterial color={0x00ccff} />
      </mesh>
      <mesh position={[0.15, 6.73, 0.44]}>
        <circleGeometry args={[0.06, 12]} />
        <meshBasicMaterial color={0x00ccff} />
      </mesh>
      {/* Visor bridge glow line */}
      <mesh position={[0, 6.73, 0.45]}>
        <boxGeometry args={[0.15, 0.015, 0.01]} />
        <meshBasicMaterial color={0x00ccff} transparent opacity={0.5} />
      </mesh>

      {/* Chin guard */}
      <mesh material={darkPanelMat} position={[0, 6.42, 0.2]} scale={[0.8, 0.4, 0.5]}>
        <sphereGeometry args={[0.3, 10, 10]} />
      </mesh>

      {/* Forehead accent strip */}
      <mesh material={softGlowMat} position={[0, 7.02, 0.32]}>
        <boxGeometry args={[0.38, 0.04, 0.02]} />
      </mesh>

      {/* Top crest / antenna base */}
      <mesh material={hullMat} position={[0, 7.18, -0.02]}>
        <cylinderGeometry args={[0.05, 0.1, 0.15, 8]} />
      </mesh>
      {/* Antenna tip glow */}
      <mesh position={[0, 7.3, -0.02]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color={0x00ccff} />
      </mesh>

      {/* Side head sensor pods */}
      <mesh material={darkPanelMat} position={[-0.46, 6.68, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.1, 8]} />
      </mesh>
      <mesh material={darkPanelMat} position={[0.46, 6.68, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.1, 8]} />
      </mesh>
      {/* Side sensor indicator LEDs */}
      <mesh position={[-0.52, 6.68, 0]}>
        <circleGeometry args={[0.035, 8]} />
        <meshBasicMaterial color={0x00ccff} />
      </mesh>
      <mesh position={[0.52, 6.68, 0]}>
        <circleGeometry args={[0.035, 8]} />
        <meshBasicMaterial color={0x00ccff} />
      </mesh>

      {/* Rear helmet ridge */}
      <mesh material={darkPanelMat} position={[0, 6.85, -0.42]} scale={[0.7, 0.6, 0.15]}>
        <sphereGeometry args={[0.35, 10, 10]} />
      </mesh>

      {/* ═══════════════════════════════════════════ */}
      {/* ══ OVERHEAD ID TAG                       ══ */}
      {/* ═══════════════════════════════════════════ */}

      <Text
        position={[0, 7.8, 0]}
        fontSize={0.3}
        color="#00ccff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.015}
        outlineColor="#000"
        rotation={[0, 0, 0]}
      >
        {id.toUpperCase()}
      </Text>
    </group>
  );
}
