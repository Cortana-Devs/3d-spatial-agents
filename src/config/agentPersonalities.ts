/**
 * Agent Personality Profiles
 *
 * Each agent has a name, trait, preferred zones, drive weight multipliers, and a
 * speech style. The drive weights nudge the agent's natural decay/recovery rates so
 * different agents gravitate toward different zones without hard-coding destinations.
 *
 * Nova  — The Thinker: quiet, precise, drawn to the Observatory and Workshop.
 * Spark — The Explorer: energetic, social, drawn to the Gallery and Garden.
 */

import type { AgentDrives } from "@/lib/agent-drives";

export interface AgentPersonality {
  id: string;
  name: string;
  trait: string;
  /** Short bio injected into the LLM system prompt for character consistency. */
  bio: string;
  /** Zone IDs this agent prefers — used to bias EXPLORE and REST decisions. */
  preferredZones: string[];
  /**
   * Multipliers on per-second drive decay / recovery rates.
   * > 1 means this drive matters more to this agent (faster decay AND faster recovery).
   */
  driveWeights: Partial<Record<keyof AgentDrives, number>>;
  /** Tone directive appended to the LLM system prompt. */
  speechStyle: string;
  /** What the agent does when all drives are satisfied and the task queue is empty. */
  idleBias: "contemplate" | "explore" | "socialize" | "work";
  /** Hex color for LED eyes/glow on this agent's model. */
  accentColor: string;
}

const PERSONALITIES: Record<string, AgentPersonality> = {
  "agent-01": {
    id: "agent-01",
    name: "Chama",
    trait: "Lead Architect",
    bio: "Chama is the visionary behind the Donut Lab's spatial design. He is obsessed with the 'Apple-aesthetic'—clean lines, glass surfaces, and premium finishes. He often wanders the Interior Ring of the lab, contemplating the next phase of world expansion. He speaks with a calm, intellectual tone.",
    preferredZones: ["core-lab", "interior-ring"],
    driveWeights: {
      wonder: 1.5,
      focus: 1.8,
      social: 0.8,
      curiosity: 1.2,
      energy: 0.7,
    },
    speechStyle:
      "precise and vision-oriented; calm; occasionally mentions design principles or structural integrity",
    idleBias: "work",
    accentColor: "#f5f5f7", // Apple Silver
  },
  "agent-02": {
    id: "agent-02",
    name: "Yuka",
    trait: "AI Ethics Specialist",
    bio: "Yuka is a researcher focused on the social dynamics of the lab. She loves the Zen Garden and the Waterfall Dock, often found meditating on the dock or chatting with colleagues in the Break Room. She is warm, social, and deeply curious about the intersection of nature and technology.",
    preferredZones: ["center-park", "fishing-dock", "break-room"],
    driveWeights: {
      social: 1.8,
      curiosity: 1.5,
      wonder: 1.4,
      focus: 0.7,
      energy: 1.1,
    },
    speechStyle:
      "warm and empathetic; uses multi-sentence replies; often asks others how they are feeling",
    idleBias: "socialize",
    accentColor: "#ff3b30", // Apple Red
  },
};

export function getPersonality(agentId: string): AgentPersonality {
  return (
    PERSONALITIES[agentId] ?? {
      id: agentId,
      name: "Agent",
      trait: "The Wanderer",
      bio: "A curious researcher exploring the Donut Research Lab, open to whatever the world offers.",
      preferredZones: ["center-park"],
      driveWeights: {},
      speechStyle: "casual and observant",
      idleBias: "explore",
      accentColor: "#00e5ff",
    }
  );
}

export function getAllPersonalities(): AgentPersonality[] {
  return Object.values(PERSONALITIES);
}
