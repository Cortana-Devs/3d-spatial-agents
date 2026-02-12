import * as THREE from "three";

export interface WorldObject {
  id: string;
  name: string;
  type: "file" | "laptop" | "pendrive" | "printer" | "coffeecup" | "generic";
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
  capacity: number;
  currentItems: string[]; // IDs of placed WorldObjects
  dimensions?: [number, number, number]; // width, height, depth for visualization
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

  public putDown(objectId: string, position: THREE.Vector3): boolean {
    const obj = this.objects.get(objectId);
    if (!obj || !obj.carriedBy) return false;

    obj.carriedBy = null;
    obj.position.copy(position);
    if (obj.meshRef) {
      obj.meshRef.position.copy(position);
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

    // Calculate offset position on the surface
    const offset = area.currentItems.length * 1.5; // Spread items along X
    const placePos = area.position.clone();
    placePos.x += offset;
    placePos.y += 0.3; // Slightly above surface

    obj.carriedBy = null;
    obj.position.copy(placePos);
    if (obj.meshRef) {
      obj.meshRef.position.copy(placePos);
      obj.meshRef.visible = true;
    }

    area.currentItems.push(objectId);
    return true;
  }
}
