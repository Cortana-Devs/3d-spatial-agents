import type { StateCreator } from "zustand";
import type { GameState, UISlice } from "./gameStoreTypes";

export const createUISlice: StateCreator<GameState, [], [], UISlice> = (
  set,
) => ({
  debugText: "",
  setDebugText: (text) => set({ debugText: text }),
  viewMode: "third",
  setViewMode: (mode) => set({ viewMode: mode }),
  isCameraLocked: false,
  setCameraLocked: (locked) => set({ isCameraLocked: locked }),
  isNight: false,
  setIsNight: (isNight) => set({ isNight }),

  isMenuOpen: false,
  setMenuOpen: (isOpen) =>
    set({ isMenuOpen: isOpen, isMenuPanelOpen: false }),

  isMenuPanelOpen: false,
  setMenuPanelOpen: (isOpen) => set({ isMenuPanelOpen: isOpen }),

  interactionTarget: null,
  setInteractionTarget: (id) => set({ interactionTarget: id }),

  isFileEditorOpen: false,
  setFileEditorOpen: (isOpen) => set({ isFileEditorOpen: isOpen }),
  activeFileId: null,
  setActiveFileId: (id) => set({ activeFileId: id }),
  fileContents: {},
  setFileContent: (id, content) =>
    set((state) => ({
      fileContents: { ...state.fileContents, [id]: content },
    })),

  playerInventory: [],
  addToInventory: (item) =>
    set((state) => ({ playerInventory: [...state.playerInventory, item] })),
  removeFromInventory: (itemId) =>
    set((state) => ({
      playerInventory: state.playerInventory.filter((i) => i.id !== itemId),
      selectedInventoryIndex: Math.min(
        state.selectedInventoryIndex,
        Math.max(0, state.playerInventory.length - 2),
      ),
    })),
  selectedInventoryIndex: 0,
  setSelectedInventoryIndex: (index) =>
    set({ selectedInventoryIndex: index }),

  interactionNotification: null,
  setInteractionNotification: (msg) => {
    set({ interactionNotification: msg });
    if (msg) {
      setTimeout(() => set({ interactionNotification: null }), 3000);
    }
  },

  isPickupMenuOpen: false,
  setPickupMenuOpen: (isOpen) => set({ isPickupMenuOpen: isOpen }),
  nearbyItems: [],
  setNearbyItems: (items) => set({ nearbyItems: items }),
  selectedPickupIndex: 0,
  setSelectedPickupIndex: (index) => set({ selectedPickupIndex: index }),

  nearbyPlacingAreas: [],
  setNearbyPlacingAreas: (areas) => set({ nearbyPlacingAreas: areas }),
  activePlacingAreaId: null,
  setActivePlacingAreaId: (id) => set({ activePlacingAreaId: id }),

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

  isDebugMode: false,
  setDebugMode: (mode: boolean) => set({ isDebugMode: mode }),

  isTaskPanelOpen: false,
  setTaskPanelOpen: (isOpen) =>
    set({
      isTaskPanelOpen: isOpen,
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

  isCommandBarOpen: false,
  setCommandBarOpen: (isOpen) => set({ isCommandBarOpen: isOpen }),

  focusedPodId: null,
  setFocusedPodId: (id) => set({ focusedPodId: id }),
});
