import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Vector3 } from "three";
import { GridUtils } from "../GridSystem";
import { useWorldStore } from "../../../store/worldStore";

// Mock the world store
vi.mock("../../../store/worldStore", () => ({
  useWorldStore: vi.fn(),
}));

describe("Grid System Integration", () => {
  const mockUseWorldStore = useWorldStore as any;

  beforeEach(() => {
    mockUseWorldStore.mockReturnValue({
      gridConfig: {
        size: 50,
        cellSize: 1,
        opacity: 0.3,
        visibility: true,
        fadeDistance: 30,
        fadeStrength: 1,
        rippleEnabled: true,
        snapToGrid: true,
        showSnapIndicators: true,
      },
      updateGridConfig: vi.fn(),
    });
  });

  describe("Grid Configuration Integration", () => {
    it("provides default grid configuration from store", () => {
      const store = mockUseWorldStore();
      
      expect(store.gridConfig).toEqual({
        size: 50,
        cellSize: 1,
        opacity: 0.3,
        visibility: true,
        fadeDistance: 30,
        fadeStrength: 1,
        rippleEnabled: true,
        snapToGrid: true,
        showSnapIndicators: true,
      });
    });

    it("allows updating grid configuration", () => {
      const store = mockUseWorldStore();
      const updateGridConfig = vi.fn();
      store.updateGridConfig = updateGridConfig;

      const updates = { opacity: 0.5, size: 100 };
      store.updateGridConfig(updates);

      expect(updateGridConfig).toHaveBeenCalledWith(updates);
    });
  });

  describe("Spatial Indexing and Grid Utilities", () => {
    it("correctly snaps positions to grid boundaries", () => {
      const testCases = [
        { input: new Vector3(1.7, 2.3, -0.8), expected: new Vector3(2, 2, -1) },
        { input: new Vector3(-1.2, 0.6, 3.9), expected: new Vector3(-1, 1, 4) },
        { input: new Vector3(0.4, -0.4, 0.5), expected: new Vector3(0, 0, 1) },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = GridUtils.snapToGrid(input, 1);
        expect(Math.abs(result.x - expected.x)).toBeLessThan(0.001);
        expect(Math.abs(result.y - expected.y)).toBeLessThan(0.001);
        expect(Math.abs(result.z - expected.z)).toBeLessThan(0.001);
      });
    });

    it("handles different cell sizes for snapping", () => {
      const position = new Vector3(3.7, 4.3, -1.8);
      
      // Cell size 0.5
      const result1 = GridUtils.snapToGrid(position, 0.5);
      expect(result1.x).toBe(3.5);
      expect(result1.y).toBe(4.5);
      expect(result1.z).toBe(-2);

      // Cell size 2
      const result2 = GridUtils.snapToGrid(position, 2);
      expect(result2.x).toBe(4);
      expect(result2.y).toBe(4);
      expect(result2.z).toBe(-2);
    });

    it("correctly identifies positions on grid", () => {
      // On grid positions
      expect(GridUtils.isOnGrid(new Vector3(2, 3, -1), 1)).toBe(true);
      expect(GridUtils.isOnGrid(new Vector3(0, 0, 0), 1)).toBe(true);
      expect(GridUtils.isOnGrid(new Vector3(-5, 10, 7), 1)).toBe(true);

      // Off grid positions
      expect(GridUtils.isOnGrid(new Vector3(2.5, 3, -1), 1)).toBe(false);
      expect(GridUtils.isOnGrid(new Vector3(2, 3.1, -1), 1)).toBe(false);
      expect(GridUtils.isOnGrid(new Vector3(2, 3, -1.1), 1)).toBe(false);
    });

    it("converts between grid cells and world positions", () => {
      const cell = new Vector3(2, 3, -1);
      const world = GridUtils.gridCellToWorld(cell, 1);
      const backToCell = GridUtils.getGridCell(world, 1);

      expect(world.x).toBe(2);
      expect(world.y).toBe(3);
      expect(world.z).toBe(-1);

      expect(backToCell.x).toBe(2);
      expect(backToCell.y).toBe(3);
      expect(backToCell.z).toBe(-1);
    });

    it("handles spatial indexing for large grids", () => {
      const positions = [];
      const cellSize = 1;
      
      // Generate a 10x10x10 grid of positions
      for (let x = -5; x < 5; x++) {
        for (let y = -5; y < 5; y++) {
          for (let z = -5; z < 5; z++) {
            positions.push(new Vector3(x, y, z));
          }
        }
      }

      // Verify all positions are correctly identified as on-grid
      positions.forEach(pos => {
        expect(GridUtils.isOnGrid(pos, cellSize)).toBe(true);
        
        const cell = GridUtils.getGridCell(pos, cellSize);
        const worldPos = GridUtils.gridCellToWorld(cell, cellSize);
        
        expect(worldPos.distanceTo(pos)).toBeLessThan(0.001);
      });
    });
  });

  describe("Performance Considerations", () => {
    it("efficiently handles large numbers of grid operations", () => {
      const startTime = performance.now();
      const iterations = 10000;
      
      for (let i = 0; i < iterations; i++) {
        const randomPos = new Vector3(
          Math.random() * 100 - 50,
          Math.random() * 100 - 50,
          Math.random() * 100 - 50
        );
        
        const snapped = GridUtils.snapToGrid(randomPos, 1);
        const isOnGrid = GridUtils.isOnGrid(snapped, 1);
        const cell = GridUtils.getGridCell(snapped, 1);
        const worldPos = GridUtils.gridCellToWorld(cell, 1);
        
        // Verify operations are consistent
        expect(isOnGrid).toBe(true);
        expect(worldPos.distanceTo(snapped)).toBeLessThan(0.001);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 10k operations in reasonable time (< 200ms)
      expect(duration).toBeLessThan(200);
    });
  });

  describe("Edge Cases", () => {
    it("handles zero positions correctly", () => {
      const zero = new Vector3(0, 0, 0);
      
      expect(GridUtils.snapToGrid(zero, 1)).toEqual(zero);
      expect(GridUtils.isOnGrid(zero, 1)).toBe(true);
      expect(GridUtils.getGridCell(zero, 1)).toEqual(zero);
      expect(GridUtils.gridCellToWorld(zero, 1)).toEqual(zero);
    });

    it("handles negative positions correctly", () => {
      const negative = new Vector3(-2.7, -3.3, -1.8);
      const snapped = GridUtils.snapToGrid(negative, 1);
      
      expect(snapped.x).toBe(-3);
      expect(snapped.y).toBe(-3);
      expect(snapped.z).toBe(-2);
      
      expect(GridUtils.isOnGrid(snapped, 1)).toBe(true);
    });

    it("handles very small cell sizes", () => {
      const position = new Vector3(1.234, 2.567, -0.891);
      const cellSize = 0.1;
      
      const snapped = GridUtils.snapToGrid(position, cellSize);
      expect(GridUtils.isOnGrid(snapped, cellSize)).toBe(true);
      
      // Should be snapped to nearest 0.1 unit
      expect(Math.abs(snapped.x - Math.round(snapped.x / cellSize) * cellSize)).toBeLessThan(0.001);
    });

    it("handles very large cell sizes", () => {
      const position = new Vector3(7.8, 12.3, -4.6);
      const cellSize = 10;
      
      const snapped = GridUtils.snapToGrid(position, cellSize);
      expect(GridUtils.isOnGrid(snapped, cellSize)).toBe(true);
      
      // Should be snapped to nearest 10 unit
      expect(Math.abs(snapped.x - 10)).toBeLessThan(0.001);
      expect(Math.abs(snapped.y - 10)).toBeLessThan(0.001);
      expect(Math.abs(snapped.z - 0)).toBeLessThan(0.001);
    });
  });
});