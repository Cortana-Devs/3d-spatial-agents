/**
 * Island Generator - Main Implementation
 *
 * Procedural generation of organic islands with region-based floor placement.
 * Generates deterministic, seedable islands matching the reference diagram:
 * - Blue "All" clusters (north-west region)
 * - Orange "Unique" chain diagonally (south-west → east)
 * - White "Pure" arc (eastern rim)
 */

import {
  IslandGenConfig,
  IslandGenResult,
  TilePlacement,
  RegionSeed,
  RegionRule,
  FloorId,
  IslandDebugInfo,
  ConfigValidationResult,
  IslandGenError,
  IslandGenErrorInfo,
  ConnectivityInfo,
  GenerationStats,
  IslandLocalPos,
  WorldPos
} from './types';
import { createDeterministicRNG, RNG } from '../rng/DeterministicRNG';
import { createNoiseGenerator, FBMNoise, NoiseUtils } from '../noise/NoiseGenerator';
import { BlockType } from '../../../types/blocks';

/**
 * Main Island Generator class
 */
export class IslandGenerator {
  private rng: RNG;
  private fbmNoise: FBMNoise;
  private config: IslandGenConfig;

  constructor(config: IslandGenConfig) {
    this.config = this.validateAndNormalizeConfig(config);
    this.rng = createDeterministicRNG(config.seed, config.islandId);
    const noiseGen = createNoiseGenerator(this.rng.clone());
    this.fbmNoise = noiseGen.fbm;
  }

  /**
   * Generate a complete island
   */
  generateIsland(): IslandGenResult {
    const startTime = performance.now();

    try {
      // 1. Generate island mask
      const mask = this.buildIslandMask();

      // 2. Generate region seeds
      const seeds = this.generateRegionSeeds();

      // 3. Apply Lloyd relaxation
      if (this.config.layout.relaxIterations > 0) {
        this.relaxSeeds(seeds, mask);
      }

      // 4. Assign regions via Voronoi
      const regionIdByTile = this.assignRegionsVoronoi(mask, seeds);

      // 5. Ensure region connectivity
      this.ensureRegionConnectivity(regionIdByTile, seeds, mask);

      // 6. Generate tile placements
      const placements = this.generateTilePlacements(mask, regionIdByTile, seeds);

      const generationTime = performance.now() - startTime;

      // 7. Prepare result
      const result: IslandGenResult = {
        placements,
        regions: seeds.map(s => ({ id: s.id, rule: s.rule })),
        debug: this.config.debug?.emitOverlay ? {
          seeds,
          mask,
          regionIdByTile
        } : undefined
      };

      return result;
    } catch (error) {
      throw new Error(`Island generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate and normalize configuration
   */
  private validateAndNormalizeConfig(config: IslandGenConfig): IslandGenConfig {
    const validation = this.validateConfig(config);
    if (!validation.isValid) {
      throw new Error(`Invalid configuration: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Apply defaults and normalization
    const normalized = { ...config };

    // Ensure palette has safe fallbacks
    if (!normalized.palette.safeFallback || normalized.palette.safeFallback.length === 0) {
      normalized.palette.safeFallback = [BlockType.STONE, BlockType.WOOD];
    }

    // Ensure weights are positive
    normalized.palette.all.forEach(item => {
      if (!item.weight || item.weight <= 0) {
        item.weight = 1;
      }
    });

    return normalized;
  }

  /**
   * Validate island generation configuration
   */
  private validateConfig(config: IslandGenConfig): ConfigValidationResult {
    const errors: IslandGenErrorInfo[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!config.seed) {
      errors.push({
        type: IslandGenError.INVALID_CONFIG,
        message: 'Seed is required'
      });
    }

    if (!config.islandId) {
      errors.push({
        type: IslandGenError.INVALID_CONFIG,
        message: 'Island ID is required'
      });
    }

    // Validate mask config
    if (config.mask.radius <= 0) {
      errors.push({
        type: IslandGenError.INVALID_CONFIG,
        message: 'Island radius must be positive'
      });
    }

    if (config.mask.fbmOctaves < 1 || config.mask.fbmOctaves > 8) {
      warnings.push('FBM octaves should be between 1 and 8 for optimal performance');
    }

    // Validate grid config
    if (config.grid.size.width <= 0 || config.grid.size.height <= 0) {
      errors.push({
        type: IslandGenError.INVALID_CONFIG,
        message: 'Grid size must be positive'
      });
    }

    // Validate palette
    if (!config.palette.all || config.palette.all.length === 0) {
      errors.push({
        type: IslandGenError.INVALID_CONFIG,
        message: 'Palette must have at least one floor type in "all" category'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Build island mask using radial falloff and FBM noise
   */
  private buildIslandMask(): number[][] {
    const { width, height } = this.config.grid.size;
    const { radius, noiseFrequency, noiseAmplitude, fbmOctaves, shoreSoftness } = this.config.mask;

    const mask: number[][] = Array(height).fill(0).map(() => Array(width).fill(0));

    const centerX = width * 0.5;
    const centerY = height * 0.5;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Base circular mask
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        let maskValue = Math.max(0, Math.min(1, 1 - distance / radius));

        if (maskValue > 0) {
          // Add FBM noise to coastline
          const noiseValue = this.fbmNoise.noise(
            x * noiseFrequency / width,
            y * noiseFrequency / height,
            {
              octaves: fbmOctaves,
              frequency: 1,
              amplitude: noiseAmplitude,
              lacunarity: 2.0,
              gain: 0.5
            }
          );

          // Apply noise to mask boundary
          maskValue = NoiseUtils.smoothstep(0, shoreSoftness, maskValue - noiseValue);
        }

        mask[y][x] = maskValue;
      }
    }

    return mask;
  }

  /**
   * Generate region seeds according to reference diagram
   */
  private generateRegionSeeds(): RegionSeed[] {
    const seeds: RegionSeed[] = [];
    const { width, height } = this.config.grid.size;

    // Convert normalized coordinates to grid coordinates
    const toGrid = (normalizedPos: IslandLocalPos): { x: number; y: number } => ({
      x: (normalizedPos.x * 0.5 + 0.5) * width,
      y: (normalizedPos.y * 0.5 + 0.5) * height
    });

    // Generate All seeds (NW cluster)
    const allSeeds = this.generateAllSeeds(toGrid);
    seeds.push(...allSeeds);

    // Generate Unique seeds (SW → E diagonal)
    const uniqueSeeds = this.generateUniqueSeeds(toGrid);
    seeds.push(...uniqueSeeds);

    // Generate Pure seeds (Eastern arc)
    const pureSeeds = this.generatePureSeeds(toGrid);
    seeds.push(...pureSeeds);

    return seeds;
  }

  /**
   * Generate "All" region seeds in northwest cluster
   */
  private generateAllSeeds(toGrid: (pos: IslandLocalPos) => { x: number; y: number }): RegionSeed[] {
    const seeds: RegionSeed[] = [];
    const count = this.config.layout.allCount;

    // Cluster center in NW quadrant
    const clusterCenter: IslandLocalPos = { x: -0.55, y: 0.55 };
    const clusterRadius = 0.2;

    for (let i = 0; i < count; i++) {
      // Generate position within cluster
      const angle = this.rng.next() * 2 * Math.PI;
      const distance = Math.sqrt(this.rng.next()) * clusterRadius; // Sqrt for uniform distribution

      const localPos: IslandLocalPos = {
        x: clusterCenter.x + Math.cos(angle) * distance,
        y: clusterCenter.y + Math.sin(angle) * distance
      };

      // Add small jitter
      localPos.x += (this.rng.next() - 0.5) * 0.1;
      localPos.y += (this.rng.next() - 0.5) * 0.1;

      const gridPos = toGrid(localPos);

      seeds.push({
        id: `all_${i}`,
        rule: 'ALL',
        pos: gridPos
      });
    }

    return seeds;
  }

  /**
   * Generate "Unique" region seeds along SW to E diagonal
   */
  private generateUniqueSeeds(toGrid: (pos: IslandLocalPos) => { x: number; y: number }): RegionSeed[] {
    const seeds: RegionSeed[] = [];
    const count = this.config.layout.uniqueCount;

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1); // 0 to 1 along diagonal

      // Diagonal curve from SW to E
      const localPos: IslandLocalPos = {
        x: NoiseUtils.lerp(-0.6, 0.6, t),
        y: NoiseUtils.lerp(-0.7, -0.1, t)
      };

      // Add jitter
      localPos.x += (this.rng.next() - 0.5) * 0.1;
      localPos.y += (this.rng.next() - 0.5) * 0.1;

      const gridPos = toGrid(localPos);

      seeds.push({
        id: `unique_${i}`,
        rule: 'UNIQUE',
        pos: gridPos
      });
    }

    return seeds;
  }

  /**
   * Generate "Pure" region seeds along eastern arc
   */
  private generatePureSeeds(toGrid: (pos: IslandLocalPos) => { x: number; y: number }): RegionSeed[] {
    const seeds: RegionSeed[] = [];
    const count = this.config.layout.pureCount;

    const arcCenter: IslandLocalPos = { x: 0.6, y: 0.2 };
    const arcRadius = 0.35;
    const startAngle = -Math.PI / 4; // -45 degrees
    const endAngle = Math.PI / 2;    // 90 degrees

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const angle = NoiseUtils.lerp(startAngle, endAngle, t);

      const localPos: IslandLocalPos = {
        x: arcCenter.x + Math.cos(angle) * arcRadius,
        y: arcCenter.y + Math.sin(angle) * arcRadius
      };

      // Add small jitter
      localPos.x += (this.rng.next() - 0.5) * 0.05;
      localPos.y += (this.rng.next() - 0.5) * 0.05;

      const gridPos = toGrid(localPos);

      seeds.push({
        id: `pure_${i}`,
        rule: 'PURE',
        pos: gridPos
      });
    }

    return seeds;
  }

  /**
   * Apply Lloyd relaxation to seeds
   */
  private relaxSeeds(seeds: RegionSeed[], mask: number[][]): void {
    const { width, height } = this.config.grid.size;
    const iterations = this.config.layout.relaxIterations;

    for (let iter = 0; iter < iterations; iter++) {
      // Calculate centroids for each region
      const centroids = new Map<string, { x: number; y: number; count: number }>();

      // Initialize centroids
      seeds.forEach(seed => {
        centroids.set(seed.id, { x: 0, y: 0, count: 0 });
      });

      // Calculate centroids based on assigned tiles
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (mask[y][x] <= 0.5) continue;

          // Find nearest seed
          let nearestSeed = seeds[0];
          let nearestDistance = Infinity;

          for (const seed of seeds) {
            const distance = Math.sqrt(
              (x - seed.pos.x) ** 2 + (y - seed.pos.y) ** 2
            );
            if (distance < nearestDistance) {
              nearestDistance = distance;
              nearestSeed = seed;
            }
          }

          // Add to centroid calculation
          const centroid = centroids.get(nearestSeed.id)!;
          centroid.x += x;
          centroid.y += y;
          centroid.count++;
        }
      }

      // Update seed positions toward centroids
      seeds.forEach(seed => {
        const centroid = centroids.get(seed.id)!;
        if (centroid.count > 0) {
          const newX = centroid.x / centroid.count;
          const newY = centroid.y / centroid.count;

          // Move seed toward centroid (damped)
          const dampening = 0.5;
          seed.pos.x += (newX - seed.pos.x) * dampening;
          seed.pos.y += (newY - seed.pos.y) * dampening;

          // Clamp to grid bounds
          seed.pos.x = NoiseUtils.clamp(seed.pos.x, 0, width - 1);
          seed.pos.y = NoiseUtils.clamp(seed.pos.y, 0, height - 1);
        }
      });
    }
  }

  /**
   * Assign regions using Voronoi diagram
   */
  private assignRegionsVoronoi(mask: number[][], seeds: RegionSeed[]): string[][] {
    const { width, height } = this.config.grid.size;
    const regionIdByTile: string[][] = Array(height).fill(null).map(() => Array(width).fill(''));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y][x] <= 0.5) continue;

        let nearestSeed = seeds[0];
        let nearestDistance = Infinity;

        // Find nearest seed
        for (const seed of seeds) {
          const distance = Math.sqrt(
            (x - seed.pos.x) ** 2 + (y - seed.pos.y) ** 2
          );

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestSeed = seed;
          } else if (distance === nearestDistance) {
            // Tie-breaking with rule priority: PURE > UNIQUE > ALL
            const priorities = { 'PURE': 3, 'UNIQUE': 2, 'ALL': 1 };
            if (priorities[seed.rule] > priorities[nearestSeed.rule]) {
              nearestSeed = seed;
            }
          }
        }

        regionIdByTile[y][x] = nearestSeed.id;
      }
    }

    return regionIdByTile;
  }

  /**
   * Ensure each region is contiguous
   */
  private ensureRegionConnectivity(
    regionIdByTile: string[][],
    seeds: RegionSeed[],
    mask: number[][]
  ): void {
    const { width, height } = this.config.grid.size;

    for (const seed of seeds) {
      const components = this.findConnectedComponents(regionIdByTile, seed.id, mask);

      if (components.length > 1) {
        // Keep largest component, reassign others to nearest neighbor
        const largestComponent = components.reduce((largest, current) =>
          current.length > largest.length ? current : largest
        );

        for (const component of components) {
          if (component === largestComponent) continue;

          // Reassign tiles in small components
          for (const tile of component) {
            const nearestNeighborId = this.findNearestRegionNeighbor(
              tile.x, tile.y, regionIdByTile, seed.id
            );
            if (nearestNeighborId) {
              regionIdByTile[tile.y][tile.x] = nearestNeighborId;
            }
          }
        }
      }
    }
  }

  /**
   * Find connected components for a region
   */
  private findConnectedComponents(
    regionIdByTile: string[][],
    regionId: string,
    mask: number[][]
  ): { x: number; y: number }[][] {
    const { width, height } = this.config.grid.size;
    const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
    const components: { x: number; y: number }[][] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!visited[y][x] && regionIdByTile[y][x] === regionId && mask[y][x] > 0.5) {
          const component = this.floodFill(x, y, regionIdByTile, regionId, visited, mask);
          if (component.length > 0) {
            components.push(component);
          }
        }
      }
    }

    return components;
  }

  /**
   * Flood fill algorithm for connected component detection
   */
  private floodFill(
    startX: number,
    startY: number,
    regionIdByTile: string[][],
    regionId: string,
    visited: boolean[][],
    mask: number[][]
  ): { x: number; y: number }[] {
    const { width, height } = this.config.grid.size;
    const stack = [{ x: startX, y: startY }];
    const component: { x: number; y: number }[] = [];

    while (stack.length > 0) {
      const { x, y } = stack.pop()!;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited[y][x]) continue;
      if (regionIdByTile[y][x] !== regionId || mask[y][x] <= 0.5) continue;

      visited[y][x] = true;
      component.push({ x, y });

      // Add neighbors
      stack.push(
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 }
      );
    }

    return component;
  }

  /**
   * Find nearest region neighbor for reassignment
   */
  private findNearestRegionNeighbor(
    x: number,
    y: number,
    regionIdByTile: string[][],
    excludeId: string
  ): string | null {
    const { width, height } = this.config.grid.size;
    const searchRadius = 5;

    for (let radius = 1; radius <= searchRadius; radius++) {
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const neighborId = regionIdByTile[ny][nx];
            if (neighborId && neighborId !== excludeId) {
              return neighborId;
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Generate tile placements based on regions and rules
   */
  private generateTilePlacements(
    mask: number[][],
    regionIdByTile: string[][],
    seeds: RegionSeed[]
  ): TilePlacement[] {
    const { width, height } = this.config.grid.size;
    const placements: TilePlacement[] = [];

    // Create seed lookup
    const seedMap = new Map(seeds.map(s => [s.id, s]));

    // Track per-region state for placement rules
    const pureRegionChoices = new Map<string, FloorId>();
    const uniqueRegionUsage = new Map<string, Map<FloorId, { x: number; y: number }[]>>();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y][x] <= 0.5) continue;

        const regionId = regionIdByTile[y][x];
        if (!regionId) continue;

        const seed = seedMap.get(regionId);
        if (!seed) continue;

        const worldPos: WorldPos = {
          x: this.config.grid.origin.x + x,
          y: this.config.grid.yLevel,
          z: this.config.grid.origin.z + y
        };

        let floorId: FloorId;

        switch (seed.rule) {
          case 'ALL':
            floorId = this.pickAllFloor();
            break;

          case 'PURE':
            if (!pureRegionChoices.has(regionId)) {
              pureRegionChoices.set(regionId, this.pickPureFloor());
            }
            floorId = pureRegionChoices.get(regionId)!;
            break;

          case 'UNIQUE':
            floorId = this.pickUniqueFloor(regionId, x, y, uniqueRegionUsage);
            break;

          default:
            floorId = this.config.palette.safeFallback[0];
        }

        placements.push({
          x: worldPos.x,
          y: worldPos.y,
          z: worldPos.z,
          floorId,
          regionId,
          rule: seed.rule
        });
      }
    }

    return placements;
  }

  /**
   * Pick floor for "All" region (weighted selection)
   */
  private pickAllFloor(): FloorId {
    const palette = this.config.palette.all;
    const ids = palette.map(p => p.id);
    const weights = palette.map(p => p.weight || 1);
    return this.rng.pick(ids, weights);
  }

  /**
   * Pick floor for "Pure" region (single choice per region)
   */
  private pickPureFloor(): FloorId {
    // Bias toward "clean" floors for pure regions
    const allFloors = this.config.palette.all;
    const cleanFloors = allFloors.filter(f =>
      f.id === BlockType.STONE ||
      f.id === BlockType.WOOD ||
      f.id === BlockType.FROSTED_GLASS
    );

    const candidates = cleanFloors.length > 0 ? cleanFloors : allFloors;
    const ids = candidates.map(p => p.id);
    const weights = candidates.map(p => p.weight || 1);

    return this.rng.pick(ids, weights);
  }

  /**
   * Pick floor for "Unique" region (no repeats, distance constraints)
   */
  private pickUniqueFloor(
    regionId: string,
    x: number,
    y: number,
    uniqueRegionUsage: Map<string, Map<FloorId, { x: number; y: number }[]>>
  ): FloorId {
    if (!uniqueRegionUsage.has(regionId)) {
      uniqueRegionUsage.set(regionId, new Map());
    }

    const regionUsage = uniqueRegionUsage.get(regionId)!;
    const minDistance = this.config.layout.uniqueNoRepeatDistance;

    // Try exotic floors first
    const exoticFloors = this.config.palette.exotic.map(e => e.id);
    for (const floorId of exoticFloors) {
      if (this.canPlaceUniqueFloor(floorId, x, y, regionUsage, minDistance)) {
        this.recordUniqueFloorUsage(floorId, x, y, regionUsage);
        return floorId;
      }
    }

    // Fall back to safe fallback floors
    for (const floorId of this.config.palette.safeFallback) {
      if (this.canPlaceUniqueFloor(floorId, x, y, regionUsage, minDistance)) {
        this.recordUniqueFloorUsage(floorId, x, y, regionUsage);
        return floorId;
      }
    }

    // Ultimate fallback - use first safe floor
    const fallbackId = this.config.palette.safeFallback[0];
    this.recordUniqueFloorUsage(fallbackId, x, y, regionUsage);
    return fallbackId;
  }

  /**
   * Check if unique floor can be placed at position
   */
  private canPlaceUniqueFloor(
    floorId: FloorId,
    x: number,
    y: number,
    regionUsage: Map<FloorId, { x: number; y: number }[]>,
    minDistance: number
  ): boolean {
    const usageList = regionUsage.get(floorId);
    if (!usageList) return true;

    for (const usage of usageList) {
      const distance = Math.sqrt((x - usage.x) ** 2 + (y - usage.y) ** 2);
      if (distance < minDistance) {
        return false;
      }
    }

    return true;
  }

  /**
   * Record unique floor usage for distance tracking
   */
  private recordUniqueFloorUsage(
    floorId: FloorId,
    x: number,
    y: number,
    regionUsage: Map<FloorId, { x: number; y: number }[]>
  ): void {
    if (!regionUsage.has(floorId)) {
      regionUsage.set(floorId, []);
    }
    regionUsage.get(floorId)!.push({ x, y });
  }
}

/**
 * Main island generation function
 */
export function generateIsland(config: IslandGenConfig): IslandGenResult {
  const generator = new IslandGenerator(config);
  return generator.generateIsland();
}

/**
 * Generate island and commit to world store (streaming)
 */
export async function generateIslandAndCommit(
  config: IslandGenConfig,
  addBlockFn: (x: number, y: number, z: number, type: BlockType) => boolean,
  onProgress?: (progress: number) => void
): Promise<void> {
  const result = generateIsland(config);
  const chunkSize = config.grid.chunkSize;
  const totalPlacements = result.placements.length;
  let processed = 0;

  // Process placements in chunks to avoid blocking
  for (let i = 0; i < result.placements.length; i += chunkSize) {
    const chunk = result.placements.slice(i, i + chunkSize);

    // Process chunk
    for (const placement of chunk) {
      addBlockFn(placement.x, placement.y, placement.z, placement.floorId);
      processed++;
    }

    // Report progress
    if (onProgress) {
      onProgress(processed / totalPlacements);
    }

    // Yield control to avoid blocking
    if (i + chunkSize < result.placements.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}

/**
 * Create default island generation config
 */
export function createDefaultIslandConfig(
  seed: string | number = 'default',
  islandId: string = 'island-1'
): IslandGenConfig {
  return {
    seed,
    islandId,
    mask: {
      radius: 58,
      noiseFrequency: 0.8,
      noiseAmplitude: 0.18,
      fbmOctaves: 3,
      shoreSoftness: 0.35,
    },
    layout: {
      allCount: 3,
      pureCount: 6,
      uniqueCount: 6,
      uniqueNoRepeatDistance: 5,
      relaxIterations: 1,
    },
    palette: {
      all: [
        { id: BlockType.STONE, weight: 3 },
        { id: BlockType.WOOD, weight: 2 },
        { id: BlockType.FROSTED_GLASS, weight: 1 },
        { id: BlockType.LEAF, weight: 1 },
      ],
      exotic: [
        { id: BlockType.NUMBER_4, rarity: 5 },
        { id: BlockType.NUMBER_5, rarity: 4 },
        { id: BlockType.NUMBER_6, rarity: 3 },
        { id: BlockType.NUMBER_7, rarity: 2 },
      ],
      safeFallback: [BlockType.STONE, BlockType.WOOD, BlockType.FROSTED_GLASS],
    },
    grid: {
      size: { width: 128, height: 128 },
      origin: { x: 0, z: 0 },
      yLevel: 0,
      chunkSize: 64,
    },
    debug: {
      emitOverlay: false,
      labelRegions: false,
    },
  };
}
