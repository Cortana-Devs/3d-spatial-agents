import { useRef, useCallback } from "react";
import * as THREE from "three";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface GaitOptions {
  strideLength?: number;
  leanFactor?: number;
  bankFactor?: number;
}

interface CustomGaitOptions {
  strideLength?: number;
  leanFactor?: number;
  bankFactor?: number;
  targetDirection?: THREE.Vector3;
  /** Override animation state — if set, replaces the velocity-based idle/walk logic */
  extraState?: "Sit" | "Lean" | "Think" | "Work" | "Present" | "Rest" | "LookAt" | "Wave" | null;
  /** For LookAt / Think: world-space point to face (relative angle from agent forward) */
  lookTarget?: THREE.Vector3;
  /** Agent's current world position (for LookAt angle calculation) */
  agentPosition?: THREE.Vector3;
}

export function useProceduralGait(
  joints: React.MutableRefObject<any>,
  options: GaitOptions = {},
) {
  const { leanFactor: defaultLean = 0.08, bankFactor: defaultBank = 0.05 } = options;

  const walkTime = useRef(0);
  const smoothSpeed = useRef(0);
  const idleOffset = useRef(-1);
  // Extra state transition smoothing
  const seatBlend = useRef(0);   // 0 = standing, 1 = fully seated
  const leanBlend = useRef(0);
  const thinkBlend = useRef(0);
  const workBlend = useRef(0);
  const presentBlend = useRef(0);
  const restBlend = useRef(0);

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

      // ── Speed smoothing ──────────────────────────────────────────────────
      const rawSpeed = velocity.length();
      // Faster lerp (0.2) = snappier start/stop response without feeling jittery
      smoothSpeed.current = THREE.MathUtils.lerp(smoothSpeed.current, rawSpeed, 0.2);
      const animSpeed = smoothSpeed.current;

      const dynamicStride = Math.max(0.8, rawSpeed * 0.35);
      const stride = customOptions.strideLength ?? dynamicStride;
      const lean = customOptions.leanFactor ?? defaultLean;
      const bank = customOptions.bankFactor ?? defaultBank;

      const distTraveled = animSpeed * delta;
      walkTime.current += (distTraveled / stride) * Math.PI * 2;

      // ── Head tracking (anticipatory) ─────────────────────────────────────
      if (customOptions.targetDirection && customOptions.targetDirection.lengthSq() > 0.01) {
        const targetAngle = Math.atan2(customOptions.targetDirection.x, customOptions.targetDirection.z);
        if (j.neck && j.head) {
          j.neck.rotation.y = THREE.MathUtils.lerp(j.neck.rotation.y, targetAngle * 0.3, 0.05);
          j.head.rotation.y = THREE.MathUtils.lerp(j.head.rotation.y, targetAngle * 0.5, 0.08);
        }
      } else {
        if (j.neck && j.head) {
          j.neck.rotation.y = THREE.MathUtils.lerp(j.neck.rotation.y, 0, 0.05);
          j.head.rotation.y = THREE.MathUtils.lerp(j.head.rotation.y, 0, 0.08);
        }
      }

      // ── Extra state override ─────────────────────────────────────────────
      const extra = customOptions.extraState ?? null;

      if (extra === "Sit" || extra === "Rest") {
        seatBlend.current = THREE.MathUtils.lerp(seatBlend.current, 1.0, delta * 2.5);
      } else {
        seatBlend.current = THREE.MathUtils.lerp(seatBlend.current, 0.0, delta * 3.0);
      }
      if (extra === "Lean") {
        leanBlend.current = THREE.MathUtils.lerp(leanBlend.current, 1.0, delta * 2.0);
      } else {
        leanBlend.current = THREE.MathUtils.lerp(leanBlend.current, 0.0, delta * 2.5);
      }
      if (extra === "Think" || extra === "LookAt") {
        thinkBlend.current = THREE.MathUtils.lerp(thinkBlend.current, 1.0, delta * 2.0);
      } else {
        thinkBlend.current = THREE.MathUtils.lerp(thinkBlend.current, 0.0, delta * 2.0);
      }
      if (extra === "Work") {
        workBlend.current = THREE.MathUtils.lerp(workBlend.current, 1.0, delta * 2.5);
      } else {
        workBlend.current = THREE.MathUtils.lerp(workBlend.current, 0.0, delta * 2.0);
      }
      if (extra === "Present") {
        presentBlend.current = THREE.MathUtils.lerp(presentBlend.current, 1.0, delta * 2.0);
      } else {
        presentBlend.current = THREE.MathUtils.lerp(presentBlend.current, 0.0, delta * 2.5);
      }

      const sb = seatBlend.current;
      const lb = leanBlend.current;
      const tb = thinkBlend.current;
      const wb = workBlend.current;
      const pb = presentBlend.current;
      const standingBlend = 1 - Math.max(sb, lb, wb, pb);

      // ── Wave state ───────────────────────────────────────────────────────
      if (extra === "Wave") {
        const tWave = performance.now() / 1000;
        if (j.rightArm) {
          j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
            j.rightArm.shoulder.rotation.x, -0.8, 0.15,
          );
          j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(
            j.rightArm.shoulder.rotation.z, -0.6, 0.12,
          );
          j.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(
            j.rightArm.elbow.rotation.x,
            -0.3 + Math.sin(tWave * 4.0) * 0.35,
            0.18,
          );
        }
        if (j.torso) {
          j.torso.rotation.z = THREE.MathUtils.lerp(j.torso.rotation.z, 0.05, 0.08);
        }
        return;
      }

      // ── SEATED / REST ────────────────────────────────────────────────────
      if (sb > 0.01) {
        const tSit = performance.now() / 1000;
        const breathe = Math.sin(tSit * 0.8 + idleOffset.current) * 0.008;

        // Hips lower
        if (j.hips) {
          j.hips.position.y = THREE.MathUtils.lerp(j.hips.position.y, -sb * 0.55, delta * 2);
          j.hips.position.x = THREE.MathUtils.lerp(j.hips.position.x, 0, 0.1);
        }
        // Knees bent 90°
        if (j.leftKnee) {
          j.leftKnee.rotation.x = THREE.MathUtils.lerp(
            j.leftKnee.rotation.x, sb * 1.4 + breathe, delta * 2,
          );
        }
        if (j.rightKnee) {
          j.rightKnee.rotation.x = THREE.MathUtils.lerp(
            j.rightKnee.rotation.x, sb * 1.4 + breathe, delta * 2,
          );
        }
        // Hips angle to sit
        if (j.leftHip) {
          j.leftHip.rotation.x = THREE.MathUtils.lerp(j.leftHip.rotation.x, sb * -1.2, delta * 2);
        }
        if (j.rightHip) {
          j.rightHip.rotation.x = THREE.MathUtils.lerp(j.rightHip.rotation.x, sb * -1.2, delta * 2);
        }
        // Arms resting on lap
        if (j.leftArm) {
          j.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(
            j.leftArm.shoulder.rotation.x, sb * 0.6 + breathe * 0.5, delta * 2,
          );
          j.leftArm.elbow.rotation.x = THREE.MathUtils.lerp(
            j.leftArm.elbow.rotation.x, sb * 0.5, delta * 2,
          );
        }
        if (j.rightArm) {
          j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
            j.rightArm.shoulder.rotation.x, sb * 0.6 + breathe * 0.5, delta * 2,
          );
          j.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(
            j.rightArm.elbow.rotation.x, sb * 0.5, delta * 2,
          );
        }
        // Torso slight recline
        if (j.torso) {
          j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, sb * -0.08, delta * 2);
          j.torso.position.y = THREE.MathUtils.lerp(j.torso.position.y, 0.1 + breathe, 0.1);
        }
        if (sb > 0.95) return; // Fully seated — skip other updates
      }

      // ── LEAN ─────────────────────────────────────────────────────────────
      if (lb > 0.01) {
        const tLean = performance.now() / 1000;
        if (j.torso) {
          j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, lb * 0.3, delta * 2);
          j.torso.rotation.z = THREE.MathUtils.lerp(j.torso.rotation.z, lb * -0.12, delta * 2);
        }
        if (j.leftArm) {
          j.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(
            j.leftArm.shoulder.rotation.x, lb * -0.3, delta * 2,
          );
          j.leftArm.shoulder.rotation.z = THREE.MathUtils.lerp(
            j.leftArm.shoulder.rotation.z, lb * -0.4, delta * 2,
          );
          j.leftArm.elbow.rotation.x = THREE.MathUtils.lerp(
            j.leftArm.elbow.rotation.x, lb * -0.3, delta * 2,
          );
        }
        if (j.hips) {
          j.hips.position.x = THREE.MathUtils.lerp(j.hips.position.x, lb * 0.12, 0.08);
        }
      }

      // ── THINK / LOOK_AT ──────────────────────────────────────────────────
      if (tb > 0.01) {
        const tThink = performance.now() / 1000;
        // Hand to chin
        if (j.rightArm) {
          j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
            j.rightArm.shoulder.rotation.x, tb * -0.55, delta * 2,
          );
          j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(
            j.rightArm.shoulder.rotation.z, tb * -0.2, delta * 2,
          );
          j.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(
            j.rightArm.elbow.rotation.x, tb * -0.7, delta * 2,
          );
        }
        // Head slight tilt
        if (j.head) {
          j.head.rotation.z = THREE.MathUtils.lerp(
            j.head.rotation.z, tb * 0.08 + Math.sin(tThink * 0.4) * 0.03, delta * 1.5,
          );
        }
        // If LookAt: gentle head turn
        if (extra === "LookAt" && customOptions.lookTarget && customOptions.agentPosition) {
          const toTarget = customOptions.lookTarget.clone().sub(customOptions.agentPosition);
          const lookAngle = Math.atan2(toTarget.x, toTarget.z);
          if (j.neck) {
            j.neck.rotation.y = THREE.MathUtils.lerp(j.neck.rotation.y, lookAngle * 0.4, 0.06);
          }
          if (j.head) {
            j.head.rotation.y = THREE.MathUtils.lerp(j.head.rotation.y, lookAngle * 0.6, 0.08);
          }
        }
      }

      // ── WORK ─────────────────────────────────────────────────────────────
      if (wb > 0.01) {
        const tWork = performance.now() / 1000;
        const workCycle = Math.sin(tWork * 2.0) * wb * 0.25;
        // Arms move at desk height
        if (j.leftArm) {
          j.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(
            j.leftArm.shoulder.rotation.x, wb * -0.4 + workCycle, delta * 2,
          );
          j.leftArm.elbow.rotation.x = THREE.MathUtils.lerp(
            j.leftArm.elbow.rotation.x, wb * -0.5, delta * 2,
          );
        }
        if (j.rightArm) {
          j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
            j.rightArm.shoulder.rotation.x, wb * -0.4 - workCycle, delta * 2,
          );
          j.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(
            j.rightArm.elbow.rotation.x, wb * -0.5, delta * 2,
          );
        }
        if (j.torso) {
          j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, wb * 0.15, delta * 2);
        }
      }

      // ── PRESENT ──────────────────────────────────────────────────────────
      if (pb > 0.01) {
        const tPresent = performance.now() / 1000;
        // Standing upright, left arm at side, right arm gestures
        if (j.rightArm) {
          const gestureSwing = Math.sin(tPresent * 1.5) * 0.3 * pb;
          j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
            j.rightArm.shoulder.rotation.x, -0.3 + gestureSwing, delta * 1.8,
          );
          j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(
            j.rightArm.shoulder.rotation.z, -0.2 + gestureSwing * 0.5, delta * 1.8,
          );
          j.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(
            j.rightArm.elbow.rotation.x, -0.3 + gestureSwing * 0.3, delta * 1.8,
          );
        }
        if (j.torso) {
          j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, pb * 0.05, delta * 2);
        }
      }

      // ── Skip movement blending if strongly in pose state ────────────────
      if (sb > 0.85 || (lb > 0.85 && standingBlend < 0.2)) return;

      // ── Standard Idle / Walk ─────────────────────────────────────────────
      if (animSpeed < 0.1) {
        // IDLE
        const tIdle = performance.now() / 1000 + idleOffset.current;
        const breathe = Math.sin(tIdle * 1.5) * 0.015 + Math.sin(tIdle * 0.5) * 0.005;

        j.torso.position.y = THREE.MathUtils.lerp(j.torso.position.y, breathe + 0.1, 0.1);

        const weightShift = Math.sin(tIdle * 0.4) * Math.sin(tIdle * 0.27) * 0.06;
        j.hips.position.x = THREE.MathUtils.lerp(j.hips.position.x, weightShift, 0.05);
        j.torso.rotation.z = THREE.MathUtils.lerp(j.torso.rotation.z, -weightShift * 0.2, 0.05);

        j.leftKnee.rotation.x = THREE.MathUtils.lerp(
          j.leftKnee.rotation.x, weightShift > 0 ? 0.05 : 0, 0.05,
        );
        j.rightKnee.rotation.x = THREE.MathUtils.lerp(
          j.rightKnee.rotation.x, weightShift < 0 ? 0.05 : 0, 0.05,
        );

        const f = 0.05;
        j.leftHip.rotation.x = THREE.MathUtils.lerp(j.leftHip.rotation.x, 0, f);
        j.rightHip.rotation.x = THREE.MathUtils.lerp(j.rightHip.rotation.x, 0, f);

        const shoulderBreath = breathe * 0.25;
        j.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(
          j.leftArm.shoulder.rotation.x, 0.05 + shoulderBreath, f,
        );
        j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
          j.rightArm.shoulder.rotation.x, 0.05 + shoulderBreath, f,
        );
        j.leftArm.elbow.rotation.x = THREE.MathUtils.lerp(j.leftArm.elbow.rotation.x, -0.05, f);
        j.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(j.rightArm.elbow.rotation.x, -0.05, f);

        j.torso.rotation.y = THREE.MathUtils.lerp(j.torso.rotation.y, 0, f);
        j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, 0, f);
        j.hips.rotation.y = THREE.MathUtils.lerp(j.hips.rotation.y, 0, f);
      } else {
        // WALK / RUN
        // speedFactor: 0 at rest → 1.0 at walk (4.5) → ~1.7 at run (9.5)
        // Clamped for legs/knees so run doesn't over-extend, but armAmp allowed higher
        const rawFactor = animSpeed / 5.0;  // reference: natural walk speed
        const speedFactor = Math.min(rawFactor, 1.6);  // unclamped to distinguish walk vs run
        const legFactor  = Math.min(rawFactor, 1.0);   // leg swing saturates at run threshold
        const kneeFactor = Math.min(rawFactor, 1.15);  // slight extra knee lift when running

        // Minimum amplitude only kicks in above a tiny movement speed — avoids phantom swing
        const minAmp = 0.08;
        const legAmp  = minAmp + legFactor  * 0.52;  // max ~0.60 rad at full walk
        const kneeAmp = minAmp + kneeFactor * 0.60;  // max ~0.77 rad — pronounced bend
        const armAmp  = minAmp + speedFactor * 0.48; // continues scaling into run

        // ── Hips — lateral weight-shift (left/right) ────────────────────────
        // Half-cycle shift: hip shifts toward the planted foot
        const hipShift = Math.sin(walkTime.current) * 0.08 * legFactor;
        j.hips.position.x = THREE.MathUtils.lerp(j.hips.position.x, hipShift, 0.12);

        // ── Legs ────────────────────────────────────────────────────────────
        j.leftHip.rotation.x  = Math.sin(walkTime.current)            * legAmp;
        j.rightHip.rotation.x = Math.sin(walkTime.current + Math.PI)  * legAmp;

        // Knee bends only on the swing (backward) phase — natural gait
        const leftKneePhase  = Math.sin(walkTime.current - Math.PI * 0.45);
        const rightKneePhase = Math.sin(walkTime.current + Math.PI * 0.55);
        j.leftKnee.rotation.x  = Math.max(0, leftKneePhase  * kneeAmp);
        j.rightKnee.rotation.x = Math.max(0, rightKneePhase * kneeAmp);

        // ── Arms — counter-swing opposite to legs ────────────────────────────
        const targetLeftShoulder  = Math.sin(walkTime.current + Math.PI) * armAmp - 0.08;
        const targetRightShoulder = Math.sin(walkTime.current)           * armAmp - 0.08;
        j.leftArm.shoulder.rotation.x  = THREE.MathUtils.lerp(j.leftArm.shoulder.rotation.x,  targetLeftShoulder,  0.18);
        j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.x, targetRightShoulder, 0.18);

        // Elbow naturally bends more on backswing — gives arm that pumping motion
        const leftBackswing  = Math.max(0, Math.sin(walkTime.current + Math.PI));
        const rightBackswing = Math.max(0, Math.sin(walkTime.current));
        const elbowBaseWalk  = -0.25 - speedFactor * 0.12; // elbows tuck more when running
        const leftElbowBend  = elbowBaseWalk - leftBackswing  * (0.4 + speedFactor * 0.2);
        const rightElbowBend = elbowBaseWalk - rightBackswing * (0.4 + speedFactor * 0.2);
        j.leftArm.elbow.rotation.x  = THREE.MathUtils.lerp(j.leftArm.elbow.rotation.x,  leftElbowBend,  0.18);
        j.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(j.rightArm.elbow.rotation.x, rightElbowBend, 0.18);

        // Slight outward arm splay reduces at higher speed (arms come in when running)
        const armOutSplay = 0.18 - speedFactor * 0.06;
        j.leftArm.shoulder.rotation.z  = THREE.MathUtils.lerp(j.leftArm.shoulder.rotation.z,   armOutSplay, 0.1);
        j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.z,  -armOutSplay, 0.1);

        // ── Torso bounce — double-step pattern (two bobs per full stride) ────
        // abs(sin) produces two peaks per cycle — matches real human vertical oscillation
        const bounceIntensity = 0.04 + speedFactor * 0.025; // more bounce when running
        const bounce = Math.abs(Math.sin(walkTime.current)) * bounceIntensity;
        j.torso.position.y = THREE.MathUtils.lerp(j.torso.position.y, bounce + 0.05, 0.25);

        // ── Shoulder counter-rotation (trunk rotation) ────────────────────────
        const shoulderTwist = Math.sin(walkTime.current) * (0.10 + speedFactor * 0.06);
        j.torso.rotation.y = THREE.MathUtils.lerp(j.torso.rotation.y, -shoulderTwist, 0.12);

        // ── Hip counter-rotation (opposite to shoulders) ─────────────────────
        j.hips.rotation.y = THREE.MathUtils.lerp(j.hips.rotation.y, shoulderTwist * 1.2, 0.12);

        // ── Forward lean — increases with speed ───────────────────────────────
        const forwardLean = Math.min(animSpeed * lean, 0.30);
        j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, forwardLean, 0.10);

        // ── Lateral sway ─────────────────────────────────────────────────────
        const walkSway = Math.sin(walkTime.current) * bank * legFactor;
        j.torso.rotation.z = THREE.MathUtils.lerp(j.torso.rotation.z, walkSway, 0.10);
      }
    },
    [joints, defaultLean, defaultBank],
  );

  return { update, walkTime, smoothSpeed };
}
