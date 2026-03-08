"use server";

import {
  processAgentThought,
  type NearbyEntity,
  type AgentContext,
} from "@/lib/agent-core";
import { getGroqClient } from "@/lib/groq";
import { logAgentInteraction } from "@/lib/logging/agent-logger";

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

// ============================================================================
// NLP Command Parser — parses natural language into structured tasks
// ============================================================================

export async function parseNaturalCommand(
  command: string,
  worldContext: string,
  sessionId?: string,
): Promise<{ rawResponse: string; serverLatency: number }> {
  const requestId = crypto.randomUUID();
  const effectiveSessionId =
    sessionId || "unknown-session-" + crypto.randomUUID().slice(0, 8);
  const model = "llama-3.1-8b-instant";
  const startTime = Date.now();

  try {
    const client = getGroqClient();

    const completion = await client.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are a command parser for a 3D office environment. You parse natural language commands into structured JSON task objects. Always output valid JSON only, no markdown fences.",
        },
        {
          role: "user",
          content: worldContext,
        },
      ],
      model,
      temperature: 0.2,
      max_completion_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content?.trim();
    const endTime = Date.now();
    const serverLatency = endTime - startTime;

    await logAgentInteraction({
      timestamp: new Date().toISOString(),
      session_id: effectiveSessionId,
      request_id: requestId,
      agent_type: "nlp-parser",
      request_type: "command_parse",
      request_content: command,
      response_content: content || "",
      response_status: content ? "success" : "error",
      processing_time_ms: serverLatency,
      input_tokens: completion.usage?.prompt_tokens,
      output_tokens: completion.usage?.completion_tokens,
      model_version: model,
    });

    if (!content) {
      return {
        rawResponse: JSON.stringify({
          agentId: null,
          tasks: [],
          explanation: "",
          error: "Empty response from LLM.",
        }),
        serverLatency,
      };
    }

    return { rawResponse: content, serverLatency };
  } catch (error: any) {
    console.error("NLP Parse Error:", error);

    const errorLatency = Date.now() - startTime;
    await logAgentInteraction({
      timestamp: new Date().toISOString(),
      session_id: effectiveSessionId,
      request_id: requestId,
      agent_type: "nlp-parser",
      request_type: "command_parse",
      request_content: command,
      response_content: "",
      response_status: "error",
      processing_time_ms: errorLatency,
      error_code: error.code || error.status,
      error_message: error.message,
      model_version: model,
    });

    return {
      rawResponse: JSON.stringify({
        agentId: null,
        tasks: [],
        explanation: "",
        error: `LLM API Error: ${error.message}`,
      }),
      serverLatency: errorLatency,
    };
  }
}

// ============================================================================
// Agent Chat — conversational chat between player and an AI office assistant
// Now ACTION-AWARE: returns both a reply AND optional task commands
// ============================================================================

export interface ChatResponse {
  reply: string;
  tasks?: {
    type: string;
    itemId?: string;
    destAreaId?: string;
    targetX?: number;
    targetZ?: number;
  }[];
}

export async function chatWithAgent(
  agentId: string,
  userMessage: string,
  conversationHistory: { role: "user" | "agent"; text: string }[],
  worldContext?: string,
  sessionId?: string,
): Promise<ChatResponse> {
  const requestId = crypto.randomUUID();
  const effectiveSessionId =
    sessionId || "chat-session-" + crypto.randomUUID().slice(0, 8);
  const model = "llama-3.1-8b-instant";
  const startTime = Date.now();

  const worldSection = worldContext
    ? `\n## Current World State (use EXACT IDs from here)\n${worldContext}`
    : "";

  // Build message history for multi-turn conversation
  const messages: { role: "system" | "user" | "assistant"; content: string }[] =
    [
      {
        role: "system",
        content: `You are ${agentId}, an intelligent office assistant robot in a 3D virtual office. You are having a face-to-face conversation with a user.

## Personality
- Professional yet warm, like a helpful coworker
- Concise — keep replies to 1-3 short sentences
- Proactive — offer specific suggestions when the user seems unsure

## Output Format (JSON ONLY)
You MUST respond with valid JSON in this exact format:

If the user is just chatting (no action needed):
{"reply": "your conversational response here"}

If the user asks you to DO something (move item, go somewhere, follow, tidy up):
{"reply": "brief acknowledgment of what you're about to do", "tasks": [{"type": "FETCH_AND_PLACE", "itemId": "exact-item-id", "destAreaId": "exact-area-id"}]}

## Available Task Types
- FETCH_AND_PLACE: Pick up an item and place it. Requires "itemId" and "destAreaId". Use EXACT IDs from the World State.
- FOLLOW_PLAYER: Follow the user. No extra fields needed.
- GO_TO: Move to a location. Requires "targetX" and "targetZ" (coordinates).

## CRITICAL RULES
- Use ONLY item IDs and area IDs that appear in the World State below
- For items: only use items marked (A) = available. Never pick (C) carried or (X) claimed items.
- For areas: only use areas marked (E) = empty. Never place in (O) occupied areas.
- If the user asks to "clean up", "organize", or fix misplaced items, find items with Location "OnFloor" and place them in an empty slot on their "HomeArea" (or a logical empty desk if home is full).
- If the user asks to do something but you can't find the right IDs, say so honestly in the reply and do NOT include tasks.
- ALWAYS output valid JSON. No markdown, no extra text outside the JSON.
${worldSection}`,
      },
    ];

  // Add conversation history (limit to last 6 messages to stay under token limits)
  const recentHistory = conversationHistory.slice(-6);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content:
        msg.role === "agent" ? JSON.stringify({ reply: msg.text }) : msg.text,
    });
  }

  // Add current user message
  messages.push({ role: "user", content: userMessage });

  try {
    const client = getGroqClient();

    const completion = await client.chat.completions.create({
      messages,
      model,
      temperature: 0.4,
      max_completion_tokens: 300,
      top_p: 1,
      stream: false,
      response_format: { type: "json_object" },
    });

    const rawContent =
      completion.choices[0]?.message?.content?.trim() || '{"reply": "..."}';
    const endTime = Date.now();

    await logAgentInteraction({
      timestamp: new Date().toISOString(),
      session_id: effectiveSessionId,
      request_id: requestId,
      agent_type: "agent-chat",
      request_type: "chat_message",
      request_content: userMessage,
      response_content: rawContent,
      response_status: "success",
      processing_time_ms: endTime - startTime,
      input_tokens: completion.usage?.prompt_tokens,
      output_tokens: completion.usage?.completion_tokens,
      model_version: model,
    });

    // Parse JSON response
    try {
      const parsed = JSON.parse(
        rawContent
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim(),
      );
      return {
        reply:
          parsed.reply ||
          parsed.response ||
          parsed.message ||
          "I'll get right on that!",
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : undefined,
      };
    } catch {
      // Fallback: treat raw content as plain text reply
      return { reply: rawContent.substring(0, 200) };
    }
  } catch (error: any) {
    console.error("Agent Chat Error:", error);

    await logAgentInteraction({
      timestamp: new Date().toISOString(),
      session_id: effectiveSessionId,
      request_id: requestId,
      agent_type: "agent-chat",
      request_type: "chat_message",
      request_content: userMessage,
      response_content: "",
      response_status: "error",
      processing_time_ms: Date.now() - startTime,
      error_code: error.code || error.status,
      error_message: error.message,
      model_version: model,
    });

    return {
      reply:
        "Sorry, I'm having some trouble processing right now. Could you try again in a moment?",
    };
  }
}
