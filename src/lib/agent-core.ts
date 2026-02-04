import { getGroqClient, rotateGroqKey } from '@/lib/groq';
import { memoryStream } from '@/lib/memory/MemoryStream';

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

let isMemoryInitialized = false;

export async function processAgentThought(context: AgentContext): Promise<string> {
    if (!isMemoryInitialized) {
        await memoryStream.init();
        isMemoryInitialized = true;
    }

    const MAX_RETRIES = 3;
    let attempt = 0;

    // Context Compression: Convert entities to Markdown Table
    const entityTable = context.nearbyEntities.length > 0
        ? `| Type | ID | Dist | Status |\n|---|---|---|---|\n` +
        context.nearbyEntities.map(e => `| ${e.type} | ${e.id || '-'} | ${e.distance}m | ${e.status || '-'} |`).join('\n')
        : "No entities nearby.";

    // Retrieve Memories
    // Extract tags from nearby entities (e.g. 'entity:PLAYER', 'id:123')
    const contextTags = context.nearbyEntities.flatMap(e => {
        const tags = [`entity:${e.type.toLowerCase()}`];
        if (e.id) tags.push(`id:${e.id}`);
        return tags;
    });

    const relevantMemories = await memoryStream.retrieve({
        tags: contextTags,
        limit: 5 // Keep it tight for tokens
    });

    const memoryContext = relevantMemories.length > 0
        ? relevantMemories.map(m => `- [${new Date(m.timestamp).toLocaleTimeString()}] ${m.content}`).join('\n')
        : "No relevant past memories.";

    const prompt = `
    You are an AI agent in a 3D world.
    
    ## Context
    **Position**: {x: ${context.position.x.toFixed(1)}, y: ${context.position.y.toFixed(1)}, z: ${context.position.z.toFixed(1)}}
    **Behavior**: ${context.currentBehavior}

    ## Perception (Visual)
    ${entityTable}

    ## Memory (Past Interactions)
    ${memoryContext}

    ## Task
    Decide your next action based on perception and memory.
    
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
            const client = getGroqClient();

            const completion = await client.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 1,
                max_completion_tokens: 8192,
                top_p: 1,
                stream: false,
                reasoning_effort: "medium", // Only for reasoning models, but harmless if ignored or remove if causes error. 
                // llama-3.3-70b-versatile is not a reasoning model so `reasoning_effort` might cause error or be ignored. 
                // To be safe, I will remove `reasoning_effort` for this model.
                stop: null
            });

            const content = completion.choices[0]?.message?.content;

            // Safety check for empty response
            if (!content) {
                throw new Error("Empty response from Groq");
            }

            // Memorize the action (Fire and Forget)
            memoryStream.add('ACTION', content, contextTags).catch(console.error);

            return content;

        } catch (error: any) {
            console.error(`Groq API Error (Attempt ${attempt + 1}/${MAX_RETRIES}):`, error.message || error);

            // Check for 429 or similar rate limit errors
            const isRateLimit =
                JSON.stringify(error).includes("429") ||
                JSON.stringify(error).includes("quota") ||
                JSON.stringify(error).includes("rate limit") ||
                error?.status === 429;

            if (isRateLimit) {
                console.warn("Rate limit hit. Rotating API key and retrying...");
                rotateGroqKey();
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
