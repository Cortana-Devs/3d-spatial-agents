import * as THREE from "three";

export interface WorldObject {
  id: string;
  name: string;
  type:
    | "file"
    | "laptop"
    | "pendrive"
    | "coffeecup"
    | "generic"
    | "sofa"
    | "chair"
    | "whiteboard"
    | "projector_screen"
    | "tv"
    | "coffee_machine"
    | "telephone"
    | "pc"
    | "switch"
    | "door";
  position: THREE.Vector3;
  description?: string;
  pickable: boolean;
  carriedBy: string | null; // null = on ground, 'player' or agent-id
  placedInArea?: string | null; // ID of the PlacingArea this item sits on, or null if on floor
  homeAreaId?: string | null; // ID of the default PlacingArea this item belongs to
  meshRef?: THREE.Object3D;
  isOpen?: boolean; // Used for doors
}

export interface PlacingArea {
  id: string;
  name: string;
  groupId?: string;
  groupName?: string;
  slotIndex?: number;
  position: THREE.Vector3;
  rotation: THREE.Quaternion; // world rotation of surface
  currentItem: string | null; // ID of placed WorldObject or null for empty slot
  dimensions: [number, number, number]; // width, height, depth of surface slab
  meshRef?: THREE.Object3D;
}

// Reusable temp objects to avoid per-frame allocations
const _tempWorldPos = new THREE.Vector3();
const _tempQuat = new THREE.Quaternion();

export class InteractableRegistry {
  private static instance: InteractableRegistry;
  private objects: Map<string, WorldObject> = new Map();
  private placingAreas: Map<string, PlacingArea> = new Map();
  /** Track items that have been claimed (dispatched to an agent but not yet picked up) */
  private claimedItems: Map<string, string> = new Map(); // itemId → agentId

  private constructor() {}

  public static getInstance(): InteractableRegistry {
    if (!InteractableRegistry.instance) {
      InteractableRegistry.instance = new InteractableRegistry();
    }
    return InteractableRegistry.instance;
  }

  // --- WORLD POSITION HELPERS ---

  /**
   * Get the authoritative WORLD position of an object.
   * Reads from the mesh's world matrix if available, otherwise falls back to stored position.
   * Fix for issue #6: items parented to furniture groups had local-space positions.
   */
  public getWorldPosition(objectId: string): THREE.Vector3 | null {
    const obj = this.objects.get(objectId);
    if (!obj) return null;

    if (obj.meshRef) {
      // Update world matrix to ensure it's current
      obj.meshRef.updateWorldMatrix(true, false);
      obj.meshRef.getWorldPosition(_tempWorldPos);
      return _tempWorldPos.clone();
    }

    return obj.position.clone();
  }

  /**
   * Get the authoritative WORLD position of a placing area.
   * Uses the stored area.position which includes the correct vertical offset
   * (h/2 + 0.15) computed during registration in usePlacingArea.
   * Fix: meshRef.getWorldPosition() returns the mesh CENTER, not the surface
   * top, which caused items to be embedded inside furniture surfaces.
   */
  public getAreaWorldPosition(areaId: string): THREE.Vector3 | null {
    const area = this.placingAreas.get(areaId);
    if (!area) return null;

    return area.position.clone();
  }

  // --- CLAIM SYSTEM (prevents two agents targeting the same item) ---

  public claimItem(itemId: string, agentId: string): boolean {
    if (this.claimedItems.has(itemId)) return false;
    const obj = this.objects.get(itemId);
    if (!obj || !obj.pickable || obj.carriedBy) return false;
    this.claimedItems.set(itemId, agentId);
    return true;
  }

  public unclaimItem(itemId: string, agentId: string): void {
    if (this.claimedItems.get(itemId) === agentId) {
      this.claimedItems.delete(itemId);
    }
  }

  public isItemClaimed(itemId: string): boolean {
    return this.claimedItems.has(itemId);
  }

  public getItemClaimant(itemId: string): string | null {
    return this.claimedItems.get(itemId) || null;
  }

  // --- WORLD OBJECTS ---

  public register(obj: WorldObject) {
    this.objects.set(obj.id, obj);

    // Reverse auto-snap: If a placing area already registered with this item
    // as its currentItem (race: area mounted before item), link them now.
    if (!obj.placedInArea && !obj.carriedBy) {
      for (const area of this.placingAreas.values()) {
        if (area.currentItem === obj.id) {
          obj.placedInArea = area.id;
          obj.homeAreaId = area.id;
          obj.position.copy(area.position);
          if (obj.meshRef) {
            if (obj.meshRef.parent) {
              obj.meshRef.parent.updateWorldMatrix(true, false);
              const localPos = obj.meshRef.parent.worldToLocal(
                area.position.clone(),
              );
              obj.meshRef.position.copy(localPos);
            } else {
              obj.meshRef.position.copy(area.position);
            }
          }
          break;
        }
      }
    }
  }

  public unregister(id: string) {
    this.objects.delete(id);
    this.claimedItems.delete(id);
  }

  public getById(id: string): WorldObject | undefined {
    return this.objects.get(id);
  }

  /**
   * Computes the Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const arr = [];
    for (let i = 0; i <= b.length; i++) {
      arr[i] = [i];
      for (let j = 1; j <= a.length; j++) {
        arr[i][j] =
          i === 0
            ? j
            : Math.min(
                arr[i - 1][j] + 1,
                arr[i][j - 1] + 1,
                arr[i - 1][j - 1] + (a[j - 1] === b[i - 1] ? 0 : 1),
              );
      }
    }
    return arr[b.length][a.length];
  }

  /**
   * Fallback lookup by display name using exact, substring, and fuzzy matching.
   * e.g. "Desktop PC" → finds the object with id "desktop-pc".
   */
  public getByName(name: string): WorldObject | undefined {
    const lower = name.toLowerCase().trim();

    // 1. Exact Name Match
    for (const obj of this.objects.values()) {
      if (obj.name?.toLowerCase() === lower) return obj;
    }

    // 2. Exact ID Match (sometimes the LLM hallucinates IDs as names)
    for (const obj of this.objects.values()) {
      if (obj.id?.toLowerCase() === lower) return obj;
    }

    // 3. Substring Match (e.g. "Red File" matches "Red File Folder")
    for (const obj of this.objects.values()) {
      if (
        obj.name?.toLowerCase().includes(lower) ||
        lower.includes(obj.name?.toLowerCase() || "")
      )
        return obj;
    }

    // 4. Fuzzy Levenshtein Match
    let bestMatch: WorldObject | undefined = undefined;
    let minDistance = Infinity;

    for (const obj of this.objects.values()) {
      const objName = obj.name || "";
      const dist = this.levenshteinDistance(lower, objName.toLowerCase());
      // Only consider it a match if it's reasonably close (< 50% length difference)
      if (
        dist < minDistance &&
        dist < Math.max(lower.length, objName.length) * 0.5
      ) {
        minDistance = dist;
        bestMatch = obj;
      }
    }

    return bestMatch;
  }

  /**
   * Fallback lookup for placing areas by display name using exact, substring, and fuzzy matching.
   * e.g. "Reception Desk Right" → finds area with id "reception-desk-pad-right".
   */
  public getAreaByName(name: string): PlacingArea | undefined {
    const lower = name.toLowerCase().trim();

    // 1. Exact Match
    for (const area of this.placingAreas.values()) {
      if (area.name?.toLowerCase() === lower) return area;
    }

    // 2. Exact ID Match
    for (const area of this.placingAreas.values()) {
      if (area.id?.toLowerCase() === lower) return area;
    }

    // 3. Substring Match
    for (const area of this.placingAreas.values()) {
      if (
        area.name?.toLowerCase().includes(lower) ||
        lower.includes(area.name?.toLowerCase() || "")
      )
        return area;
    }

    // 4. Fuzzy Levenshtein Match
    let bestMatch: PlacingArea | undefined = undefined;
    let minDistance = Infinity;

    for (const area of this.placingAreas.values()) {
      const areaName = area.name || "";
      const dist = this.levenshteinDistance(lower, areaName.toLowerCase());
      if (
        dist < minDistance &&
        dist < Math.max(lower.length, areaName.length) * 0.5
      ) {
        minDistance = dist;
        bestMatch = area;
      }
    }

    return bestMatch;
  }

  /**
   * Finds any empty slot belonging to a specific furniture group name.
   * e.g. If the LLM just says "lab_desk_h", this returns the first empty slot on that desk.
   */
  public getEmptyAreaByGroup(groupName: string): PlacingArea | undefined {
    // Strip trailing slot numbers just in case
    const baseGroup = groupName
      .replace(/\s*(left|right|middle|slot\s*\d+)$/i, "")
      .trim()
      .toLowerCase();

    // First try exact groupName match
    for (const area of this.placingAreas.values()) {
      if (
        !area.currentItem &&
        area.groupName &&
        area.groupName.toLowerCase() === baseGroup
      ) {
        return area;
      }
    }

    // Fall back to fuzzy name matching if groupName isn't strictly set
    for (const area of this.placingAreas.values()) {
      if (!area.currentItem && area.name.toLowerCase().includes(baseGroup)) {
        return area;
      }
    }

    return undefined;
  }

  public getAll(): WorldObject[] {
    return Array.from(this.objects.values());
  }

  public getNearby(position: THREE.Vector3, radius: number): WorldObject[] {
    const nearby: WorldObject[] = [];
    const rSq = radius * radius;
    for (const obj of this.objects.values()) {
      if (obj.carriedBy) continue;
      if (obj.position.distanceToSquared(position) < rSq) {
        nearby.push(obj);
      }
    }
    return nearby;
  }

  public getAllCarriedBy(actorId: string): WorldObject[] {
    const carried: WorldObject[] = [];
    for (const obj of this.objects.values()) {
      if (obj.carriedBy === actorId) carried.push(obj);
    }
    return carried;
  }

  /**
   * Pick up an item. Reparents the mesh to the scene root so that
   * carry-visual code doesn't fight against the original parent's transform.
   * Fix for issues #13, #14, #15.
   */
  public pickUp(objectId: string, actorId: string): boolean {
    const obj = this.objects.get(objectId);
    if (!obj || !obj.pickable || obj.carriedBy) return false;

    obj.carriedBy = actorId;

    // Remove claim now that we actually have the item
    this.claimedItems.delete(objectId);

    // Remove from any placing area slot
    for (const area of this.placingAreas.values()) {
      if (area.currentItem === objectId) {
        area.currentItem = null;
        if (obj) obj.placedInArea = null;
        break;
      }
    }

    // Hide the mesh while carried — it reappears on putDown/placeItemAt
    if (obj.meshRef) {
      obj.meshRef.visible = false;
    }

    return true;
  }

  /**
   * Drop an item at a world position (fallback when placement fails).
   */
  public putDown(objectId: string, worldPos: THREE.Vector3): boolean {
    const obj = this.objects.get(objectId);
    if (!obj || !obj.carriedBy) return false;

    obj.carriedBy = null;
    obj.placedInArea = null; // since it goes on the ground
    obj.position.copy(worldPos);

    if (obj.meshRef) {
      // Convert world position to local if the mesh has a parent
      if (obj.meshRef.parent) {
        obj.meshRef.parent.updateWorldMatrix(true, false);
        const localPos = obj.meshRef.parent.worldToLocal(worldPos.clone());
        obj.meshRef.position.copy(localPos);
      } else {
        obj.meshRef.position.copy(worldPos);
      }
      obj.meshRef.visible = true;
    }

    return true;
  }

  // --- PLACING AREAS ---

  public registerPlacingArea(area: PlacingArea) {
    this.placingAreas.set(area.id, area);

    // Auto-snap any objects initialized into this slot
    if (area.currentItem) {
      const obj = this.objects.get(area.currentItem);
      if (obj) {
        obj.placedInArea = area.id;
        obj.homeAreaId = area.id;
        obj.position.copy(area.position);
        if (obj.meshRef) {
          if (obj.meshRef.parent) {
            const localPos = obj.meshRef.parent.worldToLocal(
              area.position.clone(),
            );
            obj.meshRef.position.copy(localPos);
          } else {
            obj.meshRef.position.copy(area.position);
          }
        }
      }
    }
  }

  public unregisterPlacingArea(id: string) {
    this.placingAreas.delete(id);
  }

  public getPlacingAreaById(id: string): PlacingArea | undefined {
    return this.placingAreas.get(id);
  }

  public getAllPlacingAreas(): PlacingArea[] {
    return Array.from(this.placingAreas.values());
  }

  /**
   * Returns all placing areas that belong to a given table (desk).
   * Areas are identified by id starting with tableId + "-" (e.g. storage-table-6-pad-left).
   */
  public getPlacingAreasForTable(tableId: string): PlacingArea[] {
    return Array.from(this.placingAreas.values()).filter(
      (a) => a.id === tableId || a.id.startsWith(tableId + "-"),
    );
  }

  public getNearbyPlacingAreas(
    position: THREE.Vector3,
    radius: number,
  ): PlacingArea[] {
    const nearby: PlacingArea[] = [];
    const rSq = radius * radius;
    for (const area of this.placingAreas.values()) {
      if (area.position.distanceToSquared(position) < rSq) {
        nearby.push(area);
      }
    }
    return nearby;
  }

  /**
   * Place an item at a designated area.
   * Converts world position to local coords for the mesh's current parent.
   */
  public placeItemAt(objectId: string, areaId: string): boolean {
    const obj = this.objects.get(objectId);
    const area = this.placingAreas.get(areaId);
    if (!obj || !area) return false;

    if (area.currentItem) return false; // Full

    // Use stored area.position which has the correct vertical offset
    // (computed in usePlacingArea with h/2 + 0.15 so items sit ON TOP of surfaces)
    const placePos = area.position.clone();

    obj.carriedBy = null;
    obj.placedInArea = areaId;
    obj.position.copy(placePos);

    if (obj.meshRef) {
      // Convert world position to local if the mesh has a parent
      if (obj.meshRef.parent) {
        obj.meshRef.parent.updateWorldMatrix(true, false);
        const localPos = obj.meshRef.parent.worldToLocal(placePos.clone());
        obj.meshRef.position.copy(localPos);

        // Convert world rotation to local
        const parentInverseQuat = new THREE.Quaternion();
        obj.meshRef.parent.getWorldQuaternion(parentInverseQuat);
        parentInverseQuat.invert();
        obj.meshRef.quaternion.copy(parentInverseQuat.multiply(area.rotation));
      } else {
        obj.meshRef.position.copy(placePos);
        obj.meshRef.quaternion.copy(area.rotation);
      }
      obj.meshRef.visible = true;
    }

    area.currentItem = objectId;
    return true;
  }

  public getSlotPosition(areaId: string): THREE.Vector3 | null {
    return this.getAreaWorldPosition(areaId);
  }

  // Calculate squared distance from a point to the CLOSEST point on the area's volume (OBB)
  public getDistanceToArea(areaId: string, point: THREE.Vector3): number {
    const area = this.placingAreas.get(areaId);
    if (!area) return Infinity;

    const [w, h, d] = area.dimensions;
    const halfExtents = new THREE.Vector3(w / 2, h / 2, d / 2);

    // Transform point to local space of the area
    const localPoint = point.clone().sub(area.position);
    const inverseRotation = area.rotation.clone().invert();
    localPoint.applyQuaternion(inverseRotation);

    // Clamp point to box extents to find closest point on surface/volume
    const closestLocal = new THREE.Vector3();
    closestLocal.x = Math.max(
      -halfExtents.x,
      Math.min(halfExtents.x, localPoint.x),
    );
    closestLocal.y = Math.max(
      -halfExtents.y,
      Math.min(halfExtents.y, localPoint.y),
    );
    closestLocal.z = Math.max(
      -halfExtents.z,
      Math.min(halfExtents.z, localPoint.z),
    );

    return localPoint.distanceToSquared(closestLocal);
  }
}
