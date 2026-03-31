import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";
import { AgentTaskRegistry } from "@/systems/AgentTaskQueue";
import { InteractableRegistry } from "@/systems/InteractableRegistry";
import { buildAgentTasksFromWorldTask } from "@/lib/worldTaskEnqueue";
import type { WorldTask } from "@/types/worldTask";

/**
 * Pick the best agent for an open world task: low queue depth, idle phase,
 * not in active player chat, tie-break distance to task anchor (item for deliver).
 */
export function pickAgentForWorldTask(task: WorldTask): string | null {
  const reg = AgentTaskRegistry.getInstance();
  const ids = reg.getAllAgentIds();
  if (ids.length === 0) return null;

  let anchor: THREE.Vector3 | null = null;
  if (task.payload.kind === "deliver") {
    const obj = InteractableRegistry.getInstance().getById(
      task.payload.itemId,
    );
    if (obj?.position) anchor = obj.position.clone();
  }

  const positions = useGameStore.getState().agentPositions;
  const isChatOpen = useGameStore.getState().isChatOpen;
  const chatAgentId = useGameStore.getState().chatAgentId;

  let best: string | null = null;
  let bestScore = Infinity;

  for (const id of ids) {
    const q = reg.getOrCreate(id);
    const len = q.getQueueLength();
    const phase = q.getCurrentPhase();
    const busyPenalty =
      phase !== "IDLE" && phase !== "COMPLETED" ? 15 : 0;
    const chatPenalty = isChatOpen && chatAgentId === id ? 25 : 0;
    let dist = 0;
    if (anchor && positions[id]) {
      dist = anchor.distanceTo(positions[id]);
    }
    const score = len * 8 + busyPenalty + chatPenalty + dist * 0.02;
    if (score < bestScore) {
      bestScore = score;
      best = id;
    }
  }

  return best;
}

/** Choose an agent when there is no world-task anchor (e.g. raw panel queue). */
export function pickAnyAvailableAgent(): string | null {
  const reg = AgentTaskRegistry.getInstance();
  const ids = reg.getAllAgentIds();
  if (ids.length === 0) return null;

  const isChatOpen = useGameStore.getState().isChatOpen;
  const chatAgentId = useGameStore.getState().chatAgentId;

  let best: string | null = null;
  let bestScore = Infinity;

  for (const id of ids) {
    const q = reg.getOrCreate(id);
    const len = q.getQueueLength();
    const phase = q.getCurrentPhase();
    const busyPenalty =
      phase !== "IDLE" && phase !== "COMPLETED" ? 15 : 0;
    const chatPenalty = isChatOpen && chatAgentId === id ? 25 : 0;
    const score = len * 8 + busyPenalty + chatPenalty;
    if (score < bestScore) {
      bestScore = score;
      best = id;
    }
  }

  return best;
}

/** Enqueue concrete tasks and update task record. */
export function enqueueWorldTaskForAgent(
  task: WorldTask,
  agentId: string,
  setState: (id: string, patch: Partial<WorldTask>) => void,
): boolean {
  const chain = buildAgentTasksFromWorldTask(task);
  if (chain.length === 0) return false;

  const q = AgentTaskRegistry.getInstance().getOrCreate(agentId);
  for (const t of chain) {
    q.enqueue(t);
  }

  setState(task.id, {
    assigneeId: agentId,
    status: task.status === "open" ? "in_progress" : task.status,
  });
  return true;
}
