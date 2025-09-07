/**
 * Archipelago Presets - Beautiful Pre-configured Island Chains
 *
 * Collection of carefully crafted presets for generating stunning archipelagos
 * with different themes, patterns, and characteristics. Each preset is optimized
 * for visual appeal and performance.
 */

import { BlockType } from '../../../types/blocks';
import {
  ArchipelagoConfig,
  ArchipelagoPattern,
  IslandType,
  createDefaultArchipelagoConfig,
} from './ArchipelagoGenerator';

/**
 * Preset categories for different archipelago styles
 */
export type PresetCategory = 'tropical' | 'mystical' | 'volcanic' | 'arctic' | 'fantasy' | 'minimalist';

/**
 * Preset metadata
 */
export interface ArchipelagoPreset {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  config: Partial<ArchipelagoConfig>;
  recommendedGridSize: number;
  estimatedBlocks: number;
  difficulty: 'easy' | 'medium' | 'complex';
  tags: string[];
}

/**
 * Complete preset collection
 */
export const ARCHIPELAGO_PRESETS: Record<string, ArchipelagoPreset> = {
  // TROPICAL PARADISE COLLECTION
  tropical_paradise: {
    id: 'tropical_paradise',
    name: '🌴 Tropical Paradise',
    description: 'Lush tropical islands in a perfect circle, ideal for vacation vibes',
    category: 'tropical',
    difficulty: 'easy',
    recommendedGridSize: 256,
    estimatedBlocks: 18000,
    tags: ['beginner', 'circular', 'smooth', 'tropical'],
    config: {
      pattern: 'circular',
      islandCount: 5,
      minIslandRadius: 30,
      maxIslandRadius: 50,
      coastlineSmoothing: 0.9,
      islandBlending: 0.7,
      patternParams: {
        radius: 80
      },
      globalNoiseConfig: {
        baseFrequency: 0.6,
        ridgeFrequency: 1.0,
        erosionFrequency: 1.5,
        octaves: 4,
        lacunarity: 2.0,
        gain: 0.4,
        erosionStrength: 0.15,
        smoothingPasses: 6
      },
      biomeMapping: {
        tropical: [BlockType.LEAF, BlockType.WOOD, BlockType.STONE],
        temperate: [BlockType.WOOD, BlockType.LEAF, BlockType.STONE],
        volcanic: [BlockType.STONE, BlockType.WOOD, BlockType.LEAF],
        arctic: [BlockType.WOOD, BlockType.STONE, BlockType.LEAF],
        desert: [BlockType.WOOD, BlockType.STONE, BlockType.LEAF],
        mystical: [BlockType.LEAF, BlockType.WOOD, BlockType.STONE]
      }
    }
  },

  palm_chain: {
    id: 'palm_chain',
    name: '🥥 Palm Island Chain',
    description: 'Connected tropical islands forming a natural chain',
    category: 'tropical',
    difficulty: 'medium',
    recommendedGridSize: 320,
    estimatedBlocks: 22000,
    tags: ['chain', 'connected', 'tropical', 'large'],
    config: {
      pattern: 'chain',
      islandCount: 7,
      minIslandRadius: 25,
      maxIslandRadius: 40,
      minIslandDistance: 10,
      coastlineSmoothing: 0.85,
      islandBlending: 0.9,
      globalNoiseConfig: {
        baseFrequency: 0.8,
        ridgeFrequency: 1.2,
        erosionFrequency: 2.0,
        octaves: 5,
        lacunarity: 2.1,
        gain: 0.45,
        erosionStrength: 0.2,
        smoothingPasses: 5
      },
      biomeMapping: {
        tropical: [BlockType.LEAF, BlockType.WOOD],
        temperate: [BlockType.LEAF, BlockType.WOOD],
        volcanic: [BlockType.LEAF, BlockType.WOOD],
        arctic: [BlockType.LEAF, BlockType.WOOD],
        desert: [BlockType.LEAF, BlockType.WOOD],
        mystical: [BlockType.LEAF, BlockType.WOOD]
      }
    }
  },

  // MYSTICAL COLLECTION
  mystic_spiral: {
    id: 'mystic_spiral',
    name: '✨ Mystic Spiral',
    description: 'Enchanted islands arranged in a mystical spiral pattern',
    category: 'mystical',
    difficulty: 'medium',
    recommendedGridSize: 384,
    estimatedBlocks: 25000,
    tags: ['spiral', 'mystical', 'enchanted', 'unique'],
    config: {
      pattern: 'spiral',
      islandCount: 8,
      minIslandRadius: 20,
      maxIslandRadius: 45,
      coastlineSmoothing: 0.75,
      islandBlending: 0.6,
      patternParams: {
        spiralTightness: 0.7
      },
      globalNoiseConfig: {
        baseFrequency: 1.0,
        ridgeFrequency: 1.8,
        erosionFrequency: 2.5,
        octaves: 6,
        lacunarity: 2.2,
        gain: 0.5,
        erosionStrength: 0.3,
        smoothingPasses: 4
      },
      biomeMapping: {
        mystical: [BlockType.NUMBER_7, BlockType.FROSTED_GLASS, BlockType.NUMBER_6],
        tropical: [BlockType.FROSTED_GLASS, BlockType.LEAF, BlockType.NUMBER_7],
        temperate: [BlockType.NUMBER_6, BlockType.WOOD, BlockType.FROSTED_GLASS],
        volcanic: [BlockType.NUMBER_4, BlockType.NUMBER_6, BlockType.STONE],
        arctic: [BlockType.FROSTED_GLASS, BlockType.NUMBER_7, BlockType.STONE],
        desert: [BlockType.NUMBER_5, BlockType.NUMBER_6, BlockType.STONE]
      }
    }
  },

  crystal_cluster: {
    id: 'crystal_cluster',
    name: '💎 Crystal Cluster',
    description: 'Tight cluster of crystalline islands with magical properties',
    category: 'mystical',
    difficulty: 'complex',
    recommendedGridSize: 256,
    estimatedBlocks: 20000,
    tags: ['cluster', 'crystal', 'dense', 'magical'],
    config: {
      pattern: 'cluster',
      islandCount: 9,
      minIslandRadius: 18,
      maxIslandRadius: 35,
      minIslandDistance: 8,
      coastlineSmoothing: 0.6,
      islandBlending: 0.95,
      patternParams: {
        clusterDensity: 0.9
      },
      globalNoiseConfig: {
        baseFrequency: 1.2,
        ridgeFrequency: 2.0,
        erosionFrequency: 3.0,
        octaves: 5,
        lacunarity: 2.3,
        gain: 0.6,
        erosionStrength: 0.25,
        smoothingPasses: 3
      },
      biomeMapping: {
        mystical: [BlockType.FROSTED_GLASS, BlockType.NUMBER_7, BlockType.NUMBER_6],
        arctic: [BlockType.FROSTED_GLASS, BlockType.NUMBER_7],
        tropical: [BlockType.NUMBER_6, BlockType.FROSTED_GLASS],
        temperate: [BlockType.NUMBER_7, BlockType.FROSTED_GLASS],
        volcanic: [BlockType.NUMBER_4, BlockType.FROSTED_GLASS],
        desert: [BlockType.NUMBER_5, BlockType.FROSTED_GLASS]
      }
    }
  },

  // VOLCANIC COLLECTION
  fire_ring: {
    id: 'fire_ring',
    name: '🌋 Ring of Fire',
    description: 'Volcanic islands forming a dramatic ring around a central lagoon',
    category: 'volcanic',
    difficulty: 'medium',
    recommendedGridSize: 320,
    estimatedBlocks: 26000,
    tags: ['volcanic', 'ring', 'dramatic', 'fire'],
    config: {
      pattern: 'circular',
      islandCount: 6,
      minIslandRadius: 35,
      maxIslandRadius: 55,
      coastlineSmoothing: 0.7,
      islandBlending: 0.5,
      patternParams: {
        radius: 100
      },
      globalNoiseConfig: {
        baseFrequency: 0.7,
        ridgeFrequency: 2.5,
        erosionFrequency: 1.8,
        octaves: 6,
        lacunarity: 2.0,
        gain: 0.6,
        erosionStrength: 0.4,
        smoothingPasses: 3
      },
      biomeMapping: {
        volcanic: [BlockType.STONE, BlockType.NUMBER_4, BlockType.NUMBER_6],
        desert: [BlockType.NUMBER_5, BlockType.STONE, BlockType.NUMBER_4],
        mystical: [BlockType.NUMBER_6, BlockType.NUMBER_4, BlockType.STONE],
        temperate: [BlockType.STONE, BlockType.WOOD, BlockType.NUMBER_4],
        tropical: [BlockType.STONE, BlockType.NUMBER_4, BlockType.WOOD],
        arctic: [BlockType.STONE, BlockType.FROSTED_GLASS, BlockType.NUMBER_4]
      }
    }
  },

  // ARCTIC COLLECTION
  frozen_archipelago: {
    id: 'frozen_archipelago',
    name: '❄️ Frozen Archipelago',
    description: 'Pristine ice islands with crystal-clear formations',
    category: 'arctic',
    difficulty: 'easy',
    recommendedGridSize: 288,
    estimatedBlocks: 16000,
    tags: ['arctic', 'ice', 'clean', 'pristine'],
    config: {
      pattern: 'random',
      islandCount: 6,
      minIslandRadius: 28,
      maxIslandRadius: 42,
      coastlineSmoothing: 0.95,
      islandBlending: 0.8,
      globalNoiseConfig: {
        baseFrequency: 0.5,
        ridgeFrequency: 0.8,
        erosionFrequency: 1.2,
        octaves: 3,
        lacunarity: 1.8,
        gain: 0.3,
        erosionStrength: 0.1,
        smoothingPasses: 8
      },
      biomeMapping: {
        arctic: [BlockType.FROSTED_GLASS, BlockType.STONE, BlockType.WOOD],
        mystical: [BlockType.FROSTED_GLASS, BlockType.NUMBER_7],
        temperate: [BlockType.FROSTED_GLASS, BlockType.STONE],
        tropical: [BlockType.FROSTED_GLASS, BlockType.STONE],
        volcanic: [BlockType.STONE, BlockType.FROSTED_GLASS],
        desert: [BlockType.STONE, BlockType.FROSTED_GLASS]
      }
    }
  },

  // FANTASY COLLECTION
  rainbow_islands: {
    id: 'rainbow_islands',
    name: '🌈 Rainbow Islands',
    description: 'Colorful fantasy islands with diverse magical blocks',
    category: 'fantasy',
    difficulty: 'complex',
    recommendedGridSize: 360,
    estimatedBlocks: 28000,
    tags: ['fantasy', 'colorful', 'diverse', 'magical'],
    config: {
      pattern: 'circular',
      islandCount: 7,
      minIslandRadius: 32,
      maxIslandRadius: 48,
      coastlineSmoothing: 0.8,
      islandBlending: 0.7,
      patternParams: {
        radius: 90
      },
      globalNoiseConfig: {
        baseFrequency: 0.9,
        ridgeFrequency: 1.5,
        erosionFrequency: 2.2,
        octaves: 5,
        lacunarity: 2.1,
        gain: 0.5,
        erosionStrength: 0.25,
        smoothingPasses: 4
      },
      biomeMapping: {
        mystical: [BlockType.NUMBER_7, BlockType.NUMBER_6, BlockType.NUMBER_5, BlockType.NUMBER_4],
        tropical: [BlockType.LEAF, BlockType.NUMBER_5, BlockType.NUMBER_6],
        volcanic: [BlockType.NUMBER_4, BlockType.NUMBER_6, BlockType.STONE],
        arctic: [BlockType.FROSTED_GLASS, BlockType.NUMBER_7, BlockType.NUMBER_6],
        desert: [BlockType.NUMBER_5, BlockType.NUMBER_4, BlockType.STONE],
        temperate: [BlockType.WOOD, BlockType.LEAF, BlockType.NUMBER_6]
      }
    }
  },

  // MINIMALIST COLLECTION
  zen_garden: {
    id: 'zen_garden',
    name: '🧘 Zen Garden',
    description: 'Minimalist stone islands arranged in perfect harmony',
    category: 'minimalist',
    difficulty: 'easy',
    recommendedGridSize: 224,
    estimatedBlocks: 12000,
    tags: ['minimalist', 'zen', 'simple', 'peaceful'],
    config: {
      pattern: 'linear',
      islandCount: 5,
      minIslandRadius: 25,
      maxIslandRadius: 35,
      coastlineSmoothing: 0.95,
      islandBlending: 0.4,
      patternParams: {
        direction: Math.PI / 4
      },
      globalNoiseConfig: {
        baseFrequency: 0.4,
        ridgeFrequency: 0.6,
        erosionFrequency: 0.8,
        octaves: 3,
        lacunarity: 1.8,
        gain: 0.3,
        erosionStrength: 0.05,
        smoothingPasses: 6
      },
      biomeMapping: {
        temperate: [BlockType.STONE, BlockType.WOOD],
        tropical: [BlockType.STONE, BlockType.WOOD],
        volcanic: [BlockType.STONE],
        arctic: [BlockType.STONE, BlockType.FROSTED_GLASS],
        desert: [BlockType.STONE],
        mystical: [BlockType.STONE, BlockType.NUMBER_7]
      }
    }
  },

  // LARGE SCALE COLLECTION
  continental_drift: {
    id: 'continental_drift',
    name: '🌍 Continental Drift',
    description: 'Massive island continents with varied biomes - requires large grid',
    category: 'fantasy',
    difficulty: 'complex',
    recommendedGridSize: 512,
    estimatedBlocks: 45000,
    tags: ['massive', 'continental', 'varied', 'epic'],
    config: {
      pattern: 'random',
      islandCount: 4,
      minIslandRadius: 60,
      maxIslandRadius: 90,
      minIslandDistance: 40,
      coastlineSmoothing: 0.85,
      islandBlending: 0.6,
      globalNoiseConfig: {
        baseFrequency: 0.3,
        ridgeFrequency: 0.8,
        erosionFrequency: 1.5,
        octaves: 7,
        lacunarity: 2.0,
        gain: 0.5,
        erosionStrength: 0.3,
        smoothingPasses: 5
      },
      useGradientPlacement: true,
      biomeMapping: {
        temperate: [BlockType.WOOD, BlockType.LEAF, BlockType.STONE],
        tropical: [BlockType.LEAF, BlockType.WOOD, BlockType.STONE],
        volcanic: [BlockType.STONE, BlockType.NUMBER_4, BlockType.WOOD],
        arctic: [BlockType.FROSTED_GLASS, BlockType.STONE, BlockType.WOOD],
        desert: [BlockType.NUMBER_5, BlockType.STONE, BlockType.WOOD],
        mystical: [BlockType.NUMBER_6, BlockType.NUMBER_7, BlockType.FROSTED_GLASS]
      }
    }
  }
};

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: PresetCategory): ArchipelagoPreset[] {
  return Object.values(ARCHIPELAGO_PRESETS).filter(preset => preset.category === category);
}

/**
 * Get presets by difficulty
 */
export function getPresetsByDifficulty(difficulty: 'easy' | 'medium' | 'complex'): ArchipelagoPreset[] {
  return Object.values(ARCHIPELAGO_PRESETS).filter(preset => preset.difficulty === difficulty);
}

/**
 * Get presets by tag
 */
export function getPresetsByTag(tag: string): ArchipelagoPreset[] {
  return Object.values(ARCHIPELAGO_PRESETS).filter(preset => preset.tags.includes(tag));
}

/**
 * Get recommended presets for beginners
 */
export function getBeginnerPresets(): ArchipelagoPreset[] {
  return getPresetsByDifficulty('easy').slice(0, 3);
}

/**
 * Get all preset categories
 */
export function getPresetCategories(): PresetCategory[] {
  return ['tropical', 'mystical', 'volcanic', 'arctic', 'fantasy', 'minimalist'];
}

/**
 * Create full config from preset
 */
export function createConfigFromPreset(
  presetId: string,
  overrides?: Partial<ArchipelagoConfig>
): ArchipelagoConfig {
  const preset = ARCHIPELAGO_PRESETS[presetId];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetId}`);
  }

  const baseConfig = createDefaultArchipelagoConfig();
  const presetConfig = preset.config;

  return {
    ...baseConfig,
    ...presetConfig,
    ...overrides,
    gridSize: {
      width: preset.recommendedGridSize,
      height: preset.recommendedGridSize,
      ...overrides?.gridSize
    },
    origin: {
      x: -preset.recommendedGridSize / 2,
      z: -preset.recommendedGridSize / 2,
      ...overrides?.origin
    }
  };
}

/**
 * Get preset performance info
 */
export function getPresetPerformance(presetId: string): {
  estimatedBlocks: number;
  estimatedGenerationTime: number;
  memoryUsage: string;
  performance: 'fast' | 'medium' | 'slow';
} {
  const preset = ARCHIPELAGO_PRESETS[presetId];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetId}`);
  }

  const estimatedGenerationTime = preset.estimatedBlocks * 0.005; // ~5ms per 1000 blocks
  const memoryUsage = `${Math.round(preset.estimatedBlocks * 0.1)}KB`;

  let performance: 'fast' | 'medium' | 'slow';
  if (preset.estimatedBlocks < 15000) {
    performance = 'fast';
  } else if (preset.estimatedBlocks < 30000) {
    performance = 'medium';
  } else {
    performance = 'slow';
  }

  return {
    estimatedBlocks: preset.estimatedBlocks,
    estimatedGenerationTime,
    memoryUsage,
    performance
  };
}
