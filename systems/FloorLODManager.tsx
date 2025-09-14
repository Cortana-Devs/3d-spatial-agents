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

export class FloorLODManager {
  private camera: THREE.Camera
  private floors: Map<string, FrostedGlassFloor> = new Map()
  private lodCache: Map<string, LODLevel> = new Map()
  private performanceThresholds: PerformanceThresholds
  private effectsEnabled: boolean = true
  private reflectionQuality: 'off' | 'low' | 'medium' | 'high' = 'medium'
  private causticQuality: 'off' | 'low' | 'medium' | 'high' = 'medium'
  private maxTransparentFloors: number = 100
  private currentLODs: LODLevel[] = [...LOD_LEVELS]
  
  constructor(camera: THREE.Camera, thresholds: PerformanceThresholds) {
    this.camera = camera
    this.performanceThresholds = thresholds
  }

  updateLODDistances(lodLevels: LODLevel[]): void {
    this.currentLODs = lodLevels
    // Force LOD update on next frame
    this.lodCache.clear()
  }

  setEffectsEnabled(enabled: boolean): void {
    this.effectsEnabled = enabled
  }

  setReflectionQuality(quality: 'off' | 'low' | 'medium' | 'high'): void {
    this.reflectionQuality = quality
  }

  setCausticQuality(quality: 'off' | 'low' | 'medium' | 'high'): void {
    this.causticQuality = quality
  }

  setMaxTransparentFloors(count: number): void {
    this.maxTransparentFloors = count
  }

  getCurrentSettings() {
    return {
      effectsEnabled: this.effectsEnabled,
      reflectionQuality: this.reflectionQuality,
      causticQuality: this.causticQuality,
      maxTransparentFloors: this.maxTransparentFloors,
      currentLODs: this.currentLODs
    }
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
    } as const
    return complexityMap[complexity]
  }

  private isInFrustum(floor: FrostedGlassFloor): boolean {
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
    floor.lodLevel = lod.name
    floor.renderQuality = lod
  }
}
