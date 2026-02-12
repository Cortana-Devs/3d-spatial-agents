import * as THREE from "three";

export interface WorldObject {
  id: string;
  name: string;
  type: "file" | "laptop" | "pendrive" | "printer" | "coffeecup" | "generic";
  position: THREE.Vector3;
  description?: string;
  pickable: boolean; // Can be picked up?
  carriedBy: string | null; // null = on ground, 'player' or agent-id
  meshRef?: THREE.Object3D; // For visual updates (glow, hide)
}

export class InteractableRegistry {
  private static instance: InteractableRegistry;
  private objects: Map<string, WorldObject> = new Map();

  private constructor() {}

  public static getInstance(): InteractableRegistry {
    if (!InteractableRegistry.instance) {
      InteractableRegistry.instance = new InteractableRegistry();
    }
    return InteractableRegistry.instance;
  }

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
      if (obj.carriedBy) continue; // Don't count carried objects as "nearby" in the world
      if (obj.position.distanceToSquared(position) < rSq) {
        nearby.push(obj);
      }
    }
    return nearby;
  }

  public getCarriedBy(actorId: string): WorldObject | undefined {
    for (const obj of this.objects.values()) {
      if (obj.carriedBy === actorId) return obj;
    }
    return undefined;
  }

  public pickUp(objectId: string, actorId: string): boolean {
    const obj = this.objects.get(objectId);
    if (!obj || !obj.pickable || obj.carriedBy) return false;

    obj.carriedBy = actorId;
    if (obj.meshRef) obj.meshRef.visible = false; // Hide from world
    return true;
  }

  public putDown(objectId: string, position: THREE.Vector3): boolean {
    const obj = this.objects.get(objectId);
    if (!obj || !obj.carriedBy) return false;

    obj.carriedBy = null;
    obj.position.copy(position);
    if (obj.meshRef) {
      obj.meshRef.position.copy(position);
      obj.meshRef.visible = true; // Show in world
    }
    return true;
  }
}
