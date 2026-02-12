"use server";

import {
  processAgentThought,
  type NearbyEntity,
  type AgentContext,
} from "@/lib/agent-core";
import { getGroqClient } from "@/lib/groq";
import { logAgentInteraction } from "@/lib/logging/agent-logger";

export type { NearbyEntity, AgentContext };

export async function generateAgentThought(
  context: AgentContext,
  memoryContext: string,
  sessionId?: string,
) {
  const requestId = crypto.randomUUID();
  // Use provided sessionId or generate a temporary one if missing (though strictly sessionId should come from client state)
  const effectiveSessionId =
    sessionId || "unknown-session-" + crypto.randomUUID().slice(0, 8);
  try {
    const responseText = await processAgentThought(context, memoryContext, {
      requestId,
      sessionId: effectiveSessionId,
    });
    return responseText;
  } catch (error) {
    console.error("Groq API Error:", error);
    // Fallback response inside the Server Action boundary
    return JSON.stringify({
      action: "WAIT",
      thought: "My brain hurts (API Error).",
    });
  }
}

export async function generateReflection(
  textToSummarize: string,
  sessionId?: string,
) {
  const requestId = crypto.randomUUID();
  const effectiveSessionId =
    sessionId || "unknown-session-" + crypto.randomUUID().slice(0, 8);
  const model = "llama-3.1-8b-instant";
  const startTime = Date.now();
  try {
    const client = getGroqClient();
    const prompt =
      "You are an agent's memory manager. Summarize the following events into a single, concise 'Insight' or 'Fact' that captures the key context. Ignore mundane details.";

    const completion = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: textToSummarize,
        },
      ],
      model: model,
      temperature: 0.5,
      max_completion_tokens: 200,
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    const endTime = Date.now();

    await logAgentInteraction({
      timestamp: new Date().toISOString(),
      session_id: effectiveSessionId,
      request_id: requestId,
      agent_type: "memory-reflector",
      request_type: "reflection",
      request_content: `[SYSTEM] ${prompt}\n[USER] ${textToSummarize}`,
      response_content: summary || "",
      response_status: summary ? "success" : "error",
      processing_time_ms: endTime - startTime,
      input_tokens: completion.usage?.prompt_tokens,
      output_tokens: completion.usage?.completion_tokens,
      model_version: model,
    });

    return summary;
  } catch (error: any) {
    console.error("Reflection Error:", error);

    await logAgentInteraction({
      timestamp: new Date().toISOString(),
      session_id: effectiveSessionId,
      request_id: requestId,
      agent_type: "memory-reflector",
      request_type: "reflection",
      request_content: textToSummarize,
      response_content: "",
      response_status: "error",
      processing_time_ms: Date.now() - startTime,
      error_code: error.code || error.status,
      error_message: error.message,
      model_version: model,
    });

    return null;
  }
}
