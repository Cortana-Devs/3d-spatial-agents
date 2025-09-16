/**
 * Vector Index Types & Interfaces
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Step 5
 * 
 * High-performance vector similarity search with pluggable strategies:
 * - Linear scan baseline (cosine similarity)
 * - HNSW (Hierarchical Navigable Small World) stub for future optimization
 */

import { DSError, DSErrorCode, DSEvent, DS_API_VERSION } from '../types';

// Re-export for vector modules
export { DS_API_VERSION };

// Core vector types
export interface VectorItem {
  id: string;
  vector: number[];
  metadata?: Record<string, unknown>;
}

export interface VectorQuery {
  vector: number[];
  k?: number; // Number of nearest neighbors to return
  threshold?: number; // Minimum similarity threshold
  filter?: (item: VectorItem) => boolean;
}

export interface VectorQueryResult {
  item: VectorItem;
  similarity: number; // Cosine similarity score [0, 1]
  distance?: number;  // Euclidean distance (optional)
}

export interface VectorIndexConfig {
  dimension: number;
  similarityMetric?: 'cosine' | 'euclidean' | 'dot';
  strategy?: 'linear' | 'hnsw';
  normalizeVectors?: boolean;
}

export interface HNSWConfig extends VectorIndexConfig {
  strategy: 'hnsw';
  maxConnections?: number;    // M parameter
  efConstruction?: number;    // efConstruction parameter  
  efSearch?: number;          // efSearch parameter
  levelGenerationFactor?: number; // mL parameter
}

// Unified vector index interface
export interface VectorIndex {
  readonly apiVersion: typeof DS_API_VERSION;
  readonly indexType: 'LinearVectorIndex' | 'HNSWVectorIndex';
  readonly config: VectorIndexConfig;
  
  // Core operations
  add(item: VectorItem): void;
  search(query: VectorQuery): VectorQueryResult[];
  remove(itemId: string): boolean;
  update(itemId: string, newVector: number[]): boolean;
  
  // Batch operations for efficiency
  addBatch?(items: VectorItem[]): void;
  
  // Diagnostics
  debug(): VectorDebugInfo;
  clear(): void;
  size(): number;
}

export interface VectorDebugInfo {
  indexType: string;
  itemCount: number;
  dimension: number;
  strategy: string;
  memoryUsage?: number;
  searchStats?: {
    totalSearches: number;
    avgSearchTime: number;
    avgResultCount: number;
  };
  indexStats?: {
    // For HNSW
    levels?: number;
    connections?: number;
    // For Linear
    vectorsNormalized?: boolean;
  };
}

// Vector utility functions
export const VectorUtils = {
  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new VectorError('DS_VECTOR_DIM_MISMATCH', 'Vector dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0; // Handle zero vectors
    }

    return dotProduct / (normA * normB);
  },

  /**
   * Calculate Euclidean distance between two vectors
   */
  euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new VectorError('DS_VECTOR_DIM_MISMATCH', 'Vector dimensions must match');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  },

  /**
   * Calculate dot product
   */
  dotProduct(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new VectorError('DS_VECTOR_DIM_MISMATCH', 'Vector dimensions must match');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  },

  /**
   * Normalize vector to unit length
   */
  normalize(vector: number[]): number[] {
    let norm = 0;
    for (let i = 0; i < vector.length; i++) {
      norm += vector[i] * vector[i];
    }
    
    norm = Math.sqrt(norm);
    if (norm === 0) {
      return [...vector]; // Return copy of zero vector
    }

    return vector.map(x => x / norm);
  },

  /**
   * Calculate vector magnitude
   */
  magnitude(vector: number[]): number {
    let sum = 0;
    for (let i = 0; i < vector.length; i++) {
      sum += vector[i] * vector[i];
    }
    return Math.sqrt(sum);
  },

  /**
   * Validate vector dimensions
   */
  validateDimension(vector: number[], expectedDim: number): void {
    if (vector.length !== expectedDim) {
      throw new VectorError(
        'DS_VECTOR_DIM_MISMATCH', 
        `Vector dimension ${vector.length} does not match expected ${expectedDim}`
      );
    }
  },

  /**
   * Create random vector for testing
   */
  random(dimension: number, normalize = false): number[] {
    const vector = Array.from({ length: dimension }, () => Math.random() - 0.5);
    return normalize ? this.normalize(vector) : vector;
  }
};

// Vector-specific error types
export type VectorErrorCode = 
  | 'DS_VECTOR_DIM_MISMATCH'
  | 'DS_VECTOR_ITEM_NOT_FOUND'
  | 'DS_VECTOR_DUPLICATE_ID'
  | 'DS_VECTOR_INVALID_CONFIG'
  | 'DS_VECTOR_INDEX_NOT_BUILT'
  | 'DS_VECTOR_INVALID_VECTOR'
  | 'DS_VECTOR_STRATEGY_UNSUPPORTED';

export class VectorError extends DSError {
  constructor(code: VectorErrorCode, message: string, context?: unknown) {
    super(code as DSErrorCode, message, context);
    this.name = 'VectorError';
  }
}

// Vector event types (already included in main DSEventType)
export type VectorEventType = Extract<
  import('../types').DSEventType,
  'ds:vector:add' | 'ds:vector:search'
>;

export interface VectorEvent extends DSEvent {
  type: VectorEventType;
  payload: {
    indexType: string;
    operation?: string;
    itemId?: string;
    searchTime?: number;
    resultCount?: number;
    dimension?: number;
    [key: string]: unknown;
  };
}
