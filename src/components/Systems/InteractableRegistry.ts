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
  currentItem: string | null; // ID of placed WorldObject or null for empty slot
  dimensions: [number, number, number]; // width, height, depth of surface slab
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
      if (area.currentItem === objectId) {
        area.currentItem = null; // Mark slot as empty
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

    // Auto-snap any objects initialized into this slot
    if (area.currentItem) {
      const obj = this.objects.get(area.currentItem);
      if (obj) {
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

    if (area.currentItem) return false; // Full

    const placePos = area.position.clone();

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

    area.currentItem = objectId;
    return true;
  }

  public getSlotPosition(areaId: string): THREE.Vector3 | null {
    const area = this.placingAreas.get(areaId);
    if (!area) return null;

    return area.position.clone();
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
