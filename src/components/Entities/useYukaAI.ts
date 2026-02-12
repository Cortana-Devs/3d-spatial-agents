// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import * as YUKA from "yuka";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import AIManager from "../Systems/AIManager";
import { useGameStore } from "@/store/gameStore";
import { ClientBrain } from "../Systems/ClientBrain";
import { NearbyEntity } from "@/app/actions";
import { InteractableRegistry } from "../Systems/InteractableRegistry";
import NavigationNetwork from "../Systems/NavigationNetwork";

export function useYukaAI(
  id: string,
  groupRef: React.RefObject<THREE.Group | null>,
  playerRef: React.RefObject<THREE.Group | null>,
  joints: React.MutableRefObject<any>,
) {
  const vehicleRef = useRef<YUKA.Vehicle | null>(null);
  const aiManager = AIManager.getInstance();
  const obstacles = useGameStore((state) => state.obstacles);
  const collidableMeshes = useGameStore((state) => state.collidableMeshes);
  const isMenuOpen = useGameStore((state) => state.isMenuOpen);
  const isMenuPanelOpen = useGameStore((state) => state.isMenuPanelOpen);

  // Remote Logic: Inspection
  const inspectedAgentId = useGameStore((state) => state.inspectedAgentId);
  const setInspectedAgentData = useGameStore((state) => state.setInspectedAgentData);
  const followingAgentId = useGameStore((state) => state.followingAgentId);
  const setAgentPosition = useGameStore((state) => state.setAgentPosition);

  // Animation State
  const walkTime = useRef(0);
  const greetingState = useRef<"NONE" | "LOOKING" | "WAVING" | "DONE">("NONE");
  const greetingTimer = useRef(0);
  const smoothSpeed = useRef(0); // For animation lerping

  // Social State (Robot-Robot Interaction)
  const socialState = useRef<"NONE" | "CHATTING" | "COOLDOWN">("NONE");
  const socialTimer = useRef(0);
  const socialTarget = useRef<YUKA.Vehicle | null>(null);

  // Optimization Refs
  const raycasterRef = useRef(new THREE.Raycaster());
  const rayOriginRef = useRef(new THREE.Vector3());
  const rayDirRef = useRef(new THREE.Vector3(0, -1, 0));
  const frameRef = useRef(0);
  const lookAheadRef = useRef(new THREE.Vector3());
  const sensorPosRef = useRef(new THREE.Vector3());
  const safetyTargetRef = useRef(new THREE.Vector3(0, 0, -330));

  const toSafetyRef = useRef(new THREE.Vector3());

  // AI Brain
  const brainRef = useRef(new ClientBrain(id));
  // Randomize update interval to prevent API spikes (300-400 frames ~ 5-7s)
  const brainIntervalRef = useRef(300 + Math.floor(Math.random() * 100));

  // --- ANIMATION STATE ---
  const [animationState, setAnimationState] = useState<"Idle" | "Walk" | "Run" | "Wave">("Idle");

  useEffect(() => {
    if (!groupRef.current) return;

    // Create Yuka Vehicle
    const vehicle = new YUKA.Vehicle();
    (vehicle as any).id = id;
    vehicle.maxSpeed = 5.5; // Natural Brisk Walk (was 12.0)
    vehicle.maxForce = 4.0; // Heavy Inertia for smooth turns (was 10.0)
    vehicle.mass = 2.0;
    vehicle.boundingRadius = 2.0; // Ensure they have size for separation

    // Sync initial position
    vehicle.position.copy(groupRef.current.position as unknown as YUKA.Vector3);
    vehicle.rotation.copy(
      groupRef.current.quaternion as unknown as YUKA.Quaternion,
    );

    // Render Component (Sync Yuka -> Three)
    vehicle.setRenderComponent(groupRef.current, (entity, renderComponent) => {
      const mesh = renderComponent as THREE.Group;
      mesh.position.copy(entity.position as unknown as THREE.Vector3);
      mesh.quaternion.copy(entity.rotation as unknown as THREE.Quaternion);
    });

    // --- BEHAVIORS ---

    // 1. Obstacle Avoidance
    const yukaObstacles: YUKA.GameEntity[] = [];
    obstacles.forEach((ob) => {
      const ent = new YUKA.GameEntity();
      ent.position.copy(ob.position as unknown as YUKA.Vector3);
      ent.boundingRadius = ob.radius;
      yukaObstacles.push(ent);
    });
    const obstacleAvoidance = new YUKA.ObstacleAvoidanceBehavior(yukaObstacles);
    obstacleAvoidance.weight = 5.0;
    vehicle.steering.add(obstacleAvoidance); // Index 0

    // 2. Follow Path (Primary Movement)
    const followPath = new YUKA.FollowPathBehavior();
    followPath.active = false;
    followPath.nextWaypointDistance = 2.0;
    vehicle.steering.add(followPath); // Index 1

    // 3. Seek (Legacy / Short distance)
    const seek = new YUKA.SeekBehavior(new YUKA.Vector3());
    seek.active = false;
    vehicle.steering.add(seek); // Index 2

    // 4. Arrive (Final stopping)
    const arrive = new YUKA.ArriveBehavior(new YUKA.Vector3());
    arrive.active = false;
    arrive.deceleration = 1.5;
    arrive.tolerance = 0.5;
    vehicle.steering.add(arrive); // Index 3

    // 5. Wander (Idle)
    const wander = new YUKA.WanderBehavior();
    wander.weight = 0.5;
    vehicle.steering.add(wander); // Index 4

    // 6. Separation
    const separation = new YUKA.SeparationBehavior(aiManager.vehicles);
    separation.weight = 5.0;
    vehicle.steering.add(separation); // Index 5

    vehicleRef.current = vehicle;
    aiManager.addEntity(vehicle);

    return () => {
      aiManager.removeEntity(vehicle);
    };
  }, [obstacles]);

  useFrame((state, delta) => {
    // Remote Logic: Update inspected agent data
    if (id === inspectedAgentId) {
      setInspectedAgentData({
        id,
        thought: brainRef.current.state.thought,
        state: animationState,
      });
    }

    if (isMenuOpen || isMenuPanelOpen) return;
    const vehicle = vehicleRef.current;
    if (!vehicle) return;

    // --- FOLLOW PLAYER LOGIC ---
    if (followingAgentId === id && playerRef.current) {
      // Switch to Follow Mode
      if (!vehicle.steering.behaviors[3].active) {
        // Disable Wander
        vehicle.steering.behaviors[4].active = false;
        // Enable Arrive (Index 3)
        vehicle.steering.behaviors[3].active = true;
        // Target Player
        const arriveBehavior = vehicle.steering.behaviors[3] as YUKA.ArriveBehavior;
        arriveBehavior.target = playerRef.current.position as unknown as YUKA.Vector3;
        arriveBehavior.deceleration = 1.5; // Smooth stop
        arriveBehavior.tolerance = 2.0; // Stop 2m away
      }
    } else {
      // Default Mode
      if (vehicle.steering.behaviors[3].active) {
        // Disable Arrive
        vehicle.steering.behaviors[3].active = false;
        // Enable Wander
        vehicle.steering.behaviors[4].active = true;
      }
    }

    const dt = delta * 15; // Speed multiplier for simulation steps dt = Math.min(delta, 0.1);
    frameRef.current++;

    // --- WALL AVOIDANCE (Multi-Ray + Sliding) ---
    if (collidableMeshes.length > 0) {
      const speed = vehicle.velocity.length();
      if (speed > 0.1) {
        // Rays: Center, Left (30deg), Right (30deg)
        const forward = new THREE.Vector3().copy(vehicle.velocity as unknown as THREE.Vector3).normalize();
        const left = new THREE.Vector3().copy(forward).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6);
        const right = new THREE.Vector3().copy(forward).applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 6);

        const directions = [forward, left, right];
        const raycaster = raycasterRef.current;
        const rayOrigin = rayOriginRef.current;
        rayOrigin.set(vehicle.position.x, vehicle.position.y + 1.0, vehicle.position.z);

        // Check all feelers
        for (const dir of directions) {
          raycaster.set(rayOrigin, dir);
          raycaster.far = 3.0; // Increased range

          const hits = raycaster.intersectObjects(collidableMeshes, true);
          if (hits.length > 0) {
            const hit = hits[0];
            const dist = hit.distance;

            // Normal at hit point (approximate if not provided, but usually face.normal)
            // If it's a box mesh, face normal is good.
            let normal = new THREE.Vector3();
            if (hit.face) {
              normal.copy(hit.face.normal).transformDirection(hit.object.matrixWorld).normalize();
            } else {
              // Fallback: vector from hit to agent
              normal.subVectors(vehicle.position as unknown as THREE.Vector3, hit.point).normalize();
              normal.y = 0;
            }

            // 1. Repulsion force (Soft)
            const pushStrength = (3.0 - dist) * 40.0;
            vehicle.velocity.x += normal.x * pushStrength * dt;
            vehicle.velocity.z += normal.z * pushStrength * dt;

            // 2. Hard Velocity Slide (If very close)
            // Project velocity onto the wall plane to slide
            if (dist < 1.5) {
              const vel = vehicle.velocity as unknown as THREE.Vector3;
              // v_new = v - (v . n) * n
              const dot = vel.dot(normal);
              if (dot < 0) { // Only if moving INTO the wall
                vel.x -= normal.x * dot;
                vel.z -= normal.z * dot;
                // Friction
                vel.multiplyScalar(0.9);
              }
            }

            // 3. Hard Position Clamp (If clipping)
            if (dist < 0.8) {
              const pushOut = normal.multiplyScalar(0.8 - dist);
              vehicle.position.x += pushOut.x;
              vehicle.position.z += pushOut.z;
            }
          }
        }
        raycaster.far = Infinity;
      }
    }

    // --- PHYSICS CONSTRAINT ---
    vehicle.velocity.y = 0; // Lock Y velocity to prevent pitching

    // --- HARD COLLISION (Robot vs Robot) ---
    const vehicles = aiManager.vehicles;
    const myPos = vehicle.position;
    const minSeparation = 2.5;

    for (const other of vehicles) {
      if (other !== vehicle) {
        const distSq = myPos.squaredDistanceTo(other.position);

        if (distSq < minSeparation * minSeparation) {
          const dist = Math.sqrt(distSq);
          const overlap = minSeparation - dist;
          let pushX = 0, pushZ = 0;

          if (dist > 0.001) {
            const dx = (myPos.x - other.position.x) / dist;
            const dz = (myPos.z - other.position.z) / dist;
            pushX = dx * overlap * 0.5;
            pushZ = dz * overlap * 0.5;
          } else {
            pushX = (Math.random() - 0.5) * 0.1;
            pushZ = (Math.random() - 0.5) * 0.1;
          }

          vehicle.position.x += pushX;
          vehicle.position.z += pushZ;
          vehicle.velocity.x *= 0.9;
          vehicle.velocity.z *= 0.9;
        }

        // Social Interaction
        if (
          distSq < 25.0 &&
          socialState.current === "NONE" &&
          greetingState.current === "NONE"
        ) {
          if (Math.random() < 0.01) {
            socialState.current = "CHATTING";
            socialTarget.current = other;
            socialTimer.current = 0;
          }
        }
      }
    }

    // --- PHYSICS (Gravity / Ground Detection) ---
    if (collidableMeshes.length > 0 && frameRef.current % 2 === 0) {
      const raycaster = raycasterRef.current;
      const rayOrigin = rayOriginRef.current;

      rayOrigin.set(
        vehicle.position.x,
        vehicle.position.y + 5.0,
        vehicle.position.z,
      );
      raycaster.set(rayOrigin, rayDirRef.current);

      const hits = raycaster.intersectObjects(collidableMeshes, true);
      let groundHeight = -100;
      let foundGround = false;

      if (hits.length > 0) {
        // Filter out ceilings
        const validHits = hits.filter(h => !h.object.name.includes("Ceiling"));
        for (const hit of validHits) {
          if (hit.point.y < rayOrigin.y) {
            groundHeight = Math.max(groundHeight, hit.point.y);
            foundGround = true;
          }
        }
      }

      if (foundGround) {
        if (groundHeight > -1.5) {
          vehicle.position.y = THREE.MathUtils.lerp(
            vehicle.position.y,
            groundHeight,
            0.5,
          );
        } else {
          // Deep Water (Sink)
          vehicle.position.y -= 5.0 * dt * 2;
        }
      } else {
        // Void Check - if we are HIGH up, fall fast. If close to 0, maybe we just missed a raycast?
        // Fall logic
        vehicle.position.y -= 10.0 * dt;
      }
    }

    // --- BRAIN UPDATE ---
    const brain = brainRef.current;
    if (frameRef.current % brainIntervalRef.current === 0) {
      // SKIP BRAIN IF FOLLOWING (Manual Override)
      if (followingAgentId === id) return;

      let currentBehavior = "IDLE";
      if (vehicle.steering.behaviors[2].active) currentBehavior = "SEEKING";
      else if (vehicle.steering.behaviors[1].active) currentBehavior = "WANDERING";

      const nearbyEntities: NearbyEntity[] = [];

      // Perception Logic (Condensed for brevity - same as before)
      if (playerRef.current) {
        const d = vehicle.position.distanceTo(playerRef.current.position as unknown as YUKA.Vector3);
        if (d < 30) nearbyEntities.push({ type: "PLAYER", id: "player-01", distance: d, status: "Active" });
      }

      // Update Brain
      brain.update(vehicle.position as unknown as THREE.Vector3, nearbyEntities, currentBehavior).then(decision => {
        if (decision) {
          const bFollowPath = vehicle.steering.behaviors[1] as YUKA.FollowPathBehavior;
          const bSeek = vehicle.steering.behaviors[2] as YUKA.SeekBehavior; // Keep legacy seek for short dist
          const bArrive = vehicle.steering.behaviors[3] as YUKA.ArriveBehavior;
          const bWander = vehicle.steering.behaviors[4] as YUKA.WanderBehavior;

          const resetBehaviors = () => {
            bFollowPath.active = false;
            bSeek.active = false;
            bArrive.active = false;
            bWander.active = false;
          }

          // Simple handling of MOVE_TO / FOLLOW for now to keep it robust
          if (decision.action === "MOVE_TO" && decision.target) {
            resetBehaviors();
            // Use Pathfinding
            const target = new THREE.Vector3(decision.target.x, decision.target.y, decision.target.z);
            const path = NavigationNetwork.getInstance().findPath(vehicle.position as unknown as THREE.Vector3, target);

            const yukaPath = new YUKA.Path();
            path.forEach(p => yukaPath.add(new YUKA.Vector3(p.x, p.y, p.z)));
            bFollowPath.path = yukaPath;
            bFollowPath.active = true;
          } else if (decision.action === "WANDER") {
            resetBehaviors();
            bWander.active = true;
          } else if (decision.action === "WAIT") {
            resetBehaviors();
            vehicle.velocity.multiplyScalar(0.5);
          }
        }
      });
    }

    // --- ANIMATION UPDATE (Procedural) ---
    const rawSpeed = vehicle.velocity.length();
    // Heavy smoothing for animation speed to remove jitter
    smoothSpeed.current = THREE.MathUtils.lerp(smoothSpeed.current, rawSpeed, 0.05);
    const animSpeed = smoothSpeed.current;

    let newState: "Idle" | "Walk" | "Run" | "Wave" = "Idle";

    if (greetingState.current === "WAVING") newState = "Wave";
    else if (animSpeed > 0.1) newState = "Walk";

    if (newState !== animationState) setAnimationState(newState);

    // --- GAIT SYNC (Distance Based) ---
    // Prevent Slipping: Walk cycle advances based on actual distance covered.
    // Stride Length approx 0.7m. 
    // Cycle is 0 to 2PI (one full stride L+R). 
    // So 2PI = 1.4m (approx).
    const strideLength = 1.4;
    const distTraveled = animSpeed * dt;
    walkTime.current += (distTraveled / strideLength) * Math.PI * 2;

    const j = joints.current;
    if (
      j.hips && j.torso && j.leftArm && j.rightArm &&
      j.leftHip && j.rightHip && j.leftKnee && j.rightKnee && j.neck
    ) {
      const lerpFactor = 0.1;

      // 1. Head Tracking (Player Aware)
      if (playerRef.current) {
        const toPlayer = new THREE.Vector3().subVectors(playerRef.current.position, vehicle.position);
        const distToPlayer = toPlayer.length();

        if (distToPlayer < 8.0) { // Look at player within 8m
          // Calculate local look dir
          // We need world quaternion of the agent?
          // Simplification: rotating the neck bone.
          // Neck rotation is local. 
          // We need the angle difference between agent forward and vector to player.

          const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(groupRef.current!.quaternion);
          toPlayer.normalize();

          // Dot product for angle?
          // Cross product for direction (left/right)?
          const dot = forward.dot(toPlayer);
          const cross = new THREE.Vector3().crossVectors(forward, toPlayer);

          // Clamp look angle (don't break neck)
          // If dot > 0 (in front), we can look.
          if (dot > 0.2) {
            const targetNeckY = cross.y * 1.5; // Scale for sensitivity
            const clampedNeckY = THREE.MathUtils.clamp(targetNeckY, -0.8, 0.8);
            j.neck.rotation.y = THREE.MathUtils.lerp(j.neck.rotation.y, clampedNeckY, 0.1);

            // Also slight head tilt
            j.neck.rotation.x = THREE.MathUtils.lerp(j.neck.rotation.x, -0.1, 0.1);
          } else {
            // Reset if behind
            j.neck.rotation.y = THREE.MathUtils.lerp(j.neck.rotation.y, 0, 0.05);
          }
        } else {
          // Idle Looking
          const t = state.clock.elapsedTime;
          j.neck.rotation.y = THREE.MathUtils.lerp(j.neck.rotation.y, Math.sin(t * 0.5) * 0.3, 0.05);
        }
      }

      // 2. Natural Posture & Sway (Refined)
      const t = state.clock.elapsedTime;
      const breathe = Math.sin(t * 1.5) * 0.02;
      const sway = Math.sin(t * 0.8) * 0.02;

      // 2. Leaning (Inertia & Speed)
      // Lean forward when moving fast
      const forwardLean = Math.min(animSpeed * 0.08, 0.3);
      j.torso.rotation.x = THREE.MathUtils.lerp(j.torso.rotation.x, forwardLean, 0.05);

      // 3. Banking (Turn Leaning)
      // Calculate turn rate (delta rotation Y)
      // Since we don't track prevRot easily here, use a lateral Sway based on walk cycle
      // Real banking requires tracking deltaRot, but simple sway helps realism.
      const walkSway = Math.sin(walkTime.current) * 0.05 * (animSpeed / 5.0);
      j.torso.rotation.z = THREE.MathUtils.lerp(j.torso.rotation.z, sway + walkSway, 0.05);

      if (greetingState.current === "WAVING") {
        const waveSpeed = 12;
        const wave = Math.sin(state.clock.elapsedTime * waveSpeed) * 0.4;
        j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.z, -2.5 + wave, 0.1);
        j.rightArm.elbow.rotation.z = THREE.MathUtils.lerp(j.rightArm.elbow.rotation.z, -0.8 + wave * 0.2, 0.1);

        // Reset others
        j.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(j.leftArm.shoulder.rotation.x, 0, lerpFactor);
      } else {
        // --- GAIT ENGINE ---
        if (animSpeed < 0.1) {
          // IDLE
          j.torso.position.y = breathe;
          // Neck is handled by Head Tracking block above

          // Reset limbs
          const f = 0.1;
          j.leftHip.rotation.x = THREE.MathUtils.lerp(j.leftHip.rotation.x, 0, f);
          j.rightHip.rotation.x = THREE.MathUtils.lerp(j.rightHip.rotation.x, 0, f);
          j.leftKnee.rotation.x = THREE.MathUtils.lerp(j.leftKnee.rotation.x, 0, f);
          j.rightKnee.rotation.x = THREE.MathUtils.lerp(j.rightKnee.rotation.x, 0, f);
          j.leftArm.shoulder.rotation.x = THREE.MathUtils.lerp(j.leftArm.shoulder.rotation.x, 0, f);
          j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(j.rightArm.shoulder.rotation.x, 0, f);
        } else {
          // MOVING (Walk Cycle)
          const legAmp = 0.6;
          const kneeAmp = 0.4;
          const armAmp = 0.7;

          // Hips (Main Drive)
          j.leftHip.rotation.x = Math.sin(walkTime.current) * legAmp;
          j.rightHip.rotation.x = Math.sin(walkTime.current + Math.PI) * legAmp;

          // Knees (Phase Delayed for natural lift)
          // Knee bends when leg swings forward (lift) AND when pushing off? 
          // Simple natural walk: Knee bends on return (swing phase).
          const leftKneePhase = Math.cos(walkTime.current);
          const rightKneePhase = Math.cos(walkTime.current + Math.PI);

          j.leftKnee.rotation.x = Math.max(0, leftKneePhase * kneeAmp + 0.1);
          j.rightKnee.rotation.x = Math.max(0, rightKneePhase * kneeAmp + 0.1);

          // Arms (Opposite to Legs, Phase Shifted slightly)
          j.leftArm.shoulder.rotation.x = Math.sin(walkTime.current + Math.PI - 0.2) * armAmp;
          j.rightArm.shoulder.rotation.x = Math.sin(walkTime.current - 0.2) * armAmp;

          // Elbows (Dynamic Bend)
          j.leftArm.elbow.rotation.x = -0.5 - Math.max(0, Math.sin(walkTime.current + Math.PI)) * 0.5;
          j.rightArm.elbow.rotation.x = -0.5 - Math.max(0, Math.sin(walkTime.current)) * 0.5;

          // Vertical Bounce (Double Frequency)
          const bounce = Math.abs(Math.sin(walkTime.current)) * 0.08;
          j.torso.position.y = bounce + 0.1;
        }
      }
    }

    // Update Minimap Position
    setAgentPosition(id, new THREE.Vector3(vehicle.position.x, vehicle.position.y, vehicle.position.z));
  });



  return { vehicle: vehicleRef.current, brain: brainRef.current, animationState };
}
