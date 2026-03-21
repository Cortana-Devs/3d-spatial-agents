import * as THREE from "three";
import { InteractableRegistry } from "./InteractableRegistry";
import NavigationNetwork from "./NavigationNetwork";
import { memoryStream } from "@/lib/memory/MemoryStream";
import { getRandomPhrase } from "@/lib/audio/phraseBank";

// ============================================================================
// Task Types
// Maps closely to the LLM tool-calling API
// ============================================================================

export type AgentTaskType =
  | "GO_TO"
  | "PICK_NEARBY"
  | "PLACE_INVENTORY"
  | "INTERACT"
  | "SAY"
  | "FOLLOW_PLAYER"
  | "WANDER"
  | "WAIT";

export interface AgentTask {
  type: AgentTaskType;
  priority: number; // 0 = Subconscious Wander, 10 = LLM Script
  scriptId?: string; // Groups tasks together
  itemId?: string; // For PICK_NEARBY / INTERACT
  destAreaId?: string; // For PLACE_INVENTORY
  targetAreaId?: string; // For GO_TO (Semantic Zone ID mapping)
  targetPos?: THREE.Vector3; // For GO_TO
  duration?: number; // For WAIT
  content?: string; // For SAY
}

// ============================================================================
// Task Phase State Machine (Radically flattened)
// ============================================================================

export type TaskPhase =
  | "IDLE"
  | "NAVIGATING"
  | "ACTION_START" // Brief pause before the action happens
  | "COMPLETED";

// Return type: tells useYukaAI what steering to apply
export interface SteeringCommand {
  type: "FOLLOW_PATH" | "ARRIVE" | "STOP" | "NONE";
  path?: THREE.Vector3[];
  target?: THREE.Vector3;
  faceTarget?: THREE.Vector3;
}

// ============================================================================
// AgentTaskQueue — Thin Action Executor
// ============================================================================

export class AgentTaskQueue {
  private queue: AgentTask[] = [];
  private currentTask: AgentTask | null = null;
  private phase: TaskPhase = "IDLE";
  private phaseTimer: number = 0;
  private agentId: string;

  // Path tracking
  private hasSetPath: boolean = false;
  private approachPos: THREE.Vector3 | null = null;
  private isCloseApproach: boolean = false;

  // Stuck detection (Sliding window)
  private elapsedTime: number = 0;
  private stuckTimer: number = 0;
  private repathTimer: number = 0;
  private stuckWindowPositions: { x: number; z: number; t: number }[] = [];
  private retryCount: number = 0;

  private static readonly STUCK_WINDOW = 2.5;
  private static readonly STUCK_MIN_DISTANCE = 1.0;
  private static readonly STUCK_THRESHOLD = 3.0;
  private static readonly REPATH_INTERVAL = 8.0;
  private static readonly MAX_RETRIES = 5;

  private static readonly ARRIVAL_DIST = 2.5; // Tighter for direct atomic actions
  private static readonly CLOSE_APPROACH_DIST = 4.0;
  private static readonly ACTION_DELAY = 0.5;

  // Export singleton context (e.g. for UI panels, debug)
  public static readonly taskRegistries = new Map<string, AgentTaskQueue>();

  constructor(agentId: string) {
    this.agentId = agentId;
    AgentTaskQueue.taskRegistries.set(agentId, this);
  }

  // --- PUBLIC API ---

  public enqueue(task: AgentTask): void {
    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);

    // Preemption
    if (this.currentTask && task.priority > this.currentTask.priority) {
      console.log(`[AgentTaskQueue:${this.agentId}] Preempting task ${this.currentTask.type}`);
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
    const initialLen = this.queue.length;
    this.queue = this.queue.filter((t) => t.scriptId !== scriptId);

    if (this.currentTask?.scriptId === scriptId) {
      const reg = InteractableRegistry.getInstance();
      if (this.currentTask.itemId) reg.unclaimItem(this.currentTask.itemId, this.agentId);
      
      this.phase = "COMPLETED";
    }
  }

  public getCurrentPhase(): TaskPhase { return this.phase; }
  public getCurrentTask(): AgentTask | null { return this.currentTask; }
  public isBusy(): boolean { return this.phase !== "IDLE" && this.phase !== "COMPLETED" || this.queue.length > 0; }

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
    
    // Validate target/items early
    const reg = InteractableRegistry.getInstance();
    
    // Resolve Semantic Zone targets
    if (this.currentTask.type === "GO_TO" && this.currentTask.targetAreaId) {
        const targetStr = this.currentTask.targetAreaId.toLowerCase();
        
        // Hardcoded safe zones to prevent NavMesh stuck issues
        if (targetStr.includes("meeting") || targetStr.includes("conference")) {
            const { getMeetingRoomPosition } = require("@/config/agentRoutines");
            const pos = getMeetingRoomPosition();
            if (pos) this.currentTask.targetPos = pos;
        }

        if (!this.currentTask.targetPos) {
            const center = reg.getZoneCenter(this.currentTask.targetAreaId);
            if (center) {
               this.currentTask.targetPos = center;
            } else {
               console.warn(`[AgentTaskQueue:${this.agentId}] Null Zone Center for ${this.currentTask.targetAreaId}`);
               this.phase = "COMPLETED";
               return;
            }
        }
    }

    if (this.currentTask.type === "PICK_NEARBY" && this.currentTask.itemId) {
      if (!reg.claimItem(this.currentTask.itemId, this.agentId)) {
        console.warn(`[AgentTaskQueue:${this.agentId}] Failed to claim ${this.currentTask.itemId}`);
        this.phase = "COMPLETED";
        return;
      }
    }

    this.phase = "NAVIGATING";
    console.log(`[AgentTaskQueue:${this.agentId}] Started atomic task: ${this.currentTask.type}`);
    
    // Subconscious Chatter (30% chance to mutter when starting a physical task)
    if (this.currentTask.type !== "SAY" && this.currentTask.type !== "WANDER" && Math.random() < 0.3) {
      const phrase = this.currentTask.type === "GO_TO" ? getRandomPhrase("MOVING") : getRandomPhrase("WORKING");
      window.dispatchEvent(
         new CustomEvent("subconscious-speak", {
           detail: { agentId: this.agentId, text: phrase },
         })
      );
    }
  }

  // --- Stuck Detection ---
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
    const dist = Math.hypot(last.x - first.x, last.z - first.z);
    return dist < AgentTaskQueue.STUCK_MIN_DISTANCE;
  }

  // --- MAIN UPDATE LOOP ---

  public update(delta: number, vehiclePos: THREE.Vector3, playerPos?: THREE.Vector3): SteeringCommand {
    if (this.phase === "IDLE") return { type: "NONE" };

    this.elapsedTime += delta;

    if (this.phase === "COMPLETED") {
      this.startNextTask();
      if ((this.phase as string) === "IDLE") return { type: "NONE" };
    }

    if (this.currentTask?.type === "SAY" || this.currentTask?.type === "WAIT") {
       if (this.phaseTimer === 0 && this.currentTask.type === "SAY") {
          window.dispatchEvent(
            new CustomEvent("agent-speak", {
              detail: { agentId: this.agentId, text: (this.currentTask as any).message || "Hello." },
            })
          );
       }
       this.phaseTimer += delta;
       
       // Calculate TTS speaking duration heuristically (approx 100ms per character with minimum 2s)
       let dur = this.currentTask.duration || 2.0;
       if (this.currentTask.type === "SAY") {
         const charLength = ((this.currentTask as any).message || "").length;
         dur = Math.max(2.0, charLength * 0.08); // 80ms per char
       }

       if (this.phaseTimer > dur) {
          this.phase = "COMPLETED";
       }
       return { type: "STOP" };
    }

    const nav = NavigationNetwork.getInstance();
    const reg = InteractableRegistry.getInstance();

    switch (this.phase) {
      // ------------------------------------------------------------------
      // NAVIGATING
      // ------------------------------------------------------------------
      case "NAVIGATING": {
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
           case "WANDER":
             if (!this.currentTask!.targetPos) {
                // Generate a random spot 10m away
                const r = 10;
                const theta = Math.random() * Math.PI * 2;
                this.currentTask!.targetPos = new THREE.Vector3(
                   vehiclePos.x + r * Math.cos(theta),
                   vehiclePos.y,
                   vehiclePos.z + r * Math.sin(theta)
                );
             }
             targetPos = this.currentTask!.targetPos;
             break;
        }

        if (!targetPos) {
          this.phase = "COMPLETED";
          return { type: "STOP" };
        }

        // 1. Pathfinding
        if (!this.hasSetPath) {
          const result = nav.findPathDetailed(vehiclePos, targetPos);
          this.approachPos = result.approachPos;

          if (!result.pathFound || result.path.length === 0) {
            this.hasSetPath = true;
            this.repathTimer = AgentTaskQueue.REPATH_INTERVAL - 1.0;
            return { type: "STOP" };
          }
          this.hasSetPath = true;
          this.stuckWindowPositions = [];
          
          if (this.currentTask?.type === "FOLLOW_PLAYER") {
            if (this.approachPos) this.approachPos.y = vehiclePos.y;
            return { type: "FOLLOW_PATH", path: result.path };
          }

          if (this.approachPos) this.approachPos.y = vehiclePos.y;
          return { type: "FOLLOW_PATH", path: result.path };
        }

        // Distance Check
        const distCheckPos = this.approachPos || targetPos;
        const distToTarget = Math.hypot(vehiclePos.x - distCheckPos.x, vehiclePos.z - distCheckPos.z);
        this.recordPosition(vehiclePos.x, vehiclePos.z, this.elapsedTime);

        // Arrival
        if (distToTarget < AgentTaskQueue.ARRIVAL_DIST) {
           if (this.currentTask?.type === "GO_TO" || this.currentTask?.type === "WANDER") {
              this.phase = "COMPLETED";
              return { type: "STOP" };
           } else if (this.currentTask?.type === "FOLLOW_PLAYER") {
              this.hasSetPath = false; // keep following
              return { type: "ARRIVE", target: targetPos };
           } else {
              this.phase = "ACTION_START";
              this.phaseTimer = 0;
              return { type: "STOP", faceTarget: targetPos };
           }
        }

        // Close Approach (switch to direct ARRIVE)
        if (this.currentTask?.type !== "FOLLOW_PLAYER" && distToTarget < AgentTaskQueue.CLOSE_APPROACH_DIST) {
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
                 this.phase = "COMPLETED"; // Give up
                 return { type: "STOP" };
              }
              this.repathTimer = 0;
              this.stuckWindowPositions = [];
           }
           return { type: "NONE" };
        }

        // Stuck Detection for Path following
        this.repathTimer += delta;
        if ((this.isStuckByWindow() && this.elapsedTime - (this.stuckWindowPositions[0]?.t ?? this.elapsedTime) > AgentTaskQueue.STUCK_THRESHOLD) || this.repathTimer > AgentTaskQueue.REPATH_INTERVAL) {
           this.retryCount++;
           if (this.retryCount >= AgentTaskQueue.MAX_RETRIES) {
              if (this.currentTask?.itemId) reg.unclaimItem(this.currentTask.itemId, this.agentId);
              this.phase = "COMPLETED";
              return { type: "STOP" };
           }
           this.hasSetPath = false;
           this.repathTimer = 0;
        }

        return { type: "NONE" };
      }

      // ------------------------------------------------------------------
      // ACTION_START: Brief pause before executing the atomic action
      // ------------------------------------------------------------------
      case "ACTION_START": {
        this.phaseTimer += delta;
        if (this.phaseTimer >= AgentTaskQueue.ACTION_DELAY) {
           const type = this.currentTask!.type;
           
           if (type === "PICK_NEARBY") {
              if (reg.pickUp(this.currentTask!.itemId!, this.agentId)) {
                 memoryStream.add(this.agentId, "ACTION", `I picked up the item.`, [`script:${this.currentTask!.scriptId}`]).catch(()=>{});
              }
           } else if (type === "PLACE_INVENTORY") {
              if (reg.placeItemAt(this.agentId, this.currentTask!.destAreaId!)) {
                 memoryStream.add(this.agentId, "ACTION", `I placed the item down.`, [`script:${this.currentTask!.scriptId}`]).catch(()=>{});
              }
           } else if (type === "INTERACT") {
              window.dispatchEvent(
                 new CustomEvent("agent-interact", {
                    detail: { agentId: this.agentId, targetId: this.currentTask!.itemId! },
                 })
              );
              memoryStream.add(this.agentId, "ACTION", `I interacted with the object.`, [`script:${this.currentTask!.scriptId}`]).catch(()=>{});
           }
           
           this.phase = "COMPLETED";
        }
        return { type: "STOP" };
      }
    }

    return { type: "NONE" };
  }
}

// Legacy registry proxy for UI components
export const AgentTaskRegistry = {
  getInstance() { return this; },
  get(agentId: string) { return AgentTaskQueue.taskRegistries.get(agentId); },
  getOrCreate(agentId: string) {
    if (!AgentTaskQueue.taskRegistries.has(agentId)) new AgentTaskQueue(agentId);
    return AgentTaskQueue.taskRegistries.get(agentId)!;
  },
  getAllAgentIds() { return Array.from(AgentTaskQueue.taskRegistries.keys()); },
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
  }
};
