import type { WorldTask } from "@/types/worldTask";

/** Scenario tasks registered when the Donut Lab world mounts (open backlog). */
export function buildDonutLabWorldTaskSeeds(): Omit<
  WorldTask,
  "id" | "createdAt"
>[] {
  return [
    {
      title: "Deliver Rack 3 packet to supervisor",
      description:
        "Pick **file-rack3-to-supervisor** from Storage Cupboard 3 and place it on **desk-supervisor-donut-inbox**. Coordinate with teammates if the route is busy.",
      status: "open",
      priority: 19,
      assigneeId: null,
      createdBy: "scenario",
      payload: {
        kind: "deliver",
        itemId: "file-rack3-to-supervisor",
        destAreaId: "desk-supervisor-donut-inbox",
      },
      helpersNeeded: true,
    },
  ];
}
