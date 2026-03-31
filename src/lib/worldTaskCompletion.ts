import { useGameStore } from "@/store/gameStore";
import type { AgentTask } from "@/types/agent";

/**
 * When an AgentTask from a shared world task finishes, advance or reopen the world task.
 */
export function applyWorldTaskStepCompletion(
  agentId: string,
  task: AgentTask | null | undefined,
  completionAborted: boolean,
): void {
  if (!task?.worldTaskId || task.source !== "world_task") return;

  const store = useGameStore.getState();
  const wt = store.worldTasksById[task.worldTaskId];
  if (!wt) return;

  if (completionAborted) {
    store.updateWorldTask(wt.id, { status: "open", assigneeId: null });
    return;
  }

  switch (wt.payload.kind) {
    case "deliver":
      if (task.type === "PLACE_INVENTORY") {
        store.updateWorldTask(wt.id, { status: "done", assigneeId: agentId });
      }
      break;
    case "go_zone":
      if (task.type === "GO_TO") {
        store.updateWorldTask(wt.id, { status: "done", assigneeId: agentId });
      }
      break;
    case "follow_player":
      if (task.type === "FOLLOW_PLAYER") {
        store.updateWorldTask(wt.id, { status: "done", assigneeId: agentId });
      }
      break;
    default:
      break;
  }

  if (wt.subtasks?.length) {
    const allDone = wt.subtasks.every((s) => s.done);
    if (allDone) {
      store.updateWorldTask(wt.id, { status: "done" });
    }
  }
}
