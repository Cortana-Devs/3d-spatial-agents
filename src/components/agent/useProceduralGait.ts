import { useRef, useCallback } from "react";
import * as THREE from "three";

interface GaitOptions {
  strideLength?: number; // Default stride
  leanFactor?: number; // How much to lean forward on speed
  bankFactor?: number; // How much to lean into turns
}

interface CustomGaitOptions {
  strideLength?: number;
  leanFactor?: number;
  bankFactor?: number;
  targetDirection?: THREE.Vector3; // For anticipatory head tracking
}

export function useProceduralGait(
  joints: React.MutableRefObject<any>,
  options: GaitOptions = {},
) {
  const { leanFactor: defaultLean = 0.08, bankFactor: defaultBank = 0.05 } =
    options;

  // Internal State (Stored in refs for performance)
  const walkTime = useRef(0);
  const smoothSpeed = useRef(0);
  const idleOffset = useRef(-1); // Randomize starting phase for asymmetry

  // The update function is what's called inside useFrame
  const update = useCallback(
    (
      velocity: THREE.Vector3,
      delta: number,
      customOptions: CustomGaitOptions = {},
    ) => {
      const j = joints.current;
      if (!j || !j.hips) return;

      if (idleOffset.current === -1) {
        idleOffset.current = Math.random() * 100;
      }

      // 1. Smooth Speed (Momentum simulation)
      const rawSpeed = velocity.length();
      smoothSpeed.current = THREE.MathUtils.lerp(
        smoothSpeed.current,
        rawSpeed,
        0.1, // Quick acceleration, soft deceleration
      );
      const animSpeed = smoothSpeed.current;

      // Dynamically adjust stride length based on speed for realism
      const dynamicStride = Math.max(0.8, rawSpeed * 0.4);
      const stride = customOptions.strideLength ?? dynamicStride;
      const lean = customOptions.leanFactor ?? defaultLean;
      const bank = customOptions.bankFactor ?? defaultBank;

      // 2. Gait Sync (Distance Based)
      const distTraveled = animSpeed * delta;
      walkTime.current += (distTraveled / stride) * Math.PI * 2;

      // 3. Anticipatory Head Tracking (Look-ahead)
      if (
        customOptions.targetDirection &&
        customOptions.targetDirection.lengthSq() > 0.01
      ) {
        // Calculate yaw angle to target
        const targetAngle = Math.atan2(
          customOptions.targetDirection.x,
          customOptions.targetDirection.z,
        );
        // Gently lerp the head and neck towards the target vector
        if (j.neck && j.head) {
          j.neck.rotation.y = THREE.MathUtils.lerp(
            j.neck.rotation.y,
            targetAngle * 0.3,
            0.05,
          );
          j.head.rotation.y = THREE.MathUtils.lerp(
            j.head.rotation.y,
            targetAngle * 0.5,
            0.08,
          );
        }
      } else {
        // Return to center
        if (j.neck && j.head) {
          j.neck.rotation.y = THREE.MathUtils.lerp(j.neck.rotation.y, 0, 0.05);
          j.head.rotation.y = THREE.MathUtils.lerp(j.head.rotation.y, 0, 0.08);
        }
      }

      if (animSpeed < 0.1) {
        // --- IDLE BEHAVIOR (Organic & Asymmetric) ---
        const tIdle = performance.now() / 1000 + idleOffset.current;

        // Complex breathing wave (layering frequencies prevents uncanny looping)
        const breathe =
          Math.sin(tIdle * 1.5) * 0.015 + Math.sin(tIdle * 0.5) * 0.005;

        // Vertical Breathing
        j.torso.position.y = THREE.MathUtils.lerp(
          j.torso.position.y,
          breathe + 0.1,
          0.1,
        );

        // Asymmetric Weight Shifting (Psycho-visual trick for restlessness)
        const weightShift =
          Math.sin(tIdle * 0.4) * Math.sin(tIdle * 0.27) * 0.06;
        j.hips.position.x = THREE.MathUtils.lerp(
          j.hips.position.x,
          weightShift,
          0.05,
        );
        j.torso.rotation.z = THREE.MathUtils.lerp(
          j.torso.rotation.z,
          -weightShift * 0.2,
          0.05,
        );

        // Relax knees unevenly based on weight shift
        j.leftKnee.rotation.x = THREE.MathUtils.lerp(
          j.leftKnee.rotation.x,
          weightShift > 0 ? 0.05 : 0,
          0.05,
        );
        j.rightKnee.rotation.x = THREE.MathUtils.lerp(
          j.rightKnee.rotation.x,
          weightShift < 0 ? 0.05 : 0,
          0.05,
        );

        // Reset other Limbs smoothly
        const f = 0.05; // Slower reset for more natural settling
        j.leftHip.rotation.x = THREE.MathUtils.lerp(j.leftHip.rotation.x, 0, f);
        j.rightHip.rotation.x = THREE.MathUtils.lerp(
          j.rightHip.rotation.x,
          0,
          f,
        );

        // Arm relaxation (let them hang naturally) + subtle shoulder rise with breath
        const shoulderBreath = breathe * 0.25;
        j.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(
          j.leftArm.shoulder.rotation.x,
          0.05 + shoulderBreath,
          f,
        );
        j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
          j.rightArm.shoulder.rotation.x,
          0.05 + shoulderBreath,
          f,
        );
        j.leftArm.elbow.rotation.x = THREE.MathUtils.lerp(
          j.leftArm.elbow.rotation.x,
          -0.05,
          f,
        );
        j.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(
          j.rightArm.elbow.rotation.x,
          -0.05,
          f,
        );

        // Counter-rotation reset
        j.torso.rotation.y = THREE.MathUtils.lerp(j.torso.rotation.y, 0, f);
        j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, 0, f);
        j.hips.rotation.y = THREE.MathUtils.lerp(j.hips.rotation.y, 0, f);
      } else {
        // --- MOVING BEHAVIOR (Kinematic & Physics-Approximated) ---
        const minAmp = 0.2;
        const speedFactor = Math.min(animSpeed / 4.0, 1.0);

        const legAmp = minAmp + speedFactor * 0.4;
        const kneeAmp = minAmp + speedFactor * 0.45; // slightly higher knee drive
        const armAmp = minAmp + speedFactor * 0.55;

        // Center hips horizontally from idle shift
        j.hips.position.x = THREE.MathUtils.lerp(j.hips.position.x, 0, 0.1);

        // Hips (Main Drive)
        j.leftHip.rotation.x = Math.sin(walkTime.current) * legAmp;
        j.rightHip.rotation.x = Math.sin(walkTime.current + Math.PI) * legAmp;

        // Knees (Phase Delayed & Ground Clearing)
        // Knee flexes rapidly on lift, straightens on plant
        const leftKneePhase = Math.sin(walkTime.current - Math.PI / 2);
        const rightKneePhase = Math.sin(walkTime.current + Math.PI / 2);
        j.leftKnee.rotation.x = Math.max(0, leftKneePhase * kneeAmp);
        j.rightKnee.rotation.x = Math.max(0, rightKneePhase * kneeAmp);

        // Arms (Spring-Damper Approximated Sway)
        // Adds momentum and drag to the standard sine wave
        const targetLeftShoulder =
          Math.sin(walkTime.current + Math.PI) * armAmp - 0.1;
        const targetRightShoulder = Math.sin(walkTime.current) * armAmp - 0.1;

        j.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(
          j.leftArm.shoulder.rotation.x,
          targetLeftShoulder,
          0.15,
        );
        j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
          j.rightArm.shoulder.rotation.x,
          targetRightShoulder,
          0.15,
        );

        // Elbows (Dynamic Bend based on swing direction)
        // Elbow bends more when swinging forward, straightens on backswing
        const leftElbowBend =
          -0.3 - Math.max(0, Math.sin(walkTime.current + Math.PI)) * 0.5;
        const rightElbowBend =
          -0.3 - Math.max(0, Math.sin(walkTime.current)) * 0.5;
        j.leftArm.elbow.rotation.x = THREE.MathUtils.lerp(
          j.leftArm.elbow.rotation.x,
          leftElbowBend,
          0.15,
        );
        j.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(
          j.rightArm.elbow.rotation.x,
          rightElbowBend,
          0.15,
        );

        // Torso Bounce (Smooth cosine wave - weight drop on footfall)
        const bounce =
          (Math.cos(walkTime.current * 2) * -0.5 + 0.5) * 0.05 * speedFactor;
        j.torso.position.y = THREE.MathUtils.lerp(
          j.torso.position.y,
          bounce + 0.1,
          0.2,
        );

        // Counter-Rotation (Shoulders twist opposite to hips to preserve momentum)
        const shoulderTwist = Math.sin(walkTime.current) * 0.12 * speedFactor;
        j.torso.rotation.y = THREE.MathUtils.lerp(
          j.torso.rotation.y,
          -shoulderTwist,
          0.1,
        );

        // Physics Details
        // 1. Forward Lean (Anticipation of momentum)
        const forwardLean = Math.min(animSpeed * lean, 0.25);
        j.torso.rotation.x = THREE.MathUtils.lerp(
          j.torso.rotation.x,
          forwardLean,
          0.08,
        );

        // 2. Banking (Turn Lean / Walk Sway)
        const walkSway = Math.sin(walkTime.current) * bank * speedFactor;
        j.torso.rotation.z = THREE.MathUtils.lerp(
          j.torso.rotation.z,
          walkSway,
          0.1,
        );

        // 3. Hip Sway (Lateral weight shifting over the planted foot)
        j.hips.rotation.y = THREE.MathUtils.lerp(
          j.hips.rotation.y,
          walkSway * 1.5,
          0.1,
        );
      }
    },
    [joints, defaultLean, defaultBank],
  );

  return { update, walkTime, smoothSpeed };
}
