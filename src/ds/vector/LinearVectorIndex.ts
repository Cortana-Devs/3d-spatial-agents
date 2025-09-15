/**
 * LinearVectorIndex - Baseline Vector Similarity Search
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Step 5
 * 
 * Simple but reliable linear scan vector index with cosine similarity.
 * Serves as baseline for performance comparisons and fallback for HNSW.
 * 
 * Performance Target: O(n) search, optimized with early termination
 * Memory: O(n * d) where n = items, d = vector dimension
 */

import { 
  VectorIndex, 
  VectorItem, 
  VectorQuery, 
  VectorQueryResult,
  VectorIndexConfig,
  VectorDebugInfo,
  VectorEvent,
  VectorError,
  VectorUtils,
  DS_API_VERSION 
} from './types';

export class LinearVectorIndex implements VectorIndex {
  public readonly apiVersion = DS_API_VERSION;
  public readonly indexType = 'LinearVectorIndex' as const;
  public readonly config: VectorIndexConfig;

  private items = new Map<string, VectorItem>();
  private normalizedVectors = new Map<string, number[]>(); // For cosine similarity optimization
  
  private stats = {
    totalSearches: 0,
    totalSearchTime: 0,
    totalResults: 0,
    vectorsAdded: 0,
    vectorsRemoved: 0,
    vectorsUpdated: 0
  };

  private eventEmitter?: (event: VectorEvent) => void;

  constructor(config: VectorIndexConfig, eventEmitter?: (event: VectorEvent) => void) {
    // Validate configuration
    if (config.dimension <= 0 || !Number.isInteger(config.dimension)) {
      throw new VectorError('DS_VECTOR_INVALID_CONFIG', 'Dimension must be positive integer');
    }

    this.config = {
      dimension: config.dimension,
      similarityMetric: config.similarityMetric ?? 'cosine',
      strategy: 'linear',
      normalizeVectors: config.normalizeVectors ?? true
    };

    this.eventEmitter = eventEmitter;
  }

  /**
   * Add a vector to the index
   */
  public add(item: VectorItem): void {
    if (this.items.has(item.id)) {
      throw new VectorError('DS_VECTOR_DUPLICATE_ID', `Vector with id ${item.id} already exists`);
    }

    VectorUtils.validateDimension(item.vector, this.config.dimension);

    // Store original item
    this.items.set(item.id, { ...item });

    // Store normalized version if using cosine similarity
    if (this.config.normalizeVectors && this.config.similarityMetric === 'cosine') {
      this.normalizedVectors.set(item.id, VectorUtils.normalize(item.vector));
    }

    this.stats.vectorsAdded++;

    this.eventEmitter?.({
      type: 'ds:vector:add',
      timestamp: Date.now(),
      payload: {
        indexType: this.indexType,
        operation: 'add',
        itemId: item.id,
        dimension: item.vector.length
      }
    });
  }

  /**
   * Search for similar vectors
   */
  public search(query: VectorQuery): VectorQueryResult[] {
    const searchStart = performance.now();
    
    VectorUtils.validateDimension(query.vector, this.config.dimension);

    const results: VectorQueryResult[] = [];
    const k = query.k ?? 10;
    const threshold = query.threshold ?? 0.0;

    // Normalize query vector if needed
    const queryVector = this.config.normalizeVectors && this.config.similarityMetric === 'cosine'
      ? VectorUtils.normalize(query.vector)
      : query.vector;

    // Linear scan through all vectors
    this.items.forEach((item, itemId) => {
      // Apply filter if provided
      if (query.filter && !query.filter(item)) {
        return;
      }

      // Calculate similarity
      const similarity = this.calculateSimilarity(queryVector, item, itemId);

      // Skip if below threshold
      if (similarity < threshold) {
        return;
      }

      // Add to results
      const result: VectorQueryResult = {
        item,
        similarity
      };

      // Calculate distance if using euclidean metric
      if (this.config.similarityMetric === 'euclidean') {
        result.distance = VectorUtils.euclideanDistance(query.vector, item.vector);
      }

      results.push(result);
    });

    // Sort by similarity (descending) and take top k
    results.sort((a, b) => b.similarity - a.similarity);
    if (results.length > k) {
      results.length = k;
    }

    // Update statistics
    const searchTime = performance.now() - searchStart;
    this.stats.totalSearches++;
    this.stats.totalSearchTime += searchTime;
    this.stats.totalResults += results.length;

    this.eventEmitter?.({
      type: 'ds:vector:search',
      timestamp: Date.now(),
      payload: {
        indexType: this.indexType,
        operation: 'search',
        searchTime,
        resultCount: results.length,
        k,
        threshold
      }
    });

    return results;
  }

  /**
   * Remove a vector from the index
   */
  public remove(itemId: string): boolean {
    if (!this.items.has(itemId)) {
      return false;
    }

    this.items.delete(itemId);
    this.normalizedVectors.delete(itemId);
    this.stats.vectorsRemoved++;

    return true;
  }

  /**
   * Update a vector in the index
   */
  public update(itemId: string, newVector: number[]): boolean {
    const item = this.items.get(itemId);
    if (!item) {
      return false;
    }

    VectorUtils.validateDimension(newVector, this.config.dimension);

    // Update the vector
    item.vector = [...newVector];

    // Update normalized version if needed
    if (this.config.normalizeVectors && this.config.similarityMetric === 'cosine') {
      this.normalizedVectors.set(itemId, VectorUtils.normalize(newVector));
    }

    this.stats.vectorsUpdated++;
    return true;
  }

  /**
   * Add multiple vectors in batch (more efficient)
   */
  public addBatch(items: VectorItem[]): void {
    const batchStart = performance.now();
    let addedCount = 0;

    for (const item of items) {
      try {
        this.add(item);
        addedCount++;
      } catch (error) {
        // Log error but continue with batch
        console.warn(`Failed to add vector ${item.id}:`, error);
      }
    }

    const batchTime = performance.now() - batchStart;
    console.log(`Added ${addedCount}/${items.length} vectors in ${batchTime.toFixed(2)}ms`);
  }

  /**
   * Get current size of the index
   */
  public size(): number {
    return this.items.size;
  }

  /**
   * Clear all vectors from the index
   */
  public clear(): void {
    this.items.clear();
    this.normalizedVectors.clear();
    
    this.stats = {
      totalSearches: 0,
      totalSearchTime: 0,
      totalResults: 0,
      vectorsAdded: 0,
      vectorsRemoved: 0,
      vectorsUpdated: 0
    };
  }

  /**
   * Get debug information about the index
   */
  public debug(): VectorDebugInfo {
    const avgSearchTime = this.stats.totalSearches > 0 
      ? this.stats.totalSearchTime / this.stats.totalSearches 
      : 0;
    
    const avgResultCount = this.stats.totalSearches > 0
      ? this.stats.totalResults / this.stats.totalSearches
      : 0;

    return {
      indexType: this.indexType,
      itemCount: this.items.size,
      dimension: this.config.dimension,
      strategy: this.config.strategy ?? 'linear',
      memoryUsage: this.estimateMemoryUsage(),
      searchStats: {
        totalSearches: this.stats.totalSearches,
        avgSearchTime,
        avgResultCount
      },
      indexStats: {
        vectorsNormalized: this.config.normalizeVectors ?? false
      }
    };
  }

  /**
   * Get all items in the index
   */
  public getAllItems(): VectorItem[] {
    return Array.from(this.items.values());
  }

  // Private implementation methods

  private calculateSimilarity(queryVector: number[], item: VectorItem, itemId: string): number {
    const itemVector = this.config.normalizeVectors && this.config.similarityMetric === 'cosine'
      ? this.normalizedVectors.get(itemId) ?? item.vector
      : item.vector;

    switch (this.config.similarityMetric) {
      case 'cosine':
        return VectorUtils.cosineSimilarity(queryVector, itemVector);
      
      case 'euclidean':
        // Convert distance to similarity (inverse relationship)
        const distance = VectorUtils.euclideanDistance(queryVector, itemVector);
        return 1 / (1 + distance);
      
      case 'dot':
        return VectorUtils.dotProduct(queryVector, itemVector);
      
      default:
        return VectorUtils.cosineSimilarity(queryVector, itemVector);
    }
  }

  private estimateMemoryUsage(): number {
    const vectorSize = this.config.dimension * 8; // 8 bytes per number
    const itemOverhead = 200; // Rough estimate for item metadata
    const normalizedOverhead = this.config.normalizeVectors ? vectorSize : 0;
    
    return this.items.size * (vectorSize + itemOverhead + normalizedOverhead);
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    avgSearchTimeMs: number;
    searchThroughput: number;
    vectorsPerSecond: number;
    totalOperations: number;
  } {
    const avgSearchTime = this.stats.totalSearches > 0 
      ? this.stats.totalSearchTime / this.stats.totalSearches 
      : 0;

    const searchThroughput = avgSearchTime > 0 ? 1000 / avgSearchTime : 0;
    
    const totalOperations = this.stats.vectorsAdded + this.stats.vectorsRemoved + this.stats.vectorsUpdated;

    return {
      avgSearchTimeMs: avgSearchTime,
      searchThroughput,
      vectorsPerSecond: 0, // Would need time tracking
      totalOperations
    };
  }
}

/**
 * Factory function for creating LinearVectorIndex instances
 */
export function createLinearVectorIndex(
  config: VectorIndexConfig,
  eventEmitter?: (event: VectorEvent) => void
): LinearVectorIndex {
  return new LinearVectorIndex(config, eventEmitter);
}
