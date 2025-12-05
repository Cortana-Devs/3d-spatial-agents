'use server';

import { NearbyEntity, AgentContext, processAgentThought } from '@/lib/agent-core';

export type { NearbyEntity, AgentContext };

export async function generateAgentThought(context: AgentContext) {
    try {
        const responseText = await processAgentThought(context);
        return responseText;
    } catch (error) {
        console.error("Gemini API Error:", error);
        // Fallback response inside the Server Action boundary
        return JSON.stringify({ action: "WAIT", thought: "My brain hurts (API Error)." });
    }
}
