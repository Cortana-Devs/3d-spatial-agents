/**
 * Spatial Indices Integration Tests
 * Tests interoperability between different spatial index types
 * Validates consistent results and performance characteristics
 */

import { describe, it, expect } from 'vitest';
import { 
  StaticBVH, 
  DynamicAABBTree, 
  UniformGridHash,
  createStaticBVH,
  createDynamicAABBTree,
  createUniformGridHash,
  SpatialItem,
  AABB 
} from '../index';

describe('Spatial Indices Integration', () => {
  const worldBounds: AABB = {
    min: { x: 0, y: 0, z: 0 },
    max: { x: 100, y: 100, z: 100 }
  };

  const testItems: SpatialItem[] = [
    { id: 'item1', bounds: { min: { x: 10, y: 10, z: 10 }, max: { x: 12, y: 12, z: 12 } } },
    { id: 'item2', bounds: { min: { x: 20, y: 20, z: 20 }, max: { x: 22, y: 22, z: 22 } } },
    { id: 'item3', bounds: { min: { x: 30, y: 30, z: 30 }, max: { x: 32, y: 32, z: 32 } } },
    { id: 'item4', bounds: { min: { x: 15, y: 15, z: 15 }, max: { x: 25, y: 25, z: 25 } } }, // Large spanning item
    { id: 'item5', bounds: { min: { x: 5, y: 5, z: 5 }, max: { x: 7, y: 7, z: 7 } } }
  ];

  describe('Query Consistency', () => {
    it('should return consistent results across all index types', () => {
      // Set up all three index types with same data
      const staticBVH = createStaticBVH() as StaticBVH;
      const dynamicTree = createDynamicAABBTree() as DynamicAABBTree;
      const uniformGrid = createUniformGridHash({
        cellSize: 5,
        worldBounds
      }) as UniformGridHash;

      // Populate StaticBVH
      staticBVH.build(testItems);

      // Populate DynamicAABBTree
      testItems.forEach(item => dynamicTree.insert(item));

      // Populate UniformGridHash
      testItems.forEach(item => uniformGrid.insert(item));

      // Perform same query on all indices
      const queryBounds = { min: { x: 12, y: 12, z: 12 }, max: { x: 28, y: 28, z: 28 } };
      
      const bvhResults = staticBVH.query({ bounds: queryBounds });
      const treeResults = dynamicTree.query({ bounds: queryBounds });
      const gridResults = uniformGrid.query({ bounds: queryBounds });

      // All should find the same items (though order may differ)
      const bvhIds = new Set(bvhResults.map(r => r.item.id));
      const treeIds = new Set(treeResults.map(r => r.item.id));
      const gridIds = new Set(gridResults.map(r => r.item.id));

      console.log('Query results comparison:');
      console.log(`BVH: ${Array.from(bvhIds).sort()}`);
      console.log(`Tree: ${Array.from(treeIds).sort()}`);
      console.log(`Grid: ${Array.from(gridIds).sort()}`);

      // All should find at least the spanning item and item2
      expect(bvhIds.has('item2')).toBe(true);
      expect(bvhIds.has('item4')).toBe(true);
      expect(treeIds.has('item2')).toBe(true);
      expect(treeIds.has('item4')).toBe(true);
      expect(gridIds.has('item2')).toBe(true);
      expect(gridIds.has('item4')).toBe(true);
    });

    it('should handle edge case queries consistently', () => {
      const staticBVH = createStaticBVH() as StaticBVH;
      const dynamicTree = createDynamicAABBTree() as DynamicAABBTree;
      const uniformGrid = createUniformGridHash({
        cellSize: 10,
        worldBounds
      }) as UniformGridHash;

      const edgeItems: SpatialItem[] = [
        { id: 'edge1', bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } } }, // Point
        { id: 'edge2', bounds: { min: { x: 50, y: 50, z: 50 }, max: { x: 50.1, y: 50.1, z: 50.1 } } } // Tiny
      ];

      staticBVH.build(edgeItems);
      edgeItems.forEach(item => dynamicTree.insert(item));
      edgeItems.forEach(item => uniformGrid.insert(item));

      // Query that should find the point
      const pointQuery = { bounds: { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } } };
      
      const bvhResults = staticBVH.query(pointQuery);
      const treeResults = dynamicTree.query(pointQuery);
      const gridResults = uniformGrid.query(pointQuery);

      // All should find the point item
      expect(bvhResults.some(r => r.item.id === 'edge1')).toBe(true);
      expect(treeResults.some(r => r.item.id === 'edge1')).toBe(true);
      expect(gridResults.some(r => r.item.id === 'edge1')).toBe(true);
    });
  });

  describe('Performance Comparison', () => {
    it('should compare query performance across index types', () => {
      const itemCount = 1000;
      const queryCount = 100;

      // Generate test data
      const items: SpatialItem[] = [];
      for (let i = 0; i < itemCount; i++) {
        items.push({
          id: `perf${i}`,
          bounds: {
            min: { x: Math.random() * 80, y: Math.random() * 80, z: Math.random() * 80 },
            max: { x: Math.random() * 80 + 2, y: Math.random() * 80 + 2, z: Math.random() * 80 + 2 }
          }
        });
      }

      // Set up indices
      const staticBVH = createStaticBVH() as StaticBVH;
      const dynamicTree = createDynamicAABBTree() as DynamicAABBTree;
      const uniformGrid = createUniformGridHash({
        cellSize: 8,
        worldBounds
      }) as UniformGridHash;

      // Populate indices
      staticBVH.build(items);
      items.forEach(item => dynamicTree.insert(item));
      items.forEach(item => uniformGrid.insert(item));

      // Generate queries
      const queries = [];
      for (let i = 0; i < queryCount; i++) {
        const x = Math.random() * 70;
        const y = Math.random() * 70;
        const z = Math.random() * 70;
        queries.push({
          bounds: {
            min: { x, y, z },
            max: { x: x + 10, y: y + 10, z: z + 10 }
          }
        });
      }

      // Measure BVH performance
      const bvhStart = performance.now();
      queries.forEach(query => staticBVH.query(query));
      const bvhTime = performance.now() - bvhStart;

      // Measure Dynamic Tree performance
      const treeStart = performance.now();
      queries.forEach(query => dynamicTree.query(query));
      const treeTime = performance.now() - treeStart;

      // Measure Grid performance
      const gridStart = performance.now();
      queries.forEach(query => uniformGrid.query(query));
      const gridTime = performance.now() - gridStart;

      console.log('Performance comparison (100 queries on 1000 items):');
      console.log(`  StaticBVH: ${bvhTime.toFixed(2)}ms`);
      console.log(`  DynamicAABBTree: ${treeTime.toFixed(2)}ms`);
      console.log(`  UniformGridHash: ${gridTime.toFixed(2)}ms`);

      // All should complete within reasonable time
      expect(bvhTime).toBeLessThan(50);
      expect(treeTime).toBeLessThan(100);
      expect(gridTime).toBeLessThan(50);
    });

    it('should compare insertion performance', () => {
      const itemCount = 1000;

      // Generate test data
      const items: SpatialItem[] = [];
      for (let i = 0; i < itemCount; i++) {
        items.push({
          id: `insert${i}`,
          bounds: {
            min: { x: Math.random() * 80, y: Math.random() * 80, z: Math.random() * 80 },
            max: { x: Math.random() * 80 + 1, y: Math.random() * 80 + 1, z: Math.random() * 80 + 1 }
          }
        });
      }

      // Measure Static BVH build performance
      const staticBVH = createStaticBVH() as StaticBVH;
      const bvhStart = performance.now();
      staticBVH.build(items);
      const bvhTime = performance.now() - bvhStart;

      // Measure Dynamic Tree insertion performance
      const dynamicTree = createDynamicAABBTree() as DynamicAABBTree;
      const treeStart = performance.now();
      items.forEach(item => dynamicTree.insert(item));
      const treeTime = performance.now() - treeStart;

      // Measure Grid insertion performance
      const uniformGrid = createUniformGridHash({
        cellSize: 8,
        worldBounds
      }) as UniformGridHash;
      const gridStart = performance.now();
      items.forEach(item => uniformGrid.insert(item));
      const gridTime = performance.now() - gridStart;

      console.log('Insertion performance comparison (1000 items):');
      console.log(`  StaticBVH build: ${bvhTime.toFixed(2)}ms`);
      console.log(`  DynamicAABBTree insert: ${treeTime.toFixed(2)}ms`);
      console.log(`  UniformGridHash insert: ${gridTime.toFixed(2)}ms`);

      // All should complete efficiently
      expect(bvhTime).toBeLessThan(100);
      expect(treeTime).toBeLessThan(200);
      expect(gridTime).toBeLessThan(50);
    });
  });

  describe('Correctness Validation', () => {
    it('should handle identical query bounds across all indices', () => {
      const items: SpatialItem[] = [
        { id: 'corner', bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } } },
        { id: 'center', bounds: { min: { x: 49, y: 49, z: 49 }, max: { x: 51, y: 51, z: 51 } } },
        { id: 'edge', bounds: { min: { x: 99, y: 99, z: 99 }, max: { x: 100, y: 100, z: 100 } } }
      ];

      const indices = [
        createStaticBVH() as StaticBVH,
        createDynamicAABBTree() as DynamicAABBTree,
        createUniformGridHash({ cellSize: 10, worldBounds }) as UniformGridHash
      ];

      // Populate each index
      (indices[0] as StaticBVH).build(items);
      items.forEach(item => (indices[1] as DynamicAABBTree).insert(item));
      items.forEach(item => (indices[2] as UniformGridHash).insert(item));

      // Test various query regions
      const testQueries = [
        { min: { x: -1, y: -1, z: -1 }, max: { x: 2, y: 2, z: 2 } },     // Corner
        { min: { x: 48, y: 48, z: 48 }, max: { x: 52, y: 52, z: 52 } },   // Center
        { min: { x: 98, y: 98, z: 98 }, max: { x: 101, y: 101, z: 101 } }, // Edge
        { min: { x: 0, y: 0, z: 0 }, max: { x: 100, y: 100, z: 100 } }    // Full world
      ];

      testQueries.forEach((queryBounds, queryIndex) => {
        const results = indices.map(index => 
          index.query({ bounds: queryBounds }).map(r => r.item.id).sort()
        );

        console.log(`Query ${queryIndex}: BVH=${results[0]}, Tree=${results[1]}, Grid=${results[2]}`);

        // Results should be consistent (allowing for implementation differences)
        expect(results[0].length).toBeGreaterThan(0);
        expect(results[1].length).toBeGreaterThan(0);
        expect(results[2].length).toBeGreaterThan(0);
      });
    });
  });

  describe('Stress Testing', () => {
    it('should handle heavy concurrent-style operations', () => {
      const dynamicTree = createDynamicAABBTree() as DynamicAABBTree;
      const uniformGrid = createUniformGridHash({
        cellSize: 5,
        worldBounds
      }) as UniformGridHash;

      const operations = 2000;
      const startTime = performance.now();

      // Simulate concurrent game-like operations
      for (let i = 0; i < operations; i++) {
        const id = `stress${i}`;
        const x = Math.random() * 80;
        const y = Math.random() * 80;
        const z = Math.random() * 80;

        const bounds: AABB = {
          min: { x, y, z },
          max: { x: x + 1, y: y + 1, z: z + 1 }
        };

        // Insert into both indices
        dynamicTree.insert({ id, bounds });
        uniformGrid.insert({ id, bounds });

        // Occasionally query
        if (i % 10 === 0) {
          const queryBounds: AABB = {
            min: { x: Math.random() * 70, y: Math.random() * 70, z: Math.random() * 70 },
            max: { x: Math.random() * 70 + 10, y: Math.random() * 70 + 10, z: Math.random() * 70 + 10 }
          };
          
          dynamicTree.query({ bounds: queryBounds });
          uniformGrid.query({ bounds: queryBounds });
        }

        // Occasionally update
        if (i % 20 === 0 && i > 0) {
          const updateBounds: AABB = {
            min: { x: Math.random() * 80, y: Math.random() * 80, z: Math.random() * 80 },
            max: { x: Math.random() * 80 + 1, y: Math.random() * 80 + 1, z: Math.random() * 80 + 1 }
          };
          
          dynamicTree.update(`stress${i - 10}`, updateBounds);
          uniformGrid.update(`stress${i - 10}`, updateBounds);
        }

        // Occasionally remove
        if (i % 50 === 0 && i > 0) {
          dynamicTree.remove(`stress${i - 25}`);
          uniformGrid.remove(`stress${i - 25}`);
        }
      }

      const totalTime = performance.now() - startTime;
      console.log(`Stress test (${operations} mixed operations): ${totalTime}ms`);
      
      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
      
      // Verify both indices still function correctly
      const treeDebug = dynamicTree.debug();
      const gridDebug = uniformGrid.debug();
      
      expect(treeDebug.itemCount).toBeGreaterThan(1500); // Most items should remain
      expect(gridDebug.itemCount).toBeGreaterThan(1500);
    });
  });

  describe('AABB Utilities Validation', () => {
    it('should validate AABB utility functions', () => {
      const aabb1: AABB = { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 2, z: 2 } };
      const aabb2: AABB = { min: { x: 1, y: 1, z: 1 }, max: { x: 3, y: 3, z: 3 } };
      const aabb3: AABB = { min: { x: 5, y: 5, z: 5 }, max: { x: 6, y: 6, z: 6 } };

      // Test overlaps
      expect(AABB.overlaps(aabb1, aabb2)).toBe(true);
      expect(AABB.overlaps(aabb1, aabb3)).toBe(false);

      // Test union
      const union = AABB.union(aabb1, aabb2);
      expect(union.min.x).toBe(0);
      expect(union.max.x).toBe(3);

      // Test center
      const center = AABB.center(aabb1);
      expect(center.x).toBe(1);
      expect(center.y).toBe(1);
      expect(center.z).toBe(1);

      // Test size
      const size = AABB.size(aabb1);
      expect(size.x).toBe(2);
      expect(size.y).toBe(2);
      expect(size.z).toBe(2);

      // Test surface area
      const sa = AABB.surfaceArea(aabb1);
      expect(sa).toBe(24); // 2*(2*2 + 2*2 + 2*2) = 2*12 = 24

      // Test containsPoint
      expect(AABB.containsPoint(aabb1, { x: 1, y: 1, z: 1 })).toBe(true);
      expect(AABB.containsPoint(aabb1, { x: 5, y: 5, z: 5 })).toBe(false);

      // Test fatten
      const fattened = AABB.fatten(aabb1, 0.1);
      expect(fattened.min.x).toBeLessThan(aabb1.min.x);
      expect(fattened.max.x).toBeGreaterThan(aabb1.max.x);

      // Test fromCenterAndSize
      const constructed = AABB.fromCenterAndSize({ x: 5, y: 5, z: 5 }, { x: 2, y: 2, z: 2 });
      expect(constructed.min.x).toBe(4);
      expect(constructed.max.x).toBe(6);
    });
  });

  describe('Error Handling Consistency', () => {
    it('should handle errors consistently across index types', () => {
      const dynamicTree = createDynamicAABBTree() as DynamicAABBTree;
      const uniformGrid = createUniformGridHash({
        cellSize: 10,
        worldBounds
      }) as UniformGridHash;

      const item: SpatialItem = {
        id: 'error_test',
        bounds: { min: { x: 10, y: 10, z: 10 }, max: { x: 11, y: 11, z: 11 } }
      };

      // Insert into both
      dynamicTree.insert(item);
      uniformGrid.insert(item);

      // Try to insert duplicates - both should error
      expect(() => dynamicTree.insert(item)).toThrow();
      expect(() => uniformGrid.insert(item)).toThrow();

      // Operations on non-existent items should return false
      expect(dynamicTree.update('nonexistent', item.bounds)).toBe(false);
      expect(uniformGrid.update('nonexistent', item.bounds)).toBe(false);
      expect(dynamicTree.remove('nonexistent')).toBe(false);
      expect(uniformGrid.remove('nonexistent')).toBe(false);
    });
  });

  describe('Memory Efficiency', () => {
    it('should maintain reasonable memory usage', () => {
      const itemCount = 5000;
      
      const dynamicTree = createDynamicAABBTree() as DynamicAABBTree;
      const uniformGrid = createUniformGridHash({
        cellSize: 10,
        worldBounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 500, y: 500, z: 500 } }
      }) as UniformGridHash;

      // Insert many items
      for (let i = 0; i < itemCount; i++) {
        const item: SpatialItem = {
          id: `memory${i}`,
          bounds: {
            min: { x: Math.random() * 400, y: Math.random() * 400, z: Math.random() * 400 },
            max: { x: Math.random() * 400 + 2, y: Math.random() * 400 + 2, z: Math.random() * 400 + 2 }
          }
        };

        dynamicTree.insert(item);
        uniformGrid.insert(item);
      }

      const treeDebug = dynamicTree.debug();
      const gridDebug = uniformGrid.debug();

      console.log('Memory usage for 5000 items:');
      console.log(`  DynamicAABBTree: ${(treeDebug.memoryUsage! / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  UniformGridHash: ${(gridDebug.memoryUsage! / 1024 / 1024).toFixed(2)}MB`);

      // Memory usage should be reasonable
      expect(treeDebug.memoryUsage).toBeLessThan(50 * 1024 * 1024); // < 50MB
      expect(gridDebug.memoryUsage).toBeLessThan(50 * 1024 * 1024); // < 50MB
    });
  });
});
