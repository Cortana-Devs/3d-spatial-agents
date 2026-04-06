import type { WorldTask } from "@/types/worldTask";

/** Scenario tasks registered when the Facility Lab world mounts (open backlog). */
export function buildResearchFacilityWorldTaskSeeds(): Omit<
  WorldTask,
  "id" | "createdAt"
>[] {
  return [
    {
      title: "Deliver Rack 3 packet to supervisor",
      description:
        "Pick **file-rack3-to-supervisor** from Storage Cupboard 3 and place it on **desk-supervisor-facility-inbox**. Coordinate with teammates if the route is busy.",
      status: "open",
      priority: 19,
      assigneeId: null,
      createdBy: "scenario",
      payload: {
        kind: "deliver",
        itemId: "file-rack3-to-supervisor",
        destAreaId: "desk-supervisor-facility-inbox",
      },
      helpersNeeded: true,
    },
  ];
}
