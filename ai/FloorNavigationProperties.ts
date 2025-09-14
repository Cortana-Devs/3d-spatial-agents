import { Vector3 } from "three";

export interface NavigationNode {
  position: Vector3;
  connections: NavigationNode[];
  cost: number;
  type: "walkable" | "restricted" | "blocked";
}

export interface FloorNavigationProperties {
  walkable: boolean;
  safetyLevel: "safe" | "caution" | "risky" | "dangerous";
  navigationCost: number;
  slippery: boolean;
  height: number;
  transparencyLevel: number;
}

export interface FloorLike {
  position?: { y?: number };
  material?: { opacity?: number; roughness?: number };
  properties?: { walkable?: boolean; slippery?: boolean };
}

export class NavigationMesh {
  nodes: NavigationNode[] = [];

  addNode(node: NavigationNode) {
    this.nodes.push(node);
  }

  findPath(_start: Vector3, _end: Vector3): Vector3[] {
    // A* pathfinding implementation
    return [];
  }
}

export const calculateNavigationProperties = (
  floorType: string,
  transparency: number,
  height: number,
): FloorNavigationProperties => {
  return {
    walkable: true,
    safetyLevel: "safe",
    navigationCost: 1.0,
    slippery: false,
    height,
    transparencyLevel: transparency,
  };
};

export class FloorNavigationAnalyzer {
  static analyzeFloorForAI(floor: FloorLike): FloorNavigationProperties {
    return {
      walkable: floor.properties?.walkable ?? true,
      safetyLevel: this.determineSafetyLevel(floor),
      navigationCost: this.calculateNavigationCost(floor),
      slippery: this.isSlippery(floor),
      height: floor.position?.y ?? 0,
      transparencyLevel: floor.material?.opacity ?? 1,
    };
  }

  private static determineSafetyLevel(
    floor: FloorLike,
  ): "safe" | "caution" | "risky" | "dangerous" {
    if (floor.material?.opacity < 0.3) return "dangerous";
    if (floor.material?.opacity < 0.5) return "risky";
    if (floor.material?.opacity < 0.7) return "caution";
    return "safe";
  }

  private static calculateNavigationCost(floor: FloorLike): number {
    let cost = 1.0;
    if (floor.material?.opacity < 1) cost += (1 - floor.material.opacity) * 0.5;
    if (this.isSlippery(floor)) cost += 0.3;
    return cost;
  }

  private static isSlippery(floor: FloorLike): boolean {
    return (
      floor.material?.roughness < 0.3 || floor.properties?.slippery === true
    );
  }
}
