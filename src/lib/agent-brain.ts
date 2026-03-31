import { getGroqClient, rotateGroqKey } from "@/lib/groq";
import { logAgentInteraction } from "@/lib/logging/agent-logger";
import { AGENT_TOOLS } from "./agent-tools";
import { performWebSearch } from "./search";
import type {
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from "groq-sdk/resources/chat/completions";
import type { AgentContext, NearbyEntity, TraceOptions } from "@/types/agent";

export type { AgentContext, NearbyEntity, TraceOptions } from "@/types/agent";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Groq returns 400 + nested error.code tool_use_failed when the model emits invalid tool syntax (e.g. XML tags). */
function isGroqToolUseFailed(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  if (msg.includes("tool_use_failed")) return true;
  const raw = (error as { error?: { code?: string; error?: { code?: string } } })?.error;
  if (!raw || typeof raw !== "object") return false;
  if (raw.code === "tool_use_failed") return true;
  return raw.error?.code === "tool_use_failed";
}

const TOOL_FORMAT_SYSTEM =
  "Tool use: respond ONLY with the chat API's native function/tool_calls (JSON arguments per schema). " +
  "Never write XML, markdown code fences, or text like <function=name>...</function> for tools. " +
  "Each tool argument object must be valid JSON (e.g. say uses {\"message\":\"...\"}).";

export async function processAgentThought(
  context: AgentContext,
  memoryContext: string = "",
  trace?: TraceOptions,
): Promise<{ message: ChatCompletionMessage; usage?: any; model?: string }> {
  const MAX_RETRIES = 3;
  let attempt = 0;
  let userPromptSuffix = "";

  // Context Compression: Convert entities to Markdown Table (Truncated to top 5 closest for 8B token budget)
  const entityTable =
    context.nearbyEntities.length > 0
      ? `| Type | ID (use this) | DisplayName | Dist | Status |\n|---|---|---|---|---|\n` +
        context.nearbyEntities
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 5)
          .map(
            (e) =>
              `| ${e.type} | ${e.id} | ${e.name || e.objectType || "-"} | ${e.distance.toFixed(1)}m | ${e.status || "-"} |`,
          )
          .join("\n")
      : "No entities nearby.";

  const personalityBlock = context.personality
    ? `You are **${context.personality.name}**, ${context.personality.trait}. ${context.personality.bio} You are a high-value researcher at the Donut Research Lab. Speak in a ${context.personality.speechStyle} style.`
    : `You are an intelligent agent in the Donut Research Lab, a circular research facility with a garden at its center and specialized lab sectors around the ring.`;

  const prompt = `
You are ${context.personality?.name ?? "an agent"} — ${context.personality?.trait ?? "a researcher"} — at the Donut Research Lab.
${personalityBlock}

## Your Environment (The Donut Ring)
The Donut Lab is a recursive circular ring subdivided into 8 semantic sectors. You navigate primarily between these sectors.
**Available Point-of-Interest (POI) IDs for 'go_to' or 'contemplate':**
- 'center-park' (Zen Garden / Pond)
- 'fishing-dock' (Waterfall / Wooden Dock)
- 'core-lab' (Main Research Area)
- 'data-analysis' (Server Racks / High-Perf Compute)
- 'break-room' (Kitchen / Coffee / Lounge)
- 'conference-area' (Meeting Arena / Podium)
- 'interior-ring' (Main Circular Walkway)
- 'exterior-plaza' (Outer Deck / Observation)

## Agent Pods (Resting Chambers)
There are specialized **Agent Pods** (appearing as 'pod' in your perception) located along the outer walls of the lab. These are high-tech resting chambers where you can dock to fully recharge your systems and enter a low-power state. They are your primary home base.

## Your State
- **Position**: (${context.position.x.toFixed(1)}, ${context.position.y.toFixed(1)}, ${context.position.z.toFixed(1)})
- **Current Sector**: ${context.zoneContext ?? "Unknown transitional corridor"}
- **Behavior**: ${context.currentBehavior}
- **Your Assigned Pod**: ${context.assignedPodId ?? "No pod currently assigned"}

## Your Current State
${context.drives || "All drives balanced."}

Your physical needs (rest, tidying, exploring) are managed automatically.
Focus on social interaction, responding to what you observe, and personality-driven expression.

## Spatial Memory (Recent Visits)
${context.spatialMemory ?? "No recorded logs."}

${context.autonomousActivityContext
  ? `## Current Autonomous Activity\n${context.autonomousActivityContext}\n`
  : ""}
${context.conversationHistory
  ? `## Conversation History\n${context.conversationHistory}\n`
  : ""}
${context.peerAgentMessages
  ? `## Messages from other agents\n${context.peerAgentMessages}\n`
  : ""}
${context.worldTasksContext
  ? `## World tasks (shared lab backlog)\n${context.worldTasksContext}\n`
  : ""}

## Task Queue
${context.taskState ? `Phase: ${context.taskState.phase} | Script: ${context.taskState.currentScriptId ?? "none"} | Task: ${context.taskState.currentTask ?? "none"} | Queued: ${context.taskState.queuedTasksCount}` : "No active tasks."}

## Local Perception (World Entities)
${entityTable}

## Core Context & Memory
${memoryContext || "Clear environment."}

## Navigation Zones (use as zoneId in go_to)
| Zone ID | Location |
|---|---|
| center-park | Interior garden with pond and arowana fish |
| fishing-dock | Calm dock beside the koi pond |
| core-lab | North sector — chemistry and biology workbenches |
| data-analysis | East sector — desktop computers and analysis stations |
| break-room | South sector — sofas, TV, coffee machine |
| conference-area | West sector — conference table and manager's desk |
| interior-ring | The full curved research ring corridor |
| exterior-plaza | Outdoor plaza outside the building |

## Rules
- Use tools to act. 1–3 tool calls max per turn. Use only the API's structured tool_calls — never fake tool syntax in plain text.
- 'say' — general speech (TTS + bubble), 1–2 short sentences, no formatting. To reach other agents' minds use 'message_agent' (one id from perception) or 'announce' (everyone); those update their next-turn context. 'say' alone does not.
- 'present' → navigates to conference-area podium.
- 'sit' → use an ID from the Perception table.
- 'emote' gestures: wave, nod, shrug, cheer, think.
- Shared lab tasks: use **claim_task** with the exact Task ID from the World tasks table to take an unassigned (**open**) task; use **release_task** to give it back. If a task says to coordinate, use **message_agent** or **collaborate**.
- If tasks are running, use 'observe' unless a drive is critically LOW.
- CRITICAL: Copy entity IDs exactly from the Perception table above.
  `;

  while (attempt < MAX_RETRIES) {
    const startTime = Date.now();
    const model = "llama-3.1-8b-instant";

    try {
      const client = getGroqClient();

      const systemBase = context.personality
        ? `You are ${context.personality.name}, ${context.personality.trait} in the Donut Research Lab. You have drives, spatial memory, and personality. Use your tools to act naturally. Speak in a ${context.personality.speechStyle} style. 1–3 tool calls max per turn.`
        : "You are an intelligent agent in the Donut Research Lab. Use your tools to act based on your drives and environment. 1–3 tool calls max.";

      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `${systemBase} ${TOOL_FORMAT_SYSTEM}`,
        },
        {
          role: "user",
          content: prompt + userPromptSuffix,
        },
      ];

      let completion = await client.chat.completions.create({
        messages,
        model: model,
        temperature: 0.25,
        max_completion_tokens: 400,
        tools: AGENT_TOOLS,
        tool_choice: "auto",
        parallel_tool_calls: false,
        top_p: 1,
        stream: false,
      });

      let message = completion.choices[0]?.message;

      // --- Tool Execution Loop ---
      // If the model wants to search, we execute it and feed results back.
      if (message?.tool_calls) {
        let hasServerSideTools = false;
        const toolMessages: ChatCompletionToolMessageParam[] = [];

        for (const toolCall of message.tool_calls) {
            if (toolCall.function.name === "web_search") {
                hasServerSideTools = true;
                const args = JSON.parse(toolCall.function.arguments);
                const results = await performWebSearch(args.query);
                
                toolMessages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(results),
                });
            }
        }

        if (hasServerSideTools) {
            // Add the assistant message and tool response message to the thread
            messages.push(message as any);
            messages.push(...toolMessages);

            // Get a new completion that accounts for the search results
            completion = await client.chat.completions.create({
                messages,
                model: model,
                temperature: 0.25,
                max_completion_tokens: 400,
                tools: AGENT_TOOLS,
                tool_choice: "auto",
                parallel_tool_calls: false,
                top_p: 1,
                stream: false,
            });
            message = completion.choices[0]?.message;
        }
      }
      const endTime = Date.now();

      if (!message) {
        throw new Error("Empty response from Groq");
      }

      if (trace) {
        // Log the tool calls array directly, or fallback to content
        const responseLog = message.tool_calls 
            ? JSON.stringify(message.tool_calls) 
            : message.content || "Empty";

        await logAgentInteraction({
          timestamp: new Date().toISOString(),
          session_id: trace.sessionId,
          conversation_id: trace.conversationId,
          request_id: trace.requestId,
          agent_type: "3d-lab-agent",
          request_type: "chat_completion",
          request_content: prompt,
          response_content: responseLog,
          response_status: "success",
          processing_time_ms: endTime - startTime,
          input_tokens: completion.usage?.prompt_tokens,
          output_tokens: completion.usage?.completion_tokens,
          model_version: completion.model || model,
          user_id: trace.userId,
        });
      }

      return {
        message,
        usage: completion.usage,
        model: completion.model || model,
      };
    } catch (error: any) {
      const endTime = Date.now();
      console.error(
        `Groq API Error (Attempt ${attempt + 1}/${MAX_RETRIES}):`,
        error.message || error,
      );

      if (trace) {
        await logAgentInteraction({
          timestamp: new Date().toISOString(),
          session_id: trace.sessionId,
          conversation_id: trace.conversationId,
          request_id: trace.requestId,
          agent_type: "3d-lab-agent",
          request_type: "chat_completion",
          request_content: prompt,
          response_content: "",
          response_status: "error",
          processing_time_ms: endTime - startTime,
          error_code: error.code || error.status,
          error_message: error.message,
          model_version: model,
          user_id: trace.userId,
        });
      }

      if (error.message === "No Groq API keys available.") {
        throw error;
      }

      const isAuthOrRateError =
        JSON.stringify(error).includes("429") ||
        JSON.stringify(error).includes("401") ||
        JSON.stringify(error).includes("quota") ||
        JSON.stringify(error).includes("rate limit") ||
        JSON.stringify(error).includes("invalid_api_key") ||
        error?.status === 429 ||
        error?.status === 401;

      if (isAuthOrRateError) {
        console.warn(
          "Groq API Error (Auth/RateLimit). Rotating API key and retrying...",
        );
        rotateGroqKey();
        await sleep(1000);
      } else {
        if (isGroqToolUseFailed(error)) {
          userPromptSuffix =
            "\n\n[Required] The API rejected the last reply: invalid tool format. " +
            "Use ONLY native tool_calls with JSON arguments. " +
            "Do NOT output <function=...>, XML tags, or tool syntax inside message text.";
        }
        if (attempt === MAX_RETRIES - 1) throw error;
      }

      attempt++;
    }
  }

  throw new Error("Failed to generate thought after multiple attempts.");
}
