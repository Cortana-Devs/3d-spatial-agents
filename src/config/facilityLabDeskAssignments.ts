/**
 * Facility lab: desk / chair pairs, default agent assignments, and sample task copy for scenario context.
 */

/** East wing + extra research tables (see ResearchFacilityFurniture). */
export const CLAIMABLE_DESK_IDS: string[] = [
  "desk-east-0",
  "desk-east-1",
  "desk-east-2",
  "desk-east-3",
  "extra-table-A",
  "extra-table-B",
  "extra-table-C",
  "extra-table-D",
];

/** Matching chair id for `sit` when using an east desk. */
export const DESK_TO_CHAIR: Record<string, string> = {
  "desk-east-0": "chair-east-0",
  "desk-east-1": "chair-east-1",
  "desk-east-2": "chair-east-2",
  "desk-east-3": "chair-east-3",
  "extra-table-A": "chair-east-0",
  "extra-table-B": "chair-east-1",
  "extra-table-C": "chair-east-2",
  "extra-table-D": "chair-east-3",
};

export const DEFAULT_AGENT_DESK: Record<string, string> = {
  "agent-01": "desk-east-0",
  "agent-02": "desk-east-1",
};

export function getDefaultPersonalDesk(agentId: string): string {
  return DEFAULT_AGENT_DESK[agentId] ?? "desk-east-0";
}

export function getChairIdForPersonalDesk(
  agentId: string,
  personalDeskByAgent: Record<string, string>
): string | null {
  const desk = personalDeskByAgent[agentId];
  if (!desk) return null;
  return DESK_TO_CHAIR[desk] ?? null;
}

/** Scenario text for LLM: concrete lab tasks. */
export function buildResearchFacilityScenarioContext(
  agentId: string,
  personalDeskByAgent: Record<string, string>
): string {
  const desk =
    personalDeskByAgent[agentId] ?? getDefaultPersonalDesk(agentId);
  const chair = DESK_TO_CHAIR[desk] ?? "chair-east-0";

  return [
    `[LAB ASSIGNMENTS]`,
    `- Your personal desk (use claim_desk to change): **${desk}**. Chair to sit at your station: **${chair}**.`,
    `- Data Analysis laptops: some show an email outbox (finish and send); some show a fault screen (needs repair / IT).`,
    `- **Storage Cupboard 3** (cupboard-facility-3): pick **file-rack3-to-supervisor** and place it at **desk-supervisor-facility-inbox** on the Supervisor Desk.`,
    `- When resting at your station, sit in your chair.`,
  ].join("\n");
}
