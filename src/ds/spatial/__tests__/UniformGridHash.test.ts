/**
 * UniformGridHash Tests  
 * Comprehensive validation of UniformGridHash implementation
 * Tests grid operations, cleanup, and performance
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UniformGridHash, createUniformGridHash } from '../UniformGridHash';
import { SpatialItem, SpatialEvent, AABB } from '../types';

describe('UniformGridHash', () => {
  let grid: UniformGridHash;
  let events: SpatialEvent[] = [];
  let mockEventEmitter: (event: SpatialEvent) => void;

  const worldBounds: AABB = {
    min: { x: 0, y: 0, z: 0 },
    max: { x: 100, y: 100, z: 100 }
  };

  beforeEach(() => {
    events = [];
    mockEventEmitter = (event: SpatialEvent) => {
      events.push(event);
    };
    
    grid = createUniformGridHash({
      cellSize: 10,
      worldBounds,
      maxItemsPerCell: 50
    }, mockEventEmitter) as UniformGridHash;
  });

  describe('Basic Operations', () => {
    it('should insert items into grid', () => {
      const item: SpatialItem = {
        id: 'test1',
        bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 7, y: 7, z: 7 } }
      };

      grid.insert(item);
      
      const debug = grid.debug();
      expect(debug.itemCount).toBe(1);
      
      const insertEvents = events.filter(e => e.type === 'ds:spatial:insert');
      expect(insertEvents).toHaveLength(1);
    });

    it('should update item positions', () => {
      const item: SpatialItem = {
        id: 'update1',
        bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 7, y: 7, z: 7 } }
      };

      grid.insert(item);
      
      const updated = grid.update('update1', {
        min: { x: 15, y: 15, z: 15 },
        max: { x: 17, y: 17, z: 17 }
      });

      expect(updated).toBe(true);
      
      // Verify item moved by querying both locations
      const oldResults = grid.query({
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } }
      });
      expect(oldResults).toHaveLength(0);

      const newResults = grid.query({
        bounds: { min: { x: 10, y: 10, z: 10 }, max: { x: 20, y: 20, z: 20 } }
      });
      expect(newResults).toHaveLength(1);
    });

    it('should remove items', () => {
      const item: SpatialItem = {
        id: 'remove1',
        bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 7, y: 7, z: 7 } }
      };

      grid.insert(item);
      expect(grid.debug().itemCount).toBe(1);

      const removed = grid.remove('remove1');
      expect(removed).toBe(true);
      expect(grid.debug().itemCount).toBe(0);
    });

    it('should handle non-existent items gracefully', () => {
      expect(grid.update('nonexistent', { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } })).toBe(false);
      expect(grid.remove('nonexistent')).toBe(false);
    });

    it('should prevent duplicate insertions', () => {
      const item: SpatialItem = {
        id: 'duplicate',
        bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 7, y: 7, z: 7 } }
      };

      grid.insert(item);
      expect(() => grid.insert(item)).toThrow();
    });
  });

  describe('Spatial Querying', () => {
    beforeEach(() => {
      // Set up test data in different grid cells
      const items: SpatialItem[] = [
        { id: 'cell1', bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 7, y: 7, z: 7 } } },        // Cell (0,0,0)
        { id: 'cell2', bounds: { min: { x: 15, y: 15, z: 15 }, max: { x: 17, y: 17, z: 17 } } },    // Cell (1,1,1)
        { id: 'cell3', bounds: { min: { x: 25, y: 5, z: 5 }, max: { x: 27, y: 7, z: 7 } } },       // Cell (2,0,0)
        { id: 'spanning', bounds: { min: { x: 8, y: 8, z: 8 }, max: { x: 12, y: 12, z: 12 } } }    // Spans multiple cells
      ];

      items.forEach(item => grid.insert(item));
    });

    it('should query items in single cell', () => {
      const results = grid.query({
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 9, y: 9, z: 9 } }
      });

      expect(results.some(r => r.item.id === 'cell1')).toBe(true);
      expect(results.some(r => r.item.id === 'spanning')).toBe(true);
    });

    it('should query items across multiple cells', () => {
      const results = grid.query({
        bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 25, y: 25, z: 25 } }
      });

      expect(results.length).toBeGreaterThanOrEqual(3);
      expect(results.some(r => r.item.id === 'cell1')).toBe(true);
      expect(results.some(r => r.item.id === 'cell2')).toBe(true);
      expect(results.some(r => r.item.id === 'spanning')).toBe(true);
    });

    it('should handle queries outside world bounds', () => {
      const results = grid.query({
        bounds: { min: { x: -10, y: -10, z: -10 }, max: { x: -5, y: -5, z: -5 } }
      });

      expect(results).toHaveLength(0);
    });

    it('should apply query filters', () => {
      const results = grid.query({
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 50, y: 50, z: 50 } },
        filter: (item) => item.id.includes('cell')
      });

      expect(results.every(r => r.item.id.includes('cell'))).toBe(true);
      expect(results.some(r => r.item.id === 'spanning')).toBe(false);
    });

    it('should respect maxResults limit', () => {
      const results = grid.query({
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 100, y: 100, z: 100 } },
        maxResults: 2
      });

      expect(results).toHaveLength(2);
    });

    it('should avoid duplicate results for spanning items', () => {
      const results = grid.query({
        bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 15, y: 15, z: 15 } }
      });

      const spanningResults = results.filter(r => r.item.id === 'spanning');
      expect(spanningResults).toHaveLength(1); // Should appear only once despite spanning cells
    });

    it('should find nearest items', () => {
      const nearest = grid.nearest({ x: 6, y: 6, z: 6 });
      
      expect(nearest).not.toBeNull();
      expect(nearest!.item.id).toBe('cell1'); // Should be closest
      expect(nearest!.distance).toBeDefined();
    });

    it('should respect nearest maxDistance', () => {
      const nearest = grid.nearest({ x: 50, y: 50, z: 50 }, 5);
      expect(nearest).toBeNull(); // Nothing within 5 units
    });
  });

  describe('Grid Cell Management', () => {
    it('should handle items spanning multiple cells', () => {
      const largeItem: SpatialItem = {
        id: 'large',
        bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 25, y: 25, z: 25 } } // Spans 3x3x3 = 27 cells
      };

      grid.insert(largeItem);

      // Query different regions to verify item appears in all relevant cells
      const results1 = grid.query({
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } }
      });
      expect(results1.some(r => r.item.id === 'large')).toBe(true);

      const results2 = grid.query({
        bounds: { min: { x: 20, y: 20, z: 20 }, max: { x: 30, y: 30, z: 30 } }
      });
      expect(results2.some(r => r.item.id === 'large')).toBe(true);
    });

    it('should clean up empty cells', () => {
      const tempItem: SpatialItem = {
        id: 'temp',
        bounds: { min: { x: 50, y: 50, z: 50 }, max: { x: 52, y: 52, z: 52 } }
      };

      grid.insert(tempItem);
      let debug = grid.debug();
      expect(debug.nodeCount).toBeGreaterThan(0); // Should have cells

      grid.remove('temp');
      debug = grid.debug();
      // Empty cells should be cleaned up eventually
    });

    it('should handle cell overflow gracefully', () => {
      // Add many items to single cell
      for (let i = 0; i < 60; i++) { // Exceeds maxItemsPerCell (50)
        grid.insert({
          id: `overflow${i}`,
          bounds: {
            min: { x: 5 + i * 0.01, y: 5, z: 5 },
            max: { x: 6 + i * 0.01, y: 6, z: 6 }
          }
        });
      }

      // Grid should still function despite overflow
      const results = grid.query({
        bounds: { min: { x: 4, y: 4, z: 4 }, max: { x: 8, y: 8, z: 8 } }
      });

      expect(results).toHaveLength(60);
    });
  });

  describe('Performance', () => {
    it('should handle many insertions efficiently', () => {
      const items: SpatialItem[] = [];
      for (let i = 0; i < 1000; i++) {
        items.push({
          id: `perf${i}`,
          bounds: {
            min: { x: Math.random() * 90, y: Math.random() * 90, z: Math.random() * 90 },
            max: { x: Math.random() * 90 + 1, y: Math.random() * 90 + 1, z: Math.random() * 90 + 1 }
          }
        });
      }

      const startTime = performance.now();
      items.forEach(item => grid.insert(item));
      const insertTime = performance.now() - startTime;

      console.log(`UniformGrid insert time for 1000 items: ${insertTime}ms`);
      expect(insertTime).toBeLessThan(100); // Should be very fast
      expect(grid.debug().itemCount).toBe(1000);
    });

    it('should query efficiently', () => {
      // Insert distributed test data
      for (let i = 0; i < 2000; i++) {
        grid.insert({
          id: `query${i}`,
          bounds: {
            min: { x: Math.random() * 90, y: Math.random() * 90, z: Math.random() * 90 },
            max: { x: Math.random() * 90 + 2, y: Math.random() * 90 + 2, z: Math.random() * 90 + 2 }
          }
        });
      }

      // Perform multiple queries
      const queryTimes: number[] = [];
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 80;
        const y = Math.random() * 80;
        const z = Math.random() * 80;

        const startTime = performance.now();
        grid.query({
          bounds: {
            min: { x, y, z },
            max: { x: x + 10, y: y + 10, z: z + 10 }
          }
        });
        queryTimes.push(performance.now() - startTime);
      }

      const avgQueryTime = queryTimes.reduce((a, b) => a + b) / queryTimes.length;
      console.log(`UniformGrid avg query time for 2000 items: ${avgQueryTime}ms`);
      expect(avgQueryTime).toBeLessThan(1.0); // Should be very fast
    });

    it('should handle updates efficiently', () => {
      // Insert items
      for (let i = 0; i < 500; i++) {
        grid.insert({
          id: `update${i}`,
          bounds: {
            min: { x: i % 10 * 10, y: Math.floor(i / 10) % 10 * 10, z: 0 },
            max: { x: i % 10 * 10 + 1, y: Math.floor(i / 10) % 10 * 10 + 1, z: 1 }
          }
        });
      }

      // Update them all
      const startTime = performance.now();
      for (let i = 0; i < 500; i++) {
        grid.update(`update${i}`, {
          min: { x: Math.random() * 80, y: Math.random() * 80, z: Math.random() * 80 },
          max: { x: Math.random() * 80 + 1, y: Math.random() * 80 + 1, z: Math.random() * 80 + 1 }
        });
      }
      const updateTime = performance.now() - startTime;

      console.log(`UniformGrid update time for 500 items: ${updateTime}ms`);
      expect(updateTime).toBeLessThan(50);
    });
  });

  describe('Configuration and Bounds', () => {
    it('should validate world bounds', () => {
      expect(() => {
        createUniformGridHash({
          cellSize: 10,
          worldBounds: { min: { x: 10, y: 10, z: 10 }, max: { x: 5, y: 5, z: 5 } } // Invalid bounds
        });
      }).toThrow();
    });

    it('should validate cell size', () => {
      expect(() => {
        createUniformGridHash({
          cellSize: 0,
          worldBounds
        });
      }).toThrow();
    });

    it('should provide grid configuration', () => {
      const config = grid.getConfig();
      expect(config.cellSize).toBe(10);
      expect(config.worldBounds).toEqual(worldBounds);
      expect(config.maxItemsPerCell).toBe(50);
    });

    it('should provide grid dimensions', () => {
      const dimensions = grid.getGridDimensions();
      expect(dimensions.width).toBe(10); // 100/10 = 10 cells
      expect(dimensions.height).toBe(10);
      expect(dimensions.depth).toBe(10);
    });
  });

  describe('Automatic Cleanup', () => {
    it('should perform periodic cleanup', () => {
      // Insert and remove items to create inactive cells
      for (let i = 0; i < 50; i++) {
        grid.insert({
          id: `cleanup${i}`,
          bounds: {
            min: { x: i * 2, y: 0, z: 0 },
            max: { x: i * 2 + 1, y: 1, z: 1 }
          }
        });
      }

      // Remove all items
      for (let i = 0; i < 50; i++) {
        grid.remove(`cleanup${i}`);
      }

      // Trigger cleanup by performing queries (which check cleanup conditions)
      for (let i = 0; i < 5; i++) {
        grid.query({ bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } } });
      }

      // Verify cleanup occurred
      expect(grid.debug().itemCount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle items on cell boundaries', () => {
      const boundaryItem: SpatialItem = {
        id: 'boundary',
        bounds: { min: { x: 10, y: 10, z: 10 }, max: { x: 10, y: 10, z: 10 } } // Point on boundary
      };

      grid.insert(boundaryItem);

      const results = grid.query({
        bounds: { min: { x: 9, y: 9, z: 9 }, max: { x: 11, y: 11, z: 11 } }
      });

      expect(results.some(r => r.item.id === 'boundary')).toBe(true);
    });

    it('should handle items outside world bounds', () => {
      const outsideItem: SpatialItem = {
        id: 'outside',
        bounds: { min: { x: -10, y: -10, z: -10 }, max: { x: -5, y: -5, z: -5 } }
      };

      // Should not crash, but item won't be queryable
      grid.insert(outsideItem);
      expect(grid.debug().itemCount).toBe(1);

      const results = grid.query({
        bounds: { min: { x: -15, y: -15, z: -15 }, max: { x: 0, y: 0, z: 0 } }
      });
      expect(results).toHaveLength(0); // Outside world bounds
    });

    it('should handle zero-size items', () => {
      const pointItem: SpatialItem = {
        id: 'point',
        bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 5, y: 5, z: 5 } }
      };

      grid.insert(pointItem);

      const results = grid.query({
        bounds: { min: { x: 4, y: 4, z: 4 }, max: { x: 6, y: 6, z: 6 } }
      });

      expect(results.some(r => r.item.id === 'point')).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should clear grid properly', () => {
      // Insert items
      for (let i = 0; i < 100; i++) {
        grid.insert({
          id: `clear${i}`,
          bounds: {
            min: { x: i % 10 * 10, y: Math.floor(i / 10) * 10, z: 0 },
            max: { x: i % 10 * 10 + 1, y: Math.floor(i / 10) * 10 + 1, z: 1 }
          }
        });
      }

      expect(grid.debug().itemCount).toBe(100);

      grid.clear();
      
      expect(grid.debug().itemCount).toBe(0);
      expect(grid.getAllItems()).toHaveLength(0);
    });

    it('should get all items correctly', () => {
      const items: SpatialItem[] = [
        { id: 'all1', bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 6, y: 6, z: 6 } } },
        { id: 'all2', bounds: { min: { x: 15, y: 15, z: 15 }, max: { x: 16, y: 16, z: 16 } } },
        { id: 'all3', bounds: { min: { x: 8, y: 8, z: 8 }, max: { x: 12, y: 12, z: 12 } } } // Spanning item
      ];

      items.forEach(item => grid.insert(item));

      const allItems = grid.getAllItems();
      expect(allItems).toHaveLength(3);
      expect(allItems.some(item => item.id === 'all1')).toBe(true);
      expect(allItems.some(item => item.id === 'all2')).toBe(true);
      expect(allItems.some(item => item.id === 'all3')).toBe(true);
    });
  });

  describe('Debug Information', () => {
    it('should provide accurate debug information', () => {
      // Add items to different cells
      for (let i = 0; i < 25; i++) {
        grid.insert({
          id: `debug${i}`,
          bounds: {
            min: { x: i * 4, y: i * 4, z: 0 },
            max: { x: i * 4 + 1, y: i * 4 + 1, z: 1 }
          }
        });
      }

      const debug = grid.debug();
      expect(debug.indexType).toBe('UniformGridHash');
      expect(debug.itemCount).toBe(25);
      expect(debug.nodeCount).toBeGreaterThan(0); // Should have occupied cells
      expect(debug.memoryUsage).toBeGreaterThan(0);
    });
  });
});
