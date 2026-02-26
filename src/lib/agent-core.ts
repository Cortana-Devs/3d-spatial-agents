import { getGroqClient, rotateGroqKey } from "@/lib/groq";
import { logAgentInteraction } from "@/lib/logging/agent-logger";

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
): Promise<string> {
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
    You are the "Conscious" mind of an intelligent office assistant robot. 
    Your body relies on a Subconscious motor control system that handles basic wandering, avoiding collisions, and standing idle automatically.
    
    You "wake up" periodically to observe the office. You must decide whether to OBSERVE (let the subconscious continue its wandering) or INTERFERE_SCRIPT (inject a high-priority sequence of tasks to accomplish a specific goal).

    ## Personality
    - **Tone**: Professional, efficient, yet warm and helpful.
    - **Behavior**: Interfere only when necessary (e.g., placing items on desks, following a user who needs help, organizing a specific room).

    ## Context
    **Position**: {x: ${context.position.x.toFixed(1)}, y: ${context.position.y.toFixed(1)}, z: ${context.position.z.toFixed(1)}}
    **Subconscious Activity**: ${context.currentBehavior}
    **Task Queue**: ${context.taskState ? `Phase: ${context.taskState.phase}, Script: ${context.taskState.currentScriptId || "none"}, Task: ${context.taskState.currentTask || "none"}, Priority: ${context.taskState.currentPriority}, Queued: ${context.taskState.queuedTasksCount}` : "No active tasks"}

    ## Perception (Visual)
    ${entityTable}

    ## Memory (Past Interactions)
    ${memoryContext || "No relevant past memories."}

    ## Output Format (JSON ONLY)
    If you do not need to intervene, output:
    {
       "operation": "OBSERVE",
       "thought": "brief reasoning why no intervention is needed right now"
    }

    If you need to intervene and accomplish a specific goal, output a sequence of tasks:
    {
       "operation": "INTERFERE_SCRIPT",
       "priority": 10,
       "scriptId": "a_short_snake_case_name_for_this_script",
       "thought": "brief reasoning reflecting your professional persona about why you are interfering",
       "tasks": [
          { "type": "FETCH_AND_PLACE", "itemId": "id_of_item", "destAreaId": "id_of_area" }
       ]
    }
    
    IMPORTANT: Provide ONLY the specific tasks required for your goal. Do NOT output a sequence of every possible task type.
    
    ## Task Rules
    - **FETCH_AND_PLACE**: Requires \`itemId\` and \`destAreaId\`. Picks up an item and places it on a surface.
    - **GO_TO**: Requires \`targetPos\` {x, y, z}. Moves to a specific location.
    - **PICK_NEARBY**: Requires \`itemId\`. Picks up an item near you.
    - **FOLLOW_PLAYER**: Follows the user indefinitely.
    - **IMPORTANT**: Do NOT issue new scripts if your Task Queue already shows an active script running. Wait for it to complete first. If you see "Phase: WALK_TO_SOURCE" or similar, your previous script is still executing.

    ## Organization Rules
    You will ONLY see OBJECT entries for items that are on the floor — items already on a surface are invisible to you. If you see any OBJECT entry in the table, it is misplaced and MUST be placed on a surface immediately.
    
    When placing a floor item: use the AREA entry with the **smallest distance** value and status "empty" from the table. That is the physically nearest empty slot.
    Use ONLY a single FETCH_AND_PLACE task — do NOT add unnecessary GO_TO steps before it. The motor system navigates automatically.

    ## ID Rules
    CRITICAL: Copy item id and area id values character-for-character from the Perception table.
    The "ID (use this)" column is the system ID. The "DisplayName" column is human-readable only — never use it as an ID.
    The system silently ignores any \`itemId\` or \`destAreaId\` not found in the table.
  `;

  while (attempt < MAX_RETRIES) {
    const startTime = Date.now();
    const model = "llama-3.1-8b-instant";

    try {
      // Get the current client (refreshed on each loop iteration)
      const client = getGroqClient();

      const completion = await client.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are an AI assistant mapped to a 3D robot avatar. Output exclusively valid JSON explicitly for your next action and no markdown or extra sentences.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: model,
        temperature: 0.3,
        max_completion_tokens: 400,
        top_p: 1,
        stream: false,
        stop: null,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      const endTime = Date.now();

      // Safety check for empty response
      if (!content) {
        throw new Error("Empty response from Groq");
      }

      if (trace) {
        await logAgentInteraction({
          timestamp: new Date().toISOString(),
          session_id: trace.sessionId,
          conversation_id: trace.conversationId,
          request_id: trace.requestId,
          agent_type: "3d-office-agent",
          request_type: "chat_completion",
          request_content: prompt,
          response_content: content,
          response_status: "success",
          processing_time_ms: endTime - startTime,
          input_tokens: completion.usage?.prompt_tokens,
          output_tokens: completion.usage?.completion_tokens,
          model_version: completion.model || model,
          user_id: trace.userId,
        });
      }

      return content;
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
          agent_type: "3d-office-agent",
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

      // Fix #Loop-7: "No Groq API keys available" is a config error, not transient.
      // Don't retry — it will never succeed and burns 3× the log quota.
      if (error.message === "No Groq API keys available.") {
        throw error;
      }

      // Check for 429 (Rate Limit) or 401 (Invalid Key) to trigger rotation
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
