'use server';

import { NearbyEntity, AgentContext, processAgentThought } from '@/lib/agent-core';

export type { NearbyEntity, AgentContext };

export async function generateAgentThought(context: AgentContext, memoryContext: string) {
    try {
        const responseText = await processAgentThought(context, memoryContext);
        return responseText;
    } catch (error) {
        console.error("Gemini API Error:", error);
        // Fallback response inside the Server Action boundary
        return JSON.stringify({ action: "WAIT", thought: "My brain hurts (API Error)." });
    }
}

export async function summarizeMemories(memoryContent: string): Promise<string> {
    try {
        const { getGroqClient } = await import('@/lib/groq');
        const client = getGroqClient();

        const completion = await client.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are an agent's memory manager. Summarize the following events into a single, concise 'Insight' or 'Fact' that captures the key context. Ignore mundane details."
                },
                {
                    role: "user",
                    content: memoryContent
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
            max_completion_tokens: 200,
        });

        const summary = completion.choices[0]?.message?.content?.trim();
        return summary || "No insight generated.";

    } catch (error) {
        console.error("Summarization Error:", error);
        return "Failed to summarize memories.";
    }
}
