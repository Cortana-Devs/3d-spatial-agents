/**
 * UniformGridHash - Fast Broad-Phase Spatial Hash
 * Feature ID: F03-ADVANCED-DATA-STRUCTURES - Step 4
 * 
 * Simple but very fast spatial index using uniform grid cells.
 * Excellent for broad-phase collision detection and scenarios with
 * relatively uniform object distribution.
 * 
 * Performance Target: Insert/Update/Remove O(1) average, Query O(1 + k)
 * Memory: O(occupied_cells + items) with automatic cleanup
 */

import { 
  SpatialIndex, 
  SpatialItem, 
  SpatialQuery, 
  SpatialQueryResult,
  SpatialDebugInfo,
  UniformGridConfig,
  SpatialEvent,
  SpatialError,
  AABB,
  Vector3,
  DS_API_VERSION 
} from './types';

interface GridCell {
  items: Set<SpatialItem>;
  lastAccess: number;
}

interface CellCoord {
  x: number;
  y: number;
  z: number;
}

export class UniformGridHash implements SpatialIndex {
  public readonly apiVersion = DS_API_VERSION;
  public readonly indexType = 'UniformGridHash' as const;

  private grid = new Map<string, GridCell>();
  private itemToCell = new Map<string, Set<string>>(); // itemId -> set of cell keys
  private config: Required<UniformGridConfig>;
  private lastCleanup = 0;
  
  private stats = {
    totalCells: 0,
    totalItems: 0,
    insertions: 0,
    updates: 0,
    removals: 0,
    cleanups: 0,
    maxItemsPerCell: 0
  };
  
  private queryStats = {
    totalQueries: 0,
    totalTime: 0,
    avgResultCount: 0,
    avgCellsChecked: 0
  };

  private eventEmitter?: (event: SpatialEvent) => void;

  constructor(config: UniformGridConfig, eventEmitter?: (event: SpatialEvent) => void) {
    this.config = {
      cellSize: config.cellSize,
      worldBounds: config.worldBounds,
      maxItemsPerCell: config.maxItemsPerCell ?? 100
    };
    
    this.eventEmitter = eventEmitter;
    
    // Validate configuration
    if (config.cellSize <= 0) {
      throw new SpatialError('DS_SPATIAL_INVALID_AABB', 'Cell size must be positive');
    }
    
    if (!this.isValidAABB(config.worldBounds)) {
      throw new SpatialError('DS_SPATIAL_INVALID_AABB', 'Invalid world bounds');
    }
  }

  /**
   * Insert an item into the grid
   */
  public insert(item: SpatialItem): void {
    if (this.itemToCell.has(item.id)) {
      throw new SpatialError('DS_SPATIAL_ITEM_NOT_FOUND', `Item ${item.id} already exists`);
    }

    this.addItemToCells(item);
    this.stats.insertions++;

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
   * Update an item's position
   */
  public update(itemId: string, newBounds: AABB): boolean {
    const cellKeys = this.itemToCell.get(itemId);
    if (!cellKeys) {
      return false;
    }

    // Find the item and update it
    let item: SpatialItem | undefined;
    cellKeys.forEach(cellKey => {
      if (item) return; // Already found
      const cell = this.grid.get(cellKey);
      if (cell) {
        cell.items.forEach(cellItem => {
          if (cellItem.id === itemId) {
            item = cellItem;
          }
        });
      }
    });

    if (!item) return false;

    // Remove from old cells
    this.removeItemFromCells(itemId);

    // Update bounds and re-add
    item.bounds = newBounds;
    this.addItemToCells(item);
    this.stats.updates++;

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
   * Remove an item from the grid
   */
  public remove(itemId: string): boolean {
    if (!this.itemToCell.has(itemId)) {
      return false;
    }

    this.removeItemFromCells(itemId);
    this.stats.removals++;

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
   * Query the grid for overlapping items
   */
  public query(query: SpatialQuery): SpatialQueryResult[] {
    const queryStart = performance.now();
    const results: SpatialQueryResult[] = [];
    const checkedItems = new Set<string>();

    // Get all cells that overlap with the query bounds
    const cellCoords = this.getCellsForBounds(query.bounds);
    let cellsChecked = 0;

    for (const coord of cellCoords) {
      const cellKey = this.cellKey(coord);
      const cell = this.grid.get(cellKey);
      
      if (!cell) continue;
      cellsChecked++;

      cell.lastAccess = Date.now();

      cell.items.forEach(item => {
        // Avoid duplicate results
        if (checkedItems.has(item.id)) return;
        checkedItems.add(item.id);

        // Check actual overlap
        if (AABB.overlaps(item.bounds, query.bounds)) {
          if (!query.filter || query.filter(item)) {
            results.push({ item });
          }
        }
      });

      if (query.maxResults && results.length >= query.maxResults) {
        break;
      }
    }

    // Update query statistics
    const queryTime = performance.now() - queryStart;
    this.queryStats.totalQueries++;
    this.queryStats.totalTime += queryTime;
    this.queryStats.avgResultCount = 
      (this.queryStats.avgResultCount * (this.queryStats.totalQueries - 1) + results.length) / 
      this.queryStats.totalQueries;
    this.queryStats.avgCellsChecked = 
      (this.queryStats.avgCellsChecked * (this.queryStats.totalQueries - 1) + cellsChecked) / 
      this.queryStats.totalQueries;

    this.eventEmitter?.({
      type: 'ds:spatial:query',
      timestamp: Date.now(),
      payload: {
        indexType: this.indexType,
        operation: 'query',
        queryTime,
        resultCount: results.length,
        cellsChecked
      }
    });

    // Perform periodic cleanup
    this.performCleanupIfNeeded();

    return results;
  }

  /**
   * Find nearest item to a point
   */
  public nearest(point: Vector3, maxDistance: number = Infinity): SpatialQueryResult | null {
    // Create expanding search pattern
    const searchBounds: AABB = {
      min: { x: point.x - maxDistance, y: point.y - maxDistance, z: point.z - maxDistance },
      max: { x: point.x + maxDistance, y: point.y + maxDistance, z: point.z + maxDistance }
    };

    const candidates = this.query({ bounds: searchBounds });
    
    let best: SpatialQueryResult | null = null;
    let bestDistance = maxDistance;

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
   * Get debug information
   */
  public debug(): SpatialDebugInfo {
    const avgQueryTime = this.queryStats.totalQueries > 0 
      ? this.queryStats.totalTime / this.queryStats.totalQueries 
      : 0;

    // Calculate current max items per cell
    let maxItems = 0;
    this.grid.forEach(cell => {
      maxItems = Math.max(maxItems, cell.items.size);
    });
    this.stats.maxItemsPerCell = maxItems;

    return {
      indexType: this.indexType,
      itemCount: this.stats.totalItems,
      nodeCount: this.grid.size,
      memoryUsage: this.estimateMemoryUsage(),
      queryStats: {
        totalQueries: this.queryStats.totalQueries,
        avgQueryTime,
        avgResultCount: this.queryStats.avgResultCount
      }
    };
  }

  // Private implementation methods

  private addItemToCells(item: SpatialItem): void {
    const cellCoords = this.getCellsForBounds(item.bounds);
    const cellKeys = new Set<string>();

    for (const coord of cellCoords) {
      const cellKey = this.cellKey(coord);
      cellKeys.add(cellKey);

      let cell = this.grid.get(cellKey);
      if (!cell) {
        cell = {
          items: new Set(),
          lastAccess: Date.now()
        };
        this.grid.set(cellKey, cell);
        this.stats.totalCells++;
      }

      cell.items.add(item);
      cell.lastAccess = Date.now();

      // Check for overcrowded cells
      if (cell.items.size > this.config.maxItemsPerCell) {
        console.warn(`Grid cell ${cellKey} has ${cell.items.size} items (max: ${this.config.maxItemsPerCell})`);
      }
    }

    this.itemToCell.set(item.id, cellKeys);
    this.stats.totalItems++;
  }

  private removeItemFromCells(itemId: string): void {
    const cellKeys = this.itemToCell.get(itemId);
    if (!cellKeys) return;

    cellKeys.forEach(cellKey => {
      const cell = this.grid.get(cellKey);
      if (cell) {
        // Find and remove the item
        let itemToRemove: SpatialItem | undefined;
        cell.items.forEach(item => {
          if (item.id === itemId) {
            itemToRemove = item;
          }
        });
        
        if (itemToRemove) {
          cell.items.delete(itemToRemove);
        }

        // Clean up empty cells
        if (cell.items.size === 0) {
          this.grid.delete(cellKey);
          this.stats.totalCells--;
        }
      }
    });

    this.itemToCell.delete(itemId);
    this.stats.totalItems--;
  }

  private getCellsForBounds(bounds: AABB): CellCoord[] {
    // Clamp bounds to world bounds
    const clampedBounds: AABB = {
      min: {
        x: Math.max(bounds.min.x, this.config.worldBounds.min.x),
        y: Math.max(bounds.min.y, this.config.worldBounds.min.y),
        z: Math.max(bounds.min.z, this.config.worldBounds.min.z)
      },
      max: {
        x: Math.min(bounds.max.x, this.config.worldBounds.max.x),
        y: Math.min(bounds.max.y, this.config.worldBounds.max.y),
        z: Math.min(bounds.max.z, this.config.worldBounds.max.z)
      }
    };

    // Check if bounds are outside world
    if (clampedBounds.min.x >= clampedBounds.max.x ||
        clampedBounds.min.y >= clampedBounds.max.y ||
        clampedBounds.min.z >= clampedBounds.max.z) {
      return [];
    }

    const minCell = this.worldToCell(clampedBounds.min);
    const maxCell = this.worldToCell(clampedBounds.max);

    const cells: CellCoord[] = [];
    for (let x = minCell.x; x <= maxCell.x; x++) {
      for (let y = minCell.y; y <= maxCell.y; y++) {
        for (let z = minCell.z; z <= maxCell.z; z++) {
          cells.push({ x, y, z });
        }
      }
    }

    return cells;
  }

  private worldToCell(point: Vector3): CellCoord {
    return {
      x: Math.floor((point.x - this.config.worldBounds.min.x) / this.config.cellSize),
      y: Math.floor((point.y - this.config.worldBounds.min.y) / this.config.cellSize),
      z: Math.floor((point.z - this.config.worldBounds.min.z) / this.config.cellSize)
    };
  }

  private cellToWorld(coord: CellCoord): Vector3 {
    return {
      x: this.config.worldBounds.min.x + coord.x * this.config.cellSize,
      y: this.config.worldBounds.min.y + coord.y * this.config.cellSize,
      z: this.config.worldBounds.min.z + coord.z * this.config.cellSize
    };
  }

  private cellKey(coord: CellCoord): string {
    return `${coord.x},${coord.y},${coord.z}`;
  }

  private performCleanupIfNeeded(): void {
    const now = Date.now();
    const cleanupInterval = 30000; // 30 seconds
    
    if (now - this.lastCleanup < cleanupInterval) {
      return;
    }

    this.lastCleanup = now;
    const inactiveThreshold = now - 60000; // 1 minute
    let cleanedCells = 0;

    this.grid.forEach((cell, cellKey) => {
      if (cell.lastAccess < inactiveThreshold && cell.items.size === 0) {
        this.grid.delete(cellKey);
        this.stats.totalCells--;
        cleanedCells++;
      }
    });

    if (cleanedCells > 0) {
      this.stats.cleanups++;
    }
  }

  private isValidAABB(bounds: AABB): boolean {
    return bounds.min.x <= bounds.max.x &&
           bounds.min.y <= bounds.max.y &&
           bounds.min.z <= bounds.max.z;
  }

  private estimateMemoryUsage(): number {
    const cellSize = 200; // Rough estimate per cell
    const itemRefSize = 8; // Reference to item
    return this.grid.size * cellSize + this.stats.totalItems * itemRefSize;
  }

  /**
   * Clear all items from the grid
   */
  public clear(): void {
    this.grid.clear();
    this.itemToCell.clear();
    this.lastCleanup = 0;
    
    this.stats = {
      totalCells: 0,
      totalItems: 0,
      insertions: 0,
      updates: 0,
      removals: 0,
      cleanups: 0,
      maxItemsPerCell: 0
    };
    
    this.queryStats = {
      totalQueries: 0,
      totalTime: 0,
      avgResultCount: 0,
      avgCellsChecked: 0
    };
  }

  /**
   * Get all items in the grid
   */
  public getAllItems(): SpatialItem[] {
    const items = new Set<SpatialItem>();
    
    this.grid.forEach(cell => {
      cell.items.forEach(item => {
        items.add(item);
      });
    });
    
    return Array.from(items);
  }

  /**
   * Get grid configuration
   */
  public getConfig(): Required<UniformGridConfig> {
    return { ...this.config };
  }

  /**
   * Get grid dimensions
   */
  public getGridDimensions(): { width: number; height: number; depth: number } {
    const worldSize = AABB.size(this.config.worldBounds);
    return {
      width: Math.ceil(worldSize.x / this.config.cellSize),
      height: Math.ceil(worldSize.y / this.config.cellSize),
      depth: Math.ceil(worldSize.z / this.config.cellSize)
    };
  }
}

/**
 * Factory function for creating UniformGridHash instances
 */
export function createUniformGridHash(
  config: UniformGridConfig,
  eventEmitter?: (event: SpatialEvent) => void
): UniformGridHash {
  return new UniformGridHash(config, eventEmitter);
}
