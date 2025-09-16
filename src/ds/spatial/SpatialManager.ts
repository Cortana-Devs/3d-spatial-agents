/**
 * SpatialManager - Unified Spatial Query API
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Step 4
 * 
 * Provides a unified interface to work with different spatial index types.
 * Automatically selects the best index for different use cases and provides
 * seamless switching between index types.
 */

import {
  SpatialIndex,
  SpatialItem,
  SpatialQuery,
  SpatialQueryResult,
  SpatialDebugInfo,
  SpatialEvent,
  StaticBVHConfig,
  DynamicAABBConfig,
  UniformGridConfig,
  Vector3,
  AABB
} from './types';

import { StaticBVH } from './StaticBVH';
import { DynamicAABBTree } from './DynamicAABBTree';  
import { UniformGridHash } from './UniformGridHash';

export type SpatialIndexType = 'StaticBVH' | 'DynamicAABBTree' | 'UniformGridHash';

export interface SpatialManagerConfig {
  preferredIndex?: SpatialIndexType;
  autoOptimize?: boolean;
  eventEmitter?: (event: SpatialEvent) => void;
  
  // Configuration for each index type
  staticBVH?: StaticBVHConfig;
  dynamicAABB?: DynamicAABBConfig;
  uniformGrid?: UniformGridConfig;
}

/**
 * High-level spatial manager that can use different index types
 * and automatically optimize for different scenarios
 */
export class SpatialManager {
  private activeIndex: SpatialIndex | null = null;
  private config: Required<Omit<SpatialManagerConfig, 'staticBVH' | 'dynamicAABB' | 'uniformGrid'>> & {
    staticBVH?: StaticBVHConfig;
    dynamicAABB?: DynamicAABBConfig;
    uniformGrid?: UniformGridConfig;
  };
  
  private items = new Map<string, SpatialItem>();
  private needsRebuild = false;
  private operationCount = 0;

  constructor(config: SpatialManagerConfig = {}) {
    this.config = {
      preferredIndex: config.preferredIndex ?? 'DynamicAABBTree',
      autoOptimize: config.autoOptimize ?? true,
      eventEmitter: config.eventEmitter,
      staticBVH: config.staticBVH,
      dynamicAABB: config.dynamicAABB,
      uniformGrid: config.uniformGrid
    };
  }

  /**
   * Add an item to the spatial index
   */
  public insert(item: SpatialItem): void {
    if (this.items.has(item.id)) {
      throw new Error(`Item ${item.id} already exists`);
    }

    this.items.set(item.id, item);
    this.ensureIndex();
    this.activeIndex!.insert!(item);
    this.operationCount++;
    
    if (this.config.autoOptimize) {
      this.considerOptimization();
    }
  }

  /**
   * Update an item's bounds
   */
  public update(itemId: string, newBounds: AABB): boolean {
    const item = this.items.get(itemId);
    if (!item) return false;

    item.bounds = newBounds;
    this.ensureIndex();
    
    if (this.activeIndex!.update) {
      return this.activeIndex!.update(itemId, newBounds);
    }
    
    // Fallback: remove and re-add for static indices
    this.needsRebuild = true;
    return true;
  }

  /**
   * Remove an item
   */
  public remove(itemId: string): boolean {
    if (!this.items.has(itemId)) return false;

    this.items.delete(itemId);
    this.ensureIndex();
    
    if (this.activeIndex!.remove) {
      return this.activeIndex!.remove(itemId);
    }
    
    // Fallback: mark for rebuild
    this.needsRebuild = true;
    return true;
  }

  /**
   * Query for overlapping items
   */
  public query(query: SpatialQuery): SpatialQueryResult[] {
    this.ensureIndex();
    this.rebuildIfNeeded();
    return this.activeIndex!.query(query);
  }

  /**
   * Find nearest item to a point
   */
  public nearest(point: Vector3, maxDistance?: number): SpatialQueryResult | null {
    this.ensureIndex();
    this.rebuildIfNeeded();
    
    if (this.activeIndex!.nearest) {
      return this.activeIndex!.nearest(point, maxDistance);
    }
    
    // Fallback: query with expanding bounds
    const searchRadius = maxDistance ?? 1000;
    const searchBounds: AABB = {
      min: { x: point.x - searchRadius, y: point.y - searchRadius, z: point.z - searchRadius },
      max: { x: point.x + searchRadius, y: point.y + searchRadius, z: point.z + searchRadius }
    };
    
    const candidates = this.query({ bounds: searchBounds });
    let best: SpatialQueryResult | null = null;
    let bestDistance = maxDistance ?? Infinity;

    for (const candidate of candidates) {
      const center = AABB.center(candidate.item.bounds);
      const distance = Math.sqrt(
        (point.x - center.x) ** 2 +
        (point.y - center.y) ** 2 +
        (point.z - center.z) ** 2
      );

      if (distance < bestDistance) {
        best = { ...candidate, distance };
        bestDistance = distance;
      }
    }

    return best;
  }

  /**
   * Perform a raycast
   */
  public raycast(origin: Vector3, direction: Vector3, maxDistance?: number): SpatialQueryResult[] {
    this.ensureIndex();
    this.rebuildIfNeeded();
    
    if (this.activeIndex!.raycast) {
      return this.activeIndex!.raycast(origin, direction, maxDistance);
    }
    
    // Fallback: convert to AABB query
    const distance = maxDistance ?? 1000;
    const endPoint = {
      x: origin.x + direction.x * distance,
      y: origin.y + direction.y * distance,
      z: origin.z + direction.z * distance
    };

    const rayBounds: AABB = {
      min: {
        x: Math.min(origin.x, endPoint.x),
        y: Math.min(origin.y, endPoint.y),
        z: Math.min(origin.z, endPoint.z)
      },
      max: {
        x: Math.max(origin.x, endPoint.x),
        y: Math.max(origin.y, endPoint.y),
        z: Math.max(origin.z, endPoint.z)
      }
    };

    return this.query({ bounds: rayBounds });
  }

  /**
   * Get debug information from the active index
   */
  public debug(): SpatialDebugInfo & { managerInfo: any } {
    if (!this.activeIndex) {
      return {
        indexType: 'None',
        itemCount: this.items.size,
        managerInfo: {
          activeIndexType: null,
          totalItems: this.items.size,
          operationCount: this.operationCount,
          needsRebuild: this.needsRebuild
        }
      };
    }

    const indexDebug = this.activeIndex.debug();
    return {
      ...indexDebug,
      managerInfo: {
        activeIndexType: this.activeIndex.indexType,
        totalItems: this.items.size,
        operationCount: this.operationCount,
        needsRebuild: this.needsRebuild
      }
    };
  }

  /**
   * Switch to a specific index type
   */
  public switchIndex(indexType: SpatialIndexType): void {
    this.config.preferredIndex = indexType;
    this.activeIndex = null;
    this.needsRebuild = true;
    this.ensureIndex();
  }

  /**
   * Force a rebuild of the current index
   */
  public rebuild(): void {
    if (!this.activeIndex) return;

    const items = Array.from(this.items.values());
    
    if (this.activeIndex.indexType === 'StaticBVH') {
      (this.activeIndex as StaticBVH).build(items);
    } else {
      // For dynamic indices, clear and re-add all items
      if ('clear' in this.activeIndex && typeof this.activeIndex.clear === 'function') {
        this.activeIndex.clear();
      }
      
      for (const item of items) {
        if (this.activeIndex.insert) {
          this.activeIndex.insert(item);
        }
      }
    }
    
    this.needsRebuild = false;
  }

  /**
   * Clear all items
   */
  public clear(): void {
    this.items.clear();
    if (this.activeIndex && 'clear' in this.activeIndex && typeof this.activeIndex.clear === 'function') {
      this.activeIndex.clear();
    }
    this.operationCount = 0;
    this.needsRebuild = false;
  }

  /**
   * Get all items
   */
  public getAllItems(): SpatialItem[] {
    return Array.from(this.items.values());
  }

  // Private methods

  private ensureIndex(): void {
    if (this.activeIndex) return;

    switch (this.config.preferredIndex) {
      case 'StaticBVH':
        this.activeIndex = new StaticBVH(
          this.config.staticBVH,
          this.config.eventEmitter
        );
        break;
        
      case 'DynamicAABBTree':
        this.activeIndex = new DynamicAABBTree(
          this.config.dynamicAABB,
          this.config.eventEmitter
        );
        break;
        
      case 'UniformGridHash':
        if (!this.config.uniformGrid) {
          throw new Error('UniformGridHash requires grid configuration');
        }
        this.activeIndex = new UniformGridHash(
          this.config.uniformGrid,
          this.config.eventEmitter
        );
        break;
        
      default:
        this.activeIndex = new DynamicAABBTree(
          this.config.dynamicAABB,
          this.config.eventEmitter
        );
    }

    this.needsRebuild = true;
  }

  private rebuildIfNeeded(): void {
    if (!this.needsRebuild || !this.activeIndex) return;
    this.rebuild();
  }

  private considerOptimization(): void {
    if (this.operationCount < 1000) return; // Not enough data yet

    const itemCount = this.items.size;
    const debug = this.activeIndex?.debug();
    
    // Simple heuristics for index selection
    if (this.config.preferredIndex === 'DynamicAABBTree' && itemCount > 10000) {
      // Consider switching to UniformGridHash for large datasets
      if (this.config.uniformGrid) {
        this.switchIndex('UniformGridHash');
      }
    } else if (this.config.preferredIndex === 'UniformGridHash' && itemCount < 1000) {
      // Consider switching to DynamicAABBTree for smaller datasets
      this.switchIndex('DynamicAABBTree');
    }
    
    // Reset operation count after optimization check
    this.operationCount = 0;
  }
}

/**
 * Factory function for creating SpatialManager instances
 */
export function createSpatialManager(config?: SpatialManagerConfig): SpatialManager {
  return new SpatialManager(config);
}

/**
 * Utility function to choose the best index type for a given scenario
 */
export function recommendIndexType(scenario: {
  itemCount: number;
  staticItems: boolean;
  worldSize?: Vector3;
  queryFrequency: 'low' | 'medium' | 'high';
}): SpatialIndexType {
  if (scenario.staticItems) {
    return 'StaticBVH';
  }
  
  if (scenario.itemCount > 5000 && scenario.queryFrequency === 'high') {
    return 'UniformGridHash';
  }
  
  return 'DynamicAABBTree';
}
