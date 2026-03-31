import * as THREE from "three";
import { AgentDrives } from "./agent-drives";
import { AgentTask } from "@/systems/AgentTaskQueue";
import { InteractableRegistry } from "@/systems/InteractableRegistry";
import { POIRegistry } from "@/systems/POIRegistry";
import { SpatialMemory } from "./memory/SpatialMemory";
import { SpatialFamiliarity } from "./SpatialFamiliarity";
import { ALL_ZONE_IDS, getNearestBench, getZoneCenterPosition } from "@/config/donutLabRoutines";
import { InterestMap } from "@/store/InterestMap";
import type { AgentPersonality } from "@/config/agentPersonalities";
import type { PerceptionRecord } from "@/lib/SensorySystem";

export class UtilityBrain {
  private agentId: string;
  private personalityNoise: number;
  /** Next wall-clock time (sec) a short local pacing wander may fire. */
  private nextPacingAtSec: number;

  constructor(agentId: string) {
    this.agentId = agentId;
    let hash = 0;
    for (let i = 0; i < agentId.length; i++) {
      hash = (hash << 5) - hash + agentId.charCodeAt(i);
      hash |= 0;
    }
    this.personalityNoise = (hash % 100) / 2000;
    const t = performance.now() / 1000;
    this.nextPacingAtSec = t + 25 + (Math.abs(hash) % 7000) / 100;
  }

  /**
   * Occasional tight-radius wander while idle and energy is mid-range (“thinking while walking”).
   */
  public checkPacing(
    drives: AgentDrives,
    allowPacing: boolean,
    nowSec: number,
  ): AgentTask | null {
    if (!allowPacing) {
      this.nextPacingAtSec = Math.max(this.nextPacingAtSec, nowSec + 10);
      return null;
    }
    const e = drives.energy;
    if (e < 28 || e > 72) return null;
    if (nowSec < this.nextPacingAtSec) return null;
    this.nextPacingAtSec = nowSec + 30 + Math.random() * 60;
    return {
      type: "WANDER",
      priority: 1,
      duration: 4 + Math.random() * 4,
      scriptId: "local_pacing",
      wanderInnerRadius: 8,
      wanderOuterRadius: 15,
    } as AgentTask;
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
    familiarity: SpatialFamiliarity,
    perceivedEntities: PerceptionRecord[] = [],
    personality?: AgentPersonality,
  ): AgentTask[] | null {
    const registry = InteractableRegistry.getInstance();
    const w = personality?.driveWeights ?? {};

    const thresholds = {
      energy: 0.4 - (w.energy ?? 1) * 0.05,
      tidiness: 0.35 - (w.tidiness ?? 1) * 0.05,
      wonder: 0.3 - (w.wonder ?? 1) * 0.05,
      curiosity: 0.3 - (w.curiosity ?? 1) * 0.05,
      social: 0.35 - (w.social ?? 1) * 0.05,
    };

    // 1. Calculate Urgencies using Non-Linear Curves
    const energyUrgency = this.evaluateUrgency(drives.energy, "exponential", 4);
    const tidinessUrgency = this.evaluateUrgency(drives.tidiness, "logistic", 10);
    const wonderUrgency = this.evaluateUrgency(drives.wonder, "logarithmic", 2);
    const curiosityUrgency = this.evaluateUrgency(drives.curiosity, "logistic", 6);
    const socialUrgency = this.evaluateUrgency(drives.social, "logistic", 6);

    // 2. Select most urgent below internal thresholds
    const options = [
      { id: "energy" as const, score: energyUrgency, threshold: thresholds.energy },
      { id: "tidiness" as const, score: tidinessUrgency, threshold: thresholds.tidiness },
      { id: "wonder" as const, score: wonderUrgency, threshold: thresholds.wonder },
      { id: "curiosity" as const, score: curiosityUrgency, threshold: thresholds.curiosity },
      { id: "social" as const, score: socialUrgency, threshold: thresholds.social },
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
        // Fix: Use only visible perceived entities (prevents "X-ray vision" through walls)
        const visibleItems = perceivedEntities.filter(
          (e) => e.type === "OBJECT" && e.isVisible && e.distance < 15
        );
        
        const floorItem = visibleItems.find(e => {
          const registryItem = registry.getById(e.id || "");
          return registryItem && registryItem.pickable && !registryItem.carriedBy && 
                 !registryItem.placedInArea && !registry.isItemClaimed(registryItem.id);
        });

        if (floorItem && floorItem.id) {
          const registryItem = registry.getById(floorItem.id)!;
          const area = registry.getEmptyAreaByGroup(registryItem.homeAreaId || "core-lab");
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

      case "social": {
        const nearestAgent = perceivedEntities
          .filter(
            (e) =>
              e.type === "AGENT" &&
              e.isVisible &&
              e.distance < 8 &&
              e.position,
          )
          .sort((a, b) => a.distance - b.distance)[0];
        if (nearestAgent?.position) {
          const p = nearestAgent.position;
          return [
            {
              type: "GO_TO",
              priority: 3,
              targetPos: new THREE.Vector3(p.x, p.y, p.z),
              scriptId: "local_social",
            } as AgentTask,
            {
              type: "EMOTE",
              priority: 3,
              gesture: "wave",
              duration: 2.5,
              scriptId: "local_social",
            } as AgentTask,
            {
              type: "WAIT",
              priority: 3,
              duration: 3 + Math.random() * 4,
              scriptId: "local_social",
            } as AgentTask,
          ];
        }
        break;
      }
    }

    return null;
  }
}
