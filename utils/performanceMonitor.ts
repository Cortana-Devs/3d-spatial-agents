import { devLog } from "@/utils/devLogger";

/**
 * Performance monitoring and automatic quality adjustment system
 * Tracks FPS, memory usage, and animation load to optimize performance
 */

import { Vector3 } from 'three'

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  frameRate: number
  averageFrameRate: number
  memoryUsage: number
  animationLoad: number
  activeAnimations: number
  droppedFrames: number
  renderTime: number
  lastUpdateTime: number
}

/**
 * Performance thresholds for quality adjustment
 */
export interface PerformanceThresholds {
  targetFPS: number
  minFPS: number
  maxMemoryUsage: number
  maxAnimationLoad: number
  adaptationDelay: number
}

/**
 * Quality level configuration
 */
export interface QualityLevel {
  name: 'high' | 'medium' | 'low'
  maxAnimatedSimulants: number
  animationUpdateRate: number
  crossFadeDuration: number
  enableBlending: boolean
  lodDistances: {
    high: number
    medium: number
    low: number
    cull: number
  }
  cullingDistance: number
  enableParticles: boolean
  shadowQuality: 'high' | 'medium' | 'low' | 'off'
}

/**
 * Default performance thresholds
 */
export const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  targetFPS: 60,
  minFPS: 30,
  maxMemoryUsage: 500 * 1024 * 1024, // 500MB
  maxAnimationLoad: 0.8, // 80% of available processing power
  adaptationDelay: 2000 // 2 seconds before adapting
}

/**
 * Quality presets for different performance levels
 */
export const QUALITY_PRESETS: Record<'high' | 'medium' | 'low', QualityLevel> = {
  high: {
    name: 'high',
    maxAnimatedSimulants: 10,
    animationUpdateRate: 60,
    crossFadeDuration: 0.3,
    enableBlending: true,
    lodDistances: { high: 20, medium: 40, low: 80, cull: 120 },
    cullingDistance: 120,
    enableParticles: true,
    shadowQuality: 'high'
  },
  medium: {
    name: 'medium',
    maxAnimatedSimulants: 6,
    animationUpdateRate: 30,
    crossFadeDuration: 0.2,
    enableBlending: true,
    lodDistances: { high: 15, medium: 30, low: 60, cull: 100 },
    cullingDistance: 100,
    enableParticles: true,
    shadowQuality: 'medium'
  },
  low: {
    name: 'low',
    maxAnimatedSimulants: 3,
    animationUpdateRate: 15,
    crossFadeDuration: 0.1,
    enableBlending: false,
    lodDistances: { high: 10, medium: 20, low: 40, cull: 80 },
    cullingDistance: 80,
    enableParticles: false,
    shadowQuality: 'off'
  }
}

/**
 * Performance monitor class
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics
  private frameHistory: number[] = []
  private lastFrameTime: number = 0
  private frameCount: number = 0
  private adaptationTimer: number = 0
  private currentQuality: QualityLevel
  private thresholds: PerformanceThresholds
  private onQualityChange?: (quality: QualityLevel) => void
  private enableLogging: boolean

  constructor(
    initialQuality: 'high' | 'medium' | 'low' = 'high',
    thresholds: Partial<PerformanceThresholds> = {},
    options: {
      enableLogging?: boolean
      onQualityChange?: (quality: QualityLevel) => void
    } = {}
  ) {
    this.currentQuality = QUALITY_PRESETS[initialQuality]
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds }
    this.onQualityChange = options.onQualityChange
    this.enableLogging = options.enableLogging || false

    this.metrics = {
      frameRate: 60,
      averageFrameRate: 60,
      memoryUsage: 0,
      animationLoad: 0,
      activeAnimations: 0,
      droppedFrames: 0,
      renderTime: 0,
      lastUpdateTime: Date.now()
    }

    if (this.enableLogging) {
      devLog('📊 PerformanceMonitor initialized with quality:', initialQuality)
    }
  }

  /**
   * Update performance metrics (call this every frame)
   */
  update(deltaTime: number): void {
    const now = Date.now()

    // Calculate frame rate
    if (deltaTime > 0) {
      const currentFPS = 1 / deltaTime
      this.metrics.frameRate = currentFPS

      // Track frame history for average calculation
      this.frameHistory.push(currentFPS)
      if (this.frameHistory.length > 60) { // Keep last 60 frames
        this.frameHistory.shift()
      }

      // Calculate average FPS
      this.metrics.averageFrameRate = this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length

      // Track dropped frames
      if (currentFPS < this.thresholds.minFPS) {
        this.metrics.droppedFrames++
      }
    }

    // Update memory usage if available (Chrome/Chromium only)
    if ('memory' in performance && (performance as any).memory) {
      this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize
    }

    // Update render time
    this.metrics.renderTime = now - this.lastFrameTime
    this.lastFrameTime = now

    this.frameCount++
    this.metrics.lastUpdateTime = now

    // Check if adaptation is needed
    this.checkForAdaptation(now)
  }

  /**
   * Set animation load metrics
   */
  setAnimationMetrics(activeAnimations: number, animationLoad: number): void {
    this.metrics.activeAnimations = activeAnimations
    this.metrics.animationLoad = animationLoad
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Get current quality level
   */
  getCurrentQuality(): QualityLevel {
    return { ...this.currentQuality }
  }

  /**
   * Manually set quality level
   */
  setQuality(quality: 'high' | 'medium' | 'low'): void {
    const newQuality = QUALITY_PRESETS[quality]
    if (newQuality.name !== this.currentQuality.name) {
      this.currentQuality = newQuality

      if (this.onQualityChange) {
        this.onQualityChange(newQuality)
      }

      if (this.enableLogging) {
        devLog(`🎯 Quality changed to: ${quality}`)
      }
    }
  }

  /**
   * Check if performance adaptation is needed
   */
  private checkForAdaptation(now: number): void {
    // Only adapt after the delay period
    if (now - this.adaptationTimer < this.thresholds.adaptationDelay) {
      return
    }

    const shouldDegrade = this.shouldDegradeQuality()
    const shouldImprove = this.shouldImproveQuality()

    if (shouldDegrade && this.currentQuality.name !== 'low') {
      this.adaptQuality('down')
      this.adaptationTimer = now
    } else if (shouldImprove && this.currentQuality.name !== 'high') {
      this.adaptQuality('up')
      this.adaptationTimer = now
    }
  }

  /**
   * Check if quality should be degraded
   */
  private shouldDegradeQuality(): boolean {
    const metrics = this.metrics

    // Check FPS
    if (metrics.averageFrameRate < this.thresholds.minFPS) {
      return true
    }

    // Check memory usage
    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      return true
    }

    // Check animation load
    if (metrics.animationLoad > this.thresholds.maxAnimationLoad) {
      return true
    }

    // Check dropped frames
    if (metrics.droppedFrames > 10) { // More than 10 dropped frames
      return true
    }

    return false
  }

  /**
   * Check if quality can be improved
   */
  private shouldImproveQuality(): boolean {
    const metrics = this.metrics
    const buffer = 10 // FPS buffer for stability

    // Only improve if performance is consistently good
    if (metrics.averageFrameRate > this.thresholds.targetFPS + buffer &&
      metrics.memoryUsage < this.thresholds.maxMemoryUsage * 0.7 &&
      metrics.animationLoad < this.thresholds.maxAnimationLoad * 0.7 &&
      metrics.droppedFrames === 0) {
      return true
    }

    return false
  }

  /**
   * Adapt quality level
   */
  private adaptQuality(direction: 'up' | 'down'): void {
    const currentName = this.currentQuality.name
    let newQuality: 'high' | 'medium' | 'low'

    if (direction === 'down') {
      newQuality = currentName === 'high' ? 'medium' : 'low'
    } else {
      newQuality = currentName === 'low' ? 'medium' : 'high'
    }

    this.setQuality(newQuality)

    // Reset dropped frames counter after adaptation
    this.metrics.droppedFrames = 0

    if (this.enableLogging) {
      devLog(`📈 Auto-adapted quality ${direction}: ${currentName} -> ${newQuality}`)
      devLog('📊 Metrics:', {
        fps: this.metrics.averageFrameRate.toFixed(1),
        memory: `${(this.metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
        animLoad: `${(this.metrics.animationLoad * 100).toFixed(1)}%`
      })
    }
  }

  /**
   * Reset performance counters
   */
  reset(): void {
    this.frameHistory = []
    this.frameCount = 0
    this.metrics.droppedFrames = 0
    this.adaptationTimer = Date.now()

    if (this.enableLogging) {
      devLog('🔄 Performance metrics reset')
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    quality: string
    averageFPS: number
    memoryUsageMB: number
    animationLoad: number
    droppedFrames: number
    uptime: number
    recommendations: string[]
  } {
    const uptimeMs = Date.now() - (this.metrics.lastUpdateTime - (this.frameCount * 16.67))
    const recommendations: string[] = []

    // Generate recommendations
    if (this.metrics.averageFrameRate < 45) {
      recommendations.push('Consider reducing animation quality or simulant count')
    }
    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage * 0.8) {
      recommendations.push('Memory usage is high, consider clearing animation cache')
    }
    if (this.metrics.animationLoad > 0.7) {
      recommendations.push('Animation load is high, consider reducing update frequency')
    }
    if (this.metrics.droppedFrames > 5) {
      recommendations.push('Frequent frame drops detected, consider lowering quality')
    }

    return {
      quality: this.currentQuality.name,
      averageFPS: Math.round(this.metrics.averageFrameRate * 10) / 10,
      memoryUsageMB: Math.round(this.metrics.memoryUsage / 1024 / 1024 * 10) / 10,
      animationLoad: Math.round(this.metrics.animationLoad * 100) / 100,
      droppedFrames: this.metrics.droppedFrames,
      uptime: Math.round(uptimeMs / 1000),
      recommendations
    }
  }

  /**
   * Dispose of the performance monitor
   */
  dispose(): void {
    this.frameHistory = []
    this.onQualityChange = undefined

    if (this.enableLogging) {
      devLog('🗑️ PerformanceMonitor disposed')
    }
  }
}

/**
 * Distance-based LOD calculator
 */
export class LODCalculator {
  private qualityLevel: QualityLevel
  private cameraPosition: Vector3 = new Vector3()

  constructor(initialQuality: QualityLevel) {
    this.qualityLevel = initialQuality
  }

  /**
   * Update camera position for distance calculations
   */
  updateCameraPosition(position: Vector3): void {
    this.cameraPosition.copy(position)
  }

  /**
   * Update quality level
   */
  updateQuality(quality: QualityLevel): void {
    this.qualityLevel = quality
  }

  /**
   * Calculate LOD level based on distance
   */
  calculateLOD(position: Vector3): 'high' | 'medium' | 'low' | 'culled' {
    const distance = this.cameraPosition.distanceTo(position)
    const { lodDistances } = this.qualityLevel

    if (distance > lodDistances.cull) return 'culled'
    if (distance > lodDistances.low) return 'low'
    if (distance > lodDistances.medium) return 'medium'
    return 'high'
  }

  /**
   * Check if object should be culled
   */
  shouldCull(position: Vector3): boolean {
    const distance = this.cameraPosition.distanceTo(position)
    return distance > this.qualityLevel.cullingDistance
  }

  /**
   * Get animation update frequency based on distance
   */
  getUpdateFrequency(position: Vector3): number {
    const lod = this.calculateLOD(position)
    const baseFrequency = this.qualityLevel.animationUpdateRate

    switch (lod) {
      case 'high': return baseFrequency
      case 'medium': return baseFrequency * 0.6
      case 'low': return baseFrequency * 0.3
      case 'culled': return 0
      default: return baseFrequency
    }
  }

  /**
   * Get render scale based on LOD
   */
  getRenderScale(position: Vector3): number {
    const lod = this.calculateLOD(position)

    switch (lod) {
      case 'high': return 1.0
      case 'medium': return 0.8
      case 'low': return 0.6
      case 'culled': return 0
      default: return 1.0
    }
  }
}