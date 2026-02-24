import * as THREE from "three";
import * as YUKA from "yuka";
import { InteractableRegistry } from "./InteractableRegistry";
import NavigationNetwork from "./NavigationNetwork";
import type { PathResult } from "./NavigationNetwork";
import { memoryStream } from "@/lib/memory/MemoryStream";

// ============================================================================
// Task Types
// ============================================================================

export type AgentTaskType =
  | "FETCH_AND_PLACE"
  | "GO_TO"
  | "PICK_NEARBY"
  | "PLACE_INVENTORY"
  | "FOLLOW_PLAYER"
  | "WANDER"
  | "WAIT";

export interface AgentTask {
  type: AgentTaskType;
  priority: number; // e.g., 0 = Subconscious Wander, 10 = LLM Script, 20 = Direct NLP User Command
  scriptId?: string; // Groups tasks together as a block sequence
  itemId?: string; // For FETCH_AND_PLACE: which item to pick up
  destAreaId?: string; // For FETCH_AND_PLACE: where to place it
  targetPos?: THREE.Vector3; // For GO_TO: destination position
  duration?: number; // For WAIT tasks
}

// ============================================================================
// Task Phase State Machine
// ============================================================================

export type TaskPhase =
  | "IDLE"
  | "WALK_TO_SOURCE" // Navigating to item location
  | "PICKING_UP" // Brief pause then pick up
  | "WALK_TO_DEST" // Navigating to placing area
  | "PLACING" // Brief pause then place
  | "FOLLOW_PLAYER" // Following player
  | "WANDER" // Wandering randomly or to a target
  | "WAIT" // Waiting explicitly for a duration
  | "COMPLETED";

// Return type: tells useYukaAI what steering to apply
export interface SteeringCommand {
  type: "FOLLOW_PATH" | "ARRIVE" | "STOP" | "NONE";
  path?: THREE.Vector3[];
  target?: THREE.Vector3;
  /** When set, agent should rotate to face this point before interacting */
  faceTarget?: THREE.Vector3;
}

// ============================================================================
// AgentTaskQueue — Per-Agent Task Queue + State Machine
// ============================================================================

export class AgentTaskQueue {
  private queue: AgentTask[] = [];
  private currentTask: AgentTask | null = null;
  private phase: TaskPhase = "IDLE";
  private phaseTimer: number = 0;
  private agentId: string;

  // Track current item being carried for FETCH_AND_PLACE
  private activeItemId: string | null = null;
  private activeDestAreaId: string | null = null;

  // Path tracking — avoid re-pathfinding every frame
  private hasSetPath: boolean = false;
  // Close approach: true when agent switched to ARRIVE for final approach to item
  private isCloseApproach: boolean = false;

  // Fix #2b: The walkable approach position returned by findPathDetailed.
  // Used for distance checks instead of raw item position (which may be in a blocked cell).
  private approachPos: THREE.Vector3 | null = null;

  // Fix #9: Cumulative stuck detection using sliding window
  private stuckTimer: number = 0;
  private repathTimer: number = 0;
  private stuckWindowPositions: { x: number; z: number; t: number }[] = [];
  private static readonly STUCK_WINDOW = 2.5; // seconds of position history (was 1.5 — too aggressive)
  private static readonly STUCK_MIN_DISTANCE = 1.0; // must move at least this much in the window
  private lastFollowTarget: THREE.Vector3 = new THREE.Vector3();
  private static readonly STUCK_THRESHOLD = 3.0;
  private static readonly REPATH_INTERVAL = 8.0; // was 5.0 — less aggressive re-pathing

  // Fix #28: Max retries for permanently stuck agents
  private retryCount: number = 0;
  private static readonly MAX_RETRIES = 8; // was 5 — more forgiving

  // Fix #30: Global WALK_TO_DEST timeout — re-queue instead of drop
  private destPhaseTimer: number = 0;
  private static readonly DEST_PHASE_TIMEOUT = 60.0; // seconds

  // Distances for phase transitions
  private static readonly ARRIVAL_DIST = 4.0;
  private static readonly INTERACT_DIST = 3.5; // Fix #6: Increased from 2.5 to 3.5 so ARRIVE can converge
  private static readonly CLOSE_APPROACH_DIST = 6.0; // Switch from path-follow to ARRIVE for final approach
  private static readonly PICKUP_DELAY = 0.5;
  private static readonly PLACE_DELAY = 0.5;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  // --- PUBLIC API ---

  public enqueue(task: AgentTask): void {
    this.queue.push(task);
    // Sort queue by priority descending so highest priority is always next
    this.queue.sort((a, b) => b.priority - a.priority);

    // Provide preemption: If the new task has a higher priority than the currently running task
    if (this.currentTask && task.priority > this.currentTask.priority) {
      console.log(
        `[AgentTaskQueue:${this.agentId}] Preempting task ${this.currentTask.type} (Pri: ${this.currentTask.priority}) for ${task.type} (Pri: ${task.priority})`,
      );

      // Handle gracefully suspending the exact current action before switching
      if (this.activeItemId && this.phase === "WALK_TO_SOURCE") {
        // We were walking to an item, release it for now so we don't hold the lock
        InteractableRegistry.getInstance().unclaimItem(
          this.activeItemId,
          this.agentId,
        );
      }

      // Re-queue the currently running task so it resumes later
      this.queue.push(this.currentTask);
      // Re-sort
      this.queue.sort((a, b) => b.priority - a.priority);

      // Immediately start the new high priority task
      this.startNextTask();
      return;
    }

    // If idle, immediately start
    if (this.phase === "IDLE" || this.phase === "COMPLETED") {
      this.startNextTask();
    }
  }

  public getScriptState() {
    return {
      currentScriptId: this.currentTask?.scriptId || null,
      currentTask: this.currentTask?.type || null,
      currentPriority: this.currentTask?.priority || 0,
      queuedTasksCount: this.queue.length,
    };
  }

  public cancelScript(scriptId: string, reason: string = "Cancelled"): void {
    // Remove all tasks matching this scriptId from the queue
    const initialLength = this.queue.length;
    this.queue = this.queue.filter((t) => t.scriptId !== scriptId);

    let cancelledActive = false;
    // If the currently running task is part of this script, abort it
    if (this.currentTask?.scriptId === scriptId) {
      console.log(
        `[AgentTaskQueue:${this.agentId}] Canceling active script: ${scriptId}`,
      );
      if (this.activeItemId) {
        InteractableRegistry.getInstance().unclaimItem(
          this.activeItemId,
          this.agentId,
        );
      }
      this.phase = "COMPLETED"; // Let the state machine naturally pull the next task
      cancelledActive = true;
    }

    // Only fire an outcome if tasks were actually removed or stopped
    if (cancelledActive || this.queue.length < initialLength) {
      // Fix D: Skip logging for low-priority subconscious scripts — they're noise
      if (scriptId !== "subconscious_wander") {
        const outcome = `Script ${scriptId} was interrupted: ${reason}`;
        memoryStream.add("SCRIPT_OUTCOME", outcome, [`script:${scriptId}`]);
      }
    }
  }

  public getCurrentPhase(): TaskPhase {
    return this.phase;
  }

  public getCurrentTask(): AgentTask | null {
    return this.currentTask;
  }

  public isActive(): boolean {
    return this.phase !== "IDLE" && this.phase !== "COMPLETED";
  }

  /** Check if the agent has a pending task active — used by social system to skip interactions */
  public isBusy(): boolean {
    return this.isActive() || this.queue.length > 0;
  }

  public cancel(): void {
    // Release any claimed items
    if (this.activeItemId) {
      InteractableRegistry.getInstance().unclaimItem(
        this.activeItemId,
        this.agentId,
      );
    }
    this.queue = [];
    this.currentTask = null;
    this.phase = "IDLE";
    this.phaseTimer = 0;
    this.activeItemId = null;
    this.activeDestAreaId = null;
    this.hasSetPath = false;
    this.isCloseApproach = false;
    this.approachPos = null;
    this.stuckTimer = 0;
    this.repathTimer = 0;
    this.retryCount = 0;
    this.destPhaseTimer = 0;
    this.stuckWindowPositions = [];
  }

  // --- Fix #9: Sliding-window stuck detection ---
  private recordPosition(x: number, z: number, time: number): void {
    this.stuckWindowPositions.push({ x, z, t: time });
    // Trim old entries
    const cutoff = time - AgentTaskQueue.STUCK_WINDOW;
    while (
      this.stuckWindowPositions.length > 0 &&
      this.stuckWindowPositions[0].t < cutoff
    ) {
      this.stuckWindowPositions.shift();
    }
  }

  private isStuckByWindow(): boolean {
    if (this.stuckWindowPositions.length < 2) return false;
    const first = this.stuckWindowPositions[0];
    const last =
      this.stuckWindowPositions[this.stuckWindowPositions.length - 1];
    const elapsed = last.t - first.t;
    if (elapsed < AgentTaskQueue.STUCK_WINDOW * 0.8) return false; // Need enough data
    const dist = Math.hypot(last.x - first.x, last.z - first.z);
    return dist < AgentTaskQueue.STUCK_MIN_DISTANCE;
  }

  // Keep a running clock for the window
  private elapsedTime: number = 0;

  // --- MAIN UPDATE (called every frame from useYukaAI) ---

  public update(
    delta: number,
    vehiclePos: THREE.Vector3,
    playerPos?: THREE.Vector3,
  ): SteeringCommand {
    if (this.phase === "IDLE") {
      return { type: "NONE" };
    }

    this.elapsedTime += delta;

    // Fix #29: Handle COMPLETED transition properly — start next task and
    // continue processing in the same frame instead of returning early
    if (this.phase === "COMPLETED") {
      this.startNextTask();
      if ((this.phase as string) === "IDLE") return { type: "NONE" };
      // Fall through to process the new phase this same frame
    }

    const registry = InteractableRegistry.getInstance();
    const nav = NavigationNetwork.getInstance();

    switch (this.phase) {
      // ------------------------------------------------------------------
      // WALK_TO_SOURCE: Navigate to the item's location
      // ------------------------------------------------------------------
      case "WALK_TO_SOURCE": {
        // Determine target position based on task type
        let targetPos: THREE.Vector3 | null = null;

        if (this.currentTask?.type === "GO_TO") {
          targetPos = this.currentTask.targetPos || null;
        } else {
          // FETCH/PICK: navigate to item using WORLD position (Fix #6)
          const item = registry.getById(this.activeItemId!);
          if (!item) {
            console.warn(
              `[AgentTaskQueue:${this.agentId}] Item ${this.activeItemId} no longer exists`,
            );
            registry.unclaimItem(this.activeItemId!, this.agentId);
            this.phase = "COMPLETED";
            return { type: "STOP" };
          }

          // If WE are already carrying this item, skip straight to WALK_TO_DEST
          if (item.carriedBy === this.agentId) {
            console.log(
              `[AgentTaskQueue:${this.agentId}] Already carrying ${this.activeItemId} — skipping to WALK_TO_DEST (destAreaId=${this.activeDestAreaId})`,
            );
            if (this.activeDestAreaId) {
              this.phase = "WALK_TO_DEST";
              this.phaseTimer = 0;
              this.hasSetPath = false;
              this.isCloseApproach = false;
              this.approachPos = null;
              this.retryCount = 0;
              this.stuckWindowPositions = [];
              this.destPhaseTimer = 0;
              return { type: "STOP" };
            } else {
              // No destination — just complete
              this.phase = "COMPLETED";
              return { type: "STOP" };
            }
          }

          // Carried by someone ELSE — abort
          if (item.carriedBy) {
            console.warn(
              `[AgentTaskQueue:${this.agentId}] Item ${this.activeItemId} carried by ${item.carriedBy} — aborting`,
            );
            registry.unclaimItem(this.activeItemId!, this.agentId);
            this.phase = "COMPLETED";
            return { type: "STOP" };
          }
          // Use world position helper instead of raw item.position
          targetPos =
            registry.getWorldPosition(this.activeItemId!) || item.position;
        }

        if (!targetPos) {
          this.phase = "COMPLETED";
          return { type: "STOP" };
        }

        // --- PATHFINDING: Navigate using grid A* FIRST to get approachPos ---
        if (!this.hasSetPath) {
          // Fix #2b: Use findPathDetailed to get the approachPos for blocked targets
          const result = nav.findPathDetailed(vehiclePos, targetPos);
          this.approachPos = result.approachPos;

          if (!result.pathFound || result.path.length === 0) {
            console.warn(
              `[AgentTaskQueue:${this.agentId}] No path found to item — will retry`,
            );
            // Don't follow a direct line into walls; wait and retry
            this.hasSetPath = true; // Prevents infinite tight loop
            this.stuckTimer = 0;
            this.repathTimer = 0;
            this.stuckWindowPositions = [];
            // Force a repath after a short delay (1 second)
            this.repathTimer = AgentTaskQueue.REPATH_INTERVAL - 1.0;
            return { type: "STOP" };
          }

          console.log(
            `[AgentTaskQueue:${this.agentId}] Pathfinding to item (dist=${vehiclePos.distanceTo(targetPos).toFixed(2)}, path nodes=${result.path.length})`,
          );
          this.hasSetPath = true;
          this.stuckTimer = 0;
          this.repathTimer = 0;
          this.stuckWindowPositions = [];
          // Fix: Ensure approachPos Y matches vehicle to prevent vertical mismatch
          if (this.approachPos) this.approachPos.y = vehiclePos.y;
          return { type: "FOLLOW_PATH", path: result.path };
        }

        // Fix #2b: Use approach position for distance checks if available
        const distCheckPos = this.approachPos || targetPos;
        const distToTarget = Math.hypot(
          vehiclePos.x - distCheckPos.x,
          vehiclePos.z - distCheckPos.z,
        );

        // Record position for sliding-window stuck detection
        this.recordPosition(vehiclePos.x, vehiclePos.z, this.elapsedTime);

        // --- ARRIVED: close enough to pick up ---
        if (distToTarget < AgentTaskQueue.INTERACT_DIST) {
          if (this.currentTask?.type === "GO_TO") {
            console.log(
              `[AgentTaskQueue:${this.agentId}] Arrived at target position`,
            );
            this.phase = "COMPLETED";
            return { type: "STOP" };
          } else {
            console.log(
              `[AgentTaskQueue:${this.agentId}] Close enough (dist=${distToTarget.toFixed(2)}) — transitioning to PICKING_UP`,
            );
            this.phase = "PICKING_UP";
            this.phaseTimer = 0;
            this.hasSetPath = false;
            this.isCloseApproach = false;
            this.retryCount = 0;
            this.stuckWindowPositions = [];
            this.destPhaseTimer = 0; // Fix: Reset destPhaseTimer
            return { type: "STOP", faceTarget: targetPos };
          }
        }

        // --- CLOSE APPROACH: switch to direct ARRIVE for precise homing ---
        const isPickTask = this.currentTask?.type !== "GO_TO";
        if (isPickTask && distToTarget < AgentTaskQueue.CLOSE_APPROACH_DIST) {
          if (!this.isCloseApproach) {
            // First time entering close approach — issue ARRIVE command once
            console.log(
              `[AgentTaskQueue:${this.agentId}] Entering close approach (dist=${distToTarget.toFixed(2)}) — switching to ARRIVE`,
            );
            this.isCloseApproach = true;
            this.stuckTimer = 0;
            this.repathTimer = 0;
            this.stuckWindowPositions = [];
            // Fix: Ensure ARRIVE target Y matches vehicle to prevent vertical YUKA forces
            const arriveTarget = distCheckPos.clone();
            arriveTarget.y = vehiclePos.y;
            return { type: "ARRIVE", target: arriveTarget };
          }

          // Already in close approach — check for stuck using sliding window
          this.repathTimer += delta;

          const isStuck = this.isStuckByWindow();

          // If stuck during close approach, re-issue ARRIVE with fresh target
          if (isStuck || this.repathTimer > 3.0) {
            this.retryCount++;
            console.log(
              `[AgentTaskQueue:${this.agentId}] Close-approach stuck (dist=${distToTarget.toFixed(2)}), re-issuing ARRIVE (retry=${this.retryCount})`,
            );

            if (this.retryCount >= AgentTaskQueue.MAX_RETRIES) {
              // Fix #6: Force pickup if we're reasonably close
              if (distToTarget < AgentTaskQueue.CLOSE_APPROACH_DIST) {
                console.log(
                  `[AgentTaskQueue:${this.agentId}] Stuck but close enough (dist=${distToTarget.toFixed(2)}) — forcing PICKING_UP`,
                );
                this.phase = "PICKING_UP";
                this.phaseTimer = 0;
                this.hasSetPath = false;
                this.isCloseApproach = false;
                this.retryCount = 0;
                this.stuckWindowPositions = [];
                return { type: "STOP", faceTarget: targetPos };
              }
              console.warn(
                `[AgentTaskQueue:${this.agentId}] Abandoning task — permanently stuck`,
              );
              registry.unclaimItem(this.activeItemId!, this.agentId);
              this.phase = "COMPLETED";
              return { type: "STOP" };
            }

            this.repathTimer = 0;
            this.stuckWindowPositions = [];
            const retryTarget = distCheckPos.clone();
            retryTarget.y = vehiclePos.y;
            return { type: "ARRIVE", target: retryTarget };
          }

          return { type: "NONE" }; // Let ARRIVE behavior continue
        }

        // Fix #9: Stuck detection using sliding window for PATH follow
        this.repathTimer += delta;

        const isStuckWalk = this.isStuckByWindow();

        if (
          (isStuckWalk &&
            this.elapsedTime -
              (this.stuckWindowPositions[0]?.t ?? this.elapsedTime) >
              AgentTaskQueue.STUCK_THRESHOLD) ||
          this.repathTimer > AgentTaskQueue.REPATH_INTERVAL
        ) {
          this.retryCount++;
          console.log(
            `[AgentTaskQueue:${this.agentId}] Re-pathing (stuck=${isStuckWalk}, retry=${this.retryCount}/${AgentTaskQueue.MAX_RETRIES})`,
          );

          // Fix #28: Abandon task if permanently stuck
          if (this.retryCount >= AgentTaskQueue.MAX_RETRIES) {
            console.warn(
              `[AgentTaskQueue:${this.agentId}] Abandoning task — permanently stuck after ${this.retryCount} retries`,
            );
            registry.unclaimItem(this.activeItemId!, this.agentId);
            this.phase = "COMPLETED";
            return { type: "STOP" };
          }

          this.hasSetPath = false; // Trigger full repath next frame
          this.isCloseApproach = false;
          this.stuckWindowPositions = [];
          this.repathTimer = 0;
        }

        return { type: "NONE" }; // Keep following existing path
      }

      // ------------------------------------------------------------------
      // PICKING_UP: Pause briefly, then pick up the item
      // ------------------------------------------------------------------
      case "PICKING_UP": {
        this.phaseTimer += delta;

        if (this.phaseTimer >= AgentTaskQueue.PICKUP_DELAY) {
          // Fix #4: Guard — can't pick up if already carrying an item
          const alreadyCarrying = registry.getAllCarriedBy(this.agentId);
          if (alreadyCarrying.length > 0) {
            console.warn(
              `[AgentTaskQueue:${this.agentId}] Already carrying ${alreadyCarrying[0].id} — skipping pick up of ${this.activeItemId}`,
            );
            registry.unclaimItem(this.activeItemId!, this.agentId);
            this.phase = "COMPLETED";
            return { type: "STOP" };
          }

          const success = registry.pickUp(this.activeItemId!, this.agentId);
          if (success) {
            console.log(
              `[AgentTaskQueue:${this.agentId}] Picked up ${this.activeItemId} (destAreaId=${this.activeDestAreaId})`,
            );

            if (this.activeDestAreaId) {
              this.phase = "WALK_TO_DEST";
              this.phaseTimer = 0;
              this.hasSetPath = false;
              this.isCloseApproach = false;
              this.approachPos = null;
              this.retryCount = 0;
              this.stuckWindowPositions = [];
              this.destPhaseTimer = 0;
            } else {
              this.phase = "COMPLETED";
            }
          } else {
            console.warn(
              `[AgentTaskQueue:${this.agentId}] Failed to pick up ${this.activeItemId}`,
            );
            registry.unclaimItem(this.activeItemId!, this.agentId);
            this.phase = "COMPLETED";
          }
        }

        return { type: "STOP" };
      }

      // ------------------------------------------------------------------
      // WALK_TO_DEST: Navigate to the placing area
      // Fix #12: Added close-approach logic (mirrors WALK_TO_SOURCE)
      // ------------------------------------------------------------------
      case "WALK_TO_DEST": {
        // Fix #30: Global WALK_TO_DEST timeout — re-queue instead of drop
        this.destPhaseTimer += delta;

        // Use world position for area (Fix #20)
        const areaWorldPos = registry.getAreaWorldPosition(
          this.activeDestAreaId!,
        );
        const area = registry.getPlacingAreaById(this.activeDestAreaId!);

        if (!area || !areaWorldPos) {
          console.warn(
            `[AgentTaskQueue:${this.agentId}] Placing area "${this.activeDestAreaId}" not found — searching for fallback area`,
          );
          // Try to find ANY nearby empty placing area as a fallback
          const fallbackAreas = registry
            .getNearbyPlacingAreas(vehiclePos, 20)
            .filter((a) => !a.currentItem);
          if (fallbackAreas.length > 0) {
            const fallback = fallbackAreas[0];
            console.log(
              `[AgentTaskQueue:${this.agentId}] Fallback area found: "${fallback.id}" (${fallback.name})`,
            );
            this.activeDestAreaId = fallback.id;
            this.hasSetPath = false;
            this.isCloseApproach = false;
            this.approachPos = null;
            this.retryCount = 0;
            this.stuckWindowPositions = [];
            return { type: "STOP" }; // Re-enter WALK_TO_DEST next frame with valid area
          }
          // No fallback areas — drop on floor as last resort
          console.warn(
            `[AgentTaskQueue:${this.agentId}] No empty areas nearby — dropping item on floor`,
          );
          registry.putDown(this.activeItemId!, vehiclePos);
          this.phase = "COMPLETED";
          return { type: "STOP" };
        }

        // Fix #30: Global timeout safety net
        if (this.destPhaseTimer >= AgentTaskQueue.DEST_PHASE_TIMEOUT) {
          console.warn(
            `[AgentTaskQueue:${this.agentId}] WALK_TO_DEST timed out after ${AgentTaskQueue.DEST_PHASE_TIMEOUT}s — re-queuing placement`,
          );
          this.requeuePlacement();
          return { type: "STOP" };
        }

        // Navigate if we haven't set a path yet (MUST BE DONE BEFORE DISTANCE CHECKS)
        if (!this.hasSetPath) {
          const result = nav.findPathDetailed(vehiclePos, areaWorldPos);
          this.approachPos = result.approachPos;

          if (!result.pathFound || result.path.length === 0) {
            console.warn(
              `[AgentTaskQueue:${this.agentId}] No path found to area — will retry`,
            );
            this.hasSetPath = true; // prevents infinite loop
            this.repathTimer = AgentTaskQueue.REPATH_INTERVAL - 1.0;
            this.stuckWindowPositions = [];
            return { type: "STOP" };
          }

          this.hasSetPath = true;
          this.stuckTimer = 0;
          this.repathTimer = 0;
          this.stuckWindowPositions = [];
          if (this.approachPos) this.approachPos.y = vehiclePos.y;
          return { type: "FOLLOW_PATH", path: result.path };
        }

        // Fix #2b: Use approach position for distance checks
        const distCheckPosDest = this.approachPos || areaWorldPos;
        const distToArea = Math.hypot(
          vehiclePos.x - distCheckPosDest.x,
          vehiclePos.z - distCheckPosDest.z,
        );

        // Record position for sliding-window stuck detection
        this.recordPosition(vehiclePos.x, vehiclePos.z, this.elapsedTime);

        if (distToArea < AgentTaskQueue.INTERACT_DIST) {
          // Re-check slot occupancy right before placing (Fix #19)
          if (area.currentItem) {
            console.warn(
              `[AgentTaskQueue:${this.agentId}] Area ${this.activeDestAreaId} is now full — re-queuing placement`,
            );
            // Fix #30: Re-queue instead of dropping
            this.requeuePlacement();
            return { type: "STOP" };
          }

          // Close enough to place — face the area first (Fix #23)
          this.phase = "PLACING";
          this.phaseTimer = 0;
          this.hasSetPath = false;
          this.retryCount = 0;
          this.destPhaseTimer = 0;
          this.stuckWindowPositions = [];
          return { type: "STOP", faceTarget: areaWorldPos };
        }

        // Fix #12: Close approach for WALK_TO_DEST (mirrors WALK_TO_SOURCE)
        if (distToArea < AgentTaskQueue.CLOSE_APPROACH_DIST) {
          if (!this.isCloseApproach) {
            console.log(
              `[AgentTaskQueue:${this.agentId}] Dest close approach (dist=${distToArea.toFixed(2)}) — switching to ARRIVE`,
            );
            this.isCloseApproach = true;
            this.repathTimer = 0;
            this.stuckWindowPositions = [];
            const destArriveTarget = distCheckPosDest.clone();
            destArriveTarget.y = vehiclePos.y;
            return { type: "ARRIVE", target: destArriveTarget };
          }

          // Already in close approach — check stuck
          this.repathTimer += delta;
          const isStuckDest = this.isStuckByWindow();

          if (isStuckDest || this.repathTimer > 3.0) {
            this.retryCount++;

            if (this.retryCount >= AgentTaskQueue.MAX_RETRIES) {
              if (distToArea < AgentTaskQueue.CLOSE_APPROACH_DIST) {
                // Force place if close enough
                if (!area.currentItem) {
                  this.phase = "PLACING";
                  this.phaseTimer = 0;
                  this.hasSetPath = false;
                  this.retryCount = 0;
                  this.destPhaseTimer = 0;
                  this.stuckWindowPositions = [];
                  return { type: "STOP", faceTarget: areaWorldPos };
                }
              }
              // Fix #30: Re-queue instead of dropping on the floor
              console.warn(
                `[AgentTaskQueue:${this.agentId}] Stuck during close approach — re-queuing placement`,
              );
              this.requeuePlacement();
              return { type: "STOP" };
            }

            this.repathTimer = 0;
            this.stuckWindowPositions = [];
            const destRetryTarget = distCheckPosDest.clone();
            destRetryTarget.y = vehiclePos.y;
            return { type: "ARRIVE", target: destRetryTarget };
          }

          return { type: "NONE" };
        }

        // Fix #9: Sliding-window stuck detection during FOLLOW_PATH
        this.repathTimer += delta;
        const isStuckDestWalk = this.isStuckByWindow();

        if (
          (isStuckDestWalk &&
            this.elapsedTime -
              (this.stuckWindowPositions[0]?.t ?? this.elapsedTime) >
              AgentTaskQueue.STUCK_THRESHOLD) ||
          this.repathTimer > AgentTaskQueue.REPATH_INTERVAL
        ) {
          this.retryCount++;

          // Fix #30: Re-queue instead of dropping on the floor
          if (this.retryCount >= AgentTaskQueue.MAX_RETRIES) {
            console.warn(
              `[AgentTaskQueue:${this.agentId}] Stuck during path-follow — re-queuing placement`,
            );
            this.requeuePlacement();
            return { type: "STOP" };
          }

          this.hasSetPath = false;
          this.isCloseApproach = false;
          this.stuckWindowPositions = [];
          this.repathTimer = 0;
        }

        return { type: "NONE" };
      }

      // ------------------------------------------------------------------
      // PLACING: Pause briefly, then place the item
      // ------------------------------------------------------------------
      case "PLACING": {
        this.phaseTimer += delta;

        if (this.phaseTimer >= AgentTaskQueue.PLACE_DELAY) {
          console.log(
            `[AgentTaskQueue:${this.agentId}] PLACING: attempting placeItemAt("${this.activeItemId}", "${this.activeDestAreaId}")`,
          );
          const success = registry.placeItemAt(
            this.activeItemId!,
            this.activeDestAreaId!,
          );
          if (success) {
            console.log(
              `[AgentTaskQueue:${this.agentId}] Placed ${this.activeItemId} at ${this.activeDestAreaId}`,
            );
          } else {
            console.warn(
              `[AgentTaskQueue:${this.agentId}] Failed to place, dropping nearby`,
            );
            const dropPos = vehiclePos.clone();
            dropPos.x += (Math.random() - 0.5) * 2;
            dropPos.z += (Math.random() - 0.5) * 2;
            registry.putDown(this.activeItemId!, dropPos);
          }
          this.phase = "COMPLETED";
        }

        return { type: "STOP" };
      }

      // ------------------------------------------------------------------
      // FOLLOW_PLAYER: Continuously move towards player
      // ------------------------------------------------------------------
      case "FOLLOW_PLAYER": {
        if (!playerPos) {
          console.warn(
            `[AgentTaskQueue:${this.agentId}] Player position unknown`,
          );
          this.phase = "COMPLETED";
          return { type: "STOP" };
        }

        const distToPlayer = vehiclePos.distanceTo(playerPos);
        const stopDistance = 2.5;

        if (distToPlayer < stopDistance) {
          this.hasSetPath = false;
          return { type: "STOP" };
        }

        const playerMoved = playerPos.distanceTo(this.lastFollowTarget);
        this.phaseTimer += delta;

        if (!this.hasSetPath || playerMoved > 5.0 || this.phaseTimer > 1.5) {
          const path = nav.findPath(vehiclePos, playerPos);
          this.hasSetPath = true;
          this.phaseTimer = 0;
          this.lastFollowTarget.copy(playerPos);
          return { type: "FOLLOW_PATH", path };
        }

        return { type: "NONE" };
      }

      // ------------------------------------------------------------------
      // WANDER: Pick a random nearby point and navigate to it
      // ------------------------------------------------------------------
      case "WANDER": {
        // If we don't have a path yet, figure out a target
        if (!this.hasSetPath) {
          let targetPos = this.currentTask?.targetPos;

          if (!targetPos) {
            // Generate a random valid nav point within 10 units
            targetPos = nav.getRandomPoint(vehiclePos, 10.0) || undefined;
          }

          if (!targetPos) {
            this.phase = "COMPLETED";
            return { type: "STOP" };
          }

          const result = nav.findPathDetailed(vehiclePos, targetPos);
          if (!result.pathFound || result.path.length === 0) {
            this.phase = "COMPLETED"; // Just finish and try another wander later
            return { type: "STOP" };
          }

          this.hasSetPath = true;
          this.repathTimer = 0;
          this.stuckTimer = 0;
          this.stuckWindowPositions = [];

          // For wander target checking
          if (!this.currentTask) return { type: "STOP" };
          this.currentTask.targetPos = targetPos; // Save the generated random target

          return { type: "FOLLOW_PATH", path: result.path };
        }

        // We are currently pathing for WANDER
        this.repathTimer += delta;
        const isStuckWalk = this.isStuckByWindow();

        // If wandering agent gets stuck, just cancel the wander task smoothly
        // Wait at least STUCK_THRESHOLD before bailing out
        if (
          (isStuckWalk &&
            this.elapsedTime -
              (this.stuckWindowPositions[0]?.t ?? this.elapsedTime) >
              AgentTaskQueue.STUCK_THRESHOLD) ||
          this.repathTimer > AgentTaskQueue.REPATH_INTERVAL * 1.5
        ) {
          console.log(
            `[AgentTaskQueue:${this.agentId}] WANDER stuck, completing early.`,
          );
          this.phase = "COMPLETED";
          return { type: "STOP" };
        }

        // Check if we arrived at the end of the current path
        const finalTarget = this.currentTask?.targetPos;
        if (finalTarget && vehiclePos.distanceTo(finalTarget) < 1.5) {
          this.phase = "COMPLETED";
          return { type: "STOP" };
        }

        return { type: "NONE" };
      }

      // ------------------------------------------------------------------
      // WAIT: Pause momentarily
      // ------------------------------------------------------------------
      case "WAIT": {
        this.phaseTimer += delta;
        const waitDuration = this.currentTask?.duration || 2.0;

        if (this.phaseTimer >= waitDuration) {
          this.phase = "COMPLETED";
        }
        return { type: "STOP" };
      }

      default:
        return { type: "NONE" };
    }
  }

  // --- PRIVATE ---

  // Fix #30: Re-queue the current placement task instead of dropping the item
  private requeuePlacement(): void {
    console.log(
      `[AgentTaskQueue:${this.agentId}] Re-queuing placement of ${this.activeItemId} → ${this.activeDestAreaId}`,
    );
    const itemId = this.activeItemId;
    const destAreaId = this.activeDestAreaId;
    const priority = this.currentTask?.priority || 10; // Fix: Save priority
    const scriptId = this.currentTask?.scriptId; // Fix: Save scriptId

    this.cancel(); // Clears current task and queue

    // Re-enqueue the same placement task
    if (itemId && destAreaId) {
      this.queue.unshift({
        type: "PLACE_INVENTORY",
        priority,
        scriptId,
        itemId,
        destAreaId,
      });
    }
    this.phase = "COMPLETED";
  }

  private startNextTask(): void {
    // If we're transitioning from a script to idle or a different script, log it.
    if (this.currentTask?.scriptId && this.currentTask.priority > 0) {
      const nextTask = this.queue.length > 0 ? this.queue[0] : null;
      if (!nextTask || nextTask.scriptId !== this.currentTask.scriptId) {
        const outcome = `Script ${this.currentTask.scriptId} completed execution.`;
        console.log(`[AgentTaskQueue:${this.agentId}] ${outcome}`);
        memoryStream.add("SCRIPT_OUTCOME", outcome, [
          `script:${this.currentTask.scriptId}`,
        ]);
      }
    }

    if (this.queue.length === 0) {
      this.currentTask = null;
      this.phase = "IDLE";
      this.activeItemId = null;
      this.activeDestAreaId = null;
      this.approachPos = null;
      this.retryCount = 0;
      this.stuckWindowPositions = [];
      return;
    }

    this.currentTask = this.queue.shift()!;
    this.phaseTimer = 0;
    this.hasSetPath = false;
    this.isCloseApproach = false;
    this.approachPos = null;
    this.retryCount = 0;
    this.destPhaseTimer = 0;
    this.stuckWindowPositions = [];

    const registry = InteractableRegistry.getInstance();

    switch (this.currentTask.type) {
      case "FETCH_AND_PLACE": {
        this.activeItemId = this.currentTask.itemId || null;
        this.activeDestAreaId = this.currentTask.destAreaId || null;
        console.log(
          `[AgentTaskQueue:${this.agentId}] Starting FETCH_AND_PLACE: itemId="${this.activeItemId}", destAreaId="${this.activeDestAreaId}"`,
        );

        if (!this.activeItemId) {
          console.warn(
            `[AgentTaskQueue:${this.agentId}] FETCH_AND_PLACE requires itemId`,
          );
          this.phase = "COMPLETED";
          return;
        }

        // Claim the item so other agents don't target it
        registry.claimItem(this.activeItemId, this.agentId);

        this.phase = "WALK_TO_SOURCE";
        break;
      }

      case "GO_TO": {
        if (!this.currentTask.targetPos) {
          console.warn(
            `[AgentTaskQueue:${this.agentId}] GO_TO requires targetPos`,
          );
          this.phase = "COMPLETED";
          return;
        }

        this.activeItemId = null;
        this.activeDestAreaId = null;
        this.phase = "WALK_TO_SOURCE";
        break;
      }

      case "PICK_NEARBY": {
        this.activeItemId = this.currentTask.itemId || null;
        this.activeDestAreaId = null;

        if (!this.activeItemId) {
          console.warn(
            `[AgentTaskQueue:${this.agentId}] PICK_NEARBY requires itemId`,
          );
          this.phase = "COMPLETED";
          return;
        }

        // Claim the item
        registry.claimItem(this.activeItemId, this.agentId);

        this.phase = "WALK_TO_SOURCE";
        break;
      }

      case "PLACE_INVENTORY": {
        this.activeDestAreaId = this.currentTask.destAreaId || null;

        // Fix #22: Resolve itemId at EXECUTION time, not queue time.
        // If the task has no itemId, find the first item currently carried by this agent.
        if (this.currentTask.itemId) {
          this.activeItemId = this.currentTask.itemId;
        } else {
          const carried = registry.getAllCarriedBy(this.agentId);
          if (carried.length > 0) {
            this.activeItemId = carried[0].id;
          } else {
            console.warn(
              `[AgentTaskQueue:${this.agentId}] PLACE_INVENTORY: no item to place`,
            );
            this.phase = "COMPLETED";
            return;
          }
        }

        if (!this.activeDestAreaId) {
          console.warn(
            `[AgentTaskQueue:${this.agentId}] PLACE_INVENTORY requires destAreaId`,
          );
          this.phase = "COMPLETED";
          return;
        }

        this.phase = "WALK_TO_DEST";
        break;
      }

      case "FOLLOW_PLAYER": {
        this.phase = "FOLLOW_PLAYER";
        break;
      }

      case "WANDER": {
        this.phase = "WANDER";
        break;
      }

      case "WAIT": {
        this.phase = "WAIT";
        break;
      }
    }
  }
}

// ============================================================================
// Singleton Registry: Allows player controller to push tasks to any agent
// ============================================================================

class AgentTaskRegistry {
  private static instance: AgentTaskRegistry;
  private queues: Map<string, AgentTaskQueue> = new Map();

  private constructor() {}

  public static getInstance(): AgentTaskRegistry {
    if (!AgentTaskRegistry.instance) {
      AgentTaskRegistry.instance = new AgentTaskRegistry();
    }
    return AgentTaskRegistry.instance;
  }

  public getOrCreate(agentId: string): AgentTaskQueue {
    if (!this.queues.has(agentId)) {
      this.queues.set(agentId, new AgentTaskQueue(agentId));
    }
    return this.queues.get(agentId)!;
  }

  public getQueue(agentId: string): AgentTaskQueue | undefined {
    return this.queues.get(agentId);
  }

  /** Returns all registered agent IDs */
  public getAllAgentIds(): string[] {
    return Array.from(this.queues.keys());
  }

  /** Returns queue status for UI display */
  public getQueueStatus(agentId: string): {
    taskCount: number;
    phase: TaskPhase;
  } {
    const queue = this.queues.get(agentId);
    if (!queue) return { taskCount: 0, phase: "IDLE" };
    return {
      taskCount: queue.isActive() ? 1 : 0,
      phase: queue.getCurrentPhase(),
    };
  }
}

export { AgentTaskRegistry };
