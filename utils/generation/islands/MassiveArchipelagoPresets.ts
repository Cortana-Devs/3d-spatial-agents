/**
 * Massive Archipelago Presets
 *
 * Predefined configurations for generating massive archipelagos with
 * different themes, sizes, and performance characteristics.
 * Each preset is optimized for specific use cases and visual styles.
 */

import {
  MassiveArchipelagoConfig,
  IslandBiome,
  createDefaultMassiveConfig,
} from "./MassiveArchipelagoGenerator";

/**
 * Preset categories for organization
 */
export type MassivePresetCategory =
  | "performance" // Optimized for best performance
  | "epic" // Massive scale, high detail
  | "scenic" // Beautiful, balanced for screenshots
  | "experimental"; // Cutting-edge features

/**
 * Massive archipelago preset definition
 */
export interface MassiveArchipelagoPreset {
  id: string;
  name: string;
  description: string;
  category: MassivePresetCategory;
  difficulty: "easy" | "medium" | "hard" | "extreme";
  estimatedBlocks: number;
  estimatedMemoryMB: number;
  recommendedWorldSize: number;
  tags: string[];
  config: Partial<MassiveArchipelagoConfig>;
  performance: {
    generationTimeSeconds: number;
    memoryUsageMB: number;
    recommendedMinRAM: number;
  };
}

/**
 * Collection of massive archipelago presets
 */
export const MASSIVE_ARCHIPELAGO_PRESETS: Record<
  string,
  MassiveArchipelagoPreset
> = {
  // PERFORMANCE CATEGORY - Optimized for speed and low memory usage
  world_limit_optimized: {
    id: "world_limit_optimized",
    name: "World Limit Optimized",
    description:
      "Designed for 1000-block worlds - creates stunning landscapes within tight limits",
    category: "performance",
    difficulty: "easy",
    estimatedBlocks: 950,
    estimatedMemoryMB: 64,
    recommendedWorldSize: 512,
    tags: ["1000-blocks", "optimized", "compact", "priority-filtering"],
    config: {
      worldSize: { width: 512, height: 512 },
      islandCount: { min: 2, max: 3 },
      islandRadius: { min: 80, max: 120 },
      minIslandDistance: 150,
      maxLoadedChunks: 50,
      chunkSize: 16,
      maxTerrainHeight: 30,
      biomeWeights: {
        mega_tropical: 0.4,
        temperate_giant: 0.3,
        coral_atoll: 0.2,
        mystical_realm: 0.1,
        volcanic_massive: 0,
        arctic_continent: 0,
        desert_plateau: 0,
        mountain_range: 0,
      },
      terrainAmplification: 0.8,
    },
    performance: {
      generationTimeSeconds: 5,
      memoryUsageMB: 64,
      recommendedMinRAM: 4,
    },
  },

  performance_islands: {
    id: "performance_islands",
    name: "Performance Islands",
    description:
      "Small but mighty - 5 medium islands optimized for excellent performance",
    category: "performance",
    difficulty: "easy",
    estimatedBlocks: 50000,
    estimatedMemoryMB: 128,
    recommendedWorldSize: 1536,
    tags: ["fast", "low-memory", "beginner-friendly"],
    config: {
      worldSize: { width: 1536, height: 1536 },
      islandCount: { min: 5, max: 6 },
      islandRadius: { min: 150, max: 250 },
      minIslandDistance: 200,
      maxLoadedChunks: 200,
      chunkSize: 32,
      biomeWeights: {
        temperate_giant: 0.4,
        mega_tropical: 0.3,
        volcanic_massive: 0.2,
        coral_atoll: 0.1,
        arctic_continent: 0,
        desert_plateau: 0,
        mystical_realm: 0,
        mountain_range: 0,
      },
    },
    performance: {
      generationTimeSeconds: 15,
      memoryUsageMB: 128,
      recommendedMinRAM: 8,
    },
  },

  // EPIC CATEGORY - Maximum scale and detail
  titan_archipelago: {
    id: "titan_archipelago",
    name: "Titan Archipelago",
    description:
      "Colossal landmasses - 8-10 massive islands with mountain ranges and varied biomes",
    category: "epic",
    difficulty: "extreme",
    estimatedBlocks: 500000,
    estimatedMemoryMB: 1024,
    recommendedWorldSize: 4096,
    tags: ["massive", "detailed", "epic-scale", "memory-intensive"],
    config: {
      worldSize: { width: 4096, height: 4096 },
      islandCount: { min: 8, max: 10 },
      islandRadius: { min: 400, max: 600 },
      minIslandDistance: 500,
      maxTerrainHeight: 300,
      maxLoadedChunks: 1000,
      chunkSize: 64,
      biomeWeights: {
        mountain_range: 0.25,
        temperate_giant: 0.2,
        volcanic_massive: 0.15,
        arctic_continent: 0.15,
        mega_tropical: 0.1,
        desert_plateau: 0.1,
        mystical_realm: 0.05,
        coral_atoll: 0,
      },
      biomeTransitionSize: 100,
      terrainAmplification: 2.0,
    },
    performance: {
      generationTimeSeconds: 120,
      memoryUsageMB: 1024,
      recommendedMinRAM: 16,
    },
  },

  volcanic_chain: {
    id: "volcanic_chain",
    name: "Volcanic Island Chain",
    description:
      "A dramatic chain of volcanic islands with lava flows and ash fields",
    category: "epic",
    difficulty: "hard",
    estimatedBlocks: 300000,
    estimatedMemoryMB: 512,
    recommendedWorldSize: 3072,
    tags: ["volcanic", "dramatic", "fire", "challenging"],
    config: {
      worldSize: { width: 3072, height: 3072 },
      islandCount: { min: 6, max: 8 },
      islandRadius: { min: 250, max: 450 },
      minIslandDistance: 300,
      maxTerrainHeight: 250,
      biomeWeights: {
        volcanic_massive: 0.5,
        desert_plateau: 0.2,
        mountain_range: 0.2,
        mystical_realm: 0.1,
        temperate_giant: 0,
        mega_tropical: 0,
        arctic_continent: 0,
        coral_atoll: 0,
      },
      terrainAmplification: 1.8,
    },
    performance: {
      generationTimeSeconds: 60,
      memoryUsageMB: 512,
      recommendedMinRAM: 12,
    },
  },

  // SCENIC CATEGORY - Beautiful, balanced configurations
  paradise_islands: {
    id: "paradise_islands",
    name: "Paradise Islands",
    description:
      "Tropical paradise with crystal-clear waters, coral atolls, and lush vegetation",
    category: "scenic",
    difficulty: "medium",
    estimatedBlocks: 200000,
    estimatedMemoryMB: 384,
    recommendedWorldSize: 2560,
    tags: ["tropical", "beautiful", "relaxing", "colorful"],
    config: {
      worldSize: { width: 2560, height: 2560 },
      islandCount: { min: 6, max: 8 },
      islandRadius: { min: 200, max: 400 },
      minIslandDistance: 250,
      maxTerrainHeight: 150,
      biomeWeights: {
        mega_tropical: 0.4,
        coral_atoll: 0.3,
        temperate_giant: 0.2,
        mystical_realm: 0.1,
        volcanic_massive: 0,
        arctic_continent: 0,
        desert_plateau: 0,
        mountain_range: 0,
      },
      biomeTransitionSize: 60,
      allowBiomeBlending: true,
    },
    performance: {
      generationTimeSeconds: 40,
      memoryUsageMB: 384,
      recommendedMinRAM: 10,
    },
  },

  arctic_continent: {
    id: "arctic_continent",
    name: "Arctic Continent",
    description:
      "Massive frozen landmasses with icy peaks and mystical aurora regions",
    category: "scenic",
    difficulty: "hard",
    estimatedBlocks: 350000,
    estimatedMemoryMB: 640,
    recommendedWorldSize: 3584,
    tags: ["arctic", "frozen", "mystical", "atmospheric"],
    config: {
      worldSize: { width: 3584, height: 3584 },
      islandCount: { min: 5, max: 7 },
      islandRadius: { min: 300, max: 500 },
      minIslandDistance: 400,
      maxTerrainHeight: 200,
      biomeWeights: {
        arctic_continent: 0.6,
        mountain_range: 0.25,
        mystical_realm: 0.15,
        temperate_giant: 0,
        mega_tropical: 0,
        volcanic_massive: 0,
        desert_plateau: 0,
        coral_atoll: 0,
      },
      terrainAmplification: 1.6,
    },
    performance: {
      generationTimeSeconds: 80,
      memoryUsageMB: 640,
      recommendedMinRAM: 14,
    },
  },

  balanced_world: {
    id: "balanced_world",
    name: "Balanced World",
    description:
      "Perfect balance of all biomes - ideal for exploration and building",
    category: "scenic",
    difficulty: "medium",
    estimatedBlocks: 250000,
    estimatedMemoryMB: 456,
    recommendedWorldSize: 2816,
    tags: ["balanced", "exploration", "building", "diverse"],
    config: {
      worldSize: { width: 2816, height: 2816 },
      islandCount: { min: 7, max: 9 },
      islandRadius: { min: 220, max: 380 },
      minIslandDistance: 280,
      maxTerrainHeight: 180,
      biomeWeights: {
        temperate_giant: 0.2,
        mega_tropical: 0.15,
        volcanic_massive: 0.15,
        mountain_range: 0.15,
        arctic_continent: 0.1,
        desert_plateau: 0.1,
        coral_atoll: 0.1,
        mystical_realm: 0.05,
      },
      allowBiomeBlending: true,
      biomeTransitionSize: 50,
    },
    performance: {
      generationTimeSeconds: 50,
      memoryUsageMB: 456,
      recommendedMinRAM: 12,
    },
  },

  // EXPERIMENTAL CATEGORY - Cutting-edge features
  mystical_realms: {
    id: "mystical_realms",
    name: "Mystical Realms",
    description:
      "Otherworldly islands with floating sections and magical biomes",
    category: "experimental",
    difficulty: "extreme",
    estimatedBlocks: 400000,
    estimatedMemoryMB: 768,
    recommendedWorldSize: 3840,
    tags: ["mystical", "magical", "experimental", "otherworldly"],
    config: {
      worldSize: { width: 3840, height: 3840 },
      islandCount: { min: 6, max: 8 },
      islandRadius: { min: 300, max: 550 },
      minIslandDistance: 350,
      maxTerrainHeight: 300,
      biomeWeights: {
        mystical_realm: 0.5,
        volcanic_massive: 0.2,
        mountain_range: 0.15,
        arctic_continent: 0.1,
        coral_atoll: 0.05,
        temperate_giant: 0,
        mega_tropical: 0,
        desert_plateau: 0,
      },
      terrainAmplification: 2.2,
      allowBiomeBlending: true,
      biomeTransitionSize: 80,
    },
    performance: {
      generationTimeSeconds: 100,
      memoryUsageMB: 768,
      recommendedMinRAM: 16,
    },
  },

  mega_desert: {
    id: "mega_desert",
    name: "Mega Desert Plateaus",
    description:
      "Vast desert mesas and canyon systems with unique geological formations",
    category: "experimental",
    difficulty: "hard",
    estimatedBlocks: 280000,
    estimatedMemoryMB: 512,
    recommendedWorldSize: 3200,
    tags: ["desert", "mesas", "geological", "unique"],
    config: {
      worldSize: { width: 3200, height: 3200 },
      islandCount: { min: 5, max: 7 },
      islandRadius: { min: 280, max: 480 },
      minIslandDistance: 400,
      maxTerrainHeight: 220,
      biomeWeights: {
        desert_plateau: 0.7,
        volcanic_massive: 0.2,
        mountain_range: 0.1,
        temperate_giant: 0,
        mega_tropical: 0,
        arctic_continent: 0,
        coral_atoll: 0,
        mystical_realm: 0,
      },
      terrainAmplification: 1.4,
    },
    performance: {
      generationTimeSeconds: 70,
      memoryUsageMB: 512,
      recommendedMinRAM: 12,
    },
  },

  stress_test: {
    id: "stress_test",
    name: "Ultimate Stress Test",
    description:
      "Maximum everything - 10+ massive islands for performance testing",
    category: "experimental",
    difficulty: "extreme",
    estimatedBlocks: 750000,
    estimatedMemoryMB: 1536,
    recommendedWorldSize: 4608,
    tags: ["stress-test", "maximum", "performance-test", "extreme"],
    config: {
      worldSize: { width: 4608, height: 4608 },
      islandCount: { min: 10, max: 12 },
      islandRadius: { min: 350, max: 600 },
      minIslandDistance: 300,
      maxTerrainHeight: 350,
      maxLoadedChunks: 1500,
      chunkSize: 64,
      batchSize: 2000,
      biomeWeights: {
        temperate_giant: 0.15,
        mega_tropical: 0.15,
        volcanic_massive: 0.15,
        mountain_range: 0.15,
        arctic_continent: 0.1,
        desert_plateau: 0.1,
        coral_atoll: 0.1,
        mystical_realm: 0.1,
      },
      allowBiomeBlending: true,
      biomeTransitionSize: 100,
      terrainAmplification: 2.5,
    },
    performance: {
      generationTimeSeconds: 180,
      memoryUsageMB: 1536,
      recommendedMinRAM: 24,
    },
  },
};

/**
 * Get all available massive presets
 */
export function getMassivePresets(): MassiveArchipelagoPreset[] {
  return Object.values(MASSIVE_ARCHIPELAGO_PRESETS);
}

/**
 * Get presets by category
 */
export function getMassivePresetsByCategory(
  category: MassivePresetCategory,
): MassiveArchipelagoPreset[] {
  return getMassivePresets().filter((preset) => preset.category === category);
}

/**
 * Get all preset categories
 */
export function getMassivePresetCategories(): MassivePresetCategory[] {
  return ["performance", "epic", "scenic", "experimental"];
}

/**
 * Get preset by ID
 */
export function getMassivePreset(
  id: string,
): MassiveArchipelagoPreset | undefined {
  return MASSIVE_ARCHIPELAGO_PRESETS[id];
}

/**
 * Create configuration from preset
 */
export function createMassiveConfigFromPreset(
  presetId: string,
  overrides?: Partial<MassiveArchipelagoConfig>,
): MassiveArchipelagoConfig {
  const preset = getMassivePreset(presetId);
  if (!preset) {
    throw new Error(`Unknown massive preset: ${presetId}`);
  }

  const baseConfig = createDefaultMassiveConfig();
  const presetConfig = preset.config;

  return {
    ...baseConfig,
    ...presetConfig,
    ...overrides,
  };
}

/**
 * Get presets suitable for a given memory limit (in GB)
 */
export function getMassivePresetsByMemoryLimit(
  memoryLimitGB: number,
): MassiveArchipelagoPreset[] {
  const memoryLimitMB = memoryLimitGB * 1024;
  return getMassivePresets().filter(
    (preset) => preset.performance.recommendedMinRAM <= memoryLimitGB,
  );
}

/**
 * Get recommended preset based on system specs
 */
export function getRecommendedMassivePreset(systemSpecs: {
  ramGB: number;
  performanceLevel: "low" | "medium" | "high" | "ultra";
}): MassiveArchipelagoPreset {
  const { ramGB, performanceLevel } = systemSpecs;

  // Filter by memory constraints
  let candidates = getMassivePresetsByMemoryLimit(ramGB);

  if (candidates.length === 0) {
    // Fallback to performance preset if memory is very limited
    return MASSIVE_ARCHIPELAGO_PRESETS.performance_islands;
  }

  // Select based on performance level preference
  switch (performanceLevel) {
    case "low":
      return (
        candidates.find((p) => p.category === "performance") || candidates[0]
      );

    case "medium":
      return (
        candidates.find(
          (p) => p.category === "scenic" && p.difficulty !== "extreme",
        ) ||
        candidates.find((p) => p.category === "performance") ||
        candidates[0]
      );

    case "high":
      return (
        candidates.find(
          (p) => p.category === "epic" && p.difficulty !== "extreme",
        ) ||
        candidates.find((p) => p.category === "scenic") ||
        candidates[0]
      );

    case "ultra":
      return (
        candidates.find((p) => p.difficulty === "extreme") ||
        candidates.find((p) => p.category === "epic") ||
        candidates[0]
      );

    default:
      return candidates[0];
  }
}

/**
 * Get preset statistics for UI display
 */
export interface MassivePresetStats {
  totalPresets: number;
  categoryCounts: Record<MassivePresetCategory, number>;
  difficultyDistribution: Record<string, number>;
  averageBlocks: number;
  averageMemoryMB: number;
}

export function getMassivePresetStats(): MassivePresetStats {
  const presets = getMassivePresets();

  const categoryCounts: Record<MassivePresetCategory, number> = {
    performance: 0,
    epic: 0,
    scenic: 0,
    experimental: 0,
  };

  const difficultyDistribution: Record<string, number> = {
    easy: 0,
    medium: 0,
    hard: 0,
    extreme: 0,
  };

  let totalBlocks = 0;
  let totalMemory = 0;

  for (const preset of presets) {
    categoryCounts[preset.category]++;
    difficultyDistribution[preset.difficulty]++;
    totalBlocks += preset.estimatedBlocks;
    totalMemory += preset.estimatedMemoryMB;
  }

  return {
    totalPresets: presets.length,
    categoryCounts,
    difficultyDistribution,
    averageBlocks: Math.round(totalBlocks / presets.length),
    averageMemoryMB: Math.round(totalMemory / presets.length),
  };
}
