import * as THREE from "three";
import { InteractableRegistry } from "./InteractableRegistry";
import { AgentBrainClient } from "@/lib/workers/AgentBrainClient";
import { memoryStream } from "@/lib/memory/MemoryStream";
import { getRandomPhrase } from "@/lib/audio/phraseBank";
import { getZoneCenterPosition, getNearestBench } from "@/config/donutLabRoutines";

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
  | "SIT"
  | "LEAN"
  | "LOOK_AT"
  | "CONTEMPLATE"
  | "EXPLORE"
  | "REST"
  | "COLLABORATE"
  | "PRESENT"
  | "EMOTE";

export interface AgentTask {
  type: AgentTaskType;
  priority: number;
  scriptId?: string;
  itemId?: string;
  destAreaId?: string;
  targetAreaId?: string;
  targetPos?: THREE.Vector3;
  duration?: number;
  content?: string;
  lookTarget?: THREE.Vector3;
  gesture?: "wave" | "nod" | "shrug" | "cheer" | "think";
  partnerId?: string;
}

export type TaskPhase =
  | "IDLE"
  | "NAVIGATING"
  | "ACTION_START"
  | "SEATED"
  | "LEANING"
  | "GAZING"
  | "EMOTING"
  | "PRESENTING"
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
  private repathTimer: number = 0;
  private stuckWindowPositions: { x: number; z: number; t: number }[] = [];
  private retryCount: number = 0;
  private pathRefreshTimer: number = 0;

  private static readonly STUCK_WINDOW = 2.5;
  private static readonly PATH_REFRESH_INTERVAL = 1.5;
  private static readonly STUCK_MIN_DISTANCE = 1.0;
  private static readonly REPATH_INTERVAL = 8.0;
  private static readonly MAX_RETRIES = 5;
  private static readonly ARRIVAL_DIST = 2.5;
  private static readonly CLOSE_APPROACH_DIST = 4.0;

  private static readonly SIT_DEFAULT_DURATION = 12.0;
  private static readonly LEAN_DEFAULT_DURATION = 6.0;
  private static readonly LOOKAT_DEFAULT_DURATION = 4.0;
  private static readonly EMOTE_DEFAULT_DURATION = 2.5;
  private static readonly PRESENT_DEFAULT_DURATION = 8.0;

  public static readonly taskRegistries = new Map<string, AgentTaskQueue>();

  constructor(agentId: string) {
    this.agentId = agentId;
    AgentTaskQueue.taskRegistries.set(agentId, this);
  }

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

  public cancelScript(scriptId: string): void {
    this.queue = this.queue.filter((t) => t.scriptId !== scriptId);
    if (this.currentTask?.scriptId === scriptId) {
      this.cleanupTask(this.currentTask);
      this.setPhase("COMPLETED");
    }
  }

  public getCurrentPhase(): TaskPhase { return this.phase; }
  public getCurrentTask(): AgentTask | null { return this.currentTask; }

  private setPhase(newPhase: TaskPhase): void {
    const oldPhase = this.phase;
    this.phase = newPhase;
    if (newPhase === "COMPLETED" && oldPhase !== "COMPLETED") {
      window.dispatchEvent(
        new CustomEvent("agent-task-completed", {
          detail: { agentId: this.agentId, taskType: this.currentTask?.type || "UNKNOWN" },
        })
      );
    }
  }

  public isBusy(): boolean {
    return (this.phase !== "IDLE" && this.phase !== "COMPLETED") || this.queue.length > 0;
  }

  public isInPoseState(): boolean {
    return ["SEATED", "LEANING", "GAZING", "EMOTING", "PRESENTING"].includes(this.phase);
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
    const resolveZonePos = (zoneId: string): THREE.Vector3 | null => {
      const parkCenter = getZoneCenterPosition(zoneId);
      if (parkCenter) return parkCenter;
      return reg.getZoneCenter(zoneId);
    };

    if (this.currentTask.targetAreaId && !this.currentTask.targetPos) {
      this.currentTask.targetPos = resolveZonePos(this.currentTask.targetAreaId) || undefined;
      if (!this.currentTask.targetPos) {
        this.setPhase("COMPLETED");
        return;
      }
    }

    if (this.currentTask.type === "PICK_NEARBY" && this.currentTask.itemId) {
      if (!reg.claimItem(this.currentTask.itemId, this.agentId)) {
        this.setPhase("COMPLETED");
        return;
      }
    }

    if (this.currentTask.type === "SIT" || this.currentTask.type === "REST") {
      const targetId = this.currentTask.itemId;
      if (targetId) {
        const isClaimedByOther = reg.isItemClaimed(targetId) && reg.getItemClaimant(targetId) !== this.agentId;
        if (isClaimedByOther) {
          const bench = reg.getById(targetId);
          const altBench = getNearestBench(bench?.position as THREE.Vector3 || this.currentTask.targetPos!);
          if (altBench) this.currentTask.targetPos = altBench;
        }
      }
    }

    this.phase = "NAVIGATING";

    if (!["SAY", "WANDER", "EMOTE"].includes(this.currentTask.type) && Math.random() < 0.25) {
      const phrase = ["SIT", "REST", "CONTEMPLATE", "EXPLORE"].includes(this.currentTask.type)
        ? getRandomPhrase("MOVING") : getRandomPhrase("WORKING");
      window.dispatchEvent(new CustomEvent("subconscious-speak", { detail: { agentId: this.agentId, text: phrase } }));
    }
  }

  private recordPosition(x: number, z: number, time: number): void {
    this.stuckWindowPositions.push({ x, z, t: time });
    const cutoff = time - AgentTaskQueue.STUCK_WINDOW;
    while (this.stuckWindowPositions.length > 0 && this.stuckWindowPositions[0].t < cutoff) {
      this.stuckWindowPositions.shift();
    }
  }

  private isStuckByWindow(): boolean {
    if (this.stuckWindowPositions.length < 2) return false;
    const first = this.stuckWindowPositions[0];
    const last = this.stuckWindowPositions[this.stuckWindowPositions.length - 1];
    if (last.t - first.t < AgentTaskQueue.STUCK_WINDOW * 0.8) return false;
    return Math.hypot(last.x - first.x, last.z - first.z) < AgentTaskQueue.STUCK_MIN_DISTANCE;
  }

  public update(delta: number, vehiclePos: THREE.Vector3, playerPos?: THREE.Vector3): SteeringCommand {
    if (this.phase === "IDLE") return { type: "NONE" };
    this.elapsedTime += delta;

    if (this.phase === "COMPLETED") {
      this.startNextTask();
      if ((this.phase as TaskPhase) === "IDLE") return { type: "NONE" };
    }

    if (this.currentTask?.type === "SAY" || this.currentTask?.type === "WAIT") {
        if (this.phaseTimer === 0 && this.currentTask.type === "SAY") {
            window.dispatchEvent(new CustomEvent("agent-speak", {
                detail: { agentId: this.agentId, text: (this.currentTask as any).message || this.currentTask.content || "Hello." }
            }));
        }
        this.phaseTimer += delta;
        let dur = this.currentTask.duration || 2.0;
        if (this.currentTask.type === "SAY") {
            const content = (this.currentTask as any).message || this.currentTask.content || "";
            dur = Math.max(2.0, content.length * 0.08);
        }
        if (this.phaseTimer > dur) this.setPhase("COMPLETED");
        return { type: "STOP" };
    }

    if (["EMOTING", "SEATED", "LEANING", "GAZING", "PRESENTING"].includes(this.phase)) {
        this.phaseTimer += delta;
        let dur = this.currentTask?.duration || 4.0;
        if (this.phase === "EMOTING") dur = this.currentTask?.duration ?? AgentTaskQueue.EMOTE_DEFAULT_DURATION;
        if (this.phase === "SEATED") dur = this.currentTask?.duration ?? AgentTaskQueue.SIT_DEFAULT_DURATION;
        if (this.phase === "LEANING") dur = this.currentTask?.duration ?? AgentTaskQueue.LEAN_DEFAULT_DURATION;
        if (this.phase === "GAZING") dur = this.currentTask?.duration ?? AgentTaskQueue.LOOKAT_DEFAULT_DURATION;
        if (this.phase === "PRESENTING") {
            if (this.phaseTimer < delta * 2 && this.currentTask?.content) {
                window.dispatchEvent(new CustomEvent("agent-speak", { detail: { agentId: this.agentId, text: this.currentTask.content } }));
            }
            dur = this.currentTask?.duration ?? AgentTaskQueue.PRESENT_DEFAULT_DURATION;
        }
        if (this.phaseTimer >= dur) this.setPhase("COMPLETED");
        return { type: "STOP", faceTarget: this.currentTask?.lookTarget };
    }

    const reg = InteractableRegistry.getInstance();
    if (this.phase === "NAVIGATING") {
      let targetPos: THREE.Vector3 | null = null;
      switch (this.currentTask!.type) {
        case "GO_TO": targetPos = this.currentTask!.targetPos || null; break;
        case "PICK_NEARBY":
        case "INTERACT": if (this.currentTask!.itemId) targetPos = reg.getWorldPosition(this.currentTask!.itemId); break;
        case "PLACE_INVENTORY": if (this.currentTask!.destAreaId) targetPos = reg.getAreaWorldPosition(this.currentTask!.destAreaId); break;
        case "FOLLOW_PLAYER": targetPos = playerPos?.clone() || null; break;
        case "WANDER":
          if (!this.currentTask!.targetPos) {
            const innerR = 41, outerR = 92;
            const dist = innerR + Math.random() * (outerR - innerR), theta = Math.random() * Math.PI * 2;
            this.currentTask!.targetPos = new THREE.Vector3(dist * Math.cos(theta), vehiclePos.y, dist * Math.sin(theta));
          }
          targetPos = this.currentTask!.targetPos;
          break;
        case "SIT":
        case "REST":
          targetPos = this.currentTask!.targetPos || (this.currentTask!.itemId ? reg.getWorldPosition(this.currentTask!.itemId) : null);
          break;
        default: targetPos = this.currentTask!.targetPos || null; break;
      }

      if (!targetPos) { this.setPhase("COMPLETED"); return { type: "STOP" }; }

      this.pathRefreshTimer += delta;
      if (!this.hasSetPath || this.pathRefreshTimer >= AgentTaskQueue.PATH_REFRESH_INTERVAL) {
        if (!(this as any)._isWaitingForPath) {
          (this as any)._isWaitingForPath = true;
          AgentBrainClient.getInstance().findPathDetailed(vehiclePos, targetPos)
            .then(result => { (this as any)._isWaitingForPath = false; (this as any)._pendingPathResult = result; })
            .catch(() => { (this as any)._isWaitingForPath = false; });
        }
        if ((this as any)._pendingPathResult) {
          const result = (this as any)._pendingPathResult; (this as any)._pendingPathResult = null;
          this.approachPos = result.approachPos;
          if (!result.pathFound || result.path.length === 0) { this.hasSetPath = true; this.repathTimer = AgentTaskQueue.REPATH_INTERVAL - 1; return { type: "STOP" }; }
          this.hasSetPath = true; this.pathRefreshTimer = 0; if (this.approachPos) this.approachPos.y = vehiclePos.y;
          return { type: "FOLLOW_PATH", path: result.path };
        }
        return { type: "STOP" };
      }

      const distCheckPos = this.approachPos || targetPos;
      const distToTarget = Math.hypot(vehiclePos.x - distCheckPos.x, vehiclePos.z - distCheckPos.z);
      this.recordPosition(vehiclePos.x, vehiclePos.z, this.elapsedTime);

      if (distToTarget < AgentTaskQueue.ARRIVAL_DIST) {
        const type = this.currentTask!.type;
        if (["GO_TO", "WANDER", "EXPLORE", "COLLABORATE"].includes(type)) { this.setPhase("COMPLETED"); return { type: "STOP" }; }
        if (type === "FOLLOW_PLAYER") { this.hasSetPath = false; return { type: "ARRIVE", target: targetPos }; }
        if (type === "SIT" || type === "REST") { this.phase = "SEATED"; this.phaseTimer = 0; return { type: "STOP" }; }
        if (type === "LEAN") { this.phase = "LEANING"; this.phaseTimer = 0; return { type: "STOP" }; }
        if (type === "LOOK_AT" || type === "CONTEMPLATE") { this.phase = "GAZING"; this.phaseTimer = 0; return { type: "STOP", faceTarget: this.currentTask!.lookTarget }; }
        if (type === "PRESENT") { this.phase = "PRESENTING"; this.phaseTimer = 0; return { type: "STOP" }; }
        this.phase = "ACTION_START"; this.phaseTimer = 0; return { type: "STOP", faceTarget: targetPos };
      }

      if (this.currentTask?.type !== "FOLLOW_PLAYER" && distToTarget < AgentTaskQueue.CLOSE_APPROACH_DIST) {
        if (!this.isCloseApproach) { this.isCloseApproach = true; this.stuckWindowPositions = []; const arriveTarget = distCheckPos.clone(); arriveTarget.y = vehiclePos.y; return { type: "ARRIVE", target: arriveTarget }; }
        this.repathTimer += delta;
        if (this.isStuckByWindow() || this.repathTimer > 3.0) {
          this.retryCount++;
          if (this.retryCount >= AgentTaskQueue.MAX_RETRIES) { console.warn(`Task failed: ${this.currentTask?.type}`); this.cleanupTask(this.currentTask); this.setPhase("COMPLETED"); return { type: "STOP" }; }
          this.repathTimer = 0; this.hasSetPath = false; this.stuckWindowPositions = [];
        }
        return { type: "NONE" };
      }
    }
    return { type: "NONE" };
  }
}

export class AgentTaskRegistry {
  private static instance: AgentTaskRegistry;
  private constructor() {}
  public static getInstance() { if (!this.instance) this.instance = new AgentTaskRegistry(); return this.instance; }
  public getOrCreate(id: string) { return AgentTaskQueue.taskRegistries.get(id) || new AgentTaskQueue(id); }
  public getAllAgentIds(): string[] { return Array.from(AgentTaskQueue.taskRegistries.keys()); }
  public getQueueStatus(id: string) {
    const q = AgentTaskQueue.taskRegistries.get(id);
    return { phase: q ? q.getCurrentPhase() : "IDLE" };
  }
  public getAgentUsingItem(itemId: string, requesterId: string): string | null {
    for (const [agentId, q] of AgentTaskQueue.taskRegistries.entries()) {
      if (agentId !== requesterId && q.getCurrentTask()?.itemId === itemId) return agentId;
    }
    return null;
  }
}
