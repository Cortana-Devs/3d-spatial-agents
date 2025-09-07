import { Vector3 } from "three";
import {
  NavigationMesh,
  NavigationNode,
  FloorNavigationProperties,
  FloorLike,
} from "./FloorNavigationProperties";

export class TransparentNavMeshGenerator {
  private mesh: NavigationMesh;

  constructor() {
    this.mesh = new NavigationMesh();
  }

  generateNavMesh(floors: FloorLike[]): NavigationMesh {
    // Implementation for nav mesh generation
    void floors;
    return this.mesh;
  }

  updateNode(position: Vector3, properties: FloorNavigationProperties): void {
    const node: NavigationNode = {
      position,
      connections: [],
      cost: properties.navigationCost,
      type: properties.walkable ? "walkable" : "blocked",
    };
    this.mesh.addNode(node);
  }

  getNavigablePath(start: Vector3, end: Vector3): Vector3[] {
    return this.mesh.findPath(start, end);
  }
}
