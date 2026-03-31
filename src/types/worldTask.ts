/** Shared lab-wide tasks visible to agents (prompt + UI). */

export type WorldTaskStatus =
  | "open"
  | "claimed"
  | "in_progress"
  | "done"
  | "failed";

export type WorldTaskPayload =
  | { kind: "deliver"; itemId: string; destAreaId: string }
  | { kind: "go_zone"; zoneId: string }
  | { kind: "follow_player" };

export interface WorldTaskSubtask {
  id: string;
  label: string;
  done: boolean;
  claimedBy?: string | null;
}

export interface WorldTask {
  id: string;
  title: string;
  description: string;
  status: WorldTaskStatus;
  priority: number;
  assigneeId: string | null;
  createdBy: "player" | "scenario" | "system";
  payload: WorldTaskPayload;
  /** Optional zone filter for future visibility rules (v1: unused, lab-wide). */
  zoneId?: string | null;
  /** Hint for collaboration copy in prompt. */
  helpersNeeded?: boolean;
  subtasks?: WorldTaskSubtask[];
  createdAt: number;
}
