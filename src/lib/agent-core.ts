import { getGroqClient, rotateGroqKey } from "@/lib/groq";

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function processAgentThought(
  context: AgentContext,
  memoryContext: string = "",
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
      "action": "MOVE_TO" | "WAIT" | "WANDER" | "FOLLOW" | "INTERACT" | "DROP" | "PLACE_AT", 
      "targetId"?: "id_of_entity_to_follow_or_object", 
      "placeAreaId"?: "id_of_placing_area",
      "target"?: {x, y, z}, 
      "thought": "brief reasoning" 
    }
    
    ## Rules
    - **FOLLOW**: If you see a 'PLAYER' (< 20m), you MUST decide to 'FOLLOW' them to say hello.
    - **INTERACT**: If you see an 'OBJECT' nearby that is 'available', you may pick it up. Set targetId to the object's id. You can carry multiple items.
    - **DROP**: If you are carrying objects, you may DROP one at your current location. Set targetId to the object's id.
    - **PLACE_AT**: If you are carrying objects and see a 'SURFACE' nearby, you can place an item on it. Set targetId to the object id and placeAreaId to the surface id.
    - **WANDER**: If no specific entities of interest, explore.
    - **WAIT**: If idle or thinking.
  `;

  while (attempt < MAX_RETRIES) {
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
        model: "llama-3.3-70b-versatile",
        temperature: 1,
        max_completion_tokens: 8192,
        top_p: 1,
        stream: false,
        stop: null,
      });

      const content = completion.choices[0]?.message?.content;

      // Safety check for empty response
      if (!content) {
        throw new Error("Empty response from Groq");
      }

      return content;
    } catch (error: any) {
      console.error(
        `Groq API Error (Attempt ${attempt + 1}/${MAX_RETRIES}):`,
        error.message || error,
      );

      // Check for 429 or similar rate limit errors
      const isRateLimit =
        JSON.stringify(error).includes("429") ||
        JSON.stringify(error).includes("quota") ||
        JSON.stringify(error).includes("rate limit") ||
        error?.status === 429;

      if (isRateLimit) {
        console.warn("Rate limit hit. Rotating API key and retrying...");
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
