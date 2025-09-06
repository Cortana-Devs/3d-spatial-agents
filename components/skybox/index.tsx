'use client'

/**
 * Skybox Components Index
 * Exports the most useful skybox components for the Descendants metaverse
 */

// Main skybox components
export { default as EnhancedSkybox, SimpleSkybox, StoreSkybox } from './EnhancedSkybox'
export { default as TutorialSkybox } from './TutorialSkybox'

// Error handling
export { default as SkyboxErrorBoundary, useSkyboxErrorHandler, withSkyboxErrorBoundary } from './SkyboxErrorBoundary'

// Store and hooks
export {
  useSkyboxStore,
  useSkyboxCurrentPreset,
  useSkyboxIsTransitioning,
  useSkyboxPresets,
  useSkyboxError,
  useSkyboxConfig,
  useSkyboxPerformance
} from '../../store/skyboxStore'

// Hooks
export { useSkybox, useSkyboxPresets as usePresetManager, useSkyboxPerformanceMonitor } from '../../hooks/skybox/useSkybox'
export { useSkyboxTransition, useSkyboxTransitionSimple, useSkyboxTransitionPresets } from '../../hooks/skybox/useSkyboxTransition'

// Types
export type {
  SkyboxPreset,
  SkyboxState,
  SkyboxActions,
  TransitionConfig,
  PerformanceMode,
  SkyboxPerformanceMetrics
} from '../../types/skybox'

// Presets and utilities
export { DEFAULT_SKYBOX_PRESET } from '../../utils/skybox/defaultPreset'
export {
  ALL_SKYBOX_PRESETS,
  PRESET_CATEGORIES,
  DEFAULT_PRESETS,
  getPresetById,
  getPresetsByTag,
  getPresetsByQuality,
  getRandomPreset
} from '../../examples/skybox/skyboxPresets'

// Re-export complex components for advanced use cases
export { default as SkyboxManager } from './SkyboxManager'
export { default as SkyboxRenderer } from './SkyboxRenderer'
export { default as SkyboxControls } from './SkyboxControls'

/**
 * Recommended usage:
 *
 * Simple case:
 * import { SimpleSkybox } from '@/components/skybox'
 * <SimpleSkybox />
 *
 * With custom path:
 * <SimpleSkybox path="/skyboxes/sunset/" />
 *
 * Store integration:
 * import { StoreSkybox, useSkyboxStore } from '@/components/skybox'
 * const { setCurrentPreset } = useSkyboxStore()
 * <StoreSkybox useStore />
 *
 * Advanced:
 * import { SkyboxManager, SkyboxControls } from '@/components/skybox'
 * <SkyboxManager currentSkybox="sunset" />
 * <SkyboxControls />
 */
