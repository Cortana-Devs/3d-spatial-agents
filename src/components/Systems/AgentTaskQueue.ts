// @ts-nocheck
import * as THREE from "three";
import * as YUKA from "yuka";
import { InteractableRegistry } from "./InteractableRegistry";
import NavigationNetwork from "./NavigationNetwork";

// ============================================================================
// Task Types
// ============================================================================

export type AgentTaskType =
  | "FETCH_AND_PLACE"
  | "GO_TO"
  | "PICK_NEARBY"
  | "PLACE_INVENTORY";

export interface AgentTask {
  type: AgentTaskType;
  itemId?: string; // For FETCH_AND_PLACE: which item to pick up
  destAreaId?: string; // For FETCH_AND_PLACE: where to place it
  targetPos?: THREE.Vector3; // For GO_TO: destination position
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
  | "COMPLETED";

// Return type: tells useYukaAI what steering to apply
export interface SteeringCommand {
  type: "FOLLOW_PATH" | "ARRIVE" | "STOP" | "NONE";
  path?: THREE.Vector3[];
  target?: THREE.Vector3;
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

  // Distances for phase transitions
  private static readonly ARRIVAL_DIST = 4.0; // Switch to fine approach
  private static readonly INTERACT_DIST = 3.0; // Close enough to pick/place
  private static readonly PICKUP_DELAY = 0.5; // Seconds to pause before pickup
  private static readonly PLACE_DELAY = 0.5; // Seconds to pause before placing

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  // --- PUBLIC API ---

  public enqueue(task: AgentTask): void {
    this.queue.push(task);
    // If idle, immediately start
    if (this.phase === "IDLE" || this.phase === "COMPLETED") {
      this.startNextTask();
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

  public cancel(): void {
    this.queue = [];
    this.currentTask = null;
    this.phase = "IDLE";
    this.phaseTimer = 0;
    this.activeItemId = null;
    this.activeDestAreaId = null;
    this.hasSetPath = false;
  }

  // --- MAIN UPDATE (called every frame from useYukaAI) ---

  public update(delta: number, vehiclePos: THREE.Vector3): SteeringCommand {
    if (this.phase === "IDLE") {
      return { type: "NONE" };
    }

    if (this.phase === "COMPLETED") {
      this.startNextTask();
      if (this.phase === "IDLE") return { type: "NONE" };
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
          // GO_TO: navigate to a specific position
          targetPos = this.currentTask.targetPos || null;
        } else {
          // FETCH_AND_PLACE: navigate to item
          const item = registry.getById(this.activeItemId!);
          if (!item || item.carriedBy) {
            console.warn(
              `[AgentTaskQueue:${this.agentId}] Item ${this.activeItemId} no longer available`,
            );
            this.phase = "COMPLETED";
            return { type: "STOP" };
          }
          targetPos = item.position;
        }

        if (!targetPos) {
          this.phase = "COMPLETED";
          return { type: "STOP" };
        }

        const distToTarget = vehiclePos.distanceTo(targetPos);

        if (distToTarget < AgentTaskQueue.INTERACT_DIST) {
          if (this.currentTask?.type === "GO_TO") {
            // GO_TO completed
            console.log(
              `[AgentTaskQueue:${this.agentId}] Arrived at target position`,
            );
            this.phase = "COMPLETED";
            return { type: "STOP" };
          } else {
            // Close enough to pick up
            this.phase = "PICKING_UP";
            this.phaseTimer = 0;
            this.hasSetPath = false;
            return { type: "STOP" };
          }
        }

        // Navigate if we haven't set a path yet
        if (!this.hasSetPath) {
          const path = nav.findPath(vehiclePos, targetPos);
          this.hasSetPath = true;
          return { type: "FOLLOW_PATH", path };
        }

        return { type: "NONE" }; // Keep following existing path
      }

      // ------------------------------------------------------------------
      // PICKING_UP: Pause briefly, then pick up the item
      // ------------------------------------------------------------------
      case "PICKING_UP": {
        this.phaseTimer += delta;

        if (this.phaseTimer >= AgentTaskQueue.PICKUP_DELAY) {
          const success = registry.pickUp(this.activeItemId!, this.agentId);
          if (success) {
            console.log(
              `[AgentTaskQueue:${this.agentId}] Picked up ${this.activeItemId}`,
            );

            if (this.activeDestAreaId) {
              // Move to destination
              this.phase = "WALK_TO_DEST";
              this.phaseTimer = 0;
              this.hasSetPath = false;
            } else {
              // No destination — just picked up, done
              this.phase = "COMPLETED";
            }
          } else {
            console.warn(
              `[AgentTaskQueue:${this.agentId}] Failed to pick up ${this.activeItemId}`,
            );
            this.phase = "COMPLETED";
          }
        }

        return { type: "STOP" };
      }

      // ------------------------------------------------------------------
      // WALK_TO_DEST: Navigate to the placing area
      // ------------------------------------------------------------------
      case "WALK_TO_DEST": {
        const area = registry.getPlacingAreaById(this.activeDestAreaId!);
        if (!area) {
          console.warn(
            `[AgentTaskQueue:${this.agentId}] Placing area ${this.activeDestAreaId} not found`,
          );
          // Drop item on ground as fallback
          registry.putDown(this.activeItemId!, vehiclePos.clone());
          this.phase = "COMPLETED";
          return { type: "STOP" };
        }

        if (area.currentItems.length >= area.capacity) {
          console.warn(
            `[AgentTaskQueue:${this.agentId}] Area ${this.activeDestAreaId} is full`,
          );
          registry.putDown(this.activeItemId!, vehiclePos.clone());
          this.phase = "COMPLETED";
          return { type: "STOP" };
        }

        const distToArea = vehiclePos.distanceTo(area.position);

        if (distToArea < AgentTaskQueue.INTERACT_DIST) {
          // Close enough to place
          this.phase = "PLACING";
          this.phaseTimer = 0;
          this.hasSetPath = false;
          return { type: "STOP" };
        }

        // Navigate if we haven't set a path yet
        if (!this.hasSetPath) {
          const path = nav.findPath(vehiclePos, area.position);
          this.hasSetPath = true;
          return { type: "FOLLOW_PATH", path };
        }

        return { type: "NONE" }; // Keep following existing path
      }

      // ------------------------------------------------------------------
      // PLACING: Pause briefly, then place the item
      // ------------------------------------------------------------------
      case "PLACING": {
        this.phaseTimer += delta;

        if (this.phaseTimer >= AgentTaskQueue.PLACE_DELAY) {
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
              `[AgentTaskQueue:${this.agentId}] Failed to place, dropping on ground`,
            );
            registry.putDown(this.activeItemId!, vehiclePos.clone());
          }
          this.phase = "COMPLETED";
        }

        return { type: "STOP" };
      }

      default:
        return { type: "NONE" };
    }
  }

  // --- PRIVATE ---

  private startNextTask(): void {
    if (this.queue.length === 0) {
      this.currentTask = null;
      this.phase = "IDLE";
      this.activeItemId = null;
      this.activeDestAreaId = null;
      return;
    }

    this.currentTask = this.queue.shift()!;
    this.phaseTimer = 0;
    this.hasSetPath = false;

    switch (this.currentTask.type) {
      case "FETCH_AND_PLACE": {
        this.activeItemId = this.currentTask.itemId || null;
        this.activeDestAreaId = this.currentTask.destAreaId || null;

        if (!this.activeItemId) {
          console.warn(
            `[AgentTaskQueue:${this.agentId}] FETCH_AND_PLACE requires itemId`,
          );
          this.phase = "COMPLETED";
          return;
        }

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

        // For GO_TO, we reuse WALK_TO_SOURCE phase but target is a position
        this.activeItemId = null;
        this.activeDestAreaId = null;
        this.phase = "WALK_TO_SOURCE";
        break;
      }

      case "PICK_NEARBY": {
        // Walk to item then pick it up (no destination placement)
        this.activeItemId = this.currentTask.itemId || null;
        this.activeDestAreaId = null;

        if (!this.activeItemId) {
          console.warn(
            `[AgentTaskQueue:${this.agentId}] PICK_NEARBY requires itemId`,
          );
          this.phase = "COMPLETED";
          return;
        }

        this.phase = "WALK_TO_SOURCE";
        break;
      }

      case "PLACE_INVENTORY": {
        // Walk to placing area and place carried item
        this.activeItemId = this.currentTask.itemId || null;
        this.activeDestAreaId = this.currentTask.destAreaId || null;

        if (!this.activeDestAreaId) {
          console.warn(
            `[AgentTaskQueue:${this.agentId}] PLACE_INVENTORY requires destAreaId`,
          );
          this.phase = "COMPLETED";
          return;
        }

        // Skip walk-to-source, go directly to walk-to-dest
        this.phase = "WALK_TO_DEST";
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
      taskCount: queue.isActive() ? 1 : 0, // Simplified — active or not
      phase: queue.getCurrentPhase(),
    };
  }
}

export { AgentTaskRegistry };
