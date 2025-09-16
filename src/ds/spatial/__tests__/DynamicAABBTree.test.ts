/**
 * DynamicAABBTree Tests
 * Comprehensive validation of DynamicAABBTree implementation
 * Tests dynamic operations, balancing, and performance
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DynamicAABBTree, createDynamicAABBTree } from '../DynamicAABBTree';
import { SpatialItem, SpatialEvent, AABB } from '../types';

describe('DynamicAABBTree', () => {
  let tree: DynamicAABBTree;
  let events: SpatialEvent[] = [];
  let mockEventEmitter: (event: SpatialEvent) => void;

  beforeEach(() => {
    events = [];
    mockEventEmitter = (event: SpatialEvent) => {
      events.push(event);
    };
    
    tree = createDynamicAABBTree({
      fattenFactor: 0.1,
      rebuildThreshold: 1000,
      maxDepth: 20
    }, mockEventEmitter) as DynamicAABBTree;
  });

  describe('Basic Operations', () => {
    it('should insert items', () => {
      const item: SpatialItem = {
        id: 'test1',
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }
      };

      tree.insert(item);
      
      const debug = tree.debug();
      expect(debug.itemCount).toBe(1);
      
      const insertEvents = events.filter(e => e.type === 'ds:spatial:insert');
      expect(insertEvents).toHaveLength(1);
    });

    it('should update item bounds', () => {
      const item: SpatialItem = {
        id: 'test1',
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }
      };

      tree.insert(item);
      
      const updated = tree.update('test1', {
        min: { x: 2, y: 2, z: 2 },
        max: { x: 3, y: 3, z: 3 }
      });

      expect(updated).toBe(true);
      
      const updateEvents = events.filter(e => e.type === 'ds:spatial:update');
      expect(updateEvents).toHaveLength(1);
    });

    it('should update within fat bounds without restructuring', () => {
      const item: SpatialItem = {
        id: 'test1',
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }
      };

      tree.insert(item);
      
      // Small update within fat bounds should succeed
      const updated = tree.update('test1', {
        min: { x: 0.01, y: 0.01, z: 0.01 },
        max: { x: 1.01, y: 1.01, z: 1.01 }
      });

      expect(updated).toBe(true);
    });

    it('should remove items', () => {
      const item: SpatialItem = {
        id: 'test1',
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }
      };

      tree.insert(item);
      expect(tree.debug().itemCount).toBe(1);

      const removed = tree.remove('test1');
      expect(removed).toBe(true);
      expect(tree.debug().itemCount).toBe(0);
      
      const removeEvents = events.filter(e => e.type === 'ds:spatial:remove');
      expect(removeEvents).toHaveLength(1);
    });

    it('should handle non-existent items gracefully', () => {
      expect(tree.update('nonexistent', { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } })).toBe(false);
      expect(tree.remove('nonexistent')).toBe(false);
    });

    it('should prevent duplicate insertions', () => {
      const item: SpatialItem = {
        id: 'duplicate',
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }
      };

      tree.insert(item);
      
      expect(() => tree.insert(item)).toThrow();
    });
  });

  describe('Querying', () => {
    beforeEach(() => {
      // Set up test data
      const items: SpatialItem[] = [
        { id: 'item1', bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 2, z: 2 } } },
        { id: 'item2', bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 7, y: 7, z: 7 } } },
        { id: 'item3', bounds: { min: { x: 1, y: 1, z: 1 }, max: { x: 3, y: 3, z: 3 } } },
        { id: 'item4', bounds: { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } } }
      ];

      items.forEach(item => tree.insert(item));
    });

    it('should query overlapping items', () => {
      const results = tree.query({
        bounds: { min: { x: 0.5, y: 0.5, z: 0.5 }, max: { x: 2.5, y: 2.5, z: 2.5 } }
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.item.id === 'item1')).toBe(true);
      expect(results.some(r => r.item.id === 'item3')).toBe(true);
    });

    it('should apply query filters', () => {
      const results = tree.query({
        bounds: { min: { x: -2, y: -2, z: -2 }, max: { x: 10, y: 10, z: 10 } },
        filter: (item) => item.id.includes('1')
      });

      expect(results).toHaveLength(1);
      expect(results[0].item.id).toBe('item1');
    });

    it('should respect maxResults limit', () => {
      const results = tree.query({
        bounds: { min: { x: -5, y: -5, z: -5 }, max: { x: 15, y: 15, z: 15 } },
        maxResults: 2
      });

      expect(results).toHaveLength(2);
    });

    it('should find nearest items', () => {
      const nearest = tree.nearest({ x: 0, y: 0, z: 0 });
      
      expect(nearest).not.toBeNull();
      expect(nearest!.distance).toBeDefined();
      expect(['item1', 'item4']).toContain(nearest!.item.id);
    });

    it('should respect nearest maxDistance', () => {
      const nearest = tree.nearest({ x: 100, y: 100, z: 100 }, 5);
      expect(nearest).toBeNull();
    });
  });

  describe('Tree Balancing and Structure', () => {
    it('should maintain balanced structure under insertions', () => {
      const items: SpatialItem[] = [];
      
      // Insert items in a pattern that could create unbalanced tree
      for (let i = 0; i < 100; i++) {
        items.push({
          id: `linear${i}`,
          bounds: {
            min: { x: i, y: 0, z: 0 },
            max: { x: i + 1, y: 1, z: 1 }
          }
        });
      }

      items.forEach(item => tree.insert(item));
      
      const debug = tree.debug();
      expect(debug.itemCount).toBe(100);
      expect(debug.depth).toBeLessThan(25); // Should maintain reasonable depth
    });

    it('should handle tree rebalancing', () => {
      // Insert many items to trigger rebalancing logic
      for (let i = 0; i < 50; i++) {
        tree.insert({
          id: `item${i}`,
          bounds: {
            min: { x: Math.random() * 100, y: Math.random() * 100, z: Math.random() * 100 },
            max: { x: Math.random() * 100 + 1, y: Math.random() * 100 + 1, z: Math.random() * 100 + 1 }
          }
        });
      }

      const debug = tree.debug();
      expect(debug.itemCount).toBe(50);
      expect(debug.nodeCount).toBeGreaterThan(50); // Should have internal nodes
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of insertions efficiently', () => {
      const items: SpatialItem[] = [];
      for (let i = 0; i < 1000; i++) {
        items.push({
          id: `perf${i}`,
          bounds: {
            min: { x: Math.random() * 1000, y: Math.random() * 1000, z: Math.random() * 1000 },
            max: { x: Math.random() * 1000 + 2, y: Math.random() * 1000 + 2, z: Math.random() * 1000 + 2 }
          }
        });
      }

      const startTime = performance.now();
      items.forEach(item => tree.insert(item));
      const insertTime = performance.now() - startTime;

      console.log(`DynamicAABB insert time for 1000 items: ${insertTime}ms`);
      expect(insertTime).toBeLessThan(500); // Should insert efficiently
      expect(tree.debug().itemCount).toBe(1000);
    });

    it('should handle many updates efficiently', () => {
      // First, insert items
      for (let i = 0; i < 100; i++) {
        tree.insert({
          id: `update${i}`,
          bounds: {
            min: { x: i, y: i, z: i },
            max: { x: i + 1, y: i + 1, z: i + 1 }
          }
        });
      }

      // Then update them all
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        tree.update(`update${i}`, {
          min: { x: i + 10, y: i + 10, z: i + 10 },
          max: { x: i + 11, y: i + 11, z: i + 11 }
        });
      }
      const updateTime = performance.now() - startTime;

      console.log(`DynamicAABB update time for 100 items: ${updateTime}ms`);
      expect(updateTime).toBeLessThan(50);
    });

    it('should query efficiently', () => {
      // Insert test data
      for (let i = 0; i < 2000; i++) {
        tree.insert({
          id: `query${i}`,
          bounds: {
            min: { x: Math.random() * 500, y: Math.random() * 500, z: Math.random() * 500 },
            max: { x: Math.random() * 500 + 1, y: Math.random() * 500 + 1, z: Math.random() * 500 + 1 }
          }
        });
      }

      // Perform multiple queries
      const queryTimes: number[] = [];
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * 500;
        const y = Math.random() * 500;
        const z = Math.random() * 500;

        const startTime = performance.now();
        tree.query({
          bounds: {
            min: { x, y, z },
            max: { x: x + 10, y: y + 10, z: z + 10 }
          }
        });
        queryTimes.push(performance.now() - startTime);
      }

      const avgQueryTime = queryTimes.reduce((a, b) => a + b) / queryTimes.length;
      console.log(`DynamicAABB avg query time for 2000 items: ${avgQueryTime}ms`);
      expect(avgQueryTime).toBeLessThan(2.0);
    });
  });

  describe('Fat AABB Optimization', () => {
    it('should use fat AABBs to avoid frequent updates', () => {
      const item: SpatialItem = {
        id: 'moving',
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }
      };

      tree.insert(item);
      
      // Small movements should not require tree restructuring
      let updated = tree.update('moving', {
        min: { x: 0.05, y: 0.05, z: 0.05 },
        max: { x: 1.05, y: 1.05, z: 1.05 }
      });
      expect(updated).toBe(true);

      // Verify the item can still be found
      const results = tree.query({
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 2, z: 2 } }
      });
      expect(results).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single item tree', () => {
      const item: SpatialItem = {
        id: 'single',
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }
      };

      tree.insert(item);
      expect(tree.remove('single')).toBe(true);
      expect(tree.debug().itemCount).toBe(0);
    });

    it('should handle rapid insert/remove cycles', () => {
      for (let cycle = 0; cycle < 10; cycle++) {
        // Insert items
        for (let i = 0; i < 20; i++) {
          tree.insert({
            id: `cycle${cycle}_${i}`,
            bounds: {
              min: { x: i, y: i, z: i },
              max: { x: i + 1, y: i + 1, z: i + 1 }
            }
          });
        }

        // Remove half of them
        for (let i = 0; i < 10; i++) {
          tree.remove(`cycle${cycle}_${i}`);
        }
      }

      // Tree should still be functional
      const debug = tree.debug();
      expect(debug.itemCount).toBe(100); // 10 cycles * 10 remaining items
    });

    it('should handle items with identical bounds', () => {
      const bounds = { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } };

      tree.insert({ id: 'dup1', bounds });
      tree.insert({ id: 'dup2', bounds });
      tree.insert({ id: 'dup3', bounds });

      const results = tree.query({ bounds });
      expect(results).toHaveLength(3);
    });
  });

  describe('Memory Management', () => {
    it('should clear tree properly', () => {
      // Insert items
      for (let i = 0; i < 50; i++) {
        tree.insert({
          id: `clear${i}`,
          bounds: { min: { x: i, y: i, z: i }, max: { x: i + 1, y: i + 1, z: i + 1 } }
        });
      }

      expect(tree.debug().itemCount).toBe(50);

      tree.clear();
      
      expect(tree.debug().itemCount).toBe(0);
      expect(tree.getAllItems()).toHaveLength(0);
    });

    it('should get all items correctly', () => {
      const items: SpatialItem[] = [
        { id: 'all1', bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } } },
        { id: 'all2', bounds: { min: { x: 2, y: 2, z: 2 }, max: { x: 3, y: 3, z: 3 } } }
      ];

      items.forEach(item => tree.insert(item));

      const allItems = tree.getAllItems();
      expect(allItems).toHaveLength(2);
      expect(allItems.some(item => item.id === 'all1')).toBe(true);
      expect(allItems.some(item => item.id === 'all2')).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const defaultTree = createDynamicAABBTree();
      expect(defaultTree).toBeDefined();
    });

    it('should respect fatten factor', () => {
      const tightTree = createDynamicAABBTree({
        fattenFactor: 0.01  // Very small fattening
      }) as DynamicAABBTree;

      const item: SpatialItem = {
        id: 'tight',
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }
      };

      tightTree.insert(item);

      // Large movement should require restructuring with small fatten factor
      const updated = tightTree.update('tight', {
        min: { x: 2, y: 2, z: 2 },
        max: { x: 3, y: 3, z: 3 }
      });

      expect(updated).toBe(true);
    });
  });

  describe('Debug Information', () => {
    it('should provide accurate debug information', () => {
      for (let i = 0; i < 10; i++) {
        tree.insert({
          id: `debug${i}`,
          bounds: {
            min: { x: i, y: i, z: i },
            max: { x: i + 1, y: i + 1, z: i + 1 }
          }
        });
      }

      const debug = tree.debug();
      expect(debug.indexType).toBe('DynamicAABBTree');
      expect(debug.itemCount).toBe(10);
      expect(debug.nodeCount).toBeGreaterThan(10);
      expect(debug.depth).toBeGreaterThan(0);
      expect(debug.memoryUsage).toBeGreaterThan(0);
    });
  });
});
