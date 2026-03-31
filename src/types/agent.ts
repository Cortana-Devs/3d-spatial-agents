import type { Vector3 } from "three";

/** Numeric needs that create emergent motivation (0–100). */
export interface AgentDrives {
  tidiness: number;
  curiosity: number;
  helpfulness: number;
  social: number;
  energy: number;
  focus: number;
  wonder: number;
  belonging: number;
}

export interface NearbyEntity {
  type: string;
  id?: string;
  distance: number;
  status?: string;
  objectType?: string;
  name?: string;
  position?: { x: number; y: number; z: number };
}

export interface AgentContext {
  position: { x: number; y: number; z: number };
  nearbyEntities: NearbyEntity[];
  currentBehavior: string;
  taskState?: {
    currentScriptId: string | null;
    currentTask: string | null;
    currentPriority: number;
    queuedTasksCount: number;
    phase: string;
  };
  drives?: string;
  zoneContext?: string;
  spatialMemory?: string;
  assignedPodId?: string;
  personality?: {
    name: string;
    trait: string;
    speechStyle: string;
    bio: string;
  };
  /** Structured recall of past talks with a nearby entity (client-filled before server action). */
  conversationHistory?: string;
  /** Idle explorer monologue + recent chats for prompt grounding. */
  autonomousActivityContext?: string;
}

export interface TraceOptions {
  sessionId: string;
  requestId: string;
  conversationId?: string;
  userId?: string;
}

export interface AgentPersonality {
  id: string;
  name: string;
  trait: string;
  bio: string;
  preferredZones: string[];
  driveWeights: Partial<Record<keyof AgentDrives, number>>;
  speechStyle: string;
  idleBias: "contemplate" | "explore" | "socialize" | "work";
  accentColor: string;
}

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
  | "EMOTE"
  | "REST_IN_POD";

export interface AgentTask {
  type: AgentTaskType;
  priority: number;
  /** Origin of the task (e.g. idle explorer GO_TO vs LLM script). */
  source?: "idle_explorer" | "llm" | "script" | "system";
  sourceLabel?: string;
  scriptId?: string;
  podId?: string;
  itemId?: string;
  destAreaId?: string;
  targetAreaId?: string;
  targetPos?: Vector3;
  duration?: number;
  content?: string;
  lookTarget?: Vector3;
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
  | "DOCKED"
  | "COMPLETED";

export interface SteeringCommand {
  type: "FOLLOW_PATH" | "ARRIVE" | "STOP" | "NONE";
  path?: Vector3[];
  target?: Vector3;
  faceTarget?: Vector3;
}
