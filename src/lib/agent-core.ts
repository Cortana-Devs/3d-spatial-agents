import { getGroqClient, rotateGroqKey } from "@/lib/groq";
import { logAgentInteraction } from "@/lib/logging/agent-logger";
import { AGENT_TOOLS } from "./agent-tools";
import { performWebSearch } from "./search";
import type { ChatCompletionMessage, ChatCompletionMessageParam, ChatCompletionToolMessageParam } from "groq-sdk/resources/chat/completions";

export interface NearbyEntity {
  type: string; // e.g., 'PLAYER', 'AGENT', 'OBSTACLE', 'OBJECT'
  id?: string;
  distance: number;
  status?: string; // e.g., 'Moving', 'Idle', 'carried by ...'
  objectType?: string; // For OBJECT entities: 'file', 'laptop', etc.
  name?: string; // Human-readable name
  position?: { x: number; y: number; z: number };
}

export interface AgentContext {
  position: { x: number; y: number; z: number };
  nearbyEntities: NearbyEntity[];
  currentBehavior: string;
  /** Current task queue state — undefined if no queue is available */
  taskState?: {
    currentScriptId: string | null;
    currentTask: string | null;
    currentPriority: number;
    queuedTasksCount: number;
    phase: string;
  };
  /** Internal drives/needs */
  drives?: string;
  /** Zone mood context injected from ZoneInfluenceSystem */
  zoneContext?: string;
  /** Spatial memory summary from SpatialMemory */
  spatialMemory?: string;
  /** Agent personality name and trait */
  personality?: { name: string; trait: string; speechStyle: string; bio: string };
}

export interface TraceOptions {
  sessionId: string;
  requestId: string;
  conversationId?: string;
  userId?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function processAgentThought(
  context: AgentContext,
  memoryContext: string = "",
  trace?: TraceOptions,
): Promise<ChatCompletionMessage> {
  const MAX_RETRIES = 3;
  let attempt = 0;

  // Context Compression: Convert entities to Markdown Table
  const entityTable =
    context.nearbyEntities.length > 0
      ? `| Type | ID (use this) | DisplayName | Dist | AbsolutePos | Status |\n|---|---|---|---|---|---|\n` +
        context.nearbyEntities
          .map(
            (e) =>
              `| ${e.type} | ${e.id} | ${e.name || e.objectType || "-"} | ${parseFloat(e.distance.toString()).toFixed(1)}m | ${e.position ? `(${e.position.x.toFixed(1)}, ${e.position.y.toFixed(1)}, ${e.position.z.toFixed(1)})` : "-"} | ${e.status || "-"} |`,
          )
          .join("\n")
      : "No entities nearby.";

  const personalityBlock = context.personality
    ? `You are **${context.personality.name}**, ${context.personality.trait}. ${context.personality.bio} Speak in a ${context.personality.speechStyle} style.`
    : `You are an intelligent agent living in The Ring, a circular science park filled with discovery and possibility.`;

  const prompt = `
    You are a living agent in The Ring — a Guangming Science Park-inspired circular world with five distinct zones.
    ${personalityBlock}
    
    You have an inner life: drives that ebb and flow, spatial memories of where you have been, and preferences for certain places. You are not a task machine — you are a being in a world. When you are tired, rest. When something is beautiful, pause and appreciate it. When another agent is nearby, consider whether to engage or give them space.

    Your body has a Subconscious motor system that handles wandering, collision avoidance, and idle posture automatically. You are awakened when a drive is low or something needs your attention.

    ## Who You Are
    ${context.personality?.bio ?? "A curious agent exploring The Ring."}

    ## Where You Are
    **Position**: (${context.position.x.toFixed(1)}, ${context.position.y.toFixed(1)}, ${context.position.z.toFixed(1)})
    **Zone**: ${context.zoneContext ?? "Between zones — the ring walkway stretches around you."}
    
    ## Your Drives (internal needs — act on LOW ones)
    ${context.drives || "All drives are balanced."}
    
    ## Your Spatial Memory
    ${context.spatialMemory ?? "You have not explored much yet."}

    ## Subconscious Activity
    ${context.currentBehavior}
    
    ## Task Queue
    ${context.taskState ? `Phase: ${context.taskState.phase}, Script: ${context.taskState.currentScriptId || "none"}, Task: ${context.taskState.currentTask || "none"}, Queued: ${context.taskState.queuedTasksCount}` : "No active tasks."}

    ## Nearby Entities
    ${entityTable}

    ## Memory
    ${memoryContext || "No relevant past memories."}

    ## Decision Guidance
    - Use tools to act. You can call multiple tools in one response.
    - **Energy LOW** → use 'rest' (navigates to garden bench, restores energy)
    - **Wonder LOW** → use 'contemplate' (go to observatory/garden, appreciate a view)
    - **Curiosity LOW** → use 'explore' (visit the zone you have been to least recently)
    - **Social LOW** → use 'collaborate' or 'say' to connect with another agent
    - **Tidiness LOW** → 'pick_up' an item, then 'place_at' an empty area
    - If tasks are running, use 'observe' to let them finish unless urgency is high.
    - 'say' output goes to TTS — keep it conversational, unformatted, 1–2 sentences.
    - To sit: use 'sit' with a bench ID from the Perception table.
    - To deliver a speech: use 'present' — this navigates to the Arena podium.
    - Express yourself: use 'emote' with gesture: wave, nod, shrug, cheer, or think.

    ## Zone Navigation (use in 'go_to' as zoneId)
    observatory | workshop | garden | arena | gallery

    ## ID Rules
    CRITICAL: Copy IDs exactly from the Perception table. "ID (use this)" = system ID. "DisplayName" = human-readable only.
  `;

  while (attempt < MAX_RETRIES) {
    const startTime = Date.now();
    const model = "llama-3.1-8b-instant";

    try {
      const client = getGroqClient();

      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: context.personality
            ? `You are ${context.personality.name}, ${context.personality.trait} living in The Ring science park. You have drives, spatial memory, and personality. Use your tools to act naturally based on your inner state. Speak in a ${context.personality.speechStyle} style. Keep responses focused — 1–3 tool calls max per turn.`
            : "You are an intelligent agent in The Ring science park. Use your tools to act based on your drives and environment. Keep responses focused — 1–3 tool calls max.",
        },
        {
          role: "user",
          content: prompt,
        },
      ];

      let completion = await client.chat.completions.create({
        messages,
        model: model,
        temperature: 0.3,
        max_completion_tokens: 400,
        tools: AGENT_TOOLS,
        tool_choice: "auto",
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
                temperature: 0.3,
                max_completion_tokens: 400,
                tools: AGENT_TOOLS,
                tool_choice: "auto",
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

      return message;
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
        if (attempt === MAX_RETRIES - 1) throw error;
      }

      attempt++;
    }
  }

  throw new Error("Failed to generate thought after multiple attempts.");
}
