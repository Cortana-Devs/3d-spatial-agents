/**
 * ObjectPool - Memory Allocation Optimization
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Step 8
 * 
 * REAL-WORLD APPLICATIONS IN YOUR SYSTEM:
 * - Pool Three.js objects (Vector3, Matrix4, Quaternion) for GPU renderer
 * - Pool collision detection arrays for physics system
 * - Pool temporary scoring arrays for memory retrieval
 * - Pool spatial query result arrays to prevent GC pressure
 */

import { DSError, DSErrorCode, DSEvent, DS_API_VERSION } from '../types';

export interface ObjectPoolConfig<T> {
  factory: () => T;                    // How to create new objects
  reset: (obj: T) => void;            // How to reset objects for reuse
  validate?: (obj: T) => boolean;     // Optional validation before reuse
  initialSize?: number;               // Pre-allocate this many objects
  maxSize?: number;                   // Maximum pool size (prevent memory leaks)
  trackUsage?: boolean;               // Track object checkout/checkin for debugging
}

export interface PoolStats {
  totalCreated: number;
  currentSize: number;
  inUse: number;
  available: number;
  expansions: number;
  resetErrors: number;
  memoryEstimate: number;
}

export class ObjectPool<T> {
  public readonly apiVersion = DS_API_VERSION;
  
  private pool: T[] = [];
  private inUse = new Set<T>();
  private config: Required<Omit<ObjectPoolConfig<T>, 'validate' | 'trackUsage'>> & {
    validate?: (obj: T) => boolean;
    trackUsage?: boolean;
  };
  
  private stats: PoolStats = {
    totalCreated: 0,
    currentSize: 0,
    inUse: 0,
    available: 0,
    expansions: 0,
    resetErrors: 0,
    memoryEstimate: 0
  };

  // Usage tracking for debugging (only in development)
  private usageTracking = new Map<T, { checkedOut: number; stack?: string }>();
  private eventEmitter?: (event: DSEvent) => void;

  constructor(config: ObjectPoolConfig<T>, eventEmitter?: (event: DSEvent) => void) {
    this.config = {
      factory: config.factory,
      reset: config.reset,
      validate: config.validate,
      initialSize: config.initialSize ?? 10,
      maxSize: config.maxSize ?? 1000,
      trackUsage: config.trackUsage ?? false
    };
    
    this.eventEmitter = eventEmitter;
    
    // Pre-allocate initial objects
    this.expandPool(this.config.initialSize);
  }

  /**
   * REAL USE CASE: Get object from pool for use
   * Returns reused object or creates new one if pool empty
   */
  public acquire(): T {
    let obj: T;
    
    // Try to reuse from pool
    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
      
      // Validate object if validator provided
      if (this.config.validate && !this.config.validate(obj)) {
        // Object failed validation, create new one
        obj = this.createNewObject();
      }
    } else {
      // Pool empty, check if we can expand
      if (this.stats.totalCreated >= this.config.maxSize) {
        throw new DSError(
          'DS_POOL_EXHAUSTED', 
          `Object pool exhausted: ${this.stats.totalCreated}/${this.config.maxSize} objects in use`
        );
      }
      
      obj = this.createNewObject();
    }
    
    // Track usage
    this.inUse.add(obj);
    this.updateStats();
    
    if (this.config.trackUsage) {
      this.usageTracking.set(obj, {
        checkedOut: Date.now(),
        stack: process.env.NODE_ENV === 'development' ? new Error().stack : undefined
      });
    }
    
    return obj;
  }

  /**
   * REAL USE CASE: Return object to pool for reuse
   * Resets object state and makes it available for reuse
   */
  public release(obj: T): void {
    if (!this.inUse.has(obj)) {
      console.warn('ObjectPool: Attempting to release object not checked out from this pool');
      return;
    }
    
    try {
      // Reset object state
      this.config.reset(obj);
      
      // Return to pool if under max size
      if (this.pool.length < this.config.maxSize) {
        this.pool.push(obj);
      }
      
      this.inUse.delete(obj);
      this.usageTracking.delete(obj);
      this.updateStats();
      
    } catch (error) {
      this.stats.resetErrors++;
      console.error('ObjectPool: Reset failed for object:', error);
      
      // Don't return failed object to pool
      this.inUse.delete(obj);
      this.usageTracking.delete(obj);
    }
  }

  /**
   * REAL USE CASE: Batch acquire for bulk operations
   * More efficient than individual acquires
   */
  public acquireBatch(count: number): T[] {
    if (count <= 0) return [];
    
    const objects: T[] = [];
    const startTime = performance.now();
    
    try {
      for (let i = 0; i < count; i++) {
        objects.push(this.acquire());
      }
      
      const batchTime = performance.now() - startTime;
      console.log(`ObjectPool: Acquired ${count} objects in ${batchTime.toFixed(2)}ms`);
      
      return objects;
    } catch (error) {
      // Release any objects we managed to acquire
      objects.forEach(obj => this.release(obj));
      throw error;
    }
  }

  /**
   * REAL USE CASE: Batch release for bulk operations
   */
  public releaseBatch(objects: T[]): void {
    const startTime = performance.now();
    let released = 0;
    
    objects.forEach(obj => {
      try {
        this.release(obj);
        released++;
      } catch (error) {
        console.warn('ObjectPool: Failed to release object in batch:', error);
      }
    });
    
    const batchTime = performance.now() - startTime;
    console.log(`ObjectPool: Released ${released}/${objects.length} objects in ${batchTime.toFixed(2)}ms`);
  }

  /**
   * Get pool statistics
   */
  public getStats(): PoolStats {
    return { ...this.stats };
  }

  /**
   * Clear pool and reset all statistics
   */
  public clear(): void {
    this.pool = [];
    this.inUse.clear();
    this.usageTracking.clear();
    
    this.stats = {
      totalCreated: 0,
      currentSize: 0,
      inUse: 0,
      available: 0,
      expansions: 0,
      resetErrors: 0,
      memoryEstimate: 0
    };
  }

  /**
   * Force expansion of pool (pre-allocate for known workload)
   */
  public expand(count: number): void {
    this.expandPool(count);
  }

  /**
   * Get debug information about checked-out objects (development only)
   */
  public getUsageReport(): Array<{ obj: T; checkedOutMs: number; stack?: string }> {
    if (!this.config.trackUsage) {
      return [];
    }
    
    const now = Date.now();
    return Array.from(this.usageTracking.entries()).map(([obj, info]) => ({
      obj,
      checkedOutMs: now - info.checkedOut,
      stack: info.stack
    }));
  }

  // Private methods

  private createNewObject(): T {
    const obj = this.config.factory();
    this.stats.totalCreated++;
    return obj;
  }

  private expandPool(count: number): void {
    for (let i = 0; i < count; i++) {
      if (this.stats.totalCreated >= this.config.maxSize) {
        break;
      }
      
      const obj = this.createNewObject();
      this.pool.push(obj);
    }
    
    this.stats.expansions++;
    this.updateStats();
    
    if (count > 10) {
      this.eventEmitter?.({
        type: 'ds:pool:expand',
        timestamp: Date.now(),
        payload: {
          type: 'ObjectPool',
          expandedBy: count,
          totalSize: this.stats.totalCreated
        }
      });
    }
  }

  private updateStats(): void {
    this.stats.currentSize = this.pool.length + this.inUse.size;
    this.stats.inUse = this.inUse.size;
    this.stats.available = this.pool.length;
    this.stats.memoryEstimate = this.stats.totalCreated * 200; // Rough estimate
  }
}

/**
 * REAL-WORLD OBJECT POOLS FOR YOUR DESCENDANTS SYSTEM
 */

/**
 * Vector3 pool for Three.js operations (massive usage in your GPU renderer)
 */
export function createVector3Pool(): ObjectPool<{x: number; y: number; z: number}> {
  return new ObjectPool({
    factory: () => ({ x: 0, y: 0, z: 0 }),
    reset: (v) => { v.x = 0; v.y = 0; v.z = 0; },
    initialSize: 100,
    maxSize: 10000
  });
}

/**
 * Array pool for spatial query results (prevents GC in hot paths)
 */
export function createArrayPool<T>(): ObjectPool<T[]> {
  return new ObjectPool({
    factory: () => [],
    reset: (arr) => { arr.length = 0; },
    initialSize: 20,
    maxSize: 1000
  });
}

/**
 * Collision pair pool for physics system
 */
export function createCollisionPairPool(): ObjectPool<{
  objectA: string;
  objectB: string;
  distance: number;
  normal: {x: number; y: number; z: number};
}> {
  return new ObjectPool({
    factory: () => ({
      objectA: '',
      objectB: '',
      distance: 0,
      normal: { x: 0, y: 0, z: 0 }
    }),
    reset: (pair) => {
      pair.objectA = '';
      pair.objectB = '';
      pair.distance = 0;
      pair.normal.x = 0;
      pair.normal.y = 0;
      pair.normal.z = 0;
    },
    initialSize: 50,
    maxSize: 5000
  });
}

/**
 * Memory scoring context pool for AI agents
 */
export function createMemoryScoringPool(): ObjectPool<{
  importance: number;
  recency: number;
  semantic: number;
  layer: number;
  social: number;
  spatial: number;
}> {
  return new ObjectPool({
    factory: () => ({
      importance: 0,
      recency: 0,
      semantic: 0,
      layer: 0,
      social: 0,
      spatial: 0
    }),
    reset: (ctx) => {
      ctx.importance = 0;
      ctx.recency = 0;
      ctx.semantic = 0;
      ctx.layer = 0;
      ctx.social = 0;
      ctx.spatial = 0;
    },
    initialSize: 20,
    maxSize: 1000
  });
}

/**
 * Factory function
 */
export function createObjectPool<T>(
  config: ObjectPoolConfig<T>,
  eventEmitter?: (event: DSEvent) => void
): ObjectPool<T> {
  return new ObjectPool(config, eventEmitter);
}
