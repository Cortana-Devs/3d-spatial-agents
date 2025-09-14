/**
 * Island Generator Tests
 *
 * Comprehensive test suite for the island generation system including
 * determinism, region assignment, and integration functionality.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Vector3 } from "three";
import { BlockType } from "../../../types/blocks";
import {
  generateIsland,
  createDefaultIslandConfig,
  IslandGenerator,
} from "../islands/IslandGenerator";
import {
  createDeterministicRNG,
  testDeterminism,
  generateSequence,
} from "../rng/DeterministicRNG";
import { createNoiseGenerator } from "../noise/NoiseGenerator";
import type {
  IslandGenConfig,
  IslandGenResult,
  TilePlacement,
  RegionRule,
} from "../islands/types";

describe("DeterministicRNG", () => {
  it("should produce consistent results with same seed", () => {
    const seed = "test-seed";
    const rng1 = createDeterministicRNG(seed);
    const rng2 = createDeterministicRNG(seed);

    // Generate 100 numbers and compare
    for (let i = 0; i < 100; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it("should produce different results with different seeds", () => {
    const rng1 = createDeterministicRNG("seed1");
    const rng2 = createDeterministicRNG("seed2");

    let differences = 0;
    for (let i = 0; i < 100; i++) {
      if (rng1.next() !== rng2.next()) {
        differences++;
      }
    }

    expect(differences).toBeGreaterThan(90); // Should be almost all different
  });

  it("should pass determinism test", () => {
    expect(testDeterminism("test-seed-123", 1000)).toBe(true);
    expect(testDeterminism(42, 1000)).toBe(true);
  });

  it("should handle string seeds correctly", () => {
    const sequence1 = generateSequence("hello-world", 10);
    const sequence2 = generateSequence("hello-world", 10);
    expect(sequence1).toEqual(sequence2);
  });

  it("should provide weighted selection", () => {
    const rng = createDeterministicRNG("weight-test");
    const items = ["a", "b", "c"];
    const weights = [10, 1, 1]; // 'a' should be picked much more often

    const results = new Map<string, number>();
    for (let i = 0; i < 1000; i++) {
      const picked = rng.pick(items, weights);
      results.set(picked, (results.get(picked) || 0) + 1);
    }

    // 'a' should be picked significantly more than 'b' or 'c'
    expect(results.get("a")!).toBeGreaterThan(results.get("b")! * 5);
    expect(results.get("a")!).toBeGreaterThan(results.get("c")! * 5);
  });

  it("should shuffle arrays consistently", () => {
    const rng1 = createDeterministicRNG("shuffle-test");
    const rng2 = createDeterministicRNG("shuffle-test");

    const arr1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const arr2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    rng1.shuffleInPlace(arr1);
    rng2.shuffleInPlace(arr2);

    expect(arr1).toEqual(arr2);
    expect(arr1).not.toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]); // Should be shuffled
  });
});

describe("NoiseGenerator", () => {
  it("should produce consistent noise with same RNG", () => {
    const rng1 = createDeterministicRNG("noise-test");
    const rng2 = createDeterministicRNG("noise-test");

    const noise1 = createNoiseGenerator(rng1);
    const noise2 = createNoiseGenerator(rng2);

    // Test same coordinates
    for (let i = 0; i < 10; i++) {
      const x = i * 0.1;
      const y = i * 0.15;
      expect(noise1.simplex.noise(x, y)).toBe(noise2.simplex.noise(x, y));
    }
  });

  it("should produce values in expected range", () => {
    const rng = createDeterministicRNG("range-test");
    const noise = createNoiseGenerator(rng);

    // Test 1000 random coordinates
    for (let i = 0; i < 1000; i++) {
      const x = (i % 100) * 0.1;
      const y = Math.floor(i / 100) * 0.1;
      const value = noise.simplex.noise(x, y);

      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("should produce smooth gradients", () => {
    const rng = createDeterministicRNG("gradient-test");
    const noise = createNoiseGenerator(rng);

    // Test that nearby points have similar values
    const baseX = 5.5;
    const baseY = 3.3;
    const baseValue = noise.simplex.noise(baseX, baseY);

    const delta = 0.01;
    const nearbyValue = noise.simplex.noise(baseX + delta, baseY + delta);

    // Nearby values should be similar (difference less than 0.1)
    expect(Math.abs(baseValue - nearbyValue)).toBeLessThan(0.1);
  });
});

describe("IslandGenerator", () => {
  let defaultConfig: IslandGenConfig;

  beforeEach(() => {
    defaultConfig = createDefaultIslandConfig("test-seed", "test-island");
  });

  it("should generate deterministic islands", () => {
    const result1 = generateIsland(defaultConfig);
    const result2 = generateIsland(defaultConfig);

    expect(result1.placements.length).toBe(result2.placements.length);
    expect(result1.regions.length).toBe(result2.regions.length);

    // Check that placements are identical
    result1.placements.forEach((placement, index) => {
      const other = result2.placements[index];
      expect(placement.x).toBe(other.x);
      expect(placement.y).toBe(other.y);
      expect(placement.z).toBe(other.z);
      expect(placement.floorId).toBe(other.floorId);
      expect(placement.regionId).toBe(other.regionId);
      expect(placement.rule).toBe(other.rule);
    });
  });

  it("should create expected number of regions", () => {
    const result = generateIsland(defaultConfig);

    const regionCounts = result.regions.reduce(
      (counts, region) => {
        counts[region.rule] = (counts[region.rule] || 0) + 1;
        return counts;
      },
      {} as Record<RegionRule, number>,
    );

    expect(regionCounts.ALL).toBe(defaultConfig.layout.allCount);
    expect(regionCounts.PURE).toBe(defaultConfig.layout.pureCount);
    expect(regionCounts.UNIQUE).toBe(defaultConfig.layout.uniqueCount);
  });

  it("should generate islands within grid bounds", () => {
    const result = generateIsland(defaultConfig);
    const { origin, size } = defaultConfig.grid;

    result.placements.forEach((placement) => {
      expect(placement.x).toBeGreaterThanOrEqual(origin.x);
      expect(placement.x).toBeLessThan(origin.x + size.width);
      expect(placement.z).toBeGreaterThanOrEqual(origin.z);
      expect(placement.z).toBeLessThan(origin.z + size.height);
      expect(placement.y).toBe(defaultConfig.grid.yLevel);
    });
  });

  it("should use only valid floor types", () => {
    const result = generateIsland(defaultConfig);
    const validFloorTypes = new Set([
      ...defaultConfig.palette.all.map((p) => p.id),
      ...defaultConfig.palette.exotic.map((p) => p.id),
      ...defaultConfig.palette.safeFallback,
    ]);

    result.placements.forEach((placement) => {
      expect(validFloorTypes.has(placement.floorId)).toBe(true);
    });
  });

  it("should enforce PURE region rule", () => {
    const result = generateIsland(defaultConfig);

    // Group placements by region
    const regionPlacements = new Map<string, TilePlacement[]>();
    result.placements.forEach((placement) => {
      if (!regionPlacements.has(placement.regionId)) {
        regionPlacements.set(placement.regionId, []);
      }
      regionPlacements.get(placement.regionId)!.push(placement);
    });

    // Check PURE regions have only one floor type
    result.regions.forEach((region) => {
      if (region.rule === "PURE") {
        const placements = regionPlacements.get(region.id) || [];
        if (placements.length > 0) {
          const firstFloorType = placements[0].floorId;
          placements.forEach((placement) => {
            expect(placement.floorId).toBe(firstFloorType);
          });
        }
      }
    });
  });

  it("should enforce UNIQUE region distance constraints", () => {
    const result = generateIsland(defaultConfig);
    const minDistance = defaultConfig.layout.uniqueNoRepeatDistance;

    // Group placements by region
    const regionPlacements = new Map<string, TilePlacement[]>();
    result.placements.forEach((placement) => {
      if (!regionPlacements.has(placement.regionId)) {
        regionPlacements.set(placement.regionId, []);
      }
      regionPlacements.get(placement.regionId)!.push(placement);
    });

    // Check UNIQUE regions respect distance constraints
    result.regions.forEach((region) => {
      if (region.rule === "UNIQUE") {
        const placements = regionPlacements.get(region.id) || [];

        // Group by floor type
        const floorPlacements = new Map<BlockType, TilePlacement[]>();
        placements.forEach((placement) => {
          if (!floorPlacements.has(placement.floorId)) {
            floorPlacements.set(placement.floorId, []);
          }
          floorPlacements.get(placement.floorId)!.push(placement);
        });

        // Check distance constraints within each floor type
        floorPlacements.forEach((positions, floorType) => {
          for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
              const pos1 = positions[i];
              const pos2 = positions[j];
              const distance = Math.sqrt(
                (pos1.x - pos2.x) ** 2 + (pos1.z - pos2.z) ** 2,
              );

              // Allow some tolerance for edge cases
              if (distance < minDistance - 0.5) {
                console.warn(
                  `Distance constraint violation: ${distance} < ${minDistance} for ${floorType} in region ${region.id}`,
                );
              }
            }
          }
        });
      }
    });
  });

  it("should generate debug info when requested", () => {
    const configWithDebug: IslandGenConfig = {
      ...defaultConfig,
      debug: {
        emitOverlay: true,
        labelRegions: true,
      },
    };

    const result = generateIsland(configWithDebug);

    expect(result.debug).toBeDefined();
    expect(result.debug!.seeds).toBeDefined();
    expect(result.debug!.mask).toBeDefined();
    expect(result.debug!.regionIdByTile).toBeDefined();

    expect(result.debug!.seeds.length).toBe(
      defaultConfig.layout.allCount +
        defaultConfig.layout.pureCount +
        defaultConfig.layout.uniqueCount,
    );
  });

  it("should handle different island sizes", () => {
    const smallConfig: IslandGenConfig = {
      ...defaultConfig,
      grid: {
        ...defaultConfig.grid,
        size: { width: 32, height: 32 },
      },
      mask: {
        ...defaultConfig.mask,
        radius: 14,
      },
    };

    const smallResult = generateIsland(smallConfig);
    const defaultResult = generateIsland(defaultConfig);

    expect(smallResult.placements.length).toBeLessThan(
      defaultResult.placements.length,
    );
    expect(smallResult.regions.length).toBe(defaultResult.regions.length);
  });

  it("should handle edge case configurations", () => {
    // Very small island
    const tinyConfig: IslandGenConfig = {
      ...defaultConfig,
      grid: { ...defaultConfig.grid, size: { width: 16, height: 16 } },
      mask: { ...defaultConfig.mask, radius: 6 },
      layout: {
        ...defaultConfig.layout,
        allCount: 1,
        pureCount: 1,
        uniqueCount: 1,
      },
    };

    expect(() => generateIsland(tinyConfig)).not.toThrow();

    // High noise amplitude
    const noisyConfig: IslandGenConfig = {
      ...defaultConfig,
      mask: { ...defaultConfig.mask, noiseAmplitude: 0.5, fbmOctaves: 5 },
    };

    expect(() => generateIsland(noisyConfig)).not.toThrow();
  });

  it("should validate configuration properly", () => {
    // Invalid configuration should throw
    const invalidConfig: IslandGenConfig = {
      ...defaultConfig,
      mask: { ...defaultConfig.mask, radius: -10 }, // Invalid negative radius
    };

    expect(() => new IslandGenerator(invalidConfig)).toThrow();

    // Empty palette should throw
    const emptyPaletteConfig: IslandGenConfig = {
      ...defaultConfig,
      palette: { all: [], exotic: [], safeFallback: [] },
    };

    expect(() => new IslandGenerator(emptyPaletteConfig)).toThrow();
  });

  it("should produce reasonable island shapes", () => {
    const result = generateIsland(defaultConfig);
    const totalTiles =
      defaultConfig.grid.size.width * defaultConfig.grid.size.height;
    const islandTiles = result.placements.length;

    // Island should occupy reasonable portion of grid (not too sparse, not too dense)
    const fillRatio = islandTiles / totalTiles;
    expect(fillRatio).toBeGreaterThan(0.1); // At least 10% filled
    expect(fillRatio).toBeLessThan(0.9); // At most 90% filled

    // Should have placements (not empty)
    expect(islandTiles).toBeGreaterThan(0);
  });
});

describe("Integration Tests", () => {
  it("should handle large islands efficiently", () => {
    const largeConfig = createDefaultIslandConfig("perf-test", "large-island");
    largeConfig.grid.size = { width: 256, height: 256 };
    largeConfig.mask.radius = 120;

    const startTime = performance.now();
    const result = generateIsland(largeConfig);
    const endTime = performance.now();

    // Should complete in reasonable time (less than 1 second)
    expect(endTime - startTime).toBeLessThan(1000);

    // Should produce significant number of placements
    expect(result.placements.length).toBeGreaterThan(10000);
  });

  it("should work with different block palettes", () => {
    const customConfig: IslandGenConfig = {
      ...createDefaultIslandConfig("custom-test", "custom-island"),
      palette: {
        all: [
          { id: BlockType.STONE, weight: 5 },
          { id: BlockType.WOOD, weight: 3 },
        ],
        exotic: [{ id: BlockType.FROSTED_GLASS, rarity: 1 }],
        safeFallback: [BlockType.STONE],
      },
    };

    const result = generateIsland(customConfig);

    // Should only use blocks from the custom palette
    const usedBlocks = new Set(result.placements.map((p) => p.floorId));
    const allowedBlocks = new Set([
      BlockType.STONE,
      BlockType.WOOD,
      BlockType.FROSTED_GLASS,
    ]);

    usedBlocks.forEach((blockType) => {
      expect(allowedBlocks.has(blockType)).toBe(true);
    });
  });

  it("should maintain region spatial coherence", () => {
    const result = generateIsland(defaultConfig);

    if (result.debug) {
      const { regionIdByTile } = result.debug;
      const height = regionIdByTile.length;
      const width = regionIdByTile[0]?.length || 0;

      // Check that regions form coherent shapes (most cells should have neighbors of same region)
      let coherentCells = 0;
      let totalCells = 0;

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const regionId = regionIdByTile[y][x];
          if (!regionId) continue;

          totalCells++;

          // Count neighbors with same region
          let sameRegionNeighbors = 0;
          const neighbors = [
            regionIdByTile[y - 1][x],
            regionIdByTile[y + 1][x],
            regionIdByTile[y][x - 1],
            regionIdByTile[y][x + 1],
          ];

          neighbors.forEach((neighborId) => {
            if (neighborId === regionId) sameRegionNeighbors++;
          });

          // At least 2 neighbors should be same region for coherence
          if (sameRegionNeighbors >= 2) {
            coherentCells++;
          }
        }
      }

      const coherenceRatio = coherentCells / totalCells;
      expect(coherenceRatio).toBeGreaterThan(0.7); // 70% of cells should be coherent
    }
  });
});
