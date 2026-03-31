import type { WorldTask } from "@/types/worldTask";

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
    lines.push(
      `| ${t.id} | ${t.title} | ${t.status} | ${assignee} | ${help} |`,
    );
  }

  lines.push("");
  lines.push("Details:");
  for (const t of tasks.sort((a, b) => b.priority - a.priority)) {
    lines.push(`- **${t.id}**: ${t.description}`);
    if (t.subtasks?.length) {
      for (const s of t.subtasks) {
        const who = s.claimedBy ? ` [${s.claimedBy}]` : "";
        lines.push(
          `  - ${s.id}: ${s.label}${s.done ? " (done)" : ""}${who}`,
        );
      }
    }
  }

  return lines.join("\n");
}
