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
