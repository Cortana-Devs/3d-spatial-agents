import * as THREE from "three";
import { InteractableRegistry } from "./InteractableRegistry";
import { AgentBrainClient } from "@/lib/workers/AgentBrainClient";
import { memoryStream } from "@/lib/memory/MemoryStream";
import { getRandomPhrase } from "@/lib/audio/phraseBank";
import { getZoneCenterPosition } from "@/config/parkRoutines";

// ============================================================================
// Task Types
// ============================================================================

export type AgentTaskType =
  | "GO_TO"
  | "PICK_NEARBY"
  | "PLACE_INVENTORY"
  | "INTERACT"
  | "SAY"
  | "FOLLOW_PLAYER"
  | "WANDER"
  | "WAIT"
  // Experiential tasks (new)
  | "SIT"         // Navigate to bench/chair, enter seated pose for a duration
  | "LEAN"        // Navigate near railing/surface, enter lean pose for a duration
  | "LOOK_AT"     // Turn and hold gaze on a target point for a duration
  | "CONTEMPLATE" // GO_TO scenic spot → LOOK_AT POIs + brief SAY reflection
  | "EXPLORE"     // Navigate to least recently visited zone
  | "REST"        // Navigate to Garden bench → SIT until energy recovers
  | "COLLABORATE" // Navigate toward partner agent
  | "PRESENT"     // Navigate to Arena podium, deliver speech
  | "EMOTE";      // Play a gesture animation in place (no movement)

export interface AgentTask {
  type: AgentTaskType;
  priority: number; // 0 = Subconscious Wander, 10 = LLM Script
  scriptId?: string;
  itemId?: string;         // For PICK_NEARBY / INTERACT / SIT (bench id)
  destAreaId?: string;     // For PLACE_INVENTORY
  targetAreaId?: string;   // For GO_TO (Semantic Zone ID)
  targetPos?: THREE.Vector3;
  duration?: number;       // For WAIT / SIT / LEAN / LOOK_AT / EMOTE
  content?: string;        // For SAY / PRESENT (message or speech)
  /** For LOOK_AT / CONTEMPLATE — the world-space point to face */
  lookTarget?: THREE.Vector3;
  /** For EMOTE — gesture name */
  gesture?: "wave" | "nod" | "shrug" | "cheer" | "think";
  /** For COLLABORATE — partner agent id */
  partnerId?: string;
}

// ============================================================================
// Task Phase State Machine
// ============================================================================

export type TaskPhase =
  | "IDLE"
  | "NAVIGATING"
  | "ACTION_START"
  | "SEATED"        // sitting on bench
  | "LEANING"       // leaning on surface
  | "GAZING"        // performing LOOK_AT / CONTEMPLATE
  | "EMOTING"       // gesture in progress
  | "PRESENTING"    // at podium delivering speech
  | "COMPLETED";

export interface SteeringCommand {
  type: "FOLLOW_PATH" | "ARRIVE" | "STOP" | "NONE";
  path?: THREE.Vector3[];
  target?: THREE.Vector3;
  faceTarget?: THREE.Vector3;
}

// ============================================================================
// AgentTaskQueue
// ============================================================================

export class AgentTaskQueue {
  private queue: AgentTask[] = [];
  private currentTask: AgentTask | null = null;
  private phase: TaskPhase = "IDLE";
  private phaseTimer: number = 0;
  private agentId: string;

  private hasSetPath: boolean = false;
  private approachPos: THREE.Vector3 | null = null;
  private isCloseApproach: boolean = false;
  private elapsedTime: number = 0;
  private stuckTimer: number = 0;
  private repathTimer: number = 0;
  private stuckWindowPositions: { x: number; z: number; t: number }[] = [];
  private retryCount: number = 0;
  private pathRefreshTimer: number = 0;

  private static readonly STUCK_WINDOW = 2.5;
  private static readonly PATH_REFRESH_INTERVAL = 1.5;
  private static readonly STUCK_MIN_DISTANCE = 1.0;
  private static readonly STUCK_THRESHOLD = 3.0;
  private static readonly REPATH_INTERVAL = 8.0;
  private static readonly WANDER_X_MIN = -96;
  private static readonly WANDER_X_MAX = 96;
  private static readonly WANDER_Z_MIN = -71;
  private static readonly WANDER_Z_MAX = 71;
  private static readonly MAX_RETRIES = 5;
  private static readonly ARRIVAL_DIST = 2.5;
  private static readonly CLOSE_APPROACH_DIST = 4.0;
  private static readonly ACTION_DELAY = 0.5;

  // Default durations for experiential tasks (seconds)
  private static readonly SIT_DEFAULT_DURATION = 12.0;
  private static readonly LEAN_DEFAULT_DURATION = 6.0;
  private static readonly LOOKAT_DEFAULT_DURATION = 4.0;
  private static readonly EMOTE_DEFAULT_DURATION = 2.5;
  private static readonly PRESENT_DEFAULT_DURATION = 8.0;
  private static readonly CONTEMPLATE_PHASES = 3; // number of POIs to look at

  public static readonly taskRegistries = new Map<string, AgentTaskQueue>();

  constructor(agentId: string) {
    this.agentId = agentId;
    AgentTaskQueue.taskRegistries.set(agentId, this);
  }

  // --- PUBLIC API ---

  private cleanupTask(task: AgentTask | null): void {
    if (!task) return;
    if (task.itemId) {
      InteractableRegistry.getInstance().unclaimItem(task.itemId, this.agentId);
    }
  }

  public enqueue(task: AgentTask): void {
    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);

    if (this.currentTask && task.priority > this.currentTask.priority) {
      this.cleanupTask(this.currentTask);
      this.queue.push(this.currentTask);
      this.queue.sort((a, b) => b.priority - a.priority);
      this.startNextTask();
      return;
    }

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
    this.queue = this.queue.filter((t) => t.scriptId !== scriptId);
    if (this.currentTask?.scriptId === scriptId) {
      this.cleanupTask(this.currentTask);
      this.phase = "COMPLETED";
    }
  }

  public getCurrentPhase(): TaskPhase { return this.phase; }
  public getCurrentTask(): AgentTask | null { return this.currentTask; }

  public isBusy(): boolean {
    return (
      (this.phase !== "IDLE" && this.phase !== "COMPLETED") ||
      this.queue.length > 0
    );
  }

  /** Returns whether the agent is in an experiential (non-movement) pose state. */
  public isInPoseState(): boolean {
    return (
      this.phase === "SEATED" ||
      this.phase === "LEANING" ||
      this.phase === "GAZING" ||
      this.phase === "EMOTING" ||
      this.phase === "PRESENTING"
    );
  }

  public cancel(): void {
    this.queue = [];
    this.currentTask = null;
    this.phase = "IDLE";
    this.resetState();
  }

  private resetState(): void {
    this.phaseTimer = 0;
    this.hasSetPath = false;
    this.isCloseApproach = false;
    this.approachPos = null;
    this.stuckTimer = 0;
    this.repathTimer = 0;
    this.retryCount = 0;
    this.pathRefreshTimer = 0;
    this.stuckWindowPositions = [];
  }

  private startNextTask(): void {
    if (this.queue.length === 0) {
      this.currentTask = null;
      this.phase = "IDLE";
      return;
    }

    this.currentTask = this.queue.shift()!;
    this.resetState();

    const reg = InteractableRegistry.getInstance();

    /** Resolve a zone ID to a world position — checks park routes first, then placing areas. */
    const resolveZonePos = (zoneId: string): THREE.Vector3 | null => {
      const parkCenter = getZoneCenterPosition(zoneId);
      if (parkCenter) return parkCenter;
      return reg.getZoneCenter(zoneId);
    };

    // Resolve Semantic Zone targets
    if (this.currentTask.type === "GO_TO" && this.currentTask.targetAreaId) {
      if (!this.currentTask.targetPos) {
        const center = resolveZonePos(this.currentTask.targetAreaId);
        if (center) {
          this.currentTask.targetPos = center;
        } else {
          this.phase = "COMPLETED";
          return;
        }
      }
    }

    // Resolve zone targets for experiential tasks
    if (
      (this.currentTask.type === "CONTEMPLATE" ||
        this.currentTask.type === "REST" ||
        this.currentTask.type === "EXPLORE") &&
      this.currentTask.targetAreaId &&
      !this.currentTask.targetPos
    ) {
      const center = resolveZonePos(this.currentTask.targetAreaId);
      if (center) {
        this.currentTask.targetPos = center;
      } else {
        this.phase = "COMPLETED";
        return;
      }
    }

    if (this.currentTask.type === "PICK_NEARBY" && this.currentTask.itemId) {
      if (!reg.claimItem(this.currentTask.itemId, this.agentId)) {
        this.phase = "COMPLETED";
        return;
      }
    }

    this.phase = "NAVIGATING";

    // Subconscious chatter on task start
    if (
      this.currentTask.type !== "SAY" &&
      this.currentTask.type !== "WANDER" &&
      this.currentTask.type !== "EMOTE" &&
      Math.random() < 0.25
    ) {
      const isExperiential = ["SIT", "REST", "CONTEMPLATE", "EXPLORE"].includes(
        this.currentTask.type,
      );
      const phrase = isExperiential
        ? getRandomPhrase("MOVING")
        : this.currentTask.type === "GO_TO"
          ? getRandomPhrase("MOVING")
          : getRandomPhrase("WORKING");
      window.dispatchEvent(
        new CustomEvent("subconscious-speak", {
          detail: { agentId: this.agentId, text: phrase },
        }),
      );
    }
  }

  // --- Stuck Detection ---

  private recordPosition(x: number, z: number, time: number): void {
    this.stuckWindowPositions.push({ x, z, t: time });
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
    const last = this.stuckWindowPositions[this.stuckWindowPositions.length - 1];
    if (last.t - first.t < AgentTaskQueue.STUCK_WINDOW * 0.8) return false;
    const dist = Math.hypot(last.x - first.x, last.z - first.z);
    return dist < AgentTaskQueue.STUCK_MIN_DISTANCE;
  }

  // ============================================================================
  // MAIN UPDATE LOOP
  // ============================================================================

  public update(
    delta: number,
    vehiclePos: THREE.Vector3,
    playerPos?: THREE.Vector3,
  ): SteeringCommand {
    if (this.phase === "IDLE") return { type: "NONE" };

    this.elapsedTime += delta;

    if (this.phase === "COMPLETED") {
      this.startNextTask();
      if ((this.phase as string) === "IDLE") return { type: "NONE" };
    }

    // ------------------------------------------------------------------
    // INSTANT / TIMER-DRIVEN PHASES (no navigation)
    // ------------------------------------------------------------------

    if (this.currentTask?.type === "SAY" || this.currentTask?.type === "WAIT") {
      if (this.phaseTimer === 0 && this.currentTask.type === "SAY") {
        window.dispatchEvent(
          new CustomEvent("agent-speak", {
            detail: {
              agentId: this.agentId,
              text: (this.currentTask as any).message || this.currentTask.content || "Hello.",
            },
          }),
        );
      }
      this.phaseTimer += delta;
      let dur = this.currentTask.duration || 2.0;
      if (this.currentTask.type === "SAY") {
        const charLen = (
          (this.currentTask as any).message ||
          this.currentTask.content ||
          ""
        ).length;
        dur = Math.max(2.0, charLen * 0.08);
      }
      if (this.phaseTimer > dur) this.phase = "COMPLETED";
      return { type: "STOP" };
    }

    // EMOTE: play gesture in place, no movement
    if (this.phase === "EMOTING") {
      this.phaseTimer += delta;
      const dur = this.currentTask?.duration ?? AgentTaskQueue.EMOTE_DEFAULT_DURATION;
      if (this.phaseTimer >= dur) this.phase = "COMPLETED";
      return { type: "STOP" };
    }

    // SEATED: agent sitting on bench
    if (this.phase === "SEATED") {
      this.phaseTimer += delta;
      const dur = this.currentTask?.duration ?? AgentTaskQueue.SIT_DEFAULT_DURATION;
      if (this.phaseTimer >= dur) this.phase = "COMPLETED";
      return { type: "STOP" };
    }

    // LEANING: agent leaning on surface
    if (this.phase === "LEANING") {
      this.phaseTimer += delta;
      const dur = this.currentTask?.duration ?? AgentTaskQueue.LEAN_DEFAULT_DURATION;
      if (this.phaseTimer >= dur) this.phase = "COMPLETED";
      return { type: "STOP" };
    }

    // GAZING: agent looking at a target (LOOK_AT / CONTEMPLATE)
    if (this.phase === "GAZING") {
      this.phaseTimer += delta;
      const dur = this.currentTask?.duration ?? AgentTaskQueue.LOOKAT_DEFAULT_DURATION;
      if (this.phaseTimer >= dur) this.phase = "COMPLETED";
      const faceTarget = this.currentTask?.lookTarget;
      return { type: "STOP", faceTarget };
    }

    // PRESENTING: at podium, speaking
    if (this.phase === "PRESENTING") {
      this.phaseTimer += delta;
      // Speak if we haven't yet
      if (this.phaseTimer === 0 || (this.phaseTimer < delta * 2 && this.currentTask?.content)) {
        window.dispatchEvent(
          new CustomEvent("agent-speak", {
            detail: {
              agentId: this.agentId,
              text: this.currentTask!.content!,
            },
          }),
        );
      }
      const dur = this.currentTask?.duration ?? AgentTaskQueue.PRESENT_DEFAULT_DURATION;
      if (this.phaseTimer >= dur) this.phase = "COMPLETED";
      return { type: "STOP" };
    }

    const reg = InteractableRegistry.getInstance();

    // ------------------------------------------------------------------
    // NAVIGATING
    // ------------------------------------------------------------------
    if (this.phase === "NAVIGATING") {
      let targetPos: THREE.Vector3 | null = null;

      switch (this.currentTask!.type) {
        case "GO_TO":
          targetPos = this.currentTask!.targetPos || null;
          break;
        case "PICK_NEARBY":
        case "INTERACT":
          targetPos = reg.getWorldPosition(this.currentTask!.itemId!) || null;
          break;
        case "PLACE_INVENTORY":
          targetPos = reg.getAreaWorldPosition(this.currentTask!.destAreaId!) || null;
          break;
        case "FOLLOW_PLAYER":
          targetPos = playerPos ? playerPos.clone() : null;
          break;
        case "WANDER": {
          if (!this.currentTask!.targetPos) {
            const r = 10;
            const theta = Math.random() * Math.PI * 2;
            this.currentTask!.targetPos = new THREE.Vector3(
              Math.max(
                AgentTaskQueue.WANDER_X_MIN,
                Math.min(AgentTaskQueue.WANDER_X_MAX, vehiclePos.x + r * Math.cos(theta)),
              ),
              vehiclePos.y,
              Math.max(
                AgentTaskQueue.WANDER_Z_MIN,
                Math.min(AgentTaskQueue.WANDER_Z_MAX, vehiclePos.z + r * Math.sin(theta)),
              ),
            );
          }
          targetPos = this.currentTask!.targetPos;
          break;
        }
        // Experiential tasks that navigate first
        case "SIT":
          // Navigate to the bench position (stored in targetPos)
          targetPos = this.currentTask!.targetPos || null;
          if (!targetPos && this.currentTask!.itemId) {
            targetPos = reg.getWorldPosition(this.currentTask!.itemId) || null;
          }
          break;
        case "LEAN":
        case "LOOK_AT":
        case "CONTEMPLATE":
        case "EXPLORE":
        case "REST":
          targetPos = this.currentTask!.targetPos || null;
          break;
        case "COLLABORATE":
          // Navigate toward partner agent (position updated each tick by brain)
          targetPos = this.currentTask!.targetPos || null;
          break;
        case "PRESENT":
          // Navigate to podium
          targetPos = this.currentTask!.targetPos || null;
          break;
        case "EMOTE":
          // No navigation — jump straight to EMOTING
          this.phase = "EMOTING";
          this.phaseTimer = 0;
          return { type: "STOP" };
      }

      if (!targetPos) {
        this.phase = "COMPLETED";
        return { type: "STOP" };
      }

      // Pathfinding
      this.pathRefreshTimer += delta;
      if (
        !this.hasSetPath ||
        this.pathRefreshTimer >= AgentTaskQueue.PATH_REFRESH_INTERVAL
      ) {
        if (!(this as any)._isWaitingForPath) {
          (this as any)._isWaitingForPath = true;
          AgentBrainClient.getInstance()
            .findPathDetailed(vehiclePos, targetPos)
            .then((result) => {
              (this as any)._isWaitingForPath = false;
              (this as any)._pendingPathResult = result;
            })
            .catch(() => {
              (this as any)._isWaitingForPath = false;
            });
        }

        if ((this as any)._pendingPathResult) {
          const result = (this as any)._pendingPathResult;
          (this as any)._pendingPathResult = null;
          this.approachPos = result.approachPos;

          if (!result.pathFound || result.path.length === 0) {
            this.hasSetPath = true;
            this.repathTimer = AgentTaskQueue.REPATH_INTERVAL - 1.0;
            return { type: "STOP" };
          }
          this.hasSetPath = true;
          this.pathRefreshTimer = 0;
          if (this.approachPos) this.approachPos.y = vehiclePos.y;
          return { type: "FOLLOW_PATH", path: result.path };
        } else {
          return { type: "STOP" };
        }
      }

      // Distance check
      const distCheckPos = this.approachPos || targetPos;
      const distToTarget = Math.hypot(
        vehiclePos.x - distCheckPos.x,
        vehiclePos.z - distCheckPos.z,
      );
      this.recordPosition(vehiclePos.x, vehiclePos.z, this.elapsedTime);

      // Arrival
      if (distToTarget < AgentTaskQueue.ARRIVAL_DIST) {
        const type = this.currentTask!.type;

        if (
          type === "GO_TO" ||
          type === "WANDER" ||
          type === "EXPLORE" ||
          type === "COLLABORATE"
        ) {
          this.phase = "COMPLETED";
          return { type: "STOP" };
        } else if (type === "FOLLOW_PLAYER") {
          this.hasSetPath = false;
          return { type: "ARRIVE", target: targetPos };
        } else if (type === "SIT" || type === "REST") {
          // Transition to SEATED
          this.phase = "SEATED";
          this.phaseTimer = 0;
          return { type: "STOP" };
        } else if (type === "LEAN") {
          this.phase = "LEANING";
          this.phaseTimer = 0;
          return { type: "STOP" };
        } else if (type === "LOOK_AT" || type === "CONTEMPLATE") {
          this.phase = "GAZING";
          this.phaseTimer = 0;
          return { type: "STOP", faceTarget: this.currentTask!.lookTarget };
        } else if (type === "PRESENT") {
          this.phase = "PRESENTING";
          this.phaseTimer = 0;
          return { type: "STOP" };
        } else {
          this.phase = "ACTION_START";
          this.phaseTimer = 0;
          return { type: "STOP", faceTarget: targetPos };
        }
      }

      // Close approach
      if (
        this.currentTask?.type !== "FOLLOW_PLAYER" &&
        distToTarget < AgentTaskQueue.CLOSE_APPROACH_DIST
      ) {
        if (!this.isCloseApproach) {
          this.isCloseApproach = true;
          this.stuckWindowPositions = [];
          const arriveTarget = distCheckPos.clone();
          arriveTarget.y = vehiclePos.y;
          return { type: "ARRIVE", target: arriveTarget };
        }

        this.repathTimer += delta;
        if (this.isStuckByWindow() || this.repathTimer > 3.0) {
          this.retryCount++;
          if (this.retryCount >= AgentTaskQueue.MAX_RETRIES) {
            this.cleanupTask(this.currentTask);
            this.phase = "COMPLETED";
            return { type: "STOP" };
          }
          this.repathTimer = 0;
          this.stuckWindowPositions = [];
        }
        return { type: "NONE" };
      }

      // Stuck detection
      this.repathTimer += delta;
      if (
        (this.isStuckByWindow() &&
          this.elapsedTime -
            (this.stuckWindowPositions[0]?.t ?? this.elapsedTime) >
            AgentTaskQueue.STUCK_THRESHOLD) ||
        this.repathTimer > AgentTaskQueue.REPATH_INTERVAL
      ) {
        this.retryCount++;
        if (this.retryCount >= AgentTaskQueue.MAX_RETRIES) {
          this.cleanupTask(this.currentTask);
          this.phase = "COMPLETED";
          return { type: "STOP" };
        }
        this.hasSetPath = false;
        this.repathTimer = 0;
      }

      return { type: "NONE" };
    }

    // ------------------------------------------------------------------
    // ACTION_START: brief pause before the atomic action
    // ------------------------------------------------------------------
    if (this.phase === "ACTION_START") {
      this.phaseTimer += delta;
      if (this.phaseTimer >= AgentTaskQueue.ACTION_DELAY) {
        const type = this.currentTask!.type;

        if (type === "PICK_NEARBY") {
          if (reg.pickUp(this.currentTask!.itemId!, this.agentId)) {
            memoryStream
              .add(this.agentId, "ACTION", "I picked up the item.", [
                `script:${this.currentTask!.scriptId}`,
              ])
              .catch(() => {});
          }
        } else if (type === "PLACE_INVENTORY") {
          if (reg.placeItemAt(this.agentId, this.currentTask!.destAreaId!)) {
            memoryStream
              .add(this.agentId, "ACTION", "I placed the item down.", [
                `script:${this.currentTask!.scriptId}`,
              ])
              .catch(() => {});
          }
        } else if (type === "INTERACT") {
          window.dispatchEvent(
            new CustomEvent("agent-interact", {
              detail: {
                agentId: this.agentId,
                targetId: this.currentTask!.itemId!,
              },
            }),
          );
          memoryStream
            .add(this.agentId, "ACTION", "I interacted with the object.", [
              `script:${this.currentTask!.scriptId}`,
            ])
            .catch(() => {});
        }

        this.phase = "COMPLETED";
      }
      return { type: "STOP" };
    }

    return { type: "NONE" };
  }
}

// Legacy registry proxy for UI components
export const AgentTaskRegistry = {
  getInstance() {
    return this;
  },
  get(agentId: string) {
    return AgentTaskQueue.taskRegistries.get(agentId);
  },
  getOrCreate(agentId: string) {
    if (!AgentTaskQueue.taskRegistries.has(agentId))
      new AgentTaskQueue(agentId);
    return AgentTaskQueue.taskRegistries.get(agentId)!;
  },
  getAllAgentIds() {
    return Array.from(AgentTaskQueue.taskRegistries.keys());
  },
  getAgentUsingItem(itemId: string, excludeAgentId: string) {
    for (const [id, q] of AgentTaskQueue.taskRegistries.entries()) {
      if (id === excludeAgentId) continue;
      if (q.getCurrentTask()?.itemId === itemId) return id;
    }
    return null;
  },
  getQueueStatus(agentId: string) {
    const q = this.get(agentId);
    return { phase: q ? q.getCurrentPhase() : "IDLE" };
  },
};
