'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'

// Mobile performance metrics interface
interface MobilePerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage: number
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  programs: number
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical'
  batteryLevel?: number
  batteryCharging?: boolean
  devicePixelRatio: number
  viewportSize: { width: number; height: number }
  qualityLevel: number
  culledObjects: number
  visibleObjects: number
}

// Performance grade calculation
type PerformanceGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F'

interface PerformanceRecommendation {
  type: 'critical' | 'warning' | 'suggestion'
  message: string
  action?: string
}

// Mobile device capabilities
interface DeviceCapabilities {
  isMobile: boolean
  isLowEnd: boolean
  supportsWebGL2: boolean
  supportsWebGPU: boolean
  hardwareConcurrency: number
  maxTextureSize: number
  deviceMemory?: number
  connection?: {
    effectiveType: string
    downlink: number
    rtt: number
    saveData: boolean
  }
}

// Thermal management system
class ThermalManager {
  private thermalState: MobilePerformanceMetrics['thermalState'] = 'nominal'
  private frameTimings: number[] = []
  private performanceHistory: number[] = []
  private throttleLevel = 1.0
  private cooldownTimer = 0

  constructor(private onStateChange: (state: MobilePerformanceMetrics['thermalState']) => void) {}

  updatePerformance(frameTime: number) {
    this.frameTimings.push(frameTime)
    if (this.frameTimings.length > 120) { // Track 2 seconds at 60fps
      this.frameTimings.shift()
    }

    // Calculate performance degradation
    if (this.frameTimings.length >= 60) {
      const recentAvg = this.frameTimings.slice(-30).reduce((a, b) => a + b, 0) / 30
      const overallAvg = this.frameTimings.reduce((a, b) => a + b, 0) / this.frameTimings.length

      const degradation = recentAvg / Math.max(overallAvg, 1)
      this.performanceHistory.push(degradation)

      if (this.performanceHistory.length > 10) {
        this.performanceHistory.shift()
      }

      this.updateThermalState(degradation)
    }
  }

  private updateThermalState(degradation: number) {
    let newState: MobilePerformanceMetrics['thermalState'] = 'nominal'

    if (degradation > 2.5) {
      newState = 'critical'
      this.throttleLevel = 0.5
      this.cooldownTimer = 300 // 5 seconds
    } else if (degradation > 2.0) {
      newState = 'serious'
      this.throttleLevel = 0.7
      this.cooldownTimer = 180 // 3 seconds
    } else if (degradation > 1.5) {
      newState = 'fair'
      this.throttleLevel = 0.85
      this.cooldownTimer = 120 // 2 seconds
    } else if (this.cooldownTimer > 0) {
      this.cooldownTimer--
      // Keep current throttle level during cooldown
    } else {
      newState = 'nominal'
      this.throttleLevel = Math.min(1.0, this.throttleLevel + 0.01) // Gradual recovery
    }

    if (newState !== this.thermalState) {
      this.thermalState = newState
      this.onStateChange(newState)
    }
  }

  getThrottleLevel(): number {
    return this.throttleLevel
  }

  getCurrentState(): MobilePerformanceMetrics['thermalState'] {
    return this.thermalState
  }

  reset() {
    this.frameTimings = []
    this.performanceHistory = []
    this.throttleLevel = 1.0
    this.thermalState = 'nominal'
  }
}

// Battery optimization system
class BatteryOptimizer {
  private batteryInfo: { level: number; charging: boolean } | null = null
  private performanceMode: 'power-saver' | 'balanced' | 'performance' = 'balanced'

  constructor(private onModeChange: (mode: string) => void) {
    this.initBatteryAPI()
  }

  private async initBatteryAPI() {
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery()

        this.batteryInfo = {
          level: battery.level,
          charging: battery.charging
        }

        battery.addEventListener('levelchange', () => {
          this.batteryInfo!.level = battery.level
          this.updatePerformanceMode()
        })

        battery.addEventListener('chargingchange', () => {
          this.batteryInfo!.charging = battery.charging
          this.updatePerformanceMode()
        })

        this.updatePerformanceMode()
      }
    } catch (error) {
      console.warn('Battery API not supported:', error)
    }
  }

  private updatePerformanceMode() {
    if (!this.batteryInfo) return

    const { level, charging } = this.batteryInfo
    let newMode: typeof this.performanceMode

    if (!charging && level < 0.15) {
      newMode = 'power-saver'
    } else if (!charging && level < 0.30) {
      newMode = 'balanced'
    } else {
      newMode = 'performance'
    }

    if (newMode !== this.performanceMode) {
      this.performanceMode = newMode
      this.onModeChange(newMode)
    }
  }

  getPerformanceMode(): string {
    return this.performanceMode
  }

  getBatteryInfo(): { level: number; charging: boolean } | null {
    return this.batteryInfo
  }

  getOptimizationMultiplier(): number {
    switch (this.performanceMode) {
      case 'power-saver': return 0.6
      case 'balanced': return 0.8
      case 'performance': return 1.0
    }
  }
}

// Device capability detector
function detectDeviceCapabilities(): DeviceCapabilities {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  // Create WebGL context for capability detection
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')

  let capabilities: DeviceCapabilities = {
    isMobile,
    isLowEnd: false,
    supportsWebGL2: !!canvas.getContext('webgl2'),
    supportsWebGPU: 'gpu' in navigator,
    hardwareConcurrency: navigator.hardwareConcurrency || 4,
    maxTextureSize: 2048,
  }

  if (gl) {
    capabilities.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)

    // Detect low-end devices
    const renderer = gl.getParameter(gl.RENDERER) || ''
    const vendor = gl.getParameter(gl.VENDOR) || ''

    const lowEndIndicators = [
      'adreno 4', 'adreno 5', 'mali-4', 'mali-t6', 'mali-t7',
      'powervr sgx', 'intel hd', 'intel iris', 'videocore'
    ]

    capabilities.isLowEnd = lowEndIndicators.some(indicator =>
      renderer.toLowerCase().includes(indicator) ||
      vendor.toLowerCase().includes(indicator)
    )
  }

  // Memory detection (Chrome only)
  if ('deviceMemory' in navigator) {
    capabilities.deviceMemory = (navigator as any).deviceMemory
    if (capabilities.deviceMemory <= 2) {
      capabilities.isLowEnd = true
    }
  }

  // Connection info
  if ('connection' in navigator) {
    const conn = (navigator as any).connection
    capabilities.connection = {
      effectiveType: conn.effectiveType,
      downlink: conn.downlink,
      rtt: conn.rtt,
      saveData: conn.saveData
    }
  }

  // Additional low-end detection
  if (capabilities.hardwareConcurrency <= 2) {
    capabilities.isLowEnd = true
  }

  return capabilities
}

interface MobilePerformanceMonitorProps {
  onMetricsUpdate?: (metrics: MobilePerformanceMetrics) => void
  onRecommendation?: (recommendations: PerformanceRecommendation[]) => void
  targetFPS?: number
  showDebugInfo?: boolean
  enableThermalManagement?: boolean
  enableBatteryOptimization?: boolean
}

export function MobilePerformanceMonitor({
  onMetricsUpdate,
  onRecommendation,
  targetFPS = 30,
  showDebugInfo = false,
  enableThermalManagement = true,
  enableBatteryOptimization = true
}: MobilePerformanceMonitorProps) {
  const { gl, scene, camera } = useThree()

  // State
  const [metrics, setMetrics] = useState<MobilePerformanceMetrics | null>(null)
  const [recommendations, setRecommendations] = useState<PerformanceRecommendation[]>([])
  const [deviceCapabilities] = useState<DeviceCapabilities>(() => detectDeviceCapabilities())

  // Refs
  const frameTimesRef = useRef<number[]>([])
  const thermalManagerRef = useRef<ThermalManager>()
  const batteryOptimizerRef = useRef<BatteryOptimizer>()
  const lastUpdateRef = useRef<number>(0)
  const performanceObserverRef = useRef<PerformanceObserver>()

  // Initialize managers
  useEffect(() => {
    if (enableThermalManagement) {
      thermalManagerRef.current = new ThermalManager((state) => {
        console.log(`Thermal state changed to: ${state}`)
      })
    }

    if (enableBatteryOptimization && deviceCapabilities.isMobile) {
      batteryOptimizerRef.current = new BatteryOptimizer((mode) => {
        console.log(`Battery mode changed to: ${mode}`)
      })
    }

    // Performance observer for more detailed metrics
    if ('PerformanceObserver' in window) {
      performanceObserverRef.current = new PerformanceObserver((list) => {
        // Process performance entries if needed
      })

      try {
        performanceObserverRef.current.observe({
          entryTypes: ['measure', 'navigation', 'paint']
        })
      } catch (e) {
        console.warn('PerformanceObserver not fully supported')
      }
    }

    return () => {
      performanceObserverRef.current?.disconnect()
    }
  }, [enableThermalManagement, enableBatteryOptimization, deviceCapabilities.isMobile])

  // Calculate performance grade
  const calculateGrade = useCallback((fps: number, frameTime: number): PerformanceGrade => {
    const targetFrameTime = 1000 / targetFPS
    const efficiency = Math.min(1, targetFrameTime / frameTime)

    if (efficiency >= 0.95) return 'A+'
    if (efficiency >= 0.85) return 'A'
    if (efficiency >= 0.70) return 'B'
    if (efficiency >= 0.50) return 'C'
    if (efficiency >= 0.30) return 'D'
    return 'F'
  }, [targetFPS])

  // Generate recommendations
  const generateRecommendations = useCallback((currentMetrics: MobilePerformanceMetrics): PerformanceRecommendation[] => {
    const recs: PerformanceRecommendation[] = []
    const targetFrameTime = 1000 / targetFPS

    if (currentMetrics.frameTime > targetFrameTime * 1.5) {
      recs.push({
        type: 'critical',
        message: `Frame time ${currentMetrics.frameTime.toFixed(1)}ms exceeds target ${targetFrameTime.toFixed(1)}ms`,
        action: 'Reduce render quality or block count'
      })
    }

    if (currentMetrics.drawCalls > 50) {
      recs.push({
        type: 'warning',
        message: `High draw calls (${currentMetrics.drawCalls})`,
        action: 'Enable instanced rendering or reduce unique materials'
      })
    }

    if (currentMetrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      recs.push({
        type: 'warning',
        message: 'High memory usage detected',
        action: 'Clear unused textures and geometries'
      })
    }

    if (currentMetrics.thermalState === 'critical') {
      recs.push({
        type: 'critical',
        message: 'Device overheating detected',
        action: 'Immediately reduce render quality'
      })
    } else if (currentMetrics.thermalState === 'serious') {
      recs.push({
        type: 'warning',
        message: 'Device running hot',
        action: 'Consider reducing effects quality'
      })
    }

    if (deviceCapabilities.isLowEnd && currentMetrics.fps < targetFPS * 0.8) {
      recs.push({
        type: 'suggestion',
        message: 'Low-end device detected with poor performance',
        action: 'Switch to ultra-low quality preset'
      })
    }

    const batteryInfo = batteryOptimizerRef.current?.getBatteryInfo()
    if (batteryInfo && !batteryInfo.charging && batteryInfo.level < 0.2) {
      recs.push({
        type: 'warning',
        message: 'Low battery detected',
        action: 'Switch to power-saver mode'
      })
    }

    return recs
  }, [targetFPS, deviceCapabilities.isLowEnd])

  // Main performance monitoring loop
  useFrame((state, deltaTime) => {
    if (!gl) return

    const now = performance.now()
    const frameTime = deltaTime * 1000 // Convert to milliseconds

    // Update frame timing
    frameTimesRef.current.push(frameTime)
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift()
    }

    // Update thermal management
    if (thermalManagerRef.current) {
      thermalManagerRef.current.updatePerformance(frameTime)
    }

    // Update metrics every second
    if (now - lastUpdateRef.current >= 1000 && frameTimesRef.current.length > 10) {
      const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length
      const fps = 1000 / avgFrameTime

      // Get memory info
      let memoryUsage = 0
      if ('memory' in performance) {
        const memory = (performance as any).memory
        memoryUsage = memory.usedJSHeapSize || 0
      }

      // Get render info
      const renderInfo = gl.info.render
      const memoryInfo = gl.info.memory

      // Calculate quality level based on thermal throttling and battery
      let qualityLevel = 1.0
      if (thermalManagerRef.current) {
        qualityLevel *= thermalManagerRef.current.getThrottleLevel()
      }
      if (batteryOptimizerRef.current) {
        qualityLevel *= batteryOptimizerRef.current.getOptimizationMultiplier()
      }

      const currentMetrics: MobilePerformanceMetrics = {
        fps,
        frameTime: avgFrameTime,
        memoryUsage,
        drawCalls: renderInfo.calls,
        triangles: renderInfo.triangles,
        geometries: memoryInfo.geometries,
        textures: memoryInfo.textures,
        programs: renderInfo.programs || 0,
        thermalState: thermalManagerRef.current?.getCurrentState() || 'nominal',
        batteryLevel: batteryOptimizerRef.current?.getBatteryInfo()?.level,
        batteryCharging: batteryOptimizerRef.current?.getBatteryInfo()?.charging,
        devicePixelRatio: window.devicePixelRatio,
        viewportSize: { width: window.innerWidth, height: window.innerHeight },
        qualityLevel,
        culledObjects: 0, // This would come from your culling system
        visibleObjects: scene.children.length
      }

      setMetrics(currentMetrics)
      onMetricsUpdate?.(currentMetrics)

      // Generate recommendations
      const newRecommendations = generateRecommendations(currentMetrics)
      setRecommendations(newRecommendations)
      onRecommendation?.(newRecommendations)

      lastUpdateRef.current = now
    }
  })

  // Debug UI component
  if (!showDebugInfo || !metrics) return null

  return (
    <div className="fixed top-4 right-4 z-50 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs font-mono max-w-sm">
      <div className="mb-2">
        <div className="text-green-400 font-bold">📱 Mobile Performance Monitor</div>
        <div className="text-gray-300">Grade: {calculateGrade(metrics.fps, metrics.frameTime)}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>FPS: <span className={metrics.fps >= targetFPS ? 'text-green-400' : 'text-red-400'}>{metrics.fps.toFixed(1)}</span></div>
        <div>Frame: {metrics.frameTime.toFixed(1)}ms</div>
        <div>Memory: {(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
        <div>Draws: {metrics.drawCalls}</div>
        <div>Triangles: {metrics.triangles.toLocaleString()}</div>
        <div>Quality: {(metrics.qualityLevel * 100).toFixed(0)}%</div>
      </div>

      <div className="mb-2">
        <div>Thermal: <span className={
          metrics.thermalState === 'nominal' ? 'text-green-400' :
          metrics.thermalState === 'fair' ? 'text-yellow-400' :
          metrics.thermalState === 'serious' ? 'text-orange-400' : 'text-red-400'
        }>{metrics.thermalState}</span></div>

        {metrics.batteryLevel && (
          <div>Battery: {(metrics.batteryLevel * 100).toFixed(0)}%
            {metrics.batteryCharging && ' ⚡'}</div>
        )}
      </div>

      <div className="mb-2 text-xs">
        <div>Device: {deviceCapabilities.isMobile ? 'Mobile' : 'Desktop'}</div>
        <div>GPU: {deviceCapabilities.isLowEnd ? 'Low-end' : 'Standard'}</div>
        <div>WebGL2: {deviceCapabilities.supportsWebGL2 ? '✅' : '❌'}</div>
        <div>WebGPU: {deviceCapabilities.supportsWebGPU ? '✅' : '❌'}</div>
      </div>

      {recommendations.length > 0 && (
        <div className="border-t border-gray-600 pt-2">
          <div className="text-yellow-400 font-bold mb-1">Recommendations:</div>
          {recommendations.slice(0, 3).map((rec, i) => (
            <div key={i} className={`text-xs mb-1 ${
              rec.type === 'critical' ? 'text-red-400' :
              rec.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'
            }`}>
              • {rec.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Hook for accessing performance metrics
export function useMobilePerformanceMetrics() {
  const [metrics, setMetrics] = useState<MobilePerformanceMetrics | null>(null)
  const [recommendations, setRecommendations] = useState<PerformanceRecommendation[]>([])

  const handleMetricsUpdate = useCallback((newMetrics: MobilePerformanceMetrics) => {
    setMetrics(newMetrics)
  }, [])

  const handleRecommendation = useCallback((newRecommendations: PerformanceRecommendation[]) => {
    setRecommendations(newRecommendations)
  }, [])

  return {
    metrics,
    recommendations,
    handleMetricsUpdate,
    handleRecommendation
  }
}

export default MobilePerformanceMonitor
