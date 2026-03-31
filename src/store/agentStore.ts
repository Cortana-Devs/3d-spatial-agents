import * as THREE from "three";
import type { StateCreator } from "zustand";
import type { AgentSlice, GameState } from "./gameStoreTypes";

export const createAgentSlice: StateCreator<
  GameState,
  [],
  [],
  AgentSlice
> = (set) => ({
  isSitting: false,
  setSitting: (sitting) => set({ isSitting: sitting }),
  isTeleporting: false,
  setTeleporting: (teleporting) => set({ isTeleporting: teleporting }),

  inspectedAgentId: null,
  setInspectedAgentId: (id) => set({ inspectedAgentId: id }),
  inspectedAgentData: null,
  setInspectedAgentData: (data) => set({ inspectedAgentData: data }),

  followingAgentId: null,
  setFollowingAgentId: (id) => set({ followingAgentId: id }),

  agentPositions: {},
  setAgentPosition: (id, pos) =>
    set((state) => ({
      agentPositions: { ...state.agentPositions, [id]: pos },
    })),
  
  agentTrajectories: {},
  setAgentTrajectory: (id, path) =>
    set((state) => ({
      agentTrajectories: { ...state.agentTrajectories, [id]: path },
    })),

  agentMetrics: {},
  setAgentMetrics: (id, metrics) =>
    set((state) => ({
      agentMetrics: { ...state.agentMetrics, [id]: metrics },
    })),

  agentScenarioContext: {},
  setAgentScenarioContext: (id, ctx) =>
    set((state) => ({
      agentScenarioContext: { ...state.agentScenarioContext, [id]: ctx },
    })),

  playerPosition: new THREE.Vector3(),
  setPlayerPosition: (pos) => set({ playerPosition: pos }),

  debugTarget: null,
  setDebugTarget: (target) => set({ debugTarget: target }),
});
