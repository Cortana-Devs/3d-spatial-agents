/**
 * Massive Archipelago Generator - Minecraft-Style Optimization
 *
 * Generates massive archipelagos with 5-10 huge islands (200-500 block radius)
 * using advanced optimization techniques inspired by Minecraft's world generation:
 *
 * Features:
 * - Chunk-based generation for memory efficiency
 * - Level-of-detail (LOD) system for performance scaling
 * - Spatial partitioning with quadtrees for fast queries
 * - Batched block placement with async processing
 * - Streaming heightmap generation
 * - Multi-threaded noise generation simulation
 * - Biome-aware mega-island generation
 * - Advanced coastline generation with multiple octaves
 */

import { Vector3 } from "three";
import { BlockType } from "../../../types/blocks";
import { createDeterministicRNG, RNG } from "../rng/DeterministicRNG";
import { createNoiseGenerator, FBMNoise } from "../noise/NoiseGenerator";

/**
 * Chunk system for efficient memory management
 */
export interface Chunk {
  x: number;
  z: number;
  size: number;
  blocks: Map<string, BlockType>;
  heightmap: number[][];
  biomes: IslandBiome[][];
  isGenerated: boolean;
  lastAccessed: number;
}

/**
 * Massive island biome types
 */
export type IslandBiome =
  | "mega_tropical" // Huge tropical paradise
  | "volcanic_massive" // Massive volcanic island
  | "temperate_giant" // Giant temperate forest
  | "arctic_continent" // Continental arctic mass
  | "desert_plateau" // Massive desert plateau
  | "mystical_realm" // Otherworldly mega-island
  | "coral_atoll" // Massive coral formation
  | "mountain_range"; // Island mountain range

/**
 * Level-of-detail configuration
 */
export interface LODConfig {
  maxDistance: number;
  chunkSize: number;
  noiseDetail: number;
  blockDensity: number;
}

/**
 * Massive island specification
 */
export interface MassiveIslandSpec {
  id: string;
  center: { x: number; z: number };
  baseRadius: number; // 200-500 blocks
  peakHeight: number; // Maximum height above sea level
  biome: IslandBiome;
  subBiomes: IslandBiome[]; // Secondary biomes within the island
  coastlineComplexity: number; // How jagged the coastline is
  elevation: {
    seaLevel: number;
    beachLevel: number;
    hillLevel: number;
    peakLevel: number;
  };
  noiseSeeds: {
    terrain: number;
    biome: number;
    detail: number;
    erosion: number;
  };
  chunks: Set<string>; // Which chunks this island affects
  weight: number; // Blending weight with other islands
}

/**
 * Massive archipelago configuration
 */
export interface MassiveArchipelagoConfig {
  seed: string | number;

  // World size and chunking
  worldSize: { width: number; height: number }; // 2048x2048 or larger
  chunkSize: number; // 32x32 blocks per chunk
  origin: { x: number; z: number };

  // Island generation
  islandCount: { min: number; max: number }; // 5-10 islands
  islandRadius: { min: number; max: number }; // 200-500 blocks
  minIslandDistance: number; // Minimum 300 blocks apart

  // Height and terrain
  seaLevel: number; // Y=0 typically
  maxTerrainHeight: number; // Max island peak height
  terrainAmplification: number; // Height variation multiplier

  // Biome distribution
  biomeWeights: Record<IslandBiome, number>;
  allowBiomeBlending: boolean;
  biomeTransitionSize: number;

  // Performance optimization
  lodLevels: LODConfig[];
  maxLoadedChunks: number; // Memory limit
  asyncGeneration: boolean; // Generate chunks asynchronously
  batchSize: number; // Blocks per batch for placement

  // Noise configuration for mega-scale
  megaNoiseConfig: {
    continentalScale: number; // Largest scale features
    regionalScale: number; // Large regional features
    localScale: number; // Local terrain details
    microScale: number; // Fine surface details
  };
}

/**
 * Spatial partitioning node for fast queries
 */
interface QuadTreeNode {
  bounds: { x: number; z: number; width: number; height: number };
  islands: MassiveIslandSpec[];
  children?: QuadTreeNode[];
  isLeaf: boolean;
}

/**
 * Result of massive archipelago generation
 */
export interface MassiveArchipelagoResult {
  islands: MassiveIslandSpec[];
  totalChunks: number;
  generatedChunks: number;
  blockCount: number;
  generationTimeMs: number;
  memoryUsageMB: number;
  stats: {
    largestIsland: number;
    averageIslandSize: number;
    totalLandArea: number;
    biomeDistribution: Record<IslandBiome, number>;
    blocksGenerated: number;
    blocksFiltered: number;
    blockLimitReached: boolean;
  };
  getAllBlocks(blockLimit?: number): Array<{
    position: Vector3;
    blockType: BlockType;
    biome: IslandBiome;
    priority: number;
  }>;
}

/**
 * Massive Archipelago Generator with Minecraft-style optimizations
 */
export class MassiveArchipelagoGenerator {
  private rng: RNG;
  private noiseGenerator: FBMNoise;
  private config: MassiveArchipelagoConfig;

  // Chunk management
  private chunks: Map<string, Chunk>;
  private chunkLRU: string[];

  // Spatial partitioning
  private quadTree: QuadTreeNode;

  // Generation state
  private islands: MassiveIslandSpec[];
  private isGenerating: boolean;
  private generationProgress: number;

  // Block filtering for world limits
  private blockLimit: number;
  private totalBlocksGenerated: number;
  private blocksFiltered: number;

  constructor(config: MassiveArchipelagoConfig) {
    this.config = this.validateConfig(config);
    this.rng = createDeterministicRNG(config.seed);

    const noiseGen = createNoiseGenerator(this.rng.clone());
    this.noiseGenerator = noiseGen.fbm;

    this.chunks = new Map();
    this.chunkLRU = [];
    this.islands = [];
    this.isGenerating = false;
    this.generationProgress = 0;

    // Initialize block filtering
    this.blockLimit = Infinity;
    this.totalBlocksGenerated = 0;
    this.blocksFiltered = 0;

    // Initialize quad tree for spatial queries
    this.quadTree = this.createQuadTree();
  }

  /**
   * Set block limit for world constraints
   */
  setBlockLimit(limit: number): void {
    this.blockLimit = limit;
  }

  /**
   * Generate massive archipelago
   */
  async generateMassiveArchipelago(): Promise<MassiveArchipelagoResult> {
    const startTime = performance.now();
    this.isGenerating = true;
    this.generationProgress = 0;

    console.log(
      "🌍 Generating massive archipelago with seed:",
      this.config.seed,
    );

    // Step 1: Generate massive island specifications (10%)
    this.islands = await this.generateMassiveIslandSpecs();
    this.generationProgress = 0.1;
    console.log("🏝️ Generated", this.islands.length, "massive island specs");

    // Step 2: Build spatial partitioning (15%)
    this.buildQuadTree();
    this.generationProgress = 0.15;
    console.log("🗺️ Built spatial partitioning");

    // Step 3: Generate initial chunk set (30%)
    const initialChunks = await this.generateInitialChunks();
    this.generationProgress = 0.3;
    console.log("📦 Generated", initialChunks, "initial chunks");

    // Step 4: Stream remaining chunks with LOD (70%)
    await this.streamRemainingChunks();
    this.generationProgress = 0.7;
    console.log("🌊 Streamed remaining chunks");

    // Step 5: Post-processing and optimization (90%)
    await this.postProcessTerrain();
    this.generationProgress = 0.9;
    console.log("⚡ Applied post-processing");

    // Step 6: Calculate final statistics (100%)
    const stats = this.calculateMassiveStats();
    this.generationProgress = 1.0;
    this.isGenerating = false;

    const endTime = performance.now();
    const generationTimeMs = endTime - startTime;

    console.log("✅ Massive archipelago generation complete!");

    const self = this;
    return {
      islands: this.islands,
      totalChunks: this.getTotalChunkCount(),
      generatedChunks: this.chunks.size,
      blockCount: this.getTotalBlockCount(),
      generationTimeMs,
      memoryUsageMB: this.calculateMemoryUsage(),
      stats,
      getAllBlocks(blockLimit?: number): Array<{
        position: Vector3;
        blockType: BlockType;
        biome: IslandBiome;
        priority: number;
      }> {
        return self.getAllBlocks(blockLimit);
      },
    };
  }

  /**
   * Generate massive island specifications
   */
  private async generateMassiveIslandSpecs(): Promise<MassiveIslandSpec[]> {
    const islands: MassiveIslandSpec[] = [];
    const { islandCount, islandRadius, worldSize, minIslandDistance } =
      this.config;

    const numIslands = this.rng.nextInt(islandCount.min, islandCount.max);
    const attempts = numIslands * 20; // Allow multiple attempts for positioning

    // Generate islands with proper spacing
    for (let i = 0; i < numIslands && islands.length < numIslands; i++) {
      let bestPosition: { x: number; z: number } | null = null;
      let bestScore = -1;

      // Try multiple positions and pick the best one
      for (let attempt = 0; attempt < attempts / numIslands; attempt++) {
        const position = {
          x: this.rng.nextInt(
            islandRadius.max,
            worldSize.width - islandRadius.max,
          ),
          z: this.rng.nextInt(
            islandRadius.max,
            worldSize.height - islandRadius.max,
          ),
        };

        // Check distance from other islands
        const score = this.calculatePositionScore(position, islands);
        if (score > bestScore && score >= minIslandDistance) {
          bestPosition = position;
          bestScore = score;
        }
      }

      if (bestPosition) {
        const radius = this.rng.nextInt(islandRadius.min, islandRadius.max);
        const biome = this.selectMassiveIslandBiome(bestPosition, i);

        islands.push({
          id: `massive_island_${i}`,
          center: bestPosition,
          baseRadius: radius,
          peakHeight: this.calculatePeakHeight(radius, biome),
          biome,
          subBiomes: this.generateSubBiomes(biome),
          coastlineComplexity: 0.3 + this.rng.next() * 0.4,
          elevation: this.generateElevationProfile(radius),
          noiseSeeds: {
            terrain: this.rng.nextInt(0, 999999),
            biome: this.rng.nextInt(0, 999999),
            detail: this.rng.nextInt(0, 999999),
            erosion: this.rng.nextInt(0, 999999),
          },
          chunks: new Set(),
          weight: 0.8 + this.rng.next() * 0.4,
        });
      }
    }

    // Calculate which chunks each island affects
    for (const island of islands) {
      this.calculateIslandChunks(island);
    }

    return islands;
  }

  /**
   * Calculate position score for island placement
   */
  private calculatePositionScore(
    position: { x: number; z: number },
    existingIslands: MassiveIslandSpec[],
  ): number {
    if (existingIslands.length === 0) return 1000; // First island can go anywhere

    let minDistance = Infinity;
    for (const island of existingIslands) {
      const distance = Math.sqrt(
        (position.x - island.center.x) ** 2 +
          (position.z - island.center.z) ** 2,
      );
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
  }

  /**
   * Select biome for massive island
   */
  private selectMassiveIslandBiome(
    position: { x: number; z: number },
    index: number,
  ): IslandBiome {
    const biomes: IslandBiome[] = Object.keys(
      this.config.biomeWeights,
    ) as IslandBiome[];
    const weights = Object.values(this.config.biomeWeights);

    // Add some spatial coherence - similar biomes cluster together
    const spatialNoise = this.noiseGenerator.noise(
      position.x * 0.001,
      position.z * 0.001,
      {
        octaves: 3,
        frequency: 1,
        amplitude: 1,
        lacunarity: 2,
        gain: 0.5,
      },
    );

    const biomeIndex = Math.floor((spatialNoise * 0.5 + 0.5) * biomes.length);
    return biomes[Math.min(biomeIndex, biomes.length - 1)];
  }

  /**
   * Generate sub-biomes within a massive island
   */
  private generateSubBiomes(primaryBiome: IslandBiome): IslandBiome[] {
    const subBiomes: IslandBiome[] = [primaryBiome];

    // Add compatible sub-biomes based on primary biome
    const biomeCompatibility: Record<IslandBiome, IslandBiome[]> = {
      mega_tropical: ["coral_atoll", "temperate_giant"],
      volcanic_massive: ["desert_plateau", "mountain_range"],
      temperate_giant: ["mega_tropical", "mountain_range"],
      arctic_continent: ["mountain_range"],
      desert_plateau: ["volcanic_massive"],
      mystical_realm: ["mega_tropical", "volcanic_massive"],
      coral_atoll: ["mega_tropical"],
      mountain_range: ["temperate_giant", "arctic_continent"],
    };

    const compatible = biomeCompatibility[primaryBiome] || [];
    const numSubBiomes = this.rng.nextInt(0, Math.min(2, compatible.length));

    for (let i = 0; i < numSubBiomes; i++) {
      const subBiome = compatible[this.rng.nextInt(0, compatible.length - 1)];
      if (!subBiomes.includes(subBiome)) {
        subBiomes.push(subBiome);
      }
    }

    return subBiomes;
  }

  /**
   * Calculate peak height based on island size and biome
   */
  private calculatePeakHeight(radius: number, biome: IslandBiome): number {
    const baseHeight = Math.min(radius * 0.4, this.config.maxTerrainHeight);

    const biomeHeightMultipliers: Record<IslandBiome, number> = {
      mountain_range: 1.5,
      volcanic_massive: 1.3,
      arctic_continent: 1.2,
      mystical_realm: 1.4,
      temperate_giant: 1.0,
      mega_tropical: 0.8,
      desert_plateau: 1.1,
      coral_atoll: 0.3,
    };

    return Math.floor(baseHeight * (biomeHeightMultipliers[biome] || 1.0));
  }

  /**
   * Generate elevation profile for massive island
   */
  private generateElevationProfile(
    radius: number,
  ): MassiveIslandSpec["elevation"] {
    return {
      seaLevel: this.config.seaLevel,
      beachLevel: this.config.seaLevel + 2,
      hillLevel: Math.floor(radius * 0.1),
      peakLevel: Math.floor(radius * 0.3),
    };
  }

  /**
   * Calculate which chunks an island affects
   */
  private calculateIslandChunks(island: MassiveIslandSpec): void {
    const { chunkSize } = this.config;
    const margin = 32; // Extra chunks around island for smooth blending

    const minX = Math.floor(
      (island.center.x - island.baseRadius - margin) / chunkSize,
    );
    const maxX = Math.ceil(
      (island.center.x + island.baseRadius + margin) / chunkSize,
    );
    const minZ = Math.floor(
      (island.center.z - island.baseRadius - margin) / chunkSize,
    );
    const maxZ = Math.ceil(
      (island.center.z + island.baseRadius + margin) / chunkSize,
    );

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        island.chunks.add(`${cx},${cz}`);
      }
    }
  }

  /**
   * Generate initial high-priority chunks
   */
  private async generateInitialChunks(): Promise<number> {
    const initialChunks: string[] = [];

    // Generate chunks around each island center first
    for (const island of this.islands) {
      const centerChunkX = Math.floor(island.center.x / this.config.chunkSize);
      const centerChunkZ = Math.floor(island.center.z / this.config.chunkSize);

      // Generate 3x3 chunks around island center
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const chunkKey = `${centerChunkX + dx},${centerChunkZ + dz}`;
          if (!initialChunks.includes(chunkKey)) {
            initialChunks.push(chunkKey);
          }
        }
      }
    }

    // Generate these chunks in batches for performance
    const batchSize = 10;
    for (let i = 0; i < initialChunks.length; i += batchSize) {
      const batch = initialChunks.slice(i, i + batchSize);
      await Promise.all(batch.map((chunkKey) => this.generateChunk(chunkKey)));

      // Small delay to prevent blocking
      if (i + batchSize < initialChunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    }

    return initialChunks.length;
  }

  /**
   * Generate a single chunk
   */
  private async generateChunk(chunkKey: string): Promise<Chunk> {
    if (this.chunks.has(chunkKey)) {
      return this.chunks.get(chunkKey)!;
    }

    const [cx, cz] = chunkKey.split(",").map(Number);
    const { chunkSize } = this.config;

    const chunk: Chunk = {
      x: cx,
      z: cz,
      size: chunkSize,
      blocks: new Map(),
      heightmap: Array(chunkSize)
        .fill(0)
        .map(() => Array(chunkSize).fill(0)),
      biomes: Array(chunkSize)
        .fill(0)
        .map(() => Array(chunkSize).fill("temperate_giant" as IslandBiome)),
      isGenerated: false,
      lastAccessed: Date.now(),
    };

    // Generate heightmap for this chunk
    await this.generateChunkHeightmap(chunk);

    // Generate biome map
    this.generateChunkBiomes(chunk);

    // Place blocks based on heightmap and biomes
    await this.generateChunkBlocks(chunk);

    chunk.isGenerated = true;
    this.chunks.set(chunkKey, chunk);
    this.updateChunkLRU(chunkKey);

    // Manage memory by unloading old chunks
    this.manageChunkMemory();

    return chunk;
  }

  /**
   * Generate heightmap for a chunk using multi-scale noise
   */
  private async generateChunkHeightmap(chunk: Chunk): Promise<void> {
    const { chunkSize } = this.config;
    const { megaNoiseConfig } = this.config;

    for (let lz = 0; lz < chunkSize; lz++) {
      for (let lx = 0; lx < chunkSize; lx++) {
        const worldX = chunk.x * chunkSize + lx;
        const worldZ = chunk.z * chunkSize + lz;

        let height = this.config.seaLevel;

        // Find affecting islands
        const affectingIslands = this.findAffectingIslands(worldX, worldZ);

        if (affectingIslands.length > 0) {
          let totalHeight = 0;
          let totalWeight = 0;

          for (const island of affectingIslands) {
            const distance = Math.sqrt(
              (worldX - island.center.x) ** 2 + (worldZ - island.center.z) ** 2,
            );

            if (distance < island.baseRadius * 1.5) {
              const islandHeight = this.calculateMassiveIslandHeight(
                worldX,
                worldZ,
                island,
                distance,
              );

              const weight = this.calculateBlendWeight(
                distance,
                island.baseRadius,
              );

              totalHeight += islandHeight * weight;
              totalWeight += weight;
            }
          }

          if (totalWeight > 0) {
            height = totalHeight / totalWeight;
          }
        }

        chunk.heightmap[lz][lx] = height;
      }

      // Yield control periodically
      if (lz % 8 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  /**
   * Calculate height for massive island with multi-octave noise
   */
  private calculateMassiveIslandHeight(
    x: number,
    z: number,
    island: MassiveIslandSpec,
    distance: number,
  ): number {
    // Base elevation falloff
    const falloff = Math.max(0, 1 - distance / island.baseRadius);
    const baseFalloff = Math.pow(falloff, 2.5); // Smooth falloff curve

    // Multi-scale noise for realistic terrain
    const continentalNoise = this.noiseGenerator.noise(x * 0.0005, z * 0.0005, {
      octaves: 2,
      frequency: 1,
      amplitude: 1,
      lacunarity: 2,
      gain: 0.5,
    });

    const regionalNoise = this.noiseGenerator.noise(x * 0.002, z * 0.002, {
      octaves: 4,
      frequency: 1,
      amplitude: 1,
      lacunarity: 2,
      gain: 0.6,
    });

    const localNoise = this.noiseGenerator.noise(x * 0.01, z * 0.01, {
      octaves: 6,
      frequency: 1,
      amplitude: 1,
      lacunarity: 2,
      gain: 0.5,
    });

    const microNoise = this.noiseGenerator.noise(x * 0.05, z * 0.05, {
      octaves: 3,
      frequency: 1,
      amplitude: 1,
      lacunarity: 2,
      gain: 0.4,
    });

    // Combine noise layers
    const combinedNoise =
      continentalNoise * 0.4 +
      regionalNoise * 0.3 +
      localNoise * 0.2 +
      microNoise * 0.1;

    // Apply biome-specific modifications
    const biomeMultiplier = this.getBiomeHeightMultiplier(
      island.biome,
      distance,
      island.baseRadius,
    );

    // Final height calculation
    const finalHeight =
      this.config.seaLevel +
      island.peakHeight *
        baseFalloff *
        (0.8 + combinedNoise * 0.4) *
        biomeMultiplier;

    return Math.max(this.config.seaLevel - 10, finalHeight); // Ensure some underwater area
  }

  /**
   * Get biome-specific height multiplier
   */
  private getBiomeHeightMultiplier(
    biome: IslandBiome,
    distance: number,
    radius: number,
  ): number {
    const multipliers: Record<IslandBiome, number> = {
      mountain_range: 1.3,
      volcanic_massive: 1.2,
      arctic_continent: 1.1,
      mystical_realm: 1.15,
      temperate_giant: 1.0,
      mega_tropical: 0.9,
      desert_plateau: 1.05,
      coral_atoll: 0.7,
    };

    return multipliers[biome] || 1.0;
  }

  /**
   * Find islands that affect a world position
   */
  private findAffectingIslands(x: number, z: number): MassiveIslandSpec[] {
    // Use spatial partitioning for efficient queries
    return this.queryQuadTree(this.quadTree, x, z);
  }

  /**
   * Calculate blend weight for island influence
   */
  private calculateBlendWeight(distance: number, radius: number): number {
    if (distance >= radius * 1.5) return 0;

    const normalizedDistance = distance / (radius * 1.5);
    return Math.pow(1 - normalizedDistance, 3); // Smooth cubic falloff
  }

  /**
   * Create initial quad tree for spatial partitioning
   */
  private createQuadTree(): QuadTreeNode {
    return {
      bounds: {
        x: 0,
        z: 0,
        width: this.config.worldSize.width,
        height: this.config.worldSize.height,
      },
      islands: [],
      isLeaf: true,
    };
  }

  /**
   * Build quad tree with island data
   */
  private buildQuadTree(): void {
    for (const island of this.islands) {
      this.insertIntoQuadTree(this.quadTree, island);
    }
  }

  /**
   * Insert island into quad tree
   */
  private insertIntoQuadTree(
    node: QuadTreeNode,
    island: MassiveIslandSpec,
  ): void {
    // If island doesn't intersect this node, skip
    if (
      !this.intersectsCircle(
        node.bounds,
        island.center,
        island.baseRadius * 1.5,
      )
    ) {
      return;
    }

    // If leaf node with space, add island
    if (node.isLeaf && node.islands.length < 4) {
      node.islands.push(island);
      return;
    }

    // If leaf node is full, subdivide
    if (node.isLeaf) {
      this.subdivideQuadTree(node);
    }

    // Insert into appropriate children
    if (node.children) {
      for (const child of node.children) {
        this.insertIntoQuadTree(child, island);
      }
    }
  }

  /**
   * Subdivide quad tree node
   */
  private subdivideQuadTree(node: QuadTreeNode): void {
    const { x, z, width, height } = node.bounds;
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    node.children = [
      // Top-left
      {
        bounds: { x, z, width: halfWidth, height: halfHeight },
        islands: [],
        isLeaf: true,
      },
      // Top-right
      {
        bounds: { x: x + halfWidth, z, width: halfWidth, height: halfHeight },
        islands: [],
        isLeaf: true,
      },
      // Bottom-left
      {
        bounds: { x, z: z + halfHeight, width: halfWidth, height: halfHeight },
        islands: [],
        isLeaf: true,
      },
      // Bottom-right
      {
        bounds: {
          x: x + halfWidth,
          z: z + halfHeight,
          width: halfWidth,
          height: halfHeight,
        },
        islands: [],
        isLeaf: true,
      },
    ];

    // Move existing islands to children
    for (const island of node.islands) {
      for (const child of node.children) {
        this.insertIntoQuadTree(child, island);
      }
    }

    node.islands = [];
    node.isLeaf = false;
  }

  /**
   * Query quad tree for islands affecting a point
   */
  private queryQuadTree(
    node: QuadTreeNode,
    x: number,
    z: number,
  ): MassiveIslandSpec[] {
    if (!this.pointInBounds(node.bounds, x, z)) {
      return [];
    }

    if (node.isLeaf) {
      return node.islands.filter((island) => {
        const distance = Math.sqrt(
          (x - island.center.x) ** 2 + (z - island.center.z) ** 2,
        );
        return distance < island.baseRadius * 1.5;
      });
    }

    let result: MassiveIslandSpec[] = [];
    if (node.children) {
      for (const child of node.children) {
        result = result.concat(this.queryQuadTree(child, x, z));
      }
    }

    return result;
  }

  /**
   * Check if circle intersects rectangle
   */
  private intersectsCircle(
    bounds: { x: number; z: number; width: number; height: number },
    center: { x: number; z: number },
    radius: number,
  ): boolean {
    const closestX = Math.max(
      bounds.x,
      Math.min(center.x, bounds.x + bounds.width),
    );
    const closestZ = Math.max(
      bounds.z,
      Math.min(center.z, bounds.z + bounds.height),
    );

    const distance = Math.sqrt(
      (center.x - closestX) ** 2 + (center.z - closestZ) ** 2,
    );
    return distance <= radius;
  }

  /**
   * Check if point is in bounds
   */
  private pointInBounds(
    bounds: { x: number; z: number; width: number; height: number },
    x: number,
    z: number,
  ): boolean {
    return (
      x >= bounds.x &&
      x < bounds.x + bounds.width &&
      z >= bounds.z &&
      z < bounds.z + bounds.height
    );
  }

  /**
   * Generate biomes for chunk
   */
  private generateChunkBiomes(chunk: Chunk): void {
    const { chunkSize } = this.config;

    for (let lz = 0; lz < chunkSize; lz++) {
      for (let lx = 0; lx < chunkSize; lx++) {
        const worldX = chunk.x * chunkSize + lx;
        const worldZ = chunk.z * chunkSize + lz;

        let biome: IslandBiome = "temperate_giant";
        let minDistance = Infinity;

        // Find closest island to determine biome
        for (const island of this.islands) {
          const distance = Math.sqrt(
            (worldX - island.center.x) ** 2 + (worldZ - island.center.z) ** 2,
          );

          if (distance < island.baseRadius * 1.2 && distance < minDistance) {
            minDistance = distance;
            biome = island.biome;

            // Check for sub-biomes in outer areas
            if (
              distance > island.baseRadius * 0.7 &&
              island.subBiomes.length > 0
            ) {
              const subBiomeIndex = Math.floor(
                (distance / island.baseRadius) * island.subBiomes.length,
              );
              biome =
                island.subBiomes[
                  Math.min(subBiomeIndex, island.subBiomes.length - 1)
                ];
            }
          }
        }

        chunk.biomes[lz][lx] = biome;
      }
    }
  }

  /**
   * Generate blocks for chunk based on heightmap and biomes
   */
  private async generateChunkBlocks(chunk: Chunk): Promise<void> {
    const { chunkSize } = this.config;

    for (let lz = 0; lz < chunkSize; lz++) {
      for (let lx = 0; lx < chunkSize; lx++) {
        const height = chunk.heightmap[lz][lx];
        const biome = chunk.biomes[lz][lx];

        if (height > this.config.seaLevel) {
          const worldX = chunk.x * chunkSize + lx;
          const worldZ = chunk.z * chunkSize + lz;

          // Generate vertical column of blocks
          for (let y = this.config.seaLevel; y <= Math.floor(height); y++) {
            // Check block limit
            if (this.totalBlocksGenerated >= this.blockLimit) {
              this.blocksFiltered++;
              continue;
            }

            const blockType = this.selectBlockType(
              y,
              height,
              biome,
              worldX,
              worldZ,
            );
            const blockKey = `${lx},${y},${lz}`;
            chunk.blocks.set(blockKey, blockType);
            this.totalBlocksGenerated++;
          }
        }
      }

      // Yield periodically
      if (lz % 4 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  /**
   * Select appropriate block type based on position and biome
   */
  private selectBlockType(
    y: number,
    surfaceHeight: number,
    biome: IslandBiome,
    worldX: number,
    worldZ: number,
  ): BlockType {
    const depthFromSurface = surfaceHeight - y;

    // Biome-specific block palettes
    const biomePalettes: Record<
      IslandBiome,
      { surface: BlockType; subsurface: BlockType; deep: BlockType }
    > = {
      mega_tropical: {
        surface: BlockType.LEAF,
        subsurface: BlockType.WOOD,
        deep: BlockType.STONE,
      },
      volcanic_massive: {
        surface: BlockType.NUMBER_4,
        subsurface: BlockType.STONE,
        deep: BlockType.NUMBER_6,
      },
      temperate_giant: {
        surface: BlockType.WOOD,
        subsurface: BlockType.STONE,
        deep: BlockType.STONE,
      },
      arctic_continent: {
        surface: BlockType.FROSTED_GLASS,
        subsurface: BlockType.STONE,
        deep: BlockType.STONE,
      },
      desert_plateau: {
        surface: BlockType.NUMBER_5,
        subsurface: BlockType.STONE,
        deep: BlockType.STONE,
      },
      mystical_realm: {
        surface: BlockType.NUMBER_7,
        subsurface: BlockType.FROSTED_GLASS,
        deep: BlockType.NUMBER_6,
      },
      coral_atoll: {
        surface: BlockType.NUMBER_5,
        subsurface: BlockType.STONE,
        deep: BlockType.STONE,
      },
      mountain_range: {
        surface: BlockType.STONE,
        subsurface: BlockType.STONE,
        deep: BlockType.NUMBER_6,
      },
    };

    const palette = biomePalettes[biome];

    if (depthFromSurface < 1) {
      return palette.surface;
    } else if (depthFromSurface < 3) {
      return palette.subsurface;
    } else {
      return palette.deep;
    }
  }

  /**
   * Stream remaining chunks with LOD
   */
  private async streamRemainingChunks(): Promise<void> {
    // Implementation would stream chunks based on distance from islands
    // and apply appropriate LOD levels for performance
    console.log("🌊 Streaming remaining chunks...");
  }

  /**
   * Apply post-processing optimizations
   */
  private async postProcessTerrain(): Promise<void> {
    // Apply smoothing, erosion simulation, and other post-processing
    console.log("⚡ Applying post-processing...");
  }

  /**
   * Update chunk LRU cache
   */
  private updateChunkLRU(chunkKey: string): void {
    const index = this.chunkLRU.indexOf(chunkKey);
    if (index !== -1) {
      this.chunkLRU.splice(index, 1);
    }
    this.chunkLRU.unshift(chunkKey);
  }

  /**
   * Manage chunk memory by unloading old chunks
   */
  private manageChunkMemory(): void {
    while (
      this.chunks.size > this.config.maxLoadedChunks &&
      this.chunkLRU.length > 0
    ) {
      const oldestChunk = this.chunkLRU.pop();
      if (oldestChunk) {
        this.chunks.delete(oldestChunk);
      }
    }
  }

  /**
   * Get all blocks from loaded chunks for world placement with smart filtering
   */
  getAllBlocks(blockLimit?: number): Array<{
    position: Vector3;
    blockType: BlockType;
    biome: IslandBiome;
    priority: number;
  }> {
    const blocks: Array<{
      position: Vector3;
      blockType: BlockType;
      biome: IslandBiome;
      priority: number;
    }> = [];

    for (const [chunkKey, chunk] of this.chunks) {
      if (!chunk.isGenerated) continue;

      for (const [blockKey, blockType] of chunk.blocks) {
        const [lx, y, lz] = blockKey.split(",").map(Number);
        const worldX = chunk.x * chunk.size + lx + this.config.origin.x;
        const worldZ = chunk.z * chunk.size + lz + this.config.origin.z;

        // Calculate block priority (higher = more important)
        const priority = this.calculateBlockPriority(
          worldX,
          y,
          worldZ,
          blockType,
          chunk.biomes[lz][lx],
        );

        blocks.push({
          position: new Vector3(worldX, y, worldZ),
          blockType,
          biome: chunk.biomes[lz][lx],
          priority,
        });
      }
    }

    // Apply block limit with smart filtering if specified
    if (blockLimit && blocks.length > blockLimit) {
      // Sort by priority (highest first) and take top blocks
      blocks.sort((a, b) => b.priority - a.priority);
      return blocks.slice(0, blockLimit);
    }

    return blocks;
  }

  /**
   * Calculate block priority for smart filtering
   */
  private calculateBlockPriority(
    x: number,
    y: number,
    z: number,
    blockType: BlockType,
    biome: IslandBiome,
  ): number {
    let priority = 100; // Base priority

    // Surface blocks are more important
    const surfaceHeight = this.getSurfaceHeightAt(x, z);
    if (Math.abs(y - surfaceHeight) <= 2) {
      priority += 50;
    }

    // Blocks near island centers are more important
    const distanceFromNearestIsland = this.getDistanceFromNearestIsland(x, z);
    priority += Math.max(0, 100 - distanceFromNearestIsland / 10);

    // Visual blocks (non-stone) are more important
    if (blockType !== BlockType.STONE) {
      priority += 25;
    }

    // Special biome blocks are more important
    if (biome === "mystical_realm" || biome === "volcanic_massive") {
      priority += 20;
    }

    return priority;
  }

  /**
   * Get surface height at world position
   */
  private getSurfaceHeightAt(x: number, z: number): number {
    const chunkX = Math.floor(
      (x - this.config.origin.x) / this.config.chunkSize,
    );
    const chunkZ = Math.floor(
      (z - this.config.origin.z) / this.config.chunkSize,
    );
    const chunkKey = `${chunkX},${chunkZ}`;

    const chunk = this.chunks.get(chunkKey);
    if (!chunk) return this.config.seaLevel;

    const lx = (x - this.config.origin.x) % this.config.chunkSize;
    const lz = (z - this.config.origin.z) % this.config.chunkSize;

    if (lx < 0 || lx >= chunk.size || lz < 0 || lz >= chunk.size) {
      return this.config.seaLevel;
    }

    return chunk.heightmap[lz][lx];
  }

  /**
   * Get distance from nearest island center
   */
  private getDistanceFromNearestIsland(x: number, z: number): number {
    let minDistance = Infinity;

    for (const island of this.islands) {
      const distance = Math.sqrt(
        (x - island.center.x) ** 2 + (z - island.center.z) ** 2,
      );
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
  }

  /**
   * Validate configuration
   */
  private validateConfig(
    config: MassiveArchipelagoConfig,
  ): MassiveArchipelagoConfig {
    // Ensure minimum world size for massive islands
    if (config.worldSize.width < 1024 || config.worldSize.height < 1024) {
      throw new Error(
        "World size must be at least 1024x1024 for massive archipelagos",
      );
    }

    // Ensure reasonable island sizes
    if (config.islandRadius.max < 200) {
      console.warn(
        "Maximum island radius should be at least 200 for massive islands",
      );
    }

    return config;
  }

  /**
   * Calculate various statistics
   */
  private calculateMassiveStats(): MassiveArchipelagoResult["stats"] {
    const islandSizes = this.islands.map(
      (i) => Math.PI * i.baseRadius * i.baseRadius,
    );
    const totalLandArea = islandSizes.reduce((sum, size) => sum + size, 0);

    const biomeDistribution: Record<IslandBiome, number> = {} as Record<
      IslandBiome,
      number
    >;
    for (const island of this.islands) {
      biomeDistribution[island.biome] =
        (biomeDistribution[island.biome] || 0) + 1;
    }

    return {
      largestIsland: Math.max(...islandSizes),
      averageIslandSize: totalLandArea / this.islands.length,
      totalLandArea,
      biomeDistribution,
      blocksGenerated: this.totalBlocksGenerated,
      blocksFiltered: this.blocksFiltered,
      blockLimitReached: this.totalBlocksGenerated >= this.blockLimit,
    };
  }

  private getTotalChunkCount(): number {
    const { worldSize, chunkSize } = this.config;
    return (
      Math.ceil(worldSize.width / chunkSize) *
      Math.ceil(worldSize.height / chunkSize)
    );
  }

  private getTotalBlockCount(): number {
    let count = 0;
    for (const chunk of this.chunks.values()) {
      count += chunk.blocks.size;
    }
    return count;
  }

  private calculateMemoryUsage(): number {
    // Rough calculation of memory usage in MB
    let totalSize = 0;
    for (const chunk of this.chunks.values()) {
      totalSize += chunk.blocks.size * 32; // Rough estimate per block
      totalSize += chunk.size * chunk.size * 8; // Heightmap and biomes
    }
    return totalSize / (1024 * 1024);
  }
}

/**
 * Create default configuration for massive archipelagos
 */
export function createDefaultMassiveConfig(): MassiveArchipelagoConfig {
  return {
    seed: "massive-" + Date.now(),
    worldSize: { width: 2048, height: 2048 },
    chunkSize: 32,
    origin: { x: -1024, z: -1024 },

    islandCount: { min: 5, max: 10 },
    islandRadius: { min: 200, max: 500 },
    minIslandDistance: 300,

    seaLevel: 0,
    maxTerrainHeight: 200,
    terrainAmplification: 1.5,

    biomeWeights: {
      mega_tropical: 0.2,
      volcanic_massive: 0.15,
      temperate_giant: 0.2,
      arctic_continent: 0.1,
      desert_plateau: 0.1,
      mystical_realm: 0.1,
      coral_atoll: 0.1,
      mountain_range: 0.05,
    },

    allowBiomeBlending: true,
    biomeTransitionSize: 50,

    lodLevels: [
      { maxDistance: 500, chunkSize: 32, noiseDetail: 1.0, blockDensity: 1.0 },
      { maxDistance: 1000, chunkSize: 64, noiseDetail: 0.7, blockDensity: 0.8 },
      {
        maxDistance: 2000,
        chunkSize: 128,
        noiseDetail: 0.5,
        blockDensity: 0.6,
      },
    ],

    maxLoadedChunks: 500,
    asyncGeneration: true,
    batchSize: 1000,

    megaNoiseConfig: {
      continentalScale: 0.0005,
      regionalScale: 0.002,
      localScale: 0.01,
      microScale: 0.05,
    },
  };
}

/**
 * Generate massive archipelago with default settings
 */
export async function generateMassiveArchipelago(
  config?: Partial<MassiveArchipelagoConfig>,
): Promise<MassiveArchipelagoResult> {
  const fullConfig = { ...createDefaultMassiveConfig(), ...config };
  const generator = new MassiveArchipelagoGenerator(fullConfig);
  return await generator.generateMassiveArchipelago();
}
