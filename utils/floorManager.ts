import { Vector3 } from "three";
import { BlockType } from "../types/blocks";
import { useWorldStore } from "../store/worldStore";
import { devLog, devWarn } from "@/utils/devLogger";
import {
  Y_LEVEL_CONSTANTS,
  Y_LEVEL_VALIDATION,
} from "../config/yLevelConstants";
import { floorDepthManager } from "../config/floorDepthConfig";

export interface FloorConfiguration {
  blockType: BlockType;
  pattern?:
    | "solid"
    | "checkerboard"
    | "border"
    | "cross"
    | "diagonal"
    | "custom";
  customPattern?: BlockType[];
  size: number; // Grid units
  centerPosition?: Vector3;
  yLevel?: number;
  fillHoles?: boolean; // Fill existing holes in the floor
  replaceExisting?: boolean; // Replace existing blocks at floor level
}

export interface FloorRegion {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  yLevel: number;
}

export class FloorManager {
  private static instance: FloorManager;

  private constructor() {}

  // Operation lock to prevent overlapping/duplicate placements from UI events
  private static operationLock = false;
  private static lastOperationTime = 0;
  private static OPERATION_COOLDOWN_MS = 250;

  private static beginOperation(): boolean {
    const now = Date.now();
    if (FloorManager.operationLock) return false;
    if (
      now - FloorManager.lastOperationTime <
      FloorManager.OPERATION_COOLDOWN_MS
    )
      return false;
    FloorManager.operationLock = true;
    FloorManager.lastOperationTime = now;
    return true;
  }

  private static endOperation(): void {
    FloorManager.operationLock = false;
  }

  // Normalize Y to grid level (using configurable floor depth) and snap to valid increments
  private normalizeY(y?: number): number {
    if (typeof y !== "number" || Number.isNaN(y))
      return floorDepthManager.getFloorPlacementY();
    return Y_LEVEL_VALIDATION.snapToValidY(y);
  }

  // Normalize center to integer grid coordinates (X/Z), keep Y out (handled via yLevel)
  private normalizeCenter(pos?: Vector3): Vector3 {
    const p = pos ?? new Vector3(0, 0, 0);
    return new Vector3(Math.round(p.x), 0, Math.round(p.z));
  }

  public static getInstance(): FloorManager {
    if (!FloorManager.instance) {
      FloorManager.instance = new FloorManager();
    }
    return FloorManager.instance;
  }

  /**
   * Places a solid floor of the specified type across a given area
   */
  public placeSolidFloor(config: FloorConfiguration): boolean {
    const store = useWorldStore.getState();
    const { addBlock, hasBlock } = store;

    const centerPos = this.normalizeCenter(config.centerPosition);
    const yLevel = this.normalizeY(config.yLevel);
    const halfSize = Math.floor(config.size / 2);

    let placedCount = 0;

    for (let x = -halfSize; x <= halfSize; x++) {
      for (let z = -halfSize; z <= halfSize; z++) {
        const position = new Vector3(centerPos.x + x, yLevel, centerPos.z + z);

        // Check if we should place a block here
        const shouldPlace = !hasBlock(position) || config.replaceExisting;

        if (shouldPlace) {
          const success = addBlock(position, config.blockType, "floor_manager");
          if (success) {
            placedCount++;
          }
        }
      }
    }

    devLog(`FloorManager: Placed ${placedCount} floor blocks`);
    return placedCount > 0;
  }

  /**
   * Places a checkerboard pattern floor
   */
  public placeCheckerboardFloor(
    primaryType: BlockType,
    secondaryType: BlockType,
    config: Omit<FloorConfiguration, "blockType" | "pattern">,
  ): boolean {
    const store = useWorldStore.getState();
    const { addBlock, hasBlock } = store;

    const centerPos = this.normalizeCenter(config.centerPosition);
    const yLevel = this.normalizeY(config.yLevel);
    const halfSize = Math.floor(config.size / 2);

    let placedCount = 0;

    for (let x = -halfSize; x <= halfSize; x++) {
      for (let z = -halfSize; z <= halfSize; z++) {
        const position = new Vector3(centerPos.x + x, yLevel, centerPos.z + z);

        // Checkerboard logic
        const isEven = (x + z) % 2 === 0;
        const blockType = isEven ? primaryType : secondaryType;

        const shouldPlace = !hasBlock(position) || config.replaceExisting;

        if (shouldPlace) {
          const success = addBlock(position, blockType, "floor_manager");
          if (success) {
            placedCount++;
          }
        }
      }
    }

    devLog(`FloorManager: Placed ${placedCount} checkerboard floor blocks`);
    return placedCount > 0;
  }

  /**
   * Places a border pattern floor (different block type for edges)
   */
  public placeBorderFloor(
    centerType: BlockType,
    borderType: BlockType,
    config: Omit<FloorConfiguration, "blockType" | "pattern">,
  ): boolean {
    const store = useWorldStore.getState();
    const { addBlock, hasBlock } = store;

    const centerPos = this.normalizeCenter(config.centerPosition);
    const yLevel = this.normalizeY(config.yLevel);
    const halfSize = Math.floor(config.size / 2);

    let placedCount = 0;

    for (let x = -halfSize; x <= halfSize; x++) {
      for (let z = -halfSize; z <= halfSize; z++) {
        const position = new Vector3(centerPos.x + x, yLevel, centerPos.z + z);

        // Border logic - use border type if on the edge
        const isOnBorder = Math.abs(x) === halfSize || Math.abs(z) === halfSize;
        const blockType = isOnBorder ? borderType : centerType;

        const shouldPlace = !hasBlock(position) || config.replaceExisting;

        if (shouldPlace) {
          const success = addBlock(position, blockType, "floor_manager");
          if (success) {
            placedCount++;
          }
        }
      }
    }

    devLog(`FloorManager: Placed ${placedCount} border floor blocks`);
    return placedCount > 0;
  }

  /**
   * Places a cross pattern floor
   */
  public placeCrossFloor(
    centerType: BlockType,
    crossType: BlockType,
    config: Omit<FloorConfiguration, "blockType" | "pattern">,
  ): boolean {
    const store = useWorldStore.getState();
    const { addBlock, hasBlock } = store;

    const centerPos = this.normalizeCenter(config.centerPosition);
    const yLevel = this.normalizeY(config.yLevel);
    const halfSize = Math.floor(config.size / 2);

    let placedCount = 0;

    for (let x = -halfSize; x <= halfSize; x++) {
      for (let z = -halfSize; z <= halfSize; z++) {
        const position = new Vector3(centerPos.x + x, yLevel, centerPos.z + z);

        // Cross logic - use cross type if on center lines
        const isOnCross = x === 0 || z === 0;
        const blockType = isOnCross ? crossType : centerType;

        const shouldPlace = !hasBlock(position) || config.replaceExisting;

        if (shouldPlace) {
          const success = addBlock(position, blockType, "floor_manager");
          if (success) {
            placedCount++;
          }
        }
      }
    }

    devLog(`FloorManager: Placed ${placedCount} cross floor blocks`);
    return placedCount > 0;
  }

  /**
   * Places a diagonal pattern floor
   */
  public placeDiagonalFloor(
    primaryType: BlockType,
    secondaryType: BlockType,
    config: Omit<FloorConfiguration, "blockType" | "pattern">,
  ): boolean {
    const store = useWorldStore.getState();
    const { addBlock, hasBlock } = store;

    const centerPos = this.normalizeCenter(config.centerPosition);
    const yLevel = this.normalizeY(config.yLevel);
    const halfSize = Math.floor(config.size / 2);

    let placedCount = 0;

    for (let x = -halfSize; x <= halfSize; x++) {
      for (let z = -halfSize; z <= halfSize; z++) {
        const position = new Vector3(centerPos.x + x, yLevel, centerPos.z + z);

        // Diagonal logic - use different type based on diagonal lines
        const isDiagonal = (x + z) % 4 === 0;
        const blockType = isDiagonal ? primaryType : secondaryType;

        const shouldPlace = !hasBlock(position) || config.replaceExisting;

        if (shouldPlace) {
          const success = addBlock(position, blockType, "floor_manager");
          if (success) {
            placedCount++;
          }
        }
      }
    }

    devLog(`FloorManager: Placed ${placedCount} diagonal floor blocks`);
    return placedCount > 0;
  }

  /**
   * Places floor based on a custom pattern array
   */
  public placeCustomPatternFloor(
    config: FloorConfiguration & { customPattern: BlockType[] },
  ): boolean {
    if (!config.customPattern || config.customPattern.length === 0) {
      devWarn("FloorManager: Custom pattern is empty");
      return false;
    }

    const store = useWorldStore.getState();
    const { addBlock, hasBlock } = store;

    const patternSize = Math.sqrt(config.customPattern.length);
    if (patternSize !== Math.floor(patternSize)) {
      devWarn("FloorManager: Custom pattern must be a perfect square");
      return false;
    }

    const centerPos = this.normalizeCenter(config.centerPosition);
    const yLevel = this.normalizeY(config.yLevel);
    const halfPattern = Math.floor(patternSize / 2);

    let placedCount = 0;

    for (let i = 0; i < config.customPattern.length; i++) {
      const patternX = (i % patternSize) - halfPattern;
      const patternZ = Math.floor(i / patternSize) - halfPattern;

      const position = new Vector3(
        centerPos.x + patternX,
        yLevel,
        centerPos.z + patternZ,
      );

      const blockType = config.customPattern[i];
      const shouldPlace = !hasBlock(position) || config.replaceExisting;

      if (shouldPlace) {
        const success = addBlock(position, blockType, "floor_manager");
        if (success) {
          placedCount++;
        }
      }
    }

    devLog(`FloorManager: Placed ${placedCount} custom pattern floor blocks`);
    return placedCount > 0;
  }

  /**
   * Clears floor blocks in a specified region
   */
  public clearFloor(region: FloorRegion): boolean {
    const store = useWorldStore.getState();
    const { removeBlock } = store;

    let removedCount = 0;

    for (let x = region.minX; x <= region.maxX; x++) {
      for (let z = region.minZ; z <= region.maxZ; z++) {
        const position = new Vector3(x, region.yLevel, z);
        const success = removeBlock(position, "floor_manager");
        if (success) {
          removedCount++;
        }
      }
    }

    devLog(`FloorManager: Removed ${removedCount} floor blocks`);
    return removedCount > 0;
  }

  /**
   * Fills holes in an existing floor
   */
  public fillFloorHoles(region: FloorRegion, blockType: BlockType): boolean {
    const store = useWorldStore.getState();
    const { addBlock, hasBlock } = store;

    let filledCount = 0;

    for (let x = region.minX; x <= region.maxX; x++) {
      for (let z = region.minZ; z <= region.maxZ; z++) {
        const position = new Vector3(x, region.yLevel, z);

        if (!hasBlock(position)) {
          const success = addBlock(position, blockType, "floor_manager");
          if (success) {
            filledCount++;
          }
        }
      }
    }

    devLog(`FloorManager: Filled ${filledCount} holes in floor`);
    return filledCount > 0;
  }

  /**
   * Places a floor based on the configuration pattern type
   */
  public placeFloor(config: FloorConfiguration): boolean {
    if (!FloorManager.beginOperation()) {
      devWarn("FloorManager: Operation already in progress or rate-limited");
      return false;
    }
    try {
      switch (config.pattern) {
        case "solid":
          return this.placeSolidFloor(config);

        case "checkerboard":
          return this.placeCheckerboardFloor(
            config.blockType,
            BlockType.WOOD, // Default secondary type
            config,
          );

        case "border":
          return this.placeBorderFloor(
            config.blockType,
            BlockType.STONE, // Default border type
            config,
          );

        case "cross":
          return this.placeCrossFloor(
            config.blockType,
            BlockType.FROSTED_GLASS, // Default cross type
            config,
          );

        case "diagonal":
          return this.placeDiagonalFloor(
            config.blockType,
            BlockType.WOOD, // Default secondary type
            config,
          );

        case "custom":
          if (config.customPattern) {
            return this.placeCustomPatternFloor(
              config as FloorConfiguration & { customPattern: BlockType[] },
            );
          }
          devWarn(
            "FloorManager: Custom pattern specified but customPattern array not provided",
          );
          return false;

        default:
          return this.placeSolidFloor(config);
      }
    } finally {
      FloorManager.endOperation();
    }
  }

  /**
   * Quick method to place a simple stone floor covering the current grid
   */
  public placeDefaultFloor(size: number = 50): boolean {
    return this.placeFloor({
      blockType: BlockType.STONE,
      pattern: "solid",
      size: size,
      centerPosition: new Vector3(0, 0, 0),
      yLevel: floorDepthManager.getFloorPlacementY(), // Use configurable floor depth
      replaceExisting: false,
      fillHoles: true,
    });
  }

  /**
   * Creates a decorative floor with mixed patterns
   */
  public placeDecorativeFloor(size: number = 50): boolean {
    // First place a stone base
    const baseSuccess = this.placeSolidFloor({
      blockType: BlockType.STONE,
      size: size,
      centerPosition: new Vector3(0, 0, 0),
      yLevel: floorDepthManager.getFloorPlacementY(),
      replaceExisting: false,
    });

    // Then add a decorative pattern on top
    const decorativeSuccess = this.placeCheckerboardFloor(
      BlockType.WOOD,
      BlockType.FROSTED_GLASS,
      {
        size: Math.floor(size * 0.8), // Slightly smaller decorative area
        centerPosition: new Vector3(0, 0, 0),
        yLevel: floorDepthManager.getFloorPlacementY(),
        replaceExisting: false,
      },
    );

    return baseSuccess || decorativeSuccess;
  }
}

// Export singleton instance
export const floorManager = FloorManager.getInstance();

// Convenience functions for common operations
export const quickFloorUtils = {
  placeStoneFloor: (size: number = 50) => floorManager.placeDefaultFloor(size),

  placeGlassFloor: (size: number = 50) =>
    floorManager.placeFloor({
      blockType: BlockType.FROSTED_GLASS,
      pattern: "solid",
      size: size,
      yLevel: floorDepthManager.getFloorPlacementY(),
      replaceExisting: false,
    }),

  placeWoodFloor: (size: number = 50) =>
    floorManager.placeFloor({
      blockType: BlockType.WOOD,
      pattern: "solid",
      size: size,
      yLevel: floorDepthManager.getFloorPlacementY(),
      replaceExisting: false,
    }),

  placeCheckerFloor: (size: number = 50) =>
    floorManager.placeFloor({
      blockType: BlockType.STONE,
      pattern: "checkerboard",
      size,
      yLevel: floorDepthManager.getFloorPlacementY(),
      replaceExisting: false,
    }),

  clearFloorArea: (size: number = 50) =>
    floorManager.clearFloor({
      minX: -Math.floor(size / 2),
      maxX: Math.floor(size / 2),
      minZ: -Math.floor(size / 2),
      maxZ: Math.floor(size / 2),
      yLevel: floorDepthManager.getFloorPlacementY(),
    }),
};
