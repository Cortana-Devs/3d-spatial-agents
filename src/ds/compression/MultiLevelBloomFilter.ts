/**
 * MultiLevelBloomFilter - Tiered Membership Testing
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Step 7
 * 
 * REAL-WORLD APPLICATIONS IN YOUR SYSTEM:
 * - Replace `checkedItems.has(item.id)` in spatial queries (much faster)
 * - Event deduplication in performance monitoring streams
 * - "Seen before" checks in block placement validation
 * - Cache validation in GPU optimization systems
 * - Memory-efficient duplicate detection across UI telemetry
 * 
 * Multi-level design provides:
 * - Level 0: Recent/hot items (small, fast)
 * - Level 1: Medium-term items (larger capacity)
 * - Level 2: Long-term items (highest capacity, lowest accuracy)
 */

import {
  BloomFilterConfig,
  MultiLevelBloomConfig,
  BloomFilterStats,
  MultiLevelBloomStats,
  CompressionError,
  CompressionEvent,
  DS_API_VERSION,
  COMPRESSION_PERFORMANCE_TARGETS
} from './types';

/**
 * Single-level bloom filter implementation
 */
class BloomFilter {
  private bitArray: Uint8Array;
  private size: number;
  private hashCount: number;
  private itemCount = 0;
  private insertions = 0;
  private queries = 0;
  private estimatedFalsePositives = 0;

  constructor(config: Required<BloomFilterConfig>) {
    this.size = config.bitArraySize;
    this.hashCount = config.hashFunctions;
    this.bitArray = new Uint8Array(Math.ceil(this.size / 8));
  }

  /**
   * Insert item into bloom filter
   */
  public insert(item: string): void {
    const hashes = this.getHashes(item);
    
    for (const hash of hashes) {
      const bitIndex = hash % this.size;
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      
      this.bitArray[byteIndex] |= (1 << bitOffset);
    }
    
    this.itemCount++;
    this.insertions++;
  }

  /**
   * Test if item might be in the set
   * Returns false: definitely not in set
   * Returns true: might be in set (could be false positive)
   */
  public mightContain(item: string): boolean {
    const hashes = this.getHashes(item);
    this.queries++;
    
    for (const hash of hashes) {
      const bitIndex = hash % this.size;
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      
      if ((this.bitArray[byteIndex] & (1 << bitOffset)) === 0) {
        return false; // Definitely not present
      }
    }
    
    // Might be present (could be false positive)
    this.estimateFalsePositive();
    return true;
  }

  /**
   * Clear the bloom filter
   */
  public clear(): void {
    this.bitArray.fill(0);
    this.itemCount = 0;
    this.insertions = 0;
    this.queries = 0;
    this.estimatedFalsePositives = 0;
  }

  /**
   * Get statistics
   */
  public getStats(): BloomFilterStats {
    const actualFalsePositiveRate = this.queries > 0 
      ? this.estimatedFalsePositives / this.queries 
      : 0;

    return {
      itemCount: this.itemCount,
      bitArraySize: this.size,
      hashFunctions: this.hashCount,
      falsePositiveRate: actualFalsePositiveRate,
      memoryUsage: this.bitArray.length,
      insertions: this.insertions,
      queries: this.queries,
      falsePositives: this.estimatedFalsePositives
    };
  }

  // Private methods

  private getHashes(item: string): number[] {
    const hashes: number[] = [];
    
    // Use djb2 and sdbm hash algorithms for diversity
    let hash1 = 5381;
    let hash2 = 0;
    
    for (let i = 0; i < item.length; i++) {
      const char = item.charCodeAt(i);
      hash1 = ((hash1 << 5) + hash1 + char) >>> 0;
      hash2 = (char + (hash2 << 6) + (hash2 << 16) - hash2) >>> 0;
    }
    
    // Generate required number of hash functions
    for (let i = 0; i < this.hashCount; i++) {
      const combinedHash = (hash1 + i * hash2) >>> 0;
      hashes.push(Math.abs(combinedHash));
    }
    
    return hashes;
  }

  private estimateFalsePositive(): void {
    // Simple false positive estimation
    const fillRatio = this.calculateFillRatio();
    const expectedFP = Math.pow(fillRatio, this.hashCount);
    
    if (Math.random() < expectedFP) {
      this.estimatedFalsePositives++;
    }
  }

  private calculateFillRatio(): number {
    let setBits = 0;
    
    for (let i = 0; i < this.bitArray.length; i++) {
      setBits += this.popcount(this.bitArray[i]);
    }
    
    return setBits / this.size;
  }

  private popcount(n: number): number {
    // Count set bits in byte
    let count = 0;
    while (n) {
      count += n & 1;
      n >>>= 1;
    }
    return count;
  }
}

/**
 * Multi-level bloom filter for adaptive membership testing
 */
export class MultiLevelBloomFilter {
  public readonly apiVersion = DS_API_VERSION;
  
  private levels: BloomFilter[] = [];
  private config: MultiLevelBloomConfig;
  private hitCounts = new Map<string, number>(); // Track promotion candidates
  private eventEmitter?: (event: CompressionEvent) => void;
  
  private stats = {
    totalInsertions: 0,
    totalQueries: 0,
    promotions: 0,
    levelDistribution: new Array<number>()
  };

  constructor(config: MultiLevelBloomConfig, eventEmitter?: (event: CompressionEvent) => void) {
    this.config = config;
    this.eventEmitter = eventEmitter;
    
    // Validate configuration
    if (config.levels.length === 0) {
      throw new CompressionError('DS_BLOOM_INVALID_RATE', 'At least one bloom filter level required');
    }

    // Initialize bloom filter levels
    this.initializeLevels();
  }

  /**
   * REAL USE CASE: Check if we've seen this item before
   * Replaces expensive Set.has() operations in spatial queries
   */
  public mightContain(item: string): boolean {
    this.stats.totalQueries++;
    
    // Check all levels (start with most accurate)
    for (let level = 0; level < this.levels.length; level++) {
      if (this.levels[level].mightContain(item)) {
        // Track hits for potential promotion
        if (this.config.autoPromote && level > 0) {
          this.trackHit(item, level);
        }
        return true;
      }
    }
    
    return false;
  }

  /**
   * REAL USE CASE: Insert item into appropriate level
   * For spatial query deduplication, event deduplication, etc.
   */
  public insert(item: string, level: number = 0): void {
    if (level >= this.levels.length) {
      throw new CompressionError('DS_BLOOM_CAPACITY_EXCEEDED', `Level ${level} does not exist`);
    }

    this.levels[level].insert(item);
    this.stats.totalInsertions++;
    
    // Update level distribution stats
    while (this.stats.levelDistribution.length <= level) {
      this.stats.levelDistribution.push(0);
    }
    this.stats.levelDistribution[level]++;
  }

  /**
   * REAL USE CASE: Batch insert for spatial query results
   * When you need to mark many items as "seen" efficiently
   */
  public insertBatch(items: string[], level: number = 0): void {
    const startTime = performance.now();
    
    items.forEach(item => this.insert(item, level));
    
    const batchTime = performance.now() - startTime;
    console.log(`Inserted ${items.length} items into bloom filter level ${level} in ${batchTime.toFixed(2)}ms`);
  }

  /**
   * REAL USE CASE: Clear specific level (e.g., clear recent cache)
   */
  public clearLevel(level: number): void {
    if (level < this.levels.length) {
      this.levels[level].clear();
      if (this.stats.levelDistribution[level]) {
        this.stats.levelDistribution[level] = 0;
      }
    }
  }

  /**
   * Clear all levels
   */
  public clear(): void {
    this.levels.forEach(level => level.clear());
    this.hitCounts.clear();
    this.stats = {
      totalInsertions: 0,
      totalQueries: 0,
      promotions: 0,
      levelDistribution: new Array(this.levels.length).fill(0)
    };
  }

  /**
   * Get comprehensive statistics
   */
  public getStats(): MultiLevelBloomStats {
    const levelStats = this.levels.map(level => level.getStats());
    const totalItems = levelStats.reduce((sum, stats) => sum + stats.itemCount, 0);
    const totalMemory = levelStats.reduce((sum, stats) => sum + stats.memoryUsage, 0);
    
    // Calculate overall false positive rate (weighted by level usage)
    const weightedFPRate = levelStats.reduce((sum, stats, index) => {
      const levelWeight = this.stats.levelDistribution[index] || 0;
      const totalWeight = this.stats.totalInsertions || 1;
      return sum + (stats.falsePositiveRate * (levelWeight / totalWeight));
    }, 0);

    return {
      totalLevels: this.levels.length,
      totalItems,
      totalMemoryUsage: totalMemory,
      levelStats,
      promotions: this.stats.promotions,
      overallFalsePositiveRate: weightedFPRate
    };
  }

  /**
   * Get memory usage per level
   */
  public getMemoryBreakdown(): Array<{ level: number; bytes: number; items: number }> {
    return this.levels.map((filter, index) => {
      const stats = filter.getStats();
      return {
        level: index,
        bytes: stats.memoryUsage,
        items: stats.itemCount
      };
    });
  }

  // Private methods

  private initializeLevels(): void {
    this.levels = this.config.levels.map(levelConfig => {
      const requiredConfig = this.calculateOptimalParams(levelConfig);
      return new BloomFilter(requiredConfig);
    });

    // Validate total memory usage
    const totalMemory = this.levels.reduce((sum, filter) => sum + filter.getStats().memoryUsage, 0);
    if (totalMemory > this.config.maxMemoryBytes) {
      throw new CompressionError(
        'DS_BLOOM_MEMORY_EXCEEDED', 
        `Total memory ${totalMemory} exceeds limit ${this.config.maxMemoryBytes}`
      );
    }
  }

  private calculateOptimalParams(config: BloomFilterConfig): Required<BloomFilterConfig> {
    const n = config.expectedItems;
    const p = config.falsePositiveRate;
    
    // Calculate optimal bit array size: m = -n * ln(p) / (ln(2)^2)
    const m = Math.ceil(-n * Math.log(p) / (Math.log(2) * Math.log(2)));
    
    // Calculate optimal number of hash functions: k = (m/n) * ln(2)
    const k = Math.max(1, Math.round((m / n) * Math.log(2)));
    
    return {
      expectedItems: n,
      falsePositiveRate: p,
      bitArraySize: config.bitArraySize ?? m,
      hashFunctions: config.hashFunctions ?? k
    };
  }

  private trackHit(item: string, level: number): void {
    if (!this.config.autoPromote) return;
    
    const currentHits = this.hitCounts.get(item) || 0;
    const newHits = currentHits + 1;
    
    this.hitCounts.set(item, newHits);
    
    // Promote if threshold reached and not at highest level
    if (newHits >= this.config.promotionThreshold && level > 0) {
      this.promoteItem(item, level - 1);
    }
  }

  private promoteItem(item: string, toLevel: number): void {
    this.insert(item, toLevel);
    this.hitCounts.delete(item); // Reset hit count after promotion
    this.stats.promotions++;
    
    console.log(`Promoted item to level ${toLevel} after ${this.config.promotionThreshold} hits`);
  }
}

/**
 * REAL-WORLD BLOOM FILTER PRESETS for your Descendants system
 */
export const BloomFilterPresets = {
  /**
   * For spatial query deduplication (replaces Set<string> in UniformGridHash)
   */
  spatialQueryDeduplication: (): MultiLevelBloomConfig => ({
    levels: [
      { expectedItems: 1000, falsePositiveRate: 0.001 },   // Recent queries
      { expectedItems: 10000, falsePositiveRate: 0.01 },   // Medium-term
      { expectedItems: 100000, falsePositiveRate: 0.05 }   // Long-term
    ],
    autoPromote: true,
    promotionThreshold: 3,
    maxMemoryBytes: 1024 * 1024 // 1MB
  }),

  /**
   * For GPU telemetry event deduplication
   */
  telemetryDeduplication: (): MultiLevelBloomConfig => ({
    levels: [
      { expectedItems: 5000, falsePositiveRate: 0.001 },   // Current frame events
      { expectedItems: 50000, falsePositiveRate: 0.01 }    // Historical events
    ],
    autoPromote: false,
    promotionThreshold: 0,
    maxMemoryBytes: 512 * 1024 // 512KB
  }),

  /**
   * For block placement validation (seen this combination before?)
   */
  blockValidationCache: (): MultiLevelBloomConfig => ({
    levels: [
      { expectedItems: 2000, falsePositiveRate: 0.0001 },  // High accuracy for validation
      { expectedItems: 20000, falsePositiveRate: 0.001 }   // Longer-term cache
    ],
    autoPromote: true,
    promotionThreshold: 2,
    maxMemoryBytes: 256 * 1024 // 256KB
  }),

  /**
   * For UI event deduplication (prevent duplicate renders/updates)
   */
  uiEventDeduplication: (): MultiLevelBloomConfig => ({
    levels: [
      { expectedItems: 1000, falsePositiveRate: 0.01 }     // Single level for UI events
    ],
    autoPromote: false,
    promotionThreshold: 0,
    maxMemoryBytes: 64 * 1024 // 64KB
  })
};

/**
 * UTILITY: High-performance deduplication for spatial queries
 * Direct replacement for Set<string> operations in your spatial code
 */
export class FastDeduplicator {
  private bloomFilter: MultiLevelBloomFilter;
  private recentItems = new Set<string>(); // Small accurate set for recent items
  private maxRecentItems: number;

  constructor(expectedItems: number = 10000, maxRecentItems: number = 1000) {
    this.maxRecentItems = maxRecentItems;
    
    this.bloomFilter = new MultiLevelBloomFilter({
      levels: [
        { expectedItems, falsePositiveRate: 0.001 }
      ],
      autoPromote: false,
      promotionThreshold: 0,
      maxMemoryBytes: 1024 * 1024
    });
  }

  /**
   * REAL USE CASE: Replace `checkedItems.has(item.id)` in your spatial queries
   */
  public hasSeen(item: string): boolean {
    // First check recent items (100% accurate)
    if (this.recentItems.has(item)) {
      return true;
    }
    
    // Then check bloom filter (might have false positives)
    return this.bloomFilter.mightContain(item);
  }

  /**
   * REAL USE CASE: Replace `checkedItems.add(item.id)` in your spatial queries
   */
  public markSeen(item: string): void {
    // Add to recent items
    this.recentItems.add(item);
    
    // Manage recent items size
    if (this.recentItems.size > this.maxRecentItems) {
      // Move oldest items to bloom filter
      const itemsArray = Array.from(this.recentItems);
      const toMove = itemsArray.slice(0, this.recentItems.size - this.maxRecentItems + 100);
      
      toMove.forEach(oldItem => {
        this.bloomFilter.insert(oldItem, 0);
        this.recentItems.delete(oldItem);
      });
    }
  }

  /**
   * Clear all seen items
   */
  public clear(): void {
    this.recentItems.clear();
    this.bloomFilter.clear();
  }

  /**
   * Get memory usage statistics
   */
  public getMemoryStats(): {
    recentItemsBytes: number;
    bloomFilterBytes: number;
    totalBytes: number;
    accuracy: string;
  } {
    const bloomStats = this.bloomFilter.getStats();
    const recentBytes = this.recentItems.size * 50; // Rough estimate per string
    
    return {
      recentItemsBytes: recentBytes,
      bloomFilterBytes: bloomStats.totalMemoryUsage,
      totalBytes: recentBytes + bloomStats.totalMemoryUsage,
      accuracy: `${((1 - bloomStats.overallFalsePositiveRate) * 100).toFixed(2)}%`
    };
  }
}

/**
 * Factory functions
 */
export function createMultiLevelBloomFilter(
  config: MultiLevelBloomConfig,
  eventEmitter?: (event: CompressionEvent) => void
): MultiLevelBloomFilter {
  return new MultiLevelBloomFilter(config, eventEmitter);
}

export function createFastDeduplicator(
  expectedItems?: number,
  maxRecentItems?: number
): FastDeduplicator {
  return new FastDeduplicator(expectedItems, maxRecentItems);
}

/**
 * UTILITY: Calculate optimal bloom filter parameters
 */
export function calculateBloomFilterParams(expectedItems: number, falsePositiveRate: number): {
  bitArraySize: number;
  hashFunctions: number;
  memoryBytes: number;
} {
  const n = expectedItems;
  const p = falsePositiveRate;
  
  const m = Math.ceil(-n * Math.log(p) / (Math.log(2) * Math.log(2)));
  const k = Math.max(1, Math.round((m / n) * Math.log(2)));
  const memoryBytes = Math.ceil(m / 8);
  
  return {
    bitArraySize: m,
    hashFunctions: k,
    memoryBytes
  };
}

/**
 * UTILITY: Estimate false positive rate for given parameters
 */
export function estimateFalsePositiveRate(
  bitArraySize: number,
  hashFunctions: number,
  insertedItems: number
): number {
  if (insertedItems === 0) return 0;
  
  // Calculate theoretical false positive rate
  const fillRatio = 1 - Math.exp(-hashFunctions * insertedItems / bitArraySize);
  return Math.pow(fillRatio, hashFunctions);
}
