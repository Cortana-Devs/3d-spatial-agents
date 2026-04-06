/**
 * Agent Tool Definitions for Groq Function-Calling API.
 *
 * Conscious mind (LLM) invokes these; YUKA + TaskQueue execute them.
 *
 * Includes: pick/place/interact/go_to, say / message_agent / announce,
 * sit / contemplate / rest / explore / collaborate / emote / present,
 * rest_in_pod, claim_desk, claim_task, release_task (shared lab backlog),
 * web_search, observe.
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
        "Walk to a specific position or named sector in the Facility Lab. Use sector IDs exclusively: 'center-park', 'fishing-dock', 'core-lab', 'data-analysis', 'break-room', 'conference-area', 'interior-ring', 'exterior-plaza'. Avoid raw coordinates if possible.",
      parameters: {
        type: "object",
        properties: {
          targetX: { type: "number", description: "X coordinate in world space" },
          targetZ: { type: "number", description: "Z coordinate in world space" },
          zoneId: {
            type: "string",
            description:
              "Semantic sector ID: 'center-park', 'fishing-dock', 'core-lab', 'data-analysis', 'break-room', 'conference-area', 'interior-ring', or 'exterior-plaza'. If provided, targetX/Z are ignored.",
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
        "Speak out loud (bubble + TTS). Use when you have something specific: answer, question, brief reaction to what you see, or coordination. Do NOT use for vague internal monologue or the same line every turn. Prefer silence (observe) if nothing needs saying. 1–2 short sentences, plain text. API tool_calls + JSON only.",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description:
              "Concrete utterance: greeting, answer, question (e.g. \"Can you cover the east desk?\"), or task update — not filler pondering.",
          },
        },
        required: ["message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "message_agent",
      description:
        "Send a targeted message to one agent (exact AGENT id from Perception). They see it next think cycle; also spoken aloud. Use for questions, handoffs, or coordination — not spam.",
      parameters: {
        type: "object",
        properties: {
          targetAgentId: {
            type: "string",
            description: "Exact agent id, e.g. agent-01, agent-02",
          },
          message: {
            type: "string",
            description: "1–2 short sentences to deliver to that agent",
          },
        },
        required: ["targetAgentId", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "announce",
      description:
        "Broadcast a short message to every other agent in the lab. Each will see it in their next thought cycle. Also speaks aloud and appears in the shared supervisor channel.",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "1–2 short sentences for everyone",
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
        "No tool action this turn; continue wandering or current queue. Use when nothing needs doing — does not require speech. Prefer over empty 'say' filler.",
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
        "Go to a scenic spot and take in the view. Best when Wonder is LOW. Restores wonder and energy.",
      parameters: {
        type: "object",
        properties: {
          zoneId: {
            type: "string",
            description: "Zone to contemplate in: 'center-park', 'fishing-dock', or 'core-lab'. Defaults to center-park.",
          },
          poiId: {
            type: "string",
            description: "Optional specific POI ID to appreciate (from Perception table).",
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
        "You feel tired. Walk to the Break Room (south sector) or a nearby Agent Pod to rest until energy recovers. If you prefer the pod, use 'rest_in_pod' instead.",
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
        "Walk toward another agent's current position to work together. Use their exact agent id from the Perception table. Optional topic is spoken first. Satisfies Social and Belonging drives.",
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
        "Walk to the Conference Area and deliver a short speech on a topic. Great when Social or Helpfulness drives are high and other agents are nearby.",
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
  {
    type: "function",
    function: {
      name: "rest_in_pod",
      description:
        "Navigate to a nearby Agent Pod (resting chamber) and dock to enter low-power mode. This is the most efficient way to recover energy and system health.",
      parameters: {
        type: "object",
        properties: {
          podId: {
            type: "string",
            description: "The exact ID of the pod to dock in (from Perception table). If omitted, the system will find the nearest available pod.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "claim_desk",
      description:
        "Claim your personal desk in the Facility Lab (desk-east-0..3 or extra-table-A..D). Updates LAB ASSIGNMENTS in scenario and the visible desk label. Call when you want a home workstation.",
      parameters: {
        type: "object",
        properties: {
          deskId: {
            type: "string",
            description:
              "Desk id: desk-east-0..3 or extra-table-A..D",
          },
        },
        required: ["deskId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "claim_task",
      description:
        "Take an open shared lab task: pass the exact taskId from the World tasks table in your prompt. Enqueues pick/place, go_to, or follow_player as defined for that task. Cannot steal another agent's assigned task.",
      parameters: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "Exact world task id from the World tasks table (e.g. wt-...).",
          },
        },
        required: ["taskId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "release_task",
      description:
        "Give back a shared task you took (your taskId). Status returns to open for others; your queued steps for that task are cancelled.",
      parameters: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "World task id to release.",
          },
        },
        required: ["taskId"],
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
  | { tool: "message_agent"; targetAgentId: string; message: string }
  | { tool: "announce"; message: string }
  | { tool: "web_search"; query: string }
  | { tool: "observe" }
  | { tool: "sit"; targetId?: string }
  | { tool: "contemplate"; zoneId?: string; poiId?: string }
  | { tool: "rest" }
  | { tool: "explore"; preferredZone?: string }
  | { tool: "collaborate"; agentId: string; topic?: string }
  | { tool: "emote"; gesture: "wave" | "nod" | "shrug" | "cheer" | "think" }
  | { tool: "present"; topic: string; speech?: string }
  | { tool: "rest_in_pod"; podId?: string }
  | { tool: "claim_desk"; deskId: string }
  | { tool: "claim_task"; taskId: string }
  | { tool: "release_task"; taskId: string };

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
      case "message_agent":
        if (!args.targetAgentId || !args.message) return null;
        return {
          tool: "message_agent",
          targetAgentId: args.targetAgentId,
          message: args.message,
        };
      case "announce":
        if (!args.message) return null;
        return { tool: "announce", message: args.message };
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
      case "rest_in_pod":
        return { tool: "rest_in_pod", podId: args.podId };
      case "claim_desk":
        if (!args.deskId) return null;
        return { tool: "claim_desk", deskId: String(args.deskId) };
      case "claim_task":
        if (!args.taskId) return null;
        return { tool: "claim_task", taskId: String(args.taskId) };
      case "release_task":
        if (!args.taskId) return null;
        return { tool: "release_task", taskId: String(args.taskId) };
      default:
        console.warn(`[agent-tools] Unknown tool call: "${name}"`);
        return null;
    }
  } catch (e) {
    console.error(`[agent-tools] Failed to parse tool args for "${name}":`, e);
    return null;
  }
}
