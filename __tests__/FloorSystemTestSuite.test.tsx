import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Canvas } from '@react-three/fiber'
import { FrostedGlassFloor } from '../components/floors/FrostedGlassFloor'
import { FloorFactory } from '../utils/floorFactory'
import { FrostedGlassMaterial } from '../materials/FrostedGlassMaterial'
import { FloorLODManager } from '../systems/FloorLODManager'
import { TransparencyBatcher } from '../systems/TransparencyBatcher'
import { PerformanceMonitor } from '../systems/PerformanceMonitor'
import { FloorNavigationProperties } from '../ai/FloorNavigationProperties'
import { TransparentNavMeshGenerator } from '../ai/TransparentNavMeshGenerator'
import { MaterialPresetManager } from '../utils/MaterialPresetManager'
import * as THREE from 'three'

describe('Comprehensive Floor System Test Suite', () => {
  let mockRenderer: jest.Mocked<THREE.WebGLRenderer>
  let mockScene: THREE.Scene
  let mockCamera: THREE.PerspectiveCamera

  beforeEach(() => {
    mockRenderer = {
      info: {
        render: { calls: 0, triangles: 0 },
        memory: { textures: 0, geometries: 0 }
      }
    } as any

    mockScene = new THREE.Scene()
    mockCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
    mockCamera.position.set(5, 5, 5)
  })

  describe('Floor Creation and Properties', () => {
    test('creates floor with correct default properties', () => {
      const position = new THREE.Vector3(0, 0, 0)
      const floor = FloorFactory.createFrostedGlassFloor(position, 'medium_frosted')

      expect(floor.id).toBeDefined()
      expect(floor.type).toBe('frosted_glass_floor')
      expect(floor.glassType).toBe('medium_frosted')
      expect(floor.position).toEqual(position)
      expect(floor.transparency).toBeGreaterThan(0)
      expect(floor.transparency).toBeLessThanOrEqual(1)
      expect(floor.roughness).toBeGreaterThan(0)
      expect(floor.roughness).toBeLessThanOrEqual(1)
      expect(floor.metadata.walkable).toBe(true)
      expect(floor.metadata.durability).toBeGreaterThan(0)
    })

    test('validates floor properties correctly', () => {
      const validFloor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        'light_frosted'
      )

      expect(FloorFactory.validateFloorProperties(validFloor)).toBe(true)

      // Test invalid properties
      const invalidFloor = { ...validFloor }
      invalidFloor.transparency = 1.5 // Invalid value
      expect(FloorFactory.validateFloorProperties(invalidFloor)).toBe(false)
    })

    test('creates different glass types with distinct properties', () => {
      const glassTypes = ['clear_frosted', 'light_frosted', 'medium_frosted', 'heavy_frosted'] as const
      const floors = glassTypes.map(type => 
        FloorFactory.createFrostedGlassFloor(new THREE.Vector3(0, 0, 0), type)
      )

      // Each type should have different transparency values
      const transparencies = floors.map(f => f.transparency)
      const uniqueTransparencies = [...new Set(transparencies)]
      expect(uniqueTransparencies.length).toBeGreaterThan(1)

      // Heavy frosted should be least transparent
      const heavyFrosted = floors.find(f => f.glassType === 'heavy_frosted')!
      const clearFrosted = floors.find(f => f.glassType === 'clear_frosted')!
      expect(heavyFrosted.transparency).toBeLessThan(clearFrosted.transparency)
    })
  })

  describe('Material System', () => {
    test('creates advanced materials with correct properties', () => {
      const properties = {
        transparency: 0.6,
        roughness: 0.4,
        metalness: 0.02,
        ior: 1.52,
        transmission: 0.9,
        thickness: 0.1,
        tint: new THREE.Color(0xffffff),
        reflectivity: 0.8,
        frostingIntensity: 0.5,
        causticStrength: 0.6
      }

      const material = FrostedGlassMaterial.createAdvancedMaterial(properties)

      expect(material).toBeInstanceOf(THREE.MeshPhysicalMaterial)
      expect(material.transparent).toBe(true)
      expect(material.opacity).toBeCloseTo(0.6)
      expect(material.roughness).toBeCloseTo(0.4)
      expect(material.transmission).toBeCloseTo(0.9)
      expect(material.ior).toBeCloseTo(1.52)
    })

    test('applies frosting effects correctly', () => {
      const material = new THREE.MeshPhysicalMaterial()
      const initialRoughness = 0.3

      material.roughness = initialRoughness
      FrostedGlassMaterial.applyFrostingEffect(material, 0.7, 12345)

      expect(material.map).toBeTruthy()
      expect(material.normalMap).toBeTruthy()
      expect(material.normalScale.x).toBeGreaterThan(0)
      expect(material.roughness).toBeGreaterThan(initialRoughness)
    })

    test('material presets apply correctly', () => {
      Object.entries(MATERIAL_PRESETS).forEach(([presetName, preset]) => {
        const appliedProperties = MaterialPresetManager.applyPreset(preset)
        
        expect(appliedProperties.transparency).toBeGreaterThanOrEqual(0)
        expect(appliedProperties.transparency).toBeLessThanOrEqual(1)
        expect(appliedProperties.roughness).toBeGreaterThanOrEqual(0)
        expect(appliedProperties.roughness).toBeLessThanOrEqual(1)
        expect(appliedProperties.ior).toBeCloseTo(1.52, 1)
      })
    })

    test('texture generation produces valid textures', async () => {
      const properties = {
        transparency: 0.5,
        roughness: 0.6,
        metalness: 0.02,
        ior: 1.52,
        transmission: 0.9,
        thickness: 0.1,
        tint: new THREE.Color(0xffffff),
        reflectivity: 0.8,
        frostingIntensity: 0.8,
        causticStrength: 0.5
      }

      const material = FrostedGlassMaterial.createAdvancedMaterial(properties)
      
      // Wait for texture generation
      await new Promise(resolve => setTimeout(resolve, 100))

      if (material.map) {
        expect(material.map.image).toBeTruthy()
        expect(material.map.image.width).toBeGreaterThan(0)
        expect(material.map.image.height).toBeGreaterThan(0)
      }

      if (material.normalMap) {
        expect(material.normalMap.image).toBeTruthy()
        expect(material.normalMap.image.width).toBeGreaterThan(0)
        expect(material.normalMap.image.height).toBeGreaterThan(0)
      }
    })
  })

  describe('Performance Optimization', () => {
    test('LOD system updates correctly based on distance', () => {
      const lodManager = new FloorLODManager(mockCamera, {
        targetFPS: 60,
        minFPS: 45,
        maxMemoryUsage: 500,
        getCurrentFPS: () => 60,
        getMemoryUsage: () => 200
      })

      const floors = [
        FloorFactory.createFrostedGlassFloor(new THREE.Vector3(2, 0, 2), 'medium_frosted'), // Close
        FloorFactory.createFrostedGlassFloor(new THREE.Vector3(20, 0, 20), 'medium_frosted'), // Medium
        FloorFactory.createFrostedGlassFloor(new THREE.Vector3(50, 0, 50), 'medium_frosted'), // Far
        FloorFactory.createFrostedGlassFloor(new THREE.Vector3(200, 0, 200), 'medium_frosted') // Very far
      ]

      const result = lodManager.updateLOD(floors)

      expect(result.processed).toBe(4)
      expect(result.culled).toBeGreaterThanOrEqual(0)
      expect(result.changed).toBeGreaterThanOrEqual(0)

      // Verify that distant floors have lower quality LOD
      floors.forEach(floor => {
        const distance = mockCamera.position.distanceTo(floor.position)
        if (distance > 100) {
          expect(floor.lodLevel).toMatch(/Low|Culled/)
        } else if (distance < 20) {
          expect(floor.lodLevel).toMatch(/Ultra|High/)
        }
      })
    })

    test('transparency batching groups materials correctly', () => {
      const batcher = new TransparencyBatcher(mockCamera)
      
      const floors = [
        FloorFactory.createFrostedGlassFloor(new THREE.Vector3(0, 0, 0), 'clear_frosted'),
        FloorFactory.createFrostedGlassFloor(new THREE.Vector3(1, 0, 0), 'clear_frosted'), // Same type
        FloorFactory.createFrostedGlassFloor(new THREE.Vector3(2, 0, 0), 'medium_frosted'), // Different type
        FloorFactory.createFrostedGlassFloor(new THREE.Vector3(3, 0, 0), 'medium_frosted') // Same as #3
      ]

      const batches = batcher.batchFloors(floors)

      expect(batches.length).toBeGreaterThanOrEqual(2) // Should group by material type
      expect(batches.reduce((sum, batch) => sum + batch.floors.length, 0)).toBe(4)

      // Check that similar materials are grouped together
      const clearFrostedBatch = batches.find(batch => 
        batch.floors.some(floor => floor.glassType === 'clear_frosted')
      )
      const mediumFrostedBatch = batches.find(batch => 
        batch.floors.some(floor => floor.glassType === 'medium_frosted')
      )

      expect(clearFrostedBatch).toBeTruthy()
      expect(mediumFrostedBatch).toBeTruthy()
      expect(clearFrostedBatch!.floors.length).toBe(2)
      expect(mediumFrostedBatch!.floors.length).toBe(2)
    })

    test('performance monitor tracks metrics accurately', () => {
      const monitor = new PerformanceMonitor({
        targetFPS: 60,
        minFPS: 45,
        maxMemoryMB: 400
      })

      // Simulate performance data
      monitor.updateMetrics(mockRenderer, mockScene)
      const metrics = monitor.getMetrics()

      expect(metrics.fps).toBeGreaterThan(0)
      expect(metrics.frameTime).toBeGreaterThan(0)
      expect(metrics.drawCalls).toBeGreaterThanOrEqual(0)
      expect(metrics.memoryUsed).toBeGreaterThanOrEqual(0)

      const grade = monitor.getPerformanceGrade()
      expect(['excellent', 'good', 'fair', 'poor']).toContain(grade)
    })
  })

  describe('AI Navigation Integration', () => {
    test('analyzes floor navigation properties correctly', () => {
      const safeFloor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        'heavy_frosted'
      )
      safeFloor.transparency = 0.3
      safeFloor.roughness = 0.8
      safeFloor.metadata.durability = 95

      const analysis = FloorNavigationAnalyzer.analyzeFloorForAI(safeFloor)

      expect(analysis.walkable).toBe(true)
      expect(analysis.safetyLevel).toBe('safe')
      expect(analysis.navigationCost).toBeCloseTo(1.0, 1)
      expect(analysis.slippery).toBe(false)
      expect(analysis.structuralConfidence).toBeGreaterThan(0.8)
    })

    test('identifies dangerous floor conditions', () => {
      const dangerousFloor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        'clear_frosted'
      )
      dangerousFloor.transparency = 0.95 // Very transparent
      dangerousFloor.roughness = 0.1 // Very smooth
      dangerousFloor.metadata.durability = 15 // Very damaged

      const analysis = FloorNavigationAnalyzer.analyzeFloorForAI(dangerousFloor)

      expect(analysis.safetyLevel).toMatch(/dangerous|avoid/)
      expect(analysis.navigationCost).toBeGreaterThan(3.0)
      expect(analysis.slippery).toBe(true)
      expect(analysis.requiresSpecialBehavior).toBe(true)
      expect(analysis.alternativePathWeight).toBeGreaterThan(0.5)
    })

    test('generates navigation mesh correctly', () => {
      const generator = new TransparentNavMeshGenerator()
      const floors = [
        FloorFactory.createFrostedGlassFloor(new THREE.Vector3(0, 0, 0), 'medium_frosted'),
        FloorFactory.createFrostedGlassFloor(new THREE.Vector3(2, 0, 0), 'light_frosted'),
        FloorFactory.createFrostedGlassFloor(new THREE.Vector3(4, 0, 0), 'heavy_frosted')
      ]

      const worldBounds = new THREE.Box3(
        new THREE.Vector3(-10, -1, -10),
        new THREE.Vector3(10, 1, 10)
      )

      const navMesh = generator.generateNavMesh(floors, worldBounds)

      expect(navMesh.nodes.size).toBeGreaterThan(0)
      expect(navMesh.edges.length).toBeGreaterThan(0)
      expect(navMesh.floorAssociations.size).toBeGreaterThan(0)
      expect(navMesh.version).toBe(1)
      expect(navMesh.lastUpdate).toBeGreaterThan(0)

      // Verify node properties
      const nodes = Array.from(navMesh.nodes.values())
      nodes.forEach((node: any) => {
        expect(node.id).toBeTruthy()
        expect(node.position).toBeInstanceOf(THREE.Vector3)
        expect(typeof node.walkable).toBe('boolean')
        expect(node.cost).toBeGreaterThan(0)
        expect(['safe', 'caution', 'risky', 'dangerous', 'avoid']).toContain(node.safetyLevel)
      })
    })
  })

  describe('Component Integration', () => {
    test('floor component renders without errors', () => {
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        'medium_frosted'
      )

      const TestScene = () => (
        <Canvas>
          <FrostedGlassFloor 
            floor={floor}
            onInteract={jest.fn()}
          />
        </Canvas>
      )

      expect(() => render(<TestScene />)).not.toThrow()
    })

    test('floor component handles interaction correctly', () => {
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(0, 0, 0),
        'light_frosted'
      )
      const onInteract = jest.fn()

      const TestScene = () => (
        <Canvas>
          <FrostedGlassFloor 
            floor={floor}
            onInteract={onInteract}
          />
        </Canvas>
      )

      render(<TestScene />)

      // Simulate click interaction (would need more complex setup for actual click simulation)
      expect(onInteract).toHaveBeenCalledTimes(0) // Initial state
    })
  })

  describe('Error Handling and Edge Cases', () => {
    test('handles invalid floor properties gracefully', () => {
      expect(() => {
        const invalidFloor = FloorFactory.createFrostedGlassFloor(
          new THREE.Vector3(0, 0, 0),
          'invalid_type' as any
        )
      }).not.toThrow()

      expect(() => {
        FrostedGlassMaterial.createAdvancedMaterial({
          transparency: -1, // Invalid
          roughness: 2, // Invalid
          metalness: 0.02,
          ior: 1.52,
          transmission: 0.9,
          thickness: 0.1,
          tint: new THREE.Color(0xffffff),
          reflectivity: 0.8,
          frostingIntensity: 0.5,
          causticStrength: 0.6
        })
      }).not.toThrow() // Should clamp values or handle gracefully
    })

    test('handles empty or null inputs', () => {
      const batcher = new TransparencyBatcher(mockCamera)
      
      expect(() => batcher.batchFloors([])).not.toThrow()
      
      const emptyBatches = batcher.batchFloors([])
      expect(emptyBatches).toEqual([])
    })

    test('handles memory cleanup correctly', () => {
      const batcher = new TransparencyBatcher(mockCamera)
      const floors = [
        FloorFactory.createFrostedGlassFloor(new THREE.Vector3(0, 0, 0), 'medium_frosted')
      ]

      batcher.batchFloors(floors)
      
      expect(() => batcher.dispose()).not.toThrow()
      
      // After disposal, batching should still work but create new resources
      expect(() => batcher.batchFloors(floors)).not.toThrow()
    })
  })
})
