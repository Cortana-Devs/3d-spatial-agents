import type { AgentTask } from "@/types/agent";
import type { WorldTask, WorldTaskPayload } from "@/types/worldTask";

const DEFAULT_PRIORITY = 17;

/** Map a world task payload to concrete queue tasks (single chain). */
export function buildAgentTasksFromWorldTask(wt: WorldTask): AgentTask[] {
  const base = {
    source: "world_task" as const,
    worldTaskId: wt.id,
    priority: Math.max(wt.priority, DEFAULT_PRIORITY),
    scriptId: `world_task_${wt.id}`,
  };

  switch (wt.payload.kind) {
    case "deliver":
      return [
        { ...base, type: "PICK_NEARBY" as const, itemId: wt.payload.itemId },
        {
          ...base,
          type: "PLACE_INVENTORY" as const,
          destAreaId: wt.payload.destAreaId,
        },
      ];
    case "go_zone":
      return [
        {
          ...base,
          type: "GO_TO" as const,
          targetAreaId: wt.payload.zoneId,
        },
      ];
    case "follow_player":
      return [{ ...base, type: "FOLLOW_PLAYER" as const }];
    default:
      return [];
  }
}

/** Map player task-panel chains to a shared world payload when possible. */
export function inferWorldPayloadFromPending(
  pending: AgentTask[],
): WorldTaskPayload | null {
  if (
    pending.length === 2 &&
    pending[0].type === "PICK_NEARBY" &&
    pending[1].type === "PLACE_INVENTORY" &&
    pending[0].itemId &&
    pending[1].destAreaId
  ) {
    return {
      kind: "deliver",
      itemId: pending[0].itemId,
      destAreaId: pending[1].destAreaId,
    };
  }
  if (pending.length === 1 && pending[0].type === "FOLLOW_PLAYER") {
    return { kind: "follow_player" };
  }
  return null;
}
