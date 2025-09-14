import { devLog } from "@/utils/devLogger";

/**
 * Archipelago Generator - Advanced Multi-Island System
 *
 * Generates beautiful archipelagos with multiple smooth, large islands using
 * advanced noise algorithms, seed-based patterns, and single-block precision.
 *
 * Features:
 * - Multiple interconnected islands of varying sizes
 * - Ultra-smooth coastlines using advanced noise blending
 * - Seed-based deterministic generation
 * - Pattern-based island distribution (circular, linear, spiral, random)
 * - Single-block precision placement
 * - Advanced erosion and smoothing algorithms
 * - Biome-aware generation with different island types
 */

import { Vector3 } from 'three';
import { BlockType } from '../../../types/blocks';
import { createDeterministicRNG, RNG } from '../rng/DeterministicRNG';
import { createNoiseGenerator, FBMNoise, NoiseUtils } from '../noise/NoiseGenerator';

/**
 * Island type definitions for varied generation
 */
export type IslandType = 'volcanic' | 'tropical' | 'temperate' | 'arctic' | 'desert' | 'mystical';

/**
 * Archipelago distribution patterns
 */
export type ArchipelagoPattern = 'circular' | 'linear' | 'spiral' | 'cluster' | 'random' | 'chain';

/**
 * Advanced noise configuration for ultra-smooth generation
 */
export interface AdvancedNoiseConfig {
  baseFrequency: number;      // Primary noise frequency
  ridgeFrequency: number;     // Ridge noise for terrain features
  erosionFrequency: number;   // Erosion pattern frequency
  octaves: number;            // Number of noise octaves
  lacunarity: number;         // Frequency multiplier per octave
  gain: number;               // Amplitude multiplier per octave
  ridgeOffset: number;        // Ridge noise offset
  erosionStrength: number;    // How much erosion affects the coastline
  smoothingPasses: number;    // Number of smoothing iterations
}

/**
 * Individual island configuration
 */
export interface IslandSpec {
  id: string;
  center: { x: number; z: number };
  baseRadius: number;
  heightVariation: number;
  type: IslandType;
  noiseConfig: Partial<AdvancedNoiseConfig>;
  blockPalette: BlockType[];
  weight: number; // Influence strength for blending with other islands
}

/**
 * Archipelago generation configuration
 */
export interface ArchipelagoConfig {
  seed: string | number;
  pattern: ArchipelagoPattern;
  gridSize: { width: number; height: number };
  origin: { x: number; z: number };
  yLevel: number;

  // Island generation parameters
  islandCount: number;
  minIslandRadius: number;
  maxIslandRadius: number;
  minIslandDistance: number;

  // Pattern-specific parameters
  patternParams: {
    radius?: number;        // For circular patterns
    direction?: number;     // For linear patterns (angle in radians)
    spiralTightness?: number; // For spiral patterns
    clusterDensity?: number;  // For cluster patterns
  };

  // Noise and smoothing
  globalNoiseConfig: AdvancedNoiseConfig;
  coastlineSmoothing: number;    // 0-1, smoothness of coastlines
  islandBlending: number;        // 0-1, how much islands blend into each other

  // Block placement
  defaultPalette: BlockType[];
  biomeMapping: Record<IslandType, BlockType[]>;
  useGradientPlacement: boolean;  // Use different blocks based on distance from center

  // Advanced features
  enableSubIslands: boolean;      // Generate small sub-islands around main ones
  enableTidalZones: boolean;      // Create shallow water areas
  enableBeaches: boolean;         // Create beach transitions
  waterLevel: number;             // Y level below which is considered water
}

/**
 * Generation result with detailed information
 */
export interface ArchipelagoResult {
  islands: IslandSpec[];
  placements: Array<{
    position: Vector3;
    blockType: BlockType;
    islandId: string;
    distanceFromCenter: number;
    heightValue: number;
    biome: IslandType;
  }>;
  stats: {
    totalBlocks: number;
    islandSizes: Record<string, number>;
    biomeDistribution: Record<IslandType, number>;
    generationTimeMs: number;
    coverageArea: number;
  };
  debugInfo?: {
    heightmap: number[][];
    islandMask: number[][];
    biomeMap: IslandType[][];
  };
}

/**
 * Advanced Archipelago Generator Class
 */
export class ArchipelagoGenerator {
  private rng: RNG;
  private fbmNoise: FBMNoise;
  private config: ArchipelagoConfig;
  private heightmap: number[][];
  private islandMask: number[][];
  private biomeMap: IslandType[][];

  constructor(config: ArchipelagoConfig) {
    this.config = this.validateAndNormalizeConfig(config);
    this.rng = createDeterministicRNG(config.seed);
    const noiseGen = createNoiseGenerator(this.rng.clone());
    this.fbmNoise = noiseGen.fbm;

    // Initialize maps
    this.heightmap = Array(config.gridSize.height).fill(0).map(() => Array(config.gridSize.width).fill(0));
    this.islandMask = Array(config.gridSize.height).fill(0).map(() => Array(config.gridSize.width).fill(0));
    this.biomeMap = Array(config.gridSize.height).fill(0).map(() => Array(config.gridSize.width).fill('temperate' as IslandType));
  }

  /**
   * Generate complete archipelago
   */
  generateArchipelago(): ArchipelagoResult {
    const startTime = performance.now();

    devLog('🏝️ Generating archipelago with seed:', this.config.seed);

    // Step 1: Generate island specifications
    const islands = this.generateIslandSpecs();
    devLog('📍 Generated', islands.length, 'island specifications');

    // Step 2: Create heightmap using advanced noise blending
    this.generateHeightmap(islands);
    devLog('🗺️ Generated heightmap');

    // Step 3: Apply advanced smoothing and erosion
    this.applyAdvancedSmoothing();
    devLog('🌊 Applied coastline smoothing');

    // Step 4: Generate biome mapping
    this.generateBiomeMap(islands);
    devLog('🌿 Generated biome mapping');

    // Step 5: Create block placements with single-block precision
    const placements = this.generateBlockPlacements(islands);
    devLog('🏗️ Generated', placements.length, 'block placements');

    const endTime = performance.now();
    const generationTimeMs = endTime - startTime;

    // Calculate statistics
    const stats = this.calculateStats(islands, placements, generationTimeMs);

    return {
      islands,
      placements,
      stats,
      debugInfo: {
        heightmap: this.heightmap,
        islandMask: this.islandMask,
        biomeMap: this.biomeMap,
      }
    };
  }

  /**
   * Generate island specifications based on pattern
   */
  private generateIslandSpecs(): IslandSpec[] {
    const islands: IslandSpec[] = [];
    const { islandCount, minIslandRadius, maxIslandRadius, pattern, patternParams } = this.config;

    for (let i = 0; i < islandCount; i++) {
      const position = this.calculateIslandPosition(i, pattern, patternParams);
      const radius = this.rng.nextInt(minIslandRadius, maxIslandRadius);
      const islandType = this.selectIslandType(i, position);

      islands.push({
        id: `island_${i}`,
        center: position,
        baseRadius: radius,
        heightVariation: 0.3 + this.rng.next() * 0.4,
        type: islandType,
        noiseConfig: this.generateIslandNoiseConfig(islandType),
        blockPalette: this.config.biomeMapping[islandType] || this.config.defaultPalette,
        weight: 0.8 + this.rng.next() * 0.4
      });
    }

    // Ensure minimum distance between islands
    this.adjustIslandPositions(islands);

    return islands;
  }

  /**
   * Calculate island position based on pattern
   */
  private calculateIslandPosition(index: number, pattern: ArchipelagoPattern, params: any): { x: number; z: number } {
    const { width, height } = this.config.gridSize;
    const centerX = width / 2;
    const centerZ = height / 2;

    switch (pattern) {
      case 'circular': {
        const radius = params.radius || Math.min(width, height) * 0.3;
        const angle = (index / this.config.islandCount) * Math.PI * 2;
        const jitter = (this.rng.next() - 0.5) * radius * 0.2;
        return {
          x: centerX + Math.cos(angle) * (radius + jitter),
          z: centerZ + Math.sin(angle) * (radius + jitter)
        };
      }

      case 'linear': {
        const direction = params.direction || 0;
        const spacing = Math.min(width, height) / (this.config.islandCount + 1);
        const offset = (index - (this.config.islandCount - 1) / 2) * spacing;
        const jitter = (this.rng.next() - 0.5) * spacing * 0.3;
        return {
          x: centerX + Math.cos(direction) * (offset + jitter),
          z: centerZ + Math.sin(direction) * (offset + jitter)
        };
      }

      case 'spiral': {
        const tightness = params.spiralTightness || 0.5;
        const angle = index * tightness * Math.PI;
        const radius = (index / this.config.islandCount) * Math.min(width, height) * 0.4;
        return {
          x: centerX + Math.cos(angle) * radius,
          z: centerZ + Math.sin(angle) * radius
        };
      }

      case 'cluster': {
        const density = params.clusterDensity || 0.7;
        const clusterRadius = Math.min(width, height) * 0.25 * density;
        const angle = this.rng.next() * Math.PI * 2;
        const distance = Math.sqrt(this.rng.next()) * clusterRadius;
        return {
          x: centerX + Math.cos(angle) * distance,
          z: centerZ + Math.sin(angle) * distance
        };
      }

      case 'chain': {
        const progress = index / (this.config.islandCount - 1);
        const curve = Math.sin(progress * Math.PI * 2) * height * 0.2;
        return {
          x: progress * width * 0.8 + width * 0.1,
          z: centerZ + curve + (this.rng.next() - 0.5) * height * 0.1
        };
      }

      default: // random
        return {
          x: this.rng.next() * width * 0.8 + width * 0.1,
          z: this.rng.next() * height * 0.8 + height * 0.1
        };
    }
  }

  /**
   * Generate heightmap using advanced multi-island blending
   */
  private generateHeightmap(islands: IslandSpec[]): void {
    const { width, height } = this.config.gridSize;

    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        let totalHeight = 0;
        let totalWeight = 0;

        for (const island of islands) {
          const distance = Math.sqrt(
            (x - island.center.x) ** 2 + (z - island.center.z) ** 2
          );

          if (distance < island.baseRadius * 2) {
            const islandHeight = this.calculateIslandHeight(
              x, z, island, distance
            );

            const weight = this.calculateBlendWeight(distance, island.baseRadius, island.weight);

            totalHeight += islandHeight * weight;
            totalWeight += weight;
          }
        }

        if (totalWeight > 0) {
          this.heightmap[z][x] = totalHeight / totalWeight;
          this.islandMask[z][x] = Math.min(1, totalWeight);
        }
      }
    }
  }

  /**
   * Calculate height for a single island at given position
   */
  private calculateIslandHeight(x: number, z: number, island: IslandSpec, distance: number): number {
    const { baseRadius, heightVariation, noiseConfig } = island;

    // Base radial falloff
    const falloff = Math.max(0, 1 - (distance / baseRadius));

    // Advanced noise blending
    const baseNoise = this.fbmNoise.noise(
      x * 0.01, z * 0.01,
      {
        octaves: noiseConfig.octaves || 4,
        frequency: noiseConfig.baseFrequency || 1,
        amplitude: 1,
        lacunarity: noiseConfig.lacunarity || 2,
        gain: noiseConfig.gain || 0.5
      }
    );

    // Ridge noise for terrain features
    const ridgeNoise = Math.abs(this.fbmNoise.noise(
      x * 0.005, z * 0.005,
      {
        octaves: 2,
        frequency: noiseConfig.ridgeFrequency || 2,
        amplitude: 1,
        lacunarity: 2,
        gain: 0.5
      }
    ));

    // Erosion patterns
    const erosion = this.fbmNoise.noise(
      x * 0.02, z * 0.02,
      {
        octaves: 3,
        frequency: noiseConfig.erosionFrequency || 3,
        amplitude: 1,
        lacunarity: 2,
        gain: 0.4
      }
    ) * (noiseConfig.erosionStrength || 0.3);

    // Combine all noise sources
    const combinedNoise = baseNoise + ridgeNoise * 0.3 - Math.abs(erosion);

    // Apply falloff and height variation
    return falloff * (0.7 + combinedNoise * heightVariation);
  }

  /**
   * Calculate blending weight for multiple islands
   */
  private calculateBlendWeight(distance: number, radius: number, islandWeight: number): number {
    if (distance >= radius) return 0;

    const falloff = NoiseUtils.smoothstep(radius, 0, distance);
    return falloff * islandWeight * this.config.islandBlending;
  }

  /**
   * Apply advanced smoothing and erosion to coastlines
   */
  private applyAdvancedSmoothing(): void {
    const smoothingPasses = this.config.globalNoiseConfig.smoothingPasses || 3;
    const smoothness = this.config.coastlineSmoothing;

    for (let pass = 0; pass < smoothingPasses; pass++) {
      this.applySmoothingPass(smoothness * (1 - pass / smoothingPasses));
    }
  }

  /**
   * Apply single smoothing pass
   */
  private applySmoothingPass(strength: number): void {
    const { width, height } = this.config.gridSize;
    const newHeightmap = this.heightmap.map(row => [...row]);

    for (let z = 1; z < height - 1; z++) {
      for (let x = 1; x < width - 1; x++) {
        const neighbors = [
          this.heightmap[z-1][x-1], this.heightmap[z-1][x], this.heightmap[z-1][x+1],
          this.heightmap[z][x-1],   this.heightmap[z][x],   this.heightmap[z][x+1],
          this.heightmap[z+1][x-1], this.heightmap[z+1][x], this.heightmap[z+1][x+1]
        ];

        const average = neighbors.reduce((sum, val) => sum + val, 0) / neighbors.length;
        newHeightmap[z][x] = NoiseUtils.lerp(this.heightmap[z][x], average, strength);
      }
    }

    this.heightmap = newHeightmap;
  }

  /**
   * Generate biome mapping for islands
   */
  private generateBiomeMap(islands: IslandSpec[]): void {
    const { width, height } = this.config.gridSize;

    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        if (this.islandMask[z][x] > 0.1) {
          // Find closest island for biome assignment
          let closestIsland = islands[0];
          let closestDistance = Infinity;

          for (const island of islands) {
            const distance = Math.sqrt(
              (x - island.center.x) ** 2 + (z - island.center.z) ** 2
            );
            if (distance < closestDistance) {
              closestDistance = distance;
              closestIsland = island;
            }
          }

          this.biomeMap[z][x] = closestIsland.type;
        }
      }
    }
  }

  /**
   * Generate final block placements
   */
  private generateBlockPlacements(islands: IslandSpec[]): ArchipelagoResult['placements'] {
    const placements: ArchipelagoResult['placements'] = [];
    const { width, height } = this.config.gridSize;
    const { origin, yLevel } = this.config;

    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        const heightValue = this.heightmap[z][x];
        const maskValue = this.islandMask[z][x];

        if (maskValue > 0.3) { // Threshold for block placement
          const worldX = origin.x + x;
          const worldZ = origin.z + z;
          const worldY = yLevel;

          const biome = this.biomeMap[z][x];
          const blockType = this.selectBlockType(x, z, heightValue, biome);

          // Find closest island for metadata
          let closestIsland = islands[0];
          let closestDistance = Infinity;

          for (const island of islands) {
            const distance = Math.sqrt(
              (x - island.center.x) ** 2 + (z - island.center.z) ** 2
            );
            if (distance < closestDistance) {
              closestDistance = distance;
              closestIsland = island;
            }
          }

          placements.push({
            position: new Vector3(worldX, worldY, worldZ),
            blockType,
            islandId: closestIsland.id,
            distanceFromCenter: closestDistance,
            heightValue,
            biome
          });
        }
      }
    }

    return placements;
  }

  /**
   * Select appropriate block type based on position and biome
   */
  private selectBlockType(x: number, z: number, heightValue: number, biome: IslandType): BlockType {
    const palette = this.config.biomeMapping[biome] || this.config.defaultPalette;

    if (this.config.useGradientPlacement && palette.length > 1) {
      // Use different blocks based on height/distance from center
      const index = Math.floor(heightValue * palette.length);
      return palette[Math.min(index, palette.length - 1)];
    }

    // Random selection from palette
    return this.rng.pick(palette);
  }

  /**
   * Generate noise configuration for specific island type
   */
  private generateIslandNoiseConfig(type: IslandType): Partial<AdvancedNoiseConfig> {
    const base = this.config.globalNoiseConfig;

    switch (type) {
      case 'volcanic':
        return {
          ...base,
          ridgeFrequency: base.ridgeFrequency * 1.5,
          erosionStrength: base.erosionStrength * 0.7,
          octaves: base.octaves + 1
        };

      case 'tropical':
        return {
          ...base,
          baseFrequency: base.baseFrequency * 0.8,
          smoothingPasses: base.smoothingPasses + 1
        };

      case 'arctic':
        return {
          ...base,
          erosionStrength: base.erosionStrength * 0.3,
          smoothingPasses: base.smoothingPasses + 2
        };

      default:
        return base;
    }
  }

  /**
   * Select island type based on position and index
   */
  private selectIslandType(index: number, position: { x: number; z: number }): IslandType {
    const types: IslandType[] = ['tropical', 'temperate', 'volcanic', 'arctic', 'desert', 'mystical'];

    // Deterministic selection based on position and index
    const hash = ((position.x * 73856093) ^ (position.z * 19349663) ^ (index * 83492791)) >>> 0;
    return types[hash % types.length];
  }

  /**
   * Adjust island positions to maintain minimum distance
   */
  private adjustIslandPositions(islands: IslandSpec[]): void {
    const { minIslandDistance } = this.config;
    const maxIterations = 50;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let adjusted = false;

      for (let i = 0; i < islands.length; i++) {
        for (let j = i + 1; j < islands.length; j++) {
          const island1 = islands[i];
          const island2 = islands[j];

          const distance = Math.sqrt(
            (island1.center.x - island2.center.x) ** 2 +
            (island1.center.z - island2.center.z) ** 2
          );

          const requiredDistance = minIslandDistance + island1.baseRadius + island2.baseRadius;

          if (distance < requiredDistance) {
            const pushDistance = (requiredDistance - distance) / 2;
            const angle = Math.atan2(
              island2.center.z - island1.center.z,
              island2.center.x - island1.center.x
            );

            island1.center.x -= Math.cos(angle) * pushDistance;
            island1.center.z -= Math.sin(angle) * pushDistance;
            island2.center.x += Math.cos(angle) * pushDistance;
            island2.center.z += Math.sin(angle) * pushDistance;

            adjusted = true;
          }
        }
      }

      if (!adjusted) break;
    }
  }

  /**
   * Calculate generation statistics
   */
  private calculateStats(
    islands: IslandSpec[],
    placements: ArchipelagoResult['placements'],
    generationTimeMs: number
  ): ArchipelagoResult['stats'] {
    const islandSizes: Record<string, number> = {};
    const biomeDistribution: Record<IslandType, number> = {} as Record<IslandType, number>;

    placements.forEach(placement => {
      islandSizes[placement.islandId] = (islandSizes[placement.islandId] || 0) + 1;
      biomeDistribution[placement.biome] = (biomeDistribution[placement.biome] || 0) + 1;
    });

    const coverageArea = placements.length / (this.config.gridSize.width * this.config.gridSize.height);

    return {
      totalBlocks: placements.length,
      islandSizes,
      biomeDistribution,
      generationTimeMs,
      coverageArea
    };
  }

  /**
   * Validate and normalize configuration
   */
  private validateAndNormalizeConfig(config: ArchipelagoConfig): ArchipelagoConfig {
    // Apply defaults
    const normalized: ArchipelagoConfig = {
      ...config,
      globalNoiseConfig: {
        baseFrequency: 1.0,
        ridgeFrequency: 2.0,
        erosionFrequency: 3.0,
        octaves: 4,
        lacunarity: 2.0,
        gain: 0.5,
        ridgeOffset: 1.0,
        erosionStrength: 0.3,
        smoothingPasses: 3,
        ...config.globalNoiseConfig
      },
      coastlineSmoothing: config.coastlineSmoothing ?? 0.7,
      islandBlending: config.islandBlending ?? 0.8,
      useGradientPlacement: config.useGradientPlacement ?? true,
      enableSubIslands: config.enableSubIslands ?? false,
      enableTidalZones: config.enableTidalZones ?? false,
      enableBeaches: config.enableBeaches ?? true,
      waterLevel: config.waterLevel ?? -1
    };

    return normalized;
  }
}

/**
 * Create default archipelago configuration
 */
export function createDefaultArchipelagoConfig(
  seed: string | number = 'archipelago-' + Date.now()
): ArchipelagoConfig {
  return {
    seed,
    pattern: 'circular',
    gridSize: { width: 256, height: 256 },
    origin: { x: -128, z: -128 },
    yLevel: 0,

    islandCount: 5,
    minIslandRadius: 25,
    maxIslandRadius: 45,
    minIslandDistance: 20,

    patternParams: {
      radius: 80,
      spiralTightness: 0.5,
      clusterDensity: 0.7
    },

    globalNoiseConfig: {
      baseFrequency: 0.8,
      ridgeFrequency: 1.5,
      erosionFrequency: 2.0,
      octaves: 4,
      lacunarity: 2.0,
      gain: 0.5,
      ridgeOffset: 1.0,
      erosionStrength: 0.25,
      smoothingPasses: 4
    },

    coastlineSmoothing: 0.8,
    islandBlending: 0.9,

    defaultPalette: [BlockType.STONE, BlockType.WOOD, BlockType.LEAF],
    biomeMapping: {
      tropical: [BlockType.LEAF, BlockType.WOOD, BlockType.STONE],
      temperate: [BlockType.WOOD, BlockType.STONE, BlockType.LEAF],
      volcanic: [BlockType.STONE, BlockType.NUMBER_4, BlockType.NUMBER_6],
      arctic: [BlockType.FROSTED_GLASS, BlockType.STONE, BlockType.WOOD],
      desert: [BlockType.NUMBER_5, BlockType.STONE, BlockType.WOOD],
      mystical: [BlockType.NUMBER_7, BlockType.FROSTED_GLASS, BlockType.NUMBER_6]
    },

    useGradientPlacement: true,
    enableSubIslands: false,
    enableTidalZones: false,
    enableBeaches: true,
    waterLevel: -1
  };
}

/**
 * Generate archipelago with default settings
 */
export function generateArchipelago(config?: Partial<ArchipelagoConfig>): ArchipelagoResult {
  const fullConfig = { ...createDefaultArchipelagoConfig(), ...config };
  const generator = new ArchipelagoGenerator(fullConfig);
  return generator.generateArchipelago();
}
