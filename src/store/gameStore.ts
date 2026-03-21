import { create } from "zustand";
import * as THREE from "three";
import {
  WorldObject,
  InteractableRegistry,
} from "@/components/Systems/InteractableRegistry";
import type { AgentTask } from "@/components/Systems/AgentTaskQueue";

export interface Obstacle {
  position: THREE.Vector3;
  radius: number;
  type?: "wall" | "furniture" | "cupboard" | "door";
  // OBB (Oriented Bounding Box) fields — if halfExtents is set, render as box
  halfExtents?: THREE.Vector3; // half-width, half-height, half-depth
  rotation?: number; // Y-axis rotation in radians
}

export interface DebugTargetInfo {
  name: string;
  type?: string;
  id?: string;
  pos: string;
  dims: string;
  desc?: string;
}

export interface GridCell {
  id: string; // itemId or slotIndex
  label: string;
  type: "item" | "slot";
  icon?: string;
  meta?: any; // e.g. areaId for slots
}

export interface GridRow {
  id: string; // areaId or "floor"
  label: string;
  cells: GridCell[];
}

interface GameState {
  debugText: string;
  setDebugText: (text: string) => void;
  viewMode: "third";
  setViewMode: (mode: "third") => void;
  isCameraLocked: boolean;
  setCameraLocked: (locked: boolean) => void;
  isNight: boolean;
  setIsNight: (isNight: boolean) => void;
  collidableMeshes: THREE.Object3D[];
  addCollidableMesh: (mesh: THREE.Object3D) => void;
  removeCollidableMesh: (uuid: string) => void;
  obstacles: Obstacle[];
  addObstacles: (obstacles: Obstacle[]) => void;
  removeObstacles: (obstacles: Obstacle[]) => void;

  // Interactables (for actions like sitting)
  interactables: {
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
      | "telephone";
    position: THREE.Vector3;
    rotation: THREE.Quaternion;
    label?: string;
    pickable?: boolean;
    name?: string;
    description?: string;
    meshRef?: THREE.Object3D;
    isOpen?: boolean;
  }[];
  addInteractables: (
    items: {
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
        | "telephone";
      position: THREE.Vector3;
      rotation: THREE.Quaternion;
      label?: string;
      pickable?: boolean;
      name?: string;
      description?: string;
      meshRef?: THREE.Object3D;
      isOpen?: boolean;
    }[],
  ) => void;
  removeInteractables: (ids: string[]) => void;

  // Robot State
  isSitting: boolean;
  setSitting: (sitting: boolean) => void;

  isTeleporting: boolean;
  setTeleporting: (teleporting: boolean) => void;

  // Settings
  invertedMouse: boolean;
  setInvertedMouse: (inverted: boolean) => void;
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

  // Menu State
  isMenuOpen: boolean;
  setMenuOpen: (isOpen: boolean) => void;

  isMenuPanelOpen: boolean;
  setMenuPanelOpen: (isOpen: boolean) => void;

  // Interaction State
  interactionTarget: string | null;
  setInteractionTarget: (id: string | null) => void;

  // File System State
  isFileEditorOpen: boolean;
  setFileEditorOpen: (isOpen: boolean) => void;
  activeFileId: string | null;
  setActiveFileId: (id: string | null) => void;
  fileContents: Record<string, string>;
  setFileContent: (id: string, content: string) => void;

  // Key Bindings
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

  // Debug Info
  debugTarget: DebugTargetInfo | null;
  setDebugTarget: (target: DebugTargetInfo | null) => void;

  // Inventory & Notifications
  playerInventory: WorldObject[];
  addToInventory: (item: WorldObject) => void;
  removeFromInventory: (itemId: string) => void;
  selectedInventoryIndex: number;
  setSelectedInventoryIndex: (index: number) => void;

  interactionNotification: string | null;
  setInteractionNotification: (msg: string | null) => void;

  // Pickup Menu State
  isPickupMenuOpen: boolean;
  setPickupMenuOpen: (isOpen: boolean) => void;
  nearbyItems: WorldObject[];
  setNearbyItems: (items: WorldObject[]) => void;
  selectedPickupIndex: number;
  setSelectedPickupIndex: (index: number) => void;
  // Placing Menu State
  nearbyPlacingAreas: any[];
  setNearbyPlacingAreas: (areas: any[]) => void;
  activePlacingAreaId: string | null;
  setActivePlacingAreaId: (id: string | null) => void;

  // AI Inspector Mode
  inspectedAgentId: string | null;
  setInspectedAgentId: (id: string | null) => void;
  inspectedAgentData: { id: string; thought: string; state: string } | null;
  setInspectedAgentData: (
    data: { id: string; thought: string; state: string } | null,
  ) => void;

  // Interaction Grid State
  interactionGrid: GridRow[];
  setInteractionGrid: (grid: GridRow[]) => void;
  gridSelection: { row: number; col: number };
  setGridSelection: (sel: { row: number; col: number }) => void;
  // Visual target for placement/selection
  placingTargetPos: THREE.Vector3 | null;
  placingTargetType?: "item" | "slot"; // Changed to optional (undefined)
  placingTargetId?: string; // ID of the specific object/slot being targeted
  setPlacingTargetPos: (
    pos: THREE.Vector3 | null,
    type?: "item" | "slot",
    id?: string,
  ) => void;

  // Player Position (for minimap, etc.)
  playerPosition: THREE.Vector3;
  setPlayerPosition: (pos: THREE.Vector3) => void;

  // Following Agent
  followingAgentId: string | null;
  setFollowingAgentId: (id: string | null) => void;

  // Agent Positions (Minimap)
  agentPositions: Record<string, THREE.Vector3>;
  setAgentPosition: (id: string, pos: THREE.Vector3) => void;

  // Debug Mode
  isDebugMode: boolean;
  setDebugMode: (mode: boolean) => void;

  // Task Assignment Panel
  isTaskPanelOpen: boolean;
  setTaskPanelOpen: (isOpen: boolean) => void;
  taskPanelStep: number; // 0=agent, 1=action, 2=target, 3=review
  setTaskPanelStep: (step: number) => void;
  taskPanelSelectedAgent: string | null;
  setTaskPanelSelectedAgent: (id: string | null) => void;
  taskPanelSelectedAction: string | null;
  setTaskPanelSelectedAction: (action: string | null) => void;
  taskPanelPendingTasks: AgentTask[];
  addPendingTask: (task: AgentTask) => void;
  clearPendingTasks: () => void;
  removePendingTask: (index: number) => void;

  // Command Bar (NLP)
  isCommandBarOpen: boolean;
  setCommandBarOpen: (isOpen: boolean) => void;

  // Agent Chat Proximity State
  nearbyAgentId: string | null;
  setNearbyAgentId: (id: string | null) => void;
  chatPromptVisible: boolean;
  setChatPromptVisible: (visible: boolean) => void;

  // Chat Panel State
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

  // Common agent communication log (all agents' messages in one feed)
  commonAgentMessages: { agentId: string; role: "user" | "agent"; text: string }[];
  addCommonAgentMessage: (
    agentId: string,
    msg: { role: "user" | "agent"; text: string },
  ) => void;
  isCommonChatOpen: boolean;
  setCommonChatOpen: (open: boolean) => void;
}

export const useGameStore = create<GameState>((set) => ({
  debugText: "",
  setDebugText: (text) => set({ debugText: text }),
  viewMode: "third",
  setViewMode: (mode) => set({ viewMode: mode }),
  isCameraLocked: false,
  setCameraLocked: (locked) => set({ isCameraLocked: locked }),
  isNight: false,
  setIsNight: (isNight) => set({ isNight }),

  collidableMeshes: [],
  addCollidableMesh: (mesh) => {
    mesh.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.geometry &&
        !child.geometry.boundsTree
      ) {
        child.geometry.computeBoundsTree();
      }
    });
    set((state) => ({ collidableMeshes: [...state.collidableMeshes, mesh] }));
  },
  removeCollidableMesh: (uuid) =>
    set((state) => ({
      collidableMeshes: state.collidableMeshes.filter((m) => m.uuid !== uuid),
    })),

  obstacles: [],
  addObstacles: (newObstacles) =>
    set((state) => ({ obstacles: [...state.obstacles, ...newObstacles] })),
  removeObstacles: (obsToRemove) =>
    set((state) => ({
      obstacles: state.obstacles.filter(
        (o) => !obsToRemove.some((r) => r.position.equals(o.position)),
      ),
    })),

  interactables: [],
  addInteractables: (items) => {
    // Sync with Registry
    items.forEach((item) => {
      // @ts-ignore
      InteractableRegistry.getInstance().register(item);
    });
    set((state) => ({ interactables: [...state.interactables, ...items] }));
  },
  removeInteractables: (ids) => {
    // Sync with Registry
    ids.forEach((id) => {
      InteractableRegistry.getInstance().unregister(id);
    });
    set((state) => ({
      interactables: state.interactables.filter((i) => !ids.includes(i.id)),
    }));
  },

  isSitting: false,
  setSitting: (sitting) => set({ isSitting: sitting }),
  isTeleporting: false,
  setTeleporting: (teleporting) => set({ isTeleporting: teleporting }),

  // Settings
  invertedMouse: false,
  setInvertedMouse: (inverted) => set({ invertedMouse: inverted }),
  sensitivity: 1.0,
  setSensitivity: (sensitivity) => set({ sensitivity }),
  volume: 0.5,
  setVolume: (volume) => set({ volume }),
  audioDistanceModel: "exponential",
  setAudioDistanceModel: (model) => set({ audioDistanceModel: model }),
  audioRefDistance: 5,
  setAudioRefDistance: (dist) => set({ audioRefDistance: dist }),
  audioMaxDistance: 50,
  setAudioMaxDistance: (dist) => set({ audioMaxDistance: dist }),
  audioRolloffFactor: 1,
  setAudioRolloffFactor: (factor) => set({ audioRolloffFactor: factor }),
  audioVoice: "nova",
  setAudioVoice: (voice) => set({ audioVoice: voice }),

  // Menu State
  isMenuOpen: false,
  setMenuOpen: (isOpen) => set({ isMenuOpen: isOpen, isMenuPanelOpen: false }),

  isMenuPanelOpen: false,
  setMenuPanelOpen: (isOpen) => set({ isMenuPanelOpen: isOpen }),

  // Interaction State
  interactionTarget: null,
  setInteractionTarget: (id) => set({ interactionTarget: id }),

  // File System State
  isFileEditorOpen: false,
  setFileEditorOpen: (isOpen) => set({ isFileEditorOpen: isOpen }),
  activeFileId: null,
  setActiveFileId: (id) => set({ activeFileId: id }),
  fileContents: {},
  setFileContent: (id, content) =>
    set((state) => ({
      fileContents: { ...state.fileContents, [id]: content },
    })),

  // Key Bindings
  keyBindings: {
    forward: "KeyW",
    backward: "KeyS",
    left: "KeyA",
    right: "KeyD",
    jump: "Space",
    sprint: "ShiftLeft",
    interact: "KeyE",
    pickUp: "KeyP",
    placeItem: "KeyT",
    menu: "Escape",
    taskPanel: "KeyM",
    commandBar: "Slash",
    debugMode: "Backquote",
    agentComms: "KeyJ",
  },
  setKeyBinding: (action, key) =>
    set((state) => ({
      keyBindings: { ...state.keyBindings, [action]: key },
    })),

  // Debug Info
  debugTarget: null,
  setDebugTarget: (target) => set({ debugTarget: target }),

  // Inventory & Notifications
  playerInventory: [],
  addToInventory: (item) =>
    set((state) => ({ playerInventory: [...state.playerInventory, item] })),
  removeFromInventory: (itemId) =>
    set((state) => ({
      playerInventory: state.playerInventory.filter((i) => i.id !== itemId),
      // Adjust selected index if needed
      selectedInventoryIndex: Math.min(
        state.selectedInventoryIndex,
        Math.max(0, state.playerInventory.length - 2),
      ),
    })),
  selectedInventoryIndex: 0,
  setSelectedInventoryIndex: (index) => set({ selectedInventoryIndex: index }),

  interactionNotification: null,
  setInteractionNotification: (msg) => {
    set({ interactionNotification: msg });
    if (msg) {
      setTimeout(() => set({ interactionNotification: null }), 3000);
    }
  },

  // Pickup Menu State
  isPickupMenuOpen: false,
  setPickupMenuOpen: (isOpen) => set({ isPickupMenuOpen: isOpen }),
  nearbyItems: [],
  setNearbyItems: (items) => set({ nearbyItems: items }),
  selectedPickupIndex: 0,
  setSelectedPickupIndex: (index) => set({ selectedPickupIndex: index }),

  // Placing Menu State
  nearbyPlacingAreas: [],
  setNearbyPlacingAreas: (areas) => set({ nearbyPlacingAreas: areas }),
  activePlacingAreaId: null,
  setActivePlacingAreaId: (id) => set({ activePlacingAreaId: id }),

  // AI Inspector Mode
  inspectedAgentId: null,
  setInspectedAgentId: (id) => set({ inspectedAgentId: id }),
  inspectedAgentData: null,
  setInspectedAgentData: (data) => set({ inspectedAgentData: data }),

  // Following Agent
  followingAgentId: null,
  setFollowingAgentId: (id) => set({ followingAgentId: id }),

  // Agent Positions (Minimap)
  agentPositions: {},
  setAgentPosition: (id, pos) =>
    set((state) => ({
      agentPositions: { ...state.agentPositions, [id]: pos },
    })),

  // Interaction Grid State
  interactionGrid: [],
  setInteractionGrid: (grid) => set({ interactionGrid: grid }),
  gridSelection: { row: 0, col: 0 },
  setGridSelection: (sel) => set({ gridSelection: sel }),
  placingTargetPos: null,
  placingTargetType: undefined,
  placingTargetId: undefined,
  setPlacingTargetPos: (pos, type, id) =>
    set({
      placingTargetPos: pos,
      placingTargetType: type,
      placingTargetId: id,
    }),

  // Player Position
  playerPosition: new THREE.Vector3(),
  setPlayerPosition: (pos) => set({ playerPosition: pos }),

  // Debug Mode
  isDebugMode: false,
  setDebugMode: (mode: boolean) => set({ isDebugMode: mode }),

  // Task Assignment Panel
  isTaskPanelOpen: false,
  setTaskPanelOpen: (isOpen) =>
    set({
      isTaskPanelOpen: isOpen,
      // Reset panel state when closing
      ...(isOpen
        ? {}
        : {
            taskPanelStep: 0,
            taskPanelSelectedAgent: null,
            taskPanelSelectedAction: null,
            taskPanelPendingTasks: [],
          }),
    }),
  taskPanelStep: 0,
  setTaskPanelStep: (step) => set({ taskPanelStep: step }),
  taskPanelSelectedAgent: null,
  setTaskPanelSelectedAgent: (id) => set({ taskPanelSelectedAgent: id }),
  taskPanelSelectedAction: null,
  setTaskPanelSelectedAction: (action) =>
    set({ taskPanelSelectedAction: action }),
  taskPanelPendingTasks: [],
  addPendingTask: (task) =>
    set((state) => ({
      taskPanelPendingTasks: [...state.taskPanelPendingTasks, task],
    })),
  clearPendingTasks: () => set({ taskPanelPendingTasks: [] }),
  removePendingTask: (index) =>
    set((state) => ({
      taskPanelPendingTasks: state.taskPanelPendingTasks.filter(
        (_, i) => i !== index,
      ),
    })),

  // Command Bar (NLP)
  isCommandBarOpen: false,
  setCommandBarOpen: (isOpen) => set({ isCommandBarOpen: isOpen }),

  // Agent Chat Proximity State
  nearbyAgentId: null,
  setNearbyAgentId: (id) => set({ nearbyAgentId: id }),
  chatPromptVisible: false,
  setChatPromptVisible: (visible) => set({ chatPromptVisible: visible }),

  // Chat Panel State
  isChatOpen: false,
  setChatOpen: (isOpen) => set({ isChatOpen: isOpen }),
  chatAgentId: null,
  setChatAgentId: (id) => set({ chatAgentId: id }),
  chatMessages: {},
  addChatMessage: (agentId, msg) =>
    set((state) => ({
      chatMessages: {
        ...state.chatMessages,
        [agentId]: [...(state.chatMessages[agentId] || []), msg],
      },
    })),
  clearChatMessages: (agentId) =>
    set((state) => ({
      chatMessages: { ...state.chatMessages, [agentId]: [] },
    })),

  commonAgentMessages: [],
  addCommonAgentMessage: (agentId, msg) =>
    set((state) => ({
      commonAgentMessages: [
        ...state.commonAgentMessages,
        { agentId, role: msg.role, text: msg.text },
      ],
    })),
  isCommonChatOpen: false,
  setCommonChatOpen: (open) => set({ isCommonChatOpen: open }),
}));
