import type { AgentTask } from "@/types/agent";
import type { MovementPersonalityProfile } from "./MovementPersonality";
import * as THREE from "three";

export class DeliberationLayer {
  /**
   * Pre-intercepts LLM task arrays before queueing.
   * Converts abrupt sequences like [GO_TO, PICK_UP, SAY] into:
   * [LOOK_AT/WAIT (delay 0.5s), GO_TO, WAIT (0.3s), PICK_UP, SAY]
   */
  public static processTaskSequence(
    tasks: AgentTask[],
    personality: MovementPersonalityProfile,
    currentPos: THREE.Vector3
  ): AgentTask[] {
    const out: AgentTask[] = [];
    
    // Scale all deliberation waits by the personality trait
    const baseScalar = personality.deliberationSpeedScalar;
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];

      // 1. Initial Thought Pause (Pre-Action)
      if (i === 0) {
        if (task.type === "GO_TO") {
          // If the first real action is movement, prepend a look/wait towards the target
          if (task.targetPos) {
            out.push({
              type: "LOOK_AT",
              priority: task.priority,
              scriptId: task.scriptId,
              duration: 0.6 * baseScalar,
              lookTarget: task.targetPos.clone(),
              source: task.source
            });
          } else {
            out.push({
              type: "WAIT",
              priority: task.priority,
              scriptId: task.scriptId,
              duration: 0.4 * baseScalar,
              source: task.source
            });
          }
        } else if (!["WAIT", "LOOK_AT"].includes(task.type)) {
          // General thinking pause before speaking or interacting
          out.push({
            type: "WAIT",
            priority: task.priority,
            scriptId: task.scriptId,
            duration: 0.5 * baseScalar,
            source: task.source
          });
        }
      }

      // 2. Pre-Interaction Micro-pauses (Arrival hesitation)
      if (i > 0 && ["PICK_NEARBY", "INTERACT", "PLACE_INVENTORY"].includes(task.type)) {
        const prevTask = tasks[i - 1];
        if (prevTask.type === "GO_TO") {
          // Pause and align upon arriving before touching anything
          out.push({
            type: "WAIT",
            priority: task.priority,
            scriptId: task.scriptId,
            duration: 0.3 * baseScalar,
            source: task.source
          });
        }
      }

      // Add the original task
      out.push(task);
    }

    return out;
  }
}
