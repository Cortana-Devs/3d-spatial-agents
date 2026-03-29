import * as THREE from "three";
import { AgentDrives, DRIVE_CONFIGS } from "./agent-drives";
import { AgentTask } from "@/components/systems/AgentTaskQueue";
import { InteractableRegistry } from "@/components/systems/InteractableRegistry";
import { POIRegistry } from "@/components/systems/POIRegistry";
import { SpatialMemory } from "./memory/SpatialMemory";
import { ALL_ZONE_IDS, getNearestBench, getZoneCenterPosition } from "@/config/donutLabRoutines";
import { InterestMap } from "@/store/InterestMap";

export class UtilityBrain {
  private agentId: string;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  /**
   * Evaluates the current state and returns a set of tasks to satisfy the most urgent drive locally.
   * Returns null if no local action is appropriate (allowing LLM to take over or continuing idle).
   */
  public evaluate(
    drives: AgentDrives,
    position: THREE.Vector3,
    spatialMemory: SpatialMemory
  ): AgentTask[] | null {
    const registry = InteractableRegistry.getInstance();
    
    // 1. Energy (Resting)
    if (drives.energy < DRIVE_CONFIGS.energy.threshold + 10) {
      const nearestBench = getNearestBench(position);
      if (nearestBench) {
        return [
          { type: "GO_TO", priority: 5, targetPos: nearestBench, scriptId: "local_rest" },
          { type: "SIT", priority: 5, duration: 15, scriptId: "local_rest" }
        ] as AgentTask[];
      }
    }

    // 2. Tidiness (Cleaning up)
    if (drives.tidiness < DRIVE_CONFIGS.tidiness.threshold + 15) {
      const nearbyItems = registry.getNearby(position, 10);
      const floorItem = nearbyItems.find(i => i.pickable && !i.carriedBy && !i.placedInArea && !registry.isItemClaimed(i.id));
      if (floorItem) {
        // Find a place to put it
        const area = registry.getEmptyAreaByGroup(floorItem.homeAreaId || "core-lab");
        if (area) {
           return [
             { type: "PICK_NEARBY", priority: 4, itemId: floorItem.id, scriptId: "local_tidy" },
             { type: "PLACE_INVENTORY", priority: 4, destAreaId: area.id, scriptId: "local_tidy" }
           ] as AgentTask[];
        }
      }
    }

    // 3. Wonder (Contemplation)
    if (drives.wonder < DRIVE_CONFIGS.wonder.threshold + 10) {
      const bestPOI = POIRegistry.getInstance().getMostNovelNearby(position, 40);
      if (bestPOI) {
        return [
          { type: "GO_TO", priority: 3, targetPos: bestPOI.position, scriptId: "local_wonder" },
          { type: "CONTEMPLATE", priority: 3, duration: 10, lookTarget: bestPOI.lookTarget, scriptId: "local_wonder" }
        ] as AgentTask[];
      }
    }

    // 4. Curiosity (Exploration)
    if (drives.curiosity < DRIVE_CONFIGS.curiosity.threshold + 5) {
      // Check for interesting environmental activity first
      const interestingSpot = InterestMap.getInstance().getInterestingSpot(position, 40);
      if (interestingSpot) {
          return [
            { type: "GO_TO", priority: 2, targetPos: interestingSpot, scriptId: "local_curiosity" },
            { type: "WANDER", priority: 2, duration: 5, scriptId: "local_curiosity" }
          ] as AgentTask[];
      }

      const targetZone = spatialMemory.getLeastVisitedZone(ALL_ZONE_IDS as string[]);
      const zonePos = getZoneCenterPosition(targetZone);
      if (zonePos) {
        return [
          { type: "GO_TO", priority: 2, targetPos: zonePos, targetAreaId: targetZone, scriptId: "local_explore" },
          { type: "WANDER", priority: 2, scriptId: "local_explore" }
        ] as AgentTask[];
      }
    }

    return null;
  }
}
