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
