/**
 * Island Generation Types and Interfaces
 *
 * Type definitions for the procedural island generation system,
 * including configuration, regions, palettes, and results.
 */

import { BlockType } from '../../../types/blocks';

/**
 * Random Number Generator interface
 */
export interface RNG {
  next(): number;
  nextInt(min: number, max: number): number;
  pick<T>(arr: T[], weights?: number[]): T;
  shuffleInPlace<T>(arr: T[]): void;
  seed(newSeed: number): void;
  clone(): RNG;
}

/**
 * Floor identifier type (using BlockType from existing system)
 */
export type FloorId = BlockType;

/**
 * Global palette configuration for floor placement
 */
export interface GlobalPalette {
  all: { id: FloorId; weight?: number }[];      // For "All" regions - mixed variety
  exotic: { id: FloorId; rarity?: number }[];   // For "Unique" regions - rare floors
  safeFallback: FloorId[];                      // Never empty - fallback options
}

/**
 * Region placement rules
 */
export type RegionRule = 'ALL' | 'PURE' | 'UNIQUE';

/**
 * Region seed definition for Voronoi partitioning
 */
export interface RegionSeed {
  id: string;
  rule: RegionRule;
  pos: { x: number; y: number }; // Island-local coordinates
}

/**
 * Island mask generation configuration
 */
export interface IslandMaskConfig {
  radius: number;           // Base radius in tiles
  noiseFrequency: number;   // 0.0..2.0 - frequency of edge noise
  noiseAmplitude: number;   // 0..1 - amplitude of edge variation
  fbmOctaves: number;       // 1..5 - number of noise octaves
  shoreSoftness: number;    // 0..1 - blend at edge for smooth coastlines
}

/**
 * Region layout configuration
 */
export interface RegionLayoutConfig {
  allCount: number;         // Number of "All" regions (default: 3)
  pureCount: number;        // Number of "Pure" regions (e.g., 5-7 along arc)
  uniqueCount: number;      // Number of "Unique" regions (e.g., 5-6 diagonally)
  uniqueNoRepeatDistance: number; // Minimum distance for same floor in Unique regions
  relaxIterations: number;  // 0..3 - iterations of Lloyd relaxation
}

/**
 * Grid configuration for world placement
 */
export interface GridConfig {
  size: { width: number; height: number }; // Island grid extents in tiles
  origin: { x: number; z: number };        // World offset for placement
  yLevel: number;                          // Y level for floor placement
  chunkSize: number;                       // Chunk size for batched updates
}

/**
 * Debug configuration
 */
export interface DebugConfig {
  emitOverlay: boolean;     // Generate debug overlay data
  labelRegions: boolean;    // Include region labels in debug data
}

/**
 * Complete island generation configuration
 */
export interface IslandGenConfig {
  seed: number | string;          // Deterministic seed
  islandId: string;               // Unique island identifier
  mask: IslandMaskConfig;         // Island shape configuration
  layout: RegionLayoutConfig;     // Region placement configuration
  palette: GlobalPalette;         // Floor type palettes
  grid: GridConfig;               // World grid configuration
  debug?: DebugConfig;            // Optional debug settings
}

/**
 * Individual tile placement result
 */
export interface TilePlacement {
  x: number;              // World X coordinate
  y: number;              // World Y coordinate (floor level)
  z: number;              // World Z coordinate
  floorId: FloorId;       // Floor type to place
  regionId: string;       // ID of the region this tile belongs to
  rule: RegionRule;       // Rule used for this placement
}

/**
 * Region summary information
 */
export interface RegionInfo {
  id: string;
  rule: RegionRule;
}

/**
 * Debug information for visualization
 */
export interface IslandDebugInfo {
  seeds: RegionSeed[];                    // All region seeds used
  mask: number[][];                       // 2D island mask (0..1 values)
  regionIdByTile: string[][];             // Region assignment for each tile
}

/**
 * Complete island generation result
 */
export interface IslandGenResult {
  placements: TilePlacement[];            // All tile placements (may be streamed)
  regions: RegionInfo[];                  // Summary of all regions created
  debug?: IslandDebugInfo;                // Optional debug information
}

/**
 * Streaming generation progress callback
 */
export type GenerationProgressCallback = (
  progress: number,           // 0..1 completion percentage
  chunksProcessed: number,    // Number of chunks completed
  totalChunks: number         // Total chunks to process
) => void;

/**
 * Streaming generation configuration
 */
export interface StreamingConfig {
  enabled: boolean;                           // Enable streaming mode
  chunkSize: number;                          // Tiles per chunk
  onProgress?: GenerationProgressCallback;    // Progress callback
  maxChunksPerFrame: number;                  // Max chunks per animation frame
}

/**
 * Advanced island generation configuration with streaming
 */
export interface AdvancedIslandGenConfig extends IslandGenConfig {
  streaming?: StreamingConfig;
}

/**
 * Spatial position in island-local coordinates
 */
export interface IslandLocalPos {
  x: number;  // Normalized coordinates [-1, 1]
  y: number;  // Normalized coordinates [-1, 1]
}

/**
 * World position in global coordinates
 */
export interface WorldPos {
  x: number;  // World X coordinate
  y: number;  // World Y coordinate (height level)
  z: number;  // World Z coordinate
}

/**
 * Voronoi cell for region assignment
 */
export interface VoronoiCell {
  seed: RegionSeed;
  tiles: { x: number; y: number }[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

/**
 * Region connectivity analysis result
 */
export interface ConnectivityInfo {
  regionId: string;
  components: { x: number; y: number }[][];  // Connected components
  largestComponentSize: number;
  totalTiles: number;
}

/**
 * Island generation statistics
 */
export interface GenerationStats {
  totalTiles: number;
  regionCounts: Record<RegionRule, number>;
  floorTypeCounts: Record<FloorId, number>;
  generationTimeMs: number;
  seedUsed: string;
}

/**
 * Error types for island generation
 */
export enum IslandGenError {
  INVALID_CONFIG = 'INVALID_CONFIG',
  SEED_GENERATION_FAILED = 'SEED_GENERATION_FAILED',
  REGION_ASSIGNMENT_FAILED = 'REGION_ASSIGNMENT_FAILED',
  PALETTE_EXHAUSTED = 'PALETTE_EXHAUSTED',
  MASK_GENERATION_FAILED = 'MASK_GENERATION_FAILED',
  WORLD_PLACEMENT_FAILED = 'WORLD_PLACEMENT_FAILED'
}

/**
 * Island generation error with context
 */
export interface IslandGenErrorInfo {
  type: IslandGenError;
  message: string;
  context?: Record<string, any>;
}

/**
 * Validation result for island generation config
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: IslandGenErrorInfo[];
  warnings: string[];
}
