import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";
import { enableMapSet } from "immer";
import { v4 as uuidv4 } from "uuid";
import { Vector3 } from "three";
import {
  Block,
  BlockType,
  SelectionMode,
  AISimulant,
  CameraMode,
  WorldState as BaseWorldState,
  BLOCK_DEFINITIONS,
} from "../types";

// Enable MapSet plugin for Immer to work with Map and Set
enableMapSet();

// Enhanced WorldState with optimized data structures
interface WorldState extends Omit<BaseWorldState, "blocks" | "simulants"> {
  // Optimized block storage using spatial hash map
  blockMap: Map<string, Block>; // key: "x,y,z"
  blockCount: number; // Efficient O(1) counting

  // Selection mode for UI interaction
  selectionMode: SelectionMode;

  // Grid configuration
  gridConfig: import("../types").GridConfig;

  // AI Simulant State (keeping Map as specified in design)
  simulants: Map<string, AISimulant>;

  // Undo/Redo system with circular buffer
  history: {
    states: WorldSnapshot[];
    currentIndex: number;
    maxStates: number;
    redoStates: WorldSnapshot[]; // Store states for redo
  };

  // Actions
  addBlock: (position: Vector3, type: BlockType, userId: string) => boolean;
  addBlockInternal: (
    position: Vector3,
    type: BlockType,
    userId: string,
  ) => boolean;
  removeBlock: (position: Vector3, userId: string) => boolean;
  removeBlockById: (id: string, userId: string) => boolean;
  getBlock: (position: Vector3) => Block | undefined;
  getBlockById: (id: string) => Block | undefined;
  getAllBlocks: () => Block[];
  hasBlock: (position: Vector3) => boolean;

  // Simulant management
  addSimulant: (simulant: AISimulant) => void;
  removeSimulant: (id: string) => void;
  updateSimulant: (id: string, updates: Partial<AISimulant>) => void;

  // Undo/Redo operations
  undo: () => boolean;
  redo: () => boolean;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveSnapshot: () => void;

  // Utility functions
  setSelectedBlockType: (type: BlockType) => void;
  setSelectionMode: (mode: SelectionMode) => void;
  setCameraMode: (mode: CameraMode) => void;
  setSyncStatus: (status: "connected" | "disconnected" | "syncing") => void;
  updateGridConfig: (updates: Partial<import("../types").GridConfig>) => void;

  // World management
  clearWorld: () => void;
  getWorldStats: () => WorldStats;
  resetStore: () => void;
}

// Snapshot for undo/redo system
interface WorldSnapshot {
  blockMap: Map<string, Block>;
  blockCount: number;
  timestamp: number;
}

// (Removed unused WorldAction interface)

interface WorldStats {
  totalBlocks: number;
  blocksByType: Record<BlockType, number>;
  activeSimulants: number;
  worldSize: { min: Vector3; max: Vector3 };
}

// Utility functions for spatial hash map
const positionToKey = (position: Vector3): string => {
  return `${Math.round(position.x)},${Math.round(position.y)},${Math.round(position.z)}`;
};

const keyToPosition = (key: string): Vector3 => {
  const [x, y, z] = key.split(",").map(Number);
  return new Vector3(x, y, z);
};

// Use imported block definitions
const blockDefinitions = BLOCK_DEFINITIONS;

// Create the Zustand store with immer for immutable updates
export const useWorldStore = create<WorldState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      blockMap: new Map<string, Block>(),
      blockCount: 0,
      worldLimits: { maxBlocks: 1000 },
      selectedBlockType: BlockType.STONE,
      selectionMode: SelectionMode.EMPTY, // Start in empty hand mode
      activeCamera: "orbit",
      simulants: new Map<string, AISimulant>(),
      lastUpdate: Date.now(),
      syncStatus: "disconnected",

      // Grid configuration with defaults
      gridConfig: {
        size: 50,
        cellSize: 1,
        opacity: 0.8, // Increased opacity for better visibility
        visibility: true,
        fadeDistance: 30,
        fadeStrength: 0.5, // Reduced fade strength so grid stays visible longer
        rippleEnabled: false,
        snapToGrid: true,
        showSnapIndicators: true,
      },

      // Undo/Redo circular buffer
      history: {
        states: [],
        currentIndex: -1,
        maxStates: 50,
        redoStates: [],
      },

      // Block operations with collision detection and validation
      addBlock: (
        position: Vector3,
        type: BlockType,
        userId: string,
      ): boolean => {
        const state = get();

        // Check block limit
        if (state.blockCount >= state.worldLimits.maxBlocks) {
          console.warn(
            `Block limit reached: ${state.blockCount}/${state.worldLimits.maxBlocks}`,
          );
          return false;
        }

        const key = positionToKey(position);

        // Collision detection - check if block already exists at position
        if (state.blockMap.has(key)) {
          console.warn("Block already exists at position:", position);
          return false;
        }

        // Create the block
        const block: Block = {
          id: uuidv4(),
          position: {
            x: Math.round(position.x),
            y: Math.round(position.y),
            z: Math.round(position.z),
          },
          type,
          color: blockDefinitions[type].color,
          metadata: {
            createdAt: Date.now(),
            modifiedAt: Date.now(),
            createdBy: userId,
          },
        };

        set((draft) => {
          // Save current state to history before making changes
          const snapshot: WorldSnapshot = {
            blockMap: new Map(draft.blockMap),
            blockCount: draft.blockCount,
            timestamp: Date.now(),
          };

          // Add the block first
          draft.blockMap.set(key, block);
          draft.blockCount++;
          draft.lastUpdate = Date.now();

          // Then manage history
          const { states, currentIndex, maxStates } = draft.history;

          // Clear redo states when adding new action (as per best practices)
          draft.history.redoStates = [];

          // Remove any future states when adding new snapshot
          if (currentIndex < states.length - 1) {
            states.splice(currentIndex + 1);
          }

          // Add new snapshot (the state before this change)
          states.push(snapshot);

          // Maintain circular buffer size
          if (states.length > maxStates) {
            states.shift();
          } else {
            draft.history.currentIndex++;
          }
        });

        return true;
      },

      addBlockInternal: (
        position: Vector3,
        type: BlockType,
        userId: string,
      ): boolean => {
        return get().addBlock(position, type, userId);
      },

      removeBlock: (position: Vector3, userId: string): boolean => {
        void userId;
        const state = get();

        // Ensure position coordinates are properly rounded to match storage
        const roundedPosition = new Vector3(
          Math.round(position.x),
          Math.round(position.y),
          Math.round(position.z),
        );
        const key = positionToKey(roundedPosition);

        // Check cooldown to prevent rapid-fire removal attempts
        const now = Date.now();
        const lastRemoval = state.lastUpdate || 0;
        if (now - lastRemoval < 50) {
          // 50ms cooldown between removals
          return false;
        }

        if (!state.blockMap.has(key)) {
          console.warn(
            `No block found at position: (${position.x}, ${position.y}, ${position.z}), rounded: (${roundedPosition.x}, ${roundedPosition.y}, ${roundedPosition.z}), key: ${key}`,
          );
          console.warn(
            "Available block keys:",
            Array.from(state.blockMap.keys()).slice(0, 10),
          );
          return false;
        }

        set((draft) => {
          // Save current state to history before making changes
          const snapshot: WorldSnapshot = {
            blockMap: new Map(draft.blockMap),
            blockCount: draft.blockCount,
            timestamp: Date.now(),
          };

          // Remove the block first
          draft.blockMap.delete(key);
          draft.blockCount--;
          draft.lastUpdate = Date.now();

          // Then manage history
          const { states, currentIndex, maxStates } = draft.history;

          // Clear redo states when adding new action (as per best practices)
          draft.history.redoStates = [];

          // Remove any future states when adding new snapshot
          if (currentIndex < states.length - 1) {
            states.splice(currentIndex + 1);
          }

          // Add new snapshot (the state before this change)
          states.push(snapshot);

          // Maintain circular buffer size
          if (states.length > maxStates) {
            states.shift();
          } else {
            draft.history.currentIndex++;
          }
        });

        return true;
      },

      removeBlockById: (id: string, userId: string): boolean => {
        void userId;
        const state = get();

        // Find block by ID (O(n) operation, but needed for ID-based removal)
        let blockKey: string | undefined;
        for (const [key, block] of state.blockMap.entries()) {
          if (block.id === id) {
            blockKey = key;
            break;
          }
        }

        if (!blockKey) {
          console.warn("No block found with ID:", id);
          return false;
        }

        // Save snapshot before making changes
        const snapshot: WorldSnapshot = {
          blockMap: new Map(state.blockMap),
          blockCount: state.blockCount,
          timestamp: Date.now(),
        };

        set((draft) => {
          // Add snapshot to history
          const { states, currentIndex, maxStates } = draft.history;

          // Remove any redo states when adding new snapshot
          if (currentIndex < states.length - 1) {
            states.splice(currentIndex + 1);
          }

          // Add new snapshot
          states.push(snapshot);

          // Maintain circular buffer size
          if (states.length > maxStates) {
            states.shift();
          } else {
            draft.history.currentIndex++;
          }

          // Update current index
          draft.history.currentIndex = Math.min(
            draft.history.currentIndex,
            maxStates - 1,
          );

          // Remove the block
          draft.blockMap.delete(blockKey!);
          draft.blockCount--;
          draft.lastUpdate = Date.now();
        });

        return true;
      },

      // O(1) block lookup operations
      getBlock: (position: Vector3): Block | undefined => {
        const key = positionToKey(position);
        return get().blockMap.get(key);
      },

      getBlockById: (id: string): Block | undefined => {
        const state = get();
        for (const block of state.blockMap.values()) {
          if (block.id === id) {
            return block;
          }
        }
        return undefined;
      },

      getAllBlocks: (): Block[] => {
        return Array.from(get().blockMap.values());
      },

      hasBlock: (position: Vector3): boolean => {
        const key = positionToKey(position);
        return get().blockMap.has(key);
      },

      // Simulant management
      addSimulant: (simulant: AISimulant): void => {
        set((draft) => {
          draft.simulants.set(simulant.id, simulant);
          draft.lastUpdate = Date.now();
        });
      },

      removeSimulant: (id: string): void => {
        set((draft) => {
          draft.simulants.delete(id);
          draft.lastUpdate = Date.now();
        });
      },

      updateSimulant: (id: string, updates: Partial<AISimulant>): void => {
        set((draft) => {
          const simulant = draft.simulants.get(id);
          if (simulant) {
            Object.assign(simulant, updates);
            draft.lastUpdate = Date.now();
          }
        });
      },

      // Undo/Redo system with circular buffer for O(1) operations
      saveSnapshot: (): void => {
        // This method is now handled inline in addBlock/removeBlock methods
        // to avoid state access issues
      },

      undo: (): boolean => {
        const state = get();

        if (!state.canUndo()) {
          return false;
        }

        set((draft) => {
          const snapshot = draft.history.states[draft.history.currentIndex];
          if (snapshot) {
            // Save current state to redo stack before undoing
            const currentState: WorldSnapshot = {
              blockMap: new Map(draft.blockMap),
              blockCount: draft.blockCount,
              timestamp: Date.now(),
            };
            draft.history.redoStates.push(currentState);

            // Restore to previous state
            draft.blockMap = new Map(snapshot.blockMap);
            draft.blockCount = snapshot.blockCount;
            draft.history.currentIndex--;
            draft.lastUpdate = Date.now();
          }
        });

        return true;
      },

      redo: (): boolean => {
        const state = get();

        if (!state.canRedo()) {
          return false;
        }

        set((draft) => {
          // Get the most recent redo state
          const redoState = draft.history.redoStates.pop();
          if (redoState) {
            // Save current state back to undo history
            const currentState: WorldSnapshot = {
              blockMap: new Map(draft.blockMap),
              blockCount: draft.blockCount,
              timestamp: Date.now(),
            };
            draft.history.currentIndex++;
            if (draft.history.currentIndex >= draft.history.states.length) {
              draft.history.states.push(currentState);
            } else {
              draft.history.states[draft.history.currentIndex] = currentState;
            }

            // Restore to redo state
            draft.blockMap = new Map(redoState.blockMap);
            draft.blockCount = redoState.blockCount;
            draft.lastUpdate = Date.now();
          }
        });

        return true;
      },

      canUndo: (): boolean => {
        const state = get();
        return (
          state.history.states.length > 0 && state.history.currentIndex >= 0
        );
      },

      canRedo: (): boolean => {
        const state = get();
        return state.history.redoStates.length > 0;
      },

      // Utility functions
      setSelectedBlockType: (type: BlockType): void => {
        set((draft) => {
          draft.selectedBlockType = type;
          draft.selectionMode = SelectionMode.PLACE; // Switch to place mode when selecting a block
        });
      },

      setSelectionMode: (mode: SelectionMode): void => {
        set((draft) => {
          draft.selectionMode = mode;
        });
      },

      setCameraMode: (mode: CameraMode): void => {
        set((draft) => {
          draft.activeCamera = mode;
        });
      },

      setSyncStatus: (
        status: "connected" | "disconnected" | "syncing",
      ): void => {
        set((draft) => {
          draft.syncStatus = status;
          draft.lastUpdate = Date.now();
        });
      },

      updateGridConfig: (
        updates: Partial<import("../types").GridConfig>,
      ): void => {
        set((draft) => {
          Object.assign(draft.gridConfig, updates);
          draft.lastUpdate = Date.now();
        });
      },

      // World management
      clearWorld: (): void => {
        const state = get();

        // Save snapshot before clearing
        const snapshot: WorldSnapshot = {
          blockMap: new Map(state.blockMap),
          blockCount: state.blockCount,
          timestamp: Date.now(),
        };

        set((draft) => {
          // Add snapshot to history
          const { states, currentIndex, maxStates } = draft.history;

          // Remove any redo states when adding new snapshot
          if (currentIndex < states.length - 1) {
            states.splice(currentIndex + 1);
          }

          // Add new snapshot
          states.push(snapshot);

          // Maintain circular buffer size
          if (states.length > maxStates) {
            states.shift();
          } else {
            draft.history.currentIndex++;
          }

          // Update current index
          draft.history.currentIndex = Math.min(
            draft.history.currentIndex,
            maxStates - 1,
          );

          // Clear the world
          draft.blockMap.clear();
          draft.blockCount = 0;
          draft.simulants.clear();
          draft.lastUpdate = Date.now();
        });
      },

      getWorldStats: (): WorldStats => {
        const state = get();
        const blocks = Array.from(state.blockMap.values());

        // Calculate block counts by type - initialize all block types
        const blocksByType: Record<BlockType, number> = {
          [BlockType.STONE]: 0,
          [BlockType.LEAF]: 0,
          [BlockType.WOOD]: 0,
          [BlockType.FROSTED_GLASS]: 0,
          [BlockType.NUMBER_4]: 0,
          [BlockType.NUMBER_5]: 0,
          [BlockType.NUMBER_6]: 0,
          [BlockType.NUMBER_7]: 0,
        };

        let minX = Infinity,
          minY = Infinity,
          minZ = Infinity;
        let maxX = -Infinity,
          maxY = -Infinity,
          maxZ = -Infinity;

        blocks.forEach((block) => {
          blocksByType[block.type]++;

          minX = Math.min(minX, block.position.x);
          minY = Math.min(minY, block.position.y);
          minZ = Math.min(minZ, block.position.z);
          maxX = Math.max(maxX, block.position.x);
          maxY = Math.max(maxY, block.position.y);
          maxZ = Math.max(maxZ, block.position.z);
        });

        // Count active simulants
        const activeSimulants = Array.from(state.simulants.values()).filter(
          (s) => s.status === "active",
        ).length;

        return {
          totalBlocks: state.blockCount,
          blocksByType,
          activeSimulants,
          worldSize: {
            min: new Vector3(
              blocks.length > 0 ? minX : 0,
              blocks.length > 0 ? minY : 0,
              blocks.length > 0 ? minZ : 0,
            ),
            max: new Vector3(
              blocks.length > 0 ? maxX : 0,
              blocks.length > 0 ? maxY : 0,
              blocks.length > 0 ? maxZ : 0,
            ),
          },
        };
      },

      // Reset store to initial state (for testing)
      resetStore: (): void => {
        set(() => ({
          blockMap: new Map<string, Block>(),
          blockCount: 0,
          worldLimits: { maxBlocks: 1000 },
          selectedBlockType: BlockType.STONE,
          selectionMode: SelectionMode.EMPTY,
          activeCamera: "orbit",
          simulants: new Map<string, AISimulant>(),
          lastUpdate: Date.now(),
          syncStatus: "disconnected",
          gridConfig: {
            size: 50,
            cellSize: 1,
            opacity: 0.8,
            visibility: true,
            fadeDistance: 30,
            fadeStrength: 0.5,
            rippleEnabled: false,
            snapToGrid: true,
            showSnapIndicators: true,
          },
          history: {
            states: [],
            currentIndex: -1,
            maxStates: 50,
            redoStates: [],
          },
        }));
      },
    })),
  ),
);

// Export utility functions for external use
export { positionToKey, keyToPosition, blockDefinitions };

// Export types
export type { WorldStats, WorldSnapshot };
