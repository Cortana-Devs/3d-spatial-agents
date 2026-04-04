/**
 * World Task Pipeline
 *
 * Single module for the entire WorldTask domain — prompt formatting,
 * queue chain building, agent selection, and step completion.
 *
 * Previously scattered across four micro-files:
 *   worldTaskPrompt.ts       → Section A
 *   worldTaskEnqueue.ts      → Section B
 *   worldTaskDispatch.ts     → Section C
 *   worldTaskCompletion.ts   → Section D
 */

import * as THREE from "three";
import { useGameStore } from "@/store/gameStore";
import { AgentTaskRegistry } from "@/systems/AgentTaskQueue";
import { InteractableRegistry } from "@/systems/InteractableRegistry";
import type { AgentTask } from "@/types/agent";
import type { WorldTask, WorldTaskPayload } from "@/types/worldTask";

// ── A: Prompt Formatting ──────────────────────────────────────────────────────

/**
 * Lab-wide visibility (v1): every agent sees non-terminal tasks.
 * Rows show assignment so agents can collaborate via message_agent / collaborate.
 */
export function formatWorldTasksForPrompt(
  agentId: string,
  tasksById: Record<string, WorldTask>,
): string {
  const tasks = Object.values(tasksById).filter(
    (t) => t.status !== "done" && t.status !== "failed",
  );
  if (tasks.length === 0) {
    return "No open shared lab tasks.";
  }

  const lines = [
    "| Task ID | Title | Status | Assignee | Collaborate? |",
    "|---|---|---|---|---|",
  ];

  for (const t of tasks.sort((a, b) => b.priority - a.priority)) {
    const assignee =
      t.assigneeId == null
        ? "(anyone may claim)"
        : t.assigneeId === agentId
          ? "(you)"
          : t.assigneeId;
    const help = t.helpersNeeded ? "yes — coordinate" : "—";
    lines.push(`| ${t.id} | ${t.title} | ${t.status} | ${assignee} | ${help} |`);
  }

  lines.push("");
  lines.push("Details:");
  for (const t of tasks.sort((a, b) => b.priority - a.priority)) {
    lines.push(`- **${t.id}**: ${t.description}`);
    if (t.subtasks?.length) {
      for (const s of t.subtasks) {
        const who = s.claimedBy ? ` [${s.claimedBy}]` : "";
        lines.push(`  - ${s.id}: ${s.label}${s.done ? " (done)" : ""}${who}`);
      }
    }
  }

  return lines.join("\n");
}

// ── B: Task → Queue Chain Builder ────────────────────────────────────────────

const DEFAULT_PRIORITY = 17;

/** Map a world task payload to concrete agent queue tasks (single chain). */
export function buildAgentTasksFromWorldTask(wt: WorldTask): AgentTask[] {
  const base = {
    source: "world_task" as const,
    worldTaskId: wt.id,
    priority: Math.max(wt.priority, DEFAULT_PRIORITY),
    scriptId: `world_task_${wt.id}`,
  };

  switch (wt.payload.kind) {
    case "deliver":
      return [
        { ...base, type: "PICK_NEARBY" as const, itemId: wt.payload.itemId },
        { ...base, type: "PLACE_INVENTORY" as const, destAreaId: wt.payload.destAreaId },
      ];
    case "go_zone":
      return [{ ...base, type: "GO_TO" as const, targetAreaId: wt.payload.zoneId }];
    case "follow_player":
      return [{ ...base, type: "FOLLOW_PLAYER" as const }];
    default:
      return [];
  }
}

/** Map player task-panel chains to a shared world payload when possible. */
export function inferWorldPayloadFromPending(
  pending: AgentTask[],
): WorldTaskPayload | null {
  if (
    pending.length === 2 &&
    pending[0].type === "PICK_NEARBY" &&
    pending[1].type === "PLACE_INVENTORY" &&
    pending[0].itemId &&
    pending[1].destAreaId
  ) {
    return { kind: "deliver", itemId: pending[0].itemId, destAreaId: pending[1].destAreaId };
  }
  if (pending.length === 1 && pending[0].type === "FOLLOW_PLAYER") {
    return { kind: "follow_player" };
  }
  return null;
}

// ── C: Agent Selection & Enqueue ─────────────────────────────────────────────

/**
 * Pick the best agent for an open world task: low queue depth, idle phase,
 * not in active player chat, tie-break distance to task anchor (item for deliver).
 */
export function pickAgentForWorldTask(task: WorldTask): string | null {
  const reg = AgentTaskRegistry.getInstance();
  const ids = reg.getAllAgentIds();
  if (ids.length === 0) return null;

  let anchor: THREE.Vector3 | null = null;
  if (task.payload.kind === "deliver") {
    const obj = InteractableRegistry.getInstance().getById(task.payload.itemId);
    if (obj?.position) anchor = obj.position.clone();
  }

  const positions = useGameStore.getState().agentPositions;
  const isChatOpen = useGameStore.getState().isChatOpen;
  const chatAgentId = useGameStore.getState().chatAgentId;

  let best: string | null = null;
  let bestScore = Infinity;

  for (const id of ids) {
    const q = reg.getOrCreate(id);
    const len = q.getQueueLength();
    const phase = q.getCurrentPhase();
    const busyPenalty = phase !== "IDLE" && phase !== "COMPLETED" ? 15 : 0;
    const chatPenalty = isChatOpen && chatAgentId === id ? 25 : 0;
    let dist = 0;
    if (anchor && positions[id]) {
      dist = anchor.distanceTo(positions[id]);
    }
    const score = len * 8 + busyPenalty + chatPenalty + dist * 0.02;
    if (score < bestScore) {
      bestScore = score;
      best = id;
    }
  }

  return best;
}

/** Choose an agent when there is no world-task anchor (e.g. raw panel queue). */
export function pickAnyAvailableAgent(): string | null {
  const reg = AgentTaskRegistry.getInstance();
  const ids = reg.getAllAgentIds();
  if (ids.length === 0) return null;

  const isChatOpen = useGameStore.getState().isChatOpen;
  const chatAgentId = useGameStore.getState().chatAgentId;

  let best: string | null = null;
  let bestScore = Infinity;

  for (const id of ids) {
    const q = reg.getOrCreate(id);
    const len = q.getQueueLength();
    const phase = q.getCurrentPhase();
    const busyPenalty = phase !== "IDLE" && phase !== "COMPLETED" ? 15 : 0;
    const chatPenalty = isChatOpen && chatAgentId === id ? 25 : 0;
    const score = len * 8 + busyPenalty + chatPenalty;
    if (score < bestScore) {
      bestScore = score;
      best = id;
    }
  }

  return best;
}

/** Enqueue concrete tasks for an agent and update the world task record. */
export function enqueueWorldTaskForAgent(
  task: WorldTask,
  agentId: string,
  setState: (id: string, patch: Partial<WorldTask>) => void,
): boolean {
  const chain = buildAgentTasksFromWorldTask(task);
  if (chain.length === 0) return false;

  const q = AgentTaskRegistry.getInstance().getOrCreate(agentId);
  for (const t of chain) {
    q.enqueue(t);
  }

  setState(task.id, {
    assigneeId: agentId,
    status: task.status === "open" ? "in_progress" : task.status,
  });
  return true;
}

// ── D: Step Completion ────────────────────────────────────────────────────────

/**
 * When an AgentTask from a shared world task finishes, advance or reopen the world task.
 */
export function applyWorldTaskStepCompletion(
  agentId: string,
  task: AgentTask | null | undefined,
  completionAborted: boolean,
): void {
  if (!task?.worldTaskId || task.source !== "world_task") return;

  const store = useGameStore.getState();
  const wt = store.worldTasksById[task.worldTaskId];
  if (!wt) return;

  if (completionAborted) {
    store.updateWorldTask(wt.id, { status: "open", assigneeId: null });
    return;
  }

  switch (wt.payload.kind) {
    case "deliver":
      if (task.type === "PLACE_INVENTORY") {
        store.updateWorldTask(wt.id, { status: "done", assigneeId: agentId });
      }
      break;
    case "go_zone":
      if (task.type === "GO_TO") {
        store.updateWorldTask(wt.id, { status: "done", assigneeId: agentId });
      }
      break;
    case "follow_player":
      if (task.type === "FOLLOW_PLAYER") {
        store.updateWorldTask(wt.id, { status: "done", assigneeId: agentId });
      }
      break;
    default:
      break;
  }

  if (wt.subtasks?.length) {
    const allDone = wt.subtasks.every((s) => s.done);
    if (allDone) {
      store.updateWorldTask(wt.id, { status: "done" });
    }
  }
}
