import { devLog, devWarn, devError } from "@/utils/devLogger";

/**
 * Performance Manager for Module Isolation
 * Prevents cross-module performance interference in the Descendants metaverse
 *
 * Key Features:
 * - Isolated render loops for each module
 * - Performance budgeting and throttling
 * - Cross-module dependency tracking
 * - Bottleneck detection and mitigation
 * - Memory leak prevention
 */

import { performance as perfAPI } from 'perf_hooks'

export interface PerformanceMetrics {
  frameTime: number
  cpuUsage: number
  memoryUsage: number
  renderCalls: number
  updateCalls: number
  lastUpdate: number
}

export interface ModuleConfig {
  name: string
  priority: number
  maxFrameTime: number
  maxMemoryMB: number
  updateFrequency: number
  canBeThrottled: boolean
  dependencies: string[]
}

export interface PerformanceBudget {
  totalFrameTimeMs: number
  maxRenderCalls: number
  maxMemoryMB: number
  throttleThreshold: number
}

export class ModulePerformanceManager {
  private modules = new Map<string, ModuleConfig>()
  private metrics = new Map<string, PerformanceMetrics>()
  private renderLoops = new Map<string, number>()
  private throttledModules = new Set<string>()
  private dependencies = new Map<string, Set<string>>()
  private updateQueue = new Map<string, (() => void)[]>()

  private budget: PerformanceBudget = {
    totalFrameTimeMs: 16.67, // 60fps
    maxRenderCalls: 100,
    maxMemoryMB: 512,
    throttleThreshold: 0.8
  }

  private isMonitoring = false
  private monitoringInterval: number | null = null
  private frameStart = 0
  private currentFrame = 0

  constructor(customBudget?: Partial<PerformanceBudget>) {
    if (customBudget) {
      this.budget = { ...this.budget, ...customBudget }
    }
  }

  /**
   * Register a module with the performance manager
   */
  registerModule(config: ModuleConfig): void {
    this.modules.set(config.name, config)
    this.metrics.set(config.name, {
      frameTime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      renderCalls: 0,
      updateCalls: 0,
      lastUpdate: performance.now()
    })

    // Track dependencies
    const deps = new Set<string>()
    config.dependencies.forEach(dep => deps.add(dep))
    this.dependencies.set(config.name, deps)

    devLog(`📊 Module registered: ${config.name} (priority: ${config.priority})`)
  }

  /**
   * Start isolated render loop for a module
   */
  startRenderLoop(moduleName: string, callback: (deltaTime: number) => void): void {
    const config = this.modules.get(moduleName)
    if (!config) {
      devWarn(`Module ${moduleName} not registered`)
      return
    }

    // Clear existing loop if any
    if (this.renderLoops.has(moduleName)) {
      this.stopRenderLoop(moduleName)
    }

    const targetInterval = 1000 / config.updateFrequency
    let lastTime = performance.now()
    let accumulatedTime = 0

    const loop = () => {
      const currentTime = performance.now()
      const deltaTime = currentTime - lastTime
      lastTime = currentTime

      // Skip if module is throttled
      if (this.throttledModules.has(moduleName)) {
        this.renderLoops.set(moduleName, requestAnimationFrame(loop))
        return
      }

      // Accumulate time for frame-rate independent updates
      accumulatedTime += deltaTime

      if (accumulatedTime >= targetInterval) {
        const moduleStartTime = performance.now()

        try {
          // Execute module update
          callback(accumulatedTime / 1000) // Convert to seconds
          accumulatedTime = 0

          // Update metrics
          const moduleEndTime = performance.now()
          const frameTime = moduleEndTime - moduleStartTime
          this.updateMetrics(moduleName, frameTime)

        } catch (error) {
          devError(`Error in ${moduleName} render loop:`, error)
        }
      }

      this.renderLoops.set(moduleName, requestAnimationFrame(loop))
    }

    this.renderLoops.set(moduleName, requestAnimationFrame(loop))
    devLog(`🔄 Started render loop: ${moduleName}`)
  }

  /**
   * Stop render loop for a module
   */
  stopRenderLoop(moduleName: string): void {
    const loopId = this.renderLoops.get(moduleName)
    if (loopId) {
      cancelAnimationFrame(loopId)
      this.renderLoops.delete(moduleName)
      devLog(`⏹️ Stopped render loop: ${moduleName}`)
    }
  }

  /**
   * Queue an update for batched execution
   */
  queueUpdate(moduleName: string, updateFn: () => void): void {
    if (!this.updateQueue.has(moduleName)) {
      this.updateQueue.set(moduleName, [])
    }
    this.updateQueue.get(moduleName)!.push(updateFn)
  }

  /**
   * Process queued updates in priority order
   */
  processQueuedUpdates(): void {
    // Sort modules by priority
    const sortedModules = Array.from(this.modules.entries())
      .sort(([, a], [, b]) => b.priority - a.priority)

    for (const [moduleName] of sortedModules) {
      const updates = this.updateQueue.get(moduleName)
      if (updates && updates.length > 0) {
        const startTime = performance.now()

        // Process updates in batches to prevent frame drops
        const batchSize = this.throttledModules.has(moduleName) ? 1 : 5
        const batch = updates.splice(0, batchSize)

        batch.forEach(updateFn => {
          try {
            updateFn()
          } catch (error) {
            devError(`Error processing update for ${moduleName}:`, error)
          }
        })

        const endTime = performance.now()
        this.updateMetrics(moduleName, endTime - startTime)
      }
    }
  }

  /**
   * Update performance metrics for a module
   */
  private updateMetrics(moduleName: string, frameTime: number): void {
    const metrics = this.metrics.get(moduleName)
    if (!metrics) return

    metrics.frameTime = frameTime
    metrics.renderCalls++
    metrics.updateCalls++
    metrics.lastUpdate = performance.now()

    // Estimate CPU usage (simplified)
    const cpuPercent = (frameTime / this.budget.totalFrameTimeMs) * 100
    metrics.cpuUsage = Math.min(100, cpuPercent)

    // Check if module needs throttling
    this.checkThrottling(moduleName, metrics)
  }

  /**
   * Check if a module needs to be throttled
   */
  private checkThrottling(moduleName: string, metrics: PerformanceMetrics): void {
    const config = this.modules.get(moduleName)
    if (!config || !config.canBeThrottled) return

    const shouldThrottle = (
      metrics.frameTime > config.maxFrameTime ||
      metrics.cpuUsage > (this.budget.throttleThreshold * 100)
    )

    if (shouldThrottle && !this.throttledModules.has(moduleName)) {
      this.throttledModules.add(moduleName)
      console.warn(`⚡ Throttling module: ${moduleName} (frameTime: ${metrics.frameTime.toFixed(2)}ms)`)
    } else if (!shouldThrottle && this.throttledModules.has(moduleName)) {
      this.throttledModules.delete(moduleName)
      devLog(`✅ Unthrottling module: ${moduleName}`)
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs: number = 1000): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.monitoringInterval = setInterval(() => {
      this.processQueuedUpdates()
      this.analyzePerformance()
    }, intervalMs)

    devLog('📊 Performance monitoring started')
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    this.isMonitoring = false
    devLog('📊 Performance monitoring stopped')
  }

  /**
   * Analyze overall performance and detect bottlenecks
   */
  private analyzePerformance(): void {
    let totalFrameTime = 0
    let totalRenderCalls = 0
    const bottlenecks: string[] = []

    for (const [moduleName, metrics] of this.metrics.entries()) {
      totalFrameTime += metrics.frameTime
      totalRenderCalls += metrics.renderCalls

      const config = this.modules.get(moduleName)
      if (config && metrics.frameTime > config.maxFrameTime) {
        bottlenecks.push(`${moduleName} (${metrics.frameTime.toFixed(2)}ms)`)
      }

      // Reset counters
      metrics.renderCalls = 0
      metrics.updateCalls = 0
    }

    // Log performance warnings
    if (totalFrameTime > this.budget.totalFrameTimeMs) {
      devWarn(`⚠️ Frame budget exceeded: ${totalFrameTime.toFixed(2)}ms > ${this.budget.totalFrameTimeMs}ms`)
    }

    if (bottlenecks.length > 0) {
      devWarn(`🔍 Performance bottlenecks detected:`, bottlenecks)
    }

    if (totalRenderCalls > this.budget.maxRenderCalls) {
      devWarn(`⚠️ Too many render calls: ${totalRenderCalls} > ${this.budget.maxRenderCalls}`)
    }
  }

  /**
   * Get current metrics for a module
   */
  getModuleMetrics(moduleName: string): PerformanceMetrics | null {
    return this.metrics.get(moduleName) || null
  }

  /**
   * Get overall system metrics
   */
  getSystemMetrics(): {
    totalModules: number
    activeLoops: number
    throttledModules: number
    totalFrameTime: number
    budgetUtilization: number
  } {
    let totalFrameTime = 0
    for (const metrics of this.metrics.values()) {
      totalFrameTime += metrics.frameTime
    }

    return {
      totalModules: this.modules.size,
      activeLoops: this.renderLoops.size,
      throttledModules: this.throttledModules.size,
      totalFrameTime,
      budgetUtilization: (totalFrameTime / this.budget.totalFrameTimeMs) * 100
    }
  }

  /**
   * Check if module can safely execute heavy operations
   */
  canExecuteHeavyOperation(moduleName: string): boolean {
    const metrics = this.getModuleMetrics(moduleName)
    if (!metrics) return false

    return (
      !this.throttledModules.has(moduleName) &&
      metrics.frameTime < (this.budget.totalFrameTimeMs * 0.5)
    )
  }

  /**
   * Defer heavy operation to next available frame
   */
  deferHeavyOperation(moduleName: string, operation: () => void): void {
    const tryExecute = () => {
      if (this.canExecuteHeavyOperation(moduleName)) {
        operation()
      } else {
        // Try again next frame
        requestAnimationFrame(tryExecute)
      }
    }
    requestAnimationFrame(tryExecute)
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.stopMonitoring()

    // Stop all render loops
    for (const moduleName of this.renderLoops.keys()) {
      this.stopRenderLoop(moduleName)
    }

    // Clear all data
    this.modules.clear()
    this.metrics.clear()
    this.renderLoops.clear()
    this.throttledModules.clear()
    this.dependencies.clear()
    this.updateQueue.clear()

    devLog('🧹 PerformanceManager disposed')
  }
}

// Global performance manager instance
export const performanceManager = new ModulePerformanceManager()

// Module registration helpers
export const MODULE_CONFIGS = {
  ANIMATION: {
    name: 'animation',
    priority: 8,
    maxFrameTime: 4.0, // 4ms max
    maxMemoryMB: 100,
    updateFrequency: 60, // 60fps for smooth animations
    canBeThrottled: true,
    dependencies: []
  },
  BLOCK_PLACEMENT: {
    name: 'block-placement',
    priority: 9,
    maxFrameTime: 2.0, // 2ms max for responsive placement
    maxMemoryMB: 50,
    updateFrequency: 60,
    canBeThrottled: false, // Never throttle user input
    dependencies: []
  },
  SKYBOX: {
    name: 'skybox',
    priority: 3,
    maxFrameTime: 1.0, // 1ms max - skybox is mostly static
    maxMemoryMB: 128,
    updateFrequency: 30, // 30fps is fine for skybox
    canBeThrottled: true,
    dependencies: []
  },
  PLAYER_CONTROL: {
    name: 'player-control',
    priority: 10, // Highest priority
    maxFrameTime: 3.0,
    maxMemoryMB: 32,
    updateFrequency: 60, // 60fps for responsive controls
    canBeThrottled: false,
    dependencies: []
  },
  SIMULANTS: {
    name: 'simulants',
    priority: 6,
    maxFrameTime: 6.0,
    maxMemoryMB: 200,
    updateFrequency: 30, // 30fps for AI updates
    canBeThrottled: true,
    dependencies: ['animation']
  },
  WORLD_SYNC: {
    name: 'world-sync',
    priority: 7,
    maxFrameTime: 3.0,
    maxMemoryMB: 64,
    updateFrequency: 20, // 20fps for network sync
    canBeThrottled: true,
    dependencies: ['block-placement']
  }
} as const

export default performanceManager
