export const FLOOR_CONSTANTS = {
  GLASS_PROPERTIES: {
    TRANSPARENCY: { MIN: 0.1, MAX: 0.9, DEFAULT: 0.4 },
    ROUGHNESS: { MIN: 0.3, MAX: 0.8, DEFAULT: 0.6 },
    IOR: 1.52, // Glass index of refraction
    THICKNESS: 0.1
  },

  GLASS_TYPES: {
    clear_frosted: { transparency: 0.8, roughness: 0.3 },
    light_frosted: { transparency: 0.6, roughness: 0.4 },
    medium_frosted: { transparency: 0.4, roughness: 0.6 },
    heavy_frosted: { transparency: 0.2, roughness: 0.8 }
  },

  PERFORMANCE: {
    MAX_FLOORS: 50, // Conservative start
    LOD_DISTANCE: 25,
    CULLING_DISTANCE: 100
  }
} as const
