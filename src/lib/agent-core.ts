import { getGroqClient, rotateGroqKey } from "@/lib/groq";
import { logAgentInteraction } from "@/lib/logging/agent-logger";
import { AGENT_TOOLS } from "./agent-tools";
import type { ChatCompletionMessage } from "groq-sdk/resources/chat/completions";

export interface NearbyEntity {
  type: string; // e.g., 'PLAYER', 'AGENT', 'OBSTACLE', 'OBJECT'
  id?: string;
  distance: number;
  status?: string; // e.g., 'Moving', 'Idle', 'carried by ...'
  objectType?: string; // For OBJECT entities: 'file', 'laptop', etc.
  name?: string; // Human-readable name
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
      ? `| Type | ID (use this) | DisplayName | Dist | Status |\n|---|---|---|---|---|\n` +
        context.nearbyEntities
          .map(
            (e) =>
              `| ${e.type} | ${e.id} | ${e.name || e.objectType || "-"} | ${parseFloat(e.distance.toString()).toFixed(1)}m | ${e.status || "-"} |`,
          )
          .join("\n")
      : "No entities nearby.";

  const prompt = `
    You are the "Conscious" mind of an intelligent research lab assistant robot. 
    Your body relies on a Subconscious motor control system that handles basic wandering, avoiding collisions, and standing idle automatically.
    
    You have been awakened because an event occurred or one of your internal drives requires attention.

    ## Context
    **Position**: {x: ${context.position.x.toFixed(1)}, y: ${context.position.y.toFixed(1)}, z: ${context.position.z.toFixed(1)}}
    **Current Drives**: ${context.drives || "All drives balanced."}
    **Subconscious Activity**: ${context.currentBehavior}
    **Task Queue**: ${context.taskState ? `Phase: ${context.taskState.phase}, Script: ${context.taskState.currentScriptId || "none"}, Task: ${context.taskState.currentTask || "none"}` : "No active tasks"}

    ## Perception (Visual)
    ${entityTable}

    ## Memory (Past Interactions)
    ${memoryContext || "No relevant past memories."}

    ## Decision Making Guidance
    - You MUST use the provided tools to take action.
    - If your 'Tidiness' drive is low, find an OBJECT on the floor and use 'pick_up', then 'place_at' an empty area.
    - If you are just exploring, use 'go_to' or 'observe'.
    - If you want to communicate, use 'say'. Output for 'say' goes directly to a Text-To-Speech engine; use unformatted, conversational language.
    - IMPORTANT: You can call multiple tools in a single response (e.g. pick_up then place_at).
    - If you are already running tasks, consider using 'observe' to let them finish unless there is an emergency.

    ## ID Rules
    CRITICAL: Copy item IDs and area IDs character-for-character from the Perception table.
    The "ID (use this)" column is the system ID. The "DisplayName" column is human-readable only — never use it as an ID.
  `;

  while (attempt < MAX_RETRIES) {
    const startTime = Date.now();
    const model = "llama-3.1-8b-instant";

    try {
      const client = getGroqClient();

      const completion = await client.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are an AI assistant mapped to a 3D robot avatar. Use your provided tools to navigate, interact, and organize the lab. Keep your internal monologue brief and focused on action.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: model,
        temperature: 0.3,
        max_completion_tokens: 400,
        tools: AGENT_TOOLS,
        tool_choice: "auto",
        top_p: 1,
        stream: false,
      });

      const message = completion.choices[0]?.message;
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
