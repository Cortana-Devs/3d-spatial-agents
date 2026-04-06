import * as THREE from "three";
import { InteractableRegistry } from '@/systems/InteractableRegistry';
import { ZoneInfluenceSystem } from "@/systems/ZoneInfluenceSystem";

// ============================================================================
// Agent → Assigned storage table (facility-lab storage cupboards 1–5)
// ============================================================================

const AGENT_ASSIGNED_TABLE: Record<string, string> = {
  "agent-01": "cupboard-facility-1",
  "agent-02": "cupboard-facility-2",
};

export function getAssignedStorageTable(agentId: string): string | null {
  return AGENT_ASSIGNED_TABLE[agentId] ?? null;
}

// ============================================================================
// Storage cupboard → Expected item IDs (checklist for morning check)
// ============================================================================

const STORAGE_TABLE_CHECKLISTS: Record<string, string[]> = {
  "cupboard-facility-1": ["cupboard-facility-1-laptop", "cupboard-facility-1-protocols"],
  "cupboard-facility-2": ["cupboard-facility-2-sample-logs", "cupboard-facility-2-backup-drive"],
  "cupboard-facility-3": [
    "file-rack3-to-supervisor",
    "cupboard-facility-3-sops",
    "cupboard-facility-3-manuals",
  ],
  "cupboard-facility-4": ["cupboard-facility-4-laptop", "cupboard-facility-4-usb"],
  "cupboard-facility-5": ["cupboard-facility-5-archive", "cupboard-facility-5-archive-usb"],
};

export function getStorageTableChecklist(tableId: string): string[] {
  return STORAGE_TABLE_CHECKLISTS[tableId] ?? [];
}

// ============================================================================
// Table center position (for GO_TO target) — dynamic from InteractableRegistry
// ============================================================================

export function getTableCenterPosition(tableId: string): THREE.Vector3 | null {
  const registry = InteractableRegistry.getInstance();
  const areas = registry.getPlacingAreasForTable(tableId);
  if (areas.length === 0) return null;
  return areas[0].position.clone();
}

// ============================================================================
// Main lab workbench helpers — dynamic from InteractableRegistry
// ============================================================================

const WORKBENCH_ALLOWED_ITEM_IDS = new Set<string>(["red-file-01"]); // logbook

export function getWorkbenchCenterPosition(): THREE.Vector3 | null {
  const registry = InteractableRegistry.getInstance();
  // Look up the actual registered workbench position dynamically
  const areas = registry.getPlacingAreasForTable("main-lab-bench");
  if (areas.length > 0) return areas[0].position.clone();
  // Fallback: use the core-lab zone center
  return ZoneInfluenceSystem.getZoneById("core-lab")?.center.clone() ?? null;
}

export function getWorkbenchStrayItems(
  registry: InteractableRegistry,
  radius: number = 10,
): string[] {
  const center = getWorkbenchCenterPosition();
  if (!center) return [];
  const nearby = registry.getNearby(center, radius);
  return nearby
    .filter((obj) => obj.pickable && !obj.carriedBy)
    .filter((obj) => !WORKBENCH_ALLOWED_ITEM_IDS.has(obj.id))
    .map((obj) => obj.id);
}

// ============================================================================
// Conference area — dynamic from ZoneInfluenceSystem
// ============================================================================

export function getMeetingRoomPosition(): THREE.Vector3 | null {
  const zone = ZoneInfluenceSystem.getZoneById("conference-area");
  if (!zone) return null;
  // Offset slightly from zone center into the walkable floor
  return new THREE.Vector3(zone.center.x, zone.center.y, zone.center.z + 6);
}
