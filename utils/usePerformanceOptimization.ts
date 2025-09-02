/**
 * Performance Optimization Hook
 * Integrates LOD system, memory management, culling, and performance monitoring
 */

import { useRef, useEffect, useCallback, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { PerformanceMonitor, LODCalculator, QualityLevel, QUALITY_PRESETS } from './performanceMonitor'
import { AnimationMemoryManager, getGlobalMemoryManager } from './animationMemoryManager'
import { SimulantCullingSystem, createCullingSystem } from './simulantCulling'
import type { AISimulant } from '../types'

/**
 * Performance optimization options
 */
export interface PerformanceOptimizationOptions {
  enableAutoQualityAdjustment?: boolean
  enableMemoryManagement?: boolean
  enableCulling?: boolean
  enableLOD?: boolean
  initialQuality?: 'high' | 'medium' | 'low'
  maxRenderDistance?: number
  enableLogging?: boolean
  onQualityChange?: (quality: QualityLevel) => void
  onPerformanceWarning?: (warning: string) => void
}

/**
 * Performance optimization state
 */
export interface PerformanceOptimizationState {
  currentQuality: QualityLevel
  memoryUsage: number
  frameRate: number
  activeAnimations: number
  visibleSimulants: number
  culledSimulants: number
  isMemoryPressureHigh: boolean
  isPerformanceDegraded: boolean
}

/**
 * Performance optimization hook return type
 */
export interface UsePerformanceOptimizationReturn {
  // State
  state: PerformanceOptimizationState
  
  // Quality control
  setQuality: (quality: 'high' | 'medium' | 'low') => void
  getCurrentQuality: () => QualityLevel
  
  // LOD functions
  calculateLOD: (position: Vector3) => 'high' | 'medium' | 'low' | 'culled'
  getUpdateFrequency: (position: Vector3) => number
  getRenderScale: (position: Vector3) => number
  
  // Culling functions
  isSimulantVisible: (simulantId: string) => boolean
  getSimulantLOD: (simulantId: string) => 'high' | 'medium' | 'low' | 'culled'
  getVisibleSimulants: () => string[]
  
  // Memory management
  clearAnimationCache: () => void
  getMemoryStats: () => any
  
  // Performance monitoring
  getPerformanceReport: () => any
  resetPerformanceCounters: () => void
  
  // Manual optimization
  optimizeNow: () => void
  forceGarbageCollection: () => void
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<PerformanceOptimizationOptions> = {
  enableAutoQualityAdjustment: true,
  enableMemoryManagement: true,
  enableCulling: true,
  enableLOD: true,
  initialQuality: 'high',
  maxRenderDistance: 100,
  enableLogging: false,
  onQualityChange: () => {},
  onPerformanceWarning: () => {}
}

/**
 * Performance optimization hook
 */
export function usePerformanceOptimization(
  simulants: AISimulant[],
  options: PerformanceOptimizationOptions = {}
): UsePerformanceOptimizationReturn {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const { camera } = useThree()
  
  // Performance systems
  const performanceMonitorRef = useRef<PerformanceMonitor | null>(null)
  const lodCalculatorRef = useRef<LODCalculator | null>(null)
  const cullingSystemRef = useRef<SimulantCullingSystem | null>(null)
  const memoryManagerRef = useRef<AnimationMemoryManager | null>(null)
  
  // State
  const [state, setState] = useState<PerformanceOptimizationState>({
    currentQuality: QUALITY_PRESETS[config.initialQuality],
    memoryUsage: 0,
    frameRate: 60,
    activeAnimations: 0,
    visibleSimulants: simulants.length,
    culledSimulants: 0,
    isMemoryPressureHigh: false,
    isPerformanceDegraded: false
  })
  
  // Performance warning tracking
  const lastWarningTimeRef = useRef<number>(0)
  const warningCooldown = 5000 // 5 seconds between warnings

  // Initialize performance systems
  useEffect(() => {
    // Performance monitor
    performanceMonitorRef.current = new PerformanceMonitor(
      config.initialQuality,
      {},
      {
        enableLogging: config.enableLogging,
        onQualityChange: (quality) => {
          setState(prev => ({ ...prev, currentQuality: quality }))
          config.onQualityChange(quality)
          
          // Update LOD calculator
          if (lodCalculatorRef.current) {
            lodCalculatorRef.current.updateQuality(quality)
          }
          
          // Update culling system
          if (cullingSystemRef.current) {
            cullingSystemRef.current.updateConfig({
              maxRenderDistance: quality.cullingDistance
            })
          }
        }
      }
    )

    // LOD calculator
    lodCalculatorRef.current = new LODCalculator(QUALITY_PRESETS[config.initialQuality])

    // Culling system
    if (config.enableCulling) {
      cullingSystemRef.current = createCullingSystem(
        config.maxRenderDistance,
        {
          enableLogging: config.enableLogging,
          updateFrequency: 10,
          batchSize: 5
        }
      )
    }

    // Memory manager
    if (config.enableMemoryManagement) {
      memoryManagerRef.current = getGlobalMemoryManager(
        {},
        { enableLogging: config.enableLogging }
      )
    }

    return () => {
      // Cleanup
      performanceMonitorRef.current?.dispose()
      cullingSystemRef.current?.dispose()
      // Note: Don't dispose global memory manager here
    }
  }, [config.initialQuality, config.enableCulling, config.enableMemoryManagement, config.enableLogging, config.maxRenderDistance])

  // Update camera position for LOD and culling
  useEffect(() => {
    if (lodCalculatorRef.current) {
      lodCalculatorRef.current.updateCameraPosition(camera.position)
    }
    
    if (cullingSystemRef.current) {
      cullingSystemRef.current.updateCamera(camera)
    }
  }, [camera])

  // Update simulants for culling
  useEffect(() => {
    if (cullingSystemRef.current) {
      cullingSystemRef.current.updateSimulants(simulants)
    }
  }, [simulants])

  // Performance monitoring frame loop
  useFrame((_, delta) => {
    // Update performance monitor
    if (performanceMonitorRef.current) {
      performanceMonitorRef.current.update(delta)
      
      const metrics = performanceMonitorRef.current.getMetrics()
      const quality = performanceMonitorRef.current.getCurrentQuality()
      
      setState(prev => ({
        ...prev,
        currentQuality: quality,
        frameRate: metrics.frameRate,
        activeAnimations: metrics.activeAnimations
      }))
    }

    // Update culling system
    if (cullingSystemRef.current) {
      cullingSystemRef.current.update(simulants, delta)
      
      const stats = cullingSystemRef.current.getCullingStats()
      setState(prev => ({
        ...prev,
        visibleSimulants: stats.visibleSimulants,
        culledSimulants: stats.culledSimulants
      }))
    }

    // Update memory stats
    if (memoryManagerRef.current) {
      const memoryStats = memoryManagerRef.current.getMemoryStats()
      const isMemoryPressureHigh = memoryManagerRef.current.isMemoryPressureHigh()
      
      setState(prev => ({
        ...prev,
        memoryUsage: memoryStats.totalSize,
        isMemoryPressureHigh
      }))

      // Trigger memory cleanup if pressure is high
      if (isMemoryPressureHigh) {
        memoryManagerRef.current.performCleanup()
        
        // Emit warning (with cooldown)
        const now = Date.now()
        if (now - lastWarningTimeRef.current > warningCooldown) {
          config.onPerformanceWarning('High memory pressure detected - cleaning up animation cache')
          lastWarningTimeRef.current = now
        }
      }
    }

    // Check for performance degradation
    const isPerformanceDegraded = state.frameRate < 45 || state.isMemoryPressureHigh
    if (isPerformanceDegraded !== state.isPerformanceDegraded) {
      setState(prev => ({ ...prev, isPerformanceDegraded }))
      
      if (isPerformanceDegraded) {
        const now = Date.now()
        if (now - lastWarningTimeRef.current > warningCooldown) {
          config.onPerformanceWarning('Performance degradation detected - consider reducing quality')
          lastWarningTimeRef.current = now
        }
      }
    }
  })

  // Quality control functions
  const setQuality = useCallback((quality: 'high' | 'medium' | 'low') => {
    if (performanceMonitorRef.current) {
      performanceMonitorRef.current.setQuality(quality)
    }
  }, [])

  const getCurrentQuality = useCallback((): QualityLevel => {
    return performanceMonitorRef.current?.getCurrentQuality() || QUALITY_PRESETS.high
  }, [])

  // LOD functions
  const calculateLOD = useCallback((position: Vector3): 'high' | 'medium' | 'low' | 'culled' => {
    return lodCalculatorRef.current?.calculateLOD(position) || 'high'
  }, [])

  const getUpdateFrequency = useCallback((position: Vector3): number => {
    return lodCalculatorRef.current?.getUpdateFrequency(position) || 60
  }, [])

  const getRenderScale = useCallback((position: Vector3): number => {
    return lodCalculatorRef.current?.getRenderScale(position) || 1.0
  }, [])

  // Culling functions
  const isSimulantVisible = useCallback((simulantId: string): boolean => {
    return cullingSystemRef.current?.isSimulantVisible(simulantId) ?? true
  }, [])

  const getSimulantLOD = useCallback((simulantId: string): 'high' | 'medium' | 'low' | 'culled' => {
    return cullingSystemRef.current?.getSimulantLOD(simulantId) || 'high'
  }, [])

  const getVisibleSimulants = useCallback((): string[] => {
    return cullingSystemRef.current?.getVisibleSimulants() || simulants.map(s => s.id)
  }, [simulants])

  // Memory management functions
  const clearAnimationCache = useCallback(() => {
    if (memoryManagerRef.current) {
      memoryManagerRef.current.clearCache()
    }
  }, [])

  const getMemoryStats = useCallback(() => {
    return memoryManagerRef.current?.getMemoryStats() || null
  }, [])

  // Performance monitoring functions
  const getPerformanceReport = useCallback(() => {
    return performanceMonitorRef.current?.getPerformanceReport() || null
  }, [])

  const resetPerformanceCounters = useCallback(() => {
    if (performanceMonitorRef.current) {
      performanceMonitorRef.current.reset()
    }
  }, [])

  // Manual optimization functions
  const optimizeNow = useCallback(() => {
    // Force memory cleanup
    if (memoryManagerRef.current) {
      memoryManagerRef.current.performCleanup(true)
    }
    
    // Force culling update
    if (cullingSystemRef.current) {
      cullingSystemRef.current.forceUpdate(simulants)
    }
    
    // Reset performance counters
    if (performanceMonitorRef.current) {
      performanceMonitorRef.current.reset()
    }
    
    if (config.enableLogging) {
      console.log('🚀 Manual optimization performed')
    }
  }, [simulants, config.enableLogging])

  const forceGarbageCollection = useCallback(() => {
    // Clear animation cache
    clearAnimationCache()
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc()
    }
    
    if (config.enableLogging) {
      console.log('🗑️ Forced garbage collection')
    }
  }, [clearAnimationCache, config.enableLogging])

  return {
    state,
    setQuality,
    getCurrentQuality,
    calculateLOD,
    getUpdateFrequency,
    getRenderScale,
    isSimulantVisible,
    getSimulantLOD,
    getVisibleSimulants,
    clearAnimationCache,
    getMemoryStats,
    getPerformanceReport,
    resetPerformanceCounters,
    optimizeNow,
    forceGarbageCollection
  }
}

// Type augmentation for window.gc
declare global {
  interface Window {
    gc?: () => void
  }
}