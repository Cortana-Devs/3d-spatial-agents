// Fix #2: Removed @ts-nocheck — targeted @ts-ignore used on Yuka↔Three casts below
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
import { findAlternativeArea } from "@/lib/nlp-parser";
import { memoryStream } from "@/lib/memory/MemoryStream";
import { getRandomPhrase } from "@/lib/audio/phraseBank";
import {
  getAssignedStorageTable,
  getTableCenterPosition,
  getWorkbenchCenterPosition,
} from "@/config/agentRoutines";
import { DriveManager } from "@/lib/agent-drives";

// Fix #1/#3: World bounds for clamping LLM-generated coordinates
const WORLD_BOUNDS = { minX: -100, maxX: 100, minZ: -75, maxZ: 75 };

function clampToWorldBounds(pos: { x: number; y: number; z: number }) {
  return {
    x: Math.max(WORLD_BOUNDS.minX, Math.min(WORLD_BOUNDS.maxX, pos.x)),
    y: pos.y,
    z: Math.max(WORLD_BOUNDS.minZ, Math.min(WORLD_BOUNDS.maxZ, pos.z)),
  };
}

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
  const socialCheckTimer = useRef(0);

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
  const frameRef = useRef(0);
  const lookAheadRef = useRef(new THREE.Vector3());
  const sensorPosRef = useRef(new THREE.Vector3());
  const safetyTargetRef = useRef(new THREE.Vector3(0, 0, -330));
  const toSafetyRef = useRef(new THREE.Vector3());
  const driveManagerRef = useRef(new DriveManager());

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

  // Fix #Loop-5: Deduplicate repeated same-script decisions — prevent re-queuing
  // the exact same scriptId within a cooldown window (30s).
  const lastScriptIdRef = useRef<string>("");
  const lastScriptTimeRef = useRef<number>(0);
  const SCRIPT_COOLDOWN_MS = 30_000;

  // --- TASK QUEUE (Manual Task Assignment) ---
  const taskQueueRef = useRef(AgentTaskRegistry.getInstance().getOrCreate(id));

  // --- MORNING CHECK (once per agent on start, then switch to default) ---
  const hasEnqueuedMorningCheckRef = useRef(false);
  useEffect(() => {
    if (hasEnqueuedMorningCheckRef.current) return;
    const tableId = getAssignedStorageTable(id);
    if (!tableId) return;

    const timer = setTimeout(() => {
      if (hasEnqueuedMorningCheckRef.current) return;
      const tablePos = getTableCenterPosition(tableId);
      if (!tablePos) return;

      hasEnqueuedMorningCheckRef.current = true;
      const queue = AgentTaskRegistry.getInstance().getOrCreate(id);
      const scriptId = "morning_check";
      const priority = 10;

      queue.enqueue({
        type: "GO_TO",
        priority,
        scriptId,
        targetPos: tablePos,
      });
      queue.enqueue({
        type: "WAIT",
        priority,
        scriptId,
        duration: 2,
      });
      queue.enqueue({
        type: "MORNING_CHECK" as any,
        priority,
        scriptId,
      });
      // After storage table check, walk to main lab workbench for bench readiness
      const benchPos = getWorkbenchCenterPosition();
      queue.enqueue({
        type: "GO_TO",
        priority,
        scriptId,
        targetPos: benchPos,
      });
      queue.enqueue({
        type: "WAIT",
        priority,
        scriptId,
        duration: 2,
      });
      queue.enqueue({
        type: "BENCH_CHECK" as any,
        priority,
        scriptId,
      });
      queue.enqueue({
        type: "WANDER",
        priority: 0,
        scriptId: "subconscious_wander",
      });

      console.log(
        `[useYukaAI:${id}] Enqueued morning check (table: ${tableId}), then default WANDER`,
      );
    }, 1500);

    return () => clearTimeout(timer);
  }, [id]);

  // Show "Meeting in the meeting room" in thought bubble when another agent announces a meeting
  useEffect(() => {
    const handler = (e: Event) => {
      const { agentId: targetId, message } = (e as CustomEvent<{ agentId: string; message: string }>).detail;
      if (targetId !== id) return;
      const brain = brainRef.current;
      brain.state.thought = message;
      brain.state.lastThoughtTime = Date.now();
    };
    window.addEventListener("agent-meeting-announcement", handler);
    return () => window.removeEventListener("agent-meeting-announcement", handler);
  }, [id]);

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

    // Sync initial position — XZ from the group reference is correct.
    // Y is *always* forced to FLOOR_Y (5.5) regardless of where groupRef.current
    // drifted to in previous frames. This reflects the real lab floor surface 
    // at Y=5.5 (ground-main).
    const FLOOR_Y = 5.5; 
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

    const steeringCmd: SteeringCommand = taskQueue.update(
      delta,
      vehiclePos,
      playerPos,
    );
    const hasManualTask = taskQueue.isBusy();

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

          const hits = raycaster.intersectObjects(collidableMeshes, true);
          if (hits.length > 0) {
            const hit = hits[0];
            const dist = hit.distance;

            let normal = normalRef.current.set(0, 0, 0);
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

    // --- PLAYER PROXIMITY CHAT ---
    // Check if the player is nearby and trigger greeting/chat flow
    const brain = brainRef.current;
    if (playerRef.current && !hasManualTask) {
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
          greetingState.current = "WAVING";
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
            })
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

      rayOrigin.set(
        vehicle.position.x,
        vehicle.position.y + 20.0, // Increased to match player controller robustness
        vehicle.position.z,
      );
      raycaster.set(rayOrigin, rayDirRef.current);

      const hits = raycaster.intersectObjects(collidableMeshes, true);
      let groundHeight = -100;
      let foundGround = false;

      // Maximum height the agent can "step up" onto.
      // Increased to 2.0 to ensure recovery if agents ever fall below floor slab. 
      // Higher than this is still ignored as furniture (workbenches, tables).
      const MAX_STEP_UP = 2.0;
      const currentY = vehicle.position.y;

      if (hits.length > 0) {
        // Filter out ceilings
        const validHits = hits.filter(
          (h) => !h.object.name.includes("Ceiling"),
        );

        // Separate hits into reachable (floor-level) vs elevated (furniture)
        let bestFloorHit = -100;  // Lowest valid surface (the actual floor)
        let bestStepHit = -100;   // Surfaces within step-up range

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

      // Safety clamp: if agent falls into the void, snap back to ground.
      const FLOOR_Y = 5.5;
      if (vehicle.position.y < -15) { // Void fall safety
        vehicle.position.y = FLOOR_Y;
        groupRef.current!.position.y = FLOOR_Y;
      }
    }

    // --- BRAIN UPDATE ---
    // SKIP BRAIN IF MANUAL TASK IS ACTIVE (Task Queue Override)
    if (hasManualTask) {
      // Skip LLM brain entirely — manual tasks control steering
    } else if (
      playerProximityState.current === "GREETING" ||
      playerProximityState.current === "CHATTING"
    ) {
      // SKIP BRAIN: Agent is interacting with player — thoughts are set by proximity state machine
    } else if (frameRef.current % brainIntervalRef.current === 0) {
      // Throttle brain based on distance
      let shouldSkipDueToDistance = false;
      if (playerRef.current) {
        const d = vehicle.position.distanceTo(playerRef.current.position as unknown as YUKA.Vector3);
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
          `[useYukaAI:${id}] Brain gate: SKIPPING (busy, priority=${taskQueue.getCurrentTask()?.priority}, phase=${taskQueue.getCurrentPhase()})`,
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
        const nearbyFloorCount = nearbyAnyItems.filter(i => i.pickable && !i.carriedBy && !i.placedInArea).length;
        const pDist = playerRef.current ? vehicle.position.distanceTo(playerRef.current.position as unknown as YUKA.Vector3) : null;
        const isIdle = currentBehavior === "IDLE" || currentBehavior === "WANDERING";

        driveManagerRef.current.update(delta, {
           nearbyFloorItems: nearbyFloorCount,
           playerDistance: pDist,
           nearbyAgentCount: socialState.current !== "NONE" ? 1 : 0,
           isIdle
        });

        const urgentDrive = driveManagerRef.current.getUrgentDrive();
        
        // FIRE CONSCIOUSNESS ONLY IF A DRIVE IS URGENT (EVENT-DRIVEN)
        if (urgentDrive && !brain.state.isThinking) {
        
          driveManagerRef.current.markTriggered(urgentDrive.drive);
          const driveContextStr = driveManagerRef.current.toContextString();

          const nearbyEntities: NearbyEntity[] = [];

          // Perception Logic
          if (playerRef.current && pDist !== null && pDist < 30) {
            nearbyEntities.push({
              type: "PLAYER",
              id: "player-01",
              distance: pDist,
              status: "Active",
            });
          }

          // Perception: Nearby pickable items — with LINE OF SIGHT Raycasting
          const floorItems: typeof nearbyAnyItems = [];
          const agentEye = new THREE.Vector3(vPos.x, vPos.y + 1.5, vPos.z);
          const dir = new THREE.Vector3();

          for (const item of nearbyAnyItems) {
            if (!item.pickable) continue;
            // Only surface items that are on the floor (not carried, not placed on a surface)
            const isOnFloor = !item.carriedBy && !item.placedInArea;
            const isClaimed = registry.isItemClaimed(item.id);
            if (!isOnFloor) continue;

            const itemPos = item.position as unknown as THREE.Vector3;
            dir.subVectors(itemPos, agentEye);
            const dist = dir.length();
            dir.normalize();

            // Line-of-sight check
            raycasterRef.current.set(agentEye, dir);
            const hits = raycasterRef.current.intersectObjects(collidableMeshes);
            let occluded = false;
            for (const hit of hits) {
               // If hit object is closer than item (minus a small margin to allow item lying on floor)
               if (hit.distance < dist - 0.5) {
                 // Ignore standard flat floors/ceilings
                 if (!hit.object.name.includes("Floor") && !hit.object.name.includes("Ceiling")) {
                    occluded = true;
                    break;
                 }
               }
            }

            if (occluded) continue; // Item is behind a wall or desk!

            nearbyEntities.push({
              type: "OBJECT",
              id: item.id,
              distance: dist,
              objectType: item.type,
              name: item.name,
              status: isClaimed ? "on floor (claimed)" : "on floor",
            });
            floorItems.push(item);
          }

          // Semantic Zoning Context
          const currentZone = registry.getSemanticZone(vPos);

          // Perception: Empty areas mapped to the visual floor items
          const seenAreaIds = new Set<string>();
          for (const floorItem of floorItems) {
            const allAreas = registry.getAllPlacingAreas();
            let homeArea = null;
            if (floorItem.homeAreaId) {
              const potentialHome = registry.getPlacingAreaById(
                floorItem.homeAreaId,
              );
              if (potentialHome && !potentialHome.currentItem) {
                homeArea = potentialHome;
              }
            }

            const emptyAreas = allAreas
              .filter((a) => !a.currentItem && a.id !== homeArea?.id)
              .map((a) => ({
                area: a,
                distToItem: floorItem.position.distanceTo(
                  a.position as unknown as THREE.Vector3,
                ),
              }))
              .sort((a, b) => a.distToItem - b.distToItem)
              .slice(0, 3);

            if (homeArea) {
              emptyAreas.unshift({
                area: homeArea,
                distToItem: floorItem.position.distanceTo(
                  homeArea.position as unknown as THREE.Vector3,
                ),
              });
            }

            for (const { area, distToItem } of emptyAreas) {
              if (seenAreaIds.has(area.id)) continue;
              seenAreaIds.add(area.id);
              const isHome = area.id === floorItem.homeAreaId;
              nearbyEntities.push({
                type: "AREA",
                id: area.id,
                distance: distToItem,
                name: area.name,
                status: isHome ? "empty (home)" : "empty",
              });
            }
          }

          if (floorItems.length === 0) {
            const nearbyAreas = registry.getNearbyPlacingAreas(
              vPos,
              15,
            );
            for (const area of nearbyAreas) {
              if (seenAreaIds.has(area.id)) continue;
              seenAreaIds.add(area.id);
              nearbyEntities.push({
                type: "AREA",
                id: area.id,
                distance: vPos.distanceTo(
                  area.position,
                ),
                name: area.name,
                status: area.currentItem ? "occupied" : "empty",
              });
            }
          }

          const scriptState = taskQueue.getScriptState();

          // Update Brain with Semantic Zone and Drives
          const enhancedBehavior = `${currentBehavior} (Current Zone: ${currentZone})`;

          brain
            .update(
              vPos,
              nearbyEntities,
              enhancedBehavior,
              {
                ...scriptState,
                phase: taskQueue.getCurrentPhase(),
                drives: driveContextStr // Passed through taskState arbitrarily for now
              } as any,
            )
          .then((decision) => {
            if (decision) {
              // Fix #1: Guard — if a higher-priority task arrived while we were thinking, skip
              const currentPri = taskQueue.getCurrentTask()?.priority ?? -1;
              const decisionPri = decision.priority || 10;
              console.log(
                `[useYukaAI:${id}] Brain decision: op=${decision.operation}, scriptId=${decision.scriptId}, tasks=${decision.tasks?.length ?? 0}, currentPri=${currentPri}, decisionPri=${decisionPri}`,
              );
              if (taskQueue.isBusy() && currentPri >= decisionPri) {
                console.log(
                  `[useYukaAI:${id}] Skipping brain decision (priority ${decisionPri}) — active task has priority ${currentPri}`,
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
                  `[useYukaAI:${id}] Brain initiating script: ${decision.scriptId}`,
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
                    `[useYukaAI:${id}] Skipping duplicate script "${scriptId}" (cooldown: ${Math.round((SCRIPT_COOLDOWN_MS - (now - lastScriptTimeRef.current)) / 1000)}s remaining)`,
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
                    `[useYukaAI:${id}] Brain suppressed: script "${scriptId}" is mid-execution — will not cancel`,
                  );
                  return;
                }

                // Safe to cancel queued (not yet running) copies of this script
                taskQueue.cancelScript(
                  scriptId,
                  "Replaced by new brain decision",
                );

                // Record injection time for cooldown tracking
                lastScriptIdRef.current = scriptId;
                lastScriptTimeRef.current = Date.now();

                // Inject the tasks into the priority queue
                // Inject the tasks into the priority queue (Atomic insertion for AgentTaskQueue v2)
                decision.tasks.forEach((task) => {
                  // Clamp LLM-generated coordinates to world bounds safely
                  if (task.type === "GO_TO" && task.targetPos) {
                    const clamped = clampToWorldBounds(task.targetPos);
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
            console.error(`[useYukaAI:${id}] Brain update failed:`, error);
          });
        } // closing if (urgentDrive && !brain.state.isThinking)
      } // closing else (taskQueue.isBusy())
    } // closing manual task & proximity state overrides

    // --- ANIMATION UPDATE (Procedural) ---
    const frustum = frustumRef.current;
    const projScreenMatrix = projScreenMatrixRef.current;
    projScreenMatrix.multiplyMatrices(state.camera.projectionMatrix, state.camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);
    const agentSphere = agentSphereRef.current;
    agentSphere.center.copy(vehicle.position as unknown as THREE.Vector3);
    const isVisible = frustum.intersectsSphere(agentSphere);

    if (isVisible) {
    // Apply internal procedural gait engine. We must use real delta, NOT the 15x physical simulation dt.
    const realDelta = Math.min(delta, 0.1);
    const strideLength = 5.5; // AI agents need a longer stride for a relaxed walk
    updateGait(vehicle.velocity as unknown as THREE.Vector3, realDelta, {
      strideLength,
    });

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
          0.1
        );
        j.rightArm.elbow.rotation.z = THREE.MathUtils.lerp(
          j.rightArm.elbow.rotation.z,
          -0.8 + wave * 0.2,
          0.1
        );
      }
    } // End if (j.hips && j.torso ...)
    } // End if (isVisible)

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
