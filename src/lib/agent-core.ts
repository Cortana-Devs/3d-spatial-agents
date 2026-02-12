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
      ? `| Type | Name | Dist | Status |\n|---|---|---|---|\n` +
        context.nearbyEntities
          .map(
            (e) =>
              `| ${e.type} | ${e.name || e.objectType || e.id || "-"} | ${e.distance}m | ${e.status || "-"} |`,
          )
          .join("\n")
      : "No entities nearby.";

  const prompt = `
    You are an AI agent in a 3D world.
    
    ## Context
    **Position**: {x: ${context.position.x.toFixed(1)}, y: ${context.position.y.toFixed(1)}, z: ${context.position.z.toFixed(1)}}
    **Behavior**: ${context.currentBehavior}

    ## Perception (Visual)
    ${entityTable}

    ## Memory (Past Interactions)
    ${memoryContext || "No relevant past memories."}

    ## Task
    Decide your next action based on perception and memory.
    
    ## Output Format (JSON ONLY)
    { 
      "action": "MOVE_TO" | "WAIT" | "WANDER" | "FOLLOW" | "INTERACT" | "DROP", 
      "targetId"?: "id_of_entity_to_follow", 
      "target"?: {x, y, z}, 
      "thought": "brief reasoning" 
    }
    
    ## Rules
    - **FOLLOW**: If you see a 'PLAYER' (< 20m), you MUST decided to 'FOLLOW' them to say hello.
    - **INTERACT**: If you see an 'OBJECT' nearby that is 'available', you may choose to INTERACT with it (pick it up). Set targetId to the object's id.
    - **DROP**: If you are carrying an object, you may DROP it at your current location.
    - **WANDER**: If no specific entities of interest, explore.
    - **WAIT**: If idle or thinking.
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
            role: "user",
            content: prompt,
          },
        ],
        model: model,
        temperature: 1,
        max_completion_tokens: 8192,
        top_p: 1,
        stream: false,
        stop: null,
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
          agent_type: '3d-office-agent',
          request_type: 'chat_completion',
          request_content: prompt,
          response_content: content,
          response_status: 'success',
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
          agent_type: '3d-office-agent',
          request_type: 'chat_completion',
          request_content: prompt,
          response_content: '',
          response_status: 'error',
          processing_time_ms: endTime - startTime,
          error_code: error.code || error.status,
          error_message: error.message,
          model_version: model,
          user_id: trace.userId,
        });
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
        console.warn("Groq API Error (Auth/RateLimit). Rotating API key and retrying...");
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

