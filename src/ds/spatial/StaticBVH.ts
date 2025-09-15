/**
 * StaticBVH - Static Bounding Volume Hierarchy
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Step 4
 * 
 * High-performance spatial index for static geometry that doesn't change.
 * Uses Surface Area Heuristic (SAH) for optimal tree construction.
 * 
 * Performance Target: Query time O(log n) for well-distributed geometry
 * Memory: O(n) nodes, minimal overhead per item
 */

import { 
  SpatialIndex, 
  SpatialItem, 
  SpatialQuery, 
  SpatialQueryResult,
  SpatialDebugInfo,
  StaticBVHConfig,
  SpatialEvent,
  SpatialError,
  AABB,
  Vector3,
  DS_API_VERSION 
} from './types';

interface BVHNode {
  bounds: AABB;
  items: SpatialItem[];
  left?: BVHNode;
  right?: BVHNode;
  isLeaf: boolean;
}

export class StaticBVH implements SpatialIndex {
  public readonly apiVersion = DS_API_VERSION;
  public readonly indexType = 'StaticBVH' as const;

  private root: BVHNode | null = null;
  private config: Required<StaticBVHConfig>;
  private buildStats = {
    totalNodes: 0,
    leafNodes: 0,
    maxDepth: 0,
    buildTime: 0,
    itemCount: 0
  };
  
  private queryStats = {
    totalQueries: 0,
    totalTime: 0,
    avgResultCount: 0
  };

  private eventEmitter?: (event: SpatialEvent) => void;

  constructor(config: StaticBVHConfig = {}, eventEmitter?: (event: SpatialEvent) => void) {
    this.config = {
      maxItemsPerLeaf: config.maxItemsPerLeaf ?? 4,
      maxDepth: config.maxDepth ?? 20,
      splitStrategy: config.splitStrategy ?? 'sah'
    };
    this.eventEmitter = eventEmitter;
  }

  /**
   * Build the BVH from a collection of static items
   * This should be called once with all items that won't change
   */
  public build(items: SpatialItem[]): void {
    const buildStart = performance.now();
    
    if (items.length === 0) {
      this.root = null;
      return;
    }

    // Reset build stats
    this.buildStats = {
      totalNodes: 0,
      leafNodes: 0,
      maxDepth: 0,
      buildTime: 0,
      itemCount: items.length
    };

    // Build the tree recursively
    this.root = this.buildNode(items, 0);
    
    this.buildStats.buildTime = performance.now() - buildStart;

    this.eventEmitter?.({
      type: 'ds:spatial:rebuild',
      timestamp: Date.now(),
      payload: {
        indexType: this.indexType,
        operation: 'build',
        itemCount: items.length,
        buildTime: this.buildStats.buildTime,
        nodeCount: this.buildStats.totalNodes
      }
    });
  }

  /**
   * Query the BVH for items overlapping the query bounds
   */
  public query(query: SpatialQuery): SpatialQueryResult[] {
    const queryStart = performance.now();
    const results: SpatialQueryResult[] = [];

    if (!this.root) {
      return results;
    }

    this.queryNode(this.root, query, results);

    // Apply max results limit
    if (query.maxResults && results.length > query.maxResults) {
      results.length = query.maxResults;
    }

    // Update query statistics
    const queryTime = performance.now() - queryStart;
    this.queryStats.totalQueries++;
    this.queryStats.totalTime += queryTime;
    this.queryStats.avgResultCount = 
      (this.queryStats.avgResultCount * (this.queryStats.totalQueries - 1) + results.length) / 
      this.queryStats.totalQueries;

    this.eventEmitter?.({
      type: 'ds:spatial:query',
      timestamp: Date.now(),
      payload: {
        indexType: this.indexType,
        operation: 'query',
        queryTime,
        resultCount: results.length
      }
    });

    return results;
  }

  /**
   * Raycast through the BVH (basic implementation)
   */
  public raycast(origin: Vector3, direction: Vector3, maxDistance: number = Infinity): SpatialQueryResult[] {
    // For simplicity, convert raycast to AABB query
    // A more sophisticated implementation would use actual ray-AABB intersection
    const endPoint = {
      x: origin.x + direction.x * maxDistance,
      y: origin.y + direction.y * maxDistance,
      z: origin.z + direction.z * maxDistance
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
   * Find nearest item to a point
   */
  public nearest(point: Vector3, maxDistance: number = Infinity): SpatialQueryResult | null {
    if (!this.root) return null;

    let best: SpatialQueryResult | null = null;
    let bestDistance = maxDistance;

    this.nearestSearch(this.root, point, (result, distance) => {
      if (distance < bestDistance) {
        best = { ...result, distance };
        bestDistance = distance;
      }
    });

    return best;
  }

  /**
   * Get debug information about the BVH
   */
  public debug(): SpatialDebugInfo {
    const avgQueryTime = this.queryStats.totalQueries > 0 
      ? this.queryStats.totalTime / this.queryStats.totalQueries 
      : 0;

    return {
      indexType: this.indexType,
      itemCount: this.buildStats.itemCount,
      nodeCount: this.buildStats.totalNodes,
      depth: this.buildStats.maxDepth,
      memoryUsage: this.estimateMemoryUsage(),
      lastRebuild: this.buildStats.buildTime,
      queryStats: {
        totalQueries: this.queryStats.totalQueries,
        avgQueryTime,
        avgResultCount: this.queryStats.avgResultCount
      }
    };
  }

  // Private implementation methods

  private buildNode(items: SpatialItem[], depth: number): BVHNode {
    this.buildStats.totalNodes++;
    this.buildStats.maxDepth = Math.max(this.buildStats.maxDepth, depth);

    // Calculate bounding box for all items
    const bounds = this.calculateBounds(items);

    // Create leaf node if we should stop subdividing
    if (items.length <= this.config.maxItemsPerLeaf || 
        depth >= this.config.maxDepth ||
        !this.shouldSplit(items, bounds)) {
      
      this.buildStats.leafNodes++;
      return {
        bounds,
        items: [...items],
        isLeaf: true
      };
    }

    // Split items into two groups
    const { left, right } = this.splitItems(items, bounds);
    
    // Handle degenerate splits
    if (left.length === 0 || right.length === 0) {
      this.buildStats.leafNodes++;
      return {
        bounds,
        items: [...items],
        isLeaf: true
      };
    }

    // Build child nodes recursively
    const leftNode = this.buildNode(left, depth + 1);
    const rightNode = this.buildNode(right, depth + 1);

    return {
      bounds,
      items: [],
      left: leftNode,
      right: rightNode,
      isLeaf: false
    };
  }

  private splitItems(items: SpatialItem[], bounds: AABB): { left: SpatialItem[]; right: SpatialItem[] } {
    if (this.config.splitStrategy === 'sah') {
      return this.splitBySAH(items, bounds);
    } else {
      return this.splitByMedian(items, bounds);
    }
  }

  private splitBySAH(items: SpatialItem[], bounds: AABB): { left: SpatialItem[]; right: SpatialItem[] } {
    // For performance, limit SAH evaluation to reasonable subset
    if (items.length > 50) {
      return this.splitByMedian(items, bounds);
    }

    let bestCost = Infinity;
    let bestSplit: { left: SpatialItem[]; right: SpatialItem[] } | null = null;

    // Try splits along each axis
    const axes: (keyof Vector3)[] = ['x', 'y', 'z'];
    
    for (const axis of axes) {
      // Sort items by centroid along this axis
      const sortedItems = [...items].sort((a, b) => {
        const aCenter = AABB.center(a.bounds);
        const bCenter = AABB.center(b.bounds);
        return aCenter[axis] - bCenter[axis];
      });

      // Try split positions, but limit to avoid O(n^2) behavior
      const step = Math.max(1, Math.floor(sortedItems.length / 8));
      for (let i = step; i < sortedItems.length; i += step) {
        const left = sortedItems.slice(0, i);
        const right = sortedItems.slice(i);
        
        const cost = this.calculateSAHCost(left, right, bounds);
        if (cost < bestCost) {
          bestCost = cost;
          bestSplit = { left, right };
        }
      }
    }

    return bestSplit || this.splitByMedian(items, bounds);
  }

  private splitByMedian(items: SpatialItem[], bounds: AABB): { left: SpatialItem[]; right: SpatialItem[] } {
    // Find the longest axis
    const size = AABB.size(bounds);
    let splitAxis: keyof Vector3 = 'x';
    if (size.y > size.x && size.y > size.z) splitAxis = 'y';
    else if (size.z > size.x) splitAxis = 'z';

    // Sort items by centroid along the split axis
    const sortedItems = [...items].sort((a, b) => {
      const aCenter = AABB.center(a.bounds);
      const bCenter = AABB.center(b.bounds);
      return aCenter[splitAxis] - bCenter[splitAxis];
    });

    const mid = Math.floor(sortedItems.length / 2);
    return {
      left: sortedItems.slice(0, mid),
      right: sortedItems.slice(mid)
    };
  }

  private calculateSAHCost(left: SpatialItem[], right: SpatialItem[], parentBounds: AABB): number {
    const leftBounds = this.calculateBounds(left);
    const rightBounds = this.calculateBounds(right);
    
    const parentSA = AABB.surfaceArea(parentBounds);
    const leftSA = AABB.surfaceArea(leftBounds);
    const rightSA = AABB.surfaceArea(rightBounds);

    // SAH cost: probability * items + traversal cost
    const leftProb = leftSA / parentSA;
    const rightProb = rightSA / parentSA;
    
    return leftProb * left.length + rightProb * right.length + 0.125; // Small traversal cost
  }

  private shouldSplit(items: SpatialItem[], bounds: AABB): boolean {
    // Don't split if items are very close together (avoid infinite recursion)
    const size = AABB.size(bounds);
    const minSize = 0.001;
    return size.x > minSize || size.y > minSize || size.z > minSize;
  }

  private calculateBounds(items: SpatialItem[]): AABB {
    if (items.length === 0) {
      return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
    }

    let bounds = { ...items[0].bounds };
    for (let i = 1; i < items.length; i++) {
      bounds = AABB.union(bounds, items[i].bounds);
    }
    return bounds;
  }

  private queryNode(node: BVHNode, query: SpatialQuery, results: SpatialQueryResult[]): void {
    // Early exit if query doesn't overlap node bounds
    if (!AABB.overlaps(node.bounds, query.bounds)) {
      return;
    }

    if (node.isLeaf) {
      // Check each item in the leaf
      for (const item of node.items) {
        if (AABB.overlaps(item.bounds, query.bounds)) {
          // Apply filter if provided
          if (!query.filter || query.filter(item)) {
            results.push({ item });
          }
        }
      }
    } else {
      // Recursively search children
      if (node.left) this.queryNode(node.left, query, results);
      if (node.right) this.queryNode(node.right, query, results);
    }
  }

  private nearestSearch(
    node: BVHNode, 
    point: Vector3, 
    callback: (result: SpatialQueryResult, distance: number) => void
  ): void {
    if (node.isLeaf) {
      for (const item of node.items) {
        const center = AABB.center(item.bounds);
        const distance = Math.sqrt(
          (point.x - center.x) ** 2 +
          (point.y - center.y) ** 2 +
          (point.z - center.z) ** 2
        );
        callback({ item }, distance);
      }
    } else {
      // Search both children, potentially in order of distance
      if (node.left) this.nearestSearch(node.left, point, callback);
      if (node.right) this.nearestSearch(node.right, point, callback);
    }
  }

  private estimateMemoryUsage(): number {
    // Rough estimate: each node ~200 bytes + item references
    const nodeSize = 200;
    const itemRefSize = 8;
    return this.buildStats.totalNodes * nodeSize + 
           this.buildStats.itemCount * itemRefSize;
  }

  /**
   * Clear the BVH (for testing or rebuilding)
   */
  public clear(): void {
    this.root = null;
    this.buildStats = {
      totalNodes: 0,
      leafNodes: 0,
      maxDepth: 0,
      buildTime: 0,
      itemCount: 0
    };
    this.queryStats = {
      totalQueries: 0,
      totalTime: 0,
      avgResultCount: 0
    };
  }

  /**
   * Check if BVH has been built
   */
  public isBuilt(): boolean {
    return this.root !== null;
  }
}

/**
 * Factory function for creating StaticBVH instances
 */
export function createStaticBVH(
  config?: StaticBVHConfig,
  eventEmitter?: (event: SpatialEvent) => void
): StaticBVH {
  return new StaticBVH(config, eventEmitter);
}
