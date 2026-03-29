import type { PerceptionRecord } from "@/lib/SensorySystem";
import type { AgentTaskQueue } from "@/systems/AgentTaskQueue";
import {
  DONUT_INNER_ESCAPE,
  DONUT_INNER_PUSH,
  DONUT_OUTER_MARGIN,
  MAX_SAFE_RADIUS,
  RING_INNER_RADIUS,
} from "@/constants/world";
import {
  LLM_COOLDOWN_FAR_SEC,
  LLM_COOLDOWN_MID_SEC,
  LLM_COOLDOWN_NEAR_SEC,
  PLAYER_MID_DIST,
  PLAYER_NEAR_DIST,
} from "@/constants/brain";

export function clampToDonutRing(pos: { x: number; y: number; z: number }) {
  const distSq = pos.x * pos.x + pos.z * pos.z;
  const dist = Math.sqrt(distSq);

  if (dist > MAX_SAFE_RADIUS) {
    const scale = (MAX_SAFE_RADIUS - DONUT_OUTER_MARGIN) / dist;
    return {
      x: pos.x * scale,
      y: pos.y,
      z: pos.z * scale,
    };
  }

  if (dist < RING_INNER_RADIUS + DONUT_INNER_PUSH) {
    const scale = (RING_INNER_RADIUS + DONUT_INNER_ESCAPE) / dist;
    return {
      x: pos.x * scale,
      y: pos.y,
      z: pos.z * scale,
    };
  }

  return pos;
}

export function getEffectiveCooldownSec(mem: PerceptionRecord[]): number {
  const playerRecord = mem.find((e) => e.type === "PLAYER" && e.isVisible);
  const playerDist = playerRecord?.distance;
  if (playerDist != null && playerDist < PLAYER_NEAR_DIST)
    return LLM_COOLDOWN_NEAR_SEC;
  if (playerDist != null && playerDist < PLAYER_MID_DIST)
    return LLM_COOLDOWN_MID_SEC;
  return LLM_COOLDOWN_FAR_SEC;
}

export function resolveCurrentBehavior(taskQueue: AgentTaskQueue): string {
  const task = taskQueue.getCurrentTask();
  if (!task) return "IDLE";
  const phase = taskQueue.getCurrentPhase();
  switch (task.type) {
    case "WANDER":
    case "EXPLORE":
      return "EXPLORING";
    case "GO_TO":
      return phase === "NAVIGATING" ? "TRAVELING" : "ARRIVED";
    case "SIT":
    case "REST":
      return phase === "SEATED" ? "RESTING" : "GOING_TO_REST";
    case "REST_IN_POD":
      return phase === "DOCKED" ? "DOCKED_IN_POD" : "RETURNING_TO_POD";
    case "CONTEMPLATE":
      return phase === "GAZING" ? "CONTEMPLATING" : "TRAVELING";
    case "PICK_NEARBY":
    case "PLACE_INVENTORY":
      return "WORKING";
    case "PRESENT":
      return phase === "PRESENTING" ? "PRESENTING" : "TRAVELING";
    case "COLLABORATE":
      return "COLLABORATING";
    case "SAY":
      return "SPEAKING";
    case "LOOK_AT":
      return "OBSERVING";
    default:
      return "IDLE";
  }
}
