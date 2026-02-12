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
    | "telephone";
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
  currentItems: string[]; // IDs of placed WorldObjects
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

    // Remove from any placing area
    for (const area of this.placingAreas.values()) {
      const idx = area.currentItems.indexOf(objectId);
      if (idx !== -1) {
        area.currentItems.splice(idx, 1);
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

  public placeItemAt(objectId: string, areaId: string): boolean {
    const obj = this.objects.get(objectId);
    const area = this.placingAreas.get(areaId);
    if (!obj || !area) return false;
    if (area.currentItems.length >= area.capacity) return false;
    if (
      area.allowedTypes &&
      area.allowedTypes.length > 0 &&
      !area.allowedTypes.includes(obj.type)
    )
      return false;

    const [w, h, d] = area.dimensions;
    const slotIndex = area.currentItems.length;

    // Grid layout: columns along local-X, rows along local-Z
    const maxCols = Math.max(1, Math.floor(w / 2));
    const col = slotIndex % maxCols;
    const row = Math.floor(slotIndex / maxCols);

    // Local offsets centered on surface
    const localX = (col - (maxCols - 1) / 2) * 2;
    const localZ = (row - 0.5) * 2;

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

    area.currentItems.push(objectId);
    return true;
  }
}
