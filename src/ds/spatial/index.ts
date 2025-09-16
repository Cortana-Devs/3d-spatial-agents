/**
 * Spatial Data Structures - Main Export Module
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Step 4
 * 
 * High-performance spatial indexing system with multiple strategies:
 * - StaticBVH: Optimal for static geometry (build once, query many)
 * - DynamicAABBTree: Self-balancing tree for dynamic objects
 * - UniformGridHash: Fast broad-phase spatial hashing
 * - SpatialManager: Unified API with automatic optimization
 */

// Core types and interfaces
export * from './types';

// Individual spatial index implementations
export { StaticBVH, createStaticBVH } from './StaticBVH';
export { DynamicAABBTree, createDynamicAABBTree } from './DynamicAABBTree';
export { UniformGridHash, createUniformGridHash } from './UniformGridHash';

// Unified spatial management
export { 
  SpatialManager, 
  createSpatialManager, 
  recommendIndexType,
  type SpatialIndexType,
  type SpatialManagerConfig 
} from './SpatialManager';

// Re-export key types for convenience
export type {
  SpatialIndex,
  SpatialItem,
  SpatialQuery,
  SpatialQueryResult,
  SpatialDebugInfo,
  StaticBVHConfig,
  DynamicAABBConfig,
  UniformGridConfig,
  Vector3,
  AABB
} from './types';

// Utility exports  
export { Vec3 } from './types';

// Performance targets and compliance info
export const SPATIAL_PERFORMANCE_TARGETS = {
  BVH_BUILD_TIME_MS: 100,      // For 10k items
  DYNAMIC_INSERT_MS: 0.1,      // O(log n) target
  GRID_QUERY_MS: 1.0,          // O(1 + k) target
  RAYCAST_MS: 2.0              // Depends on distance
} as const;

export const SPATIAL_VERSION = '1.0.0';
export const SPATIAL_STEP_COMPLETED = 4;
