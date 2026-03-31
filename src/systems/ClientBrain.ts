import * as THREE from "three";
import { generateAgentThought } from "@/app/actions";
import type { AgentContext, NearbyEntity } from "@/lib/agent-brain";
import { ALL_ZONE_IDS, getNearestBench } from "@/config/donutLabRoutines";
import { SpatialMemory } from "@/lib/memory/SpatialMemory";

export interface BrainState {
  thought: string;
  isThinking: boolean;
  lastThoughtTime: number;
}

import { RateLimiter } from "@/lib/rateLimiter";
import type { AgentTask } from "@/systems/AgentTaskQueue";

export interface AgentDecision {
  operation: "OBSERVE" | "INTERFERE_SCRIPT";
  scriptId?: string;
  priority?: number;
  tasks?: AgentTask[];
  thought: string;
}

import { memoryStream } from "@/lib/memory/MemoryStream";
import { conversationMemory } from "@/lib/memory/ConversationMemory";
import { getIdleExplorer } from "@/systems/autonomy/IdleExplorer";
import { dispatchSimulationLog } from "@/lib/logging/SimulationLogger";
import { calculateSpatialLanguageFrequency } from "@/lib/nlp-parser";
import { useGameStore } from "@/store/gameStore";

export class ClientBrain {
  public state: BrainState;
  private rateLimiter: RateLimiter;
  public id: string;
  private sessionId: string;
  private _sessionInitialized = false;

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
    richContext?: Pick<AgentContext, "zoneContext" | "spatialMemory" | "personality" | "drives" | "assignedPodId">,
  ): Promise<AgentDecision | null> {
    // Rate Limiting Check
    if (this.state.isThinking || !this.rateLimiter.tryConsume()) {
      return null;
    }

    this.state.isThinking = true;

    if (!this._sessionInitialized) {
      this._sessionInitialized = true;
      memoryStream
        .add(
          this.id,
          "OBSERVATION",
          "New session started.",
          ["session", "reset"],
          this.sessionId,
        )
        .catch(() => {});
    }

    // Construct Context
    const context: AgentContext = {
      position: { x: position.x, y: position.y, z: position.z },
      nearbyEntities: nearbyEntities,
      currentBehavior: currentBehavior,
      taskState,
      ...richContext,
    };

    await conversationMemory.ensureLoaded();
    const playerNearby = nearbyEntities.find(
      (e) => e.type === "PLAYER" && e.id,
    );
    if (playerNearby?.id) {
      context.conversationHistory = conversationMemory.formatForPrompt(
        this.id,
        playerNearby.id,
      );
    }
    const explorer = getIdleExplorer(this.id);
    const autonomyParts = [
      explorer.describeCurrentActivity(),
      conversationMemory.formatRecentForPrompt(this.id, 3),
    ].filter(Boolean);
    if (autonomyParts.length > 0) {
      context.autonomousActivityContext = autonomyParts.join("\n\n");
    }

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

      // Fix D: Include zone-specific tags for location-aware memory retrieval
      if (richContext?.zoneContext) {
        const zoneMatch = richContext.zoneContext.match(/Zone: ([a-z0-9-]+)/i);
        if (zoneMatch) {
          contextTags.push(`zone:${zoneMatch[1]}`);
        }
      }

      const relevantMemories = await memoryStream.retrieve({
        agentId: this.id,
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

      const scenarioContext = useGameStore.getState().agentScenarioContext[this.id] || "";
      const memoryContextWithScenario = scenarioContext 
        ? `[SCENARIO CONTEXT]: ${scenarioContext}\n\n${memoryContextStr}` 
        : memoryContextStr;

      // --- 2. THINK (Server Side) with Critic Loop ---
      (this as any)._thinkStartTime = Date.now();
      let retryCount = 0;
      let criticFeedback = "";
      let response;

      while (retryCount < 2) {
        response = await generateAgentThought(
          context,
          criticFeedback 
            ? `[PHYSICAL CRITIC FEEDBACK]: ${criticFeedback}\n\n${memoryContextWithScenario}` 
            : memoryContextWithScenario,
          this.sessionId,
        );

        const hallucinatedIds: string[] = [];
        if (response.tool_calls) {
          for (const tc of response.tool_calls) {
            const args = JSON.parse(tc.function.arguments);
            const targetId = args.itemId || args.targetId || args.areaId;
            if (targetId && !["go_to", "say", "emote", "explore", "contemplate", "rest"].includes(tc.function.name)) {
              const exists = context.nearbyEntities.some(e => e.id === targetId) || 
                             ALL_ZONE_IDS.includes(targetId) || 
                             targetId.startsWith("pod-");
              if (!exists) hallucinatedIds.push(targetId);
            }
          }
        }

        if (hallucinatedIds.length > 0) {
          criticFeedback = `The following IDs are NOT in your current perception: ${hallucinatedIds.join(", ")}. Please only interact with existing entities or move to valid zones.`;
          retryCount++;
          // console.warn(`[ClientBrain] Critic Loop Triggered: ${criticFeedback}`);
        } else {
          break;
        }
      }

      if (!response) {
        throw new Error("No response after Critic Loop");
      }

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
              case "go_to": {
                const hasCoords =
                  args.targetX != null || args.targetZ != null;
                if (args.zoneId) {
                  const task: AgentTask = {
                    type: "GO_TO",
                    targetAreaId: args.zoneId,
                  } as AgentTask;
                  if (hasCoords) {
                    (task as any).targetPos = new THREE.Vector3(
                      args.targetX ?? 0,
                      0,
                      args.targetZ ?? 0,
                    );
                  }
                  tasks.push(task);
                } else if (
                  args.targetX !== undefined &&
                  args.targetZ !== undefined
                ) {
                  tasks.push({
                    type: "GO_TO",
                    targetPos: new THREE.Vector3(args.targetX, 0, args.targetZ),
                  } as AgentTask);
                }
                break;
              }
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

              // ── New experiential tools ──────────────────────────────────
              case "sit": {
                const targetId = args.targetId ?? undefined;
                let targetPos = undefined;
                
                // If no specific bench ID, find the nearest one from registry-known benches
                if (!targetId) {
                  const nearest = getNearestBench(position);
                  if (nearest) targetPos = nearest;
                }

                tasks.push({
                  type: "SIT",
                  itemId: targetId,
                  targetPos: targetPos,
                  duration: 12,
                } as AgentTask);
                break;
              }

              case "contemplate": {
                const zoneId = args.zoneId ?? "center-park";
                tasks.push({
                  type: "GO_TO",
                  targetAreaId: zoneId,
                } as any);
                tasks.push({
                  type: "CONTEMPLATE",
                  targetAreaId: zoneId,
                  duration: 8,
                } as any);
                break;
              }

              case "rest":
                tasks.push({ type: "GO_TO", targetAreaId: "break-room" } as any);
                tasks.push({ type: "REST", targetAreaId: "break-room", duration: 16 } as any);
                break;

              case "explore": {
                const history = SpatialMemory.getInstance(this.id);
                const targetAreaId = args.preferredZone 
                  ?? history.getLeastVisitedZone(ALL_ZONE_IDS);
                
                tasks.push({
                  type: "EXPLORE",
                  targetAreaId: targetAreaId,
                } as any);
                break;
              }

              case "collaborate":
                if (args.agentId) {
                  if (args.topic) {
                    tasks.push({ type: "SAY", content: `Hey, want to collaborate on ${args.topic}?` } as any);
                  }
                  tasks.push({
                    type: "COLLABORATE",
                    partnerId: args.agentId,
                    targetAreaId: "core-lab",
                  } as any);
                }
                break;

              case "emote":
                if (args.gesture) {
                  tasks.push({ type: "EMOTE", gesture: args.gesture, duration: 2.5 } as any);
                }
                break;

              case "present":
                if (args.topic) {
                  tasks.push({ type: "GO_TO", targetAreaId: "conference-area" } as any);
                  tasks.push({
                    type: "PRESENT",
                    targetAreaId: "conference-area",
                    content: args.speech ?? `I want to share something about ${args.topic}.`,
                    duration: 8,
                  } as any);
                }
                break;

              case "rest_in_pod": {
                tasks.push({
                  type: "REST_IN_POD",
                  podId: args.podId || undefined,
                  priority: 15,
                } as any);
                break;
              }
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

      const verificationResult = (retryCount === 0) && (tasks.length > 0);
      
      const metrics = {
        latency_ms: Date.now() - (this as any)._thinkStartTime,
        token_count: response.usage?.total_tokens || 0,
        fps: useGameStore.getState().currentFps || 60,
        spatial_language_freq: calculateSpatialLanguageFrequency(decision.thought)
      };

      dispatchSimulationLog({
        timestamp: new Date().toISOString(),
        agent_id: this.id,
        run_id: useGameStore.getState().runId,
        perception: JSON.stringify(context.nearbyEntities),
        response: {
          text: decision.thought,
          tool_calls: response?.tool_calls || [],
        },
        verification: verificationResult,
        execution: {
          action: operation,
          outcome: tasks.length > 0 ? "enqueued" : "observed"
        },
        metrics
      });

      // Update transient metrics for HUD
      useGameStore.getState().setAgentMetrics(this.id, {
        latency: metrics.latency_ms,
        spatialRatio: metrics.spatial_language_freq
      });

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
