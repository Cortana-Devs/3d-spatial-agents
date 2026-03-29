import * as THREE from "three";
import { AgentDrives, DRIVE_CONFIGS } from "./agent-drives";
import { AgentTask } from "@/components/systems/AgentTaskQueue";
import { InteractableRegistry } from "@/components/systems/InteractableRegistry";
import { POIRegistry } from "@/components/systems/POIRegistry";
import { SpatialMemory } from "./memory/SpatialMemory";
import { SpatialFamiliarity } from "./SpatialFamiliarity";
import { ALL_ZONE_IDS, getNearestBench, getZoneCenterPosition } from "@/config/donutLabRoutines";
import { InterestMap } from "@/store/InterestMap";

export class UtilityBrain {
  private agentId: string;
  private personalityNoise: number;

  constructor(agentId: string) {
    this.agentId = agentId;
    // Each agent has a unique "vibe" that slightly shifts their thresholds
    this.personalityNoise = (Math.random() - 0.5) * 0.1; // ±5%
  }

  private evaluateUrgency(value: number, type: "exponential" | "logistic" | "logarithmic", k: number = 3): number {
    // Input value is 0-100, normalize to 0-1 for curve math
    // Invert so 100 (full) = 0 urgency, 0 (empty) = 1 urgency
    const x = Math.max(0, Math.min(1, (100 - value) / 100));
    let base = 0;

    switch (type) {
      case "exponential":
        base = Math.pow(x, k);
        break;
      case "logistic":
        // Midpoint at 0.5, steepness k
        base = 1 / (1 + Math.exp(-k * (x - 0.5)));
        break;
      case "logarithmic":
        base = Math.log(1 + x * k) / Math.log(1 + k);
        break;
      default:
        base = x;
    }

    return Math.max(0, Math.min(1, base + this.personalityNoise));
  }

  /**
   * Evaluates the current state and returns a set of tasks to satisfy the most urgent drive locally.
   */
  public evaluate(
    drives: AgentDrives,
    position: THREE.Vector3,
    spatialMemory: SpatialMemory,
    familiarity: SpatialFamiliarity
  ): AgentTask[] | null {
    const registry = InteractableRegistry.getInstance();
    
    // 1. Calculate Urgencies using Non-Linear Curves
    const energyUrgency = this.evaluateUrgency(drives.energy, "exponential", 4); // Fatigue spikes late
    const tidinessUrgency = this.evaluateUrgency(drives.tidiness, "logistic", 10); // Mess "snaps" at threshold
    const wonderUrgency = this.evaluateUrgency(drives.wonder, "logarithmic", 2); // Boredom plateaus
    const curiosityUrgency = this.evaluateUrgency(drives.curiosity, "logistic", 6);

    // 2. Select most urgent below internal thresholds
    const options = [
      { id: "energy", score: energyUrgency, threshold: 0.4 },
      { id: "tidiness", score: tidinessUrgency, threshold: 0.35 },
      { id: "wonder", score: wonderUrgency, threshold: 0.3 },
      { id: "curiosity", score: curiosityUrgency, threshold: 0.3 }
    ];

    const urgent = options
      .filter(o => o.score > o.threshold)
      .sort((a, b) => b.score - a.score)[0];

    if (!urgent) return null;

    // 3. Generate Tasks based on winning drive
    switch (urgent.id) {
      case "energy": {
        const nearestBench = getNearestBench(position);
        if (nearestBench) {
          return [
            { type: "GO_TO", priority: 5, targetPos: nearestBench, scriptId: "local_rest" },
            { type: "SIT", priority: 5, duration: 20, scriptId: "local_rest" }
          ] as AgentTask[];
        }
        break;
      }

      case "tidiness": {
        const nearbyItems = registry.getNearby(position, 15);
        const floorItem = nearbyItems.find(i => i.pickable && !i.carriedBy && !i.placedInArea && !registry.isItemClaimed(i.id));
        if (floorItem) {
          const area = registry.getEmptyAreaByGroup(floorItem.homeAreaId || "core-lab");
          if (area) {
            return [
              { type: "PICK_NEARBY", priority: 4, itemId: floorItem.id, scriptId: "local_tidy" },
              { type: "PLACE_INVENTORY", priority: 4, destAreaId: area.id, scriptId: "local_tidy" }
            ] as AgentTask[];
          }
        }
        break;
      }

      case "wonder": {
        const bestPOI = POIRegistry.getInstance().getMostNovelNearby(position, 50);
        if (bestPOI) {
          return [
            { type: "GO_TO", priority: 3, targetPos: bestPOI.position, scriptId: "local_wonder" },
            { type: "CONTEMPLATE", priority: 3, duration: 12, lookTarget: bestPOI.lookTarget, scriptId: "local_wonder" }
          ] as AgentTask[];
        }
        break;
      }

      case "curiosity": {
        const interestingSpot = InterestMap.getInstance().getInterestingSpot(position, 50);
        if (interestingSpot) {
          // Dampen interest based on per-agent familiarity (Phase 3: Individual Dispersion)
          const dampening = familiarity.getInterestDampening(interestingSpot);
          const curiosityScore = 2 * dampening; // Dynamic priority [0.4 - 2.0]
          
          if (curiosityScore > 0.8) {
            return [
              { type: "GO_TO", priority: curiosityScore, targetPos: interestingSpot, scriptId: "local_curiosity" },
              { type: "WANDER", priority: curiosityScore, duration: 8, scriptId: "local_curiosity" }
            ] as AgentTask[];
          }
        }
        const targetZone = spatialMemory.getLeastVisitedZone(ALL_ZONE_IDS as string[]);
        const zonePos = getZoneCenterPosition(targetZone);
        if (zonePos) {
          return [
            { type: "GO_TO", priority: 2, targetPos: zonePos, targetAreaId: targetZone, scriptId: "local_explore" },
            { type: "WANDER", priority: 2, scriptId: "local_explore" }
          ] as AgentTask[];
        }
        break;
      }
    }

    return null;
  }
}
