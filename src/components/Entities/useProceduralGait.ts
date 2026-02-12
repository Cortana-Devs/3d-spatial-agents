import { useRef, useCallback } from "react";
import * as THREE from "three";

interface GaitOptions {
    strideLength?: number; // Default stride
    leanFactor?: number;   // How much to lean forward on speed
    bankFactor?: number;   // How much to lean into turns
}

export function useProceduralGait(
    joints: React.MutableRefObject<any>,
    options: GaitOptions = {}
) {
    const {
        strideLength: defaultStride = 1.0,
        leanFactorCount = 0.08, // rename internal for safety if needed
        bankFactor: defaultBank = 0.05,
    } = options;

    // Internal State (Stored in refs)
    const walkTime = useRef(0);
    const smoothSpeed = useRef(0);

    // The update function is what's called inside useFrame
    const update = useCallback((
        velocity: THREE.Vector3,
        delta: number,
        customOptions: { strideLength?: number; leanFactor?: number; bankFactor?: number } = {}
    ) => {
        const stride = customOptions.strideLength ?? defaultStride;
        const lean = customOptions.leanFactor ?? options.leanFactor ?? 0.08;
        const bank = customOptions.bankFactor ?? defaultBank;

        const j = joints.current;
        if (!j || !j.hips) return;

        // 1. Smooth Speed
        const rawSpeed = velocity.length();
        smoothSpeed.current = THREE.MathUtils.lerp(smoothSpeed.current, rawSpeed, 0.1);
        const animSpeed = smoothSpeed.current;

        // 2. Gait Sync (Distance Based)
        const distTraveled = animSpeed * delta;
        walkTime.current += (distTraveled / stride) * Math.PI * 2;

        if (animSpeed < 0.1) {
            // --- IDLE ---
            const tIdle = performance.now() / 1000;
            const breathe = Math.sin(tIdle * 1.5) * 0.02;

            // Vertical Breathing
            j.torso.position.y = THREE.MathUtils.lerp(j.torso.position.y, breathe + 0.1, 0.1);

            // Reset Limbs smoothly
            const f = 0.1;
            j.leftHip.rotation.x = THREE.MathUtils.lerp(j.leftHip.rotation.x, 0, f);
            j.rightHip.rotation.x = THREE.MathUtils.lerp(j.rightHip.rotation.x, 0, f);
            j.leftKnee.rotation.x = THREE.MathUtils.lerp(j.leftKnee.rotation.x, 0, f);
            j.rightKnee.rotation.x = THREE.MathUtils.lerp(j.rightKnee.rotation.x, 0, f);
            j.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(j.leftArm.shoulder.rotation.x, 0, f);
            j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.x, 0, f);

            // Reset leans
            j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, 0, f);
            j.torso.rotation.z = THREE.MathUtils.lerp(j.torso.rotation.z, 0, f);
            j.hips.rotation.y = THREE.MathUtils.lerp(j.hips.rotation.y, 0, f);

        } else {
            // --- MOVING ---
            const legAmp = 0.6;
            const kneeAmp = 0.4;
            const armAmp = 0.7;

            // Hips (Main Drive)
            j.leftHip.rotation.x = Math.sin(walkTime.current) * legAmp;
            j.rightHip.rotation.x = Math.sin(walkTime.current + Math.PI) * legAmp;

            // Knees (Phase Delayed)
            const leftKneePhase = Math.cos(walkTime.current);
            const rightKneePhase = Math.cos(walkTime.current + Math.PI);

            j.leftKnee.rotation.x = Math.max(0, leftKneePhase * kneeAmp + 0.1);
            j.rightKnee.rotation.x = Math.max(0, rightKneePhase * kneeAmp + 0.1);

            // Arms (Opposite Phase)
            j.leftArm.shoulder.rotation.x = Math.sin(walkTime.current + Math.PI - 0.2) * armAmp;
            j.rightArm.shoulder.rotation.x = Math.sin(walkTime.current - 0.2) * armAmp;

            // Elbows (Dynamic Bend)
            j.leftArm.elbow.rotation.x = -0.5 - Math.max(0, Math.sin(walkTime.current + Math.PI)) * 0.5;
            j.rightArm.elbow.rotation.x = -0.5 - Math.max(0, Math.sin(walkTime.current)) * 0.5;

            // Vertical Bounce (Double Frequency)
            const bounce = Math.abs(Math.sin(walkTime.current)) * 0.08;
            j.torso.position.y = bounce + 0.1;

            // Physics Details
            // 1. Forward Lean
            const forwardLean = Math.min(animSpeed * lean, 0.3);
            j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, forwardLean, 0.1);

            // 2. Banking (Turn Lean / Walk Sway)
            const walkSway = Math.sin(walkTime.current) * bank * (animSpeed / 5.0);
            j.torso.rotation.z = THREE.MathUtils.lerp(j.torso.rotation.z, walkSway, 0.1);

            // 3. Hip Sway (Lateral)
            j.hips.rotation.y = THREE.MathUtils.lerp(j.hips.rotation.y, walkSway * 2, 0.1);
        }
    }, [joints, defaultStride, options.leanFactor, defaultBank]);

    return { update, walkTime, smoothSpeed };
}
