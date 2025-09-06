import React from 'react'
import { PerformanceMonitor, PerformanceMetrics } from './PerformanceMonitor'
import { FloorLODManager, LODLevel, LOD_LEVELS } from './FloorLODManager'

export interface QualityPreset {
  name: string
  description: string
  lodBias: number // -1 (lower quality) to 1 (higher quality)
  textureQuality: number // 0.25 to 1.0
  effectsEnabled: boolean
  maxTransparentFloors: number
  reflectionQuality: 'off' | 'low' | 'medium' | 'high'
  causticQuality: 'off' | 'low' | 'medium' | 'high'
}

export const QUALITY_PRESETS: QualityPreset[] = [
  {
    name: 'Ultra',
    description: 'Maximum quality for high-end hardware',
    lodBias: 1.0,
    textureQuality: 1.0,
    effectsEnabled: true,
    maxTransparentFloors: 200,
    reflectionQuality: 'high',
    causticQuality: 'high'
  },
  {
    name: 'High',
    description: 'High quality for modern hardware',
    lodBias: 0.5,
    textureQuality: 0.8,
    effectsEnabled: true,
    maxTransparentFloors: 150,
    reflectionQuality: 'medium',
    causticQuality: 'medium'
  },
  {
    name: 'Medium',
    description: 'Balanced quality and performance',
    lodBias: 0.0,
    textureQuality: 0.6,
    effectsEnabled: true,
    maxTransparentFloors: 100,
    reflectionQuality: 'low',
    causticQuality: 'low'
  },
  {
    name: 'Low',
    description: 'Performance focused for older hardware',
    lodBias: -0.5,
    textureQuality: 0.4,
    effectsEnabled: false,
    maxTransparentFloors: 50,
    reflectionQuality: 'off',
    causticQuality: 'off'
  },
  {
    name: 'Minimal',
    description: 'Minimum quality for maximum performance',
    lodBias: -1.0,
    textureQuality: 0.25,
    effectsEnabled: false,
    maxTransparentFloors: 25,
    reflectionQuality: 'off',
    causticQuality: 'off'
  }
]

export class AdaptiveQualityManager {
  private currentPreset: QualityPreset
  private performanceMonitor: PerformanceMonitor
  private lodManager: FloorLODManager
  private autoAdaptEnabled: boolean = true
  private adaptationCooldown: number = 5000 // 5 seconds
  private lastAdaptation: number = 0
  private performanceHistory: number[] = []

  constructor(
    performanceMonitor: PerformanceMonitor,
    lodManager: FloorLODManager,
    initialPreset: QualityPreset = QUALITY_PRESETS[2] // Medium by default
  ) {
    this.performanceMonitor = performanceMonitor
    this.lodManager = lodManager
    this.currentPreset = initialPreset
    
    // Subscribe to performance updates
    this.performanceMonitor.subscribe(this.handlePerformanceUpdate.bind(this))
  }

  private handlePerformanceUpdate(metrics: PerformanceMetrics): void {
    if (!this.autoAdaptEnabled) return
    
    const currentTime = Date.now()
    if (currentTime - this.lastAdaptation < this.adaptationCooldown) return
    
    // Track performance history
    this.performanceHistory.push(metrics.fps)
    if (this.performanceHistory.length > 30) { // Keep 30 samples
      this.performanceHistory.shift()
    }
    
    // Only adapt if we have enough samples
    if (this.performanceHistory.length < 10) return
    
    const avgFPS = this.performanceHistory.reduce((a, b) => a + b) / this.performanceHistory.length
    const targetFPS = this.performanceMonitor.getThresholds().targetFPS
    const minFPS = this.performanceMonitor.getThresholds().minFPS
    
    // Determine if adaptation is needed
    if (avgFPS < minFPS * 0.9) {
      // Performance is poor, reduce quality
      this.adaptQuality('down', metrics)
    } else if (avgFPS > targetFPS * 1.1 && metrics.memoryUsed < 300) {
      // Performance is excellent and we have memory headroom, potentially increase quality
      this.adaptQuality('up', metrics)
    }
  }

  private adaptQuality(direction: 'up' | 'down', metrics: PerformanceMetrics): void {
    const currentIndex = QUALITY_PRESETS.findIndex(p => p.name === this.currentPreset.name)
    let newIndex = currentIndex
    
    if (direction === 'down' && currentIndex < QUALITY_PRESETS.length - 1) {
      newIndex = currentIndex + 1
    } else if (direction === 'up' && currentIndex > 0) {
      newIndex = currentIndex - 1
    }
    
    if (newIndex !== currentIndex) {
      const newPreset = QUALITY_PRESETS[newIndex]
      this.setQualityPreset(newPreset)
      this.lastAdaptation = Date.now()
      
      console.log(`Adaptive Quality: Changed from ${this.currentPreset.name} to ${newPreset.name}`)
      console.log(`Performance metrics - FPS: ${metrics.fps.toFixed(1)}, Memory: ${metrics.memoryUsed.toFixed(1)}MB`)
    }
  }

  setQualityPreset(preset: QualityPreset): void {
    this.currentPreset = preset
    this.applyPresetSettings()
  }

  private applyPresetSettings(): void {
    // Apply LOD bias to reduce/increase quality levels
    this.adjustLODLevels()
    
    // Apply texture quality scaling
    this.adjustTextureQuality()
    
    // Enable/disable effects based on preset
    this.adjustEffectSettings()
    
    // Set maximum transparent floor count
    this.adjustTransparentFloorLimit()
  }

  private adjustLODLevels(): void {
    const bias = this.currentPreset.lodBias
    
    // Scale LOD distances based on bias
    const scaledLODs = LOD_LEVELS.map(lod => ({
      ...lod,
      maxDistance: Math.max(5, lod.maxDistance * (1 + bias * 0.5))
    }))
    
    this.lodManager.updateLODDistances(scaledLODs)
  }

  private adjustTextureQuality(): void {
    // This would be called when creating or updating textures
    // Would affect the resolution multiplier used when loading textures
  }

  private adjustEffectSettings(): void {
    // Enable/disable caustics, reflections, etc. based on preset
    const effectsEnabled = this.currentPreset.effectsEnabled
    const reflectionQuality = this.currentPreset.reflectionQuality
    const causticQuality = this.currentPreset.causticQuality
    
    // These would communicate with the respective systems
    this.lodManager.setEffectsEnabled(effectsEnabled)
    this.lodManager.setReflectionQuality(reflectionQuality)
    this.lodManager.setCausticQuality(causticQuality)
  }

  private adjustTransparentFloorLimit(): void {
    // Set culling thresholds based on maximum transparent floors
    const maxFloors = this.currentPreset.maxTransparentFloors
    
    // Would affect the batching and culling systems
    this.lodManager.setMaxTransparentFloors(maxFloors)
  }

  getCurrentPreset(): QualityPreset {
    return this.currentPreset
  }

  setAutoAdaptation(enabled: boolean): void {
    this.autoAdaptEnabled = enabled
  }

  isAutoAdaptationEnabled(): boolean {
    return this.autoAdaptEnabled
  }

  getQualityMetrics(): {
    currentPreset: string
    lodBias: number
    textureQuality: number
    effectsEnabled: boolean
    autoAdaptEnabled: boolean
  } {
    return {
      currentPreset: this.currentPreset.name,
      lodBias: this.currentPreset.lodBias,
      textureQuality: this.currentPreset.textureQuality,
      effectsEnabled: this.currentPreset.effectsEnabled,
      autoAdaptEnabled: this.autoAdaptEnabled
    }
  }

  benchmarkSystem(): Promise<QualityPreset> {
    return new Promise((resolve) => {
      console.log('Starting automatic quality benchmark...')
      
      // Start with medium preset
      const mediumPreset = QUALITY_PRESETS[2]
      this.setQualityPreset(mediumPreset)
      
      // Monitor performance for a few seconds
      const samples: number[] = []
      const sampleInterval = setInterval(() => {
        const metrics = this.performanceMonitor.getMetrics()
        samples.push(metrics.fps)
        
        if (samples.length >= 20) { // Collect 20 samples
          clearInterval(sampleInterval)
          
          const avgFPS = samples.reduce((a, b) => a + b) / samples.length
          const recommendedPreset = this.selectOptimalPreset(avgFPS)
          
          this.setQualityPreset(recommendedPreset)
          resolve(recommendedPreset)
          
          console.log(`Benchmark complete. Average FPS: ${avgFPS.toFixed(1)}, Recommended: ${recommendedPreset.name}`)
        }
      }, 100)
    })
  }

  private selectOptimalPreset(avgFPS: number): QualityPreset {
    if (avgFPS >= 55) return QUALITY_PRESETS[0] // Ultra
    if (avgFPS >= 45) return QUALITY_PRESETS[1] // High  
    if (avgFPS >= 35) return QUALITY_PRESETS[2] // Medium
    if (avgFPS >= 25) return QUALITY_PRESETS[3] // Low
    return QUALITY_PRESETS[4] // Minimal
  }
}

export const useAdaptiveQuality = (
  performanceMonitor: PerformanceMonitor,
  lodManager: FloorLODManager
) => {
  const [qualityManager] = React.useState(() => 
    new AdaptiveQualityManager(performanceMonitor, lodManager)
  )
  
  const [currentPreset, setCurrentPreset] = React.useState(qualityManager.getCurrentPreset())
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPreset(qualityManager.getCurrentPreset())
    }, 1000)
    
    return () => clearInterval(interval)
  }, [qualityManager])
  
  return {
    qualityManager,
    currentPreset,
    setQualityPreset: (preset: QualityPreset) => {
      qualityManager.setQualityPreset(preset)
      setCurrentPreset(preset)
    },
    benchmarkSystem: () => qualityManager.benchmarkSystem(),
    qualityPresets: QUALITY_PRESETS
  }
}
