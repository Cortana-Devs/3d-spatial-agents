/**
 * SpatialManager Tests
 * Tests the unified spatial index management system
 * Validates automatic optimization and index switching
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialManager, createSpatialManager, recommendIndexType } from '../SpatialManager';
import { SpatialItem, AABB } from '../types';

describe('SpatialManager', () => {
  let manager: SpatialManager;

  beforeEach(() => {
    manager = createSpatialManager({
      preferredIndex: 'DynamicAABBTree',
      autoOptimize: false, // Disable for predictable testing
      dynamicAABB: { fattenFactor: 0.1 },
      uniformGrid: {
        cellSize: 10,
        worldBounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 100, y: 100, z: 100 } }
      }
    });
  });

  describe('Basic Operations', () => {
    it('should insert items through unified API', () => {
      const item: SpatialItem = {
        id: 'unified1',
        bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 7, y: 7, z: 7 } }
      };

      manager.insert(item);
      
      const debug = manager.debug();
      expect(debug.itemCount).toBe(1);
      expect(debug.managerInfo.activeIndexType).toBe('DynamicAABBTree');
    });

    it('should update items through unified API', () => {
      const item: SpatialItem = {
        id: 'unified2',
        bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 7, y: 7, z: 7 } }
      };

      manager.insert(item);
      
      const updated = manager.update('unified2', {
        min: { x: 15, y: 15, z: 15 },
        max: { x: 17, y: 17, z: 17 }
      });

      expect(updated).toBe(true);
    });

    it('should remove items through unified API', () => {
      const item: SpatialItem = {
        id: 'unified3',
        bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 7, y: 7, z: 7 } }
      };

      manager.insert(item);
      expect(manager.debug().itemCount).toBe(1);

      const removed = manager.remove('unified3');
      expect(removed).toBe(true);
      expect(manager.debug().itemCount).toBe(0);
    });

    it('should query through unified API', () => {
      const items: SpatialItem[] = [
        { id: 'query1', bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 2, z: 2 } } },
        { id: 'query2', bounds: { min: { x: 10, y: 10, z: 10 }, max: { x: 12, y: 12, z: 12 } } }
      ];

      items.forEach(item => manager.insert(item));

      const results = manager.query({
        bounds: { min: { x: -1, y: -1, z: -1 }, max: { x: 3, y: 3, z: 3 } }
      });

      expect(results).toHaveLength(1);
      expect(results[0].item.id).toBe('query1');
    });

    it('should handle nearest queries', () => {
      const items: SpatialItem[] = [
        { id: 'near1', bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 6, y: 6, z: 6 } } },
        { id: 'far1', bounds: { min: { x: 50, y: 50, z: 50 }, max: { x: 51, y: 51, z: 51 } } }
      ];

      items.forEach(item => manager.insert(item));

      const nearest = manager.nearest({ x: 0, y: 0, z: 0 });
      expect(nearest).not.toBeNull();
      expect(nearest!.item.id).toBe('near1');
    });

    it('should handle raycast queries', () => {
      const item: SpatialItem = {
        id: 'raycast1',
        bounds: { min: { x: 10, y: -1, z: -1 }, max: { x: 11, y: 1, z: 1 } }
      };

      manager.insert(item);

      const hits = manager.raycast(
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        20
      );

      expect(hits.some(hit => hit.item.id === 'raycast1')).toBe(true);
    });
  });

  describe('Index Switching', () => {
    it('should switch between index types', () => {
      const item: SpatialItem = {
        id: 'switch1',
        bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 7, y: 7, z: 7 } }
      };

      manager.insert(item);
      expect(manager.debug().managerInfo.activeIndexType).toBe('DynamicAABBTree');

      manager.switchIndex('UniformGridHash');
      expect(manager.debug().managerInfo.activeIndexType).toBe('UniformGridHash');

      // Item should still be queryable after switch
      const results = manager.query({
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } }
      });
      expect(results.some(r => r.item.id === 'switch1')).toBe(true);
    });

    it('should handle StaticBVH switching', () => {
      const items: SpatialItem[] = [
        { id: 'static1', bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } } },
        { id: 'static2', bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 6, y: 6, z: 6 } } }
      ];

      items.forEach(item => manager.insert(item));

      manager.switchIndex('StaticBVH');
      expect(manager.debug().managerInfo.activeIndexType).toBe('StaticBVH');

      // Items should be queryable
      const results = manager.query({
        bounds: { min: { x: -1, y: -1, z: -1 }, max: { x: 10, y: 10, z: 10 } }
      });
      expect(results).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle duplicate insertions', () => {
      const item: SpatialItem = {
        id: 'duplicate',
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }
      };

      manager.insert(item);
      expect(() => manager.insert(item)).toThrow();
    });

    it('should handle operations on non-existent items', () => {
      expect(manager.update('nonexistent', { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } })).toBe(false);
      expect(manager.remove('nonexistent')).toBe(false);
    });

    it('should handle switching to UniformGridHash without config', () => {
      const managerNoGrid = createSpatialManager({
        preferredIndex: 'DynamicAABBTree'
        // No uniformGrid config
      });

      expect(() => {
        managerNoGrid.switchIndex('UniformGridHash');
      }).toThrow();
    });
  });

  describe('Memory and State Management', () => {
    it('should maintain item consistency across operations', () => {
      const items: SpatialItem[] = [];
      for (let i = 0; i < 50; i++) {
        items.push({
          id: `consistency${i}`,
          bounds: {
            min: { x: i, y: i, z: i },
            max: { x: i + 1, y: i + 1, z: i + 1 }
          }
        });
      }

      // Insert all items
      items.forEach(item => manager.insert(item));
      expect(manager.getAllItems()).toHaveLength(50);

      // Update half of them
      for (let i = 0; i < 25; i++) {
        manager.update(`consistency${i}`, {
          min: { x: i + 100, y: i + 100, z: i + 100 },
          max: { x: i + 101, y: i + 101, z: i + 101 }
        });
      }

      // Remove quarter of them
      for (let i = 0; i < 12; i++) {
        manager.remove(`consistency${i + 25}`);
      }

      expect(manager.getAllItems()).toHaveLength(38); // 50 - 12 = 38
    });

    it('should clear properly', () => {
      // Insert items
      for (let i = 0; i < 20; i++) {
        manager.insert({
          id: `clear${i}`,
          bounds: { min: { x: i, y: i, z: i }, max: { x: i + 1, y: i + 1, z: i + 1 } }
        });
      }

      expect(manager.debug().itemCount).toBe(20);

      manager.clear();
      
      expect(manager.debug().itemCount).toBe(0);
      expect(manager.getAllItems()).toHaveLength(0);
    });
  });

  describe('Auto-Optimization', () => {
    it('should provide index recommendations', () => {
      // Test recommendation logic
      expect(recommendIndexType({
        itemCount: 100,
        staticItems: true,
        queryFrequency: 'high'
      })).toBe('StaticBVH');

      expect(recommendIndexType({
        itemCount: 10000,
        staticItems: false,
        queryFrequency: 'high'
      })).toBe('UniformGridHash');

      expect(recommendIndexType({
        itemCount: 1000,
        staticItems: false,
        queryFrequency: 'medium'
      })).toBe('DynamicAABBTree');
    });

    it('should handle rebuilds correctly', () => {
      // Add items
      for (let i = 0; i < 10; i++) {
        manager.insert({
          id: `rebuild${i}`,
          bounds: {
            min: { x: i, y: i, z: i },
            max: { x: i + 1, y: i + 1, z: i + 1 }
          }
        });
      }

      const beforeRebuild = manager.debug();
      
      manager.rebuild();
      
      const afterRebuild = manager.debug();
      expect(afterRebuild.itemCount).toBe(beforeRebuild.itemCount);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle mixed workload efficiently', () => {
      const startTime = performance.now();
      
      // Mixed operations: insert, query, update, remove
      for (let i = 0; i < 500; i++) {
        // Insert
        manager.insert({
          id: `mixed${i}`,
          bounds: {
            min: { x: Math.random() * 50, y: Math.random() * 50, z: Math.random() * 50 },
            max: { x: Math.random() * 50 + 1, y: Math.random() * 50 + 1, z: Math.random() * 50 + 1 }
          }
        });

        // Query every 10 insertions
        if (i % 10 === 0) {
          manager.query({
            bounds: {
              min: { x: Math.random() * 40, y: Math.random() * 40, z: Math.random() * 40 },
              max: { x: Math.random() * 40 + 10, y: Math.random() * 40 + 10, z: Math.random() * 40 + 10 }
            }
          });
        }

        // Update every 20 insertions
        if (i % 20 === 0 && i > 0) {
          manager.update(`mixed${i - 10}`, {
            min: { x: Math.random() * 50, y: Math.random() * 50, z: Math.random() * 50 },
            max: { x: Math.random() * 50 + 1, y: Math.random() * 50 + 1, z: Math.random() * 50 + 1 }
          });
        }

        // Remove every 50 insertions
        if (i % 50 === 0 && i > 0) {
          manager.remove(`mixed${i - 25}`);
        }
      }

      const totalTime = performance.now() - startTime;
      console.log(`SpatialManager mixed workload (500 ops): ${totalTime}ms`);
      
      expect(totalTime).toBeLessThan(200);
      expect(manager.debug().itemCount).toBeGreaterThan(400); // Most items should remain
    });
  });

  describe('Index Type Validation', () => {
    it('should work with DynamicAABBTree', () => {
      manager.switchIndex('DynamicAABBTree');
      
      const item: SpatialItem = {
        id: 'dynamic1',
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }
      };

      manager.insert(item);
      expect(manager.query({ bounds: item.bounds })).toHaveLength(1);
    });

    it('should work with StaticBVH', () => {
      manager.switchIndex('StaticBVH');
      
      const items: SpatialItem[] = [
        { id: 'static1', bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } } },
        { id: 'static2', bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 6, y: 6, z: 6 } } }
      ];

      items.forEach(item => manager.insert(item));
      
      const results = manager.query({
        bounds: { min: { x: -1, y: -1, z: -1 }, max: { x: 10, y: 10, z: 10 } }
      });
      expect(results).toHaveLength(2);
    });

    it('should work with UniformGridHash', () => {
      manager.switchIndex('UniformGridHash');
      
      const item: SpatialItem = {
        id: 'grid1',
        bounds: { min: { x: 15, y: 15, z: 15 }, max: { x: 17, y: 17, z: 17 } }
      };

      manager.insert(item);
      
      const results = manager.query({
        bounds: { min: { x: 10, y: 10, z: 10 }, max: { x: 20, y: 20, z: 20 } }
      });
      expect(results).toHaveLength(1);
    });
  });

  describe('Fallback Functionality', () => {
    it('should handle raycast on indices without native support', () => {
      // StaticBVH has basic raycast, others use fallback
      manager.switchIndex('UniformGridHash');
      
      manager.insert({
        id: 'raycast1',
        bounds: { min: { x: 20, y: -1, z: -1 }, max: { x: 21, y: 1, z: 1 } }
      });

      const hits = manager.raycast(
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        30
      );

      expect(hits.some(hit => hit.item.id === 'raycast1')).toBe(true);
    });

    it('should handle nearest on indices without native support', () => {
      manager.switchIndex('StaticBVH');
      
      const items: SpatialItem[] = [
        { id: 'nearest1', bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 6, y: 6, z: 6 } } },
        { id: 'nearest2', bounds: { min: { x: 50, y: 50, z: 50 }, max: { x: 51, y: 51, z: 51 } } }
      ];

      items.forEach(item => manager.insert(item));

      const nearest = manager.nearest({ x: 0, y: 0, z: 0 });
      expect(nearest).not.toBeNull();
      expect(nearest!.item.id).toBe('nearest1');
    });
  });
});

describe('Index Recommendation System', () => {
  it('should recommend StaticBVH for static items', () => {
    const recommendation = recommendIndexType({
      itemCount: 5000,
      staticItems: true,
      queryFrequency: 'high'
    });

    expect(recommendation).toBe('StaticBVH');
  });

  it('should recommend UniformGridHash for large dynamic sets', () => {
    const recommendation = recommendIndexType({
      itemCount: 10000,
      staticItems: false,
      queryFrequency: 'high'
    });

    expect(recommendation).toBe('UniformGridHash');
  });

  it('should recommend DynamicAABBTree for medium dynamic sets', () => {
    const recommendation = recommendIndexType({
      itemCount: 1000,
      staticItems: false,
      queryFrequency: 'medium'
    });

    expect(recommendation).toBe('DynamicAABBTree');
  });
});
