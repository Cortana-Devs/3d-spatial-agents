import { getGeminiClient } from '@/lib/gemini';

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

export async function processAgentThought(context: AgentContext): Promise<string> {
    const client = getGeminiClient();

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

    try {
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
    } catch (error) {
        console.error("Gemini API Error details:", error);
        throw error; // Re-throw to be handled by caller
    }
}
