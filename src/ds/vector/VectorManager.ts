/**
 * VectorManager - Unified Vector Index Management
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Step 5
 * 
 * Provides a unified interface for vector similarity search with automatic
 * strategy selection and performance optimization.
 */

import {
  VectorIndex,
  VectorItem,
  VectorQuery,
  VectorQueryResult,
  VectorIndexConfig,
  HNSWConfig,
  VectorDebugInfo,
  VectorEvent
} from './types';

import { LinearVectorIndex } from './LinearVectorIndex';
import { HNSWVectorIndex } from './HNSWVectorIndex';

export type VectorIndexStrategy = 'linear' | 'hnsw';

export interface VectorManagerConfig {
  preferredStrategy?: VectorIndexStrategy;
  autoOptimize?: boolean;
  optimizationThreshold?: number; // Switch to HNSW after this many items
  eventEmitter?: (event: VectorEvent) => void;
  
  // Configuration for each strategy
  linearConfig?: VectorIndexConfig;
  hnswConfig?: HNSWConfig;
}

/**
 * High-level vector index manager that automatically optimizes strategy
 */
export class VectorManager {
  private activeIndex: VectorIndex | null = null;
  private config: Required<Omit<VectorManagerConfig, 'linearConfig' | 'hnswConfig'>> & {
    linearConfig?: VectorIndexConfig;
    hnswConfig?: HNSWConfig;
  };
  
  private dimension: number;
  private needsMigration = false;

  constructor(dimension: number, config: VectorManagerConfig = {}) {
    if (dimension <= 0 || !Number.isInteger(dimension)) {
      throw new Error('Vector dimension must be positive integer');
    }

    this.dimension = dimension;
    this.config = {
      preferredStrategy: config.preferredStrategy ?? 'linear',
      autoOptimize: config.autoOptimize ?? true,
      optimizationThreshold: config.optimizationThreshold ?? 5000,
      eventEmitter: config.eventEmitter,
      linearConfig: config.linearConfig,
      hnswConfig: config.hnswConfig
    };
  }

  /**
   * Add a vector to the index
   */
  public add(item: VectorItem): void {
    this.ensureIndex();
    this.activeIndex!.add(item);
    
    if (this.config.autoOptimize) {
      this.considerOptimization();
    }
  }

  /**
   * Search for similar vectors
   */
  public search(query: VectorQuery): VectorQueryResult[] {
    this.ensureIndex();
    this.migrateIfNeeded();
    return this.activeIndex!.search(query);
  }

  /**
   * Remove a vector
   */
  public remove(itemId: string): boolean {
    if (!this.activeIndex) return false;
    return this.activeIndex.remove(itemId);
  }

  /**
   * Update a vector
   */
  public update(itemId: string, newVector: number[]): boolean {
    if (!this.activeIndex) return false;
    return this.activeIndex.update(itemId, newVector);
  }

  /**
   * Add multiple vectors in batch
   */
  public addBatch(items: VectorItem[]): void {
    this.ensureIndex();
    
    if (this.activeIndex!.addBatch) {
      this.activeIndex!.addBatch(items);
    } else {
      // Fallback to individual adds
      items.forEach(item => this.activeIndex!.add(item));
    }
    
    if (this.config.autoOptimize) {
      this.considerOptimization();
    }
  }

  /**
   * Get current size
   */
  public size(): number {
    return this.activeIndex?.size() ?? 0;
  }

  /**
   * Clear all vectors
   */
  public clear(): void {
    this.activeIndex?.clear();
    this.needsMigration = false;
  }

  /**
   * Get debug information
   */
  public debug(): VectorDebugInfo & { managerInfo: any } {
    if (!this.activeIndex) {
      return {
        indexType: 'None',
        itemCount: 0,
        dimension: this.dimension,
        strategy: 'none',
        managerInfo: {
          activeStrategy: null,
          preferredStrategy: this.config.preferredStrategy,
          autoOptimize: this.config.autoOptimize,
          needsMigration: this.needsMigration
        }
      };
    }

    const indexDebug = this.activeIndex.debug();
    return {
      ...indexDebug,
      managerInfo: {
        activeStrategy: this.activeIndex.indexType,
        preferredStrategy: this.config.preferredStrategy,
        autoOptimize: this.config.autoOptimize,
        needsMigration: this.needsMigration,
        optimizationThreshold: this.config.optimizationThreshold
      }
    };
  }

  /**
   * Switch to a specific strategy
   */
  public switchStrategy(strategy: VectorIndexStrategy): void {
    this.config.preferredStrategy = strategy;
    this.needsMigration = true;
    this.migrateIfNeeded();
  }

  /**
   * Force migration to current preferred strategy
   */
  public migrate(): void {
    if (!this.activeIndex) return;

    const items = this.getAllItems();
    this.activeIndex = null;
    this.ensureIndex();
    
    if (items.length > 0) {
      this.addBatch(items);
    }
    
    this.needsMigration = false;
  }

  /**
   * Get all items
   */
  public getAllItems(): VectorItem[] {
    if (!this.activeIndex || !('getAllItems' in this.activeIndex)) {
      return [];
    }
    return (this.activeIndex as any).getAllItems();
  }

  /**
   * Get performance recommendation for current dataset
   */
  public getPerformanceRecommendation(): {
    recommendedStrategy: VectorIndexStrategy;
    reason: string;
    currentPerformance?: any;
  } {
    const itemCount = this.size();
    
    if (itemCount < 1000) {
      return {
        recommendedStrategy: 'linear',
        reason: 'Linear scan optimal for small datasets (< 1000 items)'
      };
    } else if (itemCount < this.config.optimizationThreshold) {
      return {
        recommendedStrategy: 'linear',
        reason: `Linear scan acceptable for moderate datasets (< ${this.config.optimizationThreshold} items)`
      };
    } else {
      return {
        recommendedStrategy: 'hnsw',
        reason: `HNSW recommended for large datasets (≥ ${this.config.optimizationThreshold} items)`,
        currentPerformance: this.activeIndex ? (this.activeIndex as any).getPerformanceStats?.() : undefined
      };
    }
  }

  // Private methods

  private ensureIndex(): void {
    if (this.activeIndex) return;

    const baseConfig = {
      dimension: this.dimension,
      similarityMetric: 'cosine' as const,
      normalizeVectors: true
    };

    switch (this.config.preferredStrategy) {
      case 'linear':
        this.activeIndex = new LinearVectorIndex(
          { ...baseConfig, ...this.config.linearConfig },
          this.config.eventEmitter
        );
        break;
        
      case 'hnsw':
        this.activeIndex = new HNSWVectorIndex(
          { 
            ...baseConfig, 
            strategy: 'hnsw',
            ...this.config.hnswConfig 
          } as HNSWConfig,
          this.config.eventEmitter
        );
        break;
        
      default:
        this.activeIndex = new LinearVectorIndex(
          { ...baseConfig, ...this.config.linearConfig },
          this.config.eventEmitter
        );
    }
  }

  private migrateIfNeeded(): void {
    if (!this.needsMigration || !this.activeIndex) return;
    this.migrate();
  }

  private considerOptimization(): void {
    const itemCount = this.size();
    
    if (this.config.preferredStrategy === 'linear' && 
        itemCount >= this.config.optimizationThreshold) {
      console.log(`VectorManager: Auto-optimizing to HNSW (${itemCount} items ≥ ${this.config.optimizationThreshold})`);
      this.switchStrategy('hnsw');
    }
  }
}

/**
 * Factory function for creating VectorManager instances
 */
export function createVectorManager(
  dimension: number, 
  config?: VectorManagerConfig
): VectorManager {
  return new VectorManager(dimension, config);
}

/**
 * Utility function to recommend vector strategy
 */
export function recommendVectorStrategy(itemCount: number, dimension: number): {
  strategy: VectorIndexStrategy;
  reason: string;
} {
  if (itemCount < 1000) {
    return {
      strategy: 'linear',
      reason: 'Linear scan is optimal for small datasets and has no overhead'
    };
  } else if (dimension > 1000) {
    return {
      strategy: 'linear',
      reason: 'Very high-dimensional vectors may benefit from dimensionality reduction before HNSW'
    };
  } else {
    return {
      strategy: 'hnsw',
      reason: 'HNSW provides logarithmic search time for large datasets'
    };
  }
}
