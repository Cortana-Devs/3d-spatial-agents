/**
 * Floor Depth Configuration Utility
 *
 * This module provides an easy-to-use interface for adjusting floor depth
 * relative to player ground level. The floor depth determines how far below
 * the player's feet the floor blocks are placed.
 */

import { Y_LEVEL_CONSTANTS } from './yLevelConstants';
import { devLog } from "@/utils/devLogger";

// Configuration interface for floor depth settings
export interface FloorDepthConfig {
  // How far below player level to place floor blocks
  depthBelowPlayer: number;

  // Description of the configuration
  description: string;

  // Whether this is the default setting
  isDefault: boolean;

  // Calculated floor placement Y level
  floorPlacementY: number;

  // Calculated floor top surface Y level
  floorTopSurfaceY: number;

  // Whether this configuration aligns with player collision
  isAligned: boolean;
}

// Predefined floor depth configurations
export const FLOOR_DEPTH_PRESETS: Record<string, FloorDepthConfig> = {
  // Default: Floor blocks placed 0.5 units below player level
  DEFAULT: {
    depthBelowPlayer: 0.5,
    description: "Standard floor depth - blocks placed 0.5 units below player level",
    isDefault: true,
    get floorPlacementY() { return Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL - this.depthBelowPlayer; },
    get floorTopSurfaceY() { return this.floorPlacementY + Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP; },
    get isAligned() { return Math.abs(this.floorTopSurfaceY - Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL) < 0.01; }
  },

  // Shallow: Floor blocks placed 0.25 units below player level
  SHALLOW: {
    depthBelowPlayer: 0.25,
    description: "Shallow floor depth - blocks placed 0.25 units below player level",
    isDefault: false,
    get floorPlacementY() { return Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL - this.depthBelowPlayer; },
    get floorTopSurfaceY() { return this.floorPlacementY + Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP; },
    get isAligned() { return Math.abs(this.floorTopSurfaceY - Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL) < 0.01; }
  },

  // Deep: Floor blocks placed 1.0 unit below player level
  DEEP: {
    depthBelowPlayer: 1.0,
    description: "Deep floor depth - blocks placed 1.0 unit below player level",
    isDefault: false,
    get floorPlacementY() { return Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL - this.depthBelowPlayer; },
    get floorTopSurfaceY() { return this.floorPlacementY + Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP; },
    get isAligned() { return Math.abs(this.floorTopSurfaceY - Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL) < 0.01; }
  },

  // Flush: Floor blocks placed so their top is exactly at player level
  FLUSH: {
    depthBelowPlayer: 0.5,
    description: "Flush floor - top surface exactly at player collision level",
    isDefault: false,
    get floorPlacementY() { return Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL - Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP; },
    get floorTopSurfaceY() { return this.floorPlacementY + Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP; },
    get isAligned() { return Math.abs(this.floorTopSurfaceY - Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL) < 0.01; }
  }
};

// Current active floor depth configuration is managed by FloorDepthManager singleton

/**
 * Floor Depth Manager - Controls floor positioning relative to player level
 */
export class FloorDepthManager {
  private static instance: FloorDepthManager;
  private currentConfig: FloorDepthConfig = FLOOR_DEPTH_PRESETS.DEFAULT;
  private listeners: Array<(config: FloorDepthConfig) => void> = [];

  private constructor() {}

  public static getInstance(): FloorDepthManager {
    if (!FloorDepthManager.instance) {
      FloorDepthManager.instance = new FloorDepthManager();
    }
    return FloorDepthManager.instance;
  }

  /**
   * Get current floor depth configuration
   */
  getCurrentConfig(): FloorDepthConfig {
    return this.currentConfig;
  }

  /**
   * Set floor depth using a preset
   */
  setPreset(presetName: keyof typeof FLOOR_DEPTH_PRESETS): boolean {
    const preset = FLOOR_DEPTH_PRESETS[presetName];
    if (!preset) {
      devLog(`Floor depth preset "${presetName}" not found`);
      return false;
    }

    this.currentConfig = preset;
    this.notifyListeners();
    devLog(`Floor depth set to: ${preset.description}`);
    return true;
  }

  /**
   * Set custom floor depth
   */
  setCustomDepth(depthBelowPlayer: number, description?: string): FloorDepthConfig {
    const customConfig: FloorDepthConfig = {
      depthBelowPlayer,
      description: description || `Custom floor depth: ${depthBelowPlayer} units below player`,
      isDefault: false,
      get floorPlacementY() { return Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL - this.depthBelowPlayer; },
      get floorTopSurfaceY() { return this.floorPlacementY + Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP; },
      get isAligned() { return Math.abs(this.floorTopSurfaceY - Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL) < 0.01; }
    };

    this.currentConfig = customConfig;
    this.notifyListeners();
    devLog(`Custom floor depth set: ${customConfig.description}`);
    return customConfig;
  }

  /**
   * Get floor placement Y for current configuration
   */
  getFloorPlacementY(): number {
    return this.currentConfig.floorPlacementY;
  }

  /**
   * Get floor top surface Y for current configuration
   */
  getFloorTopSurfaceY(): number {
    return this.currentConfig.floorTopSurfaceY;
  }

  /**
   * Check if current configuration aligns with player collision
   */
  isCurrentConfigAligned(): boolean {
    return this.currentConfig.isAligned;
  }

  /**
   * Get all available presets
   */
  getAvailablePresets(): Record<string, FloorDepthConfig> {
    return FLOOR_DEPTH_PRESETS;
  }

  /**
   * Subscribe to configuration changes
   */
  onConfigChange(listener: (config: FloorDepthConfig) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of configuration change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentConfig));
  }

  /**
   * Validate a potential floor depth configuration
   */
  validateDepthConfig(depthBelowPlayer: number): {
    isValid: boolean;
    warnings: string[];
    floorY: number;
    topSurfaceY: number;
    isAligned: boolean;
  } {
    const warnings: string[] = [];
    let isValid = true;

    // Check for reasonable depth values
    if (depthBelowPlayer < 0) {
      warnings.push("Negative depth will place floors above player level");
      isValid = false;
    }

    if (depthBelowPlayer > 2.0) {
      warnings.push("Very deep floors may cause visual issues");
    }

    if (depthBelowPlayer < 0.1) {
      warnings.push("Very shallow floors may cause collision issues");
    }

    const floorY = Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL - depthBelowPlayer;
    const topSurfaceY = floorY + Y_LEVEL_CONSTANTS.BLOCK_CENTER_TO_TOP;
    const isAligned = Math.abs(topSurfaceY - Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL) < 0.01;

    if (!isAligned) {
      warnings.push(`Floor top surface (${topSurfaceY}) will not align with player level (${Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL})`);
    }

    return {
      isValid,
      warnings,
      floorY,
      topSurfaceY,
      isAligned
    };
  }

  /**
   * Reset to default configuration
   */
  resetToDefault(): void {
    this.setPreset('DEFAULT');
  }

  /**
   * Get configuration summary for debugging
   */
  getConfigSummary(): string {
    const config = this.currentConfig;
    return `
Floor Depth Configuration:
- Description: ${config.description}
- Depth below player: ${config.depthBelowPlayer} units
- Floor placement Y: ${config.floorPlacementY}
- Floor top surface Y: ${config.floorTopSurfaceY}
- Player collision Y: ${Y_LEVEL_CONSTANTS.PLAYER_GROUND_LEVEL}
- Aligned: ${config.isAligned ? '✅' : '❌'}
    `.trim();
  }
}

// Export singleton instance
export const floorDepthManager = FloorDepthManager.getInstance();

// Convenience functions for easy access
export const floorDepthUtils = {
  /**
   * Quickly set floor depth to a specific value
   */
  setDepth: (depthBelowPlayer: number) => {
    return floorDepthManager.setCustomDepth(depthBelowPlayer);
  },

  /**
   * Get current floor placement Y
   */
  getCurrentFloorY: () => {
    return floorDepthManager.getFloorPlacementY();
  },

  /**
   * Check if floors are properly aligned
   */
  isAligned: () => {
    return floorDepthManager.isCurrentConfigAligned();
  },

  /**
   * Use preset configuration
   */
  usePreset: (presetName: keyof typeof FLOOR_DEPTH_PRESETS) => {
    return floorDepthManager.setPreset(presetName);
  },

  /**
   * Quick validation of depth value
   */
  validateDepth: (depth: number) => {
    return floorDepthManager.validateDepthConfig(depth);
  },

  /**
   * Get human-readable summary
   */
  getSummary: () => {
    return floorDepthManager.getConfigSummary();
  }
};

// Default export
const floorDepthExports = {
  manager: floorDepthManager,
  utils: floorDepthUtils,
  presets: FLOOR_DEPTH_PRESETS,
  FloorDepthManager
};

export default floorDepthExports;
