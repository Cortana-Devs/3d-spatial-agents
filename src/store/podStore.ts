import type { StateCreator } from "zustand";
import { AGENT_POD_LAYOUT } from "@/config/agentPods";
import type { GameState, PodSlice, PodRuntimeState } from "./gameStoreTypes";

export const createPodSlice: StateCreator<GameState, [], [], PodSlice> = (
  set,
  get,
) => ({
  pods: {},

  initPods: () => {
    const pods: Record<string, PodRuntimeState> = {};
    AGENT_POD_LAYOUT.forEach((spec, i) => {
      const assignedAgentId =
        i === 0 ? "agent-01" : i === 1 ? "agent-02" : null;
      pods[spec.id] = {
        assignedAgentId,
        isDeployed: assignedAgentId != null,
        position: { ...spec.worldPosition },
      };
    });
    set({ pods });
  },

  deployAgent: (podId: string) => {
    const pod = get().pods[podId];
    if (!pod?.assignedAgentId) return;
    set((s) => ({
      pods: {
        ...s.pods,
        [podId]: { ...s.pods[podId], isDeployed: true },
      },
    }));
    window.dispatchEvent(
      new CustomEvent("agent-deploy-from-pod", {
        detail: { agentId: pod.assignedAgentId, podId },
      }),
    );
  },

  recallAgent: (podId: string) => {
    const pod = get().pods[podId];
    if (!pod?.assignedAgentId) return;
    window.dispatchEvent(
      new CustomEvent("agent-recall-to-pod", {
        detail: { agentId: pod.assignedAgentId, podId },
      }),
    );
  },

  setPodDeployed: (podId: string, deployed: boolean) => {
    const pod = get().pods[podId];
    if (!pod) return;
    set((s) => ({
      pods: {
        ...s.pods,
        [podId]: { ...s.pods[podId], isDeployed: deployed },
      },
    }));
  },

  getPodIdForAgent: (agentId: string) => {
    const { pods } = get();
    for (const [pid, p] of Object.entries(pods)) {
      if (p.assignedAgentId === agentId) return pid;
    }
    return null;
  },
});
