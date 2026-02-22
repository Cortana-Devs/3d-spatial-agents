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

  // --- Items: ALL pickable objects with status markers ---
  // A=available, C=carried, X=claimed. LLM should only pick (A) items.
  const allItems = registry.getAll().filter((o) => o.pickable);
  const itemRows = allItems.map((item) => {
    const status = item.carriedBy
      ? "C"
      : registry.isItemClaimed(item.id)
        ? "X"
        : "A";
    return `${item.id}|${item.name}|${item.type}|${status}`;
  });
  const items =
    itemRows.length > 0
      ? `A=available,C=carried,X=claimed. Only pick (A) items.\nID|Name|Type|Status\n${itemRows.join("\n")}`
      : "No pickable items.";

  // --- Placing Areas: ALL areas, grouped by furniture for token efficiency ---
  // Format: "Furniture Name: id(E), id(O)" where E=empty, O=occupied
  const allAreas = registry.getAllPlacingAreas();
  const grouped = new Map<string, { id: string; empty: boolean }[]>();
  for (const area of allAreas) {
    // Group by base furniture name (strip slot suffixes like "Left", "Right", "Middle")
    const groupKey =
      area.groupName ||
      area.name.replace(/\s+(Left|Right|Middle|Slot\s*\d+)$/i, "").trim();
    if (!grouped.has(groupKey)) grouped.set(groupKey, []);
    grouped.get(groupKey)!.push({ id: area.id, empty: !area.currentItem });
  }
  const areaLines: string[] = [];
  for (const [name, slots] of grouped) {
    const slotStrs = slots.map((s) => `${s.id}(${s.empty ? "E" : "O"})`);
    areaLines.push(`${name}: ${slotStrs.join(", ")}`);
  }
  const areas =
    areaLines.length > 0
      ? `E=empty, O=occupied. Only use IDs marked (E).\n${areaLines.join("\n")}`
      : "No placing areas.";

  // --- Agents ---
  const agentIds = taskRegistry.getAllAgentIds();
  const agentRows = agentIds.map((id) => {
    const s = taskRegistry.getQueueStatus(id);
    return `${id}|${s.phase}`;
  });
  const agents =
    agentRows.length > 0 ? `ID|Status\n${agentRows.join("\n")}` : "No agents.";

  return { items, areas, agents };
}

// ============================================================================
// Prompt Builder — compact prompt to stay under token limits
// ============================================================================

export function buildParserPrompt(command: string, ctx: WorldContext): string {
  return `Parse this office command into JSON.

ITEMS (available to pick up):
${ctx.items}

PLACING AREAS (all furniture slots):
${ctx.areas}

AGENTS:
${ctx.agents}

TASKS: FETCH_AND_PLACE(itemId,destAreaId), PICK_NEARBY(itemId), PLACE_INVENTORY(destAreaId), FOLLOW_PLAYER()

RULES: Use EXACT IDs from tables. Only pick items marked (A). destAreaId MUST be an (E) empty slot. Pick IDLE agent. "move X to Y"=FETCH_AND_PLACE. "pick up X"=PICK_NEARBY. "follow me"=FOLLOW_PLAYER.

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

        // If item is already carried → assign PLACE_INVENTORY to the carrying agent
        if (item.carriedBy) {
          parsed.agentId = item.carriedBy; // override agent to the one holding it
          validatedTasks.push({
            type: "PLACE_INVENTORY",
            itemId: t.itemId,
            destAreaId: resolvedAreaId,
          });
          break;
        }

        // Otherwise: standard PICK_NEARBY + PLACE_INVENTORY sequence
        validatedTasks.push({
          type: "PICK_NEARBY",
          itemId: t.itemId,
        });
        validatedTasks.push({
          type: "PLACE_INVENTORY",
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
