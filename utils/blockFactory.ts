import { Vector3 } from "three";
import { v4 as uuidv4 } from "uuid";
import {
  Block,
  BlockType,
  BlockMetadata,
  CreateBlockParams,
  UpdateBlockParams,
  getBlockDefinition,
} from "../types/blocks";
import {
  BlockValidator,
  createDefaultMetadata,
  validateBlockType,
} from "./blockValidation";

/**
 * Block Factory - Handles creation and modification of blocks with validation
 */
export class BlockFactory {
  /**
   * Creates a new block with validation
   */
  static createBlock(
    params: CreateBlockParams,
    existingBlocks: Map<string, Block>,
    worldLimits: { maxBlocks: number },
  ): { block: Block | null; errors: string[] } {
    // Validate the creation parameters
    const validation = BlockValidator.validateCreateBlock(
      params,
      existingBlocks,
      worldLimits,
    );

    if (!validation.isValid) {
      return {
        block: null,
        errors: validation.errors.map((error) => this.getErrorMessage(error)),
      };
    }

    // Normalize position
    const position = this.normalizePosition(params.position);

    // Get block definition
    const definition = getBlockDefinition(params.type);

    // Create metadata
    const metadata: BlockMetadata = {
      ...createDefaultMetadata(params.createdBy),
      ...params.metadata,
    };

    // Determine block color (custom or default)
    const color = params.customColor || definition.color;

    // Create the block
    const block: Block = {
      id: uuidv4(),
      position,
      type: params.type,
      color,
      metadata,
    };

    return {
      block,
      errors: [],
    };
  }

  /**
   * Updates an existing block with validation
   */
  static updateBlock(
    params: UpdateBlockParams,
    existingBlock: Block,
  ): { block: Block | null; errors: string[] } {
    // Validate the update parameters
    const validation = BlockValidator.validateUpdateBlock(
      params,
      existingBlock,
    );

    if (!validation.isValid) {
      return {
        block: null,
        errors: validation.errors.map((error) => this.getErrorMessage(error)),
      };
    }

    // Create updated block
    const updatedBlock: Block = {
      ...existingBlock,
      color: params.color || existingBlock.color,
      metadata: {
        ...existingBlock.metadata,
        ...params.metadata,
        modifiedAt: Date.now(),
      },
    };

    return {
      block: updatedBlock,
      errors: [],
    };
  }

  /**
   * Creates a block with default properties for a given type
   */
  static createDefaultBlock(
    type: BlockType,
    position: Vector3 | { x: number; y: number; z: number },
    createdBy: string,
  ): Block {
    if (!validateBlockType(type)) {
      throw new Error(`Invalid block type: ${type}`);
    }

    const definition = getBlockDefinition(type);
    const normalizedPosition = this.normalizePosition(position);

    return {
      id: uuidv4(),
      position: normalizedPosition,
      type,
      color: definition.color,
      metadata: createDefaultMetadata(createdBy),
    };
  }

  /**
   * Creates multiple blocks in a pattern
   */
  static createBlockPattern(
    type: BlockType,
    positions: (Vector3 | { x: number; y: number; z: number })[],
    createdBy: string,
    existingBlocks: Map<string, Block>,
    worldLimits: { maxBlocks: number },
  ): { blocks: Block[]; errors: string[]; skipped: number } {
    const blocks: Block[] = [];
    const errors: string[] = [];
    let skipped = 0;

    for (const position of positions) {
      // Check if we would exceed world limits
      if (existingBlocks.size + blocks.length >= worldLimits.maxBlocks) {
        skipped = positions.length - blocks.length;
        errors.push(`World limit reached. Skipped ${skipped} blocks.`);
        break;
      }

      const result = this.createBlock(
        {
          position,
          type,
          createdBy,
        },
        existingBlocks,
        worldLimits,
      );

      if (result.block) {
        blocks.push(result.block);
        // Add to existing blocks map for subsequent collision checks
        const key = this.positionToKey(result.block.position);
        existingBlocks.set(key, result.block);
      } else {
        errors.push(...result.errors);
        skipped++;
      }
    }

    return { blocks, errors, skipped };
  }

  /**
   * Clones a block with a new position
   */
  static cloneBlock(
    originalBlock: Block,
    newPosition: Vector3 | { x: number; y: number; z: number },
    createdBy: string,
  ): Block {
    const normalizedPosition = this.normalizePosition(newPosition);

    return {
      id: uuidv4(),
      position: normalizedPosition,
      type: originalBlock.type,
      color: originalBlock.color,
      metadata: {
        ...originalBlock.metadata,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        createdBy,
        version: 1, // Reset version for cloned block
      },
    };
  }

  /**
   * Creates a block with glow effect
   */
  static createGlowingBlock(
    type: BlockType,
    position: Vector3 | { x: number; y: number; z: number },
    createdBy: string,
    glowIntensity: number = 0.5,
  ): Block {
    const definition = getBlockDefinition(type);

    if (!definition.glowable) {
      throw new Error(`Block type ${type} does not support glow effects`);
    }

    const block = this.createDefaultBlock(type, position, createdBy);

    // Add glow metadata
    block.metadata.glow = Math.max(0, Math.min(1, glowIntensity));

    // Enhance color with emissive properties if available
    if (definition.emissive) {
      block.color = definition.emissive;
    }

    return block;
  }

  /**
   * Creates a frosted glass block with transparency and frosting effects
   */
  static createFrostedGlassBlock(
    position: Vector3 | { x: number; y: number; z: number },
    createdBy: string,
    transparency: number = 0.3,
    colorTint?: string,
  ): Block {
    const block = this.createDefaultBlock(
      BlockType.FROSTED_GLASS,
      position,
      createdBy,
    );

    // Apply custom transparency if provided
    if (transparency !== 0.3) {
      block.metadata.customProperties = {
        ...block.metadata.customProperties,
        transparency: Math.max(0.1, Math.min(0.9, transparency)),
      };
    }

    // Apply color tint if provided
    if (colorTint) {
      block.color = colorTint;
    }

    // Enable subtle glow for frosted glass
    block.metadata.glow = 0.2;

    return block;
  }

  /**
   * Creates a number 4 block with enhanced glow and special properties
   */
  static createNumber4Block(
    position: Vector3 | { x: number; y: number; z: number },
    createdBy: string,
    glowIntensity: number = 0.8,
  ): Block {
    const block = this.createDefaultBlock(
      BlockType.NUMBER_4,
      position,
      createdBy,
    );

    // Set high glow intensity for number 4 blocks
    block.metadata.glow = Math.max(0.3, Math.min(1, glowIntensity));

    // Mark as special block
    block.metadata.tags = ["special", "number", "glowing"];
    block.metadata.customProperties = {
      ...block.metadata.customProperties,
      specialType: "number_4",
      animated: true,
      soundEffect: "magical_chime",
    };

    return block;
  }

  /**
   * Creates a block with enhanced material properties
   */
  static createEnhancedBlock(
    type: BlockType,
    position: Vector3 | { x: number; y: number; z: number },
    createdBy: string,
    options: {
      glow?: number;
      transparency?: number;
      color?: string;
      durability?: number;
      tags?: string[];
      animated?: boolean;
    } = {},
  ): Block {
    const block = this.createDefaultBlock(type, position, createdBy);

    // Apply glow if specified and block supports it
    const definition = getBlockDefinition(type);
    if (options.glow !== undefined && definition.glowable) {
      block.metadata.glow = Math.max(0, Math.min(1, options.glow));
    }

    // Apply custom color
    if (options.color) {
      block.color = options.color;
    }

    // Apply durability
    if (options.durability !== undefined) {
      block.metadata.durability = Math.max(0, Math.min(1, options.durability));
    }

    // Add tags
    if (options.tags && options.tags.length > 0) {
      block.metadata.tags = [...(block.metadata.tags || []), ...options.tags];
    }

    // Store custom properties
    const customProperties: Record<string, unknown> = {
      ...block.metadata.customProperties,
    };

    if (options.transparency !== undefined) {
      customProperties.transparency = Math.max(
        0.1,
        Math.min(0.9, options.transparency),
      );
    }

    if (options.animated !== undefined) {
      customProperties.animated = options.animated;
    }

    if (Object.keys(customProperties).length > 0) {
      block.metadata.customProperties = customProperties;
    }

    return block;
  }

  /**
   * Validates and sanitizes block data from external sources
   */
  static sanitizeBlock(blockData: unknown): Block | null {
    try {
      // Basic structure validation
      if (!blockData || typeof blockData !== "object") {
        return null;
      }

      // Narrow input object shape and validate required fields
      type BlockInput = {
        id: unknown;
        position: unknown;
        type: unknown;
        color?: unknown;
        metadata: unknown;
      };
      if (
        !("id" in blockData) ||
        !("position" in blockData) ||
        !("type" in blockData) ||
        !("metadata" in blockData)
      ) {
        return null;
      }
      const data = blockData as BlockInput;

      // Required fields validation
      if (!data.id || !data.position || !data.type || !data.metadata) {
        return null;
      }

      // Type validation
      if (typeof data.type !== "string" || !validateBlockType(data.type)) {
        return null;
      }

      // Position validation
      const position = this.normalizePosition(
        data.position as Vector3 | { x: number; y: number; z: number },
      );
      if (
        !Number.isFinite(position.x) ||
        !Number.isFinite(position.y) ||
        !Number.isFinite(position.z)
      ) {
        return null;
      }

      // Prepare metadata object for safe access
      const meta = (data.metadata as Record<string, unknown>) || {};
      // Create sanitized block
      const sanitizedBlock: Block = {
        id: String(data.id),
        position,
        type: data.type as BlockType,
        color: String(
          data.color || getBlockDefinition(data.type as BlockType).color,
        ),
        metadata: {
          createdAt: Number(meta.createdAt) || Date.now(),
          modifiedAt: Number(meta.modifiedAt) || Date.now(),
          createdBy: String(meta.createdBy ?? "unknown"),
          glow:
            meta.glow !== undefined
              ? Math.max(0, Math.min(1, Number(meta.glow)))
              : undefined,
          durability:
            meta.durability !== undefined
              ? Math.max(0, Math.min(1, Number(meta.durability)))
              : undefined,
          tags: Array.isArray(meta.tags)
            ? ((meta.tags as unknown[]).filter(
                (tag: unknown) => typeof tag === "string",
              ) as string[])
            : undefined,
          version: Number(meta.version) || 1,
          customProperties:
            (meta.customProperties as Record<string, unknown>) || undefined,
        },
      };

      // Final validation
      const validation = BlockValidator.validateBlock(sanitizedBlock);
      return validation.isValid ? sanitizedBlock : null;
    } catch (error) {
      console.error("Error sanitizing block data:", error);
      return null;
    }
  }

  /**
   * Utility methods
   */
  private static normalizePosition(
    position: Vector3 | { x: number; y: number; z: number },
  ): { x: number; y: number; z: number } {
    if (position instanceof Vector3) {
      return {
        x: Math.round(position.x),
        y: Math.round(position.y),
        z: Math.round(position.z),
      };
    }
    return {
      x: Math.round(position.x),
      y: Math.round(position.y),
      z: Math.round(position.z),
    };
  }

  private static positionToKey(position: {
    x: number;
    y: number;
    z: number;
  }): string {
    return `${position.x},${position.y},${position.z}`;
  }

  private static getErrorMessage(error: unknown): string {
    // This would map to the validation error messages
    return String(error);
  }
}

/**
 * Utility functions for common block operations
 */

/**
 * Creates a line of blocks between two points
 */
export function createBlockLine(
  startPos: Vector3 | { x: number; y: number; z: number },
  endPos: Vector3 | { x: number; y: number; z: number },
): (Vector3 | { x: number; y: number; z: number })[];
export function createBlockLine(
  startPos: Vector3 | { x: number; y: number; z: number },
  endPos: Vector3 | { x: number; y: number; z: number },
  type: BlockType,
  createdBy: string,
): (Vector3 | { x: number; y: number; z: number })[];
export function createBlockLine(
  startPos: Vector3 | { x: number; y: number; z: number },
  endPos: Vector3 | { x: number; y: number; z: number },
  ...args: unknown[]
): (Vector3 | { x: number; y: number; z: number })[] {
  void args.length;
  const start = normalizePosition(startPos);
  const end = normalizePosition(endPos);

  const positions: { x: number; y: number; z: number }[] = [];

  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const dz = Math.abs(end.z - start.z);

  const sx = start.x < end.x ? 1 : -1;
  const sy = start.y < end.y ? 1 : -1;
  const sz = start.z < end.z ? 1 : -1;

  let x = start.x;
  let y = start.y;
  let z = start.z;

  const maxSteps = Math.max(dx, dy, dz);

  for (let i = 0; i <= maxSteps; i++) {
    positions.push({ x, y, z });

    if (i < maxSteps) {
      // Simple step-by-step movement
      if (x !== end.x) x += sx;
      if (y !== end.y) y += sy;
      if (z !== end.z) z += sz;
    }
  }

  return positions;
}

// Helper function to normalize position
function normalizePosition(
  position: Vector3 | { x: number; y: number; z: number },
): { x: number; y: number; z: number } {
  if (position instanceof Vector3) {
    return {
      x: Math.round(position.x),
      y: Math.round(position.y),
      z: Math.round(position.z),
    };
  }
  return {
    x: Math.round(position.x),
    y: Math.round(position.y),
    z: Math.round(position.z),
  };
}

/**
 * Creates a rectangular area of blocks
 */
export function createBlockRectangle(
  corner1: Vector3 | { x: number; y: number; z: number },
  corner2: Vector3 | { x: number; y: number; z: number },
  hollow?: boolean,
): (Vector3 | { x: number; y: number; z: number })[];
export function createBlockRectangle(
  corner1: Vector3 | { x: number; y: number; z: number },
  corner2: Vector3 | { x: number; y: number; z: number },
  type: BlockType,
  createdBy: string,
  hollow?: boolean,
): (Vector3 | { x: number; y: number; z: number })[];
export function createBlockRectangle(
  corner1: Vector3 | { x: number; y: number; z: number },
  corner2: Vector3 | { x: number; y: number; z: number },
  ...args: unknown[]
): (Vector3 | { x: number; y: number; z: number })[] {
  let hollow = false;
  if (typeof args[0] === "boolean") {
    hollow = args[0] as boolean;
  } else if (typeof args[2] === "boolean") {
    hollow = args[2] as boolean;
  }
  const pos1 = normalizePosition(corner1);
  const pos2 = normalizePosition(corner2);

  const minX = Math.min(pos1.x, pos2.x);
  const maxX = Math.max(pos1.x, pos2.x);
  const minY = Math.min(pos1.y, pos2.y);
  const maxY = Math.max(pos1.y, pos2.y);
  const minZ = Math.min(pos1.z, pos2.z);
  const maxZ = Math.max(pos1.z, pos2.z);

  const positions: { x: number; y: number; z: number }[] = [];

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (hollow) {
          // Only add blocks on the faces for hollow rectangles (not interior)
          const isOnFace =
            x === minX ||
            x === maxX ||
            y === minY ||
            y === maxY ||
            z === minZ ||
            z === maxZ;
          if (isOnFace) {
            positions.push({ x, y, z });
          }
        } else {
          positions.push({ x, y, z });
        }
      }
    }
  }

  return positions;
}

/**
 * Gets block type information for UI display
 */
export function getBlockTypeInfo(type: BlockType) {
  const definition = getBlockDefinition(type);
  return {
    type,
    displayName: definition.displayName,
    color: definition.color,
    description: definition.description,
    category: definition.category,
    canGlow: definition.glowable,
    durability: definition.durability,
    textureUrl: definition.textureUrl,
  };
}

/**
 * Gets all block types with their information
 */
export function getAllBlockTypeInfo() {
  return Object.values(BlockType).map((type) => getBlockTypeInfo(type));
}
