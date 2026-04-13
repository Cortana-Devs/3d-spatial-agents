/* eslint-disable react-hooks/immutability */
// Fix #2: Removed @ts-nocheck — targeted @ts-ignore used on Yuka↔Three casts below
import { useEffect, useRef, useState } from "react";
import * as YUKA from "yuka";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import AIManager from "@/systems/AIManager";
import { useGameStore } from "@/store/gameStore";
import { DESK_TO_CHAIR } from "@/config/facilityLabDeskAssignments";
import { useProceduralGait } from "@/components/agent/useProceduralGait";
import { useAgentVehicle } from "@/components/agent/useAgentVehicle";

import { ClientBrain } from "@/systems/ClientBrain";
import type { NearbyEntity } from "@/lib/agent-brain";
import { InteractableRegistry } from "@/systems/InteractableRegistry";
import type { RapierRigidBody } from "@react-three/rapier";
import { AgentTaskQueue, AgentTaskRegistry } from "@/systems/AgentTaskQueue";
import { InterAgentComms } from "@/systems/InterAgentComms";
import type { SteeringCommand } from "@/systems/AgentTaskQueue";
import { findAlternativeArea } from "@/lib/nlp-parser";
import { memoryStream } from "@/lib/memory/MemoryStream";
import { getRandomPhrase } from "@/lib/audio/phraseBank";
import { DriveManager } from "@/lib/agent-drives";
import { ZoneInfluenceSystem } from "@/systems/ZoneInfluenceSystem";
import { POIRegistry } from "@/systems/POIRegistry";
import { SpatialMemory } from "@/lib/memory/SpatialMemory";
import { getPersonality } from "@/config/agentPersonalities";
import { 
  getZoneCenterPosition, 
  getNearestBench, 
  ALL_ZONE_IDS,
  buildDefaultResearchFacilityIdleLocations
} from "@/config/facilityLabRoutines";
import {
  SensorySystem,
  HearingBus,
  type HearingEvent,
  type PerceptionRecord,
} from "@/lib/SensorySystem";
import { UtilityBrain } from "@/lib/UtilityBrain";
import { formatWorldTasksForPrompt } from "@/lib/worldTasks";
import { applyWorldTaskStepCompletion } from "@/lib/worldTasks";
import { InterestMap } from "@/store/InterestMap";
import { SpatialFamiliarity } from "@/lib/SpatialFamiliarity";
import {
  clampToFacilityRing,
  getEffectiveCooldownSec,
  resolveCurrentBehavior,
} from "@/lib/agent-brain-utils";
import { MAX_SAFE_RADIUS, RING_INNER_RADIUS } from "@/constants/simulation";
import { getPodDeployExitPosition } from "@/config/agentPods";
import {
  MAX_STEP_UP,
  PLAYER_COOLDOWN_TIME,
  PLAYER_GREET_DISTANCE,
  PLAYER_LEAVE_DISTANCE,
  SCRIPT_COOLDOWN_MS,
  STUCK_TIMER_THRESHOLD_SEC,
} from "@/constants/simulation";
import {
  BRAIN_FAILURE_RETRY_SEC,
  LLM_COOLDOWN_FAR_SEC,
  UTILITY_CHECK_INTERVAL_MS,
} from "@/constants/simulation";
import { getIdleExplorer } from "@/systems/autonomy/IdleExplorer";
import {
  applyConversationOpenStance,
  computeVehicleNeighborEffects,
} from "@/systems/autonomy/ProxemicsSystem";
import { MovementPersonality } from "@/systems/behavior/MovementPersonality";
import { GazeController } from "@/systems/behavior/GazeController";
import { IdleBehaviorSystem } from "@/systems/behavior/IdleBehaviorSystem";
import { DeliberationLayer } from "@/systems/behavior/DeliberationLayer";
import { ProxemicsController } from "@/systems/autonomy/ProxemicsController";
import { PlayerAwarenessModule } from "@/systems/behavior/PlayerAwarenessModule";
import { MovementHumanizer } from "@/systems/behavior/MovementHumanizer";
import {
  perfBeginAgentFrame,
  perfEndAgentFrame,
} from "@/debug/agentPerformanceProbe";

export function useAgentBrain(
  id: string,
  groupRef: React.RefObject<THREE.Group | null>,
  playerRef: React.RefObject<THREE.Group | null>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  joints: React.MutableRefObject<any>,
) {
  const vehicleRef = useRef<YUKA.Vehicle | null>(null);
  const rigidbodyRef = useRef<RapierRigidBody>(null);
  const aiManager = AIManager.getInstance();
  const obstacles = useGameStore((state) => state.obstacles);
  const collidableMeshes = useGameStore((state) => state.collidableMeshes);

  // Remote Logic: Inspection
  const inspectedAgentId = useGameStore((state) => state.inspectedAgentId);
  const setInspectedAgentData = useGameStore(
    (state) => state.setInspectedAgentData,
  );
  const followingAgentId = useGameStore((state) => state.followingAgentId);
  const setAgentPosition = useGameStore((state) => state.setAgentPosition);

  const lastMinimapPos = useRef(new THREE.Vector3(0, -999, 0));
  const lastPerceivedEntitiesRef = useRef<PerceptionRecord[]>([]);

  // Player Proximity Chat State
  const playerAwarenessRef = useRef(new PlayerAwarenessModule());
  const playerProximityCooldown = useRef(0);

  // Optimization Refs
  const raycasterRef = useRef(new THREE.Raycaster());
  const rayOriginRef = useRef(new THREE.Vector3());
  const rayDirRef = useRef(new THREE.Vector3(0, -1, 0));
  const lastInspectedState = useRef("");
  const lastInspectedThought = useRef("");
  const frameRef = useRef(0);
  const lookAheadRef = useRef(new THREE.Vector3());
  const lastCornerAnglesRef = useRef<number[] | null>(null);
  const chatOpenStanceElapsedRef = useRef(0);
  const sensorPosRef = useRef(new THREE.Vector3());
  const safetyTargetRef = useRef(new THREE.Vector3(0, 0, -330));
  const toSafetyRef = useRef(new THREE.Vector3());
  const driveManagerRef = useRef(new DriveManager());
  const spatialMemoryRef = useRef(SpatialMemory.getInstance(id));
  const personalityRef = useRef(getPersonality(id));
  const sensorySystemRef = useRef<SensorySystem>(new SensorySystem(id));
  const utilityBrainRef = useRef<UtilityBrain>(new UtilityBrain(id));
  const lastUtilityCheckTimeRef = useRef(0);
  // Separate throttle for the idle-fallback re-queue to prevent per-frame spam
  const lastIdleFallbackTimeRef = useRef(0);
  // Zone update timer (throttle zone tracking to every 2 seconds)
  const zoneUpdateTimer = useRef(0);
  const poiUpdateTimer = useRef(0);
  const familiarityRef = useRef<SpatialFamiliarity>(new SpatialFamiliarity());
  const stuckTimer = useRef(0);
  const lastStuckCheckPos = useRef(new THREE.Vector3());
  const prevTaskPhaseRef = useRef<string>("IDLE");
  const autoRestIdleSecRef = useRef(0);
  
  const movementPersonalityRef = useRef(new MovementPersonality(driveManagerRef.current.drives, getPersonality(id)));
  const gazeControllerRef = useRef(new GazeController(id));
  const idleBehaviorSystemRef = useRef(new IdleBehaviorSystem(id));
  const gazeTickTimerRef = useRef(0);
  
  /** Seconds of sustained empty queue before auto REST_IN_POD */
  const AUTO_REST_IDLE_SEC = 12;

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
  /** Prior-frame peer count within 5m for maxSpeed (paired with post-wall neighbor pass). */
  const crowdNearLagRef = useRef(0);
  const zoneSamplePosRef = useRef(new THREE.Vector3());
  const lastGroundRayXZRef = useRef({ x: 0, z: 0 });
  const lastGroundHitRef = useRef({ y: 0, ok: false });

  useAgentVehicle(id, groupRef, obstacles, vehicleRef, lastGroundedPosRef);

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
  /** Seconds since epoch; LLM cooldown from getEffectiveCooldownSec */
  const lastBrainCallTimeRef = useRef(0);

  const updateAgentCognition = useGameStore((s) => s.updateAgentCognition);
  const updateAgentStatus = useGameStore((s) => s.updateAgentStatus);

  // Sync thought updates to store for Research Dashboard oversight
  useEffect(() => {
    const brain = brainRef.current;
    let lastThought = "";
    
    const interval = setInterval(() => {
      // 1. Throttling for background tabs
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

      if (brain.state.thought !== lastThought) {
        lastThought = brain.state.thought;
        updateAgentCognition(id, lastThought);
      }
    }, 500); // Check every 500ms for cognitive updates
    
    return () => clearInterval(interval);
  }, [id, updateAgentCognition]);

  // Sync status updates
  useEffect(() => {
    const brain = brainRef.current;
    let lastThinking = false;
    
    const interval = setInterval(() => {
      // 1. Throttling for background tabs
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

      const isThinking = brain.state.isThinking;
      if (isThinking !== lastThinking) {
        lastThinking = isThinking;
        updateAgentStatus(id, isThinking ? "THINKING" : "IDLE");
      }
    }, 200);
    
    return () => clearInterval(interval);
  }, [id, updateAgentStatus]);

  // Fix #Loop-5: Deduplicate repeated same-script decisions — prevent re-queuing
  // the exact same scriptId within a cooldown window (30s).
  const lastScriptIdRef = useRef<string>("");
  const lastScriptTimeRef = useRef<number>(0);

  // --- TASK QUEUE (Manual Task Assignment) ---
  const taskQueueRef = useRef(AgentTaskRegistry.getInstance().getOrCreate(id));

  // --- STARTUP EXPLORATION (park world) ---
  const hasEnqueuedMorningCheckRef = useRef(false);
  useEffect(() => {
    if (hasEnqueuedMorningCheckRef.current) return;

    const queue = AgentTaskRegistry.getInstance().getOrCreate(id);
    const driveManager = driveManagerRef.current;
    
    // Start behavioral noise generator
    const personality = movementPersonalityRef.current.getProfile(driveManager.drives);
    idleBehaviorSystemRef.current.start(personality);

    /** Hook up task completion events to satisfy drives */
    const handleTaskCompletion = (e: any) => {
      if (e.detail.agentId !== id) return;
      applyWorldTaskStepCompletion(
        id,
        e.detail.task,
        !!e.detail.completionAborted,
      );
      if (e.detail.completionAborted) return;
      const taskType = e.detail.taskType;
      const completedTask = e.detail.task;
      if (
        completedTask?.source === "idle_explorer" &&
        completedTask.type === "GO_TO"
      ) {
        getIdleExplorer(id).onArrival(completedTask.targetAreaId);
      }
      // Demoted to debug - was causing per-frame console spam when SIT task fails instantly
      // console.debug(`[useAgentBrain:${id}] Task completed: ${taskType}`);

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
      if (vehicleRef.current) {
        sensorySystemRef.current.recordNoise(
          event, 
          vehicleRef.current.position as unknown as THREE.Vector3
        );
      }
    });

    const timer = setTimeout(() => {
      if (hasEnqueuedMorningCheckRef.current) return;
      hasEnqueuedMorningCheckRef.current = true;

      const personality = personalityRef.current;
      const scriptId = "startup_explore";
      const priority = 8;

      if (personality.stationaryDesk) {
        // Try to map their desk ID to a specific chair ID so they properly path to the seat rather than the desk bounding box
        const chairId = DESK_TO_CHAIR[personality.stationaryDesk] || personality.stationaryDesk;
        
        if (personality.stationaryStand) {
          queue.enqueue({ type: "GO_TO", priority, scriptId, itemId: chairId });
          // Face the counter/desk
          queue.enqueue({ type: "LOOK_AT", priority: priority - 1, scriptId, itemId: personality.stationaryDesk });
          console.debug(`[useAgentBrain:${id}] ${personality.name} is stationary, standing at ${chairId} (desk: ${personality.stationaryDesk})`);
        } else {
          queue.enqueue({ type: "SIT", priority, scriptId, itemId: chairId });
          console.debug(`[useAgentBrain:${id}] ${personality.name} is stationary, seated at ${chairId} (desk: ${personality.stationaryDesk})`);
        }
      } else {
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
      }
    }, 2000 + Math.random() * 1000);

    return () => {
      clearTimeout(timer);
      unsubHearing();
      window.removeEventListener("agent-task-completed", handleTaskCompletion);
    };
  }, [id]);

  // Idle explorer: restore visits, seed zone list after world zones register, periodic save
  useEffect(() => {
    const explorer = getIdleExplorer(id);
    void explorer.loadFromIdb();
    const seedTimer = setTimeout(() => {
      explorer.setLocations(buildDefaultResearchFacilityIdleLocations());
    }, 2500);
    const saveIv = setInterval(() => {
      void explorer.saveToIdb();
    }, 30000);
    return () => {
      clearTimeout(seedTimer);
      clearInterval(saveIv);
      void explorer.saveToIdb();
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

  // Pod deploy / recall from player UI
  useEffect(() => {
    const onDeploy = (e: Event) => {
      const { agentId, podId } = (e as CustomEvent<{ agentId: string; podId: string }>)
        .detail;
      if (agentId !== id) return;
      const q = AgentTaskRegistry.getInstance().getOrCreate(id);
      q.exitDock();
      const exitPos = getPodDeployExitPosition(podId);
      if (exitPos) {
        q.enqueue({
          type: "GO_TO",
          priority: 30,
          scriptId: "pod_deploy",
          targetPos: exitPos,
        });
      }
      q.enqueue({
        type: "WANDER",
        priority: 0,
        scriptId: "subconscious_wander",
      });
    };
    const onRecall = (e: Event) => {
      const { agentId, podId } = (e as CustomEvent<{ agentId: string; podId: string }>)
        .detail;
      if (agentId !== id) return;
      const q = AgentTaskRegistry.getInstance().getOrCreate(id);
      q.cancelScript("subconscious_wander");
      q.cancelScript("subconscious_explore");
      q.cancelScript("auto_rest");
      q.cancelScript("auto_rest_observe");
      q.enqueue({
        type: "REST_IN_POD",
        priority: 25,
        podId,
        scriptId: "player_recall",
      });
    };
    window.addEventListener("agent-deploy-from-pod", onDeploy as EventListener);
    window.addEventListener("agent-recall-to-pod", onRecall as EventListener);
    return () => {
      window.removeEventListener(
        "agent-deploy-from-pod",
        onDeploy as EventListener,
      );
      window.removeEventListener(
        "agent-recall-to-pod",
        onRecall as EventListener,
      );
    };
  }, [id]);

  // --- ANIMATION STATE ---
  const [animationState, setAnimationState] = useState<
    "Idle" | "Walk" | "Run" | "Wave" | "Sit" | "Lean" | "Think" | "Work" | "Present" | "Rest" | "LookAt"
  >("Idle");

  // Set raycaster to only intersect with objects on Layer 1 (Collidables)
  useEffect(() => {
    raycasterRef.current.layers.set(1);
  }, []);

  const frustumRef = useRef(new THREE.Frustum());
  const projScreenMatrixRef = useRef(new THREE.Matrix4());
  const agentSphereRef = useRef(new THREE.Sphere(new THREE.Vector3(), 3));

  useFrame((state, delta) => {
    // 2. Main-thread logic throttling for background tabs
    const isTabVisible = typeof document !== 'undefined' && document.visibilityState === 'visible';
    if (!isTabVisible) return;

    const vehicle = vehicleRef.current;
    if (!vehicle) return;

    const perfT = perfBeginAgentFrame();
    const rayStats = { wall: 0, ground: 0, los: 0 };
    
    // Access game store and derive pod ownership once per frame
    const store = useGameStore.getState();
    const myPodId = Object.entries(store.pods).find(([_, p]) => p.assignedAgentId === id)?.[0];

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

    let steeringCmd: SteeringCommand = { type: "NONE" } as SteeringCommand;
    
    // Evaluate Player Awareness
    let pauseForOpenChat = false;
    if (playerPos) {
      const distToPlayer = vehicle.position.distanceTo(
        playerPos as unknown as YUKA.Vector3,
      );
      const awarenessState = playerAwarenessRef.current.evaluate(
        distToPlayer,
        store.isChatOpen && store.chatAgentId === id,
        delta,
        movementPersonalityRef.current.getProfile(driveManagerRef.current.drives)
      );
      pauseForOpenChat = awarenessState === "INTERACTING";
    }

    steeringCmd = taskQueue.update(delta, vehiclePos, playerPos);

    if (steeringCmd.type === "FOLLOW_PATH" && steeringCmd.cornerAngles?.length) {
      lastCornerAnglesRef.current = steeringCmd.cornerAngles;
    }

    const phaseNow = taskQueue.getCurrentPhase();
    if (phaseNow === "DOCKED" && prevTaskPhaseRef.current !== "DOCKED") {
      const pid = taskQueue.getCurrentTask()?.podId;
      if (pid) {
        useGameStore.getState().setPodDeployed(pid, false);
      }
    }
    prevTaskPhaseRef.current = phaseNow;

    const hasManualTask = taskQueue.isBusy();

    // Auto return to pod after sustained idle (empty queue, deployed)
    {
      const podSnap = myPodId ? store.pods[myPodId] : null;
      if (
        myPodId &&
        podSnap &&
        podSnap.assignedAgentId === id &&
        podSnap.isDeployed &&
        followingAgentId !== id &&
        playerAwarenessRef.current.state !== "GREETING" &&
        playerAwarenessRef.current.state !== "INTERACTING" &&
        !pauseForOpenChat &&
        phaseNow !== "DOCKED"
      ) {
        if (
          taskQueue.getCurrentPhase() === "IDLE" &&
          taskQueue.getQueueLength() === 0
        ) {
          autoRestIdleSecRef.current += delta;
          if (autoRestIdleSecRef.current >= AUTO_REST_IDLE_SEC) {
            autoRestIdleSecRef.current = 0;
            taskQueue.enqueue({
              type: "REST_IN_POD",
              priority: 14,
              podId: myPodId,
              scriptId: "auto_rest",
            });
          }
        } else {
          autoRestIdleSecRef.current = 0;
        }
      } else {
        autoRestIdleSecRef.current = 0;
      }
    }

    const bFollowPath = vehicle.steering
      .behaviors[0] as YUKA.FollowPathBehavior;
    const bSeek = vehicle.steering.behaviors[1] as YUKA.SeekBehavior;
    const bArrive = vehicle.steering.behaviors[2] as YUKA.ArriveBehavior;

    const profile = movementPersonalityRef.current.getProfile(driveManagerRef.current.drives);

    gazeTickTimerRef.current += delta;
    if (gazeTickTimerRef.current >= 0.25) {
      gazeTickTimerRef.current = 0;
      gazeControllerRef.current.resolveTarget(
        Array.from((sensorySystemRef.current as any).workingMemory?.values() || []),
        taskQueue.getCurrentTask()?.type === "SAY" || taskQueue.getCurrentTask()?.type === "COLLABORATE" ? taskQueue.getCurrentTask()?.partnerId || null : null,
        vehicle.velocity,
        vehicle.position,
        playerPos || new THREE.Vector3(),
        profile,
        0.25
      );
    }

    if (pauseForOpenChat) {
      bFollowPath.active = false;
      bSeek.active = false;
      bArrive.active = false;
      vehicle.velocity.set(0, 0, 0);
    }

    applyConversationOpenStance(
      vehicle,
      playerRef.current
        ? (playerRef.current.position as unknown as THREE.Vector3)
        : undefined,
      pauseForOpenChat,
      delta,
      chatOpenStanceElapsedRef,
    );

    // --- ANTICIPATORY DECELERATION ---
    // Dynamically adjust maxSpeed based on angular turning. If the agent needs to
    // make a sharp turn to reach its target or waypoint, it slows down rather than drifting.
    const currentSpeed = vehicle.velocity.length();
    let targetSpeed = 5.5; // Default max speed

    const wp = taskQueue.getCurrentTask()?.walkPace;
    let paceCap = 5.5;
    if (wp === "stroll") paceCap = 2.2;
    else if (wp === "normal") paceCap = 3.5;
    else if (wp === "purposeful") paceCap = 4.8;

    const crowdMult = 1 - 0.13 * Math.min(crowdNearLagRef.current, 3);

    let cornerMult = 1;
    if (bFollowPath.active && lastCornerAnglesRef.current?.length) {
      const pathAny = bFollowPath.path as unknown as {
        _index?: number;
      };
      const wi = pathAny._index ?? 0;
      const angles = lastCornerAnglesRef.current;
      const ai = Math.min(wi + 1, Math.max(0, angles.length - 1));
      const turnRad = angles[ai] ?? 0;
      const deg = (turnRad * 180) / Math.PI;
      if (deg < 20) cornerMult = 1;
      else if (deg < 60)
        cornerMult = THREE.MathUtils.lerp(1, 0.7, (deg - 20) / 40);
      else
        cornerMult = THREE.MathUtils.lerp(
          0.7,
          0.45,
          THREE.MathUtils.clamp((deg - 60) / 40, 0, 1),
        );
    }

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

    targetSpeed = Math.min(targetSpeed, paceCap) * cornerMult * crowdMult;

    // Smoothly interpolate maxSpeed to prevent jerky braking
    vehicle.maxSpeed += (targetSpeed - vehicle.maxSpeed) * 0.1;

    // Pre-turn body alignment is intentionally omitted: YUKA overwrites
    // vehicle.rotation from the velocity direction each frame in its own update,
    // so any rotation nudge applied here would be discarded next frame and
    // create a one-frame stutter.  Corner slowing already encourages natural
    // body-leading via the velocity-speed modulation above.

    // --- PHASE 1: REACTIVE INTERRUPTS (Sub-frame) ---
    // Expert Review Feedback: Audio reaction should be immediate (<16ms)
    const pendingInterrupt = sensorySystemRef.current.getPendingInterrupt();
    if (pendingInterrupt && pendingInterrupt.type === "AUDIO_STARTLE") {
      // If idle/wandering or low priority task, immediately snap head and enqueue body task
      if ((taskQueue.getCurrentTask()?.priority ?? 0) <= 2) {
        // 1. Enqueue proper behavioral task if not already reacting
        if (taskQueue.getCurrentTask()?.scriptId !== "noise_reaction") {
          taskQueue.enqueue({
            type: "LOOK_AT",
            priority: 3, // Higher than WANDER (0) and standard LOOK_AT (2)
            lookTarget: pendingInterrupt.position.clone(),
            duration: 3,
            scriptId: "noise_reaction"
          });
        }
        sensorySystemRef.current.clearInterrupt();
      }
    }

    // Apply steering command from task queue (if active)
    if (steeringCmd.type !== "NONE") {
      const resetBehaviors = () => {
        bFollowPath.active = false;
        bSeek.active = false;
        bArrive.active = false;
      };

      if (steeringCmd.type === "FOLLOW_PATH" && steeringCmd.path) {
        resetBehaviors();
        const yukaPath = new YUKA.Path();
        steeringCmd.path.forEach((p) =>
          yukaPath.add(new YUKA.Vector3(p.x, p.y, p.z)),
        );
        bFollowPath.path = yukaPath;
        bFollowPath.active = true;
        if (steeringCmd.cornerAngles?.length) {
          lastCornerAnglesRef.current = steeringCmd.cornerAngles;
        }
      } else if (steeringCmd.type === "ARRIVE" && steeringCmd.target) {
        resetBehaviors();
        
        let finalTarget = steeringCmd.target.clone();
        const currentTaskType = taskQueue.getCurrentTask()?.type;
        if (currentTaskType === "FOLLOW_PLAYER") {
          finalTarget = ProxemicsController.calculateArrivalPosition(
            finalTarget, 
            vehiclePosRef.current, 
            movementPersonalityRef.current.getProfile(driveManagerRef.current.drives), 
            "player"
          );
        } else if (currentTaskType === "COLLABORATE") {
          finalTarget = ProxemicsController.calculateArrivalPosition(
            finalTarget, 
            vehiclePosRef.current, 
            movementPersonalityRef.current.getProfile(driveManagerRef.current.drives), 
            "agent"
          );
        }
        
        bArrive.target = new YUKA.Vector3(
          finalTarget.x,
          finalTarget.y,
          finalTarget.z,
        );
        bArrive.active = true;
      } else if (steeringCmd.type === "STOP") {
        resetBehaviors();
        const spdXZ = Math.hypot(vehicle.velocity.x, vehicle.velocity.z);
        if (spdXZ > 0.025) {
          const k = Math.exp(-delta * 9);
          vehicle.velocity.x *= k;
          vehicle.velocity.z *= k;
        } else {
          vehicle.velocity.x = 0;
          vehicle.velocity.z = 0;
        }

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

        // Align exactly with the seat if seated
        const currentTask = taskQueue.getCurrentTask();
        if (taskQueue.getCurrentPhase() === "SEATED" && currentTask?.itemId) {
           const reg = InteractableRegistry.getInstance();
           const sitPos = reg.getWorldPosition(currentTask.itemId);
           const sitRot = reg.getWorldRotation(currentTask.itemId);
           if (sitPos && sitRot && rigidbodyRef.current) {
              const pPos = rigidbodyRef.current.translation();
              rigidbodyRef.current.setTranslation({
                 x: THREE.MathUtils.lerp(pPos.x, sitPos.x, delta * 3.0),
                 y: pPos.y,
                 z: THREE.MathUtils.lerp(pPos.z, sitPos.z, delta * 3.0),
              }, true);

              const tRot = vehicle.rotation as unknown as THREE.Quaternion;
              tRot.slerp(sitRot, delta * 4.0);
           }
        }
      }
    }
    // --- RAPID PHYSICS BRIDGE ---
    if (rigidbodyRef.current) {
      const currentLinvel = rigidbodyRef.current.linvel();
      
      // 1. Output Yuka velocity as a physical impulse (preserving gravity's Y)
      rigidbodyRef.current.setLinvel(
        {
          x: vehicle.velocity.x,
          y: currentLinvel.y,
          z: vehicle.velocity.z,
        },
        true
      );

      // 2. Read back actual physical position (post-collision) to Yuka
      const physPos = rigidbodyRef.current.translation();
      vehicle.position.set(physPos.x, physPos.y, physPos.z);
      
      // Sync visual rotation to inner mesh (since lockRotations=true on RigidBody)
      if (groupRef.current) {
        groupRef.current.quaternion.copy(
          vehicle.rotation as unknown as THREE.Quaternion
        );
      }
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

        // Recovery: Abort the current task and fall back to WANDER (skip while returning to pod)
        if (
          stuckTimer.current > STUCK_TIMER_THRESHOLD_SEC &&
          taskQueue.getCurrentTask()?.type !== "REST_IN_POD"
        ) {
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

    const spdPostWall = Math.hypot(vehicle.velocity.x, vehicle.velocity.z);
    const neighborFx = computeVehicleNeighborEffects(vehicle, id, aiManager, {
      proxemicsEveryOtherFrame: spdPostWall < 1,
      frameIndex: frameRef.current,
    });
    crowdNearLagRef.current = neighborFx.crowdNear;
    vehicle.velocity.x += neighborFx.proxAccX * delta * 2.4;
    vehicle.velocity.z += neighborFx.proxAccZ * delta * 2.4;

    // --- ORGANIC MOVEMENT MODIFIER ---
    MovementHumanizer.applyOrganicDrift(
      vehicle,
      movementPersonalityRef.current.getProfile(driveManagerRef.current.drives),
      delta,
      performance.now() / 1000
    );

    // --- PHYSICS CONSTRAINT ---
    vehicle.velocity.y = 0; // Lock Y velocity to prevent pitching

    // --- PLAYER PROXIMITY CHAT ---
    // Actions based on awareness state
    const brain = brainRef.current;
    if (playerRef.current) {
      const storeState = useGameStore.getState();
      const awarenessState = playerAwarenessRef.current.state;

      if (awarenessState === "GREETING" && !storeState.nearbyAgentId && !storeState.isChatOpen) {
        const currentTask = taskQueue.getCurrentTask();
        const isHighPriorityWork = currentTask && currentTask.priority >= 6;

        // Only perform physical greeting if not doing high-priority work (SIT, LLM script, etc.)
        if (!isHighPriorityWork && taskQueue.getCurrentTask()?.scriptId?.indexOf("player_greet_") === -1) {
          const greetScript = `player_greet_${Date.now()}`;
          const pp = playerRef.current.position.clone();
          taskQueue.enqueue({
            type: "LOOK_AT",
            priority: 4, // Intentionally < 6
            duration: 2.5,
            lookTarget: pp,
            scriptId: greetScript,
          });

          if (Math.random() > 0.5) {
            taskQueue.enqueue({
              type: "EMOTE",
              gesture: "wave",
              priority: 4,
              duration: 2.0,
              scriptId: greetScript,
            });
          }
        }
        
        useGameStore.setState({ nearbyAgentId: id, chatPromptVisible: true });
        brain.state.thought = `Player detected. Greeting and offering assistance.`;
        brain.state.lastThoughtTime = Date.now();
        
      } else if (awarenessState === "OBSERVING" || awarenessState === "IGNORING") {
        if (storeState.nearbyAgentId === id && !storeState.isChatOpen) {
          useGameStore.setState({ nearbyAgentId: null, chatPromptVisible: false });
        }
      } else if (awarenessState === "INTERACTING") {
        // Intelligence improvement: Only stop if we weren't doing high-priority work
        const currentTask = taskQueue.getCurrentTask();
        const isHighPriorityWork = currentTask && currentTask.priority >= 6;
        const speed = vehicle.velocity.length();

        if (!isHighPriorityWork && speed < 0.2) {
           vehicle.velocity.set(0, 0, 0);
        }

        // Face the player if we are relatively stationary (e.g. sitting or idle-chatting)
        if (speed < 0.5 && groupRef.current && playerRef.current) {
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
      } else if (awarenessState === "COOLDOWN") {
        if (storeState.nearbyAgentId === id && !storeState.isChatOpen) {
          useGameStore.setState({ nearbyAgentId: null, chatPromptVisible: false });
        }
      }
    }

    // Record familiarity (Phase 3: Individual Dispersion)
    familiarityRef.current.visit(vehicle.position as unknown as THREE.Vector3, delta);

    // --- LEGACY PHYSICS (Gravity / Ground Detection via BVH Raycasting) ---
    // DISABLED when Rapier RigidBody is present — Rapier handles gravity, ground
    // contact and collisions natively. Running both causes duplicate work, BVH
    // deprecation-warning spam, and incorrect double-correction of position.Y.
    if (!rigidbodyRef.current && collidableMeshes.length > 0) {
      const raycaster = raycasterRef.current;
      const rayOrigin = rayOriginRef.current;

      let groundHeight = -100;
      let foundGround = false;

      // Maximum height the agent can "step up" onto.
      // Increased to 2.0 to ensure recovery if agents ever fall below floor slab.
      // Higher than this is still ignored as furniture (workbenches, tables).
      const currentY = vehicle.position.y;

      const gx = vehicle.position.x;
      const gz = vehicle.position.z;
      const lgx = lastGroundRayXZRef.current.x;
      const lgz = lastGroundRayXZRef.current.z;
      const ddx = gx - lgx;
      const ddz = gz - lgz;
      const reuseGround =
        lastGroundHitRef.current.ok &&
        ddx * ddx + ddz * ddz < 0.15 * 0.15 &&
        (frameRef.current & 1) === 0;

      let hits: THREE.Intersection[] = [];
      if (reuseGround) {
        groundHeight = lastGroundHitRef.current.y;
        foundGround = true;
      } else {
        rayStats.ground += 1;
        lastGroundRayXZRef.current.x = gx;
        lastGroundRayXZRef.current.z = gz;
        // Cast from just above max step height to prevent snapping to high ceilings/objects
        rayOrigin.set(
          vehicle.position.x,
          vehicle.position.y + MAX_STEP_UP + 0.1,
          vehicle.position.z,
        );
        raycaster.set(rayOrigin, rayDirRef.current);
        hits = raycaster.intersectObjects(collidableMeshes, true);
      }

      if (!reuseGround && hits.length > 0) {
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
        lastGroundHitRef.current.ok = foundGround;
        if (foundGround) lastGroundHitRef.current.y = groundHeight;
      } else if (!reuseGround) {
        lastGroundHitRef.current.ok = false;
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
        lastGroundHitRef.current.ok = false;
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
        lastGroundHitRef.current.ok = false;
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

      // Radial Facility Ring Soft Clamping
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

    // --- PER-FRAME DRIVES + SENSORY ---
    // ALWAYS run perception & drives so agents are cognitively ALIVE even while
    // executing tasks. Previously gated by `!hasManualTask` which blocked ALL
    // cognition whenever a task was queued (i.e. always, since startup enqueues
    // GO_TO+EXPLORE+WANDER). Agents appeared brain-dead until met by the player.
    {
      const registry = InteractableRegistry.getInstance();
      const vPos = vehicle.position as unknown as THREE.Vector3;
      const items30 = registry.getNearby(vPos, 30);
      let nearbyFloorCount = 0;
      for (const i of items30) {
        if (!i.pickable || i.carriedBy || i.placedInArea) continue;
        if (vPos.distanceTo(i.position) > 15) continue;
        nearbyFloorCount++;
      }
      const pDist = playerRef.current
        ? vehicle.position.distanceTo(
            playerRef.current.position as unknown as YUKA.Vector3,
          )
        : null;

      const nearbyAgentCount = aiManager.vehicles.filter(
        (v) =>
          v !== vehicleRef.current &&
          (v.position as unknown as THREE.Vector3).distanceTo(vPos) < 8,
      ).length;

      zoneSamplePosRef.current.copy(vPos);
      const currentZoneInfluence = ZoneInfluenceSystem.getCurrentZone(
        zoneSamplePosRef.current,
      );
      if (currentZoneInfluence) {
        driveManagerRef.current.applyZoneEffects(
          currentZoneInfluence.effects,
          delta,
          personalityRef.current.driveWeights,
        );
      }

      zoneUpdateTimer.current += delta;
      if (zoneUpdateTimer.current >= 2.0) {
        zoneUpdateTimer.current = 0;
        if (currentZoneInfluence) {
          spatialMemoryRef.current.updateZone(
            currentZoneInfluence.zoneId,
            currentZoneInfluence.zoneName,
          );
        }
        familiarityRef.current.decay(2.0);
        poiUpdateTimer.current += 2.0;
        if (poiUpdateTimer.current >= 30.0) {
          poiUpdateTimer.current = 0;
          POIRegistry.getInstance().update();
        }
      }

      const currentZoneId = currentZoneInfluence?.zoneId ?? "";
      const isInPreferredZone =
        personalityRef.current.preferredZones.includes(currentZoneId);
      const isMoving =
        (vehicle.velocity as unknown as THREE.Vector3).length() > 0.2;
      const isIdle = !taskQueue.isBusy();

      driveManagerRef.current.update(delta, {
        nearbyFloorItems: nearbyFloorCount,
        playerDistance: pDist,
        nearbyAgentCount,
        isIdle,
        isMoving,
        isInPreferredZone,
        driveWeights: personalityRef.current.driveWeights,
      });

      const perceivedEntities = sensorySystemRef.current.update(
        vPos,
        groupRef.current!.quaternion as unknown as THREE.Quaternion,
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
          for (const item of items30) {
            if (!item.pickable || item.carriedBy || item.placedInArea) continue;
            const isClaimed = registry.isItemClaimed(item.id);
            raw.push({
              type: "OBJECT",
              id: item.id,
              distance: vPos.distanceTo(item.position),
              objectType: item.type,
              status: isClaimed ? "(C) Claimed" : "(A) Available",
              name: item.name,
              position: {
                x: item.position.x,
                y: item.position.y,
                z: item.position.z,
              },
            });
          }
          for (const other of aiManager.vehicles) {
            if (other === vehicleRef.current) continue;
            const op = other.position as unknown as THREE.Vector3;
            const oid =
              (other as unknown as { id?: string }).id ?? "agent-unknown";
            raw.push({
              type: "AGENT",
              id: oid,
              distance: vPos.distanceTo(op),
              status: "Active",
              position: { x: op.x, y: op.y, z: op.z },
            });
          }
          return raw;
        })(),
        collidableMeshes,
      );
      lastPerceivedEntitiesRef.current = perceivedEntities;
      rayStats.los += sensorySystemRef.current.lastLosRaycastCount;

      const urgentDrive = driveManagerRef.current.getUrgentDrive();

      const isDocked = taskQueue.getCurrentPhase() === "DOCKED";

      // --- LLM (social / reactive + periodic introspection) ---
      if (
        !isDocked &&
        playerAwarenessRef.current.state !== "GREETING" &&
        playerAwarenessRef.current.state !== "INTERACTING"
      ) {
        const nowSec = Date.now() / 1000;
        const mem = sensorySystemRef.current.getWorkingMemory();
        const cooldownSec = getEffectiveCooldownSec(mem);
        const canThinkLLM =
          nowSec - lastBrainCallTimeRef.current > cooldownSec;

        const hasNearbyPlayer = mem.some(
          (e) => e.type === "PLAYER" && e.distance < 12 && e.isVisible,
        );
        const hasNearbyAgents =
          mem.filter(
            (e) => e.type === "AGENT" && e.distance < 6 && e.isVisible,
          ).length > 0;
        const socialDriveUrgent = urgentDrive?.drive === "social";
        // Periodic introspection: even with no social triggers the agent should
        // form its own thoughts. Fire after 2× the far-distance cooldown with no call.
        const neverThought = lastBrainCallTimeRef.current === 0;
        const longSilence =
          nowSec - lastBrainCallTimeRef.current > LLM_COOLDOWN_FAR_SEC * 2;

        // FIX: Allow LLM to fire even during low-priority tasks for key triggers.
        // Previously required `!taskQueue.isBusy()` which blocked ALL LLM thinking
        // while startup tasks (EXPLORE/WANDER) ran — agents appeared brain-dead.
        // Now: isBusy gate only applies when there's no strong trigger.
        const currentTaskPriority = taskQueue.getCurrentTask()?.priority ?? 0;
        const isLowPriorityTask = currentTaskPriority <= 2; // WANDER=0, EXPLORE=0, idle_explorer=2
        const hasStrongTrigger = hasNearbyPlayer || neverThought || longSilence || socialDriveUrgent;
        const queueAllowsLLM = isIdle || (isLowPriorityTask && hasStrongTrigger);

        const shouldUseLLM =
          canThinkLLM &&
          queueAllowsLLM &&
          followingAgentId !== id &&
          (hasNearbyPlayer ||
            socialDriveUrgent ||
            (hasNearbyAgents && Math.random() < 0.3) ||
            neverThought ||
            longSilence);

        if (shouldUseLLM && !brainRef.current.state.isThinking) {
          const cooldownSecAtFire = cooldownSec;
          const peerSnap = InterAgentComms.formatForPrompt(id);

          const currentBehavior = resolveCurrentBehavior(taskQueue);
          const driveContextStr =
            driveManagerRef.current.toContextString();

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
          const zoneCtxStr = ZoneInfluenceSystem.getContextString(
            zoneSamplePosRef.current,
          );
          const spatialMemCtxStr = spatialMemoryRef.current.toContextString();
          const personality = personalityRef.current;

          // Update Brain with Semantic Zone and Drives
          const enhancedBehavior = `${currentBehavior} (Zone: ${currentZoneInfluence?.zoneName ?? currentZone})`;

          brainRef.current
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
                assignedPodId: myPodId || undefined,
                peerAgentMessages:
                  InterAgentComms.formatForPrompt(id) || undefined,
                worldTasksContext: formatWorldTasksForPrompt(
                  id,
                  useGameStore.getState().worldTasksById,
                ),
                personality: {
                  name: personality.name,
                  trait: personality.trait,
                  speechStyle: personality.speechStyle,
                  bio: personality.bio,
                  systemPromptOverride: useGameStore.getState().agentPromptOverrides[id],
                },
              },
            )
            .then((decision) => {
              const doneSec = Date.now() / 1000;
              if (decision) {
                lastBrainCallTimeRef.current = doneSec;
                if (peerSnap) InterAgentComms.clearForAgent(id);
                if (socialDriveUrgent) {
                  driveManagerRef.current.markTriggered("social");
                }
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

                  // Inject the tasks into the priority queue (Atomic insertion for AgentTaskQueue v2)
                  const deliberatedTasks = DeliberationLayer.processTaskSequence(
                    decision.tasks,
                    movementPersonalityRef.current.getProfile(driveManagerRef.current.drives),
                    vehicle.position as unknown as THREE.Vector3
                  );

                  deliberatedTasks.forEach((task) => {
                    // Clamp LLM-generated coordinates to world bounds safely
                    // (Ensure they land in walkable facility lab area)
                    if (task.type === "GO_TO" && task.targetPos) {
                      const clamped = clampToFacilityRing(task.targetPos);
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
                    if (personalityRef.current.stationaryDesk) {
                      taskQueue.enqueue({
                        type: "SIT",
                        priority: 5,
                        scriptId: "auto_return_desk",
                        itemId: personalityRef.current.stationaryDesk,
                      });
                    } else {
                      taskQueue.enqueue({
                        type: "WANDER",
                        priority: 0,
                        scriptId: "subconscious_wander",
                      });
                    }
                  }
                }
              } else {
                lastBrainCallTimeRef.current =
                  doneSec - cooldownSecAtFire + BRAIN_FAILURE_RETRY_SEC;
              }
            })
            .catch((error) => {
              lastBrainCallTimeRef.current =
                Date.now() / 1000 -
                cooldownSecAtFire +
                BRAIN_FAILURE_RETRY_SEC;
              console.error(
                `[useAgentBrain:${id}] Brain update failed:`,
                error,
              );
            });
        }
      }

      // --- UTILITY BRAIN + IDLE FALLBACK (only when queue is empty) ---
      const utilityNow = Date.now();
      if (
        !isDocked &&
        utilityNow - lastUtilityCheckTimeRef.current > UTILITY_CHECK_INTERVAL_MS &&
        !taskQueue.isBusy() &&
        !brainRef.current.state.isThinking
      ) {
        lastUtilityCheckTimeRef.current = utilityNow;
        const localTasks = utilityBrainRef.current.evaluate(
          driveManagerRef.current.drives,
          vPos,
          spatialMemoryRef.current,
          familiarityRef.current,
          lastPerceivedEntitiesRef.current,
          personalityRef.current,
        );

        if (localTasks && localTasks.length > 0) {
          console.log(
            `[useAgentBrain:${id}] UtilityBrain triggered local routine: ${localTasks[0].scriptId}`,
          );
          localTasks.forEach((task) => taskQueue.enqueue(task));
        }
      }

      if (
        isIdle &&
        taskQueue.getCurrentPhase() === "IDLE" &&
        taskQueue.getQueueLength() === 0 &&
        !isDocked &&
        playerAwarenessRef.current.state !== "INTERACTING" &&
        playerAwarenessRef.current.state !== "GREETING"
      ) {
        // Prevent infinite spam if the desk is unreachable or task fails instantly.
        // Use a DEDICATED ref so the utility check interval doesn't reset this guard.
        const now = Date.now();
        if (now - lastIdleFallbackTimeRef.current > 8000) {
          lastIdleFallbackTimeRef.current = now;
          if (personalityRef.current.stationaryDesk) {
              const chairId = DESK_TO_CHAIR[personalityRef.current.stationaryDesk] || personalityRef.current.stationaryDesk;
              if (personalityRef.current.stationaryStand) {
                taskQueue.enqueue({
                  type: "GO_TO",
                  priority: 5,
                  scriptId: "auto_return_desk",
                  itemId: chairId,
                });
                taskQueue.enqueue({
                  type: "LOOK_AT",
                  priority: 4,
                  scriptId: "auto_return_desk",
                  itemId: personalityRef.current.stationaryDesk,
                });
              } else {
                taskQueue.enqueue({
                  type: "SIT",
                  priority: 5,
                  scriptId: "auto_return_desk",
                  itemId: chairId,
                });
              }
          } else {
            const pacingTask = utilityBrainRef.current.checkPacing(
              driveManagerRef.current.drives,
              true,
              performance.now() / 1000,
            );
            if (pacingTask) taskQueue.enqueue(pacingTask);
          }
        }
      }
    }

      {
        const interruptingBusy = (() => {
          if (personalityRef.current.stationaryDesk) return true; // Block explorer for stationary agents
          const phase = taskQueue.getCurrentPhase();
          if (phase === "DOCKED") return true;
          if (!taskQueue.isBusy()) return false;
          const cur = taskQueue.getCurrentTask();
          const qlen = taskQueue.getQueueLength();
          if (
            cur?.source === "idle_explorer" &&
            cur.type === "GO_TO" &&
            qlen === 0 &&
            phase === "NAVIGATING"
          ) {
            return false;
          }
          if (
            cur?.source === "idle_explorer" &&
            cur.type === "LOOK_AT" &&
            qlen === 0 &&
            phase === "GAZING"
          ) {
            return false;
          }
          return true;
        })();

      const isInConversation =
        playerAwarenessRef.current.state === "INTERACTING" ||
        playerAwarenessRef.current.state === "GREETING";

      const explorer = getIdleExplorer(id);
      const explorerAction = explorer.tick(delta, {
        interruptingBusy,
        isInConversation,
        agentPosition: {
          x: vehicle.position.x,
          y: vehicle.position.y,
          z: vehicle.position.z,
        },
        curiosityDrive: driveManagerRef.current.drives.curiosity,
      });

      if (explorerAction.type === "GO_TO" && explorerAction.targetAreaId) {
        taskQueue.enqueue({
          type: "GO_TO",
          priority: 2,
          targetAreaId: explorerAction.targetAreaId,
          source: "idle_explorer",
          sourceLabel: explorerAction.targetLabel,
          walkPace: explorerAction.walkPace,
        });
      }
      if (
        explorerAction.type === "LOOK_AT_GLANCE" &&
        explorerAction.lookTarget
      ) {
        taskQueue.enqueue({
          type: "LOOK_AT",
          priority: 2,
          source: "idle_explorer",
          targetPos: new THREE.Vector3(
            vehicle.position.x,
            vehicle.position.y,
            vehicle.position.z,
          ),
          lookTarget: new THREE.Vector3(
            explorerAction.lookTarget.x,
            explorerAction.lookTarget.y,
            explorerAction.lookTarget.z,
          ),
          duration: 1.6,
        });
      }
    }

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

      const behaviorOffsets = idleBehaviorSystemRef.current.getPosturalOffsets(
        realDelta,
        taskQueue.getCurrentPhase(),
      );

      updateGait(vehicle.velocity as unknown as THREE.Vector3, realDelta, {
        strideLength,
        targetDirection,
        extraState: gaitExtraState,
        behaviorOffsets,
      });

      const animSpeed = smoothSpeed.current;

      // Determine animation state based on task queue phase
      const taskPhase = taskQueue.getCurrentPhase();
      const taskType = taskQueue.getCurrentTask()?.type;

      let newState: "Idle" | "Walk" | "Run" | "Wave" | "Sit" | "Lean" | "Think" | "Work" | "Present" | "Rest" | "LookAt" = "Idle";
      if (taskPhase === "EMOTING" && taskType === "EMOTE" && taskQueue.getCurrentTask()?.gesture === "wave") {
        newState = "Wave";
      } else if (taskPhase === "DOCKED") {
        newState = "Idle";
      } else if (taskPhase === "SEATED") {
        newState = taskType === "REST" ? "Rest" : "Sit";
      } else if (taskPhase === "LEANING") {
        newState = "Lean";
      } else if (taskPhase === "GAZING") {
        newState = taskType === "CONTEMPLATE" ? "Think" : "LookAt";
      } else if (taskPhase === "PRESENTING") {
        newState = "Present";
      } else if (taskPhase === "EMOTING") {
        newState = "Idle";
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
        } else if (animSpeed <= 0.15) {
          // Idle ambient gazing (skip while walking — procedural gait handles locomotion neck)
          const t = state.clock.elapsedTime;
          j.neck.rotation.y = THREE.MathUtils.lerp(j.neck.rotation.y, Math.sin(t * 0.4) * 0.2, 0.03);
          j.neck.rotation.x = THREE.MathUtils.lerp(j.neck.rotation.x, Math.sin(t * 0.27) * 0.05, 0.03);
        }

        if (
          taskQueue.getCurrentPhase() === "EMOTING" &&
          taskQueue.getCurrentTask()?.gesture === "wave"
        ) {
          const waveSpeed = 8;
          const wave = Math.sin(state.clock.elapsedTime * waveSpeed) * 0.4;
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

    // Update Minimap Position
    // --- POSITION SYNC (Zero-Allocation) ---
    const { agentPositionsRef } = useGameStore.getState();
    const currentPos = vehicle.position as unknown as THREE.Vector3;
    agentPositionsRef[id] = { x: currentPos.x, y: currentPos.y, z: currentPos.z };

    // Update the official Zustand state less frequently (e.g., every 30 frames)
    // for non-critical UI subscribers that don't use the Ref.
    if (frameRef.current % 30 === 0) {
      setAgentPosition(id, currentPos);
    }

    if (lastMinimapPos.current.distanceToSquared(currentPos) > 1.0) {
      lastMinimapPos.current.copy(currentPos);
      
      // Emit movement heat
      InterestMap.getInstance().addHeat(currentPos, 0.2);
    }

    perfEndAgentFrame(perfT, rayStats);
  });

  return {
    vehicle: vehicleRef.current,
    brain: brainRef.current,
    animationState,
    rigidbodyRef,
    driveManager: driveManagerRef.current,
    movementPersonality: movementPersonalityRef.current,
    gazeController: gazeControllerRef.current,
    idleBehaviorSystem: idleBehaviorSystemRef.current,
  };
}
