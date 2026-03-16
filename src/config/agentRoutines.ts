import * as THREE from "three";
import { InteractableRegistry } from "@/components/Systems/InteractableRegistry";

// ============================================================================
// Agent → Assigned storage table (storage room tables 6–10)
// ============================================================================

const AGENT_ASSIGNED_TABLE: Record<string, string> = {
  "agent-01": "storage-table-6",
  "agent-02": "storage-table-7",
};

export function getAssignedStorageTable(agentId: string): string | null {
  return AGENT_ASSIGNED_TABLE[agentId] ?? null;
}

// ============================================================================
// Storage table → Expected item IDs (checklist for morning check)
// ============================================================================

const STORAGE_TABLE_CHECKLISTS: Record<string, string[]> = {
  "storage-table-6": ["storage-table-6-laptop", "storage-table-6-protocols"],
  "storage-table-7": [
    "storage-table-7-sample-logs",
    "storage-table-7-backup-drive",
  ],
  "storage-table-8": ["storage-table-8-sops", "storage-table-8-manuals"],
  "storage-table-9": ["storage-table-9-laptop", "storage-table-9-usb"],
  "storage-table-10": [
    "storage-table-10-archive",
    "storage-table-10-archive-usb",
  ],
};

export function getStorageTableChecklist(tableId: string): string[] {
  return STORAGE_TABLE_CHECKLISTS[tableId] ?? [];
}

// ============================================================================
// Table center position (for GO_TO target)
// ============================================================================

export function getTableCenterPosition(tableId: string): THREE.Vector3 | null {
  const registry = InteractableRegistry.getInstance();
  const areas = registry.getPlacingAreasForTable(tableId);
  if (areas.length === 0) return null;
  const first = areas[0];
  return first.position.clone();
}

// ============================================================================
// Meeting room (conference room) — single target for ANNOUNCE_MEETING
// ============================================================================

/** Table id for the conference table in the meeting room (placing areas: conf-table-center, etc.) */
export const CONFERENCE_TABLE_ID = "conf-table";

/**
 * Hub center from OfficeHub layout (0, 4, 0). Conference room: table at (50, 4, -47.5), door at (50, 4, -20).
 * Table obstacle carves roughly x 29..71, z -58..-36 (with padding). We target a point clearly in the
 * walkable corridor between door and table so pathfinding never aims into the table or a wall.
 */
const HUB_CENTER = { x: 0, y: 4, z: 0 };
const MEETING_ROOM_WALKABLE = new THREE.Vector3(
  HUB_CENTER.x + 50,
  HUB_CENTER.y,
  HUB_CENTER.z - 28,
);

/** Returns a walkable position in the conference room for GO_TO (meeting room). */
export function getMeetingRoomPosition(): THREE.Vector3 | null {
  return MEETING_ROOM_WALKABLE.clone();
}
