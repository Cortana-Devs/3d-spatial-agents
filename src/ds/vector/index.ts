/**
 * Vector Index Module - Main Export
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Step 5
 * 
 * High-performance vector similarity search system:
 * - LinearVectorIndex: O(n) baseline with optimized similarity calculations
 * - HNSWVectorIndex: O(log n) hierarchical navigable small world (stub)
 * - VectorManager: Unified API with automatic strategy selection
 */

// Core types and interfaces
export * from './types';

// Vector index implementations
export { LinearVectorIndex, createLinearVectorIndex } from './LinearVectorIndex';
export { HNSWVectorIndex, createHNSWVectorIndex } from './HNSWVectorIndex';

// Unified vector management
export { 
  VectorManager, 
  createVectorManager, 
  recommendVectorStrategy,
  type VectorIndexStrategy,
  type VectorManagerConfig 
} from './VectorManager';

// Re-export key types for convenience
export type {
  VectorIndex,
  VectorItem,
  VectorQuery,
  VectorQueryResult,
  VectorIndexConfig,
  HNSWConfig,
  VectorDebugInfo
} from './types';

// Utility exports
export { VectorUtils } from './types';

// Performance targets for Step 5
export const VECTOR_PERFORMANCE_TARGETS = {
  LINEAR_SEARCH_MS: 10.0,     // For 10k vectors
  HNSW_SEARCH_MS: 1.0,        // Target when implemented
  ADD_VECTOR_MS: 0.1,         // Single vector addition
  BATCH_ADD_MS: 50.0          // 1000 vectors batch
} as const;

export const VECTOR_VERSION = '1.0.0';
export const VECTOR_STEP_COMPLETED = 5;
