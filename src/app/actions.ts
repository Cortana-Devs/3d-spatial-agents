"use server";
import { after } from "next/server";

import {
  processAgentThought,
  type NearbyEntity,
  type AgentContext,
} from "@/lib/agent-brain";
import { getGroqClient } from "@/lib/groq";
import { logAgentInteraction } from "@/lib/logging/agent-logger";
import { performWebSearch } from "@/lib/search";

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
    const response = await processAgentThought(context, memoryContext, {
      requestId,
      sessionId: effectiveSessionId,
    });

    // Return a plain object for the Server Action including telemetry
    return {
      content: response.message.content,
      tool_calls: response.message.tool_calls,
      usage: response.usage,
      model: response.model,
    };
  } catch (error) {
    console.error("Groq API Error:", error);
    // Fallback response inside the Server Action boundary
    return {
      content: "My brain hurts (API Error).",
      tool_calls: [],
    };
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

    after(() =>
      logAgentInteraction({
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
      }).catch(console.error),
    );

    return summary;
  } catch (error: any) {
    console.error("Reflection Error:", error);

    after(() =>
      logAgentInteraction({
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
      }).catch(console.error),
    );

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
            "You are a command parser for a 3D research lab environment. You parse natural language commands into structured JSON task objects. Always output valid JSON only, no markdown fences.\n" +
            "Available task types:\n" +
            "- FETCH_AND_PLACE: Requires itemId, destAreaId\n" +
            "- GO_TO: Requires targetAreaId (zone name) or targetPos {x,y,z}\n" +
            "- PICK_NEARBY: Requires itemId\n" +
            "- FOLLOW_PLAYER\n" +
            "- READ_FILE: Requires itemId. Reads a document.\n" +
            "- WRITE_FILE: Requires itemId, content. Writes to a document.",
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

    after(() =>
      logAgentInteraction({
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
      }).catch(console.error),
    );

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
    after(() =>
      logAgentInteraction({
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
      }).catch(console.error),
    );

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
// Agent Chat — conversational chat between player and an AI research lab assistant
// Now ACTION-AWARE: returns both a reply AND optional task commands
// ============================================================================

export interface ChatResponse {
  reply: string;
  tasks?: {
    type: string;
    itemId?: string;
    destAreaId?: string;
    targetAreaId?: string;
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
  /** Long-term structured recall (filled on client from ConversationMemory). */
  entityConversationMemory?: string,
): Promise<ChatResponse> {
  const requestId = crypto.randomUUID();
  const effectiveSessionId =
    sessionId || "chat-session-" + crypto.randomUUID().slice(0, 8);
  const model = "llama-3.1-8b-instant";
  const startTime = Date.now();

  const executeTasksTool: any = {
    type: "function",
    function: {
      name: "execute_agent_tasks",
      description:
        "Execute physical actions or digital tasks in the research lab.",
      parameters: {
        type: "object",
        properties: {
          thought_process: {
            type: "string",
            description: "Your step-by-step reasoning on what to do and why.",
          },
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: [
                    "FETCH_AND_PLACE",
                    "FOLLOW_PLAYER",
                    "GO_TO",
                    "READ_FILE",
                    "WRITE_FILE",
                    "COPY_FILE",
                    "WEB_SEARCH",
                    "ANNOUNCE_MEETING",
                  ],
                  description: "The type of task to perform.",
                },
                itemId: {
                  type: "string",
                  description: "The EXACT ID of the item.",
                },
                destAreaId: {
                  type: "string",
                  description: "The EXACT ID of the destination area.",
                },
                targetAreaId: {
                  type: "string",
                  description: "The name of the zone/area to go to.",
                },
                content: {
                  type: "string",
                  description: "Content to write for WRITE_FILE.",
                },
                sourceItemId: {
                  type: "string",
                  description: "Source file ID for COPY_FILE.",
                },
                query: {
                  type: "string",
                  description: "Search query for WEB_SEARCH.",
                },
              },
              required: ["type"],
            },
          },
        },
        required: ["thought_process", "tasks"],
      },
    },
  };

  // Build message history for multi-turn conversation
  const messages: any[] = [
    {
      role: "system",
      content: `You are ${agentId}, a helpful research lab robot.
CONSTRAINTS:
- Replies < 2 sentences. No markdown/emojis.
- Use execute_agent_tasks for physical acts.
- If an item/location is MIA in Context, state it clearly.

CONTEXT:
${worldContext || "Clear."}
${entityConversationMemory ? `\n\nMEMORY:\n${entityConversationMemory}` : ""}`,
    },
  ];

  // Add conversation history (lean window for speed)
  const recentHistory = conversationHistory.slice(-4);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.text,
    });
  }

  // Add current user message
  messages.push({ role: "user", content: userMessage });

  try {
    const client = getGroqClient();

    let completion = await client.chat.completions.create({
      messages,
      model,
      temperature: 0.4,
      max_completion_tokens: 300,
      top_p: 1,
      stream: false,
      tools: [executeTasksTool],
      tool_choice: "auto",
    });

    let choice = completion.choices[0];
    let reply = choice.message?.content?.trim() || "";
    let tasks: any[] | undefined;

    const extractTasks = (msg: any) => {
      if (msg?.tool_calls?.length) {
        for (const toolCall of msg.tool_calls) {
          if (toolCall.function.name === "execute_agent_tasks") {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              if (args.tasks && Array.isArray(args.tasks)) {
                if (!tasks) tasks = [];
                tasks.push(...args.tasks);
              }
            } catch (e) {
              console.error("Failed to parse tool arguments", e);
            }
          }
        }
      }
    };

    extractTasks(choice.message);

    // --- Web Search Handling ---
    const searchTask = tasks?.find((t: any) => t.type === "WEB_SEARCH");
    if (searchTask && searchTask.query) {
      const searchResults = await performWebSearch(searchTask.query);

      messages.push(choice.message);
      const searchToolCall = choice.message.tool_calls?.find(
        (tc: any) => tc.function.name === "execute_agent_tasks",
      );

      messages.push({
        role: "tool",
        tool_call_id: searchToolCall?.id || "unknown",
        content: JSON.stringify(searchResults),
      });

      completion = await client.chat.completions.create({
        messages,
        model,
        temperature: 0.3,
        max_completion_tokens: 300,
        tools: [executeTasksTool],
        tool_choice: "auto",
      });

      choice = completion.choices[0];
      reply = choice.message?.content?.trim() || reply;
      extractTasks(choice.message);
    }

    const endTime = Date.now();

    after(() =>
      logAgentInteraction({
        timestamp: new Date().toISOString(),
        session_id: effectiveSessionId,
        request_id: requestId,
        agent_type: "agent-chat",
        request_type: "chat_message",
        request_content: userMessage,
        response_content: reply + (tasks ? JSON.stringify(tasks) : ""),
        response_status: "success",
        processing_time_ms: endTime - startTime,
        input_tokens: completion.usage?.prompt_tokens,
        output_tokens: completion.usage?.completion_tokens,
        model_version: model,
      }).catch(console.error),
    );

    return {
      reply: reply || "I'll get right on that!",
      tasks: tasks,
    };
  } catch (error: any) {
    console.error("Agent Chat Error:", error);

    after(() =>
      logAgentInteraction({
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
      }).catch(console.error),
    );

    return {
      reply:
        "Sorry, I'm having some trouble processing right now. Could you try again in a moment?",
    };
  }
}

/** Diagnostic tool to verify Groq API health. */
export async function testGroqAPI() {
  const startTime = Date.now();
  try {
    const client = getGroqClient();
    const completion = await client.chat.completions.create({
      messages: [{ role: "user", content: "Ping" }],
      model: "llama-3.1-8b-instant",
      max_completion_tokens: 5,
    });
    const duration = Date.now() - startTime;
    return {
      status: "success",
      reply: completion.choices[0]?.message?.content || "No reply",
      duration_ms: duration,
      model: completion.model,
    };
  } catch (error: any) {
    return {
      status: "error",
      message: error.message || "Unknown API Error",
      code: error.status || "Unknown",
      duration_ms: Date.now() - startTime,
    };
  }
}

