/**
 * Island Generation Integration Module
 *
 * Provides integration between the island generation system and the world store,
 * including development controls and progress tracking.
 */

import { Vector3 } from 'three';
import { BlockType } from '../../../types/blocks';
import {
  IslandGenConfig,
  IslandGenResult,
  TilePlacement,
  IslandDebugInfo,
} from './types';
import {
  generateIsland,
  generateIslandAndCommit,
  createDefaultIslandConfig,
} from './IslandGenerator';

/**
 * Island generation progress callback
 */
export type IslandGenerationProgressCallback = (
  progress: number,
  stage: string,
  details?: string
) => void;

/**
 * Island generation integration configuration
 */
export interface IslandIntegrationConfig {
  worldSeed: string;
  islandId: string;
  playerPosition?: { x: number; z: number };
  size?: { width: number; height: number };
  onProgress?: IslandGenerationProgressCallback;
  debug?: boolean;
}

/**
 * World store interface for island generation
 */
export interface WorldStoreInterface {
  addBlock: (position: Vector3, type: BlockType, userId: string) => boolean;
  removeBlock: (position: Vector3, userId: string) => boolean;
  clearWorld: () => void;
  getBlock: (position: Vector3) => any;
  getAllBlocks: () => any[];
}

/**
 * Island generation result with integration metadata
 */
export interface IslandIntegrationResult {
  success: boolean;
  placedBlocks: number;
  totalBlocks: number;
  generationTimeMs: number;
  debugInfo?: IslandDebugInfo;
  error?: string;
}

/**
 * Generate and place an island in the world
 */
export async function generateAndPlaceIsland(
  config: IslandIntegrationConfig,
  worldStore: WorldStoreInterface
): Promise<IslandIntegrationResult> {
  const startTime = performance.now();
  let placedBlocks = 0;

  try {
    // Report progress
    config.onProgress?.(0, 'Initializing', 'Preparing island generation...');

    // Create generation config
    const playerPos = config.playerPosition || { x: 0, z: 0 };
    const size = config.size || { width: 128, height: 128 };

    const islandConfig: IslandGenConfig = {
      ...createDefaultIslandConfig(config.worldSeed, config.islandId),
      grid: {
        size: size,
        origin: {
          x: playerPos.x - Math.floor(size.width / 2),
          z: playerPos.z - Math.floor(size.height / 2)
        },
        yLevel: 0,
        chunkSize: 32,
      },
      debug: {
        emitOverlay: config.debug || false,
        labelRegions: config.debug || false,
      }
    };

    config.onProgress?.(0.1, 'Generating', 'Creating island layout...');

    // Generate island
    const result = generateIsland(islandConfig);
    const totalBlocks = result.placements.length;

    config.onProgress?.(0.3, 'Placing', `Placing ${totalBlocks} blocks...`);

    // Place blocks in chunks to avoid blocking the main thread
    const chunkSize = 50;
    for (let i = 0; i < result.placements.length; i += chunkSize) {
      const chunk = result.placements.slice(i, i + chunkSize);

      for (const placement of chunk) {
        const position = new Vector3(placement.x, placement.y, placement.z);
        const success = worldStore.addBlock(position, placement.floorId, 'island-generator');

        if (success) {
          placedBlocks++;
        }
      }

      // Update progress
      const progress = 0.3 + (0.7 * (i + chunkSize) / result.placements.length);
      config.onProgress?.(
        Math.min(progress, 1.0),
        'Placing',
        `${placedBlocks}/${totalBlocks} blocks placed`
      );

      // Yield control every chunk to keep UI responsive
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    const generationTime = performance.now() - startTime;

    config.onProgress?.(1.0, 'Complete', `Island generated successfully!`);

    return {
      success: true,
      placedBlocks,
      totalBlocks,
      generationTimeMs: generationTime,
      debugInfo: result.debug,
    };

  } catch (error) {
    const generationTime = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    config.onProgress?.(0, 'Error', errorMessage);

    return {
      success: false,
      placedBlocks,
      totalBlocks: 0,
      generationTimeMs: generationTime,
      error: errorMessage,
    };
  }
}

/**
 * Clear existing island blocks in a region
 */
export async function clearIslandRegion(
  center: { x: number; z: number },
  size: { width: number; height: number },
  worldStore: WorldStoreInterface,
  onProgress?: (progress: number) => void
): Promise<number> {
  const startX = center.x - Math.floor(size.width / 2);
  const startZ = center.z - Math.floor(size.height / 2);

  let clearedBlocks = 0;
  const totalPositions = size.width * size.height;
  let processed = 0;

  for (let z = 0; z < size.height; z++) {
    for (let x = 0; x < size.width; x++) {
      const worldX = startX + x;
      const worldZ = startZ + z;

      // Check for blocks at y=0 (floor level)
      const position = new Vector3(worldX, 0, worldZ);
      const existingBlock = worldStore.getBlock(position);

      if (existingBlock) {
        const success = worldStore.removeBlock(position, 'island-generator');
        if (success) {
          clearedBlocks++;
        }
      }

      processed++;
      if (onProgress && processed % 100 === 0) {
        onProgress(processed / totalPositions);
      }
    }

    // Yield control periodically
    if (z % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  onProgress?.(1.0);
  return clearedBlocks;
}

/**
 * Development helper: Generate island at player position
 */
export async function generateIslandAtPlayer(
  worldStore: WorldStoreInterface,
  playerPosition: { x: number; z: number },
  worldSeed: string = 'dev-seed',
  onProgress?: IslandGenerationProgressCallback
): Promise<IslandIntegrationResult> {
  return generateAndPlaceIsland({
    worldSeed,
    islandId: `dev-island-${Date.now()}`,
    playerPosition,
    size: { width: 96, height: 96 },
    onProgress,
    debug: true,
  }, worldStore);
}

/**
 * Validate island placement location
 */
export function validateIslandPlacement(
  center: { x: number; z: number },
  size: { width: number; height: number },
  worldStore: WorldStoreInterface
): {
  valid: boolean;
  warnings: string[];
  blockCount: number;
} {
  const warnings: string[] = [];
  let blockCount = 0;

  const startX = center.x - Math.floor(size.width / 2);
  const startZ = center.z - Math.floor(size.height / 2);

  // Check for existing blocks in the area
  for (let z = 0; z < size.height; z += 5) { // Sample every 5th position for performance
    for (let x = 0; x < size.width; x += 5) {
      const position = new Vector3(startX + x, 0, startZ + z);
      if (worldStore.getBlock(position)) {
        blockCount++;
      }
    }
  }

  if (blockCount > 0) {
    warnings.push(`Area contains ${blockCount * 25} existing blocks that will be overwritten`);
  }

  // Check bounds (basic validation)
  const maxCoord = 10000; // Reasonable world limit
  if (Math.abs(center.x) > maxCoord || Math.abs(center.z) > maxCoord) {
    warnings.push('Island location is very far from world origin');
  }

  return {
    valid: warnings.length === 0,
    warnings,
    blockCount: blockCount * 25, // Estimate from sampling
  };
}

/**
 * Get island generation presets
 */
export function getIslandPresets(): Record<string, Partial<IslandGenConfig>> {
  return {
    small: {
      grid: { size: { width: 64, height: 64 }, origin: { x: 0, z: 0 }, yLevel: 0, chunkSize: 32 },
      mask: { radius: 28, noiseFrequency: 0.6, noiseAmplitude: 0.15, fbmOctaves: 2, shoreSoftness: 0.3 },
      layout: { allCount: 2, pureCount: 4, uniqueCount: 3, uniqueNoRepeatDistance: 3, relaxIterations: 1 },
    },

    medium: {
      grid: { size: { width: 128, height: 128 }, origin: { x: 0, z: 0 }, yLevel: 0, chunkSize: 64 },
      mask: { radius: 58, noiseFrequency: 0.8, noiseAmplitude: 0.18, fbmOctaves: 3, shoreSoftness: 0.35 },
      layout: { allCount: 3, pureCount: 6, uniqueCount: 6, uniqueNoRepeatDistance: 5, relaxIterations: 1 },
    },

    large: {
      grid: { size: { width: 192, height: 192 }, origin: { x: 0, z: 0 }, yLevel: 0, chunkSize: 64 },
      mask: { radius: 88, noiseFrequency: 1.0, noiseAmplitude: 0.22, fbmOctaves: 4, shoreSoftness: 0.4 },
      layout: { allCount: 4, pureCount: 8, uniqueCount: 8, uniqueNoRepeatDistance: 7, relaxIterations: 2 },
    },

    organic: {
      mask: { noiseFrequency: 1.2, noiseAmplitude: 0.3, fbmOctaves: 5, shoreSoftness: 0.5 },
      layout: { relaxIterations: 3 },
    },

    geometric: {
      mask: { noiseFrequency: 0.4, noiseAmplitude: 0.08, fbmOctaves: 1, shoreSoftness: 0.1 },
      layout: { relaxIterations: 0 },
    },
  };
}

/**
 * Keyboard shortcut handlers for development
 */
export class IslandDevControls {
  private worldStore: WorldStoreInterface;
  private currentResult: IslandIntegrationResult | null = null;
  private listeners: (() => void)[] = [];

  constructor(worldStore: WorldStoreInterface) {
    this.worldStore = worldStore;
  }

  /**
   * Initialize keyboard controls
   */
  initializeControls(getPlayerPosition: () => { x: number; z: number }): void {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!event.shiftKey) return;

      switch (event.key.toLowerCase()) {
        case 'i':
          event.preventDefault();
          this.generateIsland(getPlayerPosition());
          break;
        case 'k':
          event.preventDefault();
          this.clearIsland(getPlayerPosition());
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    this.listeners.push(() => document.removeEventListener('keydown', handleKeyDown));
  }

  /**
   * Generate island at position
   */
  private async generateIsland(playerPosition: { x: number; z: number }): Promise<void> {
    console.log('🏝️ Generating island at player position:', playerPosition);

    try {
      this.currentResult = await generateIslandAtPlayer(
        this.worldStore,
        playerPosition,
        'dev-seed-' + Date.now(),
        (progress, stage, details) => {
          console.log(`🏝️ ${stage}: ${Math.round(progress * 100)}% ${details || ''}`);
        }
      );

      if (this.currentResult.success) {
        console.log(`✅ Island generated successfully! Placed ${this.currentResult.placedBlocks} blocks in ${this.currentResult.generationTimeMs.toFixed(1)}ms`);
      } else {
        console.error('❌ Island generation failed:', this.currentResult.error);
      }
    } catch (error) {
      console.error('❌ Island generation error:', error);
    }
  }

  /**
   * Clear island at position
   */
  private async clearIsland(playerPosition: { x: number; z: number }): Promise<void> {
    console.log('🧹 Clearing island area at:', playerPosition);

    try {
      const clearedBlocks = await clearIslandRegion(
        playerPosition,
        { width: 96, height: 96 },
        this.worldStore,
        (progress) => {
          if (progress === 1.0) {
            console.log(`🧹 Clearing complete: ${clearedBlocks} blocks removed`);
          }
        }
      );
    } catch (error) {
      console.error('❌ Island clearing error:', error);
    }
  }

  /**
   * Get current generation result
   */
  getCurrentResult(): IslandIntegrationResult | null {
    return this.currentResult;
  }

  /**
   * Cleanup controls
   */
  dispose(): void {
    this.listeners.forEach(cleanup => cleanup());
    this.listeners = [];
  }
}

/**
 * Create island dev controls instance
 */
export function createIslandDevControls(
  worldStore: WorldStoreInterface,
  getPlayerPosition: () => { x: number; z: number }
): IslandDevControls {
  const controls = new IslandDevControls(worldStore);
  controls.initializeControls(getPlayerPosition);
  return controls;
}
