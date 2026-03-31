import type { StateCreator } from "zustand";
import type { GameState, WorldTaskSlice } from "./gameStoreTypes";
import { enqueueWorldTaskForAgent, pickAgentForWorldTask } from "@/lib/worldTaskDispatch";
import { InterAgentComms } from "@/systems/InterAgentComms";
import { AgentTaskRegistry } from "@/systems/AgentTaskQueue";
import type { WorldTask } from "@/types/worldTask";

export const createWorldTaskSlice: StateCreator<
  GameState,
  [],
  [],
  WorldTaskSlice
> = (set, get) => ({
  worldTasksById: {},

  addWorldTask: (t) => {
    const id =
      t.id ?? `wt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const full: WorldTask = {
      ...t,
      id,
      createdAt: Date.now(),
    };
    set((s) => ({
      worldTasksById: { ...s.worldTasksById, [id]: full },
    }));
    return id;
  },

  updateWorldTask: (id, patch) =>
    set((s) => {
      const cur = s.worldTasksById[id];
      if (!cur) return s;
      return {
        worldTasksById: { ...s.worldTasksById, [id]: { ...cur, ...patch } },
      };
    }),

  removeWorldTask: (id) =>
    set((s) => {
      const next = { ...s.worldTasksById };
      delete next[id];
      return { worldTasksById: next };
    }),

  clearWorldTasks: () => set({ worldTasksById: {} }),

  dispatchOpenWorldTask: (taskId) => {
    const task = get().worldTasksById[taskId];
    if (!task || task.status !== "open" || task.assigneeId != null) {
      return null;
    }
    const agentId = pickAgentForWorldTask(task);
    if (!agentId) return null;
    const ok = enqueueWorldTaskForAgent(task, agentId, (wid, patch) =>
      get().updateWorldTask(wid, patch),
    );
    if (!ok) return null;
    InterAgentComms.emitBroadcast(
      "operator",
      `Shared lab task queued: "${task.title}" → ${agentId}.`,
    );
    return agentId;
  },

  claimWorldTaskForAgent: (taskId, agentId) => {
    const task = get().worldTasksById[taskId];
    if (!task || task.status === "done" || task.status === "failed") {
      return false;
    }
    if (task.assigneeId != null && task.assigneeId !== agentId) {
      return false;
    }
    if (
      task.status === "in_progress" &&
      task.assigneeId === agentId
    ) {
      return false;
    }
    return enqueueWorldTaskForAgent(task, agentId, (wid, patch) =>
      get().updateWorldTask(wid, patch),
    );
  },

  releaseWorldTask: (taskId, agentId) => {
    const task = get().worldTasksById[taskId];
    if (!task || task.assigneeId !== agentId) return;
    AgentTaskRegistry.getInstance()
      .getOrCreate(agentId)
      .cancelWorldTaskChain(taskId);
    get().updateWorldTask(taskId, { assigneeId: null, status: "open" });
  },
});
