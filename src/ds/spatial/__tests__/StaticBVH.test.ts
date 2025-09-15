/**
 * StaticBVH Tests
 * Comprehensive validation of StaticBVH implementation
 * Validates correctness, performance, and edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StaticBVH, createStaticBVH } from '../StaticBVH';
import { SpatialItem, SpatialEvent, AABB } from '../types';

describe('StaticBVH', () => {
  let bvh: StaticBVH;
  let events: SpatialEvent[] = [];
  let mockEventEmitter: (event: SpatialEvent) => void;

  beforeEach(() => {
    events = [];
    mockEventEmitter = (event: SpatialEvent) => {
      events.push(event);
    };
    
    bvh = createStaticBVH({
      maxItemsPerLeaf: 4,
      maxDepth: 10,
      splitStrategy: 'sah'
    }, mockEventEmitter) as StaticBVH;
  });

  describe('Basic Functionality', () => {
    it('should build BVH from items', () => {
      const items: SpatialItem[] = [
        {
          id: 'item1',
          bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }
        },
        {
          id: 'item2', 
          bounds: { min: { x: 2, y: 2, z: 2 }, max: { x: 3, y: 3, z: 3 } }
        }
      ];

      bvh.build(items);
      
      expect(bvh.isBuilt()).toBe(true);
      
      const debug = bvh.debug();
      expect(debug.itemCount).toBe(2);
      expect(debug.nodeCount).toBeGreaterThan(0);
    });

    it('should query for overlapping items', () => {
      const items: SpatialItem[] = [
        {
          id: 'item1',
          bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 2, z: 2 } }
        },
        {
          id: 'item2',
          bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 7, y: 7, z: 7 } }
        },
        {
          id: 'item3',
          bounds: { min: { x: 1, y: 1, z: 1 }, max: { x: 3, y: 3, z: 3 } }
        }
      ];

      bvh.build(items);

      const results = bvh.query({
        bounds: { min: { x: 0.5, y: 0.5, z: 0.5 }, max: { x: 2.5, y: 2.5, z: 2.5 } }
      });

      expect(results).toHaveLength(2);
      expect(results.some(r => r.item.id === 'item1')).toBe(true);
      expect(results.some(r => r.item.id === 'item3')).toBe(true);
    });

    it('should handle empty build', () => {
      bvh.build([]);
      expect(bvh.isBuilt()).toBe(false);
      
      const results = bvh.query({
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }
      });
      
      expect(results).toHaveLength(0);
    });

    it('should respect maxResults limit', () => {
      const items: SpatialItem[] = [];
      for (let i = 0; i < 10; i++) {
        items.push({
          id: `item${i}`,
          bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }
        });
      }

      bvh.build(items);

      const results = bvh.query({
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
        maxResults: 5
      });

      expect(results).toHaveLength(5);
    });
  });

  describe('Query Filtering', () => {
    it('should apply query filters', () => {
      const items: SpatialItem[] = [
        {
          id: 'keep1',
          bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
          userData: { type: 'keep' }
        },
        {
          id: 'filter1',
          bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
          userData: { type: 'filter' }
        }
      ];

      bvh.build(items);

      const results = bvh.query({
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
        filter: (item) => (item.userData as any)?.type === 'keep'
      });

      expect(results).toHaveLength(1);
      expect(results[0].item.id).toBe('keep1');
    });
  });

  describe('Raycast', () => {
    it('should perform basic raycast', () => {
      const items: SpatialItem[] = [
        {
          id: 'target',
          bounds: { min: { x: 5, y: -1, z: -1 }, max: { x: 6, y: 1, z: 1 } }
        }
      ];

      bvh.build(items);

      const results = bvh.raycast(
        { x: 0, y: 0, z: 0 },   // origin
        { x: 1, y: 0, z: 0 },   // direction
        10                      // max distance
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.item.id === 'target')).toBe(true);
    });
  });

  describe('Nearest Search', () => {
    it('should find nearest item', () => {
      const items: SpatialItem[] = [
        {
          id: 'near',
          bounds: { min: { x: 1, y: 1, z: 1 }, max: { x: 2, y: 2, z: 2 } }
        },
        {
          id: 'far',
          bounds: { min: { x: 10, y: 10, z: 10 }, max: { x: 11, y: 11, z: 11 } }
        }
      ];

      bvh.build(items);

      const nearest = bvh.nearest({ x: 0, y: 0, z: 0 });
      
      expect(nearest).not.toBeNull();
      expect(nearest!.item.id).toBe('near');
      expect(nearest!.distance).toBeDefined();
    });

    it('should respect maxDistance', () => {
      const items: SpatialItem[] = [
        {
          id: 'far',
          bounds: { min: { x: 100, y: 100, z: 100 }, max: { x: 101, y: 101, z: 101 } }
        }
      ];

      bvh.build(items);

      const nearest = bvh.nearest({ x: 0, y: 0, z: 0 }, 50);
      expect(nearest).toBeNull();
    });
  });

  describe('Performance', () => {
    it('should build large BVH efficiently', () => {
      const items: SpatialItem[] = [];
      for (let i = 0; i < 1000; i++) {
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const z = Math.random() * 100;
        
        items.push({
          id: `item${i}`,
          bounds: {
            min: { x, y, z },
            max: { x: x + 1, y: y + 1, z: z + 1 }
          }
        });
      }

      const startTime = performance.now();
      bvh.build(items);
      const buildTime = performance.now() - startTime;

      console.log(`BVH build time for 1000 items: ${buildTime}ms`);
      expect(buildTime).toBeLessThan(500); // Realistic for test environment

      const debug = bvh.debug();
      expect(debug.itemCount).toBe(1000);
      expect(debug.depth).toBeLessThan(20); // Reasonable depth
    });

    it('should query large BVH efficiently', () => {
      const items: SpatialItem[] = [];
      for (let i = 0; i < 1000; i++) { // Reduced from 5000 for test stability
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const z = Math.random() * 100;
        
        items.push({
          id: `item${i}`,
          bounds: {
            min: { x, y, z },
            max: { x: x + 2, y: y + 2, z: z + 2 }
          }
        });
      }

      bvh.build(items);

      // Perform queries and measure performance
      const queryTimes: number[] = [];
      for (let i = 0; i < 20; i++) { // Reduced query count
        const x = Math.random() * 90;
        const y = Math.random() * 90;
        const z = Math.random() * 90;

        const startTime = performance.now();
        bvh.query({
          bounds: {
            min: { x, y, z },
            max: { x: x + 10, y: y + 10, z: z + 10 }
          }
        });
        queryTimes.push(performance.now() - startTime);
      }

      const avgQueryTime = queryTimes.reduce((a, b) => a + b) / queryTimes.length;
      console.log(`BVH avg query time for 1000 items: ${avgQueryTime}ms`);
      
      expect(avgQueryTime).toBeLessThan(5.0); // Generous for test environment
    });
  });

  describe('Split Strategies', () => {
    it('should use SAH splitting strategy', () => {
      const sahBVH = createStaticBVH({
        maxItemsPerLeaf: 2,
        splitStrategy: 'sah'
      }) as StaticBVH;

      const items: SpatialItem[] = [
        { id: '1', bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } } },
        { id: '2', bounds: { min: { x: 2, y: 0, z: 0 }, max: { x: 3, y: 1, z: 1 } } },
        { id: '3', bounds: { min: { x: 4, y: 0, z: 0 }, max: { x: 5, y: 1, z: 1 } } },
        { id: '4', bounds: { min: { x: 0, y: 2, z: 0 }, max: { x: 1, y: 3, z: 1 } } }
      ];

      sahBVH.build(items);
      expect(sahBVH.isBuilt()).toBe(true);
    });

    it('should use median splitting strategy', () => {
      const medianBVH = createStaticBVH({
        maxItemsPerLeaf: 2,
        splitStrategy: 'median'
      }) as StaticBVH;

      const items: SpatialItem[] = [
        { id: '1', bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } } },
        { id: '2', bounds: { min: { x: 2, y: 0, z: 0 }, max: { x: 3, y: 1, z: 1 } } },
        { id: '3', bounds: { min: { x: 4, y: 0, z: 0 }, max: { x: 5, y: 1, z: 1 } } }
      ];

      medianBVH.build(items);
      expect(medianBVH.isBuilt()).toBe(true);
    });
  });

  describe('Event Emission', () => {
    it('should emit build events', () => {
      const items: SpatialItem[] = [
        { id: 'test', bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } } }
      ];

      bvh.build(items);

      const buildEvents = events.filter(e => e.type === 'ds:spatial:rebuild');
      expect(buildEvents).toHaveLength(1);
      expect(buildEvents[0].payload.itemCount).toBe(1);
    });

    it('should emit query events', () => {
      const items: SpatialItem[] = [
        { id: 'test', bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } } }
      ];

      bvh.build(items);
      bvh.query({ bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } } });

      const queryEvents = events.filter(e => e.type === 'ds:spatial:query');
      expect(queryEvents).toHaveLength(1);
      expect(queryEvents[0].payload.resultCount).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle degenerate bounds', () => {
      const items: SpatialItem[] = [
        {
          id: 'point',
          bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } }
        }
      ];

      bvh.build(items);
      expect(bvh.isBuilt()).toBe(true);

      const results = bvh.query({
        bounds: { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } }
      });

      expect(results).toHaveLength(1);
    });

    it('should handle identical items', () => {
      const items: SpatialItem[] = [
        { id: '1', bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } } },
        { id: '2', bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } } },
        { id: '3', bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } } }
      ];

      bvh.build(items);

      const results = bvh.query({
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }
      });

      expect(results).toHaveLength(3);
    });

    it('should handle very deep recursion gracefully', () => {
      const items: SpatialItem[] = [];
      
      // Create items that will force deep recursion
      for (let i = 0; i < 100; i++) {
        items.push({
          id: `item${i}`,
          bounds: {
            min: { x: i * 0.01, y: 0, z: 0 },
            max: { x: i * 0.01 + 0.005, y: 1, z: 1 }
          }
        });
      }

      const deepBVH = createStaticBVH({
        maxItemsPerLeaf: 1,
        maxDepth: 5 // Force early termination
      }) as StaticBVH;

      deepBVH.build(items);
      expect(deepBVH.isBuilt()).toBe(true);
    });
  });

  describe('Memory Management', () => {
    it('should clear BVH properly', () => {
      const items: SpatialItem[] = [
        { id: 'test', bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } } }
      ];

      bvh.build(items);
      expect(bvh.isBuilt()).toBe(true);

      bvh.clear();
      expect(bvh.isBuilt()).toBe(false);
      expect(bvh.debug().itemCount).toBe(0);
    });
  });

  describe('Configuration Validation', () => {
    it('should use default configuration', () => {
      const defaultBVH = createStaticBVH();
      expect(defaultBVH).toBeDefined();
    });

    it('should handle configuration edge cases', () => {
      const bvhConfig = createStaticBVH({
        maxItemsPerLeaf: 0,  // Should be handled gracefully
        maxDepth: 0,         // Should be handled gracefully
        splitStrategy: 'sah'
      });

      expect(bvhConfig).toBeDefined();
    });
  });
});
