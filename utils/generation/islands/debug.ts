/**
 * Island Generation Debug and Testing Utilities
 *
 * Provides debugging tools and test functions to verify island generation
 * is working correctly with the world store integration.
 */

import { Vector3 } from "three";
import { BlockType } from "../../../types/blocks";
import { useWorldStore } from "../../../store/worldStore";
import {
  generateIsland,
  createDefaultIslandConfig,
  type IslandGenConfig,
} from "./IslandGenerator";
import type { TilePlacement } from "./types";

/**
 * Debug information for island generation
 */
export interface IslandDebugResult {
  success: boolean;
  message: string;
  placedBlocks: number;
  failedPlacements: number;
  totalPlacements: number;
  generationTimeMs: number;
  blockCounts: Record<BlockType, number>;
  samplePlacements: TilePlacement[];
  errors: string[];
}

/**
 * Test island generation and placement in world store
 */
export function testIslandGeneration(
  seed: string = "debug-test-seed",
  size: { width: number; height: number } = { width: 32, height: 32 },
): IslandDebugResult {
  console.log("🏝️ Starting island generation debug test...");

  const startTime = performance.now();
  const errors: string[] = [];
  let placedBlocks = 0;
  let failedPlacements = 0;
  const blockCounts: Record<BlockType, number> = {} as Record<
    BlockType,
    number
  >;

  try {
    // Get world store
    const worldStore = useWorldStore.getState();
    console.log("📊 Initial world state:", {
      blockCount: worldStore.blockCount,
      worldLimits: worldStore.worldLimits,
    });

    // Clear existing blocks in test area
    console.log("🧹 Clearing test area...");
    const clearStart = { x: -size.width / 2, z: -size.height / 2 };
    for (let x = 0; x < size.width; x++) {
      for (let z = 0; z < size.height; z++) {
        const pos = new Vector3(clearStart.x + x, 0, clearStart.z + z);
        worldStore.removeBlock(pos, "debug-test");
      }
    }

    // Create island configuration
    const config: IslandGenConfig = {
      ...createDefaultIslandConfig(seed, "debug-island"),
      grid: {
        size: size,
        origin: { x: -size.width / 2, z: -size.height / 2 },
        yLevel: 0,
        chunkSize: 16,
      },
      // Use simpler palette for debugging
      palette: {
        all: [
          { id: BlockType.STONE, weight: 3 },
          { id: BlockType.WOOD, weight: 2 },
        ],
        exotic: [{ id: BlockType.FROSTED_GLASS, rarity: 1 }],
        safeFallback: [BlockType.STONE],
      },
    };

    console.log("⚙️ Island configuration:", {
      seed: config.seed,
      gridSize: config.grid.size,
      origin: config.grid.origin,
      yLevel: config.grid.yLevel,
    });

    // Generate island
    console.log("🎲 Generating island...");
    const result = generateIsland(config);
    console.log("📈 Generation result:", {
      placementsCount: result.placements.length,
      regionsCount: result.regions.length,
    });

    // Place blocks in world
    console.log("🏗️ Placing blocks in world...");
    for (const placement of result.placements) {
      try {
        const position = new Vector3(placement.x, placement.y, placement.z);

        // Validate position
        if (!isValidPosition(position)) {
          errors.push(
            `Invalid position: (${placement.x}, ${placement.y}, ${placement.z})`,
          );
          failedPlacements++;
          continue;
        }

        // Validate block type
        if (!Object.values(BlockType).includes(placement.floorId)) {
          errors.push(`Invalid block type: ${placement.floorId}`);
          failedPlacements++;
          continue;
        }

        // Place the block
        const success = worldStore.addBlock(
          position,
          placement.floorId,
          "debug-test",
        );

        if (success) {
          placedBlocks++;
          blockCounts[placement.floorId] =
            (blockCounts[placement.floorId] || 0) + 1;
        } else {
          failedPlacements++;
          errors.push(
            `Failed to place ${placement.floorId} at (${placement.x}, ${placement.y}, ${placement.z})`,
          );
        }
      } catch (error) {
        failedPlacements++;
        errors.push(
          `Exception placing block: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    const endTime = performance.now();
    const generationTimeMs = endTime - startTime;

    // Get sample placements for inspection
    const samplePlacements = result.placements.slice(0, 10);

    // Final world state
    console.log("📊 Final world state:", {
      blockCount: worldStore.blockCount,
      placedInTest: placedBlocks,
      failed: failedPlacements,
    });

    const debugResult: IslandDebugResult = {
      success: placedBlocks > 0 && errors.length === 0,
      message:
        placedBlocks > 0
          ? `Successfully placed ${placedBlocks} blocks`
          : "No blocks were placed",
      placedBlocks,
      failedPlacements,
      totalPlacements: result.placements.length,
      generationTimeMs,
      blockCounts,
      samplePlacements,
      errors,
    };

    // Log results
    console.log("✅ Island generation debug complete:", debugResult);

    return debugResult;
  } catch (error) {
    const endTime = performance.now();
    const generationTimeMs = endTime - startTime;

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    errors.push(errorMessage);

    console.error("❌ Island generation debug failed:", error);

    return {
      success: false,
      message: `Generation failed: ${errorMessage}`,
      placedBlocks,
      failedPlacements,
      totalPlacements: 0,
      generationTimeMs,
      blockCounts,
      samplePlacements: [],
      errors,
    };
  }
}

/**
 * Validate that a position is reasonable for block placement
 */
function isValidPosition(position: Vector3): boolean {
  // Check for reasonable coordinate ranges
  const maxCoord = 1000;
  return (
    Math.abs(position.x) <= maxCoord &&
    Math.abs(position.y) <= maxCoord &&
    Math.abs(position.z) <= maxCoord &&
    !isNaN(position.x) &&
    !isNaN(position.y) &&
    !isNaN(position.z)
  );
}

/**
 * Generate a simple test island with minimal configuration
 */
export function generateTestIsland(): IslandDebugResult {
  return testIslandGeneration("test-" + Date.now(), { width: 16, height: 16 });
}

/**
 * Clear all blocks in a test area
 */
export function clearTestArea(
  center: { x: number; z: number } = { x: 0, z: 0 },
  size: { width: number; height: number } = { width: 32, height: 32 },
): number {
  const worldStore = useWorldStore.getState();
  let clearedCount = 0;

  const startX = center.x - size.width / 2;
  const startZ = center.z - size.height / 2;

  for (let x = 0; x < size.width; x++) {
    for (let z = 0; z < size.height; z++) {
      const position = new Vector3(startX + x, 0, startZ + z);
      if (worldStore.removeBlock(position, "debug-clear")) {
        clearedCount++;
      }
    }
  }

  console.log(`🧹 Cleared ${clearedCount} blocks from test area`);
  return clearedCount;
}

/**
 * Get current world statistics
 */
export function getWorldStats() {
  const worldStore = useWorldStore.getState();
  const blocks = worldStore.getAllBlocks();

  const blocksByType: Record<string, number> = {};
  blocks.forEach((block) => {
    blocksByType[block.type] = (blocksByType[block.type] || 0) + 1;
  });

  return {
    totalBlocks: worldStore.blockCount,
    blocksByType,
    worldLimits: worldStore.worldLimits,
    syncStatus: worldStore.syncStatus,
  };
}

/**
 * Console command to run island generation test
 */
export function runIslandDebugTest() {
  console.log("🚀 Running island generation debug test...");
  const result = testIslandGeneration();

  if (result.success) {
    console.log("✅ Test successful! Check the world for generated blocks.");
    console.log("📍 Blocks should appear around coordinates (0, 0, 0)");
  } else {
    console.log("❌ Test failed. Check errors:", result.errors);
  }

  return result;
}

/**
 * Make debug functions available globally for console testing
 */
if (typeof window !== "undefined") {
  (window as any).islandDebug = {
    test: runIslandDebugTest,
    generate: generateTestIsland,
    clear: clearTestArea,
    stats: getWorldStats,
  };

  if (
    process.env.NODE_ENV === "development" &&
    (window as any).__ENABLE_ISLAND_DEBUG_LOGS__ === true
  ) {
    console.log("🔧 Island debug tools available at window.islandDebug");
    console.log("   - islandDebug.test() - Run full test");
    console.log("   - islandDebug.generate() - Generate small test island");
    console.log("   - islandDebug.clear() - Clear test area");
    console.log("   - islandDebug.stats() - Get world statistics");
  }
}
