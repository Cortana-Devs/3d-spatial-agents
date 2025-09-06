'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { WebGLRenderer, WebGLRenderTarget, HalfFloatType, RGBAFormat } from 'three'

// Mobile device capabilities and optimization profiles
interface MobileDeviceProfile {
  deviceType: 'mobile' | 'tablet' | 'desktop'
  performanceTier: 'low' | 'mid' | 'high'
  supportsWebGL2: boolean
  supportsWebGPU: boolean
  maxTextureSize: number
  deviceMemory?: number
  hardwareConcurrency: number
  gpuVendor?: string
  gpuRenderer?: string
  isApple: boolean
  isAndroid: boolean
  batteryLevel?: number
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical'
  connectionType?: string
  saveDataMode: boolean
}

// Optimization settings based on device profile
interface MobileOptimizationConfig {
  // Rendering optimizations
  pixelRatio: number
  shadowMapSize: number
  enableShadows: boolean
  enablePostProcessing: boolean
  enableSSAO: boolean
  enableBloom: boolean
  enableAntialiasing: boolean

  // Performance limits
  maxInstances: number
  maxDrawCalls: number
  targetFPS: number
  cullDistance: number
  lodDistances: number[]

  // Memory management
  enableGarbageCollection: boolean
  memoryPressureThreshold: number
  textureCompressionEnabled: boolean
  geometryCompressionEnabled: boolean

  // Thermal management
  enableThermalThrottling: boolean
  thermalReductionFactor: number

  // Battery optimization
  enableBatteryOptimization: boolean
  lowBatteryThreshold: number

  // WebGPU preparation
  preferWebGPU: boolean
  webgpuFallbackStrategy: 'webgl2' | 'webgl1' | 'software'

  // Adaptive quality
  enableAdaptiveQuality: boolean
  qualityAdjustmentSpeed: number
  minQualityLevel: number
  maxQualityLevel: number
}

// Performance metrics tracking
interface MobilePerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage: number
  gpuMemoryUsage?: number
  drawCalls: number
  triangles: number
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical'
  batteryLevel?: number
  qualityLevel: number
  cullingEfficiency: number
  renderTime: number
  cpuTime: number
  gpuTime?: number
}

// WebGPU feature detection and preparation
interface WebGPUCapabilities {
  supported: boolean
  adapter?: GPUAdapter
  device?: GPUDevice
  features: string[]
  limits: Record<string, number>
  textureFormats: string[]
}

// Mobile device detection utilities
function detectMobileDevice(): MobileDeviceProfile {
  const userAgent = navigator.userAgent.toLowerCase()
  const isApple = /iphone|ipad|ipod|mac/.test(userAgent)
  const isAndroid = /android/.test(userAgent)
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)

  // Device type classification
  let deviceType: MobileDeviceProfile['deviceType'] = 'desktop'
  if (/ipad|tablet/.test(userAgent) || (isAndroid && !/mobile/.test(userAgent))) {
    deviceType = 'tablet'
  } else if (isMobile) {
    deviceType = 'mobile'
  }

  // Performance tier detection
  let performanceTier: MobileDeviceProfile['performanceTier'] = 'mid'

  // WebGL context for GPU detection
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')

  let gpuVendor = ''
  let gpuRenderer = ''
  let maxTextureSize = 2048

  if (gl) {
    maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (debugInfo) {
      gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || ''
      gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || ''

      // Performance classification based on GPU
      const lowEndGPUs = [
        'adreno 4', 'adreno 5', 'mali-4', 'mali-t6', 'mali-t7',
        'powervr sgx', 'intel hd 4000', 'intel hd 5000'
      ]

      const highEndGPUs = [
        'adreno 6', 'adreno 7', 'mali-g7', 'mali-g9',
        'apple a1', 'apple m1', 'apple m2', 'rtx', 'gtx'
      ]

      const rendererLower = gpuRenderer.toLowerCase()

      if (lowEndGPUs.some(gpu => rendererLower.includes(gpu))) {
        performanceTier = 'low'
      } else if (highEndGPUs.some(gpu => rendererLower.includes(gpu))) {
        performanceTier = 'high'
      }
    }
  }

  // Memory-based performance adjustment
  const deviceMemory = (navigator as any).deviceMemory
  if (deviceMemory) {
    if (deviceMemory <= 2) performanceTier = 'low'
    else if (deviceMemory >= 8) performanceTier = 'high'
  }

  // Hardware concurrency adjustment
  const cores = navigator.hardwareConcurrency || 4
  if (cores <= 2 && performanceTier === 'mid') performanceTier = 'low'
  if (cores >= 8 && performanceTier === 'mid') performanceTier = 'high'

  // Connection info
  const connection = (navigator as any).connection
  const saveDataMode = connection?.saveData || false

  return {
    deviceType,
    performanceTier,
    supportsWebGL2: !!canvas.getContext('webgl2'),
    supportsWebGPU: 'gpu' in navigator,
    maxTextureSize,
    deviceMemory,
    hardwareConcurrency: cores,
    gpuVendor,
    gpuRenderer,
    isApple,
    isAndroid,
    thermalState: 'nominal',
    connectionType: connection?.effectiveType,
    saveDataMode
  }
}

// WebGPU capability detection
async function detectWebGPUCapabilities(): Promise<WebGPUCapabilities> {
  if (!('gpu' in navigator)) {
    return {
      supported: false,
      features: [],
      limits: {},
      textureFormats: []
    }
  }

  try {
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance'
    })

    if (!adapter) {
      return {
        supported: false,
        features: [],
        limits: {},
        textureFormats: []
      }
    }

    const device = await adapter.requestDevice()

    return {
      supported: true,
      adapter,
      device,
      features: Array.from(adapter.features),
      limits: Object.fromEntries(
        Object.entries(adapter.limits).map(([key, value]) => [key, value as number])
      ),
      textureFormats: ['rgba8unorm', 'bgra8unorm'] // Basic formats
    }
  } catch (error) {
    console.warn('WebGPU detection failed:', error)
    return {
      supported: false,
      features: [],
      limits: {},
      textureFormats: []
    }
  }
}

// Configuration presets for different device tiers
const MOBILE_PRESETS: Record<string, MobileOptimizationConfig> = {
  'low': {
    pixelRatio: 1.0,
    shadowMapSize: 512,
    enableShadows: false,
    enablePostProcessing: false,
    enableSSAO: false,
    enableBloom: false,
    enableAntialiasing: false,
    maxInstances: 5000,
    maxDrawCalls: 20,
    targetFPS: 30,
    cullDistance: 100,
    lodDistances: [15, 35, 60],
    enableGarbageCollection: true,
    memoryPressureThreshold: 0.7,
    textureCompressionEnabled: true,
    geometryCompressionEnabled: true,
    enableThermalThrottling: true,
    thermalReductionFactor: 0.5,
    enableBatteryOptimization: true,
    lowBatteryThreshold: 0.2,
    preferWebGPU: false,
    webgpuFallbackStrategy: 'webgl1',
    enableAdaptiveQuality: true,
    qualityAdjustmentSpeed: 0.1,
    minQualityLevel: 0.3,
    maxQualityLevel: 0.8
  },

  'mid': {
    pixelRatio: Math.min(1.5, window.devicePixelRatio),
    shadowMapSize: 1024,
    enableShadows: true,
    enablePostProcessing: true,
    enableSSAO: false,
    enableBloom: false,
    enableAntialiasing: false,
    maxInstances: 15000,
    maxDrawCalls: 35,
    targetFPS: 45,
    cullDistance: 150,
    lodDistances: [20, 50, 100],
    enableGarbageCollection: true,
    memoryPressureThreshold: 0.6,
    textureCompressionEnabled: true,
    geometryCompressionEnabled: false,
    enableThermalThrottling: true,
    thermalReductionFactor: 0.7,
    enableBatteryOptimization: true,
    lowBatteryThreshold: 0.15,
    preferWebGPU: true,
    webgpuFallbackStrategy: 'webgl2',
    enableAdaptiveQuality: true,
    qualityAdjustmentSpeed: 0.05,
    minQualityLevel: 0.5,
    maxQualityLevel: 1.0
  },

  'high': {
    pixelRatio: Math.min(2.0, window.devicePixelRatio),
    shadowMapSize: 2048,
    enableShadows: true,
    enablePostProcessing: true,
    enableSSAO: true,
    enableBloom: true,
    enableAntialiasing: true,
    maxInstances: 30000,
    maxDrawCalls: 60,
    targetFPS: 60,
    cullDistance: 200,
    lodDistances: [25, 75, 150],
    enableGarbageCollection: false,
    memoryPressureThreshold: 0.8,
    textureCompressionEnabled: false,
    geometryCompressionEnabled: false,
    enableThermalThrottling: false,
    thermalReductionFactor: 0.9,
    enableBatteryOptimization: false,
    lowBatteryThreshold: 0.1,
    preferWebGPU: true,
    webgpuFallbackStrategy: 'webgl2',
    enableAdaptiveQuality: false,
    qualityAdjustmentSpeed: 0.02,
    minQualityLevel: 0.8,
    maxQualityLevel: 1.0
  }
}

// Thermal management class
class ThermalManager {
  private thermalState: MobileDeviceProfile['thermalState'] = 'nominal'
  private frameTimings: number[] = []
  private lastThermalCheck = 0

  constructor(private onStateChange: (state: MobileDeviceProfile['thermalState']) => void) {}

  updateFrameTime(frameTime: number) {
    this.frameTimings.push(frameTime)
    if (this.frameTimings.length > 60) {
      this.frameTimings.shift()
    }

    const now = performance.now()
    if (now - this.lastThermalCheck > 2000) { // Check every 2 seconds
      this.checkThermalState()
      this.lastThermalCheck = now
    }
  }

  private checkThermalState() {
    if (this.frameTimings.length < 30) return

    const recentAvg = this.frameTimings.slice(-30).reduce((a, b) => a + b) / 30
    const overallAvg = this.frameTimings.reduce((a, b) => a + b) / this.frameTimings.length

    const degradation = recentAvg / Math.max(overallAvg, 1)
    let newState: MobileDeviceProfile['thermalState'] = 'nominal'

    if (degradation > 2.5) newState = 'critical'
    else if (degradation > 2.0) newState = 'serious'
    else if (degradation > 1.5) newState = 'fair'

    if (newState !== this.thermalState) {
      this.thermalState = newState
      this.onStateChange(newState)
    }
  }

  getCurrentState() {
    return this.thermalState
  }

  getThrottleMultiplier(): number {
    switch (this.thermalState) {
      case 'critical': return 0.5
      case 'serious': return 0.7
      case 'fair': return 0.85
      default: return 1.0
    }
  }
}

// Battery optimization class
class BatteryManager {
  private batteryInfo: { level: number; charging: boolean } | null = null
  private performanceMode: 'power-saver' | 'balanced' | 'performance' = 'balanced'

  constructor(private onModeChange: (mode: string) => void) {
    this.initBatteryAPI()
  }

  private async initBatteryAPI() {
    if (!('getBattery' in navigator)) return

    try {
      const battery = await (navigator as any).getBattery()
      this.batteryInfo = {
        level: battery.level,
        charging: battery.charging
      }

      battery.addEventListener('levelchange', () => {
        this.batteryInfo!.level = battery.level
        this.updatePerformanceMode()
      })

      this.updatePerformanceMode()
    } catch (error) {
      console.warn('Battery API not supported:', error)
    }
  }

  private updatePerformanceMode() {
    if (!this.batteryInfo) return

    const { level, charging } = this.batteryInfo
    let newMode: typeof this.performanceMode

    if (!charging && level < 0.15) newMode = 'power-saver'
    else if (!charging && level < 0.3) newMode = 'balanced'
    else newMode = 'performance'

    if (newMode !== this.performanceMode) {
      this.performanceMode = newMode
      this.onModeChange(newMode)
    }
  }

  getBatteryInfo() {
    return this.batteryInfo
  }

  getPerformanceMultiplier(): number {
    switch (this.performanceMode) {
      case 'power-saver': return 0.6
      case 'balanced': return 0.8
      case 'performance': return 1.0
    }
  }
}

// Adaptive quality manager
class AdaptiveQualityManager {
  private currentQuality = 1.0
  private frameTimings: number[] = []
  private targetFPS: number
  private adjustmentSpeed: number
  private minQuality: number
  private maxQuality: number

  constructor(config: MobileOptimizationConfig) {
    this.targetFPS = config.targetFPS
    this.adjustmentSpeed = config.qualityAdjustmentSpeed
    this.minQuality = config.minQualityLevel
    this.maxQuality = config.maxQualityLevel
  }

  updateFrameTime(frameTime: number): number {
    this.frameTimings.push(frameTime)
    if (this.frameTimings.length > 30) {
      this.frameTimings.shift()
    }

    if (this.frameTimings.length >= 10) {
      const avgFrameTime = this.frameTimings.slice(-10).reduce((a, b) => a + b) / 10
      const targetFrameTime = 1000 / this.targetFPS

      if (avgFrameTime > targetFrameTime * 1.2) {
        this.currentQuality = Math.max(this.minQuality, this.currentQuality - this.adjustmentSpeed)
      } else if (avgFrameTime < targetFrameTime * 0.8) {
        this.currentQuality = Math.min(this.maxQuality, this.currentQuality + this.adjustmentSpeed * 0.5)
      }
    }

    return this.currentQuality
  }

  getCurrentQuality(): number {
    return this.currentQuality
  }

  setQuality(quality: number) {
    this.currentQuality = Math.max(this.minQuality, Math.min(this.maxQuality, quality))
  }
}

// Main mobile optimization hook
export function useMobileOptimization(overrides: Partial<MobileOptimizationConfig> = {}) {
  const { gl, camera, scene } = useThree()

  // Device detection and capabilities
  const [deviceProfile] = useState<MobileDeviceProfile>(() => detectMobileDevice())
  const [webgpuCapabilities, setWebgpuCapabilities] = useState<WebGPUCapabilities | null>(null)

  // Optimization configuration
  const [config, setConfig] = useState<MobileOptimizationConfig>(() => {
    const baseConfig = MOBILE_PRESETS[deviceProfile.performanceTier]
    return { ...baseConfig, ...overrides }
  })

  // Performance tracking
  const [metrics, setMetrics] = useState<MobilePerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    drawCalls: 0,
    triangles: 0,
    thermalState: 'nominal',
    qualityLevel: 1.0,
    cullingEfficiency: 0,
    renderTime: 0,
    cpuTime: 0
  })

  // Management systems
  const thermalManagerRef = useRef<ThermalManager>()
  const batteryManagerRef = useRef<BatteryManager>()
  const qualityManagerRef = useRef<AdaptiveQualityManager>()
  const frameTimesRef = useRef<number[]>([])
  const lastMetricsUpdate = useRef<number>(0)

  // Initialize WebGPU detection
  useEffect(() => {
    if (config.preferWebGPU) {
      detectWebGPUCapabilities().then(setWebgpuCapabilities)
    }
  }, [config.preferWebGPU])

  // Initialize management systems
  useEffect(() => {
    if (config.enableThermalThrottling) {
      thermalManagerRef.current = new ThermalManager((state) => {
        setMetrics(prev => ({ ...prev, thermalState: state }))
      })
    }

    if (config.enableBatteryOptimization) {
      batteryManagerRef.current = new BatteryManager((mode) => {
        console.log(`Battery mode: ${mode}`)
      })
    }

    if (config.enableAdaptiveQuality) {
      qualityManagerRef.current = new AdaptiveQualityManager(config)
    }
  }, [config])

  // Configure WebGL renderer for mobile
  useEffect(() => {
    if (!gl) return

    // Basic mobile optimizations
    gl.setPixelRatio(config.pixelRatio)
    gl.shadowMap.enabled = config.enableShadows
    gl.shadowMap.setSize(config.shadowMapSize, config.shadowMapSize)
    gl.antialias = config.enableAntialiasing

    // Mobile-specific settings
    if (deviceProfile.deviceType === 'mobile') {
      gl.powerPreference = 'high-performance'
      gl.depth = true
      gl.stencil = false
      gl.sortObjects = false

      // Enable mobile-optimized extensions
      const mobileExtensions = [
        'OES_vertex_array_object',
        'ANGLE_instanced_arrays',
        'WEBGL_compressed_texture_s3tc',
        'WEBGL_compressed_texture_etc1',
        'WEBGL_compressed_texture_pvrtc'
      ]

      mobileExtensions.forEach(ext => {
        try {
          gl.getExtension(ext)
        } catch (e) {
          // Extension not supported
        }
      })
    }
  }, [gl, config, deviceProfile])

  // Main optimization loop
  useFrame((state, deltaTime) => {
    if (!gl) return

    const now = performance.now()
    const frameTime = deltaTime * 1000

    // Update frame timing
    frameTimesRef.current.push(frameTime)
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift()
    }

    // Update thermal management
    thermalManagerRef.current?.updateFrameTime(frameTime)

    // Update adaptive quality
    let currentQuality = 1.0
    if (qualityManagerRef.current) {
      currentQuality = qualityManagerRef.current.updateFrameTime(frameTime)
    }

    // Apply thermal throttling
    const thermalMultiplier = thermalManagerRef.current?.getThrottleMultiplier() || 1.0

    // Apply battery optimization
    const batteryMultiplier = batteryManagerRef.current?.getPerformanceMultiplier() || 1.0

    // Final quality level
    const finalQuality = currentQuality * thermalMultiplier * batteryMultiplier

    // Apply optimizations based on quality level
    if (finalQuality < 1.0) {
      const adjustedPixelRatio = config.pixelRatio * Math.max(0.5, finalQuality)
      gl.setPixelRatio(adjustedPixelRatio)
    }

    // Update metrics every second
    if (now - lastMetricsUpdate.current >= 1000) {
      const fps = frameTimesRef.current.length > 0 ?
        1000 / (frameTimesRef.current.reduce((a, b) => a + b) / frameTimesRef.current.length) : 60

      let memoryUsage = 0
      if ('memory' in performance) {
        const memory = (performance as any).memory
        memoryUsage = memory.usedJSHeapSize || 0
      }

      const newMetrics: MobilePerformanceMetrics = {
        fps,
        frameTime: frameTimesRef.current[frameTimesRef.current.length - 1] || 16.67,
        memoryUsage,
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        thermalState: thermalManagerRef.current?.getCurrentState() || 'nominal',
        batteryLevel: batteryManagerRef.current?.getBatteryInfo()?.level,
        qualityLevel: finalQuality,
        cullingEfficiency: 0, // Would be provided by culling system
        renderTime: frameTime,
        cpuTime: frameTime
      }

      setMetrics(newMetrics)
      lastMetricsUpdate.current = now
    }
  })

  // Configuration update function
  const updateConfig = useCallback((updates: Partial<MobileOptimizationConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }, [])

  // Quality adjustment functions
  const adjustQuality = useCallback((factor: number) => {
    qualityManagerRef.current?.setQuality(factor)
  }, [])

  const resetOptimizations = useCallback(() => {
    const baseConfig = MOBILE_PRESETS[deviceProfile.performanceTier]
    setConfig({ ...baseConfig, ...overrides })
    qualityManagerRef.current?.setQuality(1.0)
  }, [deviceProfile.performanceTier, overrides])

  // WebGPU transition function (for future use)
  const transitionToWebGPU = useCallback(async () => {
    if (!webgpuCapabilities?.supported) {
      console.warn('WebGPU not supported, staying with WebGL')
      return false
    }

    // WebGPU transition logic would go here
    console.log('WebGPU transition prepared but not implemented yet')
    return true
  }, [webgpuCapabilities])

  return {
    // Device info
    deviceProfile,
    webgpuCapabilities,

    // Configuration
    config,
    updateConfig,
    resetOptimizations,

    // Performance metrics
    metrics,

    // Quality control
    adjustQuality,
    currentQuality: qualityManagerRef.current?.getCurrentQuality() || 1.0,

    // Feature flags
    isMobile: deviceProfile.deviceType !== 'desktop',
    isLowEnd: deviceProfile.performanceTier === 'low',
    supportsWebGPU: webgpuCapabilities?.supported || false,

    // Future features
    transitionToWebGPU,

    // Optimization recommendations
    recommendations: useMemo(() => {
      const recs: string[] = []

      if (metrics.fps < config.targetFPS * 0.8) {
        recs.push('Consider reducing render quality or instance count')
      }

      if (metrics.thermalState === 'critical') {
        recs.push('Device overheating - immediate quality reduction recommended')
      }

      if (metrics.batteryLevel && metrics.batteryLevel < config.lowBatteryThreshold) {
        recs.push('Low battery - switch to power saver mode')
      }

      if (deviceProfile.performanceTier === 'low' && config.enableShadows) {
        recs.push('Disable shadows for better performance on low-end device')
      }

      if (metrics.drawCalls > config.maxDrawCalls) {
        recs.push('Too many draw calls - enable batching or reduce unique materials')
      }

      return recs
    }, [metrics, config, deviceProfile])
  }
}

export default useMobileOptimization
