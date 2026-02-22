import { InteractableRegistry } from "@/components/Systems/InteractableRegistry";
import { AgentTaskRegistry } from "@/components/Systems/AgentTaskQueue";
import type {
  AgentTask,
  AgentTaskType,
} from "@/components/Systems/AgentTaskQueue";
import * as THREE from "three";

// ============================================================================
// World Context Builder — serializes registry state for the LLM prompt
// ============================================================================

export interface WorldContext {
  items: string;
  areas: string;
  agents: string;
}

export function buildWorldContext(): WorldContext {
  const registry = InteractableRegistry.getInstance();
  const taskRegistry = AgentTaskRegistry.getInstance();

  // --- Items: only AVAILABLE pickable items (skip carried/claimed — LLM can't use them) ---
  const allItems = registry
    .getAll()
    .filter((o) => o.pickable && !o.carriedBy && !registry.isItemClaimed(o.id));
  const itemRows = allItems.map(
    (item) => `${item.id} | ${item.name} | ${item.type}`,
  );
  const items =
    itemRows.length > 0
      ? `ID | Name | Type\n${itemRows.join("\n")}`
      : "No available items.";

  // --- Placing Areas: only EMPTY slots (LLM must never pick occupied) ---
  const allAreas = registry.getAllPlacingAreas().filter((a) => !a.currentItem);
  const areaRows = allAreas.map((area) => `${area.id} | ${area.name}`);
  const areas =
    areaRows.length > 0
      ? `ID | Name\n${areaRows.join("\n")}`
      : "No empty placing areas.";

  // --- Agents ---
  const agentIds = taskRegistry.getAllAgentIds();
  const agentRows = agentIds.map((id) => {
    const s = taskRegistry.getQueueStatus(id);
    return `${id} | ${s.phase}`;
  });
  const agents =
    agentRows.length > 0
      ? `ID | Status\n${agentRows.join("\n")}`
      : "No agents.";

  return { items, areas, agents };
}

// ============================================================================
// Prompt Builder — compact prompt to stay under token limits
// ============================================================================

export function buildParserPrompt(command: string, ctx: WorldContext): string {
  return `Parse this office command into JSON.

ITEMS (available to pick up):
${ctx.items}

AREAS (empty slots to place items):
${ctx.areas}

AGENTS:
${ctx.agents}

TASKS: FETCH_AND_PLACE(itemId,destAreaId), PICK_NEARBY(itemId), PLACE_INVENTORY(destAreaId), FOLLOW_PLAYER()

RULES: Use EXACT IDs from above. Pick IDLE agent. "move X to Y"=FETCH_AND_PLACE. "pick up X"=PICK_NEARBY. "follow me"=FOLLOW_PLAYER.

COMMAND: "${command}"

JSON ONLY:
{"agentId":"id","tasks":[{"type":"FETCH_AND_PLACE","itemId":"id","destAreaId":"id"}],"explanation":"summary","error":null}`;
}

// ============================================================================
// Response Validator — validates LLM output, with smart fallback
// ============================================================================

export interface ParsedNLPResult {
  agentId: string;
  tasks: AgentTask[];
  explanation: string;
}

export interface NLPError {
  error: string;
}

/**
 * Finds an alternative empty placing area that has a similar name to the
 * originally requested area. For example if the LLM picks "desk-a-slot-0"
 * which is occupied, this will try to find "desk-a-slot-1" which is empty.
 */
function findAlternativeArea(
  requestedAreaId: string,
  registry: InteractableRegistry,
): string | null {
  const requestedArea = registry.getPlacingAreaById(requestedAreaId);
  if (!requestedArea) return null;

  // Extract the base name for fuzzy matching (e.g. "Office Desk A" from "Office Desk A Left")
  const baseName = requestedArea.name
    .replace(/(Left|Right|Middle|Slot \d+)$/i, "")
    .trim();

  const allAreas = registry.getAllPlacingAreas();
  for (const area of allAreas) {
    if (area.id === requestedAreaId) continue; // skip the occupied one
    if (area.currentItem) continue; // skip other occupied ones
    // Check if this area belongs to the same group/desk
    if (
      area.name.includes(baseName) ||
      (area.groupName && area.groupName === requestedArea.groupName)
    ) {
      return area.id;
    }
  }
  return null;
}

export function validateAndResolve(raw: string): ParsedNLPResult | NLPError {
  // Clean markdown fences if present
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { error: "Failed to parse LLM response as JSON." };
  }

  // Check for LLM-reported error
  if (parsed.error) {
    return { error: parsed.error };
  }

  if (
    !parsed.agentId ||
    !Array.isArray(parsed.tasks) ||
    parsed.tasks.length === 0
  ) {
    return {
      error: "LLM returned an incomplete response (missing agentId or tasks).",
    };
  }

  const registry = InteractableRegistry.getInstance();
  const taskRegistry = AgentTaskRegistry.getInstance();

  // Validate agent exists
  const agentIds = taskRegistry.getAllAgentIds();
  if (!agentIds.includes(parsed.agentId)) {
    // Try to pick any idle agent as fallback
    const fallback = agentIds.find((id) => {
      const s = taskRegistry.getQueueStatus(id);
      return s.phase === "IDLE";
    });
    if (fallback) {
      parsed.agentId = fallback;
    } else if (agentIds.length > 0) {
      parsed.agentId = agentIds[0];
    } else {
      return { error: "No agents registered in the scene." };
    }
  }

  // Validate and convert tasks
  const validatedTasks: AgentTask[] = [];

  for (const t of parsed.tasks) {
    const taskType = t.type as AgentTaskType;

    switch (taskType) {
      case "FETCH_AND_PLACE": {
        if (!t.itemId || !t.destAreaId) {
          return {
            error: `FETCH_AND_PLACE requires itemId and destAreaId, got: ${JSON.stringify(t)}`,
          };
        }
        const item = registry.getById(t.itemId);
        if (!item) {
          return { error: `Item "${t.itemId}" not found in the scene.` };
        }
        if (item.carriedBy) {
          return {
            error: `Item "${item.name}" is already being carried by ${item.carriedBy}.`,
          };
        }

        // Smart area resolution: if occupied, find alternative on same surface
        let resolvedAreaId = t.destAreaId;
        const area = registry.getPlacingAreaById(resolvedAreaId);
        if (!area) {
          return {
            error: `Placing area "${t.destAreaId}" not found in the scene.`,
          };
        }
        if (area.currentItem) {
          const alt = findAlternativeArea(resolvedAreaId, registry);
          if (alt) {
            resolvedAreaId = alt;
          } else {
            return {
              error: `All slots on "${area.name}" are occupied. No empty slot available.`,
            };
          }
        }

        validatedTasks.push({
          type: "FETCH_AND_PLACE",
          itemId: t.itemId,
          destAreaId: resolvedAreaId,
        });
        break;
      }

      case "PICK_NEARBY": {
        if (!t.itemId) {
          return { error: `PICK_NEARBY requires itemId.` };
        }
        const item = registry.getById(t.itemId);
        if (!item) {
          return { error: `Item "${t.itemId}" not found in the scene.` };
        }
        validatedTasks.push({ type: "PICK_NEARBY", itemId: t.itemId });
        break;
      }

      case "PLACE_INVENTORY": {
        if (!t.destAreaId) {
          return { error: `PLACE_INVENTORY requires destAreaId.` };
        }
        let resolvedAreaId = t.destAreaId;
        const area = registry.getPlacingAreaById(resolvedAreaId);
        if (!area) {
          return { error: `Placing area "${t.destAreaId}" not found.` };
        }
        if (area.currentItem) {
          const alt = findAlternativeArea(resolvedAreaId, registry);
          if (alt) resolvedAreaId = alt;
          else return { error: `All slots on "${area.name}" are occupied.` };
        }
        validatedTasks.push({
          type: "PLACE_INVENTORY",
          destAreaId: resolvedAreaId,
        });
        break;
      }

      case "GO_TO": {
        if (t.targetX !== undefined && t.targetZ !== undefined) {
          validatedTasks.push({
            type: "GO_TO",
            targetPos: new THREE.Vector3(t.targetX, 0, t.targetZ),
          });
        } else {
          return { error: `GO_TO requires targetX and targetZ coordinates.` };
        }
        break;
      }

      case "FOLLOW_PLAYER": {
        validatedTasks.push({ type: "FOLLOW_PLAYER" });
        break;
      }

      default:
        return { error: `Unknown task type: "${taskType}"` };
    }
  }

  return {
    agentId: parsed.agentId,
    tasks: validatedTasks,
    explanation: parsed.explanation || "Command parsed successfully.",
  };
}
