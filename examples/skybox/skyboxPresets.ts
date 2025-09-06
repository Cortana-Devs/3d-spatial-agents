import { Color, Vector3 } from 'three'
import { SkyboxPreset, DEFAULT_ATMOSPHERIC_SETTINGS } from '../../types/skybox'

/**
 * Collection of predefined skybox presets for the Descendants metaverse
 * These presets provide various atmospheric environments and moods
 */

// Dawn and Sunset Presets
export const DAWN_PRESETS: SkyboxPreset[] = [
  {
    id: 'golden-dawn',
    name: 'Golden Dawn',
    description: 'Warm golden sunrise over peaceful landscape',
    assetPath: '/skyboxes/golden-dawn/',
    intensity: 1.3,
    tint: new Color(1.1, 0.95, 0.8),
    rotationSpeed: 0,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(1.0, 0.8, 0.6),
      fogNear: 100,
      fogFar: 1500,
      timeOfDay: 0.15,
      windSpeed: 0.5,
      windDirection: new Vector3(1, 0, 0.2),
      cloudCoverage: 0.3
    },
    performance: {
      quality: 'high',
      memoryUsage: 72,
      loadPriority: 9
    },
    tags: ['dawn', 'sunrise', 'golden', 'peaceful', 'warm'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'crimson-sunset',
    name: 'Crimson Sunset',
    description: 'Dramatic red and orange sunset with clouds',
    assetPath: '/skyboxes/crimson-sunset/',
    intensity: 1.5,
    tint: new Color(1.2, 0.8, 0.6),
    rotationSpeed: 0.002,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.9, 0.5, 0.3),
      fogNear: 120,
      fogFar: 2000,
      timeOfDay: 0.1,
      windSpeed: 1.5,
      windDirection: new Vector3(0.8, 0, 0.6),
      cloudCoverage: 0.6
    },
    performance: {
      quality: 'high',
      memoryUsage: 84,
      loadPriority: 8
    },
    tags: ['sunset', 'dramatic', 'red', 'orange', 'clouds'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'purple-twilight',
    name: 'Purple Twilight',
    description: 'Mystical purple and pink twilight sky',
    assetPath: '/skyboxes/purple-twilight/',
    intensity: 0.9,
    tint: new Color(1.1, 0.8, 1.2),
    rotationSpeed: 0,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.6, 0.4, 0.8),
      fogNear: 80,
      fogFar: 1200,
      timeOfDay: 0.05,
      windSpeed: 0.8,
      windDirection: new Vector3(0.5, 0.2, 1),
      cloudCoverage: 0.4
    },
    performance: {
      quality: 'medium',
      memoryUsage: 64,
      loadPriority: 7
    },
    tags: ['twilight', 'purple', 'pink', 'mystical', 'evening'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// Day and Clear Sky Presets
export const DAY_PRESETS: SkyboxPreset[] = [
  {
    id: 'clear-blue-sky',
    name: 'Clear Blue Sky',
    description: 'Perfect clear blue sky with white clouds',
    assetPath: '/skyboxes/clear-blue/',
    intensity: 1.2,
    tint: new Color(1, 1, 1),
    rotationSpeed: 0,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: false,
      timeOfDay: 0.5,
      windSpeed: 2,
      windDirection: new Vector3(1, 0, 0),
      cloudCoverage: 0.2
    },
    performance: {
      quality: 'medium',
      memoryUsage: 48,
      loadPriority: 10
    },
    tags: ['clear', 'blue', 'day', 'bright', 'clouds'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'partly-cloudy',
    name: 'Partly Cloudy',
    description: 'Bright day with scattered puffy clouds',
    assetPath: '/skyboxes/partly-cloudy/',
    intensity: 1.1,
    tint: new Color(1, 1, 1),
    rotationSpeed: 0.001,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: false,
      timeOfDay: 0.6,
      windSpeed: 1.5,
      windDirection: new Vector3(0.7, 0, 0.7),
      cloudCoverage: 0.5
    },
    performance: {
      quality: 'medium',
      memoryUsage: 56,
      loadPriority: 8
    },
    tags: ['partly-cloudy', 'bright', 'scattered', 'day'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'azure-horizon',
    name: 'Azure Horizon',
    description: 'Pristine azure sky meeting distant horizon',
    assetPath: '/skyboxes/azure-horizon/',
    intensity: 1.4,
    tint: new Color(0.9, 1.0, 1.1),
    rotationSpeed: 0,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.7, 0.9, 1.0),
      fogNear: 500,
      fogFar: 5000,
      timeOfDay: 0.45,
      windSpeed: 0.3,
      windDirection: new Vector3(1, 0, 0),
      cloudCoverage: 0.1
    },
    performance: {
      quality: 'high',
      memoryUsage: 68,
      loadPriority: 7
    },
    tags: ['azure', 'pristine', 'horizon', 'clear'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// Storm and Weather Presets
export const STORM_PRESETS: SkyboxPreset[] = [
  {
    id: 'thunderstorm',
    name: 'Thunderstorm',
    description: 'Dark storm clouds with lightning flashes',
    assetPath: '/skyboxes/thunderstorm/',
    intensity: 0.6,
    tint: new Color(0.7, 0.7, 0.9),
    rotationSpeed: 0.003,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.3, 0.3, 0.4),
      fogNear: 50,
      fogFar: 800,
      timeOfDay: 0.3,
      windSpeed: 4,
      windDirection: new Vector3(-1, 0.2, 0.5),
      cloudCoverage: 0.9
    },
    performance: {
      quality: 'medium',
      memoryUsage: 76,
      loadPriority: 6
    },
    tags: ['storm', 'thunder', 'dark', 'lightning', 'dramatic'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'overcast-gray',
    name: 'Overcast Gray',
    description: 'Heavy gray clouds covering the entire sky',
    assetPath: '/skyboxes/overcast-gray/',
    intensity: 0.8,
    tint: new Color(0.9, 0.9, 0.95),
    rotationSpeed: 0.001,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.6, 0.6, 0.65),
      fogNear: 100,
      fogFar: 1000,
      timeOfDay: 0.5,
      windSpeed: 2,
      windDirection: new Vector3(0.8, 0, -0.6),
      cloudCoverage: 1.0
    },
    performance: {
      quality: 'low',
      memoryUsage: 40,
      loadPriority: 5
    },
    tags: ['overcast', 'gray', 'cloudy', 'moody'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'rain-clouds',
    name: 'Rain Clouds',
    description: 'Dark rain clouds with soft diffused lighting',
    assetPath: '/skyboxes/rain-clouds/',
    intensity: 0.7,
    tint: new Color(0.8, 0.85, 0.9),
    rotationSpeed: 0.002,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.5, 0.55, 0.6),
      fogNear: 30,
      fogFar: 600,
      timeOfDay: 0.4,
      windSpeed: 3,
      windDirection: new Vector3(-0.8, 0, 0.6),
      cloudCoverage: 0.85
    },
    performance: {
      quality: 'medium',
      memoryUsage: 52,
      loadPriority: 6
    },
    tags: ['rain', 'clouds', 'wet', 'atmospheric'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// Night and Space Presets
export const NIGHT_PRESETS: SkyboxPreset[] = [
  {
    id: 'starry-night',
    name: 'Starry Night',
    description: 'Clear night sky filled with twinkling stars',
    assetPath: '/skyboxes/starry-night/',
    intensity: 0.4,
    tint: new Color(0.8, 0.9, 1.2),
    rotationSpeed: 0.0005,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: false,
      timeOfDay: 0.95,
      windSpeed: 0.5,
      windDirection: new Vector3(0.3, 0, 1),
      cloudCoverage: 0.1
    },
    performance: {
      quality: 'medium',
      memoryUsage: 44,
      loadPriority: 7
    },
    tags: ['night', 'stars', 'clear', 'peaceful'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'milky-way',
    name: 'Milky Way',
    description: 'Spectacular view of the Milky Way galaxy',
    assetPath: '/skyboxes/milky-way/',
    intensity: 0.5,
    tint: new Color(0.9, 0.9, 1.1),
    rotationSpeed: 0.0008,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: false,
      timeOfDay: 0.0,
      windSpeed: 0,
      windDirection: new Vector3(0, 0, 0),
      cloudCoverage: 0
    },
    performance: {
      quality: 'high',
      memoryUsage: 88,
      loadPriority: 8
    },
    tags: ['milky-way', 'galaxy', 'space', 'cosmic'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'aurora-borealis',
    name: 'Aurora Borealis',
    description: 'Northern lights dancing across the night sky',
    assetPath: '/skyboxes/aurora-borealis/',
    intensity: 0.6,
    tint: new Color(0.8, 1.1, 1.0),
    rotationSpeed: 0.001,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.4, 0.6, 0.5),
      fogNear: 200,
      fogFar: 3000,
      timeOfDay: 0.95,
      windSpeed: 1,
      windDirection: new Vector3(-1, 0, 0.3),
      cloudCoverage: 0.2
    },
    performance: {
      quality: 'high',
      memoryUsage: 92,
      loadPriority: 9
    },
    tags: ['aurora', 'northern-lights', 'magical', 'arctic'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'lunar-eclipse',
    name: 'Lunar Eclipse',
    description: 'Dramatic lunar eclipse with red moon',
    assetPath: '/skyboxes/lunar-eclipse/',
    intensity: 0.3,
    tint: new Color(1.2, 0.7, 0.7),
    rotationSpeed: 0,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.3, 0.2, 0.2),
      fogNear: 150,
      fogFar: 1500,
      timeOfDay: 0.0,
      windSpeed: 0.8,
      windDirection: new Vector3(0.6, 0, 0.8),
      cloudCoverage: 0.3
    },
    performance: {
      quality: 'medium',
      memoryUsage: 58,
      loadPriority: 6
    },
    tags: ['lunar', 'eclipse', 'red-moon', 'rare'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// Fantasy and Sci-Fi Presets
export const FANTASY_PRESETS: SkyboxPreset[] = [
  {
    id: 'floating-islands',
    name: 'Floating Islands',
    description: 'Mystical sky with floating landmasses',
    assetPath: '/skyboxes/floating-islands/',
    intensity: 1.1,
    tint: new Color(1.0, 1.1, 1.2),
    rotationSpeed: 0.002,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.8, 0.9, 1.0),
      fogNear: 200,
      fogFar: 2000,
      timeOfDay: 0.4,
      windSpeed: 1.5,
      windDirection: new Vector3(0.7, 0.3, 0.6),
      cloudCoverage: 0.6
    },
    performance: {
      quality: 'high',
      memoryUsage: 96,
      loadPriority: 7
    },
    tags: ['fantasy', 'floating', 'islands', 'mystical'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'alien-sunset',
    name: 'Alien Sunset',
    description: 'Exotic alien world with multiple colored suns',
    assetPath: '/skyboxes/alien-sunset/',
    intensity: 1.8,
    tint: new Color(1.3, 0.9, 1.1),
    rotationSpeed: 0.004,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: false,
      timeOfDay: 0.2,
      windSpeed: 2.5,
      windDirection: new Vector3(0.5, 0.5, 1),
      cloudCoverage: 0.4
    },
    performance: {
      quality: 'high',
      memoryUsage: 104,
      loadPriority: 8
    },
    tags: ['alien', 'exotic', 'multi-sun', 'sci-fi'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'crystal-cavern',
    name: 'Crystal Cavern',
    description: 'Underground cavern with glowing crystals',
    assetPath: '/skyboxes/crystal-cavern/',
    intensity: 0.7,
    tint: new Color(0.9, 1.2, 1.4),
    rotationSpeed: 0,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.3, 0.5, 0.7),
      fogNear: 20,
      fogFar: 300,
      timeOfDay: 0.5,
      windSpeed: 0,
      windDirection: new Vector3(0, 0, 0),
      cloudCoverage: 0
    },
    performance: {
      quality: 'medium',
      memoryUsage: 62,
      loadPriority: 6
    },
    tags: ['crystal', 'cavern', 'underground', 'glowing'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'volcanic-world',
    name: 'Volcanic World',
    description: 'Harsh volcanic landscape with lava glow',
    assetPath: '/skyboxes/volcanic-world/',
    intensity: 1.6,
    tint: new Color(1.4, 0.8, 0.6),
    rotationSpeed: 0.001,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.8, 0.3, 0.2),
      fogNear: 80,
      fogFar: 800,
      timeOfDay: 0.1,
      windSpeed: 3,
      windDirection: new Vector3(1, 0.2, 0.5),
      cloudCoverage: 0.7
    },
    performance: {
      quality: 'medium',
      memoryUsage: 74,
      loadPriority: 5
    },
    tags: ['volcanic', 'lava', 'harsh', 'dramatic'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// Cyberpunk and Urban Presets
export const CYBERPUNK_PRESETS: SkyboxPreset[] = [
  {
    id: 'neon-metropolis',
    name: 'Neon Metropolis',
    description: 'Futuristic city skyline with neon lights',
    assetPath: '/skyboxes/neon-metropolis/',
    intensity: 1.8,
    tint: new Color(0.9, 1.1, 1.3),
    rotationSpeed: 0,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.2, 0.4, 0.6),
      fogNear: 100,
      fogFar: 1500,
      timeOfDay: 0.85,
      windSpeed: 1,
      windDirection: new Vector3(1, 0, 0.3),
      cloudCoverage: 0.3
    },
    performance: {
      quality: 'high',
      memoryUsage: 112,
      loadPriority: 8
    },
    tags: ['cyberpunk', 'neon', 'city', 'futuristic'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'digital-grid',
    name: 'Digital Grid',
    description: 'Matrix-style digital environment',
    assetPath: '/skyboxes/digital-grid/',
    intensity: 1.2,
    tint: new Color(0.7, 1.3, 0.8),
    rotationSpeed: 0.003,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: false,
      timeOfDay: 0.5,
      windSpeed: 0,
      windDirection: new Vector3(0, 0, 0),
      cloudCoverage: 0
    },
    performance: {
      quality: 'low',
      memoryUsage: 36,
      loadPriority: 5
    },
    tags: ['digital', 'matrix', 'grid', 'cyber'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// Ocean and Underwater Presets
export const OCEAN_PRESETS: SkyboxPreset[] = [
  {
    id: 'ocean-surface',
    name: 'Ocean Surface',
    description: 'View from ocean surface with rolling waves',
    assetPath: '/skyboxes/ocean-surface/',
    intensity: 1.0,
    tint: new Color(0.9, 1.0, 1.2),
    rotationSpeed: 0.001,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.7, 0.8, 0.9),
      fogNear: 200,
      fogFar: 2000,
      timeOfDay: 0.5,
      windSpeed: 2,
      windDirection: new Vector3(1, 0, 0.5),
      cloudCoverage: 0.4
    },
    performance: {
      quality: 'medium',
      memoryUsage: 56,
      loadPriority: 7
    },
    tags: ['ocean', 'surface', 'waves', 'water'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'underwater-depths',
    name: 'Underwater Depths',
    description: 'Deep underwater with caustic light patterns',
    assetPath: '/skyboxes/underwater-depths/',
    intensity: 0.3,
    tint: new Color(0.6, 0.8, 1.4),
    rotationSpeed: 0.0005,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.1, 0.3, 0.5),
      fogNear: 10,
      fogFar: 200,
      timeOfDay: 0.5,
      windSpeed: 0,
      windDirection: new Vector3(0, 0, 0),
      cloudCoverage: 0
    },
    performance: {
      quality: 'medium',
      memoryUsage: 64,
      loadPriority: 6
    },
    tags: ['underwater', 'deep', 'caustic', 'blue'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'coral-reef',
    name: 'Coral Reef',
    description: 'Vibrant underwater coral reef environment',
    assetPath: '/skyboxes/coral-reef/',
    intensity: 0.8,
    tint: new Color(0.8, 1.1, 1.3),
    rotationSpeed: 0,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.2, 0.5, 0.7),
      fogNear: 20,
      fogFar: 150,
      timeOfDay: 0.6,
      windSpeed: 0.5,
      windDirection: new Vector3(0.3, 0, 1),
      cloudCoverage: 0
    },
    performance: {
      quality: 'high',
      memoryUsage: 78,
      loadPriority: 7
    },
    tags: ['coral', 'reef', 'underwater', 'vibrant'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// Performance Presets (optimized for different quality levels)
export const PERFORMANCE_PRESETS: SkyboxPreset[] = [
  {
    id: 'minimal-sky',
    name: 'Minimal Sky',
    description: 'Simple gradient sky for maximum performance',
    assetPath: '/skyboxes/minimal-sky/',
    intensity: 1.0,
    tint: new Color(1, 1, 1),
    rotationSpeed: 0,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: false,
      timeOfDay: 0.5,
      windSpeed: 0,
      windDirection: new Vector3(0, 0, 0),
      cloudCoverage: 0
    },
    performance: {
      quality: 'low',
      memoryUsage: 16,
      loadPriority: 10
    },
    tags: ['minimal', 'performance', 'simple', 'gradient'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'basic-clouds',
    name: 'Basic Clouds',
    description: 'Simple cloudy sky with good performance',
    assetPath: '/skyboxes/basic-clouds/',
    intensity: 1.0,
    tint: new Color(1, 1, 1),
    rotationSpeed: 0,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: false,
      timeOfDay: 0.5,
      windSpeed: 1,
      windDirection: new Vector3(1, 0, 0),
      cloudCoverage: 0.5
    },
    performance: {
      quality: 'low',
      memoryUsage: 24,
      loadPriority: 9
    },
    tags: ['basic', 'clouds', 'performance', 'simple'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// All presets combined
export const ALL_SKYBOX_PRESETS: SkyboxPreset[] = [
  ...DAWN_PRESETS,
  ...DAY_PRESETS,
  ...STORM_PRESETS,
  ...NIGHT_PRESETS,
  ...FANTASY_PRESETS,
  ...CYBERPUNK_PRESETS,
  ...OCEAN_PRESETS,
  ...PERFORMANCE_PRESETS
]

// Preset categories for organization
export const PRESET_CATEGORIES = {
  dawn: { name: 'Dawn & Sunrise', presets: DAWN_PRESETS, icon: '🌅' },
  day: { name: 'Day & Clear', presets: DAY_PRESETS, icon: '☀️' },
  storm: { name: 'Storm & Weather', presets: STORM_PRESETS, icon: '⛈️' },
  night: { name: 'Night & Space', presets: NIGHT_PRESETS, icon: '🌙' },
  fantasy: { name: 'Fantasy & Sci-Fi', presets: FANTASY_PRESETS, icon: '🪐' },
  cyberpunk: { name: 'Cyberpunk & Urban', presets: CYBERPUNK_PRESETS, icon: '🏙️' },
  ocean: { name: 'Ocean & Water', presets: OCEAN_PRESETS, icon: '🌊' },
  performance: { name: 'Performance', presets: PERFORMANCE_PRESETS, icon: '⚡' }
} as const

// Utility functions for preset management
export function getPresetById(id: string): SkyboxPreset | undefined {
  return ALL_SKYBOX_PRESETS.find(preset => preset.id === id)
}

export function getPresetsByTag(tag: string): SkyboxPreset[] {
  return ALL_SKYBOX_PRESETS.filter(preset => preset.tags.includes(tag))
}

export function getPresetsByQuality(quality: 'low' | 'medium' | 'high'): SkyboxPreset[] {
  return ALL_SKYBOX_PRESETS.filter(preset => preset.performance.quality === quality)
}

export function getPresetsByMemoryUsage(maxMemoryMB: number): SkyboxPreset[] {
  return ALL_SKYBOX_PRESETS.filter(preset => preset.performance.memoryUsage <= maxMemoryMB)
}

export function getRandomPreset(): SkyboxPreset {
  const randomIndex = Math.floor(Math.random() * ALL_SKYBOX_PRESETS.length)
  return ALL_SKYBOX_PRESETS[randomIndex]
}

export function getRandomPresetFromCategory(category: keyof typeof PRESET_CATEGORIES): SkyboxPreset {
  const categoryPresets = PRESET_CATEGORIES[category].presets
  const randomIndex = Math.floor(Math.random() * categoryPresets.length)
  return categoryPresets[randomIndex]
}

// Default presets for different scenarios
export const DEFAULT_PRESETS = {
  fallback: 'minimal-sky',
  startup: 'clear-blue-sky',
  performance: 'basic-clouds',
  showcase: 'golden-dawn',
  night: 'starry-night',
  dramatic: 'thunderstorm',
  peaceful: 'azure-horizon'
} as const

export default {
  ALL_SKYBOX_PRESETS,
  PRESET_CATEGORIES,
  DEFAULT_PRESETS,
  getPresetById,
  getPresetsByTag,
  getPresetsByQuality,
  getPresetsByMemoryUsage,
  getRandomPreset,
  getRandomPresetFromCategory
}
