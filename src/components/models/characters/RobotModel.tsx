import React, { useRef, useMemo, useLayoutEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, useTexture, Decal, Text } from "@react-three/drei";
import * as THREE from "three";
import LedMouth from "@/components/models/characters/LedMouth";
import { useGameStore } from "@/store/gameStore";

const ARMOR_COLOR = "#f8fafc"; // Premium glossy white
const ACCENT_COLOR = "#94a3b8"; // Light metallic accent
const JOINT_COLOR = "#0f172a"; // Deep carbon/metallic
const VISOR_COLOR = "#000000"; // Pitch black glass
const EMISSIVE_COLOR = "#0ea5e9"; // Cyan glow

// Reusable materials
const armorMat = new THREE.MeshStandardMaterial({
  color: ARMOR_COLOR,
  roughness: 0.15,
  metalness: 0.2,
});

const accentMat = new THREE.MeshStandardMaterial({
  color: ACCENT_COLOR,
  roughness: 0.3,
  metalness: 0.6,
});

const jointMat = new THREE.MeshStandardMaterial({
  color: JOINT_COLOR,
  roughness: 0.5,
  metalness: 0.8,
});

const visorMat = new THREE.MeshStandardMaterial({
  color: VISOR_COLOR,
  roughness: 0.05,
  metalness: 0.9,
  envMapIntensity: 2,
});

const emissiveMat = new THREE.MeshStandardMaterial({
  color: "#e0f2fe",
  emissive: EMISSIVE_COLOR,
  emissiveIntensity: 2,
  toneMapped: false,
});

function ProstheticHand({ isLeft }: { isLeft: boolean }) {
  const sign = isLeft ? -1 : 1;
  const fingerRefs = useRef<(THREE.Group | null)[]>([]);
  const midRefs = useRef<(THREE.Group | null)[]>([]);
  const distalRefs = useRef<(THREE.Group | null)[]>([]);
  const thumbBaseRef = useRef<THREE.Group>(null);
  const thumbMidRef = useRef<THREE.Group>(null);

  const [gripInitial] = useState(() => Math.random() * 5);
  const gripTimer = useRef(gripInitial);
  const gripPhase = useRef(0);
  const gripAmount = useRef(0);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    gripTimer.current -= delta;
    if (gripTimer.current <= 0 && gripPhase.current === 0) {
      if (Math.random() > 0.2) gripPhase.current = 1;
      gripTimer.current = 4 + Math.random() * 6;
    }

    if (gripPhase.current === 1) {
      gripAmount.current += delta * 5;
      if (gripAmount.current >= 1) {
        gripAmount.current = 1;
        gripPhase.current = 2;
      }
    } else if (gripPhase.current === 2) {
      gripAmount.current -= delta * 3;
      if (gripAmount.current <= 0) {
        gripAmount.current = 0;
        gripPhase.current = 0;
      }
    }

    const g = gripAmount.current;
    const t1_5 = t * 1.5;

    fingerRefs.current.forEach((ref, i) => {
      if (ref)
        ref.rotation.x =
          0.05 + i * 0.02 + Math.sin(t1_5 + i * 0.3) * 0.03 + 1.2 * g;
    });
    midRefs.current.forEach((ref, i) => {
      if (ref)
        ref.rotation.x = 0.15 + Math.sin(t1_5 + i * 0.3 + 0.5) * 0.04 + 1.4 * g;
    });
    distalRefs.current.forEach((ref, i) => {
      if (ref)
        ref.rotation.x = 0.15 + Math.sin(t1_5 + i * 0.3 + 1.0) * 0.04 + 1.2 * g;
    });

    if (thumbBaseRef.current && thumbMidRef.current) {
      thumbBaseRef.current.rotation.x = 0.2 + Math.sin(t1_5) * 0.02 + 0.5 * g;
      thumbBaseRef.current.rotation.y =
        sign * 0.7 + Math.sin(t1_5 + 0.5) * 0.02;
      thumbBaseRef.current.rotation.z = sign * 0.4 - sign * (0.3 * g);
      thumbMidRef.current.rotation.x =
        0.15 + Math.sin(t1_5 + 1.0) * 0.04 + 0.8 * g;
    }
  });

  return (
    <group>
      <RoundedBox
        position={[0, -0.035, 0]}
        args={[0.06, 0.07, 0.025]}
        radius={0.01}
        smoothness={4}
        material={armorMat}
        castShadow
        receiveShadow
      />
      <RoundedBox
        position={[0, -0.035, 0.005]}
        args={[0.04, 0.06, 0.03]}
        radius={0.01}
        smoothness={4}
        material={accentMat}
        castShadow
        receiveShadow
      />
      {[0.022, 0.007, -0.007, -0.022].map((xOffset, i) => {
        const lengthMult = i === 1 ? 1.1 : i === 3 ? 0.75 : 0.95;
        return (
          <group
            key={i}
            position={[sign * xOffset, -0.07, 0]}
            rotation={[0, 0, sign * (xOffset * 1.5)]}
            ref={(el) => {
              fingerRefs.current[i] = el;
            }}
          >
            <mesh
              position={[0, -0.015 * lengthMult, 0]}
              material={armorMat}
              castShadow
              receiveShadow
            >
              <capsuleGeometry args={[0.006, 0.03 * lengthMult, 16, 16]} />
            </mesh>
            <mesh
              position={[0, -0.035 * lengthMult, 0]}
              material={jointMat}
              castShadow
              receiveShadow
            >
              <sphereGeometry args={[0.007, 16, 16]} />
            </mesh>
            <group
              position={[0, -0.035 * lengthMult, 0]}
              ref={(el) => {
                midRefs.current[i] = el;
              }}
            >
              <mesh
                position={[0, -0.015 * lengthMult, 0]}
                material={armorMat}
                castShadow
                receiveShadow
              >
                <capsuleGeometry args={[0.005, 0.03 * lengthMult, 16, 16]} />
              </mesh>
              <mesh
                position={[0, -0.035 * lengthMult, 0]}
                material={jointMat}
                castShadow
                receiveShadow
              >
                <sphereGeometry args={[0.006, 16, 16]} />
              </mesh>
              <group
                position={[0, -0.035 * lengthMult, 0]}
                ref={(el) => {
                  distalRefs.current[i] = el;
                }}
              >
                <mesh
                  position={[0, -0.01 * lengthMult, 0]}
                  material={accentMat}
                  castShadow
                  receiveShadow
                >
                  <capsuleGeometry args={[0.005, 0.02 * lengthMult, 16, 16]} />
                </mesh>
              </group>
            </group>
          </group>
        );
      })}
      <group
        position={[sign * 0.035, -0.015, 0.015]}
        rotation={[0.2, sign * 0.7, sign * 0.4]}
        ref={thumbBaseRef}
      >
        <mesh
          position={[0, -0.015, 0]}
          material={armorMat}
          castShadow
          receiveShadow
        >
          <capsuleGeometry args={[0.008, 0.03, 16, 16]} />
        </mesh>
        <mesh
          position={[0, -0.035, 0]}
          material={jointMat}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[0.008, 16, 16]} />
        </mesh>
        <group position={[0, -0.035, 0]} ref={thumbMidRef}>
          <mesh
            position={[0, -0.015, 0]}
            material={accentMat}
            castShadow
            receiveShadow
          >
            <capsuleGeometry args={[0.007, 0.03, 16, 16]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function LedEyes() {
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const [emotionInitial] = useState(() => Math.random() * 5);
  const emotionTimer = useRef(emotionInitial);
  const [blinkInitial] = useState(() => Math.random() * 3);
  const blinkTimer = useRef(blinkInitial);
  const isBlinking = useRef(false);
  const currentEmotion = useRef(0);

  const targetScale = useRef(new THREE.Vector3(1, 1, 1));
  const targetRotZ = useRef(0);
  const targetPosY = useRef(0);
  const targetColor = useRef(new THREE.Color("#0ea5e9"));

  useFrame((state, delta) => {
    emotionTimer.current -= delta;
    if (emotionTimer.current <= 0) {
      currentEmotion.current = Math.floor(Math.random() * 5);
      emotionTimer.current = 3 + Math.random() * 5;

      switch (currentEmotion.current) {
        case 0: // Idle
          targetScale.current.set(1, 1, 1);
          targetRotZ.current = 0;
          targetPosY.current = 0;
          targetColor.current.set("#0ea5e9");
          break;
        case 1: // Happy
          targetScale.current.set(1, 0.7, 1);
          targetRotZ.current = 0.2;
          targetPosY.current = 0.005;
          targetColor.current.set("#22c55e");
          break;
        case 2: // Sad
          targetScale.current.set(1, 0.8, 1);
          targetRotZ.current = -0.2;
          targetPosY.current = -0.005;
          targetColor.current.set("#3b82f6");
          break;
        case 3: // Angry
          targetScale.current.set(1, 0.5, 1);
          targetRotZ.current = 0.3;
          targetPosY.current = -0.005;
          targetColor.current.set("#ef4444");
          break;
        case 4: // Surprised
          targetScale.current.set(1.1, 1.1, 1);
          targetRotZ.current = 0;
          targetPosY.current = 0.005;
          targetColor.current.set("#f59e0b");
          break;
      }
    }

    blinkTimer.current -= delta;
    if (blinkTimer.current <= 0 && !isBlinking.current) {
      isBlinking.current = true;
      blinkTimer.current = 0.15;
    } else if (blinkTimer.current <= 0 && isBlinking.current) {
      isBlinking.current = false;
      blinkTimer.current = 2 + Math.random() * 4;
    }

    const lerpSpeed = 8 * delta;
    const currentScaleY = isBlinking.current ? 0.05 : targetScale.current.y;

    if (leftEyeRef.current && rightEyeRef.current) {
      const targetX = targetScale.current.x;
      const targetZ = targetRotZ.current;
      const targetY = targetPosY.current;
      const blinkLerp = isBlinking.current ? 0.8 : lerpSpeed;

      leftEyeRef.current.scale.x +=
        (targetX - leftEyeRef.current.scale.x) * lerpSpeed;
      leftEyeRef.current.scale.y +=
        (currentScaleY - leftEyeRef.current.scale.y) * blinkLerp;
      leftEyeRef.current.rotation.z +=
        (targetZ - leftEyeRef.current.rotation.z) * lerpSpeed;
      leftEyeRef.current.position.y +=
        (targetY - leftEyeRef.current.position.y) * lerpSpeed;

      rightEyeRef.current.scale.x +=
        (targetX - rightEyeRef.current.scale.x) * lerpSpeed;
      rightEyeRef.current.scale.y +=
        (currentScaleY - rightEyeRef.current.scale.y) * blinkLerp;
      rightEyeRef.current.rotation.z +=
        (-targetZ - rightEyeRef.current.rotation.z) * lerpSpeed;
      rightEyeRef.current.position.y +=
        (targetY - rightEyeRef.current.position.y) * lerpSpeed;

      emissiveMat.emissive.lerp(targetColor.current, lerpSpeed * 0.5);
    }
  });

  return (
    <group position={[0, 0.03, 0.091]}>
      <RoundedBox
        ref={leftEyeRef as any}
        position={[-0.035, 0, 0]}
        args={[0.025, 0.035, 0.01]}
        radius={0.008}
        smoothness={4}
        material={emissiveMat}
      />
      <RoundedBox
        ref={rightEyeRef as any}
        position={[0.035, 0, 0]}
        args={[0.025, 0.035, 0.01]}
        radius={0.008}
        smoothness={4}
        material={emissiveMat}
      />
    </group>
  );
}

export default React.memo(function RobotModel({
  joints,
  analyser,
  id,
  ...props
}: {
  joints: React.MutableRefObject<any>;
  analyser?: AnalyserNode | null;
  id?: string;
} & Omit<React.JSX.IntrinsicElements["group"], "id">) {
  const logoTexture = useTexture("/usjp-logo.svg");

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

      if (!joints.current.rightArm) joints.current.rightArm = {};
      joints.current.rightArm.shoulder = rShoulderRef.current;
      joints.current.rightArm.elbow = rElbowRef.current;
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
    emissiveMat.emissiveIntensity = 1.5 + Math.sin(t * 4) * 0.5;

    // Head tracking logic
    if (headRef.current) {
      const state = useGameStore.getState();
      const isChattingWithMe = id && state.chatAgentId === id;

      lookAtTimer.current -= delta;
      if (isChattingWithMe) {
        isLookingAtPlayer.current = true;
      } else if (lookAtTimer.current <= 0) {
        lookAtTimer.current = 2 + Math.random() * 4;
        // 80% chance to track player if nearby
        isLookingAtPlayer.current = Math.random() < 0.8;
      }

      const playerPos = state.playerPosition;
      const headWorldPos = headWorldPosRef.current;
      headRef.current.getWorldPosition(headWorldPos);

      const distance = headWorldPos.distanceTo(playerPos);

      if (isLookingAtPlayer.current && distance < 10.0) {
        const dummy = dummyRef.current;
        dummy.position.copy(headWorldPos);
        dummy.lookAt(playerPos);

        if (headRef.current.parent) {
          const parentWorldQuat = parentWorldQuatRef.current;
          headRef.current.parent.getWorldQuaternion(parentWorldQuat);
          targetHeadQuaternion.current.copy(
            parentWorldQuat.invert().multiply(dummy.quaternion),
          );
        } else {
          targetHeadQuaternion.current.copy(dummy.quaternion);
        }

        // Clamp angles to prevent breaking neck
        const euler = eulerRef.current.setFromQuaternion(
          targetHeadQuaternion.current,
          "YXZ",
        );
        const normalizeAngle = (angle: number) => {
          let a = angle % (2 * Math.PI);
          if (a > Math.PI) a -= 2 * Math.PI;
          if (a < -Math.PI) a += 2 * Math.PI;
          return a;
        };
        euler.x = THREE.MathUtils.clamp(normalizeAngle(euler.x), -0.6, 0.6);
        euler.y = THREE.MathUtils.clamp(normalizeAngle(euler.y), -1.2, 1.2);
        euler.z = 0;
        targetHeadQuaternion.current.setFromEuler(euler);
      } else {
        targetHeadQuaternion.current.identity();
      }

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
                <LedEyes />
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
                position={[0.02, -0.15, 0]}
                material={armorMat}
                castShadow
                receiveShadow
              >
                <cylinderGeometry args={[0.045, 0.035, 0.24, 32]} />
              </mesh>
              <group ref={lElbowRef} position={[0.02, -0.28, 0]}>
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
                <group position={[0, -0.28, 0]}>
                  <mesh material={jointMat} castShadow receiveShadow>
                    <sphereGeometry args={[0.025, 32, 32]} />
                  </mesh>
                  <group rotation={[0, Math.PI / 3, 0]}>
                    <ProstheticHand isLeft={true} />
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
                position={[-0.02, -0.15, 0]}
                material={armorMat}
                castShadow
                receiveShadow
              >
                <cylinderGeometry args={[0.045, 0.035, 0.24, 32]} />
              </mesh>
              <group ref={rElbowRef} position={[-0.02, -0.28, 0]}>
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
                <group position={[0, -0.28, 0]}>
                  <mesh material={jointMat} castShadow receiveShadow>
                    <sphereGeometry args={[0.025, 32, 32]} />
                  </mesh>
                  <group rotation={[0, -Math.PI / 3, 0]}>
                    <ProstheticHand isLeft={false} />
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
