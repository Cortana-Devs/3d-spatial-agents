/**
 * Agent Tool Definitions for Groq Function-Calling API.
 *
 * These define the actions an agent's "conscious mind" (LLM) can invoke.
 * The subconscious (YUKA + TaskQueue) handles execution.
 *
 * Extended with experiential tools:
 *   sit       — sit on a bench or chair to rest
 *   contemplate — go to a scenic spot and appreciate the view
 *   rest      — go to the garden to recharge energy
 *   explore   — visit the least recently seen zone
 *   collaborate — approach another agent for a shared task
 *   emote     — express a gesture (wave, nod, shrug, cheer, think)
 *   present   — go to the Arena podium and deliver a speech
 */

import type { ChatCompletionTool } from "groq-sdk/resources/chat/completions";

export const AGENT_TOOLS: ChatCompletionTool[] = [
  // ─── Existing tools (unchanged) ───────────────────────────────────────────

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
            description:
              "The exact ID of the item to pick up (from the ITEMS table)",
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
            description:
              "The exact ID of the placing area slot (from the AREAS table)",
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
        "Walk to a specific position or named zone in the park. Use zone names when available (e.g. 'observatory', 'garden', 'workshop', 'arena', 'gallery').",
      parameters: {
        type: "object",
        properties: {
          targetX: { type: "number", description: "X coordinate in world space" },
          targetZ: { type: "number", description: "Z coordinate in world space" },
          zoneId: {
            type: "string",
            description:
              "Optional semantic zone name (e.g. 'observatory', 'garden', 'workshop', 'arena', 'gallery'). If provided, targetX/Z are ignored.",
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
        "Interact with an object (e.g., open/close a door, toggle a switch, use a display terminal, appreciate a fountain).",
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
        "Say something out loud. Appears as a speech bubble and is spoken via TTS. Use for greetings, observations, or sharing thoughts. Keep it natural and brief (1–2 sentences).",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "What to say (1–2 sentences, unformatted conversational language)",
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
        "Perform a web search to find up-to-date information, facts, or answers from the internet.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query",
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
        "Do nothing and continue current behavior. Use when no action is needed. You will keep wandering or idling.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },

  // ─── New experiential tools ────────────────────────────────────────────────

  {
    type: "function",
    function: {
      name: "sit",
      description:
        "Walk to a nearby bench or chair and sit down to rest and observe the surroundings. Good when your Energy is low or you want to be present somewhere.",
      parameters: {
        type: "object",
        properties: {
          targetId: {
            type: "string",
            description: "ID of the bench or chair to sit on (from the ITEMS table). If omitted, the nearest sittable surface is used.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "contemplate",
      description:
        "Go to a scenic spot or point of interest and take in the view. Reflect quietly. Best used when Wonder is low or you want a moment of peace. Provides wonder and energy recovery.",
      parameters: {
        type: "object",
        properties: {
          zoneId: {
            type: "string",
            description: "Zone to contemplate in: 'observatory', 'garden', or 'gallery'. Defaults to nearest scenic zone.",
          },
          poiId: {
            type: "string",
            description: "Optional specific POI ID to appreciate (from perceived POIs).",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "rest",
      description:
        "You feel tired. Walk to the Garden Atrium, find a bench, and rest until your energy recovers. This is the primary way to restore Energy drive.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "explore",
      description:
        "Walk to a zone you have not visited recently. Satisfies Curiosity and Belonging drives. The system will choose the least recently visited zone from your spatial memory.",
      parameters: {
        type: "object",
        properties: {
          preferredZone: {
            type: "string",
            description: "Optional hint for which zone to explore next.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "collaborate",
      description:
        "Walk toward another agent to work on something together. They may join you at the Workshop or Arena. Satisfies Social and Belonging drives.",
      parameters: {
        type: "object",
        properties: {
          agentId: {
            type: "string",
            description: "ID of the agent to approach (e.g. 'agent-01' or 'agent-02')",
          },
          topic: {
            type: "string",
            description: "What you want to collaborate on (optional, for speech context).",
          },
        },
        required: ["agentId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "emote",
      description:
        "Express yourself with a physical gesture. Quick and expressive — no movement required.",
      parameters: {
        type: "object",
        properties: {
          gesture: {
            type: "string",
            enum: ["wave", "nod", "shrug", "cheer", "think"],
            description: "The gesture to perform.",
          },
        },
        required: ["gesture"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "present",
      description:
        "Walk to the Collaboration Arena podium and deliver a short speech on a topic. Great when Social or Helpfulness drives are high and other agents are nearby.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description: "What to present or talk about (1 sentence description).",
          },
          speech: {
            type: "string",
            description: "The actual speech content to deliver (2–4 sentences).",
          },
        },
        required: ["topic"],
      },
    },
  },
];

// ============================================================================
// Tool call result types
// ============================================================================

export type ToolCallAction =
  | { tool: "pick_up"; itemId: string }
  | { tool: "place_at"; areaId: string }
  | { tool: "go_to"; targetX?: number; targetZ?: number; zoneId?: string }
  | { tool: "interact"; itemId: string }
  | { tool: "say"; message: string }
  | { tool: "web_search"; query: string }
  | { tool: "observe" }
  | { tool: "sit"; targetId?: string }
  | { tool: "contemplate"; zoneId?: string; poiId?: string }
  | { tool: "rest" }
  | { tool: "explore"; preferredZone?: string }
  | { tool: "collaborate"; agentId: string; topic?: string }
  | { tool: "emote"; gesture: "wave" | "nod" | "shrug" | "cheer" | "think" }
  | { tool: "present"; topic: string; speech?: string };

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
      case "sit":
        return { tool: "sit", targetId: args.targetId };
      case "contemplate":
        return { tool: "contemplate", zoneId: args.zoneId, poiId: args.poiId };
      case "rest":
        return { tool: "rest" };
      case "explore":
        return { tool: "explore", preferredZone: args.preferredZone };
      case "collaborate":
        if (!args.agentId) return null;
        return { tool: "collaborate", agentId: args.agentId, topic: args.topic };
      case "emote":
        if (!args.gesture) return null;
        return {
          tool: "emote",
          gesture: args.gesture as "wave" | "nod" | "shrug" | "cheer" | "think",
        };
      case "present":
        if (!args.topic) return null;
        return { tool: "present", topic: args.topic, speech: args.speech };
      default:
        console.warn(`[agent-tools] Unknown tool call: "${name}"`);
        return null;
    }
  } catch (e) {
    console.error(`[agent-tools] Failed to parse tool args for "${name}":`, e);
    return null;
  }
}
