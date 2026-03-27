/**
 * Agent Tool Definitions for Groq Function-Calling API.
 *
 * These define the actions an agent's "conscious mind" (LLM) can invoke.
 * The subconscious (YUKA + TaskQueue) handles execution.
 */

import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions";

// ============================================================================
// Tool Definitions (OpenAI-compatible format used by Groq)
// ============================================================================

export const AGENT_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "pick_up",
      description:
        "Walk to a nearby item on the floor and pick it up. Only use for items marked (A) available and on the floor. Do NOT pick up items already placed on surfaces.",
      parameters: {
        type: "object",
        properties: {
          itemId: {
            type: "string",
            description: "The exact ID of the item to pick up (from the ITEMS table)",
          },
        },
        required: ["itemId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "place_at",
      description:
        "Place the item you are currently holding onto an empty surface slot. Only use slots marked (E) empty. Prefer the item's home area if available.",
      parameters: {
        type: "object",
        properties: {
          areaId: {
            type: "string",
            description: "The exact ID of the placing area slot (from the AREAS table)",
          },
        },
        required: ["areaId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "go_to",
      description:
        "Walk to a specific position in the lab. Use zone names when available (e.g. 'storage-room', 'meeting-room').",
      parameters: {
        type: "object",
        properties: {
          targetX: {
            type: "number",
            description: "X coordinate in world space",
          },
          targetZ: {
            type: "number",
            description: "Z coordinate in world space",
          },
          zoneId: {
            type: "string",
            description: "Optional semantic zone name (e.g. 'storage-room', 'main-lab', 'meeting-room'). If provided, targetX/Z are ignored and the agent walks to the zone center.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "interact",
      description:
        "Interact with an object (e.g., open/close a door, toggle a switch, use a coffee machine).",
      parameters: {
        type: "object",
        properties: {
          itemId: {
            type: "string",
            description: "The exact ID of the object to interact with",
          },
        },
        required: ["itemId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "say",
      description:
        "Say something out loud. This appears as a thought bubble above your head. Use for greetings, remarks, or narrating your intentions.",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "What to say (keep it short, 1-2 sentences)",
          },
        },
        required: ["message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Perform a web search to find up-to-date information, facts, or answers from the internet. Use when your internal knowledge is insufficient.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to look up on the internet.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "observe",
      description:
        "Do nothing and continue your current behavior. Use when no action is needed. You will keep wandering or idling.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

// ============================================================================
// Tool call result type — what we parse from the Groq response
// ============================================================================

export type ToolCallAction =
  | { tool: "pick_up"; itemId: string }
  | { tool: "place_at"; areaId: string }
  | { tool: "go_to"; targetX?: number; targetZ?: number; zoneId?: string }
  | { tool: "interact"; itemId: string }
  | { tool: "say"; message: string }
  | { tool: "web_search"; query: string }
  | { tool: "observe" };

/**
 * Parse a single tool call from the Groq response into a typed action.
 */
export function parseToolCall(
  name: string,
  argsJson: string,
): ToolCallAction | null {
  try {
    const args = JSON.parse(argsJson);

    switch (name) {
      case "pick_up":
        if (!args.itemId) return null;
        return { tool: "pick_up", itemId: args.itemId };

      case "place_at":
        if (!args.areaId) return null;
        return { tool: "place_at", areaId: args.areaId };

      case "go_to":
        return {
          tool: "go_to",
          targetX: args.targetX,
          targetZ: args.targetZ,
          zoneId: args.zoneId,
        };

      case "interact":
        if (!args.itemId) return null;
        return { tool: "interact", itemId: args.itemId };

      case "say":
        if (!args.message) return null;
        return { tool: "say", message: args.message };

      case "web_search":
        if (!args.query) return null;
        return { tool: "web_search", query: args.query };

      case "observe":
        return { tool: "observe" };

      default:
        console.warn(`[agent-tools] Unknown tool call: "${name}"`);
        return null;
    }
  } catch (e) {
    console.error(`[agent-tools] Failed to parse tool args for "${name}":`, e);
    return null;
  }
}
