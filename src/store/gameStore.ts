import { create } from "zustand";
import { createAgentSlice } from "./agentStore";
import { createChatSlice } from "./chatStore";
import type { GameState } from "./gameStoreTypes";
import { createSettingsSlice } from "./settingsStore";
import { createUISlice } from "./uiStore";
import { createWorldSlice } from "./worldStore";
import { createPodSlice } from "./podStore";
import { createWorldTaskSlice } from "./worldTaskStore";

export type { GameState } from "./gameStoreTypes";
export type { GameInteractable } from "./gameStoreTypes";
export type { Obstacle, WorldObject } from "@/types/world";
export type { DebugTargetInfo, GridCell, GridRow } from "@/types/ui";

export const useGameStore = create<GameState>()((...args) => ({
  ...createWorldSlice(...args),
  ...createSettingsSlice(...args),
  ...createChatSlice(...args),
  ...createAgentSlice(...args),
  ...createUISlice(...args),
  ...createPodSlice(...args),
  ...createWorldTaskSlice(...args),
}));
