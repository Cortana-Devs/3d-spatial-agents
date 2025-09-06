import { CubeTexture, Color, Vector3 } from 'three'

// Skybox asset naming convention following Three.js CubeTextureLoader standard
export type CubeMapFaces = 'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz'

// Skybox asset specifications
export interface SkyboxAssets {
  structure: string
  naming: CubeMapFaces[]
  formats: string[]
  resolution: string[]
  mapping: Record<CubeMapFaces, string>
}

// Atmospheric effects configuration
export interface AtmosphericSettings {
  fogEnabled: boolean
  fogColor: Color
  fogNear: number
  fogFar: number
  windSpeed: number
  windDirection: Vector3
  cloudCoverage: number
  timeOfDay: number // 0-1 (0 = midnight, 0.5 = noon)
}

// Skybox preset configuration
export interface SkyboxPreset {
  id: string
  name: string
  description?: string
  assetPath: string
  intensity: number
  tint: Color
  rotationSpeed: number
  atmosphericSettings: AtmosphericSettings
  performance: {
    quality: 'low' | 'medium' | 'high'
    memoryUsage: number // Estimated MB
    loadPriority: number // 1-10, higher = more important
  }
  tags: string[] // For filtering/categorization
  createdAt: string
  updatedAt: string
}

// Performance modes
export type PerformanceMode = 'quality' | 'balanced' | 'performance'

// Skybox loading state
export interface SkyboxLoadState {
  isLoading: boolean
  progress: number
  error: string | null
  loadStartTime: number | null
  loadEndTime: number | null
}

// Transition configuration
export interface TransitionConfig {
  duration: number
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
  type: 'fade' | 'cross-fade' | 'slide'
}

// Performance metrics
export interface SkyboxPerformanceMetrics {
  memoryUsage: number // Current memory usage in MB
  loadTime: number // Last load time in ms
  frameImpact: number // FPS impact (negative number)
  textureResolution: string
  compressionRatio: number
  cacheHitRate: number // 0-1
}

// Skybox Manager configuration
export interface SkyboxManagerConfig {
  currentSkybox: string | null
  transitionDuration: number
  enableAtmosphericEffects: boolean
  performanceMode: PerformanceMode
  autoLoadNextSkybox: boolean
  maxCacheSize: number // MB
  compressionEnabled: boolean
}

// Skybox state management
export interface SkyboxState {
  // Current state
  currentPreset: string | null
  previousPreset: string | null
  isTransitioning: boolean
  transitionProgress: number

  // Presets management
  presets: Record<string, SkyboxPreset>
  loadStates: Record<string, SkyboxLoadState>

  // Configuration
  config: SkyboxManagerConfig

  // Performance tracking
  performance: SkyboxPerformanceMetrics

  // Error handling
  error: string | null
  fallbackPreset: string | null

  // Cache management
  textureCache: Map<string, CubeTexture>
  cacheMetadata: Map<string, {
    lastAccessed: number
    accessCount: number
    memorySize: number
  }>
}

// Action interfaces for store
export interface SkyboxActions {
  // Preset management
  setCurrentPreset: (presetId: string) => Promise<void>
  addPreset: (preset: SkyboxPreset) => void
  updatePreset: (presetId: string, updates: Partial<SkyboxPreset>) => void
  removePreset: (presetId: string) => void
  duplicatePreset: (presetId: string, newName: string) => void

  // Configuration
  updateConfig: (config: Partial<SkyboxManagerConfig>) => void
  setPerformanceMode: (mode: PerformanceMode) => void

  // Loading and transitions
  preloadPreset: (presetId: string) => Promise<void>
  transitionTo: (presetId: string, config?: TransitionConfig) => Promise<void>
  cancelTransition: () => void

  // Error handling
  setError: (error: string | null) => void
  clearError: () => void
  setFallbackPreset: (presetId: string) => void

  // Performance and monitoring
  updatePerformanceMetrics: (metrics: Partial<SkyboxPerformanceMetrics>) => void
  clearCache: () => void
  optimizeCache: () => void

  // Utility actions
  reset: () => void
  exportPresets: () => string
  importPresets: (presetsJson: string) => void
}

// Complete store type
export type SkyboxStore = SkyboxState & SkyboxActions

// Texture loader events
export interface TextureLoaderEvents {
  onLoadStart?: (presetId: string) => void
  onLoadProgress?: (presetId: string, progress: number) => void
  onLoadComplete?: (presetId: string, texture: CubeTexture) => void
  onLoadError?: (presetId: string, error: Error) => void
}

// Skybox renderer props
export interface SkyboxRendererProps {
  texture: CubeTexture | null
  intensity?: number
  rotation?: number
  tint?: Color
  backgroundBlurriness?: number
  environmentIntensity?: number
}

// Skybox manager props
export interface SkyboxManagerProps {
  currentSkybox: string | null
  transitionDuration?: number
  enableAtmosphericEffects?: boolean
  performanceMode?: PerformanceMode
  fallbackTexture?: CubeTexture
  onLoadComplete?: () => void
  onLoadError?: (error: Error) => void
  onTransitionStart?: (fromPreset: string | null, toPreset: string) => void
  onTransitionComplete?: (preset: string) => void
}

// Error types
export enum SkyboxErrorType {
  TEXTURE_LOAD_FAILED = 'TEXTURE_LOAD_FAILED',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  INVALID_PRESET = 'INVALID_PRESET',
  TRANSITION_FAILED = 'TRANSITION_FAILED',
  SHADER_COMPILATION_FAILED = 'SHADER_COMPILATION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class SkyboxError extends Error {
  constructor(
    public type: SkyboxErrorType,
    message: string,
    public presetId?: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'SkyboxError'
  }
}

// Default configurations
export const DEFAULT_ATMOSPHERIC_SETTINGS: AtmosphericSettings = {
  fogEnabled: false,
  fogColor: new Color(0x888888),
  fogNear: 100,
  fogFar: 1000,
  windSpeed: 0,
  windDirection: new Vector3(1, 0, 0),
  cloudCoverage: 0,
  timeOfDay: 0.5
}

export const DEFAULT_SKYBOX_CONFIG: SkyboxManagerConfig = {
  currentSkybox: null,
  transitionDuration: 1000,
  enableAtmosphericEffects: true,
  performanceMode: 'balanced',
  autoLoadNextSkybox: false,
  maxCacheSize: 128, // MB
  compressionEnabled: true
}

export const DEFAULT_TRANSITION_CONFIG: TransitionConfig = {
  duration: 1000,
  easing: 'ease-in-out',
  type: 'fade'
}

// Performance targets
export const PERFORMANCE_TARGETS = {
  textureLoading: {
    maxLoadTime: 2000, // ms
    maxMemoryUsage: 64, // MB per skybox
    concurrentLoads: 2,
    compressionFormat: 'ktx2'
  },
  rendering: {
    frameImpact: 1, // Max FPS reduction
    drawCalls: 1,
    shaderComplexity: 'low'
  },
  transitions: {
    duration: 1000,
    frameRate: 60,
    memorySpike: 32 // Max additional MB during transition
  }
} as const

// Asset specifications
export const SKYBOX_ASSETS: SkyboxAssets = {
  structure: 'public/skyboxes/',
  naming: ['px', 'nx', 'py', 'ny', 'pz', 'nz'],
  formats: ['.jpg', '.png', '.webp', '.avif'],
  resolution: ['1024x1024', '2048x2048'],
  mapping: {
    'px': 'positive-x', // Right
    'nx': 'negative-x', // Left
    'py': 'positive-y', // Top
    'ny': 'negative-y', // Bottom
    'pz': 'positive-z', // Front
    'nz': 'negative-z'  // Back
  }
}

// Preset validation schema
export interface SkyboxPresetValidation {
  id: boolean
  name: boolean
  assetPath: boolean
  intensity: boolean
  atmosphericSettings: boolean
  performance: boolean
}

// Debug information
export interface SkyboxDebugInfo {
  currentTexture: string | null
  textureResolution: string | null
  memoryUsage: number
  cacheSize: number
  lastTransitionTime: number | null
  performanceMetrics: SkyboxPerformanceMetrics
  errors: string[]
}
