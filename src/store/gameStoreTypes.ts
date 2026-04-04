import type * as THREE from "three";
import type { AgentTask } from "@/systems/AgentTaskQueue";
import type { WorldTask } from "@/types/worldTask";
import type { Obstacle, WorldObject } from "@/types/world";
import type { DebugTargetInfo, GridRow } from "@/types/ui";

/** Registered interactable props (mirrors legacy inline shape). */
export type GameInteractable = {
  id: string;
  type:
    | "switch"
    | "door"
    | "chair"
    | "sofa"
    | "pc"
    | "file"
    | "laptop"
    | "pendrive"
    | "coffeecup"
    | "generic"
    | "whiteboard"
    | "projector_screen"
    | "tv"
    | "coffee_machine"
    | "telephone"
    | "pod";
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  label?: string;
  pickable?: boolean;
  name?: string;
  description?: string;
  meshRef?: THREE.Object3D;
  isOpen?: boolean;
};

export interface WorldSlice {
  collidableMeshes: THREE.Object3D[];
  addCollidableMesh: (mesh: THREE.Object3D) => void;
  removeCollidableMesh: (uuid: string) => void;
  obstacles: Obstacle[];
  addObstacles: (obstacles: Obstacle[]) => void;
  removeObstacles: (obstacles: Obstacle[]) => void;
  interactables: GameInteractable[];
  addInteractables: (items: GameInteractable[]) => void;
  removeInteractables: (ids: string[]) => void;
}

export interface SettingsSlice {
  invertedMouse: boolean;
  setInvertedMouse: (inverted: boolean) => void;
  runId: string;
  setRunId: (id: string) => void;
  currentFps: number;
  setCurrentFps: (fps: number) => void;
  sensitivity: number;
  setSensitivity: (sensitivity: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
  audioDistanceModel: "linear" | "inverse" | "exponential";
  setAudioDistanceModel: (model: "linear" | "inverse" | "exponential") => void;
  audioRefDistance: number;
  setAudioRefDistance: (dist: number) => void;
  audioMaxDistance: number;
  setAudioMaxDistance: (dist: number) => void;
  audioRolloffFactor: number;
  setAudioRolloffFactor: (factor: number) => void;
  audioVoice: string;
  setAudioVoice: (voice: string) => void;
  keyBindings: {
    forward: string;
    backward: string;
    left: string;
    right: string;
    jump: string;
    sprint: string;
    interact: string;
    pickUp: string;
    placeItem: string;
    menu: string;
    taskPanel: string;
    commandBar: string;
    debugMode: string;
    agentComms: string;
  };
  setKeyBinding: (action: string, key: string) => void;
}

export interface ChatSlice {
  nearbyAgentId: string | null;
  setNearbyAgentId: (id: string | null) => void;
  chatPromptVisible: boolean;
  setChatPromptVisible: (visible: boolean) => void;
  isChatOpen: boolean;
  setChatOpen: (isOpen: boolean) => void;
  chatAgentId: string | null;
  setChatAgentId: (id: string | null) => void;
  chatMessages: Record<string, { role: "user" | "agent"; text: string }[]>;
  addChatMessage: (
    agentId: string,
    msg: { role: "user" | "agent"; text: string },
  ) => void;
  clearChatMessages: (agentId: string) => void;
  commonAgentMessages: {
    agentId: string;
    role: "user" | "agent";
    text: string;
  }[];
  addCommonAgentMessage: (
    agentId: string,
    msg: { role: "user" | "agent"; text: string },
  ) => void;
  isCommonChatOpen: boolean;
  setCommonChatOpen: (open: boolean) => void;
}

export interface AgentSlice {
  isSitting: boolean;
  setSitting: (sitting: boolean) => void;
  isTeleporting: boolean;
  setTeleporting: (teleporting: boolean) => void;
  inspectedAgentId: string | null;
  setInspectedAgentId: (id: string | null) => void;
  inspectedAgentData: { id: string; thought: string; state: string } | null;
  setInspectedAgentData: (
    data: { id: string; thought: string; state: string } | null,
  ) => void;
  followingAgentId: string | null;
  setFollowingAgentId: (id: string | null) => void;
  agentPositionsRef: Record<string, { x: number; y: number; z: number }>;
  agentPositions: Record<string, THREE.Vector3>;
  setAgentPosition: (id: string, pos: THREE.Vector3) => void;
  agentTrajectories: Record<string, THREE.Vector3[]>;
  setAgentTrajectory: (id: string, path: THREE.Vector3[]) => void;
  agentMetrics: Record<string, { latency: number; spatialRatio: number }>;
  setAgentMetrics: (id: string, metrics: { latency: number; spatialRatio: number }) => void;
  agentScenarioContext: Record<string, string>;
  setAgentScenarioContext: (id: string, context: string) => void;
  /** Agent id → desk id (e.g. desk-east-0). */
  personalDeskByAgent: Record<string, string>;
  setPersonalDesk: (agentId: string, deskId: string) => void;
  seedDefaultPersonalDesks: (agentIds: string[]) => void;

  // --- Research Management ---
  activeResearchAgents: ResearchAgent[];
  spawnAgent: (config?: Partial<ResearchAgent>) => void;
  removeAgent: (id: string) => void;
  updateAgentCognition: (id: string, thought: string) => void;
  updateAgentStatus: (id: string, status: ResearchAgent['status']) => void;

  playerPosition: THREE.Vector3;
  setPlayerPosition: (pos: THREE.Vector3) => void;
  debugTarget: DebugTargetInfo | null;
  setDebugTarget: (target: DebugTargetInfo | null) => void;
}

export interface ResearchAgent {
  id: string;
  name: string;
  color: string;
  status: 'IDLE' | 'THINKING' | 'MOVING' | 'ACTING' | 'ERROR';
  thoughtHistory: string[];
  currentTask: string;
  spawnPosition: [number, number, number];
}

export interface UISlice {
  debugText: string;
  setDebugText: (text: string) => void;
  viewMode: "third";
  setViewMode: (mode: "third") => void;
  isCameraLocked: boolean;
  setCameraLocked: (locked: boolean) => void;
  isNight: boolean;
  setIsNight: (isNight: boolean) => void;
  isMenuOpen: boolean;
  setMenuOpen: (isOpen: boolean) => void;
  isMenuPanelOpen: boolean;
  setMenuPanelOpen: (isOpen: boolean) => void;
  interactionTarget: string | null;
  setInteractionTarget: (id: string | null) => void;
  isFileEditorOpen: boolean;
  setFileEditorOpen: (isOpen: boolean) => void;
  activeFileId: string | null;
  setActiveFileId: (id: string | null) => void;
  fileContents: Record<string, string>;
  setFileContent: (id: string, content: string) => void;
  playerInventory: WorldObject[];
  addToInventory: (item: WorldObject) => void;
  removeFromInventory: (itemId: string) => void;
  selectedInventoryIndex: number;
  setSelectedInventoryIndex: (index: number) => void;
  interactionNotification: string | null;
  setInteractionNotification: (msg: string | null) => void;
  isPickupMenuOpen: boolean;
  setPickupMenuOpen: (isOpen: boolean) => void;
  nearbyItems: WorldObject[];
  setNearbyItems: (items: WorldObject[]) => void;
  selectedPickupIndex: number;
  setSelectedPickupIndex: (index: number) => void;
  nearbyPlacingAreas: unknown[];
  setNearbyPlacingAreas: (areas: unknown[]) => void;
  activePlacingAreaId: string | null;
  setActivePlacingAreaId: (id: string | null) => void;
  interactionGrid: GridRow[];
  setInteractionGrid: (grid: GridRow[]) => void;
  gridSelection: { row: number; col: number };
  setGridSelection: (sel: { row: number; col: number }) => void;
  placingTargetPos: THREE.Vector3 | null;
  placingTargetType?: "item" | "slot";
  placingTargetId?: string;
  setPlacingTargetPos: (
    pos: THREE.Vector3 | null,
    type?: "item" | "slot",
    id?: string,
  ) => void;
  isDebugMode: boolean;
  setDebugMode: (mode: boolean) => void;
  isTaskPanelOpen: boolean;
  setTaskPanelOpen: (isOpen: boolean) => void;
  /** Player task panel: direct agent vs auto-dispatch. */
  taskPanelAssignMode: "specific" | "any";
  setTaskPanelAssignMode: (mode: "specific" | "any") => void;
  taskPanelStep: number;
  setTaskPanelStep: (step: number) => void;
  taskPanelSelectedAgent: string | null;
  setTaskPanelSelectedAgent: (id: string | null) => void;
  taskPanelSelectedAction: string | null;
  setTaskPanelSelectedAction: (action: string | null) => void;
  taskPanelPendingTasks: AgentTask[];
  addPendingTask: (task: AgentTask) => void;
  clearPendingTasks: () => void;
  removePendingTask: (index: number) => void;
  isCommandBarOpen: boolean;
  setCommandBarOpen: (isOpen: boolean) => void;
  focusedPodId: string | null;
  setFocusedPodId: (id: string | null) => void;
  activeScenarioId: string;
  setActiveScenarioId: (id: string) => void;
  statsParent: HTMLElement | null;
  setStatsParent: (el: HTMLElement | null) => void;
}

/** Agent deployment pods along the outer ring. */
export interface PodRuntimeState {
  assignedAgentId: string | null;
  isDeployed: boolean;
  position: { x: number; y: number; z: number };
}

export interface WorldTaskSlice {
  worldTasksById: Record<string, WorldTask>;
  addWorldTask: (
    task: Omit<WorldTask, "id" | "createdAt"> & { id?: string },
  ) => string;
  updateWorldTask: (id: string, patch: Partial<WorldTask>) => void;
  removeWorldTask: (id: string) => void;
  clearWorldTasks: () => void;
  /** Auto-pick agent and enqueue; returns chosen agent id or null. */
  dispatchOpenWorldTask: (taskId: string) => string | null;
  /** LLM or system: take an open / unassigned task. */
  claimWorldTaskForAgent: (taskId: string, agentId: string) => boolean;
  /** Drop assignment and cancel queued world-task steps for this agent. */
  releaseWorldTask: (taskId: string, agentId: string) => void;
}

export interface PodSlice {
  pods: Record<string, PodRuntimeState>;
  initPods: () => void;
  deployAgent: (podId: string) => void;
  recallAgent: (podId: string) => void;
  setPodDeployed: (podId: string, deployed: boolean) => void;
  getPodIdForAgent: (agentId: string) => string | null;
}

export type GameState = WorldSlice &
  SettingsSlice &
  ChatSlice &
  AgentSlice &
  UISlice &
  PodSlice &
  WorldTaskSlice;
