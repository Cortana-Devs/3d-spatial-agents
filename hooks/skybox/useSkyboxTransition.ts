'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CubeTexture } from 'three'
import {
  useSkyboxStore,
  useSkyboxCurrentPreset,
  useSkyboxIsTransitioning
} from '../../store/skyboxStore'
import {
  TransitionConfig,
  DEFAULT_TRANSITION_CONFIG,
  SkyboxError,
  SkyboxErrorType
} from '../../types/skybox'
import { skyboxTransitionManager } from '../../utils/skybox/TransitionManager'

export interface UseSkyboxTransitionOptions {
  defaultDuration?: number
  defaultEasing?: TransitionConfig['easing']
  defaultType?: TransitionConfig['type']
  onTransitionStart?: (fromPreset: string | null, toPreset: string) => void
  onTransitionProgress?: (progress: number, fromTexture: CubeTexture | null, toTexture: CubeTexture) => void
  onTransitionComplete?: (toPreset: string) => void
  onTransitionError?: (error: Error) => void
  onTransitionCancel?: () => void
}

export interface TransitionState {
  isActive: boolean
  progress: number
  fromPreset: string | null
  toPreset: string | null
  fromTexture: CubeTexture | null
  toTexture: CubeTexture | null
  config: TransitionConfig | null
  error: string | null
  startTime: number | null
  estimatedEndTime: number | null
}

export interface UseSkyboxTransitionReturn {
  // Current transition state
  transitionState: TransitionState

  // Quick status checks
  isTransitioning: boolean
  progress: number

  // Transition controls
  startTransition: (
    fromPreset: string | null,
    toPreset: string,
    config?: Partial<TransitionConfig>
  ) => Promise<void>
  cancelTransition: () => void
  pauseTransition: () => void
  resumeTransition: () => void

  // Configuration
  setDefaultConfig: (config: Partial<TransitionConfig>) => void
  getDefaultConfig: () => TransitionConfig

  // Advanced controls
  setProgress: (progress: number) => void
  skipToEnd: () => void
  createSequence: (transitions: Array<{
    toPreset: string
    duration?: number
    delay?: number
    config?: Partial<TransitionConfig>
  }>) => Promise<void>

  // Utilities
  getEstimatedTimeRemaining: () => number | null
  getTransitionHistory: () => Array<{
    fromPreset: string | null
    toPreset: string
    duration: number
    timestamp: number
  }>
  clearError: () => void
}

/**
 * Hook for managing skybox transitions with advanced controls
 * Provides fine-grained control over transition behavior and state
 */
export function useSkyboxTransition(
  options: UseSkyboxTransitionOptions = {}
): UseSkyboxTransitionReturn {
  const {
    defaultDuration = DEFAULT_TRANSITION_CONFIG.duration,
    defaultEasing = DEFAULT_TRANSITION_CONFIG.easing,
    defaultType = DEFAULT_TRANSITION_CONFIG.type,
    onTransitionStart,
    onTransitionProgress,
    onTransitionComplete,
    onTransitionError,
    onTransitionCancel
  } = options

  // Store subscriptions
  const currentPreset = useSkyboxCurrentPreset()
  const isTransitioning = useSkyboxIsTransitioning()
  const { textureCache, transitionProgress } = useSkyboxStore()

  // Local state for enhanced transition management
  const [transitionState, setTransitionState] = useState<TransitionState>({
    isActive: false,
    progress: 0,
    fromPreset: null,
    toPreset: null,
    fromTexture: null,
    toTexture: null,
    config: null,
    error: null,
    startTime: null,
    estimatedEndTime: null
  })

  const [defaultConfig, setDefaultConfig] = useState<TransitionConfig>({
    duration: defaultDuration,
    easing: defaultEasing,
    type: defaultType
  })

  const [transitionHistory, setTransitionHistory] = useState<Array<{
    fromPreset: string | null
    toPreset: string
    duration: number
    timestamp: number
  }>>([])

  const [isPaused, setIsPaused] = useState(false)
  const pauseTimeRef = useRef<number | null>(null)
  const pausedProgressRef = useRef<number>(0)

  // Sync with store transition state
  useEffect(() => {
    setTransitionState(prev => ({
      ...prev,
      isActive: isTransitioning,
      progress: transitionProgress
    }))
  }, [isTransitioning, transitionProgress])

  // Start a new transition
  const startTransition = useCallback(async (
    fromPreset: string | null,
    toPreset: string,
    config: Partial<TransitionConfig> = {}
  ): Promise<void> => {
    try {
      const fullConfig: TransitionConfig = {
        ...defaultConfig,
        ...config
      }

      const fromTexture = fromPreset && textureCache.has(fromPreset)
        ? textureCache.get(fromPreset) || null
        : null
      const toTexture = textureCache.has(toPreset)
        ? textureCache.get(toPreset)
        : null

      if (!toTexture) {
        throw new SkyboxError(
          SkyboxErrorType.TEXTURE_LOAD_FAILED,
          `Target texture not loaded: ${toPreset}`,
          toPreset
        )
      }

      const startTime = performance.now()
      const estimatedEndTime = startTime + fullConfig.duration

      // Update local state
      setTransitionState({
        isActive: true,
        progress: 0,
        fromPreset,
        toPreset,
        fromTexture,
        toTexture,
        config: fullConfig,
        error: null,
        startTime,
        estimatedEndTime
      })

      setIsPaused(false)
      pauseTimeRef.current = null

      // Notify start
      onTransitionStart?.(fromPreset, toPreset)

      // Start the actual transition
      await skyboxTransitionManager.transitionTo(
        fromTexture,
        toTexture,
        fullConfig,
        {
          onProgress: (progress, from, to, blendFactor) => {
            if (!isPaused) {
              setTransitionState(prev => ({
                ...prev,
                progress,
                isActive: progress < 1
              }))
              onTransitionProgress?.(progress, from, to)
            }
          },
          onComplete: () => {
            const completionTime = performance.now()
            const actualDuration = completionTime - startTime

            // Add to history
            setTransitionHistory(prev => [
              ...prev.slice(-9), // Keep last 10 entries
              {
                fromPreset,
                toPreset,
                duration: actualDuration,
                timestamp: completionTime
              }
            ])

            // Reset state
            setTransitionState(prev => ({
              ...prev,
              isActive: false,
              progress: 1,
              startTime: null,
              estimatedEndTime: null
            }))

            onTransitionComplete?.(toPreset)
          },
          onError: (error) => {
            setTransitionState(prev => ({
              ...prev,
              isActive: false,
              error: error.message
            }))
            onTransitionError?.(error)
          }
        }
      )

    } catch (error) {
      const transitionError = error instanceof Error ? error : new Error('Transition failed')
      setTransitionState(prev => ({
        ...prev,
        isActive: false,
        error: transitionError.message
      }))
      onTransitionError?.(transitionError)
      throw transitionError
    }
  }, [
    defaultConfig,
    textureCache,
    isPaused,
    onTransitionStart,
    onTransitionProgress,
    onTransitionComplete,
    onTransitionError
  ])

  // Cancel current transition
  const cancelTransition = useCallback(() => {
    skyboxTransitionManager.cancelTransition()
    setTransitionState(prev => ({
      ...prev,
      isActive: false,
      progress: 0,
      startTime: null,
      estimatedEndTime: null
    }))
    setIsPaused(false)
    pauseTimeRef.current = null
    onTransitionCancel?.()
  }, [onTransitionCancel])

  // Pause transition
  const pauseTransition = useCallback(() => {
    if (transitionState.isActive && !isPaused) {
      setIsPaused(true)
      pauseTimeRef.current = performance.now()
      pausedProgressRef.current = transitionState.progress
    }
  }, [transitionState.isActive, transitionState.progress, isPaused])

  // Resume transition
  const resumeTransition = useCallback(() => {
    if (transitionState.isActive && isPaused) {
      setIsPaused(false)

      if (pauseTimeRef.current && transitionState.startTime) {
        const pauseDuration = performance.now() - pauseTimeRef.current
        setTransitionState(prev => ({
          ...prev,
          startTime: prev.startTime! + pauseDuration,
          estimatedEndTime: prev.estimatedEndTime! + pauseDuration
        }))
      }

      pauseTimeRef.current = null
    }
  }, [transitionState.isActive, transitionState.startTime, isPaused])

  // Set progress manually
  const setProgress = useCallback((progress: number) => {
    const clampedProgress = Math.max(0, Math.min(1, progress))
    skyboxTransitionManager.setProgress(clampedProgress)
    setTransitionState(prev => ({
      ...prev,
      progress: clampedProgress
    }))
  }, [])

  // Skip to end of transition
  const skipToEnd = useCallback(() => {
    if (transitionState.isActive) {
      setProgress(1)
    }
  }, [transitionState.isActive, setProgress])

  // Create transition sequence
  const createSequence = useCallback(async (transitions: Array<{
    toPreset: string
    duration?: number
    delay?: number
    config?: Partial<TransitionConfig>
  }>) => {
    let currentFromPreset = currentPreset

    for (let i = 0; i < transitions.length; i++) {
      const transition = transitions[i]

      // Wait for delay if specified
      if (transition.delay && transition.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, transition.delay))
      }

      // Perform transition
      await startTransition(
        currentFromPreset,
        transition.toPreset,
        {
          duration: transition.duration || defaultConfig.duration,
          ...transition.config
        }
      )

      currentFromPreset = transition.toPreset
    }
  }, [currentPreset, startTransition, defaultConfig.duration])

  // Get estimated time remaining
  const getEstimatedTimeRemaining = useCallback((): number | null => {
    if (!transitionState.isActive || !transitionState.estimatedEndTime) {
      return null
    }

    const now = performance.now()
    const remaining = transitionState.estimatedEndTime - now

    return Math.max(0, remaining)
  }, [transitionState.isActive, transitionState.estimatedEndTime])

  // Get transition history
  const getTransitionHistory = useCallback(() => {
    return [...transitionHistory]
  }, [transitionHistory])

  // Clear error
  const clearError = useCallback(() => {
    setTransitionState(prev => ({
      ...prev,
      error: null
    }))
  }, [])

  // Update default configuration
  const handleSetDefaultConfig = useCallback((config: Partial<TransitionConfig>) => {
    setDefaultConfig(prev => ({ ...prev, ...config }))
  }, [])

  // Get default configuration
  const getDefaultConfig = useCallback(() => {
    return { ...defaultConfig }
  }, [defaultConfig])

  // Performance optimization: memoize transition state
  const memoizedTransitionState = useMemo(() => ({
    ...transitionState,
    isPaused
  }), [transitionState, isPaused])

  return {
    // Current transition state
    transitionState: memoizedTransitionState,

    // Quick status checks
    isTransitioning: transitionState.isActive,
    progress: transitionState.progress,

    // Transition controls
    startTransition,
    cancelTransition,
    pauseTransition,
    resumeTransition,

    // Configuration
    setDefaultConfig: handleSetDefaultConfig,
    getDefaultConfig,

    // Advanced controls
    setProgress,
    skipToEnd,
    createSequence,

    // Utilities
    getEstimatedTimeRemaining,
    getTransitionHistory,
    clearError
  }
}

/**
 * Simplified hook for basic transition control
 * Provides essential transition functionality with minimal setup
 */
export function useSkyboxTransitionSimple() {
  const isTransitioning = useSkyboxIsTransitioning()
  const { transitionProgress } = useSkyboxStore()

  const cancelTransition = useCallback(() => {
    skyboxTransitionManager.cancelTransition()
  }, [])

  return {
    isTransitioning,
    progress: transitionProgress,
    cancel: cancelTransition
  }
}

/**
 * Hook for transition presets and common configurations
 */
export function useSkyboxTransitionPresets() {
  const transitionPresets = useMemo(() => ({
    instant: {
      duration: 0,
      easing: 'linear' as const,
      type: 'fade' as const
    },
    quick: {
      duration: 300,
      easing: 'ease-out' as const,
      type: 'fade' as const
    },
    smooth: {
      duration: 1000,
      easing: 'ease-in-out' as const,
      type: 'cross-fade' as const
    },
    slow: {
      duration: 2000,
      easing: 'ease-in-out' as const,
      type: 'cross-fade' as const
    },
    dramatic: {
      duration: 3000,
      easing: 'ease-in' as const,
      type: 'slide' as const
    }
  }), [])

  const getPreset = useCallback((name: keyof typeof transitionPresets) => {
    return transitionPresets[name]
  }, [transitionPresets])

  const getAllPresets = useCallback(() => {
    return { ...transitionPresets }
  }, [transitionPresets])

  return {
    presets: transitionPresets,
    getPreset,
    getAllPresets
  }
}

export default useSkyboxTransition
