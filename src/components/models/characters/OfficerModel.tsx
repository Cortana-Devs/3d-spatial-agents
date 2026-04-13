import React, { useRef, useMemo, useLayoutEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, useTexture, Decal, Text } from "@react-three/drei";
import * as THREE from "three";
import LedMouth from "@/components/models/characters/LedMouth";
import { useGameStore } from "@/store/gameStore";
import type { ClientBrain } from "@/systems/ClientBrain";
import { RobotAnimationState, ProstheticHand, LedEyes } from "./parts/SharedRobotParts";
import type { DriveManager } from "@/lib/agent-drives";
import type { MovementPersonality } from "@/systems/behavior/MovementPersonality";
import type { GazeController } from "@/systems/behavior/GazeController";
import type { IdleBehaviorSystem } from "@/systems/behavior/IdleBehaviorSystem";
import { AgentTaskRegistry } from "@/systems/AgentTaskQueue";

const ARMOR_COLOR = "#0f172a"; // Dark authority suit
const ACCENT_COLOR = "#d4af37"; // Brass/Gold accents
const JOINT_COLOR = "#000000"; // Deep carbon/metallic
const VISOR_COLOR = "#000000"; // Pitch black glass
const EMISSIVE_COLOR = "#f59e0b"; // Amber warning light

export default React.memo(function OfficerModel({
  joints,
  analyser,
  id,
  color: tintColor = EMISSIVE_COLOR, // Renamed to avoid confusion with THREE.Color
  animationState = "Idle",
  brain,
  driveManager,
  movementPersonality,
  gazeController,
  idleBehaviorSystem,
  ...props
}: {
  joints: React.MutableRefObject<any>;
  analyser?: AnalyserNode | null;
  id?: string;
  color?: string;
  animationState?: RobotAnimationState;
  brain?: ClientBrain | null;
  driveManager?: DriveManager | null;
  movementPersonality?: MovementPersonality | null;
  gazeController?: GazeController | null;
  idleBehaviorSystem?: IdleBehaviorSystem | null;
} & Omit<React.JSX.IntrinsicElements["group"], "id">) {
  const logoTexture = useTexture("/usjp-logo.svg");

  const mats = useMemo(() => {
    const armor = new THREE.MeshStandardMaterial({
      color: ARMOR_COLOR, // Clean premium white for typical robots
      roughness: 0.15,
      metalness: 0.2,
    });

    const accent = new THREE.MeshStandardMaterial({
      color: ACCENT_COLOR,
      roughness: 0.3,
      metalness: 0.6,
    });

    const joint = new THREE.MeshStandardMaterial({
      color: JOINT_COLOR,
      roughness: 0.5,
      metalness: 0.8,
    });

    const visor = new THREE.MeshStandardMaterial({
      color: VISOR_COLOR,
      roughness: 0.05,
      metalness: 0.9,
      envMapIntensity: 2,
    });

    const emissive = new THREE.MeshStandardMaterial({
      color: "#e0f2fe",
      emissive: tintColor,
      emissiveIntensity: 2,
      toneMapped: false,
    });

    const fabricDark = new THREE.MeshStandardMaterial({
      color: "#1e293b", // Slate jacket
      roughness: 0.8,
      metalness: 0.1,
    });
    
    const capVisorMat = new THREE.MeshStandardMaterial({
      color: "#020617", // Glossy black peak
      roughness: 0.2,
      metalness: 0.6,
    });
    
    const glassesMat = new THREE.MeshStandardMaterial({
      color: "#111827", // Dark frames
      roughness: 0.5,
      metalness: 0.8,
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: "#fbbf24", // Brass buttons/badge
      roughness: 0.3,
      metalness: 1.0,
    });

    return { 
      armorMat: armor, 
      accentMat: accent, 
      jointMat: joint, 
      visorMat: visor, 
      emissiveMat: emissive,
      fabricDark,
      capVisorMat,
      glassesMat,
      brassMat
    };
  }, [tintColor]);

  const { armorMat, accentMat, jointMat, visorMat, emissiveMat, fabricDark, capVisorMat, glassesMat, brassMat } = mats;

  useLayoutEffect(() => {
    if (logoTexture) {
      // eslint-disable-next-line react-hooks/immutability
      logoTexture.anisotropy = 4;
      logoTexture.minFilter = THREE.LinearMipmapLinearFilter;
      logoTexture.magFilter = THREE.LinearFilter;
      logoTexture.needsUpdate = true;
    }
  }, [logoTexture]);

  const pelvisRef = useRef<THREE.Group>(null);
  const spineRef = useRef<THREE.Group>(null);
  const chestRef = useRef<THREE.Group>(null);
  const neckRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const lShoulderRef = useRef<THREE.Group>(null);
  const rShoulderRef = useRef<THREE.Group>(null);
  const lElbowRef = useRef<THREE.Group>(null);
  const rElbowRef = useRef<THREE.Group>(null);
  const lHipRef = useRef<THREE.Group>(null);
  const rHipRef = useRef<THREE.Group>(null);
  const lKneeRef = useRef<THREE.Group>(null);
  const rKneeRef = useRef<THREE.Group>(null);
  const lAnkleRef = useRef<THREE.Group>(null);
  const rAnkleRef = useRef<THREE.Group>(null);
  const lWristRef = useRef<THREE.Group>(null);
  const rWristRef = useRef<THREE.Group>(null);

  // Sync refs to joints.current for useProceduralGait
  useLayoutEffect(() => {
    if (joints.current) {
      // eslint-disable-next-line react-hooks/immutability
      joints.current.hips = pelvisRef.current;
      joints.current.torso = spineRef.current;
      joints.current.leftHip = lHipRef.current;
      joints.current.rightHip = rHipRef.current;
      joints.current.leftKnee = lKneeRef.current;
      joints.current.rightKnee = rKneeRef.current;
      joints.current.leftAnkle = lAnkleRef.current;
      joints.current.rightAnkle = rAnkleRef.current;

      if (!joints.current.leftArm) joints.current.leftArm = {};
      joints.current.leftArm.shoulder = lShoulderRef.current;
      joints.current.leftArm.elbow = lElbowRef.current;
      joints.current.leftArm.wrist = lWristRef.current;

      if (!joints.current.rightArm) joints.current.rightArm = {};
      joints.current.rightArm.shoulder = rShoulderRef.current;
      joints.current.rightArm.elbow = rElbowRef.current;
      joints.current.rightArm.wrist = rWristRef.current;
    }
  }, [joints]);

  const isLookingAtPlayer = useRef(false);
  const lookAtTimer = useRef(0);
  const targetHeadQuaternion = useRef(new THREE.Quaternion());

  // Optimization: Preallocate objects to prevent GC pressure in useFrame
  const headWorldPosRef = useRef(new THREE.Vector3());
  const parentWorldQuatRef = useRef(new THREE.Quaternion());
  const dummyRef = useRef(new THREE.Object3D());
  const eulerRef = useRef(new THREE.Euler(0, 0, 0, "YXZ"));

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    if (brain?.state.isThinking) {
      emissiveMat.emissiveIntensity = 0.9 + Math.sin(t * 1.2) * 0.12;
    } else {
      emissiveMat.emissiveIntensity = 1.5 + Math.sin(t * 4) * 0.5;
    }

    if (idleBehaviorSystem && movementPersonality && driveManager) {
      const personality = movementPersonality.getProfile(driveManager.drives);
      idleBehaviorSystem.start(personality);
      const phase = AgentTaskRegistry.getInstance().getOrCreate(id || "").getCurrentPhase();
      idleBehaviorSystem.applyToJoints({
        pelvis: pelvisRef.current || undefined,
        spine: spineRef.current || undefined,
        head: headRef.current || undefined,
      }, delta, phase);
    }

    // Head tracking logic using the centralized GazeController
    if (headRef.current && gazeController) {
      const headWorldPos = headWorldPosRef.current;
      headRef.current.getWorldPosition(headWorldPos);

      const parentWorldQuat = parentWorldQuatRef.current;
      if (headRef.current.parent) {
        headRef.current.parent.getWorldQuaternion(parentWorldQuat);
      } else {
        parentWorldQuat.identity();
      }

      gazeController.getTargetQuaternion(headWorldPos, parentWorldQuat, targetHeadQuaternion.current);
      headRef.current.quaternion.slerp(targetHeadQuaternion.current, delta * 5);
    }
  });

  return (
    <group {...props} dispose={null} scale={[4, 4, 4]}>
      {/* Root: Pelvis */}
      <group ref={pelvisRef} position={[0, 1.0, 0]}>
        <RoundedBox
          position={[0, 0, 0]}
          args={[0.26, 0.16, 0.16]}
          radius={0.04}
          smoothness={4}
          material={armorMat}
          castShadow
          receiveShadow
        />
        <RoundedBox
          position={[0.14, 0.02, 0]}
          args={[0.04, 0.12, 0.18]}
          radius={0.01}
          smoothness={4}
          material={accentMat}
          castShadow
          receiveShadow
        />
        <RoundedBox
          position={[-0.14, 0.02, 0]}
          args={[0.04, 0.12, 0.18]}
          radius={0.01}
          smoothness={4}
          material={accentMat}
          castShadow
          receiveShadow
        />

        {/* Spine & Upper Body */}
        <group ref={spineRef} position={[0, 0.1, 0]}>
          <mesh
            position={[0, 0.09, 0]}
            material={jointMat}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.075, 0.065, 0.22, 32]} />
          </mesh>
          <RoundedBox
            position={[0, 0.03, 0.06]}
            args={[0.12, 0.04, 0.04]}
            radius={0.01}
            smoothness={4}
            material={armorMat}
            castShadow
            receiveShadow
          />
          <RoundedBox
            position={[0, 0.08, 0.065]}
            args={[0.14, 0.04, 0.04]}
            radius={0.01}
            smoothness={4}
            material={armorMat}
            castShadow
            receiveShadow
          />

          <group ref={chestRef} position={[0, 0.22, 0]}>
            <RoundedBox
              position={[0, 0.06, 0]}
              args={[0.32, 0.22, 0.16]}
              radius={0.05}
              smoothness={4}
              material={armorMat}
              castShadow
              receiveShadow
            />
            <RoundedBox
              position={[0, 0.16, 0]}
              args={[0.36, 0.06, 0.12]}
              radius={0.02}
              smoothness={4}
              material={accentMat}
              castShadow
              receiveShadow
            />
            <RoundedBox
              position={[0, 0.08, 0.075]}
              rotation={[0.05, 0, 0]}
              args={[0.26, 0.16, 0.04]}
              radius={0.02}
              smoothness={4}
              material={armorMat}
              castShadow
              receiveShadow
            >
              <Decal
                position={[0, 0, 0.02]}
                rotation={[0, 0, 0]}
                scale={[0.08, 0.08, 0.01]}
              >
                <meshStandardMaterial
                  map={logoTexture}
                  transparent
                  depthTest={true}
                  depthWrite={true}
                  polygonOffset
                  polygonOffsetFactor={-1}
                />
              </Decal>
            </RoundedBox>
            <RoundedBox
              position={[0, -0.02, 0.08]}
              args={[0.1, 0.005, 0.01]}
              radius={0.002}
              smoothness={4}
              material={emissiveMat}
              castShadow
              receiveShadow
            />
            
            {/* Inspector Overcoat Jacket */}
            <RoundedBox
              position={[0, 0.04, 0.0]}
              args={[0.38, 0.28, 0.18]}
              radius={0.06}
              smoothness={4}
              material={fabricDark}
              castShadow
              receiveShadow
            />
            {/* Jacket Flaps */}
            <mesh position={[0.08, 0.0, 0.1]} rotation={[0, 0, 0]} material={fabricDark} castShadow>
              <boxGeometry args={[0.15, 0.25, 0.02]} />
            </mesh>
            <mesh position={[-0.08, 0.0, 0.1]} rotation={[0, 0, 0]} material={fabricDark} castShadow>
              <boxGeometry args={[0.15, 0.25, 0.02]} />
            </mesh>

            {/* Brass Buttons */}
            {[-0.05, 0.03, 0.11].map((y, i) => (
              <mesh key={`btn-${i}`} position={[0.04, y, 0.11]} material={brassMat}>
                <cylinderGeometry args={[0.015, 0.015, 0.01, 8]} />
              </mesh>
            ))}
            {[-0.05, 0.03, 0.11].map((y, i) => (
              <mesh key={`btn2-${i}`} position={[-0.04, y, 0.11]} material={brassMat}>
                <cylinderGeometry args={[0.015, 0.015, 0.01, 8]} />
              </mesh>
            ))}

            {/* Badge */}
            <mesh position={[0.12, 0.12, 0.11]} material={brassMat} castShadow rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 0.01, 6]} />
            </mesh>
            
            {/* Epaulettes (Shoulder Boards) */}
            <RoundedBox position={[0.18, 0.2, 0]} args={[0.12, 0.02, 0.06]} radius={0.005} material={fabricDark} castShadow />
            <mesh position={[0.2, 0.21, 0]} material={brassMat}><cylinderGeometry args={[0.008, 0.008, 0.01, 8]} /></mesh>
            
            <RoundedBox position={[-0.18, 0.2, 0]} args={[0.12, 0.02, 0.06]} radius={0.005} material={fabricDark} castShadow />
            <mesh position={[-0.2, 0.21, 0]} material={brassMat}><cylinderGeometry args={[0.008, 0.008, 0.01, 8]} /></mesh>

            {/* Neck & Head */}
            <group ref={neckRef} position={[0, 0.22, 0]}>
              <mesh
                position={[0, 0.01, 0]}
                material={jointMat}
                castShadow
                receiveShadow
              >
                <cylinderGeometry args={[0.045, 0.055, 0.14, 32]} />
              </mesh>
              <group ref={headRef} position={[0, 0.12, 0]}>
                <mesh
                  position={[0, 0.04, -0.01]}
                  material={armorMat}
                  castShadow
                  receiveShadow
                >
                  <sphereGeometry args={[0.09, 32, 32]} />
                </mesh>
                <RoundedBox
                  position={[0, -0.03, 0.02]}
                  args={[0.13, 0.07, 0.11]}
                  radius={0.02}
                  smoothness={4}
                  material={armorMat}
                  castShadow
                  receiveShadow
                />
                <mesh
                  position={[0.09, 0.02, -0.01]}
                  rotation={[0, 0, Math.PI / 2]}
                  material={jointMat}
                >
                  <cylinderGeometry args={[0.025, 0.025, 0.03, 32]} />
                </mesh>
                <mesh
                  position={[-0.09, 0.02, -0.01]}
                  rotation={[0, 0, Math.PI / 2]}
                  material={jointMat}
                >
                  <cylinderGeometry args={[0.025, 0.025, 0.03, 32]} />
                </mesh>
                <RoundedBox
                  position={[0, 0.03, 0.06]}
                  args={[0.15, 0.07, 0.06]}
                  radius={0.01}
                  smoothness={4}
                  material={visorMat}
                  castShadow
                  receiveShadow
                />
                <LedEyes
                  agentId={id ?? ""}
                  animationState={animationState}
                  mats={mats}
                />
                
                {/* Officer Peaked Cap */}
                <group position={[0, 0.1, 0]} rotation={[-0.1, 0, 0]}>
                  {/* Cap Base */}
                  <mesh position={[0, -0.02, 0]} material={fabricDark} castShadow>
                    <cylinderGeometry args={[0.12, 0.12, 0.08, 32]} />
                  </mesh>
                  {/* Cap Crown (Top) */}
                  <mesh position={[0, 0.02, 0.02]} rotation={[0.1, 0, 0]} material={fabricDark} castShadow scale={[1.2, 0.8, 1.2]}>
                    <sphereGeometry args={[0.12, 32, 16, 0, Math.PI * 2, 0, Math.PI/2]} />
                  </mesh>
                  {/* Cap Visor (Peak) */}
                  <group position={[0, -0.04, 0.11]} rotation={[-0.2, 0, 0]}>
                    <mesh material={capVisorMat} castShadow rotation={[0, 0, Math.PI/2]}>
                      <capsuleGeometry args={[0.02, 0.16, 8, 16]} />
                    </mesh>
                  </group>
                  {/* Cap Badge */}
                  <mesh position={[0, 0.02, 0.13]} material={brassMat} rotation={[Math.PI/2, 0, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, 0.01, 8]} />
                  </mesh>
                  <mesh position={[0, 0.02, 0.135]} material={accentMat}>
                    <boxGeometry args={[0.015, 0.015, 0.01]} />
                  </mesh>
                </group>

                {/* Inspecting Glasses overlay on visor */}
                <group position={[0, 0.03, 0.095]}>
                  {/* Frame */}
                  <mesh position={[0, 0, 0]} material={glassesMat}>
                    <boxGeometry args={[0.16, 0.01, 0.01]} />
                  </mesh>
                  {/* Lenses */}
                  <mesh position={[0.04, -0.015, 0]} material={glassesMat}>
                    <torusGeometry args={[0.025, 0.005, 8, 16]} />
                  </mesh>
                  <mesh position={[-0.04, -0.015, 0]} material={glassesMat}>
                    <torusGeometry args={[0.025, 0.005, 8, 16]} />
                  </mesh>
                </group>

                <LedMouth position={[0, -0.035, 0.076]} analyser={analyser} />
              </group>
            </group>

            {/* Arms */}
            <group ref={lShoulderRef} position={[0.21, 0.14, 0]}>
              <mesh material={jointMat} castShadow receiveShadow>
                <sphereGeometry args={[0.055, 32, 32]} />
              </mesh>
              <RoundedBox
                position={[0.05, 0, 0]}
                rotation={[0, 0, -0.2]}
                args={[0.08, 0.14, 0.12]}
                radius={0.03}
                smoothness={4}
                material={armorMat}
                castShadow
                receiveShadow
              />
              <mesh
                position={[0, -0.15, 0]}
                material={armorMat}
                castShadow
                receiveShadow
              >
                <cylinderGeometry args={[0.045, 0.035, 0.24, 32]} />
              </mesh>
              <group ref={lElbowRef} position={[0, -0.28, 0]}>
                <mesh material={jointMat} castShadow receiveShadow>
                  <sphereGeometry args={[0.04, 32, 32]} />
                </mesh>
                <mesh
                  position={[0, -0.14, 0]}
                  material={armorMat}
                  castShadow
                  receiveShadow
                >
                  <cylinderGeometry args={[0.04, 0.025, 0.24, 32]} />
                </mesh>
                <group ref={lWristRef} position={[0, -0.28, 0]}>
                  <mesh material={jointMat} castShadow receiveShadow>
                    <sphereGeometry args={[0.025, 32, 32]} />
                  </mesh>
                  <group rotation={[0, Math.PI / 3, 0]}>
                    <ProstheticHand isLeft={true} mats={mats} />
                  </group>
                </group>
              </group>
            </group>

            <group ref={rShoulderRef} position={[-0.21, 0.14, 0]}>
              <mesh material={jointMat} castShadow receiveShadow>
                <sphereGeometry args={[0.055, 32, 32]} />
              </mesh>
              <RoundedBox
                position={[-0.05, 0, 0]}
                rotation={[0, 0, 0.2]}
                args={[0.08, 0.14, 0.12]}
                radius={0.03}
                smoothness={4}
                material={armorMat}
                castShadow
                receiveShadow
              />
              <mesh
                position={[0, -0.15, 0]}
                material={armorMat}
                castShadow
                receiveShadow
              >
                <cylinderGeometry args={[0.045, 0.035, 0.24, 32]} />
              </mesh>
              <group ref={rElbowRef} position={[0, -0.28, 0]}>
                <mesh material={jointMat} castShadow receiveShadow>
                  <sphereGeometry args={[0.04, 32, 32]} />
                </mesh>
                <mesh
                  position={[0, -0.14, 0]}
                  material={armorMat}
                  castShadow
                  receiveShadow
                >
                  <cylinderGeometry args={[0.04, 0.025, 0.24, 32]} />
                </mesh>
                <group ref={rWristRef} position={[0, -0.28, 0]}>
                  <mesh material={jointMat} castShadow receiveShadow>
                    <sphereGeometry args={[0.025, 32, 32]} />
                  </mesh>
                  <group rotation={[0, -Math.PI / 3, 0]}>
                    <ProstheticHand isLeft={false} mats={mats} />
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>

        {/* Legs */}
        <group ref={lHipRef} position={[0.11, -0.08, 0]}>
          <mesh material={jointMat} castShadow receiveShadow>
            <sphereGeometry args={[0.055, 32, 32]} />
          </mesh>
          <mesh
            position={[0, -0.2, 0]}
            material={armorMat}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.06, 0.045, 0.38, 32]} />
          </mesh>
          <group ref={lKneeRef} position={[0, -0.4, 0]}>
            <mesh material={jointMat} castShadow receiveShadow>
              <sphereGeometry args={[0.045, 32, 32]} />
            </mesh>
            <RoundedBox
              position={[0, 0, 0.04]}
              args={[0.06, 0.08, 0.02]}
              radius={0.01}
              smoothness={4}
              material={accentMat}
              castShadow
              receiveShadow
            />
            <mesh
              position={[0, -0.2, 0]}
              material={armorMat}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[0.045, 0.03, 0.38, 32]} />
            </mesh>
            <group ref={lAnkleRef} position={[0, -0.4, 0]}>
              <mesh material={jointMat} castShadow receiveShadow>
                <sphereGeometry args={[0.035, 32, 32]} />
              </mesh>
              <RoundedBox
                position={[0, -0.05, 0.04]}
                args={[0.07, 0.06, 0.18]}
                radius={0.02}
                smoothness={4}
                material={armorMat}
                castShadow
                receiveShadow
              />
              <RoundedBox
                position={[0, -0.04, -0.04]}
                args={[0.075, 0.07, 0.06]}
                radius={0.01}
                smoothness={4}
                material={accentMat}
                castShadow
                receiveShadow
              />
            </group>
          </group>
        </group>

        <group ref={rHipRef} position={[-0.11, -0.08, 0]}>
          <mesh material={jointMat} castShadow receiveShadow>
            <sphereGeometry args={[0.055, 32, 32]} />
          </mesh>
          <mesh
            position={[0, -0.2, 0]}
            material={armorMat}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.06, 0.045, 0.38, 32]} />
          </mesh>
          <group ref={rKneeRef} position={[0, -0.4, 0]}>
            <mesh material={jointMat} castShadow receiveShadow>
              <sphereGeometry args={[0.045, 32, 32]} />
            </mesh>
            <RoundedBox
              position={[0, 0, 0.04]}
              args={[0.06, 0.08, 0.02]}
              radius={0.01}
              smoothness={4}
              material={accentMat}
              castShadow
              receiveShadow
            />
            <mesh
              position={[0, -0.2, 0]}
              material={armorMat}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[0.045, 0.03, 0.38, 32]} />
            </mesh>
            <group ref={rAnkleRef} position={[0, -0.4, 0]}>
              <mesh material={jointMat} castShadow receiveShadow>
                <sphereGeometry args={[0.035, 32, 32]} />
              </mesh>
              <RoundedBox
                position={[0, -0.05, 0.04]}
                args={[0.07, 0.06, 0.18]}
                radius={0.02}
                smoothness={4}
                material={armorMat}
                castShadow
                receiveShadow
              />
              <RoundedBox
                position={[0, -0.04, -0.04]}
                args={[0.075, 0.07, 0.06]}
                radius={0.01}
                smoothness={4}
                material={accentMat}
                castShadow
                receiveShadow
              />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
});
