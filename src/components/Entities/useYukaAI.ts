// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import * as YUKA from "yuka";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import AIManager from "../Systems/AIManager";
import { useGameStore } from "@/store/gameStore";
import { useProceduralGait } from "./useProceduralGait";

import { ClientBrain } from "../Systems/ClientBrain";
import type { NearbyEntity } from "@/lib/agent-core";
import { InteractableRegistry } from "../Systems/InteractableRegistry";
import NavigationNetwork from "../Systems/NavigationNetwork";
import { AgentTaskRegistry } from "../Systems/AgentTaskQueue";
import type { SteeringCommand } from "../Systems/AgentTaskQueue";

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
  const setInspectedAgentData = useGameStore(
    (state) => state.setInspectedAgentData,
  );
  const followingAgentId = useGameStore((state) => state.followingAgentId);
  const setAgentPosition = useGameStore((state) => state.setAgentPosition);

  // Social State (Robot-Robot Interaction)

  const socialState = useRef<"NONE" | "CHATTING" | "COOLDOWN">("NONE");
  const socialTimer = useRef(0);
  const socialTarget = useRef<YUKA.Vehicle | null>(null);
  const greetingState = useRef<"NONE" | "WAVING" | "COOLDOWN">("NONE");

  // Optimization Refs
  const raycasterRef = useRef(new THREE.Raycaster());
  const rayOriginRef = useRef(new THREE.Vector3());
  const rayDirRef = useRef(new THREE.Vector3(0, -1, 0));
  const frameRef = useRef(0);
  const lookAheadRef = useRef(new THREE.Vector3());
  const sensorPosRef = useRef(new THREE.Vector3());
  const safetyTargetRef = useRef(new THREE.Vector3(0, 0, -330));

  const toSafetyRef = useRef(new THREE.Vector3());

  // Animation smoothing
  const {
    update: updateGait,
    walkTime,
    smoothSpeed,
  } = useProceduralGait(joints, {
    leanFactor: 0.08,
    bankFactor: 0.05,
  });

  // AI Brain
  const brainRef = useRef(new ClientBrain(id));
  // Randomize update interval to prevent API spikes (300-400 frames ~ 5-7s)
  const brainIntervalRef = useRef(300 + Math.floor(Math.random() * 100));

  // --- TASK QUEUE (Manual Task Assignment) ---
  const taskQueueRef = useRef(AgentTaskRegistry.getInstance().getOrCreate(id));

  // --- ANIMATION STATE ---
  const [animationState, setAnimationState] = useState<
    "Idle" | "Walk" | "Run" | "Wave"
  >("Idle");

  useEffect(() => {
    if (!groupRef.current) return;

    // Create Yuka Vehicle
    const vehicle = new YUKA.Vehicle();
    (vehicle as any).id = id;
    vehicle.maxSpeed = 5.5; // Adjusted higher as per user request
    vehicle.maxForce = 4.0; // Heavy Inertia for smooth turns (was 10.0)
    vehicle.mass = 2.0;
    vehicle.boundingRadius = 1.0; // TUNED: 1.0 fits the robot footprint perfectly (was 2.0)

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

    // --- Rebuild navigation grid whenever obstacles change ---
    NavigationNetwork.getInstance().rebuildGrid(obstacles);

    // Fix #5/#8: Removed YUKA ObstacleAvoidanceBehavior — wall avoidance is
    // handled exclusively by the raycaster-based system below. Having both
    // caused double-counted avoidance forces that overpowered path-following.

    // 0. Follow Path (Primary Movement)
    const followPath = new YUKA.FollowPathBehavior();
    followPath.active = false;
    // Fix #13: Increased from 0.8 to 2.0 (matches cell size) so deflected
    // agents don't loop back trying to reach a skipped waypoint.
    followPath.nextWaypointDistance = 2.0;
    vehicle.steering.add(followPath); // Index 0

    // 1. Seek (Legacy / Short distance)
    const seek = new YUKA.SeekBehavior(new YUKA.Vector3());
    seek.active = false;
    vehicle.steering.add(seek); // Index 1

    // 2. Arrive (Final stopping)
    const arrive = new YUKA.ArriveBehavior(new YUKA.Vector3());
    arrive.active = false;
    // Fix #6: Higher deceleration so agent gets closer before stopping
    arrive.deceleration = 5.0;
    arrive.tolerance = 0.3;
    vehicle.steering.add(arrive); // Index 2

    // 3. Wander (Idle)
    const wander = new YUKA.WanderBehavior();
    wander.weight = 0.5;
    vehicle.steering.add(wander); // Index 3

    // 4. Separation
    const separation = new YUKA.SeparationBehavior(aiManager.vehicles);
    separation.weight = 5.0;
    vehicle.steering.add(separation); // Index 4

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

    const dt = delta * 15; // Speed multiplier for simulation steps
    frameRef.current++;

    // --- MANUAL TASK QUEUE UPDATE ---
    const taskQueue = taskQueueRef.current;
    const vehiclePos = new THREE.Vector3(
      vehicle.position.x,
      vehicle.position.y,
      vehicle.position.z,
    );

    // Get player position if available
    let playerPos: THREE.Vector3 | undefined;
    if (playerRef.current) {
      playerPos = playerRef.current.position;
    }

    const steeringCmd: SteeringCommand = taskQueue.update(
      delta,
      vehiclePos,
      playerPos,
    );
    const hasManualTask = taskQueue.isActive();

    // Fix #27: Always disable wander when a manual task is active
    // Fix #5/#8: Updated indices after removing ObstacleAvoidanceBehavior
    const bFollowPath = vehicle.steering
      .behaviors[0] as YUKA.FollowPathBehavior;
    const bSeek = vehicle.steering.behaviors[1] as YUKA.SeekBehavior;
    const bArrive = vehicle.steering.behaviors[2] as YUKA.ArriveBehavior;
    const bWander = vehicle.steering.behaviors[3] as YUKA.WanderBehavior;
    if (hasManualTask && bWander.active) {
      bWander.active = false;
    }

    // Apply steering command from task queue
    if (steeringCmd.type !== "NONE") {
      const resetBehaviors = () => {
        bFollowPath.active = false;
        bSeek.active = false;
        bArrive.active = false;
        bWander.active = false;
      };

      if (steeringCmd.type === "FOLLOW_PATH" && steeringCmd.path) {
        resetBehaviors();
        const yukaPath = new YUKA.Path();
        steeringCmd.path.forEach((p) =>
          yukaPath.add(new YUKA.Vector3(p.x, p.y, p.z)),
        );
        bFollowPath.path = yukaPath;
        bFollowPath.active = true;
      } else if (steeringCmd.type === "ARRIVE" && steeringCmd.target) {
        resetBehaviors();
        bArrive.target = new YUKA.Vector3(
          steeringCmd.target.x,
          steeringCmd.target.y,
          steeringCmd.target.z,
        );
        bArrive.active = true;
      } else if (steeringCmd.type === "STOP") {
        resetBehaviors();
        vehicle.velocity.set(0, 0, 0);

        // Fix #11/#23: Face the interaction target if provided
        if (steeringCmd.faceTarget && groupRef.current) {
          const toTarget = new THREE.Vector3(
            steeringCmd.faceTarget.x - vehicle.position.x,
            0,
            steeringCmd.faceTarget.z - vehicle.position.z,
          );
          if (toTarget.lengthSq() > 0.01) {
            const targetQuat = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              toTarget.normalize(),
            );
            vehicle.rotation.copy(targetQuat as unknown as YUKA.Quaternion);
          }
        }
      }
    }

    // --- WALL AVOIDANCE (Multi-Ray + Sliding) ---
    // FIX: Uses raw `delta` instead of `dt` (which was delta*15, causing 15x overstrength)
    // FIX: Clamps total push magnitude to prevent corner-squeeze teleports
    if (collidableMeshes.length > 0) {
      const speed = vehicle.velocity.length();
      if (speed > 0.1) {
        // Rays: Center, Left (30deg), Right (30deg)
        const forward = new THREE.Vector3()
          .copy(vehicle.velocity as unknown as THREE.Vector3)
          .normalize();
        const left = new THREE.Vector3()
          .copy(forward)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6);
        const right = new THREE.Vector3()
          .copy(forward)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 6);

        const directions = [forward, left, right];
        const raycaster = raycasterRef.current;
        const rayOrigin = rayOriginRef.current;
        rayOrigin.set(
          vehicle.position.x,
          vehicle.position.y + 1.0,
          vehicle.position.z,
        );

        // Accumulate total push to clamp later
        let totalPushX = 0;
        let totalPushZ = 0;

        for (const dir of directions) {
          raycaster.set(rayOrigin, dir);
          raycaster.far = 3.0;

          const hits = raycaster.intersectObjects(collidableMeshes, true);
          if (hits.length > 0) {
            const hit = hits[0];
            const dist = hit.distance;

            let normal = new THREE.Vector3();
            if (hit.face) {
              normal
                .copy(hit.face.normal)
                .transformDirection(hit.object.matrixWorld)
                .normalize();
            } else {
              normal
                .subVectors(
                  vehicle.position as unknown as THREE.Vector3,
                  hit.point,
                )
                .normalize();
              normal.y = 0;
            }

            // 1. Repulsion force — use raw delta, NOT dt (=delta*15)
            // Dampen during close approach (ARRIVE active) to let agent converge
            const basePush = (3.0 - dist) * 40.0;
            const pushStrength = bArrive.active ? basePush * 0.4 : basePush;
            totalPushX += normal.x * pushStrength * delta;
            totalPushZ += normal.z * pushStrength * delta;

            // 2. Hard Velocity Slide (very close to wall)
            if (dist < 1.5) {
              const vel = vehicle.velocity as unknown as THREE.Vector3;
              const dot = vel.dot(normal);
              if (dot < 0) {
                vel.x -= normal.x * dot;
                vel.z -= normal.z * dot;
                vel.multiplyScalar(0.9);
              }
            }

            // 3. Hard Position Clamp (clipping)
            if (dist < 0.8) {
              const pushOut = normal.multiplyScalar(0.8 - dist);
              vehicle.position.x += pushOut.x;
              vehicle.position.z += pushOut.z;
            }
          }
        }

        // Clamp total push magnitude to prevent teleports
        const pushMag = Math.sqrt(
          totalPushX * totalPushX + totalPushZ * totalPushZ,
        );
        const maxPush = 15.0;
        if (pushMag > maxPush) {
          const scale = maxPush / pushMag;
          totalPushX *= scale;
          totalPushZ *= scale;
        }
        vehicle.velocity.x += totalPushX;
        vehicle.velocity.z += totalPushZ;

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
          let pushX = 0,
            pushZ = 0;

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

        // Social Interaction — Fix #26: Skip if agent has an active task
        if (
          distSq < 25.0 &&
          socialState.current === "NONE" &&
          greetingState.current === "NONE" &&
          !taskQueue.isBusy()
        ) {
          if (Math.random() < 0.01) {
            socialState.current = "CHATTING";
            socialTarget.current = other;
            socialTimer.current = 0;
            greetingState.current = "WAVING";
          }
        }
      }
    }

    // --- SOCIAL UPDATES ---
    if (socialState.current === "CHATTING") {
      socialTimer.current += delta;
      vehicle.velocity.set(0, 0, 0);
      if (socialTimer.current > 5.0) {
        socialState.current = "COOLDOWN";
        socialTimer.current = 0;
        greetingState.current = "NONE";
      }
    } else if (socialState.current === "COOLDOWN") {
      socialTimer.current += delta;
      if (socialTimer.current > 3.0) socialState.current = "NONE";
    }

    // --- PHYSICS (Gravity / Ground Detection) ---
    // FIX: Runs every frame (was every-other-frame, causing missed ground + free-fall)
    if (collidableMeshes.length > 0) {
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
        const validHits = hits.filter(
          (h) => !h.object.name.includes("Ceiling"),
        );
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
          // Deep Water (Sink) — FIX: use raw delta, NOT dt (was 15x too fast)
          vehicle.position.y -= 5.0 * delta * 2;
        }
      } else {
        // Void fall — FIX: use raw delta, NOT dt (was 15x too fast)
        vehicle.position.y -= 10.0 * delta;
      }

      // Safety clamp: if agent fell too far below floor, snap back
      if (vehicle.position.y < -5) {
        vehicle.position.y = 0;
      }
    }

    // --- BRAIN UPDATE ---
    const brain = brainRef.current;
    // SKIP BRAIN IF MANUAL TASK IS ACTIVE (Task Queue Override)
    if (hasManualTask) {
      // Skip LLM brain entirely — manual tasks control steering
    } else if (frameRef.current % brainIntervalRef.current === 0) {
      // SKIP BRAIN IF FOLLOWING (Manual Override)
      if (followingAgentId === id) {
        // Follow mode - handled above via task queue or legacy
      } else {
        let currentBehavior = "IDLE";
        if (vehicle.steering.behaviors[1].active) currentBehavior = "SEEKING";
        else if (vehicle.steering.behaviors[0].active)
          currentBehavior = "WANDERING";

        const nearbyEntities: NearbyEntity[] = [];

        // Perception Logic (Condensed for brevity - same as before)
        if (playerRef.current) {
          const d = vehicle.position.distanceTo(
            playerRef.current.position as unknown as YUKA.Vector3,
          );
          if (d < 30)
            nearbyEntities.push({
              type: "PLAYER",
              id: "player-01",
              distance: d,
              status: "Active",
            });
        }

        // Update Brain
        brain
          .update(
            vehicle.position as unknown as THREE.Vector3,
            nearbyEntities,
            currentBehavior,
          )
          .then((decision) => {
            if (decision) {
              // Fix #5/#8: Updated indices after removing ObstacleAvoidanceBehavior
              const bFollowPath = vehicle.steering
                .behaviors[0] as YUKA.FollowPathBehavior;
              const bSeek = vehicle.steering.behaviors[1] as YUKA.SeekBehavior;
              const bArrive = vehicle.steering
                .behaviors[2] as YUKA.ArriveBehavior;
              const bWander = vehicle.steering
                .behaviors[3] as YUKA.WanderBehavior;

              const resetBehaviors = () => {
                bFollowPath.active = false;
                bSeek.active = false;
                bArrive.active = false;
                bWander.active = false;
              };

              // Simple handling of MOVE_TO / FOLLOW for now to keep it robust
              if (decision.action === "MOVE_TO" && decision.target) {
                resetBehaviors();
                // Use Pathfinding
                const target = new THREE.Vector3(
                  decision.target.x,
                  decision.target.y,
                  decision.target.z,
                );
                const path = NavigationNetwork.getInstance().findPath(
                  vehicle.position as unknown as THREE.Vector3,
                  target,
                );

                const yukaPath = new YUKA.Path();
                path.forEach((p) =>
                  yukaPath.add(new YUKA.Vector3(p.x, p.y, p.z)),
                );
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
    }

    // --- ANIMATION UPDATE (Procedural) ---
    // Apply internal procedural gait engine. We must use real delta, NOT the 15x physical simulation dt.
    const realDelta = Math.min(delta, 0.1);
    updateGait(vehicle.velocity as unknown as THREE.Vector3, realDelta);

    const animSpeed = smoothSpeed.current;

    // Stop waving/chatting immediately if the agent starts moving (e.g. gets a new task)
    if (animSpeed > 0.1) {
      if (greetingState.current === "WAVING") greetingState.current = "NONE";
      if (socialState.current === "CHATTING") socialState.current = "COOLDOWN";
    }

    let newState: "Idle" | "Walk" | "Run" | "Wave" = "Idle";
    if (greetingState.current === "WAVING") newState = "Wave";
    else if (animSpeed > 0.1) newState = "Walk";

    if (newState !== animationState) setAnimationState(newState);

    const j = joints.current;
    if (
      j.hips &&
      j.torso &&
      j.leftArm &&
      j.rightArm &&
      j.leftHip &&
      j.rightHip &&
      j.leftKnee &&
      j.rightKnee &&
      j.neck
    ) {
      // Head Tracking Logic remains unique to AI for now (or could be extracted too)
      const lerpFactor = 0.1;

      // 1. Head Tracking (Player Aware)
      if (playerRef.current) {
        const toPlayer = new THREE.Vector3().subVectors(
          playerRef.current.position,
          vehicle.position,
        );
        const distToPlayer = toPlayer.length();

        if (distToPlayer < 8.0) {
          // Look at player within 8m
          // Calculate local look dir
          // We need world quaternion of the agent?
          // Simplification: rotating the neck bone.
          // Neck rotation is local.
          // We need the angle difference between agent forward and vector to player.

          const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(
            groupRef.current!.quaternion,
          );
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
            j.neck.rotation.y = THREE.MathUtils.lerp(
              j.neck.rotation.y,
              clampedNeckY,
              0.1,
            );

            // Also slight head tilt
            j.neck.rotation.x = THREE.MathUtils.lerp(
              j.neck.rotation.x,
              -0.1,
              0.1,
            );
          } else {
            // Reset if behind
            j.neck.rotation.y = THREE.MathUtils.lerp(
              j.neck.rotation.y,
              0,
              0.05,
            );
          }
        } else {
          // Idle Looking
          const t = state.clock.elapsedTime;
          j.neck.rotation.y = THREE.MathUtils.lerp(
            j.neck.rotation.y,
            Math.sin(t * 0.5) * 0.3,
            0.05,
          );
        }
      }

      if (greetingState.current === "WAVING") {
        const waveSpeed = 12;
        const wave = Math.sin(state.clock.elapsedTime * waveSpeed) * 0.4;

        // Override arm rotation for waving
        j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
          j.rightArm.shoulder.rotation.x,
          0,
          0.1,
        );
        j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(
          j.rightArm.shoulder.rotation.z,
          -2.5 + wave,
          0.1,
        );
        j.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(
          j.rightArm.elbow.rotation.x,
          0,
          0.1,
        );
        j.rightArm.elbow.rotation.z = THREE.MathUtils.lerp(
          j.rightArm.elbow.rotation.z,
          -0.8 + wave * 0.2,
          0.1,
        );
      } else if (taskQueue.getCurrentPhase() === "PICKING_UP") {
        // Fix #18: Reach DOWN to pick up
        j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
          j.rightArm.shoulder.rotation.x,
          Math.PI / 3, // Reach forward-down
          0.1,
        );
        j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(
          j.rightArm.shoulder.rotation.z,
          -0.3,
          0.1,
        );
        j.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(
          j.rightArm.elbow.rotation.x,
          -0.4, // Bend elbow to reach down
          0.1,
        );
        j.rightArm.elbow.rotation.z = THREE.MathUtils.lerp(
          j.rightArm.elbow.rotation.z,
          0,
          0.1,
        );
      } else if (taskQueue.getCurrentPhase() === "PLACING") {
        // Fix #18: Reach FORWARD to place
        j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
          j.rightArm.shoulder.rotation.x,
          Math.PI / 4, // Reach forward
          0.1,
        );
        j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(
          j.rightArm.shoulder.rotation.z,
          -0.5,
          0.1,
        );
        j.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(
          j.rightArm.elbow.rotation.x,
          -0.2, // Slight bend
          0.1,
        );
        j.rightArm.elbow.rotation.z = THREE.MathUtils.lerp(
          j.rightArm.elbow.rotation.z,
          0,
          0.1,
        );
      }
    }

    // Carried items are hidden (invisible) while being transported.
    // They reappear at the destination when placed.

    // Update Minimap Position
    setAgentPosition(
      id,
      new THREE.Vector3(
        vehicle.position.x,
        vehicle.position.y,
        vehicle.position.z,
      ),
    );
  });

  return {
    vehicle: vehicleRef.current,
    brain: brainRef.current,
    animationState,
  };
}
