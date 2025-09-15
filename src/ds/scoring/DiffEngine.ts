/**
 * DiffEngine - Structural Change Detection System
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Step 6
 * 
 * REAL-WORLD APPLICATIONS:
 * - AI agent perception: detect world changes since last cycle
 * - Memory compression: only store what actually changed  
 * - Real-time collaboration: conflict detection between users
 * - State synchronization: validate integrity across systems
 * 
 * Provides efficient change detection for complex data structures.
 */

import {
  DiffResult,
  StructuralHash,
  WorldStateDiff,
  ScoringError,
  ScoringEvent,
  DS_API_VERSION,
  SCORING_PERFORMANCE_TARGETS
} from './types';

interface DiffableItem {
  id: string;
  data: unknown;
  hash?: string; // Optional pre-computed hash
}

export class DiffEngine {
  public readonly apiVersion = DS_API_VERSION;
  
  private eventEmitter?: (event: ScoringEvent) => void;
  private diffStats = {
    totalDiffOperations: 0,
    totalItemsCompared: 0,
    totalComputeTime: 0,
    changesDetected: 0
  };

  constructor(eventEmitter?: (event: ScoringEvent) => void) {
    this.eventEmitter = eventEmitter;
  }

  /**
   * REAL USE CASE: Detect changes between two collections
   * For AI agent perception, memory compression, collaboration
   */
  public diff<T extends DiffableItem>(
    previous: T[],
    current: T[],
    options: {
      compareFields?: string[];
      ignoreFields?: string[];
      deepCompare?: boolean;
      customCompare?: (a: T, b: T) => boolean;
    } = {}
  ): DiffResult<T> {
    const startTime = performance.now();

    // Create lookup maps for efficient comparison
    const previousMap = new Map<string, T>();
    const currentMap = new Map<string, T>();

    previous.forEach(item => previousMap.set(item.id, item));
    current.forEach(item => currentMap.set(item.id, item));

    const result: DiffResult<T> = {
      hasChanges: false,
      added: [],
      removed: [],
      modified: [],
      unchanged: [],
      summary: {
        totalChanges: 0,
        addedCount: 0,
        removedCount: 0,
        modifiedCount: 0
      }
    };

    // Find added items (in current but not in previous)
    currentMap.forEach((item, id) => {
      if (!previousMap.has(id)) {
        result.added.push(item);
      }
    });

    // Find removed items (in previous but not in current)
    previousMap.forEach((item, id) => {
      if (!currentMap.has(id)) {
        result.removed.push(item);
      }
    });

    // Find modified and unchanged items
    currentMap.forEach((currentItem, id) => {
      const previousItem = previousMap.get(id);
      if (!previousItem) return; // Already handled in added

      if (this.itemsEqual(previousItem, currentItem, options)) {
        result.unchanged.push(currentItem);
      } else {
        const changes = this.getChangedFields(previousItem, currentItem, options);
        result.modified.push({
          before: previousItem,
          after: currentItem,
          changes
        });
      }
    });

    // Update summary
    result.summary.addedCount = result.added.length;
    result.summary.removedCount = result.removed.length;
    result.summary.modifiedCount = result.modified.length;
    result.summary.totalChanges = result.summary.addedCount + result.summary.removedCount + result.summary.modifiedCount;
    result.hasChanges = result.summary.totalChanges > 0;

    // Update statistics
    const computeTime = performance.now() - startTime;
    this.diffStats.totalDiffOperations++;
    this.diffStats.totalItemsCompared += previous.length + current.length;
    this.diffStats.totalComputeTime += computeTime;
    if (result.hasChanges) {
      this.diffStats.changesDetected++;
    }

    // Emit event
    this.eventEmitter?.({
      type: 'ds:diff:computed',
      timestamp: Date.now(),
      payload: {
        operation: 'diff_collection',
        itemCount: previous.length + current.length,
        computeTime,
        hasChanges: result.hasChanges,
        addedCount: result.summary.addedCount,
        removedCount: result.summary.removedCount,
        modifiedCount: result.summary.modifiedCount
      }
    });

    return result;
  }

  /**
   * REAL USE CASE: World state diff for AI agent perception
   * Tracks block changes, simulant movements, and environment updates
   */
  public diffWorldState(
    previousBlocks: Array<{ position: { x: number; y: number; z: number }; type: string; id: string }>,
    currentBlocks: Array<{ position: { x: number; y: number; z: number }; type: string; id: string }>,
    previousSimulants: Array<{ id: string; position: { x: number; y: number; z: number }; state: string }>,
    currentSimulants: Array<{ id: string; position: { x: number; y: number; z: number }; state: string }>,
    agentId: string,
    tick: number
  ): WorldStateDiff {
    const startTime = performance.now();

    // Diff blocks
    const blockDiff = this.diff(
      previousBlocks.map(b => ({ 
        id: `${b.position.x},${b.position.y},${b.position.z}`, 
        data: b,
        hash: this.hashWorldObject(b)
      })),
      currentBlocks.map(b => ({ 
        id: `${b.position.x},${b.position.y},${b.position.z}`, 
        data: b,
        hash: this.hashWorldObject(b)
      }))
    );

    // Diff simulants
    const simulantDiff = this.diff(
      previousSimulants.map(s => ({ 
        id: s.id, 
        data: s,
        hash: this.hashWorldObject(s)
      })),
      currentSimulants.map(s => ({ 
        id: s.id, 
        data: s,
        hash: this.hashWorldObject(s)
      }))
    );

    // Calculate significance of changes
    const significance = this.calculateWorldChangeSimilarity(blockDiff, simulantDiff);

    // Build world state diff
    const worldDiff: WorldStateDiff = {
      agentId,
      tick,
      previousHash: this.computeStructuralHash([...previousBlocks, ...previousSimulants]).hash,
      currentHash: this.computeStructuralHash([...currentBlocks, ...currentSimulants]).hash,
      blockChanges: {
        added: blockDiff.added.map(item => ({
          position: (item.data as any).position,
          type: (item.data as any).type
        })),
        removed: blockDiff.removed.map(item => ({
          position: (item.data as any).position,
          type: (item.data as any).type
        })),
        modified: blockDiff.modified.map(mod => ({
          position: (mod.after.data as any).position,
          oldType: (mod.before.data as any).type,
          newType: (mod.after.data as any).type
        }))
      },
      simulantChanges: {
        added: simulantDiff.added.map(item => (item.data as any).id),
        removed: simulantDiff.removed.map(item => (item.data as any).id),
        moved: simulantDiff.modified
          .filter(mod => this.positionChanged(
            (mod.before.data as any).position,
            (mod.after.data as any).position
          ))
          .map(mod => ({
            id: (mod.after.data as any).id,
            oldPos: (mod.before.data as any).position,
            newPos: (mod.after.data as any).position
          }))
      },
      significance
    };

    const computeTime = performance.now() - startTime;

    // Check performance target
    if (computeTime > SCORING_PERFORMANCE_TARGETS.WORLD_DIFF_COMPUTATION_MS) {
      console.warn(`World diff computation exceeded target: ${computeTime}ms > ${SCORING_PERFORMANCE_TARGETS.WORLD_DIFF_COMPUTATION_MS}ms`);
    }

    return worldDiff;
  }

  /**
   * REAL USE CASE: Fast rolling hash for incremental change detection
   * For detecting when world state has changed without full comparison
   */
  public computeRollingHash(data: unknown[]): string {
    // Simple but effective rolling hash using polynomial rolling
    const prime = 31;
    let hash = 0;
    
    for (let i = 0; i < data.length; i++) {
      const itemHash = this.hashSingleItem(data[i]);
      hash = (hash * prime + itemHash) >>> 0; // Keep as 32-bit unsigned
    }

    return hash.toString(16);
  }

  /**
   * REAL USE CASE: Compute structural hash for complex objects
   * For worldStateHash in AI agent perception and state validation
   */
  public computeStructuralHash(data: unknown): StructuralHash {
    const startTime = performance.now();
    
    try {
      // Convert to canonical JSON string
      const canonical = this.toCanonicalJSON(data);
      const byteSize = new TextEncoder().encode(canonical).length;
      
      // Use crypto API if available, fallback to simple hash
      let hash: string;
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        // For production: would use crypto.subtle.digest('SHA-256', ...)
        // For now, use a deterministic hash
        hash = this.deterministicHash(canonical);
      } else {
        hash = this.deterministicHash(canonical);
      }

      const computeTime = performance.now() - startTime;

      // Check performance target
      if (computeTime > SCORING_PERFORMANCE_TARGETS.STRUCTURAL_HASH_MS) {
        console.warn(`Structural hash computation exceeded target: ${computeTime}ms > ${SCORING_PERFORMANCE_TARGETS.STRUCTURAL_HASH_MS}ms`);
      }

      return {
        hash,
        algorithm: 'combined',
        computed: Date.now(),
        itemCount: Array.isArray(data) ? data.length : 1,
        byteSize
      };
    } catch (error) {
      throw new ScoringError('DS_DIGEST_COMPUTATION_FAILED', 'Failed to compute structural hash', { error });
    }
  }

  /**
   * REAL USE CASE: Compare two hashes to detect changes
   * Quick change detection without full diff computation
   */
  public hashesEqual(hash1: StructuralHash, hash2: StructuralHash): boolean {
    return hash1.hash === hash2.hash && 
           hash1.algorithm === hash2.algorithm;
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    totalDiffOperations: number;
    avgItemsPerDiff: number;
    avgComputeTimeMs: number;
    changeDetectionRate: number;
  } {
    const avgItems = this.diffStats.totalDiffOperations > 0
      ? this.diffStats.totalItemsCompared / this.diffStats.totalDiffOperations
      : 0;
    
    const avgTime = this.diffStats.totalDiffOperations > 0
      ? this.diffStats.totalComputeTime / this.diffStats.totalDiffOperations
      : 0;

    const changeRate = this.diffStats.totalDiffOperations > 0
      ? this.diffStats.changesDetected / this.diffStats.totalDiffOperations
      : 0;

    return {
      totalDiffOperations: this.diffStats.totalDiffOperations,
      avgItemsPerDiff: avgItems,
      avgComputeTimeMs: avgTime,
      changeDetectionRate: changeRate
    };
  }

  // Private implementation methods

  private itemsEqual<T extends DiffableItem>(
    a: T, 
    b: T, 
    options: { compareFields?: string[]; ignoreFields?: string[]; deepCompare?: boolean; customCompare?: (a: T, b: T) => boolean }
  ): boolean {
    // Use custom compare if provided
    if (options.customCompare) {
      return options.customCompare(a, b);
    }

    // Use pre-computed hashes if available
    if (a.hash && b.hash) {
      return a.hash === b.hash;
    }

    // Shallow comparison for performance
    if (!options.deepCompare) {
      return JSON.stringify(a.data) === JSON.stringify(b.data);
    }

    // Deep field-by-field comparison
    return this.deepEquals(a.data, b.data, options.compareFields, options.ignoreFields);
  }

  private getChangedFields<T extends DiffableItem>(
    previous: T, 
    current: T, 
    options: { compareFields?: string[]; ignoreFields?: string[] }
  ): string[] {
    const changes: string[] = [];
    
    // Simple implementation - could be enhanced for specific field tracking
    if (JSON.stringify(previous.data) !== JSON.stringify(current.data)) {
      changes.push('data');
    }

    return changes;
  }

  private deepEquals(
    a: unknown, 
    b: unknown, 
    compareFields?: string[], 
    ignoreFields?: string[]
  ): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
      const aObj = a as Record<string, unknown>;
      const bObj = b as Record<string, unknown>;

      const aKeys = Object.keys(aObj).filter(k => !ignoreFields?.includes(k));
      const bKeys = Object.keys(bObj).filter(k => !ignoreFields?.includes(k));

      if (compareFields) {
        // Only compare specified fields
        for (const field of compareFields) {
          if (!this.deepEquals(aObj[field], bObj[field])) {
            return false;
          }
        }
        return true;
      } else {
        // Compare all fields except ignored ones
        if (aKeys.length !== bKeys.length) return false;
        
        for (const key of aKeys) {
          if (!bKeys.includes(key)) return false;
          if (!this.deepEquals(aObj[key], bObj[key], compareFields, ignoreFields)) {
            return false;
          }
        }
      }
      
      return true;
    }

    return false;
  }

  private calculateWorldChangeSimilarity(
    blockDiff: DiffResult<unknown>, 
    simulantDiff: DiffResult<unknown>
  ): number {
    // Calculate significance based on change types and magnitude
    const blockChanges = blockDiff.summary.totalChanges;
    const simulantChanges = simulantDiff.summary.totalChanges;
    
    // Weight different change types
    const blockWeight = 0.6;    // Blocks are important for spatial reasoning
    const simulantWeight = 0.4; // Simulant changes are important for social reasoning
    
    // Normalize by total possible changes (prevent division by zero)
    const totalItems = Math.max(1, blockDiff.added.length + blockDiff.removed.length + blockDiff.modified.length + blockDiff.unchanged.length);
    const blockSignificance = (blockChanges / totalItems) * blockWeight;
    
    const totalSimulants = Math.max(1, simulantDiff.added.length + simulantDiff.removed.length + simulantDiff.modified.length + simulantDiff.unchanged.length);
    const simulantSignificance = (simulantChanges / totalSimulants) * simulantWeight;
    
    return Math.min(1.0, blockSignificance + simulantSignificance);
  }

  private positionChanged(
    pos1: { x: number; y: number; z: number },
    pos2: { x: number; y: number; z: number }
  ): boolean {
    const threshold = 0.001; // Ignore tiny floating point differences
    return Math.abs(pos1.x - pos2.x) > threshold ||
           Math.abs(pos1.y - pos2.y) > threshold ||
           Math.abs(pos1.z - pos2.z) > threshold;
  }

  private hashWorldObject(obj: unknown): string {
    // Fast hash for world objects
    return this.hashSingleItem(obj).toString();
  }

  private hashSingleItem(item: unknown): number {
    // Convert item to string and compute simple hash
    const str = typeof item === 'string' ? item : JSON.stringify(item);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash + char) & 0xffffffff; // 32-bit hash
    }
    
    return Math.abs(hash);
  }

  private toCanonicalJSON(data: unknown): string {
    // Convert to deterministic JSON representation
    const canonicalize = (obj: unknown): unknown => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(canonicalize);
      }

      // Sort object keys for deterministic output
      const sorted: Record<string, unknown> = {};
      const keys = Object.keys(obj as Record<string, unknown>).sort();
      
      for (const key of keys) {
        sorted[key] = canonicalize((obj as Record<string, unknown>)[key]);
      }
      
      return sorted;
    };

    return JSON.stringify(canonicalize(data));
  }

  private deterministicHash(str: string): string {
    // Implementation of djb2 hash algorithm for deterministic results
    let hash = 5381;
    
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
    }
    
    return hash.toString(16);
  }
}

/**
 * UTILITY FUNCTIONS for common diff scenarios
 */

/**
 * REAL USE CASE: Quick check if any changes occurred
 */
export function hasChanges<T extends DiffableItem>(previous: T[], current: T[]): boolean {
  if (previous.length !== current.length) return true;
  
  // Quick hash-based comparison
  const prevIds = new Set(previous.map(item => item.id));
  const currIds = new Set(current.map(item => item.id));
  
  if (prevIds.size !== currIds.size) return true;
  
  prevIds.forEach(id => {
    if (!currIds.has(id)) return true;
  });
  
  return false;
}

/**
 * REAL USE CASE: Extract only the changes for minimal memory/network usage
 */
export function extractChangesOnly<T extends DiffableItem>(
  diffResult: DiffResult<T>
): { added: T[]; removed: string[]; modified: T[] } {
  return {
    added: diffResult.added,
    removed: diffResult.removed.map(item => item.id),
    modified: diffResult.modified.map(change => change.after)
  };
}

/**
 * Factory function for creating DiffEngine instances
 */
export function createDiffEngine(eventEmitter?: (event: ScoringEvent) => void): DiffEngine {
  return new DiffEngine(eventEmitter);
}

/**
 * REAL USE CASE: Create world state hash for AI agent perception
 */
export function computeWorldStateHash(
  blocks: Array<{ position: { x: number; y: number; z: number }; type: string }>,
  simulants: Array<{ id: string; position: { x: number; y: number; z: number } }>,
  environment?: { timeOfDay?: string; weather?: string }
): string {
  const diffEngine = createDiffEngine();
  const worldState = {
    blocks: blocks.sort((a, b) => 
      a.position.x - b.position.x || 
      a.position.y - b.position.y || 
      a.position.z - b.position.z
    ),
    simulants: simulants.sort((a, b) => a.id.localeCompare(b.id)),
    environment: environment || {}
  };
  
  return diffEngine.computeStructuralHash(worldState).hash;
}
