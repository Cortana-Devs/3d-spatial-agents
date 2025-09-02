import { Vector3 } from "three";
import {
  Block,
  BlockValidationError,
  BlockValidationResult,
  CreateBlockParams,
  UpdateBlockParams,
  PositionConstraints,
  BlockMetadata,
  isValidBlockType,
} from "../types/blocks";

/**
 * Comprehensive block validation system
 * Validates block creation, updates, and constraints
 */
export class BlockValidator {
  private static readonly DEFAULT_POSITION_CONSTRAINTS: PositionConstraints = {
    minX: -1000,
    maxX: 1000,
    minY: -1000,
    maxY: 1000,
    minZ: -1000,
    maxZ: 1000,
  };

  /**
   * Validates block creation parameters
   */
  static validateCreateBlock(
    params: CreateBlockParams,
    existingBlocks: Map<string, Block>,
    worldLimits: { maxBlocks: number },
    positionConstraints: PositionConstraints = BlockValidator.DEFAULT_POSITION_CONSTRAINTS,
  ): BlockValidationResult {
    const errors: BlockValidationError[] = [];
    const warnings: string[] = [];

    // Validate block type
    if (!isValidBlockType(params.type)) {
      errors.push(BlockValidationError.INVALID_TYPE);
    }

    // Validate position
    const position = this.normalizePosition(params.position);
    const positionValidation = this.validatePosition(
      position,
      positionConstraints,
    );
    if (!positionValidation.isValid) {
      errors.push(...positionValidation.errors);
    }

    // Check if position is occupied
    const positionKey = this.positionToKey(position);
    if (existingBlocks.has(positionKey)) {
      errors.push(BlockValidationError.POSITION_OCCUPIED);
    }

    // Check world limits
    if (existingBlocks.size >= worldLimits.maxBlocks) {
      errors.push(BlockValidationError.WORLD_LIMIT_REACHED);
    }

    // Validate metadata if provided
    if (params.metadata) {
      const metadataValidation = this.validateMetadata(params.metadata);
      if (!metadataValidation.isValid) {
        errors.push(...metadataValidation.errors);
      }
      warnings.push(...(metadataValidation.warnings || []));
    }

    // Validate custom color if provided
    if (params.customColor && !this.isValidColor(params.customColor)) {
      errors.push(BlockValidationError.INVALID_COLOR);
    }

    // Validate createdBy field
    if (!params.createdBy || params.createdBy.trim().length === 0) {
      errors.push(BlockValidationError.MISSING_REQUIRED_FIELDS);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validates block update parameters
   */
  static validateUpdateBlock(
    params: UpdateBlockParams,
    existingBlock: Block | undefined,
  ): BlockValidationResult {
    const errors: BlockValidationError[] = [];
    const warnings: string[] = [];

    // Check if block exists
    if (!existingBlock) {
      errors.push(BlockValidationError.MISSING_REQUIRED_FIELDS);
      return { isValid: false, errors };
    }

    // Validate color if provided
    if (params.color && !this.isValidColor(params.color)) {
      errors.push(BlockValidationError.INVALID_COLOR);
    }

    // Validate metadata if provided
    if (params.metadata) {
      const metadataValidation = this.validateMetadata(params.metadata);
      if (!metadataValidation.isValid) {
        errors.push(...metadataValidation.errors);
      }
      warnings.push(...(metadataValidation.warnings || []));
    }

    // Validate modifiedBy field
    if (!params.modifiedBy || params.modifiedBy.trim().length === 0) {
      errors.push(BlockValidationError.MISSING_REQUIRED_FIELDS);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validates a complete block object
   */
  static validateBlock(block: Block): BlockValidationResult {
    const errors: BlockValidationError[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!block.id || block.id.trim().length === 0) {
      errors.push(BlockValidationError.MISSING_REQUIRED_FIELDS);
    }

    if (!isValidBlockType(block.type)) {
      errors.push(BlockValidationError.INVALID_TYPE);
    }

    // Validate position
    const positionValidation = this.validatePosition(block.position);
    if (!positionValidation.isValid) {
      errors.push(...positionValidation.errors);
    }

    // Validate color
    if (!this.isValidColor(block.color)) {
      errors.push(BlockValidationError.INVALID_COLOR);
    }

    // Validate metadata
    const metadataValidation = this.validateMetadata(block.metadata);
    if (!metadataValidation.isValid) {
      errors.push(...metadataValidation.errors);
    }
    warnings.push(...(metadataValidation.warnings || []));

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validates block position
   */
  private static validatePosition(
    position: { x: number; y: number; z: number },
    constraints: PositionConstraints = BlockValidator.DEFAULT_POSITION_CONSTRAINTS,
  ): BlockValidationResult {
    const errors: BlockValidationError[] = [];

    // Check if position coordinates are valid numbers
    if (
      !Number.isFinite(position.x) ||
      !Number.isFinite(position.y) ||
      !Number.isFinite(position.z)
    ) {
      errors.push(BlockValidationError.INVALID_POSITION);
    }

    // Check position constraints
    if (constraints.minX !== undefined && position.x < constraints.minX) {
      errors.push(BlockValidationError.INVALID_POSITION);
    }
    if (constraints.maxX !== undefined && position.x > constraints.maxX) {
      errors.push(BlockValidationError.INVALID_POSITION);
    }
    if (constraints.minY !== undefined && position.y < constraints.minY) {
      errors.push(BlockValidationError.INVALID_POSITION);
    }
    if (constraints.maxY !== undefined && position.y > constraints.maxY) {
      errors.push(BlockValidationError.INVALID_POSITION);
    }
    if (constraints.minZ !== undefined && position.z < constraints.minZ) {
      errors.push(BlockValidationError.INVALID_POSITION);
    }
    if (constraints.maxZ !== undefined && position.z > constraints.maxZ) {
      errors.push(BlockValidationError.INVALID_POSITION);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates block metadata
   */
  private static validateMetadata(
    metadata: Partial<BlockMetadata>,
  ): BlockValidationResult {
    const errors: BlockValidationError[] = [];
    const warnings: string[] = [];

    // Validate timestamps
    if (metadata.createdAt !== undefined) {
      if (!Number.isFinite(metadata.createdAt) || metadata.createdAt < 0) {
        errors.push(BlockValidationError.INVALID_METADATA);
      }
    }

    if (metadata.modifiedAt !== undefined) {
      if (!Number.isFinite(metadata.modifiedAt) || metadata.modifiedAt < 0) {
        errors.push(BlockValidationError.INVALID_METADATA);
      }
    }

    // Validate glow intensity
    if (metadata.glow !== undefined) {
      if (
        !Number.isFinite(metadata.glow) ||
        metadata.glow < 0 ||
        metadata.glow > 1
      ) {
        errors.push(BlockValidationError.INVALID_METADATA);
      }
    }

    // Validate durability
    if (metadata.durability !== undefined) {
      if (
        !Number.isFinite(metadata.durability) ||
        metadata.durability < 0 ||
        metadata.durability > 1
      ) {
        errors.push(BlockValidationError.INVALID_METADATA);
      }
    }

    // Validate version
    if (metadata.version !== undefined) {
      if (!Number.isInteger(metadata.version) || metadata.version < 1) {
        errors.push(BlockValidationError.INVALID_METADATA);
      }
    }

    // Validate tags
    if (metadata.tags !== undefined) {
      if (!Array.isArray(metadata.tags)) {
        errors.push(BlockValidationError.INVALID_METADATA);
      } else {
        // Check for valid tag format
        const invalidTags = metadata.tags.filter(
          (tag) => typeof tag !== "string" || tag.trim().length === 0,
        );
        if (invalidTags.length > 0) {
          warnings.push(`Invalid tags found: ${invalidTags.join(", ")}`);
        }
      }
    }

    // Validate createdBy
    if (metadata.createdBy !== undefined) {
      if (
        typeof metadata.createdBy !== "string" ||
        metadata.createdBy.trim().length === 0
      ) {
        errors.push(BlockValidationError.INVALID_METADATA);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validates color format (hex, rgb, hsl, named colors)
   */
  private static isValidColor(color: string): boolean {
    // Hex color validation
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexRegex.test(color)) {
      return true;
    }

    // RGB/RGBA validation
    const rgbRegex =
      /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/;
    const rgbMatch = color.match(rgbRegex);
    if (rgbMatch) {
      const [, r, g, b, a] = rgbMatch;
      const red = parseInt(r);
      const green = parseInt(g);
      const blue = parseInt(b);
      const alpha = a ? parseFloat(a) : 1;

      return (
        red >= 0 &&
        red <= 255 &&
        green >= 0 &&
        green <= 255 &&
        blue >= 0 &&
        blue <= 255 &&
        alpha >= 0 &&
        alpha <= 1
      );
    }

    // HSL/HSLA validation
    const hslRegex =
      /^hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*([\d.]+))?\s*\)$/;
    const hslMatch = color.match(hslRegex);
    if (hslMatch) {
      const [, h, s, l, a] = hslMatch;
      const hue = parseInt(h);
      const saturation = parseInt(s);
      const lightness = parseInt(l);
      const alpha = a ? parseFloat(a) : 1;

      return (
        hue >= 0 &&
        hue <= 360 &&
        saturation >= 0 &&
        saturation <= 100 &&
        lightness >= 0 &&
        lightness <= 100 &&
        alpha >= 0 &&
        alpha <= 1
      );
    }

    // Named colors (basic set)
    const namedColors = [
      "red",
      "green",
      "blue",
      "yellow",
      "orange",
      "purple",
      "pink",
      "brown",
      "black",
      "white",
      "gray",
      "grey",
      "cyan",
      "magenta",
      "lime",
      "maroon",
      "navy",
      "olive",
      "teal",
      "silver",
      "aqua",
      "fuchsia",
    ];

    return namedColors.includes(color.toLowerCase());
  }

  /**
   * Normalizes position from Vector3 or position object
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

  /**
   * Converts position to string key for spatial hash map
   */
  private static positionToKey(position: {
    x: number;
    y: number;
    z: number;
  }): string {
    return `${position.x},${position.y},${position.z}`;
  }
}

/**
 * Utility functions for block validation
 */

/**
 * Quick validation for block type
 */
export function validateBlockType(type: string): boolean {
  return isValidBlockType(type);
}

/**
 * Quick validation for block position
 */
export function validateBlockPosition(
  position: Vector3 | { x: number; y: number; z: number },
): boolean {
  const normalized =
    position instanceof Vector3
      ? { x: position.x, y: position.y, z: position.z }
      : position;

  return (
    Number.isFinite(normalized.x) &&
    Number.isFinite(normalized.y) &&
    Number.isFinite(normalized.z)
  );
}

/**
 * Quick validation for block metadata timestamps
 */
export function validateTimestamp(timestamp: number): boolean {
  return Number.isFinite(timestamp) && timestamp > 0 && timestamp <= Date.now();
}

/**
 * Creates default metadata for a new block
 */
export function createDefaultMetadata(createdBy: string): BlockMetadata {
  const now = Date.now();
  return {
    createdAt: now,
    modifiedAt: now,
    createdBy,
    version: 1,
  };
}

/**
 * Validates if a user can modify a block (basic ownership check)
 */
export function canModifyBlock(block: Block, userId: string): boolean {
  // Allow modification if:
  // 1. User created the block
  // 2. User is 'human' (admin privileges)
  // 3. Block was created by 'human' and user is also 'human'
  return (
    block.metadata.createdBy === userId ||
    userId === "human" ||
    (block.metadata.createdBy === "human" && userId === "human")
  );
}

/**
 * Gets validation error message for display
 */
export function getValidationErrorMessage(error: BlockValidationError): string {
  switch (error) {
    case BlockValidationError.INVALID_TYPE:
      return "Invalid block type specified";
    case BlockValidationError.INVALID_POSITION:
      return "Invalid block position coordinates";
    case BlockValidationError.POSITION_OCCUPIED:
      return "Position is already occupied by another block";
    case BlockValidationError.WORLD_LIMIT_REACHED:
      return "World block limit has been reached";
    case BlockValidationError.INVALID_METADATA:
      return "Invalid block metadata provided";
    case BlockValidationError.INVALID_COLOR:
      return "Invalid color format specified";
    case BlockValidationError.MISSING_REQUIRED_FIELDS:
      return "Required fields are missing";
    default:
      return "Unknown validation error";
  }
}
