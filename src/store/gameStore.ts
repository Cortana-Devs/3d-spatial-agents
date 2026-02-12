import { create } from "zustand";
import * as THREE from "three";
import { WorldObject } from "@/components/Systems/InteractableRegistry";

export interface Obstacle {
  position: THREE.Vector3;
  radius: number;
}

export interface DebugTargetInfo {
  name: string;
  type?: string;
  id?: string;
  pos: string;
  dims: string;
  desc?: string;
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
    type: string;
    position: THREE.Vector3;
    rotation: THREE.Quaternion;
    label?: string;
  }[];
  addInteractables: (
    items: {
      id: string;
      type: string;
      position: THREE.Vector3;
      rotation: THREE.Quaternion;
      label?: string;
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

  // Menu State
  isMenuOpen: boolean;
  setMenuOpen: (isOpen: boolean) => void;

  isMenuPanelOpen: boolean;
  setMenuPanelOpen: (isOpen: boolean) => void;

  // Interaction State
  interactionTarget: string | null;
  setInteractionTarget: (id: string | null) => void;

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
  setInspectedAgentData: (data: { id: string; thought: string; state: string } | null) => void;
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
  addCollidableMesh: (mesh) =>
    set((state) => ({ collidableMeshes: [...state.collidableMeshes, mesh] })),
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
  addInteractables: (items) =>
    set((state) => ({ interactables: [...state.interactables, ...items] })),
  removeInteractables: (ids) =>
    set((state) => ({
      interactables: state.interactables.filter((i) => !ids.includes(i.id)),
    })),

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

  // Menu State
  isMenuOpen: false,
  setMenuOpen: (isOpen) => set({ isMenuOpen: isOpen, isMenuPanelOpen: false }),

  isMenuPanelOpen: false,
  setMenuPanelOpen: (isOpen) => set({ isMenuPanelOpen: isOpen }),

  interactionTarget: null,
  setInteractionTarget: (id) => set({ interactionTarget: id }),

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
}));
