/**
 * DynamicAABBTree - Dynamic Axis-Aligned Bounding Box Tree
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Step 4
 * 
 * High-performance spatial index for dynamic objects that can insert/move/remove.
 * Uses "fattening" to reduce tree rebuilds when objects move slightly.
 * Self-balancing with automatic tree optimization.
 * 
 * Performance Target: Insert/Update/Remove O(log n), Query O(log n + k)
 * Memory: O(n) nodes with fattened AABBs for stability
 */

import { 
  SpatialIndex, 
  SpatialItem, 
  SpatialQuery, 
  SpatialQueryResult,
  SpatialDebugInfo,
  DynamicAABBConfig,
  SpatialEvent,
  SpatialError,
  AABB,
  Vector3,
  DS_API_VERSION 
} from './types';

interface TreeNode {
  id: number;
  fatBounds: AABB; // Expanded bounds for stability
  actualBounds: AABB; // True bounds of the item
  item?: SpatialItem; // Only present in leaf nodes
  parent?: TreeNode;
  left?: TreeNode;
  right?: TreeNode;
  height: number;
  isLeaf: boolean;
}

export class DynamicAABBTree implements SpatialIndex {
  public readonly apiVersion = DS_API_VERSION;
  public readonly indexType = 'DynamicAABBTree' as const;

  private root: TreeNode | null = null;
  private nodes = new Map<string, TreeNode>(); // itemId -> node mapping
  private nodeIdCounter = 1;
  private config: Required<DynamicAABBConfig>;
  private operationCount = 0;
  
  private stats = {
    totalNodes: 0,
    leafNodes: 0,
    maxDepth: 0,
    insertions: 0,
    updates: 0,
    removals: 0,
    rebuilds: 0
  };
  
  private queryStats = {
    totalQueries: 0,
    totalTime: 0,
    avgResultCount: 0
  };

  private eventEmitter?: (event: SpatialEvent) => void;

  constructor(config: DynamicAABBConfig = {}, eventEmitter?: (event: SpatialEvent) => void) {
    this.config = {
      fattenFactor: config.fattenFactor ?? 0.1,
      rebuildThreshold: config.rebuildThreshold ?? 1000,
      maxDepth: config.maxDepth ?? 30
    };
    this.eventEmitter = eventEmitter;
  }

  /**
   * Insert a new item into the tree
   */
  public insert(item: SpatialItem): void {
    if (this.nodes.has(item.id)) {
      throw new SpatialError('DS_SPATIAL_ITEM_NOT_FOUND', `Item with id ${item.id} already exists`);
    }

    const node = this.createLeafNode(item);
    this.nodes.set(item.id, node);

    if (!this.root) {
      this.root = node;
    } else {
      this.insertNode(node);
    }

    this.stats.insertions++;
    this.operationCount++;
    this.checkRebuild();

    this.eventEmitter?.({
      type: 'ds:spatial:insert',
      timestamp: Date.now(),
      payload: {
        indexType: this.indexType,
        operation: 'insert',
        itemId: item.id
      }
    });
  }

  /**
   * Update an existing item's bounds
   */
  public update(itemId: string, newBounds: AABB): boolean {
    const node = this.nodes.get(itemId);
    if (!node || !node.item) {
      return false;
    }

    // Check if the new bounds still fit within the fat bounds
    if (AABB.overlaps(newBounds, node.fatBounds) && 
        this.boundsContained(newBounds, node.fatBounds)) {
      // Update can be done in place
      node.actualBounds = newBounds;
      node.item.bounds = newBounds;
      return true;
    }

    // Need to reinsert the node
    this.removeNode(node);
    node.actualBounds = newBounds;
    node.fatBounds = AABB.fatten(newBounds, this.config.fattenFactor);
    node.item.bounds = newBounds;
    
    if (!this.root) {
      this.root = node;
    } else {
      this.insertNode(node);
    }

    this.stats.updates++;
    this.operationCount++;
    this.checkRebuild();

    this.eventEmitter?.({
      type: 'ds:spatial:update',
      timestamp: Date.now(),
      payload: {
        indexType: this.indexType,
        operation: 'update',
        itemId
      }
    });

    return true;
  }

  /**
   * Remove an item from the tree
   */
  public remove(itemId: string): boolean {
    const node = this.nodes.get(itemId);
    if (!node) {
      return false;
    }

    this.removeNode(node);
    this.nodes.delete(itemId);

    this.stats.removals++;
    this.operationCount++;

    this.eventEmitter?.({
      type: 'ds:spatial:remove',
      timestamp: Date.now(),
      payload: {
        indexType: this.indexType,
        operation: 'remove',
        itemId
      }
    });

    return true;
  }

  /**
   * Query the tree for overlapping items
   */
  public query(query: SpatialQuery): SpatialQueryResult[] {
    const queryStart = performance.now();
    const results: SpatialQueryResult[] = [];

    if (this.root) {
      this.queryNode(this.root, query, results);
    }

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
   * Get debug information
   */
  public debug(): SpatialDebugInfo {
    const avgQueryTime = this.queryStats.totalQueries > 0 
      ? this.queryStats.totalTime / this.queryStats.totalQueries 
      : 0;

    return {
      indexType: this.indexType,
      itemCount: this.nodes.size,
      nodeCount: this.stats.totalNodes,
      depth: this.calculateMaxDepth(),
      memoryUsage: this.estimateMemoryUsage(),
      queryStats: {
        totalQueries: this.queryStats.totalQueries,
        avgQueryTime,
        avgResultCount: this.queryStats.avgResultCount
      }
    };
  }

  // Private implementation methods

  private createLeafNode(item: SpatialItem): TreeNode {
    const node: TreeNode = {
      id: this.nodeIdCounter++,
      actualBounds: item.bounds,
      fatBounds: AABB.fatten(item.bounds, this.config.fattenFactor),
      item: item,
      height: 0,
      isLeaf: true
    };

    this.stats.totalNodes++;
    this.stats.leafNodes++;
    return node;
  }

  private createInternalNode(left: TreeNode, right: TreeNode): TreeNode {
    const node: TreeNode = {
      id: this.nodeIdCounter++,
      actualBounds: AABB.union(left.actualBounds, right.actualBounds),
      fatBounds: AABB.union(left.fatBounds, right.fatBounds),
      left,
      right,
      height: Math.max(left.height, right.height) + 1,
      isLeaf: false
    };

    left.parent = node;
    right.parent = node;
    this.stats.totalNodes++;
    return node;
  }

  private insertNode(leaf: TreeNode): void {
    if (!this.root) {
      this.root = leaf;
      return;
    }

    // Find the best insertion point using Surface Area Heuristic
    let node = this.root;
    while (!node.isLeaf) {
      const left = node.left!;
      const right = node.right!;
      
      // Calculate cost of inserting into each subtree
      const leftCost = this.calculateInsertionCost(leaf, left);
      const rightCost = this.calculateInsertionCost(leaf, right);
      
      node = leftCost < rightCost ? left : right;
    }

    // Create new internal node
    const oldParent = node.parent;
    const newParent = this.createInternalNode(node, leaf);
    
    if (!oldParent) {
      this.root = newParent;
    } else {
      if (oldParent.left === node) {
        oldParent.left = newParent;
      } else {
        oldParent.right = newParent;
      }
      newParent.parent = oldParent;
    }

    // Refit ancestors
    this.refitAncestors(newParent);
  }

  private removeNode(leaf: TreeNode): void {
    if (leaf === this.root) {
      this.root = null;
      return;
    }

    const parent = leaf.parent!;
    const sibling = parent.left === leaf ? parent.right! : parent.left!;
    
    if (parent === this.root) {
      this.root = sibling;
      sibling.parent = undefined;
    } else {
      const grandParent = parent.parent!;
      sibling.parent = grandParent;
      
      if (grandParent.left === parent) {
        grandParent.left = sibling;
      } else {
        grandParent.right = sibling;
      }
      
      this.refitAncestors(grandParent);
    }

    this.stats.totalNodes--;
    if (leaf.isLeaf) this.stats.leafNodes--;
  }

  private calculateInsertionCost(leaf: TreeNode, subtree: TreeNode): number {
    const unionBounds = AABB.union(leaf.fatBounds, subtree.fatBounds);
    const newArea = AABB.surfaceArea(unionBounds);
    const oldArea = AABB.surfaceArea(subtree.fatBounds);
    return newArea - oldArea;
  }

  private refitAncestors(node: TreeNode): void {
    let current: TreeNode | undefined = node;
    
    while (current) {
      if (current.isLeaf) {
        current = current.parent;
        continue;
      }

      const left = current.left!;
      const right = current.right!;
      
      // Recompute bounds
      current.actualBounds = AABB.union(left.actualBounds, right.actualBounds);
      current.fatBounds = AABB.union(left.fatBounds, right.fatBounds);
      current.height = Math.max(left.height, right.height) + 1;

      // Check if balancing is needed
      const balance = this.getBalance(current);
      if (Math.abs(balance) > 1) {
        current = this.rebalance(current);
      }

      current = current.parent;
    }
  }

  private getBalance(node: TreeNode): number {
    if (node.isLeaf) return 0;
    const leftHeight = node.left?.height ?? -1;
    const rightHeight = node.right?.height ?? -1;
    return leftHeight - rightHeight;
  }

  private rebalance(node: TreeNode): TreeNode {
    const balance = this.getBalance(node);
    
    if (balance > 1) {
      // Left heavy
      if (this.getBalance(node.left!) < 0) {
        node.left = this.rotateLeft(node.left!);
      }
      return this.rotateRight(node);
    } else if (balance < -1) {
      // Right heavy
      if (this.getBalance(node.right!) > 0) {
        node.right = this.rotateRight(node.right!);
      }
      return this.rotateLeft(node);
    }
    
    return node;
  }

  private rotateLeft(node: TreeNode): TreeNode {
    const newRoot = node.right!;
    node.right = newRoot.left;
    newRoot.left = node;

    if (node.right) node.right.parent = node;
    newRoot.parent = node.parent;
    node.parent = newRoot;

    // Update heights
    node.height = Math.max(node.left?.height ?? -1, node.right?.height ?? -1) + 1;
    newRoot.height = Math.max(newRoot.left?.height ?? -1, newRoot.right?.height ?? -1) + 1;

    return newRoot;
  }

  private rotateRight(node: TreeNode): TreeNode {
    const newRoot = node.left!;
    node.left = newRoot.right;
    newRoot.right = node;

    if (node.left) node.left.parent = node;
    newRoot.parent = node.parent;
    node.parent = newRoot;

    // Update heights
    node.height = Math.max(node.left?.height ?? -1, node.right?.height ?? -1) + 1;
    newRoot.height = Math.max(newRoot.left?.height ?? -1, newRoot.right?.height ?? -1) + 1;

    return newRoot;
  }

  private queryNode(node: TreeNode, query: SpatialQuery, results: SpatialQueryResult[]): void {
    if (!AABB.overlaps(node.fatBounds, query.bounds)) {
      return;
    }

    if (node.isLeaf && node.item) {
      if (AABB.overlaps(node.actualBounds, query.bounds)) {
        if (!query.filter || query.filter(node.item)) {
          results.push({ item: node.item });
        }
      }
    } else {
      if (node.left) this.queryNode(node.left, query, results);
      if (node.right) this.queryNode(node.right, query, results);
    }
  }

  private nearestSearch(
    node: TreeNode, 
    point: Vector3, 
    callback: (result: SpatialQueryResult, distance: number) => void
  ): void {
    if (node.isLeaf && node.item) {
      const center = AABB.center(node.actualBounds);
      const distance = Math.sqrt(
        (point.x - center.x) ** 2 +
        (point.y - center.y) ** 2 +
        (point.z - center.z) ** 2
      );
      callback({ item: node.item }, distance);
    } else {
      if (node.left) this.nearestSearch(node.left, point, callback);
      if (node.right) this.nearestSearch(node.right, point, callback);
    }
  }

  private boundsContained(inner: AABB, outer: AABB): boolean {
    return inner.min.x >= outer.min.x && inner.min.y >= outer.min.y && inner.min.z >= outer.min.z &&
           inner.max.x <= outer.max.x && inner.max.y <= outer.max.y && inner.max.z <= outer.max.z;
  }

  private checkRebuild(): void {
    if (this.operationCount >= this.config.rebuildThreshold) {
      // Consider rebuilding for better balance
      // For now, just reset the counter
      this.operationCount = 0;
    }
  }

  private calculateMaxDepth(): number {
    if (!this.root) return 0;
    
    const calculateDepth = (node: TreeNode): number => {
      if (node.isLeaf) return 1;
      const leftDepth = node.left ? calculateDepth(node.left) : 0;
      const rightDepth = node.right ? calculateDepth(node.right) : 0;
      return Math.max(leftDepth, rightDepth) + 1;
    };
    
    return calculateDepth(this.root);
  }

  private estimateMemoryUsage(): number {
    const nodeSize = 300; // Rough estimate per node
    return this.stats.totalNodes * nodeSize;
  }

  /**
   * Clear all items from the tree
   */
  public clear(): void {
    this.root = null;
    this.nodes.clear();
    this.nodeIdCounter = 1;
    this.operationCount = 0;
    
    this.stats = {
      totalNodes: 0,
      leafNodes: 0,
      maxDepth: 0,
      insertions: 0,
      updates: 0,
      removals: 0,
      rebuilds: 0
    };
    
    this.queryStats = {
      totalQueries: 0,
      totalTime: 0,
      avgResultCount: 0
    };
  }

  /**
   * Get all items in the tree
   */
  public getAllItems(): SpatialItem[] {
    const items: SpatialItem[] = [];
    this.nodes.forEach(node => {
      if (node.item) {
        items.push(node.item);
      }
    });
    return items;
  }
}

/**
 * Factory function for creating DynamicAABBTree instances
 */
export function createDynamicAABBTree(
  config?: DynamicAABBConfig,
  eventEmitter?: (event: SpatialEvent) => void
): DynamicAABBTree {
  return new DynamicAABBTree(config, eventEmitter);
}
