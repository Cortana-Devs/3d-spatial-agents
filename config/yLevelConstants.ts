/**
 * Y-Level Constants for Descendants Metaverse
 *
 * This module defines consistent Y-level constants to ensure proper alignment
 * between the floor system, player positioning, and block placement systems.
 *
 * These constants resolve the Y-level mismatch that previously caused players
 * to appear floating above floor blocks.
 */

export const Y_LEVEL_CONSTANTS = {
  // Base reference levels
  WORLD_GROUND_PLANE: 0.0, // Absolute world ground reference
  PLAYER_GROUND_LEVEL: 0.5, // Player collision ground level

  // Floor positioning - ADJUSTABLE PARAMETER
  FLOOR_DEPTH_OFFSET: -0.5, // How far below player level to place floor blocks (adjustable)

  // Calculated floor placement (player level + offset)
  get DEFAULT_FLOOR_Y() {
    return this.PLAYER_GROUND_LEVEL + this.FLOOR_DEPTH_OFFSET; // 0.5 + (-0.5) = 0.0
  },

  // Block system constants
  BLOCK_HEIGHT: 1.0, // Standard block height
  BLOCK_CENTER_TO_TOP: 0.5, // Distance from block center to top face
  BLOCK_CENTER_TO_BOTTOM: -0.5, // Distance from block center to bottom face

  // Player system constants
  PLAYER_FOOT_OFFSET: 0.0, // Player foot position relative to collision level
  PLAYER_COLLISION_HEIGHT: 0.5, // Height of player collision boundary

  // Floor system constants
  FLOOR_THICKNESS: 1.0, // Visual thickness of floor blocks
  get FLOOR_TOP_SURFACE() {
    return this.DEFAULT_FLOOR_Y + this.BLOCK_CENTER_TO_TOP; // Should equal PLAYER_GROUND_LEVEL
  },
  FLOOR_PLACEMENT_SNAP: 0.5, // Snap increment for floor placement

  // Camera and avatar constants
  CAMERA_GROUND_CLEARANCE: 0.5, // Minimum camera height above ground
  AVATAR_FOOT_TO_COLLISION: 0.0, // Avatar foot position relative to collision

  // Validation - floor top should match player level
  get IS_PROPERLY_ALIGNED() {
    return Math.abs(this.FLOOR_TOP_SURFACE - this.PLAYER_GROUND_LEVEL) < 0.01;
  },
} as const;

/**
 * Calculated alignment values based on constants
 */
export const Y_LEVEL_ALIGNMENT = {
  // Perfect alignment values - floor top surface should match player ground level
  get FLOOR_TO_PLAYER_MATCH() {
    return Y_LEVEL_CONSTANTS.IS_PROPERLY_ALIGNED;
  },

  // Block top face calculation
  getBlockTopFace: (blockPlacementY: number): number => {
    return blockPlacementY + Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP;
  },

  // Block bottom face calculation
  getBlockBottomFace: (blockPlacementY: number): number => {
    return blockPlacementY + Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_BOTTOM;
  },

  // Floor surface calculation
  getFloorSurface: (floorPlacementY: number): number => {
    return floorPlacementY + Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP;
  },

  // Player foot position
  getPlayerFootLevel: (playerCollisionY: number): number => {
    return playerCollisionY + Y_LEVEL_CONSTANTS.PLAYER_FOOT_OFFSET;
  },

  // Easy adjustment helper - recalculate floor Y for different depths
  calculateFloorYForDepth: (depthBelowPlayer: number): number => {
    return Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL - depthBelowPlayer;
  },
} as const;

/**
 * Validation functions to ensure Y-level consistency
 */
export const Y_LEVEL_VALIDATION = {
  /**
   * Validates that a floor placement Y aligns with player ground level
   */
  validateFloorAlignment: (floorY: number): boolean => {
    const floorSurface = Y_LEVEL_ALIGNMENT.getFloorSurface(floorY);
    return (
      Math.abs(floorSurface - Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL) < 0.01
    );
  },

  /**
   * Validates that a block top face aligns with player walkable level
   */
  validateBlockWalkable: (blockY: number): boolean => {
    const blockTop = Y_LEVEL_ALIGNMENT.getBlockTopFace(blockY);
    return Math.abs(blockTop - Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL) < 0.01;
  },

  /**
   * Snaps Y coordinate to valid placement grid
   */
  snapToValidY: (y: number): number => {
    const snap = Y_LEVEL_CONSTANTS.FLOOR_PLACEMENT_SNAP;
    return Math.round(y / snap) * snap;
  },

  /**
   * Gets the correct floor Y for perfect player alignment
   */
  getAlignedFloorY: (): number => {
    return Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y;
  },

  /**
   * Adjusts floor depth and returns new placement Y
   */
  adjustFloorDepth: (newDepthBelowPlayer: number): number => {
    return Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL - newDepthBelowPlayer;
  },

  /**
   * Checks if player position is properly grounded on a surface
   */
  isPlayerGrounded: (playerY: number, surfaceY: number): boolean => {
    const tolerance = 0.1; // Small tolerance for floating point precision
    return Math.abs(playerY - surfaceY) <= tolerance;
  },
} as const;

/**
 * Migration helpers for updating existing Y levels
 */
export const Y_LEVEL_MIGRATION = {
  /**
   * Converts old floor Y (0) to new aligned Y (0.5)
   */
  migrateOldFloorY: (oldY: number): number => {
    // If old system used Y=0 for floors, that's now correct
    if (oldY === 0) {
      return Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y; // Still 0, no change needed
    }
    // If old system used Y=-0.5 (from docs), convert to Y=0
    if (oldY === -0.5) {
      return Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y;
    }
    // If old system used Y=0.5 (incorrect high placement), convert to Y=0
    if (oldY === 0.5) {
      return Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y;
    }
    // For other values, snap to valid grid
    return Y_LEVEL_VALIDATION.snapToValidY(oldY);
  },

  /**
   * Validates if a Y level needs migration
   */
  needsMigration: (currentY: number): boolean => {
    return !Y_LEVEL_VALIDATION.validateFloorAlignment(currentY);
  },
} as const;

/**
 * Debug helpers for development
 */
export const Y_LEVEL_DEBUG = {
  /**
   * Logs current Y-level alignment status
   */
  logAlignmentStatus: (
    context: string,
    values: Record<string, number>,
  ): void => {
    if (process.env.NODE_ENV === "development") {
      console.group(`🔍 Y-Level Debug: ${context}`);

      Object.entries(values).forEach(([key, value]) => {
        const isAligned =
          Math.abs(value - Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL) < 0.01;
        console.log(`${key}: ${value} ${isAligned ? "✅" : "❌"}`);
      });

      console.log(`Target alignment: ${Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL}`);
      console.groupEnd();
    }
  },

  /**
   * Visual indicator positions for debugging in 3D space
   */
  getDebugIndicators: () => ({
    groundPlane: Y_LEVEL_CONSTANTS.WORLD_GROUND_PLANE,
    playerGroundLevel: Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL,
    defaultFloorY: Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y,
    floorSurface: Y_LEVEL_ALIGNMENT.getFloorSurface(
      Y_LEVEL_CONSTANTS.DEFAULT_FLOOR_Y,
    ),
  }),
} as const;

/**
 * Type definitions for Y-level operations
 */
export type YLevelContext = "floor" | "block" | "player" | "avatar" | "camera";

export interface YLevelPosition {
  y: number;
  context: YLevelContext;
  isAligned: boolean;
  suggestedY?: number;
}

/**
 * Utility function to create validated Y-level positions
 */
export const createYLevelPosition = (
  y: number,
  context: YLevelContext,
): YLevelPosition => {
  let isAligned = false;
  let suggestedY: number | undefined;

  switch (context) {
    case "floor":
      isAligned = Y_LEVEL_VALIDATION.validateFloorAlignment(y);
      if (!isAligned) {
        suggestedY = Y_LEVEL_VALIDATION.getAlignedFloorY();
      }
      break;

    case "block":
      isAligned = Y_LEVEL_VALIDATION.validateBlockWalkable(y);
      if (!isAligned) {
        suggestedY =
          Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL -
          Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP;
      }
      break;

    case "player":
    case "avatar":
    case "camera":
      isAligned = Math.abs(y - Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL) < 0.01;
      if (!isAligned) {
        suggestedY = Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL;
      }
      break;
  }

  return {
    y,
    context,
    isAligned,
    suggestedY,
  };
};

// Export all constants as default for convenience
export default {
  CONSTANTS: Y_LEVEL_CONSTANTS,
  ALIGNMENT: Y_LEVEL_ALIGNMENT,
  VALIDATION: Y_LEVEL_VALIDATION,
  MIGRATION: Y_LEVEL_MIGRATION,
  DEBUG: Y_LEVEL_DEBUG,
  createPosition: createYLevelPosition,
} as const;
