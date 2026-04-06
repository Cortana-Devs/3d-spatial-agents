import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";

export type RobotAnimationState =
  | "Idle"
  | "Walk"
  | "Run"
  | "Wave"
  | "Sit"
  | "Lean"
  | "Think"
  | "Work"
  | "Present"
  | "Rest"
  | "LookAt";

export function ProstheticHand({
  isLeft,
  mats,
}: {
  isLeft: boolean;
  mats: any;
}) {
  const { armorMat, accentMat, jointMat } = mats;
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

export function LedEyes({
  agentId,
  animationState,
  mats,
}: {
  agentId: string;
  animationState: RobotAnimationState;
  mats: any;
}) {
  const { emissiveMat } = mats;
  const chatAgentId = useGameStore((s) => s.chatAgentId);
  const nearbyAgentId = useGameStore((s) => s.nearbyAgentId);
  const isFocused =
    !!agentId && (chatAgentId === agentId || nearbyAgentId === agentId);

  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const [emotionInitial] = useState(() => Math.random() * 5);
  const emotionTimer = useRef(emotionInitial);
  const [blinkInitial] = useState(() => Math.random() * 3);
  const blinkTimer = useRef(blinkInitial);
  const isBlinking = useRef(false);
  const currentEmotion = useRef(0);
  const wasFocused = useRef(false);
  const waveWide = useRef(0);

  const targetScale = useRef(new THREE.Vector3(1, 1, 1));
  const targetRotZ = useRef(0);
  const targetPosY = useRef(0);
  const targetColor = useRef(new THREE.Color("#0ea5e9"));

  useFrame((_state, delta) => {
    const waveTarget = animationState === "Wave" ? 1 : 0;
    waveWide.current +=
      (waveTarget - waveWide.current) * Math.min(1, delta * 8);

    if (isFocused) {
      if (!wasFocused.current) {
        emotionTimer.current = 1 + Math.random() * 2;
      }
      wasFocused.current = true;
      targetScale.current.set(1, 1, 1);
      targetRotZ.current = 0;
      targetPosY.current = 0;
      targetColor.current.set("#0ea5e9");
    } else {
      if (wasFocused.current) {
        emotionTimer.current = 0.5 + Math.random();
      }
      wasFocused.current = false;

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
    }

    blinkTimer.current -= delta;
    if (blinkTimer.current <= 0 && !isBlinking.current) {
      isBlinking.current = true;
      blinkTimer.current = 0.15;
    } else if (blinkTimer.current <= 0 && isBlinking.current) {
      isBlinking.current = false;
      blinkTimer.current = isFocused
        ? 3.5 + Math.random() * 2.5
        : 1.5 + Math.random() * 2;
    }

    const lerpSpeed = 8 * delta;
    const w = waveWide.current;
    const baseX = THREE.MathUtils.lerp(targetScale.current.x, 1.12, w);
    const baseY = THREE.MathUtils.lerp(targetScale.current.y, 1.12, w);
    const basePosY = THREE.MathUtils.lerp(targetPosY.current, 0.006, w);
    const currentScaleY = isBlinking.current ? 0.05 : baseY;

    if (leftEyeRef.current && rightEyeRef.current) {
      const targetX = baseX;
      const targetZ = targetRotZ.current;
      const targetY = basePosY;
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
