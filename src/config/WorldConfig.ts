import * as THREE from 'three';

export interface WallDef {
  id: string;
  position: [number, number, number];
  size: [number, number, number]; // width, height, thickness
  rotationY?: number;
  isWindow?: boolean;
  color?: string;
  transparent?: boolean;
  opacity?: number;
}

export interface FloorDef {
  id: string;
  position: [number, number, number];
  size: [number, number, number]; // width, thickness, depth
  color: string;
}

export interface FurnitureDef {
  id: string;
  type: string;
  position: [number, number, number];
  rotationY?: number;
  [key: string]: any; // custom props
}

export interface WorldDefinition {
  name: string;
  walls: WallDef[];
  floors: FloorDef[];
  furniture: FurnitureDef[];
}
