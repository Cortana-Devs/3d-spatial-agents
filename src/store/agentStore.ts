import * as THREE from "three";
import { useShallow } from "zustand/react/shallow";
import type { StateCreator } from "zustand";
import {
  DEFAULT_AGENT_DESK,
  buildResearchFacilityScenarioContext,
} from "@/config/facilityLabDeskAssignments";
import type { AgentSlice, GameState, ResearchAgent } from "./gameStoreTypes";

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

  // High-frequency mutable positions to avoid object allocation in useFrame
  agentPositionsRef: {}, 
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

  personalDeskByAgent: {},
  setPersonalDesk: (agentId, deskId) =>
    set((state) => {
      const personalDeskByAgent = {
        ...state.personalDeskByAgent,
        [agentId]: deskId,
      };
      return {
        personalDeskByAgent,
        agentScenarioContext: {
          ...state.agentScenarioContext,
          [agentId]: buildResearchFacilityScenarioContext(agentId, personalDeskByAgent),
        },
      };
    }),
  seedDefaultPersonalDesks: (agentIds) =>
    set((state) => {
      const next = { ...state.personalDeskByAgent };
      for (const id of agentIds) {
        if (!next[id]) {
          next[id] = DEFAULT_AGENT_DESK[id] ?? "desk-east-0";
        }
      }
      const scenario = { ...state.agentScenarioContext };
      for (const id of agentIds) {
        scenario[id] = buildResearchFacilityScenarioContext(id, next);
      }
      return {
        personalDeskByAgent: next,
        agentScenarioContext: scenario,
      };
    }),

  agentPromptOverrides: {},
  setAgentPromptOverride: (id, prompt) =>
    set((state) => ({
      agentPromptOverrides: { ...state.agentPromptOverrides, [id]: prompt },
    })),

  activeResearchAgents: [
    {
      id: "agent-01",
      name: "Researcher Delta",
      color: "#00f2ff", // Electric Cyan
      status: "IDLE",
      thoughtHistory: [],
      currentTask: "None",
      spawnPosition: [18, 5.0, 52],
    },
    {
      id: "agent-02",
      name: "Researcher Sigma",
      color: "#ff00ff", // Neon Magenta
      status: "IDLE",
      thoughtHistory: [],
      currentTask: "None",
      spawnPosition: [-22, 5.0, 48],
    }
  ],

  spawnAgent: (config) => set((state) => {
    const palette = [
      "#00f2ff", "#ff00ff", "#00ff00", "#ffd700", 
      "#ff8c00", "#bf00ff", "#ff4d4d", "#4d4dff", 
      "#50c878", "#ff69b4"
    ];
    const index = state.activeResearchAgents.length;
    const id = `agent-0${index + 1}`;
    const color = palette[index % palette.length];
    
    const newAgent: ResearchAgent = {
      id,
      name: `Researcher ${String.fromCharCode(65 + index)}`,
      color,
      status: "IDLE",
      thoughtHistory: [],
      currentTask: "Initializing...",
      spawnPosition: [0, 5, 72],
      ...config
    };

    const personalDeskByAgent = { ...state.personalDeskByAgent };
    if (!personalDeskByAgent[newAgent.id]) {
      personalDeskByAgent[newAgent.id] =
        DEFAULT_AGENT_DESK[newAgent.id] ?? "desk-east-0";
    }
    const agentScenarioContext = {
      ...state.agentScenarioContext,
      [newAgent.id]: buildResearchFacilityScenarioContext(
        newAgent.id,
        personalDeskByAgent,
      ),
    };

    // Initialize metrics to avoid UI flashing
    const agentMetrics = {
      ...state.agentMetrics,
      [newAgent.id]: { latency: 0, spatialRatio: 0, status: 'INITIALIZING' as const }
    };

    return {
      activeResearchAgents: [...state.activeResearchAgents, newAgent],
      personalDeskByAgent,
      agentScenarioContext,
      agentMetrics,
    };
  }),

  removeAgent: (id) => set((state) => ({
    activeResearchAgents: state.activeResearchAgents.filter(a => a.id !== id)
  })),

  updateAgentCognition: (id, thought) => set((state) => ({
    activeResearchAgents: state.activeResearchAgents.map(a => 
      a.id === id 
        ? { ...a, thoughtHistory: [...a.thoughtHistory, thought].slice(-5) } 
        : a
    )
  })),

  updateAgentStatus: (id, status) => set((state) => ({
    activeResearchAgents: state.activeResearchAgents.map(a => 
      a.id === id ? { ...a, status } : a
    )
  })),

  purgeAgentMemory: async (id) => {
    // Dynamic imports to avoid circular dependency and SSR issues
    const { KnowledgeGraph } = await import("@/lib/memory/KnowledgeGraph");
    const { memoryStream } = await import("@/lib/memory/MemoryStream");
    const { TickSnapshotBuffer } = await import("@/debug/TickSnapshot");
    
    await memoryStream.clear(id);
    await KnowledgeGraph.clear(id);
    TickSnapshotBuffer.getInstance(id).clear();
    
    set((state) => ({
      activeResearchAgents: state.activeResearchAgents.map(a => 
        a.id === id ? { ...a, thoughtHistory: [] } : a
      )
    }));
  },

  purgeGlobalPersistence: async () => {
    const { memoryStorage } = await import("@/lib/memory/idb-adapter");
    await memoryStorage.clearAll();
    // Safety reload to ensure all in-memory caches are invalidated
    if (typeof window !== 'undefined') window.location.reload(); 
  },

  playerPosition: new THREE.Vector3(),
  setPlayerPosition: (pos) => set({ playerPosition: pos }),

  debugTarget: null,
  setDebugTarget: (target) => set({ debugTarget: target }),
});
