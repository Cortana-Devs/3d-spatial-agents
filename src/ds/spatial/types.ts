/**
 * Spatial Data Structures - Types & Interfaces
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Step 4
 * 
 * Unified spatial indexing system supporting:
 * - StaticBVH: Build-once spatial index for static geometry
 * - DynamicAABBTree: Insert/move/remove for dynamic objects  
 * - UniformGridHash: Fast broad-phase fallback for collision detection
 */

import { DSError, DSErrorCode, DSEvent, DS_API_VERSION } from '../types';

// Re-export for spatial modules
export { DS_API_VERSION };

// Core spatial types
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface AABB {
  min: Vector3;
  max: Vector3;
}

export interface SpatialItem {
  id: string;
  bounds: AABB;
  userData?: unknown;
}

// Query interfaces
export interface SpatialQuery {
  bounds: AABB;
  maxResults?: number;
  filter?: (item: SpatialItem) => boolean;
}

export interface SpatialQueryResult {
  item: SpatialItem;
  distance?: number; // For nearest queries
}

// Unified spatial index interface
export interface SpatialIndex {
  readonly apiVersion: typeof DS_API_VERSION;
  readonly indexType: 'StaticBVH' | 'DynamicAABBTree' | 'UniformGridHash';
  
  // Core operations
  query(query: SpatialQuery): SpatialQueryResult[];
  raycast?(origin: Vector3, direction: Vector3, maxDistance?: number): SpatialQueryResult[];
  nearest?(point: Vector3, maxDistance?: number): SpatialQueryResult | null;
  
  // Dynamic operations (for DynamicAABBTree)
  insert?(item: SpatialItem): void;
  update?(itemId: string, newBounds: AABB): boolean;
  remove?(itemId: string): boolean;
  
  // Build operations (for StaticBVH)
  build?(items: SpatialItem[]): void;
  
  // Diagnostics
  debug(): SpatialDebugInfo;
}

export interface SpatialDebugInfo {
  indexType: string;
  itemCount: number;
  nodeCount?: number;
  depth?: number;
  memoryUsage?: number;
  lastRebuild?: number;
  queryStats?: {
    totalQueries: number;
    avgQueryTime: number;
    avgResultCount: number;
  };
}

// Configuration interfaces
export interface StaticBVHConfig {
  maxItemsPerLeaf?: number;
  maxDepth?: number;
  splitStrategy?: 'median' | 'sah'; // Surface Area Heuristic
}

export interface DynamicAABBConfig {
  fattenFactor?: number; // How much to expand AABBs for stability
  rebuildThreshold?: number; // Rebuild tree after this many operations
  maxDepth?: number;
}

export interface UniformGridConfig {
  cellSize: number;
  worldBounds: AABB;
  maxItemsPerCell?: number;
}

// Utility functions for AABB operations
export const AABB = {
  /**
   * Create AABB from center and size
   */
  fromCenterAndSize(center: Vector3, size: Vector3): AABB {
    const halfSize = { x: size.x / 2, y: size.y / 2, z: size.z / 2 };
    return {
      min: { x: center.x - halfSize.x, y: center.y - halfSize.y, z: center.z - halfSize.z },
      max: { x: center.x + halfSize.x, y: center.y + halfSize.y, z: center.z + halfSize.z }
    };
  },

  /**
   * Check if two AABBs overlap
   */
  overlaps(a: AABB, b: AABB): boolean {
    return a.min.x <= b.max.x && a.max.x >= b.min.x &&
           a.min.y <= b.max.y && a.max.y >= b.min.y &&
           a.min.z <= b.max.z && a.max.z >= b.min.z;
  },

  /**
   * Check if AABB contains point
   */
  containsPoint(aabb: AABB, point: Vector3): boolean {
    return point.x >= aabb.min.x && point.x <= aabb.max.x &&
           point.y >= aabb.min.y && point.y <= aabb.max.y &&
           point.z >= aabb.min.z && point.z <= aabb.max.z;
  },

  /**
   * Get AABB surface area (for SAH calculations)
   */
  surfaceArea(aabb: AABB): number {
    const dx = aabb.max.x - aabb.min.x;
    const dy = aabb.max.y - aabb.min.y;
    const dz = aabb.max.z - aabb.min.z;
    return 2 * (dx * dy + dy * dz + dx * dz);
  },

  /**
   * Expand AABB to include another AABB
   */
  union(a: AABB, b: AABB): AABB {
    return {
      min: {
        x: Math.min(a.min.x, b.min.x),
        y: Math.min(a.min.y, b.min.y),
        z: Math.min(a.min.z, b.min.z)
      },
      max: {
        x: Math.max(a.max.x, b.max.x),
        y: Math.max(a.max.y, b.max.y),
        z: Math.max(a.max.z, b.max.z)
      }
    };
  },

  /**
   * Expand AABB by a factor (for fattening in dynamic trees)
   */
  fatten(aabb: AABB, factor: number): AABB {
    const dx = (aabb.max.x - aabb.min.x) * factor;
    const dy = (aabb.max.y - aabb.min.y) * factor;
    const dz = (aabb.max.z - aabb.min.z) * factor;
    
    return {
      min: { x: aabb.min.x - dx, y: aabb.min.y - dy, z: aabb.min.z - dz },
      max: { x: aabb.max.x + dx, y: aabb.max.y + dy, z: aabb.max.z + dz }
    };
  },

  /**
   * Get center point of AABB
   */
  center(aabb: AABB): Vector3 {
    return {
      x: (aabb.min.x + aabb.max.x) / 2,
      y: (aabb.min.y + aabb.max.y) / 2,
      z: (aabb.min.z + aabb.max.z) / 2
    };
  },

  /**
   * Get size of AABB
   */
  size(aabb: AABB): Vector3 {
    return {
      x: aabb.max.x - aabb.min.x,
      y: aabb.max.y - aabb.min.y,
      z: aabb.max.z - aabb.min.z
    };
  }
};

// Vector3 utilities
export const Vec3 = {
  /**
   * Distance between two points
   */
  distance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  },

  /**
   * Add two vectors
   */
  add(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  },

  /**
   * Subtract two vectors
   */
  subtract(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  },

  /**
   * Scale vector by factor
   */
  scale(v: Vector3, factor: number): Vector3 {
    return { x: v.x * factor, y: v.y * factor, z: v.z * factor };
  },

  /**
   * Normalize vector
   */
  normalize(v: Vector3): Vector3 {
    const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (length === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / length, y: v.y / length, z: v.z / length };
  }
};

// Spatial event types (defined in main types.ts)
export type SpatialEventType = Extract<
  import('../types').DSEventType,
  'ds:spatial:insert' | 'ds:spatial:update' | 'ds:spatial:remove' | 
  'ds:spatial:query' | 'ds:spatial:rebuild' | 'ds:spatial:collision'
>;

export interface SpatialEvent extends DSEvent {
  type: SpatialEventType;
  payload: {
    indexType: string;
    operation?: string;
    itemId?: string;
    queryTime?: number;
    resultCount?: number;
    [key: string]: unknown;
  };
}

// Error codes specific to spatial structures
export type SpatialErrorCode = 
  | 'DS_SPATIAL_INVALID_AABB'
  | 'DS_SPATIAL_ITEM_NOT_FOUND' 
  | 'DS_SPATIAL_BUILD_REQUIRED'
  | 'DS_SPATIAL_GRID_OUT_OF_BOUNDS'
  | 'DS_SPATIAL_MAX_DEPTH_EXCEEDED';

export class SpatialError extends DSError {
  constructor(code: SpatialErrorCode, message: string, context?: unknown) {
    super(code as DSErrorCode, message, context);
    this.name = 'SpatialError';
  }
}
