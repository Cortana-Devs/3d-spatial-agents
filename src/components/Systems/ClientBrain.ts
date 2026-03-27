import * as THREE from "three";
import { generateAgentThought } from "@/app/actions";
import type { AgentContext, NearbyEntity } from "@/lib/agent-core";

export interface BrainState {
  thought: string;
  isThinking: boolean;
  lastThoughtTime: number;
}

import { RateLimiter } from "@/lib/rateLimiter";
import type { AgentTask } from "@/components/Systems/AgentTaskQueue";

export interface AgentDecision {
  operation: "OBSERVE" | "INTERFERE_SCRIPT";
  scriptId?: string;
  priority?: number;
  tasks?: AgentTask[];
  thought: string;
}

import { memoryStream } from "@/lib/memory/MemoryStream";

// ... (BrainState and RateLimiter imports remain)

// Module-level flag: ensures memoryStream.reset() is called exactly once
// across all ClientBrain instances (multiple agents share the singleton).
let _memoryResetDone = false;

export class ClientBrain {
  public state: BrainState;
  private rateLimiter: RateLimiter;
  public id: string;
  private sessionId: string;

  constructor(id: string = "agent-01") {
    this.id = id;
    this.sessionId = `session-${crypto.randomUUID()}`;
    this.state = {
      thought: "Initializing neural pathways...",
      isThinking: false,
      lastThoughtTime: 0,
    };
    // 5 requests per 60 seconds (Conservative limit for Free Tier with 2 agents)
    this.rateLimiter = new RateLimiter(5, 60);
  }

  public async update(
    position: THREE.Vector3,
    nearbyEntities: NearbyEntity[],
    currentBehavior: string,
    taskState?: AgentContext["taskState"],
  ): Promise<AgentDecision | null> {
    // Rate Limiting Check
    if (this.state.isThinking || !this.rateLimiter.tryConsume()) {
      return null;
    }

    this.state.isThinking = true;

    if (!_memoryResetDone) {
      await memoryStream.reset();
      _memoryResetDone = true;
    }

    // Construct Context
    const context: AgentContext = {
      position: { x: position.x, y: position.y, z: position.z },
      nearbyEntities: nearbyEntities,
      currentBehavior: currentBehavior,
      taskState,
    };

    try {
      /*
      console.log(
        `[ClientBrain:${this.id}] Thinking... (Tokens left: ${this.rateLimiter.getTokensRemaining()})`,
      );
      */

      // --- 1. RETRIEVE MEMORIES (Client Side) ---
      const contextTags = nearbyEntities.flatMap((e) => {
        const tags = [`entity:${e.type.toLowerCase()}`];
        if (e.id) tags.push(`id:${e.id}`);
        return tags;
      });

      // Fix C: Include script-related tags so SCRIPT_OUTCOME memories surface
      if (taskState?.currentScriptId) {
        contextTags.push(`script:${taskState.currentScriptId}`);
      }

      const relevantMemories = await memoryStream.retrieve({
        agentId: this.id, // Added agent filter
        tags: contextTags,
        limit: 5,
      });

      const memoryContextStr =
        relevantMemories.length > 0
          ? relevantMemories
              .map(
                (m) =>
                  `- [${new Date(m.timestamp).toLocaleTimeString()}] ${m.content}`,
              )
              .join("\n")
          : "No relevant past memories.";

      // --- 2. THINK (Server Side) ---
      const response = await generateAgentThought(
        context,
        memoryContextStr,
        this.sessionId,
      );

      const tasks: AgentTask[] = [];
      let thought = response.content || "Processing...";
      let operation: "OBSERVE" | "INTERFERE_SCRIPT" = "OBSERVE";

      if (response.tool_calls && response.tool_calls.length > 0) {
        operation = "INTERFERE_SCRIPT";
        
        // If there's no thought content, synthesize one from the first tool call
        if (!thought || thought === "Processing...") {
          thought = `I am going to use ${response.tool_calls[0].function.name}.`;
        }

        // Parse tool calls into our AgentTasks
        for (const tc of response.tool_calls) {
          if (tc.type !== "function") continue;
          
          try {
            const args = JSON.parse(tc.function.arguments);
            const name = tc.function.name;

            switch (name) {
              case "pick_up":
                if (args.itemId) {
                  tasks.push({ type: "PICK_NEARBY", itemId: args.itemId } as AgentTask);
                }
                break;
              case "place_at":
                if (args.areaId) {
                  tasks.push({ type: "PLACE_INVENTORY", destAreaId: args.areaId } as AgentTask);
                }
                break;
              case "go_to":
                if (args.zoneId) {
                   tasks.push({ type: "GO_TO", targetPos: new THREE.Vector3(args.targetX || 0, 0, args.targetZ || 0), targetAreaId: args.zoneId } as any);
                } else if (args.targetX !== undefined && args.targetZ !== undefined) {
                   tasks.push({ type: "GO_TO", targetPos: new THREE.Vector3(args.targetX, 0, args.targetZ) } as AgentTask);
                }
                break;
              case "say":
                tasks.push({ type: "SAY" as any, content: args.message } as any);
                thought = args.message; // Override internal thought with spoken word
                break;
              case "interact":
                if (args.itemId) {
                  tasks.push({ type: "INTERACT", itemId: args.itemId } as AgentTask);
                }
                break;
              case "observe":
                // explicitly do nothing
                break;
            }
          } catch (e) {
            console.error(`[ClientBrain:${this.id}] Failed parsing tool call:`, e);
          }
        }
      }

      const decision: AgentDecision = {
        operation,
        thought,
        tasks: tasks.length > 0 ? tasks : undefined,
        scriptId: `tool_action_${Date.now()}`,
        priority: 10,
      };

      this.state.thought = decision.thought;
      this.state.lastThoughtTime = Date.now();
      this.state.isThinking = false;

      // console.log(`[ClientBrain:${this.id}] Decided:`, decision);

      // --- 3. MEMORIZE (Client Side) ---
      if (decision.thought) {
        // Store the thought/action
        memoryStream
          .add(this.id, "ACTION", decision.thought, contextTags, this.sessionId)
          .catch((err) =>
            console.error(`[ClientBrain:${this.id}] Memory add failed:`, err),
          );
      }

      return decision;
    } catch (e) {
      console.error(`[ClientBrain:${this.id}] Failed to think:`, e);
      this.state.isThinking = false;
      return null;
    }
  }
}
