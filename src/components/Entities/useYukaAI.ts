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
import {
  getAssignedStorageTable,
  getTableCenterPosition,
  getWorkbenchCenterPosition,
} from "@/config/agentRoutines";

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
        type: "MORNING_CHECK",
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
        type: "BENCH_CHECK",
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
            const toPlayer = new THREE.Vector3(
              playerRef.current.position.x - vehicle.position.x,
              0,
              playerRef.current.position.z - vehicle.position.z,
            );
            if (toPlayer.lengthSq() > 0.01) {
              const targetQuat = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, 1),
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
          const toPlayer = new THREE.Vector3(
            playerRef.current.position.x - vehicle.position.x,
            0,
            playerRef.current.position.z - vehicle.position.z,
          );
          if (toPlayer.lengthSq() > 0.01) {
            const targetQuat = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
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
    // SKIP BRAIN IF MANUAL TASK IS ACTIVE (Task Queue Override)
    if (hasManualTask) {
      // Skip LLM brain entirely — manual tasks control steering
    } else if (
      playerProximityState.current === "GREETING" ||
      playerProximityState.current === "CHATTING"
    ) {
      // SKIP BRAIN: Agent is interacting with player — thoughts are set by proximity state machine
    } else if (frameRef.current % brainIntervalRef.current === 0) {
      // SKIP BRAIN IF FOLLOWING (Manual Override)
      if (followingAgentId === id) {
        // Follow mode - handled above via task queue or legacy
      } else if (
        taskQueue.isBusy() &&
        (taskQueue.getCurrentTask()?.priority ?? 0) > 0
      ) {
        // SKIP BRAIN: A conscious script is actively running — don't poll LLM
        console.log(
          `[useYukaAI:${id}] Brain gate: SKIPPING (busy, priority=${taskQueue.getCurrentTask()?.priority}, phase=${taskQueue.getCurrentPhase()})`,
        );
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

        // Perception: Nearby pickable items — ONLY show items on the floor.
        // Items already placed on a surface are hidden from the agent brain to
        // prevent "re-organize" loops. Perception = source of truth for what needs fixing.
        const registry = InteractableRegistry.getInstance();
        const nearbyItems = registry.getNearby(
          vehicle.position as unknown as THREE.Vector3,
          15,
        );

        const floorItems: typeof nearbyItems = [];
        for (const item of nearbyItems) {
          if (!item.pickable) continue;
          // Only surface items that are on the floor (not carried, not placed on a surface)
          const isOnFloor = !item.carriedBy && !item.placedInArea;
          const isClaimed = registry.isItemClaimed(item.id);
          if (!isOnFloor) continue; // ← key change: skip placed/carried items entirely

          nearbyEntities.push({
            type: "OBJECT",
            id: item.id,
            distance: vehicle.position.distanceTo(
              item.position as unknown as YUKA.Vector3,
            ),
            objectType: item.type,
            name: item.name,
            status: isClaimed ? "on floor (claimed)" : "on floor",
          });
          floorItems.push(item);
        }

        // Perception: For each on-floor item, include empty areas sorted by proximity
        // to the ITEM (not the agent) so the LLM always gets relevant, valid targets.
        const seenAreaIds = new Set<string>();
        for (const floorItem of floorItems) {
          const allAreas = registry.getAllPlacingAreas();

          // Identify home area if it's currently empty
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
            .filter((a) => !a.currentItem && a.id !== homeArea?.id) // only empty slots, exclude home (will add it explicitly)
            .map((a) => ({
              area: a,
              distToItem: floorItem.position.distanceTo(
                a.position as unknown as THREE.Vector3,
              ),
            }))
            .sort((a, b) => a.distToItem - b.distToItem)
            .slice(0, 3); // show the 3 nearest empty areas per floor item

          // Prepend home area if available
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

        // If no floor items, also show nearby areas (for context / follow tasks etc.)
        // but suppress them when there are floor items to keep the prompt focused.
        if (floorItems.length === 0) {
          const nearbyAreas = registry.getNearbyPlacingAreas(
            vehicle.position as unknown as THREE.Vector3,
            15,
          );
          for (const area of nearbyAreas) {
            if (seenAreaIds.has(area.id)) continue;
            seenAreaIds.add(area.id);
            nearbyEntities.push({
              type: "AREA",
              id: area.id,
              distance: vehicle.position.distanceTo(
                area.position as unknown as YUKA.Vector3,
              ),
              name: area.name,
              status: area.currentItem ? "occupied" : "empty",
            });
          }
        }

        // Fix B: Include task queue state so the LLM knows what it's currently doing
        const scriptState = taskQueue.getScriptState();

        // Update Brain
        brain
          .update(
            vehicle.position as unknown as THREE.Vector3,
            nearbyEntities,
            currentBehavior,
            {
              ...scriptState,
              phase: taskQueue.getCurrentPhase(),
            },
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
                decision.tasks.forEach((task) => {
                  if (
                    task.type === "FETCH_AND_PLACE" &&
                    task.itemId &&
                    task.destAreaId
                  ) {
                    const registry = InteractableRegistry.getInstance();
                    let item = registry.getById(task.itemId);
                    // Fallback: LLM may return the item's display name instead of its ID
                    // e.g. "Desktop PC" instead of "desktop-pc"
                    let resolvedItemId = task.itemId;
                    if (!item) {
                      const byName = registry.getByName(task.itemId);
                      if (byName) {
                        console.log(
                          `[useYukaAI:${id}] Resolved item name "${task.itemId}" → id "${byName.id}"`,
                        );
                        item = byName;
                        resolvedItemId = byName.id;
                      }
                    }
                    if (!item) {
                      console.warn(
                        `[useYukaAI:${id}] Item ${task.itemId} not found — LLM used a hallucinated ID`,
                      );
                      // Fix #Loop-4: Write a failure memory so the LLM gets a negative
                      // signal instead of silence. Use local tags derived from the item ID.
                      memoryStream
                        .add(
                          "ACTION",
                          `FAILED: Item '${task.itemId}' not found. The ID was invalid — this item does not exist in the registry. Do not use this ID again.`,
                          [`id:${task.itemId}`, "entity:object"],
                        )
                        .catch(() => {});
                      return;
                    }

                    if (item.carriedBy && item.carriedBy !== id) {
                      console.warn(
                        `[useYukaAI:${id}] Item ${resolvedItemId} is carried by ${item.carriedBy}, aborting fetch.`,
                      );
                      return;
                    }

                    // Guard: skip items already placed on a surface — they're not misplaced
                    if (item.placedInArea) {
                      console.log(
                        `[useYukaAI:${id}] Item ${resolvedItemId} is already placed in area "${item.placedInArea}" — skipping FETCH_AND_PLACE`,
                      );
                      return;
                    }

                    // Smart area resolution — with name fallback for LLM hallucinations
                    let resolvedAreaId = task.destAreaId;
                    let area = registry.getPlacingAreaById(resolvedAreaId);
                    // Fallback: try matching by display name
                    if (!area) {
                      const byName = registry.getAreaByName(task.destAreaId);
                      if (byName) {
                        console.log(
                          `[useYukaAI:${id}] Resolved area name "${task.destAreaId}" → id "${byName.id}"`,
                        );
                        area = byName;
                        resolvedAreaId = byName.id;
                      }
                    }
                    if (!area) {
                      // Fix #Loop-4: Area ID is hallucinated — write failure memory
                      console.warn(
                        `[useYukaAI:${id}] Area '${task.destAreaId}' not found — LLM used a hallucinated area ID`,
                      );
                      memoryStream
                        .add(
                          "ACTION",
                          `FAILED: Area '${task.destAreaId}' does not exist in the registry. Do not use this area ID again.`,
                          [`id:${task.destAreaId}`, "entity:area"],
                        )
                        .catch(() => {});
                      return;
                    }
                    if (area.currentItem) {
                      const alt = findAlternativeArea(resolvedAreaId, registry);
                      if (alt) {
                        resolvedAreaId = alt;
                        console.log(
                          `[useYukaAI:${id}] Area ${task.destAreaId} is full, using alternative ${alt}`,
                        );
                      } else {
                        console.warn(
                          `[useYukaAI:${id}] All slots for ${task.destAreaId} are full.`,
                        );
                      }
                    }

                    if (item.carriedBy === id) {
                      taskQueue.enqueue({
                        type: "PLACE_INVENTORY",
                        priority,
                        scriptId,
                        destAreaId: resolvedAreaId,
                      });
                    } else {
                      taskQueue.enqueue({
                        type: "PICK_NEARBY",
                        priority,
                        scriptId,
                        itemId: resolvedItemId,
                      });
                      taskQueue.enqueue({
                        type: "PLACE_INVENTORY",
                        priority,
                        scriptId,
                        destAreaId: resolvedAreaId,
                      });
                    }
                  } else {
                    // Fix #3: Clamp LLM-generated coordinates to world bounds
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
                  }
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
          });
      }
    }

    // --- ANIMATION UPDATE (Procedural) ---
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
