export type ResearchLLMEngine = "llama-4-maverick" | "llama-3.1-8b-instant";

export interface ResearchScenario {
  id: string;
  name: string;
  description: string;
  targetMetric: string;
  // Allows testing Hypothesis H4
  llmModel: ResearchLLMEngine;
}

export const SCENARIO_A_ROUTINE: ResearchScenario = {
  id: "scenario-a-routine",
  name: "Daily Routine",
  description: "Agents follow baseline isolated schedules, adapting to dynamic pathing and physical obstacles.",
  targetMetric: "Percentage of schedule items completed without spatial breakdown.",
  llmModel: "llama-4-maverick"
};

export const SCENARIO_B_PROPAGATION: ResearchScenario = {
  id: "scenario-b-propagation",
  name: "Information Propagation",
  description: "One agent receives novel info; system tracks spread via spatial proximity conversations.",
  targetMetric: "Simulated minutes until 100% of agents are informed.",
  llmModel: "llama-3.1-8b-instant"
};

export const SCENARIO_C_COLLABORATION: ResearchScenario = {
  id: "scenario-c-collaboration",
  name: "Collaborative Planning",
  description: "Agents coordinate a spatial task by gathering items, meeting at coordinates.",
  targetMetric: "Composite sub-task score and CQR Scale (1-5).",
  llmModel: "llama-4-maverick"
};

// Global active evaluation setting
export const ACTIVE_EVALUATION_SCENARIO: ResearchScenario = SCENARIO_A_ROUTINE;
