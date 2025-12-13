import { getGeminiClient, rotateGeminiKey } from '@/lib/gemini';

export interface NearbyEntity {
    type: string; // e.g., 'PLAYER', 'AGENT', 'OBSTACLE'
    id?: string;
    distance: number;
    status?: string; // e.g., 'Moving', 'Idle'
}

export interface AgentContext {
    position: { x: number; y: number; z: number };
    nearbyEntities: NearbyEntity[];
    currentBehavior: string;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function processAgentThought(context: AgentContext): Promise<string> {
    const MAX_RETRIES = 3;
    let attempt = 0;

    // Context Compression: Convert entities to Markdown Table
    const entityTable = context.nearbyEntities.length > 0
        ? `| Type | ID | Dist | Status |\n|---|---|---|---|\n` +
        context.nearbyEntities.map(e => `| ${e.type} | ${e.id || '-'} | ${e.distance}m | ${e.status || '-'} |`).join('\n')
        : "No entities nearby.";

    const prompt = `
    You are an AI agent in a 3D world.
    
    ## Context
    **Position**: {x: ${context.position.x.toFixed(1)}, y: ${context.position.y.toFixed(1)}, z: ${context.position.z.toFixed(1)}}
    **Behavior**: ${context.currentBehavior}

    ## Perception (Visual)
    ${entityTable}

    ## Task
    Decide your next action based on the perception above.
    
    ## Output Format (JSON ONLY)
    { 
      "action": "MOVE_TO" | "WAIT" | "WANDER" | "FOLLOW", 
      "targetId"?: "id_of_entity_to_follow", 
      "target"?: {x, y, z}, 
      "thought": "brief reasoning" 
    }
    
    ## Rules
    - **FOLLOW**: If you see a 'PLAYER' (< 20m), you MUST decided to 'FOLLOW' them to say hello.
    - **WANDER**: If no specific entities of interest, explore.
    - **WAIT**: If idle or thinking.
  `;

    while (attempt < MAX_RETRIES) {
        try {
            // Get the current client (refreshed on each loop iteration)
            const client = getGeminiClient();

            const response = await client.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: prompt }]
                    }
                ]
            });

            // Safety check for empty response
            if (!response || !response.text) {
                throw new Error("Empty response from Gemini");
            }

            // SDK Compatibility: Handle .text as function (v0) or property (v1)
            const txt = (response as any).text;
            return typeof txt === 'function' ? txt.call(response) : String(txt);

        } catch (error: any) {
            console.error(`Gemini API Error (Attempt ${attempt + 1}/${MAX_RETRIES}):`, error.message || error);

            // Check for 429 or similar rate limit errors
            const isRateLimit =
                JSON.stringify(error).includes("429") ||
                JSON.stringify(error).includes("quota") ||
                JSON.stringify(error).includes("RESOURCE_EXHAUSTED");

            if (isRateLimit) {
                console.warn("Rate limit hit. Rotating API key and retrying...");
                rotateGeminiKey();
                // Wait a bit before retrying to prevent rapid-fire cycling if all keys are bad
                await sleep(1000);
            } else {
                // If it's not a rate limit, maybe we shouldn't retry? 
                // Or retry anyway for transient network issues?
                // Let's retry only on rate limits for now to be safe, or just throw.
                // Actually, for demo stability, let's retry once more for network blips.
                if (attempt === MAX_RETRIES - 1) throw error;
            }

            attempt++;
        }
    }

    throw new Error("Failed to generate thought after multiple attempts.");
}
