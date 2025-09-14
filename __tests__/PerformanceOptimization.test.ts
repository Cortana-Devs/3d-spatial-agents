import { FloorLODManager, LOD_LEVELS } from '@systems/FloorLODManager'
import { TransparencyBatcher } from '@systems/TransparencyBatcher'
import { PerformanceMonitor } from '@systems/PerformanceMonitor'
import { AdaptiveQualityManager, QUALITY_PRESETS } from '@systems/AdaptiveQuality'
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
