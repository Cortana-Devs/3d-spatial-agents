/**
 * TokenBucketMap - High Performance Rate Limiting
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Step 3
 * 
 * Implements O(1) amortized token bucket rate limiting with strict performance targets.
 * Each bucket refills independently based on elapsed time since last access.
 * 
 * Performance Target: approve() median < 0.002ms across 10k sequential approvals
 * Memory: O(buckets) with automatic cleanup of unused buckets
 */

import { DSError, TokenBucket, TokenBucketMap as ITokenBucketMap, DS_API_VERSION, DSEvent, DS_PERFORMANCE_TARGETS } from '../types';

export interface TokenBucketConfig {
  capacity: number;
  refillRatePerSec: number;
  initialTokens?: number;
}

export interface TokenBucketMapOptions {
  defaultConfig: TokenBucketConfig;
  maxBuckets?: number;
  cleanupIntervalMs?: number;
  inactiveThresholdMs?: number;
  /**
   * Sampling rate for approve/deny/refill events (0..1). Defaults to 1.0
   */
  eventSampleRate?: number;
  /**
   * Maximum buckets to remove per cleanup cycle to avoid long pauses.
   * Defaults to 1000.
   */
  maxRemovalsPerCleanup?: number;
}

interface BucketState extends TokenBucket {
  lastAccessMs: number;
  isActive: boolean;
}

export class TokenBucketMap implements ITokenBucketMap {
  public readonly apiVersion = DS_API_VERSION;

  private readonly buckets = new Map<string, BucketState>();
  private readonly options: Required<TokenBucketMapOptions>;
  private lastCleanupMs = 0;
  private eventEmitter?: (event: DSEvent) => void;
  
  // Performance monitoring
  private approveStats = {
    count: 0,
    totalTimeMs: 0,
    maxTimeMs: 0
  };

  constructor(options: TokenBucketMapOptions, eventEmitter?: (event: DSEvent) => void) {
    // Validate configuration
    if (options.defaultConfig.capacity <= 0) {
      throw new DSError('DS_INVALID_CAPACITY', 'Token bucket capacity must be positive');
    }
    if (options.defaultConfig.refillRatePerSec <= 0) {
      throw new DSError('DS_INVALID_CAPACITY', 'Token bucket refill rate must be positive');
    }

    this.options = {
      defaultConfig: options.defaultConfig,
      maxBuckets: options.maxBuckets ?? 10000,
      cleanupIntervalMs: options.cleanupIntervalMs ?? 300000, // 5 minutes
      inactiveThresholdMs: options.inactiveThresholdMs ?? 600000, // 10 minutes
      eventSampleRate: options.eventSampleRate ?? 1.0,
      maxRemovalsPerCleanup: options.maxRemovalsPerCleanup ?? 1000
    };

    this.eventEmitter = eventEmitter;
    this.lastCleanupMs = Date.now();
  }

  /**
   * Fast path approve - target < 0.002ms median
   * Returns true if tokens available, false if rate limited
   */
  public approve(key: string, cost: number = 1, nowMs?: number): boolean {
    const startTime = performance.now();
    const currentTime = nowMs ?? Date.now();

    try {
      // Get or create bucket - hot path optimization
      let bucket = this.buckets.get(key);
      if (!bucket) {
        bucket = this.createBucket(currentTime);
        this.buckets.set(key, bucket);

        // Check capacity limits after adding bucket
        if (this.buckets.size >= this.options.maxBuckets) {
          this.performCleanup(currentTime);
        }
      }

      // Refill tokens based on elapsed time
      const elapsedMs = currentTime - bucket.lastRefillMs;
      if (elapsedMs > 0) {
        const tokensToAdd = (elapsedMs / 1000) * bucket.refillRatePerSec;
        bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
        bucket.lastRefillMs = currentTime;
        
        // Sample refill events
        if (this.shouldEmitEvent()) {
          this.eventEmitter?.({
            type: 'ds:bucket:refill',
            timestamp: currentTime,
            payload: { key, tokens: bucket.tokens, added: tokensToAdd }
          });
        }
      }

      // Update access tracking
      bucket.lastAccessMs = currentTime;
      bucket.isActive = true;

      // Check if enough tokens available
      if (bucket.tokens >= cost) {
        bucket.tokens -= cost;
        
        if (this.shouldEmitEvent()) {
          this.eventEmitter?.({
            type: 'ds:bucket:approve',
            timestamp: currentTime,
            payload: { key, cost, remainingTokens: bucket.tokens }
          });
        }
        
        return true;
      } else {
        if (this.shouldEmitEvent()) {
          this.eventEmitter?.({
            type: 'ds:bucket:deny',
            timestamp: currentTime,
            payload: { key, cost, availableTokens: bucket.tokens }
          });
        }
        
        return false;
      }
    } finally {
      // Track performance metrics
      const elapsedMs = performance.now() - startTime;
      this.approveStats.count++;
      this.approveStats.totalTimeMs += elapsedMs;
      this.approveStats.maxTimeMs = Math.max(this.approveStats.maxTimeMs, elapsedMs);

      // Emit performance warning if target exceeded
      if (elapsedMs > DS_PERFORMANCE_TARGETS.TOKEN_BUCKET_APPROVE_MS) {
        this.eventEmitter?.({
          type: 'ds:invariant:fail',
          timestamp: currentTime,
          payload: {
            code: 'DS_INVARIANT_VIOLATION',
            message: `TokenBucket approve() exceeded target: ${elapsedMs}ms > ${DS_PERFORMANCE_TARGETS.TOKEN_BUCKET_APPROVE_MS}ms`,
            key,
            elapsedMs
          }
        });
      }
    }
  }

  /**
   * Get snapshot of all bucket states
   */
  public snapshot(): Record<string, { tokens: number; capacity: number }> {
    const result: Record<string, { tokens: number; capacity: number }> = {};
    
    this.buckets.forEach((bucket, key) => {
      result[key] = {
        tokens: bucket.tokens,
        capacity: bucket.capacity
      };
    });
    
    return result;
  }

  /**
   * Force refill all buckets to current time
   * Useful for testing or manual rate limit resets
   */
  public refillAll(nowMs: number): void {
    let refilled = 0;
    
    this.buckets.forEach((bucket, key) => {
      const elapsedMs = nowMs - bucket.lastRefillMs;
      if (elapsedMs > 0) {
        const tokensToAdd = (elapsedMs / 1000) * bucket.refillRatePerSec;
        bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
        bucket.lastRefillMs = nowMs;
        bucket.lastAccessMs = nowMs;
        refilled++;
      }
    });

    if (refilled > 0) {
      this.eventEmitter?.({
        type: 'ds:bucket:refill',
        timestamp: nowMs,
        payload: { type: 'bulk', bucketsRefilled: refilled }
      });
    }
  }

  /**
   * Debug information and performance metrics
   */
  public debug(): { keys: number; avgFillRatio: number; saturated: string[] } {
    const saturated: string[] = [];
    let totalFillRatio = 0;
    let activeBuckets = 0;

    this.buckets.forEach((bucket, key) => {
      if (bucket.isActive) {
        const fillRatio = bucket.tokens / bucket.capacity;
        totalFillRatio += fillRatio;
        activeBuckets++;

        if (bucket.tokens === 0) {
          saturated.push(key);
        }
      }
    });

    const avgFillRatio = activeBuckets > 0 ? totalFillRatio / activeBuckets : 0;

    return {
      keys: this.buckets.size,
      avgFillRatio,
      saturated
    };
  }

  /**
   * Get performance statistics (for monitoring)
   */
  public getPerformanceStats(): {
    avgApproveTimeMs: number;
    maxApproveTimeMs: number;
    totalApprovals: number;
    targetsExceeded: number;
  } {
    const avgApproveTimeMs = this.approveStats.count > 0 
      ? this.approveStats.totalTimeMs / this.approveStats.count 
      : 0;

    return {
      avgApproveTimeMs,
      maxApproveTimeMs: this.approveStats.maxTimeMs,
      totalApprovals: this.approveStats.count,
      targetsExceeded: 0 // Would need separate tracking
    };
  }

  // Private methods

  private createBucket(nowMs: number): BucketState {
    const config = this.options.defaultConfig;
    return {
      capacity: config.capacity,
      tokens: config.initialTokens ?? config.capacity,
      refillRatePerSec: config.refillRatePerSec,
      lastRefillMs: nowMs,
      lastAccessMs: nowMs,
      isActive: true
    };
  }

  private performCleanup(nowMs: number): void {
    let removedCount = 0;
    const inactiveThreshold = nowMs - this.options.inactiveThresholdMs;

    // Always cleanup when over capacity, regardless of cleanup interval
    const shouldForceCleanup = this.buckets.size > this.options.maxBuckets;
    const shouldRegularCleanup = nowMs - this.lastCleanupMs >= this.options.cleanupIntervalMs;

    if (!shouldForceCleanup && !shouldRegularCleanup) {
      return;
    }

    // First pass: mark inactive and collect candidates for removal
    const bucketsToRemove: string[] = [];
    
    this.buckets.forEach((bucket, key) => {
      if (bucket.lastAccessMs < inactiveThreshold) {
        bucketsToRemove.push(key);
      } else {
        bucket.isActive = bucket.lastAccessMs >= inactiveThreshold;
      }
    });

    // Remove inactive buckets with bound to avoid long pauses
    const maxRemovals = this.options.maxRemovalsPerCleanup;
    for (let i = 0; i < bucketsToRemove.length && i < maxRemovals; i++) {
      this.buckets.delete(bucketsToRemove[i]);
      removedCount++;
    }

    // If still over capacity after cleanup, remove oldest buckets
    if (this.buckets.size > this.options.maxBuckets) {
      const sortedBuckets = Array.from(this.buckets.entries())
        .sort(([, a], [, b]) => a.lastAccessMs - b.lastAccessMs);
      
      const toRemove = Math.min(
        this.buckets.size - this.options.maxBuckets,
        this.options.maxRemovalsPerCleanup
      );
      for (let i = 0; i < toRemove; i++) {
        this.buckets.delete(sortedBuckets[i][0]);
        removedCount++;
      }
    }

    this.lastCleanupMs = nowMs;

    if (removedCount > 0) {
      if (this.shouldEmitEvent()) {
        this.eventEmitter?.({
          type: 'ds:bucket:refill', // Reusing event type for cleanup
          timestamp: nowMs,
          payload: { type: 'cleanup', bucketsRemoved: removedCount }
        });
      }
    }
  }

  /**
   * Manually set bucket state (for testing)
   */
  public _testSetBucketState(key: string, state: Partial<TokenBucket>): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Test method not available in production');
    }

    const bucket = this.buckets.get(key);
    if (!bucket) {
      throw new DSError('DS_CONTAINER_ID_NOT_FOUND', `Bucket not found: ${key}`);
    }

    Object.assign(bucket, state);
  }

  /**
   * Clear all buckets (for testing)
   */
  public _testClear(): void {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Test method not available in production');
    }
    this.buckets.clear();
    this.approveStats = { count: 0, totalTimeMs: 0, maxTimeMs: 0 };
  }

  private shouldEmitEvent(): boolean {
    const rate = this.options.eventSampleRate ?? 1.0;
    return rate >= 1.0 || Math.random() < rate;
  }
}

/**
 * Factory function for creating TokenBucketMap instances
 */
export function createTokenBucketMap(
  options: TokenBucketMapOptions,
  eventEmitter?: (event: DSEvent) => void
): ITokenBucketMap {
  return new TokenBucketMap(options, eventEmitter);
}
