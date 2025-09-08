'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { performanceManager, MODULE_CONFIGS } from '../../utils/performance/PerformanceManager'
import { devError } from "@/utils/devLogger";


interface UseIsolatedRenderOptions {
  moduleName: string
  priority?: number
  maxFrameTime?: number
  updateFrequency?: number
  canBeThrottled?: boolean
  dependencies?: string[]
  enabled?: boolean
}

interface RenderMetrics {
  fps: number
  frameTime: number
  isThrottled: boolean
  renderCount: number
}

/**
 * Isolated render hook that prevents cross-module performance interference
 * Each module gets its own performance budget and monitoring
 */
export function useIsolatedRender(
  callback: (deltaTime: number) => void,
  options: UseIsolatedRenderOptions
) {
  const {
    moduleName,
    priority = 5,
    maxFrameTime = 5.0,
    updateFrequency = 60,
    canBeThrottled = true,
    dependencies = [],
    enabled = true
  } = options

  const isRegisteredRef = useRef(false)
  const lastFrameTimeRef = useRef(0)
  const frameCountRef = useRef(0)
  const lastFpsUpdateRef = useRef(performance.now())

  const [metrics, setMetrics] = useState<RenderMetrics>({
    fps: 60,
    frameTime: 0,
    isThrottled: false,
    renderCount: 0
  })

  // Register module with performance manager
  useEffect(() => {
    if (!isRegisteredRef.current) {
      performanceManager.registerModule({
        name: moduleName,
        priority,
        maxFrameTime,
        maxMemoryMB: 100, // Default
        updateFrequency,
        canBeThrottled,
        dependencies
      })
      isRegisteredRef.current = true
    }

    return () => {
      if (isRegisteredRef.current) {
        performanceManager.stopRenderLoop(moduleName)
      }
    }
  }, [moduleName, priority, maxFrameTime, updateFrequency, canBeThrottled, dependencies])

  // Isolated render loop
  const isolatedCallback = useCallback((state: any, deltaTime: number) => {
    if (!enabled) return

    const startTime = performance.now()

    // Check if module can execute
    const canExecute = performanceManager.canExecuteHeavyOperation(moduleName)
    if (!canExecute) {
      setMetrics(prev => ({ ...prev, isThrottled: true }))
      return
    }

    setMetrics(prev => ({ ...prev, isThrottled: false }))

    try {
      // Execute the callback
      callback(deltaTime)

      const endTime = performance.now()
      const frameTime = endTime - startTime

      // Update local metrics
      frameCountRef.current++
      lastFrameTimeRef.current = frameTime

      // Update FPS calculation every second
      if (endTime - lastFpsUpdateRef.current > 1000) {
        const fps = frameCountRef.current
        frameCountRef.current = 0
        lastFpsUpdateRef.current = endTime

        setMetrics(prev => ({
          fps,
          frameTime,
          isThrottled: prev.isThrottled,
          renderCount: prev.renderCount + 1
        }))
      }

      // Report to performance manager
      const moduleMetrics = performanceManager.getModuleMetrics(moduleName)
      if (moduleMetrics) {
        moduleMetrics.frameTime = frameTime
        moduleMetrics.lastUpdate = endTime
      }

    } catch (error) {
      devError(`Error in isolated render for ${moduleName}:`, error)
    }
  }, [callback, enabled, moduleName])

  // Use React Three Fiber's useFrame with custom scheduling
  useFrame(isolatedCallback)

  return metrics
}

/**
 * Simplified hook for animation modules
 */
export function useAnimationRender(
  callback: (deltaTime: number) => void,
  enabled: boolean = true
) {
  return useIsolatedRender(callback, {
    moduleName: 'animation',
    ...MODULE_CONFIGS.ANIMATION,
    enabled
  })
}

/**
 * Simplified hook for block placement
 */
export function useBlockPlacementRender(
  callback: (deltaTime: number) => void,
  enabled: boolean = true
) {
  return useIsolatedRender(callback, {
    moduleName: 'block-placement',
    ...MODULE_CONFIGS.BLOCK_PLACEMENT,
    enabled
  })
}

/**
 * Simplified hook for player controls
 */
export function usePlayerControlRender(
  callback: (deltaTime: number) => void,
  enabled: boolean = true
) {
  return useIsolatedRender(callback, {
    moduleName: 'player-control',
    ...MODULE_CONFIGS.PLAYER_CONTROL,
    enabled
  })
}

/**
 * Simplified hook for skybox
 */
export function useSkyboxRender(
  callback: (deltaTime: number) => void,
  enabled: boolean = true
) {
  return useIsolatedRender(callback, {
    moduleName: 'skybox',
    ...MODULE_CONFIGS.SKYBOX,
    enabled
  })
}

/**
 * Hook for batched updates to prevent frame drops
 */
export function useBatchedUpdates(moduleName: string) {
  const queueUpdate = useCallback((updateFn: () => void) => {
    performanceManager.queueUpdate(moduleName, updateFn)
  }, [moduleName])

  const deferHeavyOperation = useCallback((operation: () => void) => {
    performanceManager.deferHeavyOperation(moduleName, operation)
  }, [moduleName])

  const canExecuteHeavy = useCallback(() => {
    return performanceManager.canExecuteHeavyOperation(moduleName)
  }, [moduleName])

  return {
    queueUpdate,
    deferHeavyOperation,
    canExecuteHeavy
  }
}

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor(moduleName?: string) {
  const [systemMetrics, setSystemMetrics] = useState(() =>
    performanceManager.getSystemMetrics()
  )

  const [moduleMetrics, setModuleMetrics] = useState(() =>
    moduleName ? performanceManager.getModuleMetrics(moduleName) : null
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setSystemMetrics(performanceManager.getSystemMetrics())
      if (moduleName) {
        setModuleMetrics(performanceManager.getModuleMetrics(moduleName))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [moduleName])

  return {
    system: systemMetrics,
    module: moduleMetrics
  }
}

export default useIsolatedRender
