import { useRef, useCallback } from "react";
import * as THREE from "three";

interface GaitOptions {
  strideLength?: number; // Default stride
  leanFactor?: number; // How much to lean forward on speed
  bankFactor?: number; // How much to lean into turns
}

export function useProceduralGait(
  joints: React.MutableRefObject<any>,
  options: GaitOptions = {},
) {
  const {
    strideLength: defaultStride = 1.0,
    leanFactor: defaultLean = 0.08,
    bankFactor: defaultBank = 0.05,
  } = options;

  // Internal State (Stored in refs)
  const walkTime = useRef(0);
  const smoothSpeed = useRef(0);

  // The update function is what's called inside useFrame
  const update = useCallback(
    (
      velocity: THREE.Vector3,
      delta: number,
      customOptions: {
        strideLength?: number;
        leanFactor?: number;
        bankFactor?: number;
      } = {},
    ) => {
      const j = joints.current;
      if (!j || !j.hips) return;

      // 1. Smooth Speed
      const rawSpeed = velocity.length();
      smoothSpeed.current = THREE.MathUtils.lerp(
        smoothSpeed.current,
        rawSpeed,
        0.1,
      );
      const animSpeed = smoothSpeed.current;

      // Dynamically adjust stride length based on speed for realism
      const dynamicStride = Math.max(0.8, rawSpeed * 0.4);
      const stride = customOptions.strideLength ?? dynamicStride;
      const lean = customOptions.leanFactor ?? options.leanFactor ?? 0.08;
      const bank = customOptions.bankFactor ?? defaultBank;

      // 2. Gait Sync (Distance Based)
      const distTraveled = animSpeed * delta;
      walkTime.current += (distTraveled / stride) * Math.PI * 2;

      if (animSpeed < 0.1) {
        // --- IDLE ---
        const tIdle = performance.now() / 1000;
        const breathe = Math.sin(tIdle * 1.5) * 0.02;

        // Vertical Breathing
        j.torso.position.y = THREE.MathUtils.lerp(
          j.torso.position.y,
          breathe + 0.1,
          0.1,
        );

        // Reset Limbs smoothly
        const f = 0.1;
        j.leftHip.rotation.x = THREE.MathUtils.lerp(j.leftHip.rotation.x, 0, f);
        j.rightHip.rotation.x = THREE.MathUtils.lerp(
          j.rightHip.rotation.x,
          0,
          f,
        );
        j.leftKnee.rotation.x = THREE.MathUtils.lerp(
          j.leftKnee.rotation.x,
          0,
          f,
        );
        j.rightKnee.rotation.x = THREE.MathUtils.lerp(
          j.rightKnee.rotation.x,
          0,
          f,
        );
        j.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(
          j.leftArm.shoulder.rotation.x,
          0,
          f,
        );
        j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
          j.rightArm.shoulder.rotation.x,
          0,
          f,
        );

        // Counter-rotation reset
        j.torso.rotation.y = THREE.MathUtils.lerp(j.torso.rotation.y, 0, f);

        // Reset leans
        j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, 0, f);
        j.torso.rotation.z = THREE.MathUtils.lerp(j.torso.rotation.z, 0, f);
        j.hips.rotation.y = THREE.MathUtils.lerp(j.hips.rotation.y, 0, f);
      } else {
        // --- MOVING ---
        const minAmp = 0.2;
        const speedFactor = Math.min(animSpeed / 4.0, 1.0);

        const legAmp = minAmp + speedFactor * 0.4;
        const kneeAmp = minAmp + speedFactor * 0.4;
        const armAmp = minAmp + speedFactor * 0.5;

        // Hips (Main Drive)
        j.leftHip.rotation.x = Math.sin(walkTime.current) * legAmp;
        j.rightHip.rotation.x = Math.sin(walkTime.current + Math.PI) * legAmp;

        // Knees (Phase Delayed)
        // Using a more natural curve: knees flex quickly to clear the ground, then straighten
        const leftKneePhase = Math.sin(walkTime.current - Math.PI / 2);
        const rightKneePhase = Math.sin(walkTime.current + Math.PI / 2);

        j.leftKnee.rotation.x = Math.max(0, leftKneePhase * kneeAmp);
        j.rightKnee.rotation.x = Math.max(0, rightKneePhase * kneeAmp);

        // Arms (Opposite Phase to legs)
        // Add a natural slight backward bias and bend the elbows
        j.leftArm.shoulder.rotation.x =
          Math.sin(walkTime.current + Math.PI) * armAmp - 0.1;
        j.rightArm.shoulder.rotation.x =
          Math.sin(walkTime.current) * armAmp - 0.1;

        // Elbows (Dynamic Bend depending on swinging forward or backward)
        j.leftArm.elbow.rotation.x =
          -0.3 + Math.min(0, Math.sin(walkTime.current + Math.PI)) * 0.4;
        j.rightArm.elbow.rotation.x =
          -0.3 + Math.min(0, Math.sin(walkTime.current)) * 0.4;

        // Torso Bounce (Smooth cosine wave instead of jagged Math.abs)
        const bounce = (Math.cos(walkTime.current * 2) * -0.5 + 0.5) * 0.05;
        j.torso.position.y = bounce + 0.1;

        // Counter-Rotation (Shoulders twist opposite to hips)
        const shoulderTwist = Math.sin(walkTime.current) * 0.1 * speedFactor;
        j.torso.rotation.y = THREE.MathUtils.lerp(
          j.torso.rotation.y,
          -shoulderTwist,
          0.1,
        );

        // Physics Details
        // 1. Forward Lean
        const forwardLean = Math.min(animSpeed * lean, 0.25);
        j.torso.rotation.x = THREE.MathUtils.lerp(
          j.torso.rotation.x,
          forwardLean,
          0.1,
        );

        // 2. Banking (Turn Lean / Walk Sway)
        const walkSway = Math.sin(walkTime.current) * bank * speedFactor;
        j.torso.rotation.z = THREE.MathUtils.lerp(
          j.torso.rotation.z,
          walkSway,
          0.1,
        );

        // 3. Hip Sway (Lateral)
        j.hips.rotation.y = THREE.MathUtils.lerp(
          j.hips.rotation.y,
          walkSway * 1.5,
          0.1,
        );
      }
    },
    [joints, options.leanFactor, defaultBank],
  );

  return { update, walkTime, smoothSpeed };
}
