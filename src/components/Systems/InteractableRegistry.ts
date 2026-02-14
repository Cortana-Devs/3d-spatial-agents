import * as THREE from "three";

export interface WorldObject {
  id: string;
  name: string;
  type:
    | "file"
    | "laptop"
    | "pendrive"
    | "printer"
    | "coffeecup"
    | "generic"
    | "sofa"
    | "chair"
    | "whiteboard"
    | "projector_screen"
    | "tv"
    | "coffee_machine"
    | "telephone"
    | "pc";
  position: THREE.Vector3;
  description?: string;
  pickable: boolean;
  carriedBy: string | null; // null = on ground, 'player' or agent-id
  meshRef?: THREE.Object3D;
}

export interface PlacingArea {
  id: string;
  name: string;
  position: THREE.Vector3;
  rotation: THREE.Quaternion; // world rotation of surface
  capacity: number;
  currentItems: (string | null)[]; // IDs of placed WorldObjects or null for empty slot
  dimensions: [number, number, number]; // width, height, depth of surface slab
  allowedTypes?: WorldObject["type"][];
  meshRef?: THREE.Object3D;
}

export class InteractableRegistry {
  private static instance: InteractableRegistry;
  private objects: Map<string, WorldObject> = new Map();
  private placingAreas: Map<string, PlacingArea> = new Map();

  private constructor() {}

  public static getInstance(): InteractableRegistry {
    if (!InteractableRegistry.instance) {
      InteractableRegistry.instance = new InteractableRegistry();
    }
    return InteractableRegistry.instance;
  }

  // --- WORLD OBJECTS ---

  public register(obj: WorldObject) {
    this.objects.set(obj.id, obj);
  }

  public unregister(id: string) {
    this.objects.delete(id);
  }

  public getById(id: string): WorldObject | undefined {
    return this.objects.get(id);
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

  public pickUp(objectId: string, actorId: string): boolean {
    const obj = this.objects.get(objectId);
    if (!obj || !obj.pickable || obj.carriedBy) return false;

    obj.carriedBy = actorId;
    if (obj.meshRef) obj.meshRef.visible = false;

    // Remove from any placing area (Fixed Slot Logic)
    for (const area of this.placingAreas.values()) {
      const idx = area.currentItems.indexOf(objectId);
      if (idx !== -1) {
        area.currentItems[idx] = null; // Mark slot as empty
        break;
      }
    }
    return true;
  }

  public putDown(objectId: string, worldPos: THREE.Vector3): boolean {
    const obj = this.objects.get(objectId);
    if (!obj || !obj.carriedBy) return false;

    obj.carriedBy = null;
    obj.position.copy(worldPos);
    if (obj.meshRef) {
      // Convert world position to local parent coordinates
      if (obj.meshRef.parent) {
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

  public placeItemAt(
    objectId: string,
    areaId: string,
    targetSlotIndex?: number,
  ): boolean {
    const obj = this.objects.get(objectId);
    const area = this.placingAreas.get(areaId);
    if (!obj || !area) return false;

    // Determine target slot
    let slotIndex = -1;

    if (targetSlotIndex !== undefined) {
      if (
        targetSlotIndex >= 0 &&
        targetSlotIndex < area.capacity &&
        !area.currentItems[targetSlotIndex]
      ) {
        slotIndex = targetSlotIndex;
      } else {
        return false; // Invalid or occupied slot
      }
    } else {
      // Find first empty slot
      slotIndex = area.currentItems.findIndex((item) => !item);
      if (slotIndex === -1) return false; // Full
    }

    if (
      area.allowedTypes &&
      area.allowedTypes.length > 0 &&
      !area.allowedTypes.includes(obj.type)
    )
      return false;

    const [w, h, d] = area.dimensions;

    // Grid layout: Try to make it square-ish if possible, bounded by width
    // Heuristic: Use sqrt of capacity to estimate columns, but clamping to width/2
    const capacity = area.capacity || 100;

    let optimalCols = Math.round(Math.sqrt(capacity * (w / d)));
    optimalCols = Math.max(1, optimalCols); // At least 1 column

    const maxPossibleCols = Math.max(1, Math.floor(w / 1.5)); // Assuming item width ~1.5
    const cols = Math.min(optimalCols, maxPossibleCols, capacity);

    const col = slotIndex % cols;
    const row = Math.floor(slotIndex / cols);
    const rows = Math.ceil(capacity / cols);

    // Dynamic Spacing: Spread items evenly across the surface
    const margin = 0.8; // Use 80% of space to avoid edges
    const spacingX = (w * margin) / cols;
    const safeSpacingZ = rows > 1 ? (d * margin) / rows : 0;

    // Local offsets
    const localX = (col - (cols - 1) / 2) * spacingX;
    const localZ = rows > 1 ? (row - (rows - 1) / 2) * safeSpacingZ : 0;

    // Build offset vector in local space, then rotate to world
    const offset = new THREE.Vector3(localX, h / 2 + 0.15, localZ);
    offset.applyQuaternion(area.rotation);

    const placePos = area.position.clone().add(offset);

    obj.carriedBy = null;
    obj.position.copy(placePos);
    if (obj.meshRef) {
      // Convert world position to local parent coordinates
      if (obj.meshRef.parent) {
        const localPos = obj.meshRef.parent.worldToLocal(placePos.clone());
        obj.meshRef.position.copy(localPos);
      } else {
        obj.meshRef.position.copy(placePos);
      }
      obj.meshRef.visible = true;
    }

    area.currentItems[slotIndex] = objectId;
    return true;
  }

  public getSlotPosition(
    areaId: string,
    slotIndex: number,
  ): THREE.Vector3 | null {
    const area = this.placingAreas.get(areaId);
    if (!area) return null;

    const [w, h, d] = area.dimensions;

    // Grid layout: Try to make it square-ish if possible, bounded by width
    // Heuristic: Use sqrt of capacity to estimate columns, but clamping to width/2
    // Grid layout: Try to respect the aspect ratio of the area
    const capacity = area.capacity || 100;

    // Idea: We want cols / rows approx equal to w / d
    // cols * rows = capacity
    // cols / rows = w / d
    // => cols^2 = capacity * (w / d)
    // => cols = sqrt(capacity * w / d)

    let optimalCols = Math.round(Math.sqrt(capacity * (w / d)));
    optimalCols = Math.max(1, optimalCols); // At least 1 column

    // Clamp to available space (each item needs ~1 unit width?)
    const maxPossibleCols = Math.max(1, Math.floor(w / 1.5));
    const cols = Math.min(optimalCols, maxPossibleCols, capacity);

    const col = slotIndex % cols;
    const row = Math.floor(slotIndex / cols);
    const rows = Math.ceil(capacity / cols);

    // Dynamic Spacing: Spread items evenly across the surface
    const margin = 0.8; // Use 80% of space to avoid edges
    const spacingX = (w * margin) / cols;
    const spacingZ = rows > 1 ? (d * margin) / rows : 0; // If 1 row, Z is 0 (centered)

    // Local offsets
    const localX = (col - (cols - 1) / 2) * spacingX;
    const localZ = rows > 1 ? (row - (rows - 1) / 2) * spacingZ : 0;

    // Build offset vector in local space, then rotate to world
    const offset = new THREE.Vector3(localX, h / 2 + 0.15, localZ);
    offset.applyQuaternion(area.rotation);

    return area.position.clone().add(offset);
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
