// Fix #2: Removed @ts-nocheck — targeted @ts-ignore used on Yuka↔Three casts below
import { useEffect, useRef, useState } from "react";
import * as YUKA from "yuka";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import AIManager from "@/components/systems/AIManager";
import { useGameStore } from "@/store/gameStore";
import { useProceduralGait } from "@/components/agent/useProceduralGait";

import { ClientBrain } from "@/components/systems/ClientBrain";
import type { NearbyEntity } from "@/lib/agent-core";
import { InteractableRegistry } from "@/components/systems/InteractableRegistry";
import { AgentBrainClient } from "@/lib/workers/AgentBrainClient";
import { AgentTaskQueue, AgentTaskRegistry } from "@/components/systems/AgentTaskQueue";
import type { SteeringCommand } from "@/components/systems/AgentTaskQueue";
import { findAlternativeArea } from "@/lib/nlp-parser";
import { memoryStream } from "@/lib/memory/MemoryStream";
import { getRandomPhrase } from "@/lib/audio/phraseBank";
import { DriveManager } from "@/lib/agent-drives";
import { ZoneInfluenceSystem } from "@/components/systems/ZoneInfluenceSystem";
import { POIRegistry } from "@/components/systems/POIRegistry";
import { SpatialMemory } from "@/lib/memory/SpatialMemory";
import { getPersonality } from "@/config/agentPersonalities";
import { 
  getZoneCenterPosition, 
  getNearestBench, 
  ALL_ZONE_IDS 
} from "@/config/donutLabRoutines";
import { SensorySystem, HearingBus, type HearingEvent } from "@/lib/SensorySystem";
import { UtilityBrain } from "@/lib/UtilityBrain";
import { InterestMap } from "@/store/InterestMap";

// Radial bounds for the Donut Lab (Circular Ring)
const RING_INNER_RADIUS = 39; // Align with 38 inner void
const MAX_SAFE_RADIUS = 94; // Align with 95 outer wall

function clampToDonutRing(pos: { x: number; y: number; z: number }) {
  const distSq = pos.x * pos.x + pos.z * pos.z;
  const dist = Math.sqrt(distSq);
  
  // If outside the outer wall, pull back slightly inside the bounds
  if (dist > MAX_SAFE_RADIUS) {
    const scale = (MAX_SAFE_RADIUS - 1.0) / dist;
    return {
      x: pos.x * scale,
      y: pos.y,
      z: pos.z * scale,
    };
  }
  
  // If inside the inner hole, push out gently
  if (dist < RING_INNER_RADIUS + 1.5) {
    const scale = (RING_INNER_RADIUS + 2.5) / dist;
    return {
      x: pos.x * scale,
      y: pos.y,
      z: pos.z * scale,
    };
  }

  return pos;
}

export function useAgentBrain(
  id: string,
  groupRef: React.RefObject<THREE.Group | null>,
  playerRef: React.RefObject<THREE.Group | null>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  const socialCheckTimer = useRef(0);
  const lastMinimapPos = useRef(new THREE.Vector3(0, -999, 0));

  // Player Proximity Chat State
  const playerProximityState = useRef<
    "NONE" | "GREETING" | "CHATTING" | "COOLDOWN"
  >("NONE");
  const playerProximityCooldown = useRef(0);
  const PLAYER_GREET_DISTANCE = 6.0;
  const PLAYER_LEAVE_DISTANCE = 10.0;
  const PLAYER_COOLDOWN_TIME = 15.0;

  // Optimization Refs
  const raycasterRef = useRef(new THREE.Raycaster());
  const rayOriginRef = useRef(new THREE.Vector3());
  const rayDirRef = useRef(new THREE.Vector3(0, -1, 0));
  const lastInspectedState = useRef("");
  const lastInspectedThought = useRef("");
  const frameRef = useRef(0);
  const lookAheadRef = useRef(new THREE.Vector3());
  const sensorPosRef = useRef(new THREE.Vector3());
  const safetyTargetRef = useRef(new THREE.Vector3(0, 0, -330));
  const toSafetyRef = useRef(new THREE.Vector3());
  const driveManagerRef = useRef(new DriveManager());
  const spatialMemoryRef = useRef(SpatialMemory.getInstance(id));
  const personalityRef = useRef(getPersonality(id));
  const sensorySystemRef = useRef<SensorySystem>(new SensorySystem(id));
  const utilityBrainRef = useRef<UtilityBrain>(new UtilityBrain(id));
  const lastUtilityCheckTimeRef = useRef(0);
  // Zone update timer (throttle zone tracking to every 2 seconds)
  const zoneUpdateTimer = useRef(0);
  const poiUpdateTimer = useRef(0);
  const stuckTimer = useRef(0);
  const lastStuckCheckPos = useRef(new THREE.Vector3());

  // Tier 1: Per-frame allocation elimination — all reusable Vector3/Quaternion objects
  // hoisted as refs so they are never re-allocated inside useFrame callbacks.
  const vehiclePosRef = useRef(new THREE.Vector3());
  const toTargetRef = useRef(new THREE.Vector3());
  const toPlayerRef = useRef(new THREE.Vector3());
  const forwardRef = useRef(new THREE.Vector3());
  const leftRef = useRef(new THREE.Vector3());
  const rightRef = useRef(new THREE.Vector3());
  const normalRef = useRef(new THREE.Vector3());
  const yAxisRef = useRef(new THREE.Vector3(0, 1, 0)); // World up — constant, never mutated
  const zAxisRef = useRef(new THREE.Vector3(0, 0, 1)); // World forward — constant, never mutated
  const lastGroundedPosRef = useRef(new THREE.Vector3());

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
  // Brain cooldown: 45s wall-clock to match drive cooldowns and conserve API tokens
  const lastBrainCallTimeRef = useRef(0);
  const BRAIN_COOLDOWN_SEC = 45;

  // Fix #Loop-5: Deduplicate repeated same-script decisions — prevent re-queuing
  // the exact same scriptId within a cooldown window (30s).
  const lastScriptIdRef = useRef<string>("");
  const lastScriptTimeRef = useRef<number>(0);
  const SCRIPT_COOLDOWN_MS = 30_000;

  // --- TASK QUEUE (Manual Task Assignment) ---
  const taskQueueRef = useRef(AgentTaskRegistry.getInstance().getOrCreate(id));

  // --- STARTUP EXPLORATION (park world) ---
  const hasEnqueuedMorningCheckRef = useRef(false);
  useEffect(() => {
    if (hasEnqueuedMorningCheckRef.current) return;

    const queue = AgentTaskRegistry.getInstance().getOrCreate(id);
    const driveManager = driveManagerRef.current;

    /** Hook up task completion events to satisfy drives */
    const handleTaskCompletion = (e: any) => {
      if (e.detail.agentId !== id) return;
      const taskType = e.detail.taskType;
      console.log(`[useAgentBrain:${id}] Task completed: ${taskType} - Satisfying drives.`);
      
      switch (taskType) {
        case "REST":
        case "SIT":
          driveManager.satisfy("energy");
          break;
        case "CONTEMPLATE":
          driveManager.satisfy("wonder");
          break;
        case "EXPLORE":
          driveManager.satisfy("curiosity");
          break;
        case "COLLABORATE":
        case "SAY":
          driveManager.satisfy("social");
          break;
        case "PLACE_INVENTORY":
          driveManager.satisfy("tidiness");
          break;
      }
    };

    window.addEventListener("agent-task-completed", handleTaskCompletion);

    // Subscribe to hearing bus
    const unsubHearing = HearingBus.subscribe((event) => {
      sensorySystemRef.current.recordNoise(event);

      // Reaction logic: If noise is loud (> 8m) and agent is idle/wandering, look at it
      if (event.loudness > 8.0 && (queue.getCurrentTask()?.priority ?? 0) <= 0) {
        queue.enqueue({
          type: "LOOK_AT",
          priority: 2, // Interrupts wander (0) but not LLM scripts (10)
          lookTarget: event.position,
          duration: 3,
          scriptId: "noise_reaction",
        });
      }
    });

    const timer = setTimeout(() => {
      if (hasEnqueuedMorningCheckRef.current) return;
      hasEnqueuedMorningCheckRef.current = true;

      const personality = personalityRef.current;
      const scriptId = "startup_explore";
      const priority = 8;

      // Navigate to the agent's preferred zone on startup
      const preferredZone = personality.preferredZones[0] ?? "center-park";
      const zonePos = getZoneCenterPosition(preferredZone);
      if (zonePos) {
        queue.enqueue({ type: "GO_TO", priority, scriptId, targetPos: zonePos });
        queue.enqueue({ type: "WAIT", priority, scriptId, duration: 2 });
        queue.enqueue({ type: "EXPLORE", priority: 0, scriptId: "subconscious_explore", targetAreaId: preferredZone } as any);
      }

      queue.enqueue({ type: "WANDER", priority: 0, scriptId: "subconscious_wander" });

      console.debug(`[useAgentBrain:${id}] ${personality.name} heading to preferred zone: ${preferredZone}`);
    }, 2000 + Math.random() * 1000);

    return () => {
      clearTimeout(timer);
      unsubHearing();
      window.removeEventListener("agent-task-completed", handleTaskCompletion);
    };
  }, [id]);

  // Show "Meeting in the meeting room" in thought bubble when another agent announces a meeting
  useEffect(() => {
    const handler = (e: Event) => {
      const { agentId: targetId, message } = (
        e as CustomEvent<{ agentId: string; message: string }>
      ).detail;
      if (targetId !== id) return;
      const brain = brainRef.current;
      brain.state.thought = message;
      brain.state.lastThoughtTime = Date.now();
    };
    window.addEventListener("agent-meeting-announcement", handler);
    return () =>
      window.removeEventListener("agent-meeting-announcement", handler);
  }, [id]);

  // --- ANIMATION STATE ---
  const [animationState, setAnimationState] = useState<
    "Idle" | "Walk" | "Run" | "Wave" | "Sit" | "Lean" | "Think" | "Work" | "Present" | "Rest" | "LookAt"
  >("Idle");

  useEffect(() => {
    if (!groupRef.current) return;

    // Create Yuka Vehicle
    const vehicle = new YUKA.Vehicle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vehicle as any).id = id;
    vehicle.maxSpeed = 5.5; // Adjusted higher as per user request
    vehicle.maxForce = 4.0; // Heavy Inertia for smooth turns (was 10.0)
    vehicle.mass = 2.0;
    vehicle.boundingRadius = 1.0; // TUNED: 1.0 fits the robot footprint perfectly (was 2.0)

    // Sync initial position — XZ from the group reference is correct.
    // Y is *always* forced to FLOOR_Y regardless of where groupRef.current
    // drifted to in previous frames. Floor-Main-Slab top surface = Y=4.0.
    const FLOOR_Y = 4.0;
    vehicle.position.set(
      groupRef.current.position.x,
      FLOOR_Y,
      groupRef.current.position.z,
    );
    // Also correct the Three.js mesh so the render-sync callback doesn't
    // immediately write a stale sunken Y back on the first Yuka update tick.
    groupRef.current.position.y = FLOOR_Y;
    vehicle.rotation.copy(
      groupRef.current.quaternion as unknown as YUKA.Quaternion,
    );
    lastGroundedPosRef.current.set(
      groupRef.current.position.x,
      FLOOR_Y,
      groupRef.current.position.z,
    );

    // Render Component (Sync Yuka -> Three)
    vehicle.setRenderComponent(groupRef.current, (entity, renderComponent) => {
      const mesh = renderComponent as THREE.Group;
      mesh.position.copy(entity.position as unknown as THREE.Vector3);
      mesh.quaternion.copy(entity.rotation as unknown as THREE.Quaternion);
    });

    // --- BEHAVIORS ---

    // --- Rebuild navigation grid whenever obstacles change ---
    AgentBrainClient.getInstance().initNav(obstacles);

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
    wander.active = false; // Turned off completely to prevent fighting with LLM tasks
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

  // Set raycaster to only intersect with objects on Layer 1 (Collidables)
  useEffect(() => {
    raycasterRef.current.layers.set(1);
  }, []);

  const frustumRef = useRef(new THREE.Frustum());
  const projScreenMatrixRef = useRef(new THREE.Matrix4());
  const agentSphereRef = useRef(new THREE.Sphere(new THREE.Vector3(), 3));

  useFrame((state, delta) => {
    // Remote Logic: Update inspected agent data
    if (id === inspectedAgentId) {
      const currentThought = brainRef.current.state.thought;
      if (
        lastInspectedState.current !== animationState ||
        lastInspectedThought.current !== currentThought
      ) {
        lastInspectedState.current = animationState;
        lastInspectedThought.current = currentThought;
        setInspectedAgentData({
          id,
          thought: currentThought,
          state: animationState,
        });
      }
    }

    if (isMenuOpen || isMenuPanelOpen) return;
    const vehicle = vehicleRef.current;
    if (!vehicle) return;

    const dt = delta * 15; // Speed multiplier for simulation steps
    frameRef.current++;

    // --- MANUAL TASK QUEUE UPDATE ---
    const taskQueue = taskQueueRef.current;
    const vehiclePos = vehiclePosRef.current.set(
      vehicle.position.x,
      vehicle.position.y,
      vehicle.position.z,
    );

    // Get player position if available
    let playerPos: THREE.Vector3 | undefined;
    if (playerRef.current) {
      playerPos = playerRef.current.position;
    }

    const isInteractingWithPlayer =
      playerProximityState.current === "GREETING" ||
      playerProximityState.current === "CHATTING";

    let steeringCmd: SteeringCommand = { type: "NONE" } as SteeringCommand;
    if (!isInteractingWithPlayer) {
      steeringCmd = taskQueue.update(delta, vehiclePos, playerPos);
    }
    const hasManualTask = taskQueue.isBusy();

    // Fix #27: Always disable wander when a manual task is active
    // Fix #5/#8: Updated indices after removing ObstacleAvoidanceBehavior
    const bFollowPath = vehicle.steering
      .behaviors[0] as YUKA.FollowPathBehavior;
    const bSeek = vehicle.steering.behaviors[1] as YUKA.SeekBehavior;
    const bArrive = vehicle.steering.behaviors[2] as YUKA.ArriveBehavior;
    const bWander = vehicle.steering.behaviors[3] as YUKA.WanderBehavior;

    if (isInteractingWithPlayer) {
      // PAUSE MODE: Force agent to stop and stand still while interacting
      bFollowPath.active = false;
      bSeek.active = false;
      bArrive.active = false;
      bWander.active = false;
      vehicle.velocity.set(0, 0, 0);
    }

    if (hasManualTask && bWander.active) {
      bWander.active = false;
    }

    // --- ANTICIPATORY DECELERATION ---
    // Dynamically adjust maxSpeed based on angular turning. If the agent needs to
    // make a sharp turn to reach its target or waypoint, it slows down rather than drifting.
    const currentSpeed = vehicle.velocity.length();
    let targetSpeed = 5.5; // Default max speed

    if (
      currentSpeed > 0.5 &&
      (bFollowPath.active || bSeek.active || bArrive.active)
    ) {
      // Find the velocity heading vs the current facing direction
      const velDir = new THREE.Vector3(
        vehicle.velocity.x,
        vehicle.velocity.y,
        vehicle.velocity.z,
      ).normalize();
      const faceDir = new THREE.Vector3(0, 0, 1).applyQuaternion(
        vehicle.rotation as unknown as THREE.Quaternion,
      );
      const dot = velDir.dot(faceDir);

      // dot < 0.7 means a sharp turn is happening (> ~45 degrees difference)
      if (dot < 0.7) {
        targetSpeed = 2.5; // Slow down for the turn
      } else if (bArrive.active && bArrive.target) {
        const distToTarget = vehicle.position.distanceTo(bArrive.target);
        if (distToTarget < 2.0) {
          targetSpeed = 1.5; // Slow down heavily on final approach
        }
      }
    }

    // Smoothly interpolate maxSpeed to prevent jerky braking
    vehicle.maxSpeed += (targetSpeed - vehicle.maxSpeed) * 0.1;

    // Apply steering command from task queue (if active)
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
          const toTarget = toTargetRef.current.set(
            steeringCmd.faceTarget.x - vehicle.position.x,
            0,
            steeringCmd.faceTarget.z - vehicle.position.z,
          );
          if (toTarget.lengthSq() > 0.01) {
            const targetQuat = new THREE.Quaternion().setFromUnitVectors(
              zAxisRef.current,
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
    // PERF: Throttle wall avoidance to every 2nd frame to save CPU on raycasts
    if (frameRef.current % 2 === 0 && collidableMeshes.length > 0) {
      const speed = vehicle.velocity.length();
      if (speed > 0.1) {
        // Rays: Center, Left (30deg), Right (30deg)
        const forward = forwardRef.current
          .set(vehicle.velocity.x, vehicle.velocity.y, vehicle.velocity.z)
          .normalize();
        const left = leftRef.current
          .copy(forward)
          .applyAxisAngle(yAxisRef.current, Math.PI / 6);
        const right = rightRef.current
          .copy(forward)
          .applyAxisAngle(yAxisRef.current, -Math.PI / 6);

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

          const hits = raycaster.intersectObjects(collidableMeshes, false);
          if (hits.length > 0) {
            const hit = hits[0];
            const dist = hit.distance;

            const normal = normalRef.current.set(0, 0, 0);
            if (hit.face) {
              normal
                .copy(hit.face.normal)
                .transformDirection(hit.object.matrixWorld)
                .normalize();
            } else {
              normal
                .set(
                  vehicle.position.x - hit.point.x,
                  vehicle.position.y - hit.point.y,
                  vehicle.position.z - hit.point.z,
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

        // Removed manual corner escape wiggle because it caused left/right jitter.
        // YUKA's steering/pathfinder will solve stalemates via route recalculations.

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

      // --- STUCK DETECTION AND RECOVERY ---
      // If the agent is trying to move (speed > 0.5) but the position displacement is 
      // minimal (< 0.2m) over several seconds, they are likely stuck against 
      // an obstacle or in a Navmesh hole.
      const moveSpeed = vehicle.velocity.length();
      if (moveSpeed > 0.5 && (bArrive.active || bFollowPath.active)) {
        const distMoved = vehicle.position.distanceTo(lastStuckCheckPos.current as unknown as YUKA.Vector3);
        if (distMoved < 0.1) {
          stuckTimer.current += delta;
        } else {
          stuckTimer.current = 0;
          lastStuckCheckPos.current.copy(vehicle.position as unknown as THREE.Vector3);
        }

        // Recovery: Abort the current task and fall back to WANDER
        if (stuckTimer.current > 4.0) {
          console.warn(`[useAgentBrain:${id}] Agent stuck for 4s - Aborting task queue and fallback to wander.`);
          const queue = AgentTaskRegistry.getInstance().getOrCreate(id);
          queue.cancel();
          stuckTimer.current = 0;
          bArrive.active = false;
          bFollowPath.active = false;
          queue.enqueue({ type: "WANDER", priority: 0, scriptId: "stuck_recovery_wander" });
        }
      } else {
        stuckTimer.current = 0;
        lastStuckCheckPos.current.copy(vehicle.position as unknown as THREE.Vector3);
      }
    }

    // --- PHYSICS CONSTRAINT ---
    vehicle.velocity.y = 0; // Lock Y velocity to prevent pitching

    // --- PLAYER PROXIMITY CHAT ---
    // Check if the player is nearby and trigger greeting/chat flow
    const brain = brainRef.current;
    if (playerRef.current) {
      const distToPlayer = vehicle.position.distanceTo(
        playerRef.current.position as unknown as YUKA.Vector3,
      );
      const storeState = useGameStore.getState();

      if (playerProximityState.current === "NONE") {
        // Trigger greeting when player enters range
        if (
          distToPlayer < PLAYER_GREET_DISTANCE &&
          !storeState.nearbyAgentId &&
          !storeState.isChatOpen &&
          socialState.current === "NONE"
        ) {
          playerProximityState.current = "GREETING";
          vehicle.velocity.set(0, 0, 0);

          // Face the player
          if (groupRef.current && playerRef.current) {
            const toPlayer = toPlayerRef.current.set(
              playerRef.current.position.x - vehicle.position.x,
              0,
              playerRef.current.position.z - vehicle.position.z,
            );
            if (toPlayer.lengthSq() > 0.01) {
              const targetQuat = new THREE.Quaternion().setFromUnitVectors(
                zAxisRef.current,
                toPlayer.normalize(),
              );
              vehicle.rotation.copy(targetQuat as unknown as YUKA.Quaternion);
            }
          }

          storeState.setNearbyAgentId(id);
          storeState.setChatPromptVisible(true);

          // Update brain thought to reflect greeting
          brain.state.thought = `Player detected nearby (${distToPlayer.toFixed(1)}m). Greeting and offering assistance.`;
          brain.state.lastThoughtTime = Date.now();

          window.dispatchEvent(
            new CustomEvent("subconscious-speak", {
              detail: { agentId: id, text: getRandomPhrase("GREETINGS") },
            }),
          );
        }
      } else if (playerProximityState.current === "GREETING") {
        // Keep the agent stopped and facing the player while greeting
        vehicle.velocity.set(0, 0, 0);

        // Check if prompt was dismissed (N pressed)
        if (!storeState.chatPromptVisible && !storeState.isChatOpen) {
          playerProximityState.current = "COOLDOWN";
          playerProximityCooldown.current = 0;
          greetingState.current = "NONE";
          storeState.setNearbyAgentId(null);

          brain.state.thought = "Player declined assistance. Resuming patrol.";
          brain.state.lastThoughtTime = Date.now();
        }
        // Check if chat was opened (Y pressed)
        else if (storeState.isChatOpen && storeState.chatAgentId === id) {
          playerProximityState.current = "CHATTING";
          greetingState.current = "NONE";

          brain.state.thought =
            "Engaged in conversation with the user. Standing by for instructions.";
          brain.state.lastThoughtTime = Date.now();
        }
        // Check if player walked away
        else if (distToPlayer > PLAYER_LEAVE_DISTANCE) {
          playerProximityState.current = "COOLDOWN";
          playerProximityCooldown.current = 0;
          greetingState.current = "NONE";
          storeState.setChatPromptVisible(false);
          storeState.setNearbyAgentId(null);

          brain.state.thought =
            "Player walked away before responding. Resuming patrol.";
          brain.state.lastThoughtTime = Date.now();
        }
      } else if (playerProximityState.current === "CHATTING") {
        // Agent stays idle while chatting
        vehicle.velocity.set(0, 0, 0);

        // Face the player continuously during chat
        if (groupRef.current && playerRef.current) {
          const toPlayer = toPlayerRef.current.set(
            playerRef.current.position.x - vehicle.position.x,
            0,
            playerRef.current.position.z - vehicle.position.z,
          );
          if (toPlayer.lengthSq() > 0.01) {
            const targetQuat = new THREE.Quaternion().setFromUnitVectors(
              zAxisRef.current,
              toPlayer.normalize(),
            );
            groupRef.current.quaternion.slerp(targetQuat, 0.05);
            vehicle.rotation.copy(
              groupRef.current.quaternion as unknown as YUKA.Quaternion,
            );
          }
        }

        // Update brain thought when tasks are active from chat
        if (taskQueue.isBusy()) {
          const currentTask = taskQueue.getCurrentTask();
          const phase = taskQueue.getCurrentPhase();
          brain.state.thought = `Executing task from chat: ${currentTask?.type || "unknown"} (Phase: ${phase})`;
          brain.state.lastThoughtTime = Date.now();
        }

        // Check if chat was closed
        if (!storeState.isChatOpen || storeState.chatAgentId !== id) {
          playerProximityState.current = "COOLDOWN";
          playerProximityCooldown.current = 0;
          storeState.setNearbyAgentId(null);

          // Show task status in thought if tasks were assigned
          if (taskQueue.isBusy()) {
            brain.state.thought = `Chat ended. Executing assigned task: ${taskQueue.getCurrentTask()?.type || "pending"}.`;
          } else {
            brain.state.thought = "Chat ended. Resuming normal operations.";
          }
          brain.state.lastThoughtTime = Date.now();
        }
      } else if (playerProximityState.current === "COOLDOWN") {
        playerProximityCooldown.current += delta;
        if (playerProximityCooldown.current > PLAYER_COOLDOWN_TIME) {
          playerProximityState.current = "NONE";
          playerProximityCooldown.current = 0;
        }
      }
    }

    // --- THROTTLED SOCIAL INTERACTION (Robot vs Robot) ---
    // Hard collision is now handled by YUKA's SeparationBehavior to avoid O(N^2) every frame.
    socialCheckTimer.current += delta;
    if (socialCheckTimer.current > 0.25) {
      socialCheckTimer.current = 0;

      const vehicles = aiManager.vehicles;
      const myPos = vehicle.position;

      for (const other of vehicles) {
        if (other !== vehicle) {
          const distSq = myPos.squaredDistanceTo(other.position);

          // Social Interaction — Fix #26: Skip if agent has an active task
          if (
            distSq < 25.0 &&
            socialState.current === "NONE" &&
            greetingState.current === "NONE" &&
            !taskQueue.isBusy()
          ) {
            // Increased probability to 0.05 since we check 4x a second instead of 60x
            if (Math.random() < 0.05) {
              socialState.current = "CHATTING";
              socialTarget.current = other;
              socialTimer.current = 0;
              greetingState.current = "WAVING";
              
              // Emit social heat
              InterestMap.getInstance().addHeat(myPos as unknown as THREE.Vector3, 2.0);
            }
          }
        }
      }
    }

    // --- SOCIAL UPDATES ---
    // Fix #30: Force-cancel social interactions if the agent has an active task.
    // Otherwise a 5-second CHATTING freeze makes the stuck detector think the agent is stuck.
    if (socialState.current === "CHATTING" && taskQueue.isBusy()) {
      socialState.current = "NONE";
      socialTimer.current = 0;
      greetingState.current = "NONE";
    } else if (socialState.current === "CHATTING") {
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
    // FIX: Agents no longer walk on workbenches — max step-up height limits Y snapping
    if (collidableMeshes.length > 0) {
      const raycaster = raycasterRef.current;
      const rayOrigin = rayOriginRef.current;

      // Cast from just above max step height to prevent snapping to high ceilings/objects
      const MAX_STEP_UP = 2.0;
      rayOrigin.set(
        vehicle.position.x,
        vehicle.position.y + MAX_STEP_UP + 0.1,
        vehicle.position.z,
      );
      raycaster.set(rayOrigin, rayDirRef.current);

      const hits = raycaster.intersectObjects(collidableMeshes, false);
      let groundHeight = -100;
      let foundGround = false;

      // Maximum height the agent can "step up" onto.
      // Increased to 2.0 to ensure recovery if agents ever fall below floor slab.
      // Higher than this is still ignored as furniture (workbenches, tables).
      const currentY = vehicle.position.y;

      if (hits.length > 0) {
        // Filter out ceilings
        const validHits = hits.filter(
          (h) => !h.object.name.includes("Ceiling"),
        );

        // Separate hits into reachable (floor-level) vs elevated (furniture)
        let bestFloorHit = -100; // Lowest valid surface (the actual floor)
        let bestStepHit = -100; // Surfaces within step-up range

        for (const hit of validHits) {
          if (hit.point.y >= rayOrigin.y) continue; // Above ray origin — skip

          const hitY = hit.point.y;

          // Is this surface within the agent's step-up range?
          if (hitY <= currentY + MAX_STEP_UP) {
            // Valid walkable surface — take the highest one within range
            if (hitY > bestStepHit) {
              bestStepHit = hitY;
            }
          }

          // Track the absolute lowest surface (floor)
          if (hitY < currentY + MAX_STEP_UP && hitY > bestFloorHit) {
            bestFloorHit = hitY;
          }
        }

        // Prefer surfaces within step-up range; fall back to floor
        if (bestStepHit > -100) {
          groundHeight = bestStepHit;
          foundGround = true;
        } else if (bestFloorHit > -100) {
          groundHeight = bestFloorHit;
          foundGround = true;
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

      // Safety clamp: if agent falls into the void, snap back to last known good ground.
      if (vehicle.position.y < -15) {
        // Void fall safety
        vehicle.position.x = lastGroundedPosRef.current.x;
        vehicle.position.y = lastGroundedPosRef.current.y;
        vehicle.position.z = lastGroundedPosRef.current.z;
        vehicle.velocity.set(0, 0, 0);
        if (groupRef.current) {
          groupRef.current.position.copy(lastGroundedPosRef.current);
        }
      } else if (foundGround && groundHeight > -1.5) {
        // Continuously track the last safe location while on stable ground
        lastGroundedPosRef.current.set(
          vehicle.position.x,
          groundHeight,
          vehicle.position.z,
        );
      }

      // Radial Donut Ring Soft Clamping
      const dist = Math.sqrt(vehicle.position.x * vehicle.position.x + vehicle.position.z * vehicle.position.z);
      
      // Soft clamp: Hit Outer Wall
      if (dist > MAX_SAFE_RADIUS && dist > 0.001) {
        const penetration = dist - MAX_SAFE_RADIUS;
        const pushMag = penetration * 5.0; // Acts like a spring restoring force
        vehicle.velocity.x -= (vehicle.position.x / dist) * pushMag;
        vehicle.velocity.z -= (vehicle.position.z / dist) * pushMag;
      }
      
      // Soft clamp: Hit Inner Void
      if (dist < RING_INNER_RADIUS + 1 && dist > 0.001) {
        const penetration = (RING_INNER_RADIUS + 1) - dist;
        const pushMag = penetration * 5.0;
        vehicle.velocity.x += (vehicle.position.x / dist) * pushMag;
        vehicle.velocity.z += (vehicle.position.z / dist) * pushMag;
      }
    }

    // --- BRAIN PULSE ---
    const now = Date.now() / 1000;
    const canThink = now - lastBrainCallTimeRef.current > BRAIN_COOLDOWN_SEC;

    // --- BRAIN UPDATE ---
    // SKIP BRAIN IF MANUAL TASK IS ACTIVE (Task Queue Override)
    if (hasManualTask) {
      // Skip LLM brain entirely — manual tasks control steering
    } else if (
      playerProximityState.current === "GREETING" ||
      playerProximityState.current === "CHATTING"
    ) {
      // SKIP BRAIN: Agent is interacting with player — thoughts are set by proximity state machine
    } else if (canThink) {
      // Triggered: update time
      lastBrainCallTimeRef.current = now;

      // Throttle brain based on distance
      let shouldSkipDueToDistance = false;
      if (playerRef.current) {
        const d = vehicle.position.distanceTo(
          playerRef.current.position as unknown as YUKA.Vector3,
        );
        if (d > 50 && Math.random() < 0.66) shouldSkipDueToDistance = true;
        else if (d > 25 && Math.random() < 0.5) shouldSkipDueToDistance = true;
      }

      if (shouldSkipDueToDistance) {
        // Skipped
      } else if (followingAgentId === id) {
        // Follow mode - handled above via task queue or legacy
      } else if (
        taskQueue.isBusy() &&
        (taskQueue.getCurrentTask()?.priority ?? 0) > 0
      ) {
        // SKIP BRAIN: A conscious script is actively running — don't poll LLM
        /* console.log(
          `[useAgentBrain:${id}] Brain gate: SKIPPING (busy, priority=${taskQueue.getCurrentTask()?.priority}, phase=${taskQueue.getCurrentPhase()})`,
        ); */
      } else {
        // --- DRIVE & EVENT MANAGER ---
        let currentBehavior = "IDLE";
        if (vehicle.steering.behaviors[1].active) currentBehavior = "SEEKING";
        else if (vehicle.steering.behaviors[0].active)
          currentBehavior = "WANDERING";

        const registry = InteractableRegistry.getInstance();
        const vPos = vehicle.position as unknown as THREE.Vector3;

        // Fast proximity check for Drive update (no raycast needed here, just volume sense)
        const nearbyAnyItems = registry.getNearby(vPos, 15);
        const nearbyFloorCount = nearbyAnyItems.filter(
          (i) => i.pickable && !i.carriedBy && !i.placedInArea,
        ).length;
        const pDist = playerRef.current
          ? vehicle.position.distanceTo(
              playerRef.current.position as unknown as YUKA.Vector3,
            )
          : null;
        const isIdle =
          currentBehavior === "IDLE" || currentBehavior === "WANDERING";

        // ── Zone influence: update drives via zone effects ──────────────────
        const agentWorldPos = vPos.clone();
        const currentZoneInfluence = ZoneInfluenceSystem.getCurrentZone(agentWorldPos);
        if (currentZoneInfluence) {
          driveManagerRef.current.applyZoneEffects(
            currentZoneInfluence.effects,
            delta,
            personalityRef.current.driveWeights,
          );
        }

        // ── Spatial memory: track zone visits ────────────────────────────
        zoneUpdateTimer.current += delta;
        if (zoneUpdateTimer.current >= 2.0) {
          zoneUpdateTimer.current = 0;
          if (currentZoneInfluence) {
            spatialMemoryRef.current.updateZone(
              currentZoneInfluence.zoneId,
              currentZoneInfluence.zoneName,
            );
          }
          // Update POI novelty recovery
          poiUpdateTimer.current += 2.0;
          if (poiUpdateTimer.current >= 30.0) {
            poiUpdateTimer.current = 0;
            POIRegistry.getInstance().update();
          }
        }

        // Check if agent is in a preferred zone for belonging drive
        const currentZoneId = currentZoneInfluence?.zoneId ?? "";
        const isInPreferredZone = personalityRef.current.preferredZones.includes(currentZoneId);
        const isMoving = (vehicle.velocity as unknown as THREE.Vector3).length() > 0.2;

        driveManagerRef.current.update(delta, {
          nearbyFloorItems: nearbyFloorCount,
          playerDistance: pDist,
          nearbyAgentCount: socialState.current !== "NONE" ? 1 : 0,
          isIdle,
          isMoving,
          isInPreferredZone,
          driveWeights: personalityRef.current.driveWeights,
        });

          const urgentDrive = driveManagerRef.current.getUrgentDrive();

        // --- SENSORY UPDATE (Local Subconscious) ---
        const perceivedEntities = sensorySystemRef.current.update(
          vPos,
          groupRef.current!.quaternion as unknown as THREE.Quaternion,
          // We still need a source of raw entities for the sensor to filter
          // For now, we'll synthesize them from the registry and playerRef
          (() => {
            const raw: NearbyEntity[] = [];
            if (playerRef.current && pDist !== null) {
              raw.push({
                type: "PLAYER",
                id: "player-01",
                distance: pDist,
                status: "Active",
                position: {
                  x: playerRef.current.position.x,
                  y: playerRef.current.position.y,
                  z: playerRef.current.position.z,
                },
              });
            }
            const items = registry.getNearby(vPos, 30);
            for (const item of items) {
               if (!item.pickable || item.carriedBy || item.placedInArea) continue;
               raw.push({
                 type: "OBJECT",
                 id: item.id,
                 distance: vPos.distanceTo(item.position),
                 objectType: item.type,
                 name:item.name,
                 position: { x: item.position.x, y: item.position.y, z: item.position.z }
               });
            }
            return raw;
          })(),
          collidableMeshes
        );

        // FIRE CONSCIOUSNESS ONLY IF A DRIVE IS URGENT (EVENT-DRIVEN)
        if (urgentDrive && !brain.state.isThinking) {
          driveManagerRef.current.markTriggered(urgentDrive.drive);
          const driveContextStr = driveManagerRef.current.toContextString();

          // Convert perceived records back to NearbyEntity for the Brain
          const nearbyEntities: NearbyEntity[] = perceivedEntities.map(p => ({
            type: p.type,
            id: p.id,
            distance: p.distance,
            status: p.isVisible ? p.status : `${p.status} (last seen ${Math.round((Date.now() - p.lastSeen)/1000)}s ago)`,
            objectType: p.objectType,
            name: p.name,
            position: p.position
          }));

          // Areas are still handled via radius for now as they are static world anchors
          const floorItems = perceivedEntities.filter(p => p.type === "OBJECT" && p.isVisible);

          // Semantic Zoning Context
          const currentZone = registry.getSemanticZone(vPos);

          // Perception: Empty areas mapped to the visual floor items
          const seenAreaIds = new Set<string>();
          for (const floorItem of floorItems) {
            const worldObj = floorItem.id ? registry.getById(floorItem.id) : null;
            if (!worldObj || !floorItem.position) continue;

            const allAreas = registry.getAllPlacingAreas();
            let homeArea = null;
            if (worldObj.homeAreaId) {
              const potentialHome = registry.getPlacingAreaById(
                worldObj.homeAreaId,
              );
              if (potentialHome && !potentialHome.currentItem) {
                homeArea = potentialHome;
              }
            }

            const itemPos = new THREE.Vector3(floorItem.position.x, floorItem.position.y, floorItem.position.z);
            const emptyAreas = allAreas
              .filter((a) => !a.currentItem && a.id !== homeArea?.id)
              .map((a) => ({
                area: a,
                distToItem: itemPos.distanceTo(
                  a.position as unknown as THREE.Vector3,
                ),
              }))
              .sort((a, b) => a.distToItem - b.distToItem)
              .slice(0, 3);

            if (homeArea) {
              emptyAreas.unshift({
                area: homeArea,
                distToItem: itemPos.distanceTo(
                  homeArea.position as unknown as THREE.Vector3,
                ),
              });
            }

            for (const { area, distToItem } of emptyAreas) {
              if (seenAreaIds.has(area.id)) continue;
              seenAreaIds.add(area.id);
              const isHome = area.id === worldObj.homeAreaId;
              nearbyEntities.push({
                type: "AREA",
                id: area.id,
                distance: distToItem,
                name: area.name,
                status: isHome ? "empty (home)" : "empty",
                position: {
                  x: area.position.x,
                  y: area.position.y,
                  z: area.position.z,
                },
              });
            }
          }

          if (floorItems.length === 0) {
            const nearbyAreas = registry.getNearbyPlacingAreas(vPos, 15);
            for (const area of nearbyAreas) {
              if (seenAreaIds.has(area.id)) continue;
              seenAreaIds.add(area.id);
              nearbyEntities.push({
                type: "AREA",
                id: area.id,
                distance: vPos.distanceTo(area.position),
                name: area.name,
                status: area.currentItem ? "occupied" : "empty",
                position: {
                  x: area.position.x,
                  y: area.position.y,
                  z: area.position.z,
                },
              });
            }
          }

          const scriptState = taskQueue.getScriptState();

          // Zone context string for LLM
          const zoneCtxStr = ZoneInfluenceSystem.getContextString(agentWorldPos);
          const spatialMemCtxStr = spatialMemoryRef.current.toContextString();
          const personality = personalityRef.current;

          // Update Brain with Semantic Zone and Drives
          const enhancedBehavior = `${currentBehavior} (Zone: ${currentZoneInfluence?.zoneName ?? currentZone})`;

          brain
            .update(
              vPos,
              nearbyEntities,
              enhancedBehavior,
              {
                ...scriptState,
                phase: taskQueue.getCurrentPhase(),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              } as any,
              {
                drives: driveContextStr,
                zoneContext: zoneCtxStr,
                spatialMemory: spatialMemCtxStr,
                personality: {
                  name: personality.name,
                  trait: personality.trait,
                  speechStyle: personality.speechStyle,
                  bio: personality.bio,
                },
              },
            )
            .then((decision) => {
              if (decision) {
                // Fix #1: Guard — if a higher-priority task arrived while we were thinking, skip
                const currentPri = taskQueue.getCurrentTask()?.priority ?? -1;
                const decisionPri = decision.priority || 10;
                console.log(
                  `[useAgentBrain:${id}] Brain decision: op=${decision.operation}, scriptId=${decision.scriptId}, tasks=${decision.tasks?.length ?? 0}, currentPri=${currentPri}, decisionPri=${decisionPri}`,
                );
                if (taskQueue.isBusy() && currentPri >= decisionPri) {
                  console.log(
                    `[useAgentBrain:${id}] Skipping brain decision (priority ${decisionPri}) — active task has priority ${currentPri}`,
                  );
                  return;
                }

                // The conscious brain has made a decision
                if (
                  decision.operation === "INTERFERE_SCRIPT" &&
                  decision.tasks &&
                  decision.tasks.length > 0
                ) {
                  console.log(
                    `[useAgentBrain:${id}] Brain initiating script: ${decision.scriptId}`,
                  );

                  // Generate a fallback script ID if LLM omitted it
                  const scriptId = decision.scriptId || `script_${Date.now()}`;
                  const priority = decision.priority || 10;

                  // Fix #Loop-5: Skip if this same scriptId was fired recently (cooldown)
                  const now = Date.now();
                  if (
                    scriptId === lastScriptIdRef.current &&
                    now - lastScriptTimeRef.current < SCRIPT_COOLDOWN_MS
                  ) {
                    console.log(
                      `[useAgentBrain:${id}] Skipping duplicate script "${scriptId}" (cooldown: ${Math.round((SCRIPT_COOLDOWN_MS - (now - lastScriptTimeRef.current)) / 1000)}s remaining)`,
                    );
                    return;
                  }

                  // Fix #Loop-2: Guard against cancelling a mid-carry script.
                  // Only cancel if the script is queued but not actively executing.
                  const activeScriptId = taskQueue.getCurrentTask()?.scriptId;
                  if (activeScriptId === scriptId) {
                    // Same scriptId is MID-EXECUTION — do NOT cancel and re-issue,
                    // that would drop the carried item on the floor.
                    console.log(
                      `[useAgentBrain:${id}] Brain suppressed: script "${scriptId}" is mid-execution — will not cancel`,
                    );
                    return;
                  }

                  // Safe to cancel queued (not yet running) copies of this script
                  taskQueue.cancelScript(
                    scriptId
                  );

                  // Record injection time for cooldown tracking
                  lastScriptIdRef.current = scriptId;
                  lastScriptTimeRef.current = Date.now();

                  // Inject the tasks into the priority queue
                  // Inject the tasks into the priority queue (Atomic insertion for AgentTaskQueue v2)
                  decision.tasks.forEach((task) => {
                    // Clamp LLM-generated coordinates to world bounds safely
                    // (Ensure they land in walkable donut lab area)
                    if (task.type === "GO_TO" && task.targetPos) {
                      const clamped = clampToDonutRing(task.targetPos);
                      task.targetPos = new THREE.Vector3(
                        clamped.x,
                        clamped.y,
                        clamped.z,
                      );
                    }

                    taskQueue.enqueue({
                      ...task,
                      priority,
                      scriptId,
                    });
                  });
                } else if (decision.operation === "OBSERVE") {
                  // The LLM chose not to interfere.
                  // We don't need to do anything, but let's ensure the subconscious is at least wandering
                  // if the queue is completely empty.
                  if (taskQueue.getCurrentPhase() === "IDLE") {
                    taskQueue.enqueue({
                      type: "WANDER",
                      priority: 0,
                      scriptId: "subconscious_wander",
                    });
                  }
                }
              }
            })
            .catch((error) => {
              console.error(
                `[useAgentBrain:${id}] Brain update failed:`,
                error,
              );
            });
        } // closing if (urgentDrive && !brain.state.isThinking)

        // --- LOCAL UTILITY AI (Subconscious Goal Setting) ---
        // Runs every 3 seconds if no high-priority task is active
        const utilityNow = Date.now();
        if (utilityNow - lastUtilityCheckTimeRef.current > 3000 && !taskQueue.isBusy() && !brain.state.isThinking) {
           lastUtilityCheckTimeRef.current = utilityNow;
           const localTasks = utilityBrainRef.current.evaluate(
             driveManagerRef.current.drives,
             vPos,
             spatialMemoryRef.current
           );
           
           if (localTasks && localTasks.length > 0) {
              console.log(`[useAgentBrain:${id}] UtilityBrain triggered local routine: ${localTasks[0].scriptId}`);
              localTasks.forEach(task => taskQueue.enqueue(task));
           }
        }
      } // closing else (taskQueue.isBusy())
    } // closing manual task & proximity state overrides

    // --- ANIMATION UPDATE (Procedural) ---
    const frustum = frustumRef.current;
    const projScreenMatrix = projScreenMatrixRef.current;
    projScreenMatrix.multiplyMatrices(
      state.camera.projectionMatrix,
      state.camera.matrixWorldInverse,
    );
    frustum.setFromProjectionMatrix(projScreenMatrix);
    const agentSphere = agentSphereRef.current;
    agentSphere.center.copy(vehicle.position as unknown as THREE.Vector3);
    const isVisible = frustum.intersectsSphere(agentSphere);

    if (isVisible) {
      // Apply internal procedural gait engine. We must use real delta, NOT the 15x physical simulation dt.
      const realDelta = Math.min(delta, 0.1);
      const strideLength = 5.5; // AI agents need a longer stride for a relaxed walk

      // Anticipatory look-ahead based on velocity.
      // Compute squared length from raw components to avoid calling any method
      // that differs between YUKA.Vector3 (.squaredLength) and THREE.Vector3
      // (.lengthSq / .lengthSquared) — the TypeScript types alias both to Vector3.
      let targetDirection;
      const vx = vehicle.velocity.x, vy = vehicle.velocity.y, vz = vehicle.velocity.z;
      if (vx * vx + vy * vy + vz * vz > 0.001) {
        const velWorld = new THREE.Vector3(vx, vy, vz).normalize();
        // vehicle.rotation is YUKA.Quaternion at runtime; TS types it as THREE.Quaternion.
        const r = vehicle.rotation as unknown as {
          x: number;
          y: number;
          z: number;
          w: number;
        };
        const qInv = new THREE.Quaternion(r.x, r.y, r.z, r.w).invert();
        targetDirection = velWorld.clone().applyQuaternion(qInv);
      }

      // Map animation state to gait extraState
      const gaitExtraState = (
        animationState === "Sit" || animationState === "Rest" ? "Sit" :
        animationState === "Lean" ? "Lean" :
        animationState === "Think" ? "Think" :
        animationState === "LookAt" ? "LookAt" :
        animationState === "Work" ? "Work" :
        animationState === "Present" ? "Present" :
        animationState === "Wave" ? "Wave" :
        null
      ) as any;

      updateGait(vehicle.velocity as unknown as THREE.Vector3, realDelta, {
        strideLength,
        targetDirection,
        extraState: gaitExtraState,
      });

      const animSpeed = smoothSpeed.current;

      // Stop waving/chatting immediately if the agent starts moving (e.g. gets a new task)
      if (animSpeed > 0.1) {
        if (greetingState.current === "WAVING") greetingState.current = "NONE";
        if (socialState.current === "CHATTING")
          socialState.current = "COOLDOWN";
      }

      // Determine animation state based on task queue phase
      const taskPhase = taskQueue.getCurrentPhase();
      const taskType = taskQueue.getCurrentTask()?.type;

      let newState: "Idle" | "Walk" | "Run" | "Wave" | "Sit" | "Lean" | "Think" | "Work" | "Present" | "Rest" | "LookAt" = "Idle";
      if (greetingState.current === "WAVING") {
        newState = "Wave";
      } else if (taskPhase === "SEATED") {
        newState = taskType === "REST" ? "Rest" : "Sit";
      } else if (taskPhase === "LEANING") {
        newState = "Lean";
      } else if (taskPhase === "GAZING") {
        newState = taskType === "CONTEMPLATE" ? "Think" : "LookAt";
      } else if (taskPhase === "PRESENTING") {
        newState = "Present";
      } else if (taskPhase === "EMOTING") {
        newState = "Idle"; // Handled by gesture in gait
      } else if (taskPhase === "ACTION_START" && (taskType === "INTERACT" || taskType === "PICK_NEARBY" || taskType === "PLACE_INVENTORY")) {
        newState = "Work";
      } else if (animSpeed > 0.1) {
        newState = "Walk";
      }

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

        // Attention & Head Tracking
        const attentionTarget = sensorySystemRef.current.getAttentionTarget();
        
        if (attentionTarget) {
          const toTarget = new THREE.Vector3().subVectors(attentionTarget, vehicle.position);
          const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(groupRef.current!.quaternion);
          toTarget.normalize();

          const dot = forward.dot(toTarget);
          const cross = new THREE.Vector3().crossVectors(forward, toTarget);

          // Realistic head look constraints
          if (dot > 0.1) {
            const targetNeckY = cross.y * 1.5;
            const clampedNeckY = THREE.MathUtils.clamp(targetNeckY, -1.0, 1.0);
            j.neck.rotation.y = THREE.MathUtils.lerp(j.neck.rotation.y, clampedNeckY, 0.1);

            // Vertical look
            const targetNeckX = (attentionTarget.y - (vehicle.position.y + 1.5)) * 0.5;
            const clampedNeckX = THREE.MathUtils.clamp(targetNeckX, -0.5, 0.5);
            j.neck.rotation.x = THREE.MathUtils.lerp(j.neck.rotation.x, -clampedNeckX, 0.1);
          } else {
            j.neck.rotation.y = THREE.MathUtils.lerp(j.neck.rotation.y, 0, 0.05);
            j.neck.rotation.x = THREE.MathUtils.lerp(j.neck.rotation.x, 0, 0.05);
          }
        } else {
          // Idle ambient gazing
          const t = state.clock.elapsedTime;
          j.neck.rotation.y = THREE.MathUtils.lerp(j.neck.rotation.y, Math.sin(t * 0.4) * 0.2, 0.03);
          j.neck.rotation.x = THREE.MathUtils.lerp(j.neck.rotation.x, Math.sin(t * 0.27) * 0.05, 0.03);
        }

        if (greetingState.current === "WAVING") {
          const waveSpeed = 8;
          const wave = Math.sin(state.clock.elapsedTime * waveSpeed) * 0.4;

          // Override arm rotation for waving
          j.rightArm.shoulder.rotation.x = THREE.MathUtils.lerp(
            j.rightArm.shoulder.rotation.x,
            -0.25 + wave * 0.08,
            0.1,
          );
          j.rightArm.shoulder.rotation.z = THREE.MathUtils.lerp(
            j.rightArm.shoulder.rotation.z,
            -2.5 + wave,
            0.1,
          );
          j.rightArm.elbow.rotation.x = THREE.MathUtils.lerp(
            j.rightArm.elbow.rotation.x,
            -0.35 + wave * 0.2,
            0.1,
          );
          j.rightArm.elbow.rotation.z = THREE.MathUtils.lerp(
            j.rightArm.elbow.rotation.z,
            -0.8 + wave * 0.2,
            0.1,
          );
        }
      } // End if (j.hips && j.torso ...)
    } // End if (isVisible)

    // Carried items are hidden (invisible) while being transported.
    // They reappear at the destination when placed.

    // Update Minimap Position (Throttled to reduce state updates)
    const currentPos = new THREE.Vector3(
      vehicle.position.x,
      vehicle.position.y,
      vehicle.position.z,
    );
    if (lastMinimapPos.current.distanceToSquared(currentPos) > 1.0) {
      lastMinimapPos.current.copy(currentPos);
      setAgentPosition(id, currentPos);
      
      // Emit movement heat
      InterestMap.getInstance().addHeat(currentPos, 0.2);
    }
  });

  return {
    vehicle: vehicleRef.current,
    brain: brainRef.current,
    animationState,
  };
}
