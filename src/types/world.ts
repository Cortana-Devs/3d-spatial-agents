import type { Object3D, Quaternion, Vector3 } from "three";

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
  position: Vector3;
  description?: string;
  pickable: boolean;
  carriedBy: string | null;
  placedInArea?: string | null;
  homeAreaId?: string | null;
  meshRef?: Object3D;
  isOpen?: boolean;
}

export interface PlacingArea {
  id: string;
  name: string;
  groupId?: string;
  groupName?: string;
  slotIndex?: number;
  position: Vector3;
  rotation: Quaternion;
  currentItem: string | null;
  dimensions: [number, number, number];
  meshRef?: Object3D;
}

export interface Obstacle {
  position: Vector3;
  radius?: number;
  type?: "wall" | "furniture" | "cupboard" | "door";
  halfExtents?: Vector3;
  rotation?: number;
}
