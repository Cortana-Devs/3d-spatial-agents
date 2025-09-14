# Phase 3: Performance Optimization and LOD System

## OBJECTIVE
Implement a comprehensive performance optimization system for frosted glass floors including Level of Detail (LOD), intelligent culling, transparent object batching, and adaptive quality settings. Ensure the system maintains visual quality while achieving target performance metrics across different hardware configurations.

## DELIVERABLES
- Multi-level LOD system for transparent floors
- Intelligent culling and frustum management
- Transparent object batching and sorting system
- Adaptive quality management based on performance metrics
- Memory management and texture streaming
- Performance monitoring and debugging tools

## IMPLEMENTATION TASKS

### Task 3.1: LOD System Architecture
**File**: `systems/FloorLODManager.tsx`

```typescript
import * as THREE from 'three'
import { FrostedGlassFloor } from '../types/floorTypes'

export interface LODLevel {
  name: string
  maxDistance: number
  materialComplexity: 'high' | 'medium' | 'low' | 'minimal'
  textureResolution: 512 | 256 | 128 | 64
  reflectionEnabled: boolean
  causticsEnabled: boolean
  frostingDetail: 'full' | 'reduced' | 'none'
  geometryComplexity: number
}

export const LOD_LEVELS: LODLevel[] = [
  {
    name: 'Ultra',
    maxDistance: 15,
    materialComplexity: 'high',
    textureResolution: 512,
    reflectionEnabled: true,
    causticsEnabled: true,
    frostingDetail: 'full',
    geometryComplexity: 1.0
  },
  {
    name: 'High',
    maxDistance: 35,
    materialComplexity: 'medium',
    textureResolution: 256,
    reflectionEnabled: true,
    causticsEnabled: true,
    frostingDetail: 'reduced',
    geometryComplexity: 0.8
  },
  {
    name: 'Medium',
    maxDistance: 75,
    materialComplexity: 'low',
    textureResolution: 128,
    reflectionEnabled: false,
    causticsEnabled: false,
    frostingDetail: 'reduced',
    geometryComplexity: 0.6
  },
  {
    name: 'Low',
    maxDistance: 150,
    materialComplexity: 'minimal',
    textureResolution: 64,
    reflectionEnabled: false,
    causticsEnabled: false,
    frostingDetail: 'none',
    geometryComplexity: 0.3
  }
]

export class FloorLODManager {
  private camera: THREE.Camera
  private floors: Map<string, FrostedGlassFloor> = new Map()
  private lodCache: Map<string, LODLevel> = new Map()
  private performanceThresholds: PerformanceThresholds
  
  constructor(camera: THREE.Camera, thresholds: PerformanceThresholds) {
    this.camera = camera
    this.performanceThresholds = thresholds
  }

  updateLOD(floors: FrostedGlassFloor[]): LODUpdateResult {
    const updateResult: LODUpdateResult = {
      processed: 0,
      changed: 0,
      culled: 0,
      performanceGain: 0
    }

    floors.forEach(floor => {
      const distance = this.calculateDistance(floor)
      const newLOD = this.determineLODLevel(distance, floor)
      const currentLOD = this.lodCache.get(floor.id)
      
      updateResult.processed++
      
      if (!currentLOD || newLOD.name !== currentLOD.name) {
        this.applyLOD(floor, newLOD)
        this.lodCache.set(floor.id, newLOD)
        updateResult.changed++
        
        if (newLOD.name === 'Culled') {
          updateResult.culled++
        }
      }
    })

    return updateResult
  }

  private calculateDistance(floor: FrostedGlassFloor): number {
    const cameraPosition = this.camera.position
    const floorPosition = floor.position
    return cameraPosition.distanceTo(floorPosition)
  }

  private determineLODLevel(distance: number, floor: FrostedGlassFloor): LODLevel {
    // Check if floor should be culled completely
    if (distance > 150 || !this.isInFrustum(floor)) {
      return { 
        name: 'Culled', 
        maxDistance: Infinity,
        materialComplexity: 'minimal',
        textureResolution: 64,
        reflectionEnabled: false,
        causticsEnabled: false,
        frostingDetail: 'none',
        geometryComplexity: 0
      }
    }

    // Find appropriate LOD level
    for (const lod of LOD_LEVELS) {
      if (distance <= lod.maxDistance) {
        return this.adaptLODForPerformance(lod)
      }
    }

    return LOD_LEVELS[LOD_LEVELS.length - 1]
  }

  private adaptLODForPerformance(baseLOD: LODLevel): LODLevel {
    const currentFPS = this.performanceThresholds.getCurrentFPS()
    const targetFPS = this.performanceThresholds.targetFPS
    
    if (currentFPS < targetFPS * 0.8) {
      // Performance is poor, reduce quality
      return this.degradeLOD(baseLOD)
    } else if (currentFPS > targetFPS * 1.1) {
      // Performance is good, potentially increase quality
      return this.upgradeLOD(baseLOD)
    }
    
    return baseLOD
  }

  private degradeLOD(lod: LODLevel): LODLevel {
    return {
      ...lod,
      materialComplexity: this.reduceMaterialComplexity(lod.materialComplexity),
      textureResolution: Math.max(64, lod.textureResolution / 2) as 512 | 256 | 128 | 64,
      reflectionEnabled: false,
      causticsEnabled: false,
      frostingDetail: lod.frostingDetail === 'full' ? 'reduced' : 'none',
      geometryComplexity: Math.max(0.1, lod.geometryComplexity * 0.7)
    }
  }

  private upgradeLOD(lod: LODLevel): LODLevel {
    const currentIndex = LOD_LEVELS.findIndex(l => l.name === lod.name)
    if (currentIndex > 0) {
      return LOD_LEVELS[currentIndex - 1]
    }
    return lod
  }

  private reduceMaterialComplexity(complexity: 'high' | 'medium' | 'low' | 'minimal'): 'high' | 'medium' | 'low' | 'minimal' {
    const complexityMap = {
      'high': 'medium',
      'medium': 'low', 
      'low': 'minimal',
      'minimal': 'minimal'
    }
    return complexityMap[complexity]
  }

  private isInFrustum(floor: FrostedGlassFloor): boolean {
    // Simplified frustum culling - would need proper frustum implementation
    const frustum = new THREE.Frustum()
    const matrix = new THREE.Matrix4().multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    )
    frustum.setFromProjectionMatrix(matrix)
    
    const floorBounds = new THREE.Box3().setFromCenterAndSize(
      floor.position,
      new THREE.Vector3(1, 0.1, 1)
    )
    
    return frustum.intersectsBox(floorBounds)
  }

  private applyLOD(floor: FrostedGlassFloor, lod: LODLevel): void {
    // This would be called to actually apply the LOD settings to the floor
    floor.lodLevel = lod.name
    floor.renderQuality = lod
  }
}

interface PerformanceThresholds {
  targetFPS: number
  minFPS: number
  maxMemoryUsage: number
  getCurrentFPS(): number
  getMemoryUsage(): number
}

interface LODUpdateResult {
  processed: number
  changed: number
  culled: number
  performanceGain: number
}
```

### Task 3.2: Transparent Object Batching System
**File**: `systems/TransparencyBatcher.tsx`

```typescript
import * as THREE from 'three'
import { FrostedGlassFloor } from '../types/floorTypes'

export interface BatchGroup {
  material: THREE.Material
  floors: FrostedGlassFloor[]
  instancedMesh: THREE.InstancedMesh | null
  needsUpdate: boolean
  lastUpdateFrame: number
}

export class TransparencyBatcher {
  private batchGroups: Map<string, BatchGroup> = new Map()
  private camera: THREE.Camera
  private maxInstancesPerBatch = 100
  private sortingEnabled = true
  
  constructor(camera: THREE.Camera) {
    this.camera = camera
  }

  batchFloors(floors: FrostedGlassFloor[]): BatchGroup[] {
    this.clearBatches()
    
    // Group floors by material properties
    const materialGroups = this.groupByMaterial(floors)
    
    // Create batch groups
    const batches: BatchGroup[] = []
    for (const [materialKey, floorGroup] of materialGroups) {
      const batch = this.createBatchGroup(materialKey, floorGroup)
      if (batch) {
        batches.push(batch)
        this.batchGroups.set(materialKey, batch)
      }
    }
    
    // Sort batches by distance for proper transparency rendering
    if (this.sortingEnabled) {
      this.sortBatchesByDistance(batches)
    }
    
    return batches
  }

  private groupByMaterial(floors: FrostedGlassFloor[]): Map<string, FrostedGlassFloor[]> {
    const groups = new Map<string, FrostedGlassFloor[]>()
    
    floors.forEach(floor => {
      const key = this.generateMaterialKey(floor)
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(floor)
    })
    
    return groups
  }

  private generateMaterialKey(floor: FrostedGlassFloor): string {
    return [
      floor.glassType,
      floor.transparency.toFixed(2),
      floor.roughness.toFixed(2),
      floor.colorTint.getHexString(),
      floor.lodLevel || 'default'
    ].join('_')
  }

  private createBatchGroup(materialKey: string, floors: FrostedGlassFloor[]): BatchGroup | null {
    if (floors.length === 0) return null
    
    // Limit batch size for performance
    const batchedFloors = floors.slice(0, this.maxInstancesPerBatch)
    
    const group: BatchGroup = {
      material: this.createSharedMaterial(floors[0]),
      floors: batchedFloors,
      instancedMesh: null,
      needsUpdate: true,
      lastUpdateFrame: 0
    }
    
    // Create instanced mesh if beneficial (multiple floors with same material)
    if (batchedFloors.length > 3) {
      group.instancedMesh = this.createInstancedMesh(group)
    }
    
    return group
  }

  private createInstancedMesh(batchGroup: BatchGroup): THREE.InstancedMesh {
    const geometry = new THREE.BoxGeometry(1, 0.1, 1)
    const instancedMesh = new THREE.InstancedMesh(
      geometry,
      batchGroup.material,
      batchGroup.floors.length
    )
    
    // Set instance matrices
    const matrix = new THREE.Matrix4()
    batchGroup.floors.forEach((floor, index) => {
      matrix.setPosition(floor.position)
      instancedMesh.setMatrixAt(index, matrix)
    })
    
    instancedMesh.instanceMatrix.needsUpdate = true
    return instancedMesh
  }

  private createSharedMaterial(referenceFloor: FrostedGlassFloor): THREE.Material {
    // Create optimized material based on LOD level
    const lodLevel = referenceFloor.renderQuality
    
    if (!lodLevel || lodLevel.materialComplexity === 'minimal') {
      return new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: referenceFloor.transparency,
        color: referenceFloor.colorTint
      })
    }
    
    const material = new THREE.MeshPhysicalMaterial({
      transparent: true,
      opacity: referenceFloor.transparency,
      roughness: referenceFloor.roughness,
      metalness: 0.02,
      color: referenceFloor.colorTint,
      side: THREE.DoubleSide
    })
    
    // Apply LOD-specific optimizations
    if (lodLevel.materialComplexity === 'high') {
      material.transmission = 0.9
      material.ior = 1.52
      material.clearcoat = 0.3
    } else if (lodLevel.materialComplexity === 'medium') {
      material.transmission = 0.7
      material.ior = 1.52
    }
    
    return material
  }

  private sortBatchesByDistance(batches: BatchGroup[]): void {
    const cameraPosition = this.camera.position
    
    batches.forEach(batch => {
      // Sort floors within each batch by distance
      batch.floors.sort((a, b) => {
        const distA = cameraPosition.distanceTo(a.position)
        const distB = cameraPosition.distanceTo(b.position)
        return distB - distA // Back to front for transparency
      })
      
      // Update instanced mesh if it exists
      if (batch.instancedMesh) {
        const matrix = new THREE.Matrix4()
        batch.floors.forEach((floor, index) => {
          matrix.setPosition(floor.position)
          batch.instancedMesh!.setMatrixAt(index, matrix)
        })
        batch.instancedMesh.instanceMatrix.needsUpdate = true
      }
    })
    
    // Sort batches by average distance
    batches.sort((a, b) => {
      const avgDistA = this.calculateAverageDistance(a.floors)
      const avgDistB = this.calculateAverageDistance(b.floors)
      return avgDistB - avgDistA
    })
  }

  private calculateAverageDistance(floors: FrostedGlassFloor[]): number {
    if (floors.length === 0) return 0
    
    const totalDistance = floors.reduce((sum, floor) => {
      return sum + this.camera.position.distanceTo(floor.position)
    }, 0)
    
    return totalDistance / floors.length
  }

  updateBatches(frameNumber: number): void {
    for (const batch of this.batchGroups.values()) {
      if (batch.needsUpdate && frameNumber - batch.lastUpdateFrame > 3) {
        // Update batch every few frames to avoid performance hits
        if (batch.instancedMesh) {
          this.updateInstancedMesh(batch)
        }
        batch.needsUpdate = false
        batch.lastUpdateFrame = frameNumber
      }
    }
  }

  private updateInstancedMesh(batch: BatchGroup): void {
    const matrix = new THREE.Matrix4()
    batch.floors.forEach((floor, index) => {
      matrix.setPosition(floor.position)
      batch.instancedMesh!.setMatrixAt(index, matrix)
    })
    batch.instancedMesh!.instanceMatrix.needsUpdate = true
  }

  private clearBatches(): void {
    for (const batch of this.batchGroups.values()) {
      if (batch.instancedMesh) {
        batch.instancedMesh.geometry.dispose()
        if (Array.isArray(batch.instancedMesh.material)) {
          batch.instancedMesh.material.forEach(m => m.dispose())
        } else {
          batch.instancedMesh.material.dispose()
        }
      }
    }
    this.batchGroups.clear()
  }

  dispose(): void {
    this.clearBatches()
  }
}
```

### Task 3.3: Performance Monitoring System
**File**: `systems/PerformanceMonitor.tsx`

```typescript
import React, { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'

export interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsed: number
  drawCalls: number
  triangles: number
  transparentObjects: number
  activeLODLevels: Record<string, number>
  gpuMemory: number
}

export interface PerformanceThresholds {
  targetFPS: 60
  minFPS: 45
  maxMemoryMB: 500
  maxDrawCalls: 200
  maxTransparentObjects: 100
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics
  private thresholds: PerformanceThresholds
  private frameHistory: number[] = []
  private lastFrameTime: number = 0
  private updateCallbacks: ((metrics: PerformanceMetrics) => void)[] = []

  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = { ...this.getDefaultThresholds(), ...thresholds }
    this.metrics = this.getInitialMetrics()
  }

  private getDefaultThresholds(): PerformanceThresholds {
    return {
      targetFPS: 60,
      minFPS: 45,
      maxMemoryMB: 500,
      maxDrawCalls: 200,
      maxTransparentObjects: 100
    }
  }

  private getInitialMetrics(): PerformanceMetrics {
    return {
      fps: 60,
      frameTime: 16.67,
      memoryUsed: 0,
      drawCalls: 0,
      triangles: 0,
      transparentObjects: 0,
      activeLODLevels: {},
      gpuMemory: 0
    }
  }

  updateMetrics(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    const currentTime = performance.now()
    
    // Calculate FPS
    if (this.lastFrameTime > 0) {
      const frameTime = currentTime - this.lastFrameTime
      this.frameHistory.push(frameTime)
      
      // Keep only last 60 frames for average calculation
      if (this.frameHistory.length > 60) {
        this.frameHistory.shift()
      }
      
      const avgFrameTime = this.frameHistory.reduce((a, b) => a + b) / this.frameHistory.length
      this.metrics.fps = 1000 / avgFrameTime
      this.metrics.frameTime = avgFrameTime
    }
    
    this.lastFrameTime = currentTime
    
    // Get rendering info
    const info = renderer.info
    this.metrics.drawCalls = info.render.calls
    this.metrics.triangles = info.render.triangles
    
    // Memory usage
    if (performance.memory) {
      this.metrics.memoryUsed = performance.memory.usedJSHeapSize / (1024 * 1024)
    }
    
    // GPU memory (if available)
    if (info.memory) {
      this.metrics.gpuMemory = info.memory.textures + info.memory.geometries
    }
    
    // Count transparent objects
    this.metrics.transparentObjects = this.countTransparentObjects(scene)
    
    // Notify subscribers
    this.updateCallbacks.forEach(callback => callback(this.metrics))
  }

  private countTransparentObjects(scene: THREE.Scene): number {
    let count = 0
    scene.traverse(object => {
      if (object instanceof THREE.Mesh && object.material) {
        const material = Array.isArray(object.material) 
          ? object.material[0] 
          : object.material
        if (material.transparent) {
          count++
        }
      }
    })
    return count
  }

  updateLODMetrics(lodCounts: Record<string, number>): void {
    this.metrics.activeLODLevels = { ...lodCounts }
  }

  isPerformanceGood(): boolean {
    return (
      this.metrics.fps >= this.thresholds.minFPS &&
      this.metrics.memoryUsed <= this.thresholds.maxMemoryMB &&
      this.metrics.drawCalls <= this.thresholds.maxDrawCalls
    )
  }

  getPerformanceGrade(): 'excellent' | 'good' | 'fair' | 'poor' {
    const fpsRatio = this.metrics.fps / this.thresholds.targetFPS
    const memoryRatio = this.metrics.memoryUsed / this.thresholds.maxMemoryMB
    const drawCallRatio = this.metrics.drawCalls / this.thresholds.maxDrawCalls
    
    const overallScore = (fpsRatio + (1 - memoryRatio) + (1 - drawCallRatio)) / 3
    
    if (overallScore >= 0.9) return 'excellent'
    if (overallScore >= 0.7) return 'good'
    if (overallScore >= 0.5) return 'fair'
    return 'poor'
  }

  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = []
    
    if (this.metrics.fps < this.thresholds.minFPS) {
      suggestions.push('Reduce LOD quality or enable more aggressive culling')
    }
    
    if (this.metrics.memoryUsed > this.thresholds.maxMemoryMB) {
      suggestions.push('Reduce texture resolutions or enable texture streaming')
    }
    
    if (this.metrics.drawCalls > this.thresholds.maxDrawCalls) {
      suggestions.push('Enable batching for similar floor materials')
    }
    
    if (this.metrics.transparentObjects > this.thresholds.maxTransparentObjects) {
      suggestions.push('Increase culling distance for transparent objects')
    }
    
    return suggestions
  }

  subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.updateCallbacks.push(callback)
    return () => {
      const index = this.updateCallbacks.indexOf(callback)
      if (index >= 0) {
        this.updateCallbacks.splice(index, 1)
      }
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds }
  }
}

export const usePerformanceMonitor = (thresholds?: Partial<PerformanceThresholds>) => {
  const monitor = useRef<PerformanceMonitor>()
  const [metrics, setMetrics] = useState<PerformanceMetrics>()
  
  useEffect(() => {
    monitor.current = new PerformanceMonitor(thresholds)
    
    const unsubscribe = monitor.current.subscribe(setMetrics)
    return unsubscribe
  }, [thresholds])
  
  useFrame(({ gl, scene }) => {
    if (monitor.current) {
      monitor.current.updateMetrics(gl, scene)
    }
  })
  
  return {
    monitor: monitor.current,
    metrics,
    isPerformanceGood: monitor.current?.isPerformanceGood() ?? true,
    grade: monitor.current?.getPerformanceGrade() ?? 'good',
    suggestions: monitor.current?.getOptimizationSuggestions() ?? []
  }
}
```

### Task 3.4: Adaptive Quality System
**File**: `systems/AdaptiveQuality.tsx`

```typescript
import { PerformanceMonitor, PerformanceMetrics } from './PerformanceMonitor'
import { FloorLODManager, LODLevel } from './FloorLODManager'

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
    // Modify LOD distances based on quality preset
    const bias = this.currentPreset.lodBias
    
    // This would modify the LOD_LEVELS array or create adjusted versions
    // Positive bias increases distances (higher quality at distance)
    // Negative bias decreases distances (lower quality at distance)
  }

  private adjustTextureQuality(): void {
    // This would affect the texture resolution multiplier
    // Applied when materials are created or updated
  }

  private adjustEffectSettings(): void {
    // Enable/disable caustics, reflections, etc. based on preset
    const effectsEnabled = this.currentPreset.effectsEnabled
    
    // Would communicate with effect systems to enable/disable features
  }

  private adjustTransparentFloorLimit(): void {
    // Set culling thresholds based on maximum transparent floors
    const maxFloors = this.currentPreset.maxTransparentFloors
    
    // Would affect the batching and culling systems
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
```

## TESTING REQUIREMENTS

### Task 3.5: Performance Testing Suite
**File**: `__tests__/PerformanceOptimization.test.ts`

```typescript
import { FloorLODManager, LOD_LEVELS } from '../systems/FloorLODManager'
import { TransparencyBatcher } from '../systems/TransparencyBatcher'
import { PerformanceMonitor } from '../systems/PerformanceMonitor'
import { AdaptiveQualityManager, QUALITY_PRESETS } from '../systems/AdaptiveQuality'
import * as THREE from 'three'

describe('Performance Optimization Systems', () => {
  let camera: THREE.Camera
  let performanceMonitor: PerformanceMonitor
  
  beforeEach(() => {
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
    performanceMonitor = new PerformanceMonitor()
  })

  describe('LOD Manager', () => {
    test('correctly determines LOD levels based on distance', () => {
      const lodManager = new FloorLODManager(camera, {
        targetFPS: 60,
        minFPS: 45,
        maxMemoryUsage: 500,
        getCurrentFPS: () => 60,
        getMemoryUsage: () => 200
      })
      
      const testFloor = {
        id: 'test-floor',
        position: new THREE.Vector3(20, 0, 0), // 20 units away
        type: 'frosted_glass_floor' as const,
        glassType: 'medium_frosted' as const,
        transparency: 0.5,
        roughness: 0.6,
        colorTint: new THREE.Color(0xffffff),
        metadata: {
          createdAt: Date.now(),
          placedBy: 'test',
          durability: 100,
          walkable: true
        }
      }
      
      const result = lodManager.updateLOD([testFloor])
      
      expect(result.processed).toBe(1)
      expect(result.changed).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Transparency Batcher', () => {
    test('groups floors by material properties', () => {
      const batcher = new TransparencyBatcher(camera)
      
      const floors = [
        createTestFloor('floor1', 'clear_frosted', 0.8),
        createTestFloor('floor2', 'clear_frosted', 0.8), // Same material
        createTestFloor('floor3', 'medium_frosted', 0.5)  // Different material
      ]
      
      const batches = batcher.batchFloors(floors)
      
      expect(batches.length).toBeGreaterThanOrEqual(2)
      expect(batches[0].floors.length + batches[1].floors.length).toBe(3)
    })
  })

  describe('Performance Monitor', () => {
    test('tracks performance metrics correctly', () => {
      const metrics = performanceMonitor.getMetrics()
      
      expect(metrics).toHaveProperty('fps')
      expect(metrics).toHaveProperty('frameTime')
      expect(metrics).toHaveProperty('memoryUsed')
      expect(metrics).toHaveProperty('drawCalls')
    })

    test('provides performance grade assessment', () => {
      const grade = performanceMonitor.getPerformanceGrade()
      
      expect(['excellent', 'good', 'fair', 'poor']).toContain(grade)
    })
  })

  describe('Adaptive Quality Manager', () => {
    test('selects appropriate quality preset', async () => {
      const lodManager = new FloorLODManager(camera, {
        targetFPS: 60,
        minFPS: 45,
        maxMemoryUsage: 500,
        getCurrentFPS: () => 30, // Poor performance
        getMemoryUsage: () => 400
      })
      
      const qualityManager = new AdaptiveQualityManager(
        performanceMonitor,
        lodManager,
        QUALITY_PRESETS[1] // Start with High
      )
      
      // Simulate performance data that should trigger quality reduction
      performanceMonitor.updateMetrics = jest.fn()
      
      const currentPreset = qualityManager.getCurrentPreset()
      expect(QUALITY_PRESETS).toContain(currentPreset)
    })
  })

  function createTestFloor(id: string, glassType: any, transparency: number) {
    return {
      id,
      position: new THREE.Vector3(0, 0, 0),
      type: 'frosted_glass_floor' as const,
      glassType,
      transparency,
      roughness: 0.6,
      colorTint: new THREE.Color(0xffffff),
      metadata: {
        createdAt: Date.now(),
        placedBy: 'test',
        durability: 100,
        walkable: true
      }
    }
  }
})
```

## VISUAL VALIDATION

### Task 3.6: Performance Testing Scene
**File**: `debug/PerformanceTestScene.tsx`

```typescript
import React, { useState, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Stats } from '@react-three/drei'
import { FrostedGlassFloor } from '../components/floors/FrostedGlassFloor'
import { FloorFactory } from '../utils/floorFactory'
import { usePerformanceMonitor } from '../systems/PerformanceMonitor'
import { useAdaptiveQuality } from '../systems/AdaptiveQuality'
import { QUALITY_PRESETS } from '../systems/AdaptiveQuality'
import * as THREE from 'three'

export const PerformanceTestScene: React.FC = () => {
  const [floorCount, setFloorCount] = useState(25)
  const [showStats, setShowStats] = useState(true)
  const [autoQuality, setAutoQuality] = useState(true)
  
  const { monitor, metrics, isPerformanceGood, grade, suggestions } = usePerformanceMonitor({
    targetFPS: 60,
    minFPS: 45,
    maxMemoryMB: 400
  })
  
  const { qualityManager, currentPreset, setQualityPreset, benchmarkSystem, qualityPresets } = useAdaptiveQuality(
    monitor!,
    // LOD manager would be passed here
    {} as any
  )

  const testFloors = useMemo(() => {
    const floors = []
    const gridSize = Math.ceil(Math.sqrt(floorCount))
    
    for (let i = 0; i < floorCount; i++) {
      const x = (i % gridSize) * 2.5 - (gridSize * 1.25)
      const z = Math.floor(i / gridSize) * 2.5 - (gridSize * 1.25)
      
      const glassTypes = ['clear_frosted', 'light_frosted', 'medium_frosted', 'heavy_frosted']
      const randomType = glassTypes[i % glassTypes.length] as any
      
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(x, 0, z),
        randomType
      )
      
      floors.push(floor)
    }
    
    return floors
  }, [floorCount])

  useEffect(() => {
    if (qualityManager && autoQuality) {
      qualityManager.setAutoAdaptation(true)
    } else if (qualityManager) {
      qualityManager.setAutoAdaptation(false)
    }
  }, [qualityManager, autoQuality])

  const handleBenchmark = async () => {
    if (qualityManager) {
      const recommendedPreset = await benchmarkSystem()
      console.log('Benchmark recommended:', recommendedPreset.name)
    }
  }

  return (
    <>
      <div style={{ 
        position: 'absolute', 
        top: 10, 
        left: 10, 
        zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.9)',
        color: 'white',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '400px',
        fontSize: '14px'
      }}>
        <h3>Performance Testing - Phase 3</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Floor Count: {floorCount}</label>
          <input 
            type="range" 
            min="10" 
            max="200" 
            step="5"
            value={floorCount}
            onChange={(e) => setFloorCount(parseInt(e.target.value))}
            style={{ display: 'block', width: '100%', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Quality Preset:</label>
          <select 
            value={currentPreset.name} 
            onChange={(e) => {
              const preset = qualityPresets.find(p => p.name === e.target.value)
              if (preset) setQualityPreset(preset)
            }}
            style={{ display: 'block', width: '100%', marginTop: '5px' }}
          >
            {qualityPresets.map(preset => (
              <option key={preset.name} value={preset.name}>
                {preset.name} - {preset.description}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>
            <input 
              type="checkbox" 
              checked={autoQuality} 
              onChange={(e) => setAutoQuality(e.target.checked)}
            />
            Auto Quality Adaptation
          </label>
        </div>

        <button 
          onClick={handleBenchmark}
          style={{ 
            padding: '8px 16px', 
            marginBottom: '15px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Run Benchmark
        </button>

        {metrics && (
          <div style={{ marginBottom: '15px', fontSize: '12px' }}>
            <h4>Performance Metrics:</h4>
            <div>FPS: {metrics.fps.toFixed(1)} ({grade})</div>
            <div>Frame Time: {metrics.frameTime.toFixed(1)}ms</div>
            <div>Memory: {metrics.memoryUsed.toFixed(1)}MB</div>
            <div>Draw Calls: {metrics.drawCalls}</div>
            <div>Triangles: {metrics.triangles.toLocaleString()}</div>
            <div>Transparent Objects: {metrics.transparentObjects}</div>
            <div style={{ 
              color: isPerformanceGood ? '#4CAF50' : '#f44336',
              fontWeight: 'bold'
            }}>
              Status: {isPerformanceGood ? 'GOOD' : 'POOR'}
            </div>
          </div>
        )}

        {suggestions.length > 0 && (
          <div style={{ fontSize: '11px', opacity: 0.8 }}>
            <h4>Optimization Suggestions:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ marginTop: '15px' }}>
          <label>
            <input 
              type="checkbox" 
              checked={showStats} 
              onChange={(e) => setShowStats(e.target.checked)}
            />
            Show Performance Stats
          </label>
        </div>
      </div>

      <Canvas camera={{ position: [10, 8, 10] }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 8, 5]} intensity={1.2} />
        <pointLight position={[-5, 6, -5]} intensity={0.8} color="#4ecdc4" />
        
        <Environment preset="city" />

        {testFloors.map(floor => (
          <FrostedGlassFloor
            key={floor.id}
            floor={floor}
            lodEnabled={true}
            batchingEnabled={true}
          />
        ))}

        {/* Reference objects for depth and scale */}
        <mesh position={[0, -1, 0]}>
          <boxGeometry args={[20, 0.1, 20]} />
          <meshStandardMaterial color="#2c3e50" />
        </mesh>

        {Array.from({ length: 5 }).map((_, i) => (
          <mesh key={i} position={[i * 4 - 8, 2, -8]}>
            <sphereGeometry args={[0.5]} />
            <meshStandardMaterial color={`hsl(${i * 60}, 70%, 50%)`} />
          </mesh>
        ))}

        {showStats && <Stats />}
        <OrbitControls />
      </Canvas>
    </>
  )
}
```

## SUCCESS CRITERIA

### Performance Validation Checklist:
- [ ] LOD system reduces quality appropriately with distance
- [ ] Frame rate maintains 45+ FPS with 100+ transparent floors
- [ ] Memory usage stays under 400MB during stress testing
- [ ] Draw calls are minimized through effective batching
- [ ] Transparent objects sort correctly for proper rendering
- [ ] Adaptive quality system responds to performance changes
- [ ] Culling system effectively removes off-screen objects
- [ ] Performance monitoring provides accurate real-time data

### Technical Validation:
- [ ] LOD transitions are smooth and not visually jarring
- [ ] Batching system correctly groups similar materials
- [ ] Performance monitor accurately tracks all metrics
- [ ] Adaptive quality makes appropriate adjustments
- [ ] Memory management prevents leaks during testing
- [ ] All optimization systems work together harmoniously

### Performance Benchmarks:
- [ ] 50 floors: 60+ FPS consistently
- [ ] 100 floors: 45+ FPS with adaptive quality
- [ ] 200 floors: 30+ FPS on lowest quality settings
- [ ] Memory usage scales linearly with floor count
- [ ] Quality adaptation responds within 5 seconds

## INTEGRATION POINTS

### Integration with Phase 2:
- LOD system works with advanced materials
- Performance monitoring tracks material complexity
- Adaptive quality adjusts material effects appropriately

### Preparation for Phase 4:
- Performance metrics will inform AI navigation costs
- LOD system will need AI-aware culling considerations
- Quality settings will affect AI pathfinding performance

## ESTIMATED TIME: 5-6 days

This phase creates a robust performance foundation that ensures the floor system remains responsive and visually appealing across a wide range of hardware configurations and usage scenarios.