import { Vector3 } from "three";
import { BlockFactory } from "./blockFactory";
import { BlockValidator } from "./blockValidation";
import { Block, BlockType, CreateBlockParams } from "../types/blocks";
import { useWorldStore } from "../store/worldStore";

/**
 * Integration utilities for block system with world store
 * Demonstrates how the block validation and factory work with the existing world store
 */

/**
 * Enhanced block creation that uses the validation system
 */
export function createValidatedBlock(
  position: Vector3 | { x: number; y: number; z: number },
  type: BlockType,
  createdBy: string,
  customColor?: string,
): { success: boolean; blockId?: string; errors: string[] } {
  const store = useWorldStore.getState();

  // Create block using factory with validation
  const result = BlockFactory.createBlock(
    {
      position,
      type,
      createdBy,
      customColor,
    },
    store.blockMap,
    store.worldLimits,
  );

  if (!result.block) {
    return {
      success: false,
      errors: result.errors,
    };
  }

  // Add to world store using existing method
  const success = store.addBlock(
    position instanceof Vector3
      ? position
      : new Vector3(position.x, position.y, position.z),
    type,
    createdBy,
  );

  if (success) {
    return {
      success: true,
      blockId: result.block.id,
      errors: [],
    };
  } else {
    return {
      success: false,
      errors: ["Failed to add block to world store"],
    };
  }
}

/**
 * Batch block creation with validation
 */
export function createBlockBatch(
  blocks: CreateBlockParams[],
  validateAll: boolean = true,
): {
  successful: number;
  failed: number;
  errors: string[];
  blockIds: string[];
} {
  const store = useWorldStore.getState();
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as string[],
    blockIds: [] as string[],
  };

  // If validateAll is true, validate all blocks first before creating any
  if (validateAll) {
    const validationErrors: string[] = [];

    for (const blockParams of blocks) {
      const validation = BlockValidator.validateCreateBlock(
        blockParams,
        store.blockMap,
        store.worldLimits,
      );

      if (!validation.isValid) {
        validationErrors.push(
          `Block at ${JSON.stringify(blockParams.position)}: ${validation.errors.join(", ")}`,
        );
      }
    }

    if (validationErrors.length > 0) {
      results.errors = validationErrors;
      results.failed = blocks.length;
      return results;
    }
  }

  // Create blocks one by one
  for (const blockParams of blocks) {
    const result = createValidatedBlock(
      blockParams.position,
      blockParams.type,
      blockParams.createdBy,
      blockParams.customColor,
    );

    if (result.success && result.blockId) {
      results.successful++;
      results.blockIds.push(result.blockId);
    } else {
      results.failed++;
      results.errors.push(...result.errors);
    }
  }

  return results;
}

/**
 * Get block type statistics from the world
 */
export function getBlockTypeStatistics(): {
  totalBlocks: number;
  byType: Record<BlockType, number>;
  byCreator: Record<string, number>;
  averageAge: number;
} {
  const store = useWorldStore.getState();
  const blocks = store.getAllBlocks();

  const stats = {
    totalBlocks: blocks.length,
    byType: {
      [BlockType.STONE]: 0,
      [BlockType.LEAF]: 0,
      [BlockType.WOOD]: 0,
    },
    byCreator: {} as Record<string, number>,
    averageAge: 0,
  };

  let totalAge = 0;
  const now = Date.now();

  for (const block of blocks) {
    // Count by type
    stats.byType[block.type]++;

    // Count by creator
    stats.byCreator[block.metadata.createdBy] =
      (stats.byCreator[block.metadata.createdBy] || 0) + 1;

    // Calculate age
    totalAge += now - block.metadata.createdAt;
  }

  if (blocks.length > 0) {
    stats.averageAge = totalAge / blocks.length;
  }

  return stats;
}

/**
 * Validate entire world state
 */
export function validateWorldState(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  blockCount: number;
  validBlocks: number;
  invalidBlocks: number;
} {
  const store = useWorldStore.getState();
  const blocks = store.getAllBlocks();

  const result = {
    isValid: true,
    errors: [] as string[],
    warnings: [] as string[],
    blockCount: blocks.length,
    validBlocks: 0,
    invalidBlocks: 0,
  };

  // Check if block count matches
  if (blocks.length !== store.blockCount) {
    result.errors.push(
      `Block count mismatch: store reports ${store.blockCount}, but found ${blocks.length} blocks`,
    );
    result.isValid = false;
  }

  // Validate each block
  for (const block of blocks) {
    const validation = BlockValidator.validateBlock(block);

    if (validation.isValid) {
      result.validBlocks++;
    } else {
      result.invalidBlocks++;
      result.errors.push(
        `Invalid block ${block.id}: ${validation.errors.join(", ")}`,
      );
      result.isValid = false;
    }

    if (validation.warnings) {
      result.warnings.push(
        ...validation.warnings.map((w) => `Block ${block.id}: ${w}`),
      );
    }
  }

  // Check for duplicate positions
  const positionMap = new Map<string, string[]>();
  for (const block of blocks) {
    const key = `${block.position.x},${block.position.y},${block.position.z}`;
    if (!positionMap.has(key)) {
      positionMap.set(key, []);
    }
    positionMap.get(key)!.push(block.id);
  }

  for (const [position, blockIds] of positionMap.entries()) {
    if (blockIds.length > 1) {
      result.errors.push(
        `Duplicate blocks at position ${position}: ${blockIds.join(", ")}`,
      );
      result.isValid = false;
    }
  }

  return result;
}

/**
 * Clean up invalid blocks from the world
 */
export function cleanupInvalidBlocks(): {
  removedBlocks: number;
  errors: string[];
} {
  const store = useWorldStore.getState();
  const blocks = store.getAllBlocks();

  const result = {
    removedBlocks: 0,
    errors: [] as string[],
  };

  for (const block of blocks) {
    const validation = BlockValidator.validateBlock(block);

    if (!validation.isValid) {
      try {
        const success = store.removeBlockById(block.id, "system");
        if (success) {
          result.removedBlocks++;
        } else {
          result.errors.push(`Failed to remove invalid block ${block.id}`);
        }
      } catch (error) {
        result.errors.push(`Error removing block ${block.id}: ${error}`);
      }
    }
  }

  return result;
}

/**
 * Export world data with validation
 */
export function exportWorldData(): {
  success: boolean;
  data?: {
    blocks: Block[];
    metadata: {
      exportedAt: number;
      blockCount: number;
      version: string;
    };
  };
  errors: string[];
} {
  const validation = validateWorldState();

  if (!validation.isValid) {
    return {
      success: false,
      errors: [`World validation failed: ${validation.errors.join(", ")}`],
    };
  }

  const store = useWorldStore.getState();
  const blocks = store.getAllBlocks();

  return {
    success: true,
    data: {
      blocks: blocks.map((block) => ({
        id: block.id,
        position: block.position,
        type: block.type,
        color: block.color,
        metadata: block.metadata,
      })),
      metadata: {
        exportedAt: Date.now(),
        blockCount: blocks.length,
        version: "1.0.0",
      },
    },
    errors: [],
  };
}

/**
 * Import world data with validation
 */
export function importWorldData(data: unknown): {
  success: boolean;
  importedBlocks: number;
  skippedBlocks: number;
  errors: string[];
} {
  const result = {
    success: false,
    importedBlocks: 0,
    skippedBlocks: 0,
    errors: [] as string[],
  };

  try {
    // Type assertion for object access
    if (!data || typeof data !== "object" || !("blocks" in data)) {
      result.errors.push("Invalid data format: missing blocks array");
      return result;
    }
    const importData = data as { blocks: unknown };

    // Validate data structure
    if (!Array.isArray(importData.blocks)) {
      result.errors.push("Invalid data format: missing blocks array");
      return result;
    }

    const store = useWorldStore.getState();

    // Clear existing world
    store.clearWorld();

    // Import blocks
    for (const blockData of importData.blocks) {
      const sanitizedBlock = BlockFactory.sanitizeBlock(blockData);

      if (sanitizedBlock) {
        const success = store.addBlock(
          new Vector3(
            sanitizedBlock.position.x,
            sanitizedBlock.position.y,
            sanitizedBlock.position.z,
          ),
          sanitizedBlock.type,
          sanitizedBlock.metadata.createdBy,
        );

        if (success) {
          result.importedBlocks++;
        } else {
          result.skippedBlocks++;
          result.errors.push(
            `Failed to import block at ${JSON.stringify(sanitizedBlock.position)}`,
          );
        }
      } else {
        result.skippedBlocks++;
        result.errors.push(`Invalid block data: ${JSON.stringify(blockData)}`);
      }
    }

    result.success = result.importedBlocks > 0;
  } catch (error) {
    result.errors.push(`Import error: ${error}`);
  }

  return result;
}
