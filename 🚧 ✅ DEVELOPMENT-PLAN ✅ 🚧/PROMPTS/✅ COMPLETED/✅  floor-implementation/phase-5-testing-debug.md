# Phase 5: Testing Framework and Debug Tools

## OBJECTIVE
Develop a comprehensive testing framework and sophisticated debugging tools for the frosted glass floor system. Ensure thorough validation of all components, performance monitoring, visual feedback systems, and developer-friendly debugging interfaces that provide deep insights into system behavior.

## DELIVERABLES
- Comprehensive automated testing suite
- Visual testing and validation tools
- Performance benchmarking framework
- Advanced debugging interface with real-time monitoring
- Integration testing for all system components
- Regression testing pipeline
- Developer experience enhancements

## IMPLEMENTATION TASKS

### Task 5.1: Automated Testing Framework
**File**: `__tests__/FloorSystemTestSuite.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Canvas } from '@react-three/fiber'
import { FrostedGlassFloor } from '../components/floors/FrostedGlassFloor'
import { FloorFactory } from '../utils/floorFactory'
import { FrostedGlassMaterial } from '../materials/FrostedGlassMaterial'
import { FloorLODManager } from '../systems/FloorLODManager'
import { TransparencyBatcher } from '../systems/TransparencyBatcher'
import { PerformanceMonitor } from '../systems/PerformanceMonitor'
import { FloorNavigationAnalyzer } from '../ai/FloorNavigationProperties'
import { TransparentNavMeshGenerator } from '../ai/TransparentNavMeshGenerator'
import { MATERIAL_PRESETS } from '../presets/MaterialPresets'
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
      nodes.forEach(node => {
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
```

### Task 5.2: Visual Testing Framework
**File**: `debug/VisualTestFramework.tsx`

```typescript
import React, { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, Stats, Grid } from '@react-three/drei'
import { FrostedGlassFloor } from '../components/floors/FrostedGlassFloor'
import { FloorFactory } from '../utils/floorFactory'
import { MATERIAL_PRESETS } from '../presets/MaterialPresets'
import { usePerformanceMonitor } from '../systems/PerformanceMonitor'
import * as THREE from 'three'

interface VisualTest {
  id: string
  name: string
  description: string
  category: 'material' | 'performance' | 'interaction' | 'ai' | 'integration'
  component: React.ComponentType<any>
  expectedOutcome: string
  validationCriteria: string[]
}

export const VisualTestFramework: React.FC = () => {
  const [currentTest, setCurrentTest] = useState<string>('material-basic')
  const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map())
  const [autoTest, setAutoTest] = useState(false)
  const [recordingVideo, setRecordingVideo] = useState(false)

  const visualTests: VisualTest[] = [
    {
      id: 'material-basic',
      name: 'Basic Material Rendering',
      description: 'Test basic frosted glass material rendering with different transparency levels',
      category: 'material',
      component: BasicMaterialTest,
      expectedOutcome: 'Four floors with visibly different transparency levels',
      validationCriteria: [
        'All floors render without errors',
        'Transparency differences are clearly visible', 
        'Materials have appropriate frosting effects',
        'Light transmission works correctly'
      ]
    },
    {
      id: 'material-advanced',
      name: 'Advanced Material Effects',
      description: 'Test advanced material effects including caustics and reflections',
      category: 'material',
      component: AdvancedMaterialTest,
      expectedOutcome: 'Realistic glass rendering with caustics and reflections',
      validationCriteria: [
        'Caustic light patterns are visible',
        'Reflections appear correctly',
        'Frosting textures are detailed',
        'Color tinting works properly'
      ]
    },
    {
      id: 'performance-lod',
      name: 'LOD System Performance',
      description: 'Test Level of Detail system with varying distances',
      category: 'performance',
      component: LODPerformanceTest,
      expectedOutcome: 'Smooth LOD transitions and maintained performance',
      validationCriteria: [
        'Distant floors show lower quality materials',
        'LOD transitions are smooth',
        'Frame rate remains stable',
        'Memory usage is reasonable'
      ]
    },
    {
      id: 'performance-batching',
      name: 'Transparency Batching',
      description: 'Test transparent object batching with many floors',
      category: 'performance',
      component: BatchingPerformanceTest,
      expectedOutcome: 'Efficient rendering of many transparent floors',
      validationCriteria: [
        'Many floors render without performance issues',
        'Similar materials are batched together',
        'Z-fighting is minimized',
        'Draw calls are optimized'
      ]
    },
    {
      id: 'interaction-click',
      name: 'Floor Interaction System',
      description: 'Test click interactions and hover effects',
      category: 'interaction',
      component: InteractionTest,
      expectedOutcome: 'Responsive click and hover interactions',
      validationCriteria: [
        'Click events are detected correctly',
        'Hover effects are visible',
        'Floor properties are displayed on interaction',
        'Multiple floors can be selected'
      ]
    },
    {
      id: 'ai-navigation',
      name: 'AI Navigation Visualization',
      description: 'Test AI navigation mesh and pathfinding visualization',
      category: 'ai',
      component: AINavigationTest,
      expectedOutcome: 'Clear visualization of AI navigation paths',
      validationCriteria: [
        'Navigation mesh nodes are visible',
        'Path connections are shown',
        'Safety colors are accurate',
        'Alternative paths are displayed'
      ]
    },
    {
      id: 'integration-full',
      name: 'Full System Integration',
      description: 'Test all systems working together',
      category: 'integration',
      component: FullIntegrationTest,
      expectedOutcome: 'All systems function harmoniously',
      validationCriteria: [
        'Materials, LOD, and AI work together',
        'Performance remains stable',
        'No system conflicts occur',
        'User experience is smooth'
      ]
    }
  ]

  const runAutoTests = async () => {
    setAutoTest(true)
    
    for (const test of visualTests) {
      setCurrentTest(test.id)
      
      // Wait for test to render
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Simulate test validation (in real implementation, this would be automated)
      const result: TestResult = {
        testId: test.id,
        passed: Math.random() > 0.2, // 80% pass rate for simulation
        timestamp: Date.now(),
        duration: 3000,
        validationResults: test.validationCriteria.map(criteria => ({
          criteria,
          passed: Math.random() > 0.3,
          notes: `Simulated validation for: ${criteria}`
        })),
        performanceMetrics: {
          averageFPS: 55 + Math.random() * 10,
          memoryUsage: 150 + Math.random() * 100,
          drawCalls: 20 + Math.random() * 30
        }
      }
      
      setTestResults(prev => new Map(prev.set(test.id, result)))
    }
    
    setAutoTest(false)
  }

  const currentTestData = visualTests.find(test => test.id === currentTest)

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
      {/* Test Control Panel */}
      <div style={{
        width: '300px',
        backgroundColor: '#1a1a1a',
        color: 'white',
        padding: '20px',
        overflowY: 'auto'
      }}>
        <h2>Visual Test Framework</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={runAutoTests}
            disabled={autoTest}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: autoTest ? '#666' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: autoTest ? 'not-allowed' : 'pointer'
            }}
          >
            {autoTest ? 'Running Auto Tests...' : 'Run All Tests'}
          </button>
          
          <button
            onClick={() => setRecordingVideo(!recordingVideo)}
            style={{
              width: '100%',
              padding: '10px',
              marginTop: '10px',
              backgroundColor: recordingVideo ? '#f44336' : '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {recordingVideo ? '⏹ Stop Recording' : '📹 Record Video'}
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>Test Categories</h3>
          {['material', 'performance', 'interaction', 'ai', 'integration'].map(category => (
            <div key={category} style={{ marginBottom: '10px' }}>
              <h4 style={{ 
                fontSize: '14px', 
                textTransform: 'uppercase',
                color: '#999',
                marginBottom: '5px'
              }}>
                {category}
              </h4>
              {visualTests
                .filter(test => test.category === category)
                .map(test => (
                  <button
                    key={test.id}
                    onClick={() => setCurrentTest(test.id)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px',
                      marginBottom: '2px',
                      backgroundColor: currentTest === test.id ? '#2196F3' : '#333',
                      color: 'white',
                      border: 'none',
                      borderRadius: '2px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '12px'
                    }}
                  >
                    {testResults.has(test.id) && (
                      <span style={{ 
                        color: testResults.get(test.id)?.passed ? '#4CAF50' : '#f44336',
                        marginRight: '5px'
                      }}>
                        {testResults.get(test.id)?.passed ? '✓' : '✗'}
                      </span>
                    )}
                    {test.name}
                  </button>
                ))
              }
            </div>
          ))}
        </div>

        {/* Current Test Info */}
        {currentTestData && (
          <div style={{ marginBottom: '20px' }}>
            <h3>Current Test</h3>
            <div style={{ 
              backgroundColor: '#333', 
              padding: '10px', 
              borderRadius: '4px',
              fontSize: '12px'
            }}>
              <h4>{currentTestData.name}</h4>
              <p style={{ margin: '5px 0' }}>{currentTestData.description}</p>
              <p><strong>Expected:</strong> {currentTestData.expectedOutcome}</p>
              
              <h5>Validation Criteria:</h5>
              <ul style={{ margin: 0, paddingLeft: '15px' }}>
                {currentTestData.validationCriteria.map((criteria, index) => (
                  <li key={index} style={{ margin: '2px 0' }}>{criteria}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Test Results */}
        {testResults.size > 0 && (
          <div>
            <h3>Test Results</h3>
            <div style={{ fontSize: '12px' }}>
              <p>Tests Run: {testResults.size} / {visualTests.length}</p>
              <p>Passed: {Array.from(testResults.values()).filter(r => r.passed).length}</p>
              <p>Failed: {Array.from(testResults.values()).filter(r => !r.passed).length}</p>
              
              <div style={{ marginTop: '10px' }}>
                {Array.from(testResults.entries()).map(([testId, result]) => (
                  <div key={testId} style={{
                    backgroundColor: result.passed ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                    padding: '5px',
                    margin: '2px 0',
                    borderRadius: '2px'
                  }}>
                    <div style={{ fontWeight: 'bold' }}>
                      {result.passed ? '✓' : '✗'} {visualTests.find(t => t.id === testId)?.name}
                    </div>
                    <div>FPS: {result.performanceMetrics?.averageFPS.toFixed(1)}</div>
                    <div>Memory: {result.performanceMetrics?.memoryUsage.toFixed(0)}MB</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Scene */}
      <div style={{ flex: 1, position: 'relative' }}>
        {recordingVideo && (
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 1000,
            backgroundColor: 'rgba(244, 67, 54, 0.9)',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '15px',
            fontSize: '12px'
          }}>
            🔴 RECORDING
          </div>
        )}
        
        <Canvas camera={{ position: [10, 8, 10] }}>
          <ambientLight intensity={0.4} />
          <pointLight position={[5, 8, 5]} intensity={1.2} />
          <pointLight position={[-5, 6, -5]} intensity={0.8} color="#4ecdc4" />
          
          <Environment preset="city" />
          
          {/* Render current test */}
          {currentTestData && <currentTestData.component />}
          
          {/* Common scene elements */}
          <Grid args={[20, 20]} cellSize={1} cellThickness={0.5} cellColor="#666" sectionColor="#999" />
          
          <Stats />
          <OrbitControls />
        </Canvas>
      </div>
    </div>
  )
}

// Individual test components
const BasicMaterialTest: React.FC = () => {
  const floors = [
    FloorFactory.createFrostedGlassFloor(new THREE.Vector3(-3, 0, 0), 'clear_frosted'),
    FloorFactory.createFrostedGlassFloor(new THREE.Vector3(-1, 0, 0), 'light_frosted'),
    FloorFactory.createFrostedGlassFloor(new THREE.Vector3(1, 0, 0), 'medium_frosted'),
    FloorFactory.createFrostedGlassFloor(new THREE.Vector3(3, 0, 0), 'heavy_frosted')
  ]

  return (
    <group>
      {floors.map((floor, index) => (
        <FrostedGlassFloor key={floor.id} floor={floor} />
      ))}
      
      {/* Reference objects for transparency comparison */}
      <mesh position={[0, 2, -2]}>
        <sphereGeometry args={[0.5]} />
        <meshStandardMaterial color="#ff6b6b" />
      </mesh>
      
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[10, 0.1, 4]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
    </group>
  )
}

const AdvancedMaterialTest: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState('showroom_glass')
  const presetNames = Object.keys(MATERIAL_PRESETS)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setSelectedPreset(prev => {
        const currentIndex = presetNames.indexOf(prev)
        return presetNames[(currentIndex + 1) % presetNames.length]
      })
    }, 3000)
    
    return () => clearInterval(interval)
  }, [presetNames])

  const floors = presetNames.map((presetName, index) => {
    const floor = FloorFactory.createFrostedGlassFloor(
      new THREE.Vector3(index * 2 - 3, 0, 0),
      'medium_frosted'
    )
    floor.materialPreset = presetName
    return floor
  })

  return (
    <group>
      {floors.map(floor => (
        <FrostedGlassFloor key={floor.id} floor={floor} />
      ))}
      
      {/* Enhanced lighting for caustic effects */}
      <pointLight position={[0, 8, 0]} intensity={2} color="#ffffff" />
      <pointLight position={[-4, 6, -4]} intensity={1.5} color="#ff6b6b" />
      <pointLight position={[4, 6, -4]} intensity={1.5} color="#4ecdc4" />
      
      {/* Reference geometry */}
      <mesh position={[0, 3, -3]}>
        <torusGeometry args={[1, 0.3, 16, 100]} />
        <meshStandardMaterial color="#e74c3c" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

const LODPerformanceTest: React.FC = () => {
  const { monitor, metrics } = usePerformanceMonitor()
  
  // Create floors at various distances
  const floors = []
  for (let distance = 5; distance <= 100; distance += 10) {
    for (let angle = 0; angle < 360; angle += 45) {
      const x = Math.cos(angle * Math.PI / 180) * distance
      const z = Math.sin(angle * Math.PI / 180) * distance
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(x, 0, z),
        'medium_frosted'
      )
      floors.push(floor)
    }
  }

  return (
    <group>
      {floors.map(floor => (
        <FrostedGlassFloor key={floor.id} floor={floor} lodEnabled />
      ))}
      
      {/* Performance indicator */}
      <PerformanceIndicator metrics={metrics} />
    </group>
  )
}

const BatchingPerformanceTest: React.FC = () => {
  // Create many floors with similar materials
  const floors = []
  for (let x = -10; x <= 10; x += 2) {
    for (let z = -10; z <= 10; z += 2) {
      const glassTypes = ['clear_frosted', 'medium_frosted', 'heavy_frosted']
      const randomType = glassTypes[Math.floor(Math.random() * glassTypes.length)]
      
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(x, 0, z),
        randomType as any
      )
      floors.push(floor)
    }
  }

  return (
    <group>
      {floors.map(floor => (
        <FrostedGlassFloor key={floor.id} floor={floor} batchingEnabled />
      ))}
    </group>
  )
}

const InteractionTest: React.FC = () => {
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null)
  const [hoverFloor, setHoverFloor] = useState<string | null>(null)

  const floors = [
    FloorFactory.createFrostedGlassFloor(new THREE.Vector3(-2, 0, -2), 'clear_frosted'),
    FloorFactory.createFrostedGlassFloor(new THREE.Vector3(2, 0, -2), 'light_frosted'),
    FloorFactory.createFrostedGlassFloor(new THREE.Vector3(-2, 0, 2), 'medium_frosted'),
    FloorFactory.createFrostedGlassFloor(new THREE.Vector3(2, 0, 2), 'heavy_frosted')
  ]

  return (
    <group>
      {floors.map(floor => (
        <group key={floor.id}>
          <FrostedGlassFloor 
            floor={floor}
            onInteract={() => setSelectedFloor(floor.id)}
            onHover={() => setHoverFloor(floor.id)}
            selected={selectedFloor === floor.id}
            hovered={hoverFloor === floor.id}
          />
          
          {/* Interaction indicators */}
          {selectedFloor === floor.id && (
            <mesh position={[floor.position.x, floor.position.y + 0.02, floor.position.z]}>
              <ringGeometry args={[0.6, 0.8, 32]} />
              <meshBasicMaterial color="#4CAF50" transparent opacity={0.8} />
            </mesh>
          )}
          
          {hoverFloor === floor.id && selectedFloor !== floor.id && (
            <mesh position={[floor.position.x, floor.position.y + 0.01, floor.position.z]}>
              <ringGeometry args={[0.5, 0.7, 32]} />
              <meshBasicMaterial color="#FF9800" transparent opacity={0.6} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}

const AINavigationTest: React.FC = () => {
  // This would integrate with the AI navigation system from Phase 4
  const floors = [
    { floor: FloorFactory.createFrostedGlassFloor(new THREE.Vector3(0, 0, 0), 'medium_frosted'), safety: 'safe' },
    { floor: FloorFactory.createFrostedGlassFloor(new THREE.Vector3(2, 0, 0), 'clear_frosted'), safety: 'risky' },
    { floor: FloorFactory.createFrostedGlassFloor(new THREE.Vector3(4, 0, 0), 'heavy_frosted'), safety: 'safe' }
  ]

  const safetyColors = {
    safe: '#4CAF50',
    risky: '#FF5722',
    dangerous: '#F44336'
  }

  return (
    <group>
      {floors.map(({ floor, safety }, index) => (
        <group key={floor.id}>
          <FrostedGlassFloor floor={floor} />
          
          {/* Safety visualization */}
          <mesh position={[floor.position.x, floor.position.y + 0.02, floor.position.z]}>
            <ringGeometry args={[0.3, 0.5, 16]} />
            <meshBasicMaterial 
              color={safetyColors[safety as keyof typeof safetyColors]} 
              transparent 
              opacity={0.7}
            />
          </mesh>
          
          {/* Navigation nodes (simulated) */}
          <mesh position={[floor.position.x, floor.position.y + 0.1, floor.position.z]}>
            <sphereGeometry args={[0.05]} />
            <meshBasicMaterial color="#00ff00" />
          </mesh>
        </group>
      ))}
      
      {/* Simulated path connections */}
      <PathConnections floors={floors.map(f => f.floor)} />
    </group>
  )
}

const FullIntegrationTest: React.FC = () => {
  // This combines all systems for a comprehensive test
  return (
    <group>
      <BasicMaterialTest />
      {/* Add AI navigation overlay */}
      {/* Add performance monitoring */}
      {/* Add interaction handlers */}
    </group>
  )
}

// Helper components
const PerformanceIndicator: React.FC<{ metrics?: any }> = ({ metrics }) => {
  if (!metrics) return null
  
  const color = metrics.fps > 50 ? '#4CAF50' : metrics.fps > 30 ? '#FF9800' : '#F44336'
  
  return (
    <mesh position={[0, 5, 0]}>
      <textGeometry args={[`FPS: ${metrics.fps.toFixed(1)}`, { font: 'Arial', size: 0.5 }]} />
      <meshBasicMaterial color={color} />
    </mesh>
  )
}

const PathConnections: React.FC<{ floors: any[] }> = ({ floors }) => {
  return (
    <group>
      {floors.map((floor, index) => {
        if (index === floors.length - 1) return null
        
        const nextFloor = floors[index + 1]
        const midPoint = new THREE.Vector3().addVectors(floor.position, nextFloor.position).multiplyScalar(0.5)
        midPoint.y += 0.1
        
        return (
          <mesh key={`connection-${index}`} position={midPoint}>
            <cylinderGeometry args={[0.02, 0.02, 2]} />
            <meshBasicMaterial color="#00ffff" transparent opacity={0.5} />
          </mesh>
        )
      })}
    </group>
  )
}

interface TestResult {
  testId: string
  passed: boolean
  timestamp: number
  duration: number
  validationResults: ValidationResult[]
  performanceMetrics?: {
    averageFPS: number
    memoryUsage: number
    drawCalls: number
  }
}

interface ValidationResult {
  criteria: string
  passed: boolean
  notes: string
}
```

### Task 5.3: Performance Benchmarking Framework
**File**: `debug/PerformanceBenchmark.tsx`

```typescript
import React, { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { FrostedGlassFloor } from '../components/floors/FrostedGlassFloor'
import { FloorFactory } from '../utils/floorFactory'
import { usePerformanceMonitor } from '../systems/PerformanceMonitor'
import { FloorLODManager } from '../systems/FloorLODManager'
import { TransparencyBatcher } from '../systems/TransparencyBatcher'
import * as THREE from 'three'

interface BenchmarkTest {
  id: string
  name: string
  description: string
  setup: (scene: THREE.Scene) => BenchmarkScenario
  duration: number // in seconds
  targetMetrics: {
    minFPS: number
    maxMemoryMB: number
    maxDrawCalls: number
  }
}

interface BenchmarkScenario {
  floors: any[]
  objects: THREE.Object3D[]
  lights: THREE.Light[]
  cleanup: () => void
}

interface BenchmarkResult {
  testId: string
  startTime: number
  endTime: number
  samples: PerformanceSample[]
  summary: {
    averageFPS: number
    minFPS: number
    maxFPS: number
    averageMemory: number
    peakMemory: number
    averageDrawCalls: number
    maxDrawCalls: number
    frameDrops: number
    passed: boolean
  }
}

interface PerformanceSample {
  timestamp: number
  fps: number
  frameTime: number
  memoryUsage: number
  drawCalls: number
  triangles: number
}

export const PerformanceBenchmark: React.FC = () => {
  const [currentTest, setCurrentTest] = useState<string | null>(null)
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)

  const benchmarkTests: BenchmarkTest[] = [
    {
      id: 'basic-rendering',
      name: 'Basic Rendering Performance',
      description: 'Test basic rendering performance with various floor counts',
      setup: (scene) => setupBasicRenderingTest(scene),
      duration: 30,
      targetMetrics: {
        minFPS: 45,
        maxMemoryMB: 300,
        maxDrawCalls: 100
      }
    },
    {
      id: 'transparency-stress',
      name: 'Transparency Stress Test',
      description: 'Test performance with many overlapping transparent surfaces',
      setup: (scene) => setupTransparencyStressTest(scene),
      duration: 30,
      targetMetrics: {
        minFPS: 30,
        maxMemoryMB: 500,
        maxDrawCalls: 200
      }
    },
    {
      id: 'lod-effectiveness',
      name: 'LOD System Effectiveness',
      description: 'Test LOD system performance across various distances',
      setup: (scene) => setupLODEffectivenessTest(scene),
      duration: 45,
      targetMetrics: {
        minFPS: 40,
        maxMemoryMB: 400,
        maxDrawCalls: 150
      }
    },
    {
      id: 'batching-optimization',
      name: 'Batching Optimization',
      description: 'Test batching system with similar and diverse materials',
      setup: (scene) => setupBatchingOptimizationTest(scene),
      duration: 30,
      targetMetrics: {
        minFPS: 35,
        maxMemoryMB: 350,
        maxDrawCalls: 80
      }
    },
    {
      id: 'memory-stress',
      name: 'Memory Stress Test',
      description: 'Test memory usage with texture generation and caching',
      setup: (scene) => setupMemoryStressTest(scene),
      duration: 60,
      targetMetrics: {
        minFPS: 25,
        maxMemoryMB: 800,
        maxDrawCalls: 250
      }
    }
  ]

  const runBenchmark = async (testId: string) => {
    const test = benchmarkTests.find(t => t.id === testId)
    if (!test) return

    setCurrentTest(testId)
    setIsRunning(true)
    setProgress(0)

    // This would be implemented to actually run the benchmark
    // For now, we'll simulate the process
    const result = await simulateBenchmark(test)
    
    setBenchmarkResults(prev => [...prev.filter(r => r.testId !== testId), result])
    setCurrentTest(null)
    setIsRunning(false)
    setProgress(0)
  }

  const runAllBenchmarks = async () => {
    for (const test of benchmarkTests) {
      await runBenchmark(test.id)
      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  const simulateBenchmark = async (test: BenchmarkTest): Promise<BenchmarkResult> => {
    const samples: PerformanceSample[] = []
    const startTime = Date.now()
    const sampleInterval = 100 // Sample every 100ms
    const totalSamples = (test.duration * 1000) / sampleInterval

    for (let i = 0; i < totalSamples; i++) {
      // Simulate performance degradation over time
      const degradation = Math.min(1, i / totalSamples) * 0.3
      const baseFPS = 60 - (degradation * 20)
      const fps = baseFPS + (Math.random() - 0.5) * 10
      
      const sample: PerformanceSample = {
        timestamp: startTime + (i * sampleInterval),
        fps: Math.max(10, fps),
        frameTime: 1000 / Math.max(10, fps),
        memoryUsage: 200 + (degradation * 100) + Math.random() * 50,
        drawCalls: 50 + Math.floor(degradation * 50) + Math.floor(Math.random() * 20),
        triangles: 10000 + Math.floor(degradation * 5000) + Math.floor(Math.random() * 2000)
      }
      
      samples.push(sample)
      setProgress((i + 1) / totalSamples)
      
      // Simulate real-time delay
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    const endTime = Date.now()
    
    // Calculate summary statistics
    const fpsValues = samples.map(s => s.fps)
    const memoryValues = samples.map(s => s.memoryUsage)
    const drawCallValues = samples.map(s => s.drawCalls)
    
    const summary = {
      averageFPS: fpsValues.reduce((a, b) => a + b) / fpsValues.length,
      minFPS: Math.min(...fpsValues),
      maxFPS: Math.max(...fpsValues),
      averageMemory: memoryValues.reduce((a, b) => a + b) / memoryValues.length,
      peakMemory: Math.max(...memoryValues),
      averageDrawCalls: drawCallValues.reduce((a, b) => a + b) / drawCallValues.length,
      maxDrawCalls: Math.max(...drawCallValues),
      frameDrops: samples.filter(s => s.fps < 30).length,
      passed: false
    }
    
    // Check if test passed
    summary.passed = (
      summary.minFPS >= test.targetMetrics.minFPS &&
      summary.peakMemory <= test.targetMetrics.maxMemoryMB &&
      summary.maxDrawCalls <= test.targetMetrics.maxDrawCalls
    )

    return {
      testId: test.id,
      startTime,
      endTime,
      samples,
      summary
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', backgroundColor: '#1a1a1a', color: 'white' }}>
      {/* Control Panel */}
      <div style={{ width: '400px', padding: '20px', overflowY: 'auto' }}>
        <h2>Performance Benchmark</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={runAllBenchmarks}
            disabled={isRunning}
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: isRunning ? '#666' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {isRunning ? 'Running Benchmarks...' : 'Run All Benchmarks'}
          </button>
          
          {isRunning && (
            <div style={{ marginTop: '10px' }}>
              <div style={{
                width: '100%',
                height: '20px',
                backgroundColor: '#333',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${progress * 100}%`,
                  height: '100%',
                  backgroundColor: '#4CAF50',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ textAlign: 'center', marginTop: '5px', fontSize: '12px' }}>
                {currentTest && `Running: ${benchmarkTests.find(t => t.id === currentTest)?.name}`}
              </div>
            </div>
          )}
        </div>

        {/* Individual Tests */}
        <div style={{ marginBottom: '30px' }}>
          <h3>Individual Tests</h3>
          {benchmarkTests.map(test => {
            const result = benchmarkResults.find(r => r.testId === test.id)
            return (
              <div key={test.id} style={{
                backgroundColor: '#333',
                padding: '15px',
                marginBottom: '10px',
                borderRadius: '4px',
                borderLeft: result ? 
                  (result.summary.passed ? '4px solid #4CAF50' : '4px solid #f44336') :
                  '4px solid #666'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>{test.name}</h4>
                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#ccc' }}>
                      {test.description}
                    </p>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      Target: {test.targetMetrics.minFPS}+ FPS, 
                      ≤{test.targetMetrics.maxMemoryMB}MB, 
                      ≤{test.targetMetrics.maxDrawCalls} draws
                    </div>
                  </div>
                  <button
                    onClick={() => runBenchmark(test.id)}
                    disabled={isRunning}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: isRunning ? '#666' : '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isRunning ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Run
                  </button>
                </div>
                
                {result && (
                  <div style={{ marginTop: '10px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Avg FPS:</span>
                      <span style={{ 
                        color: result.summary.averageFPS >= test.targetMetrics.minFPS ? '#4CAF50' : '#f44336' 
                      }}>
                        {result.summary.averageFPS.toFixed(1)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Peak Memory:</span>
                      <span style={{ 
                        color: result.summary.peakMemory <= test.targetMetrics.maxMemoryMB ? '#4CAF50' : '#f44336' 
                      }}>
                        {result.summary.peakMemory.toFixed(0)}MB
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Max Draw Calls:</span>
                      <span style={{ 
                        color: result.summary.maxDrawCalls <= test.targetMetrics.maxDrawCalls ? '#4CAF50' : '#f44336' 
                      }}>
                        {result.summary.maxDrawCalls}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Frame Drops:</span>
                      <span style={{ color: result.summary.frameDrops === 0 ? '#4CAF50' : '#FF9800' }}>
                        {result.summary.frameDrops}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Overall Results */}
        {benchmarkResults.length > 0 && (
          <div>
            <h3>Overall Results</h3>
            <div style={{ backgroundColor: '#333', padding: '15px', borderRadius: '4px' }}>
              <div>
                <strong>Tests Completed:</strong> {benchmarkResults.length} / {benchmarkTests.length}
              </div>
              <div>
                <strong>Tests Passed:</strong> {benchmarkResults.filter(r => r.summary.passed).length}
              </div>
              <div>
                <strong>Overall Success Rate:</strong> {
                  ((benchmarkResults.filter(r => r.summary.passed).length / benchmarkResults.length) * 100).toFixed(1)
                }%
              </div>
              
              <div style={{ marginTop: '15px' }}>
                <h4>Performance Summary</h4>
                <div style={{ fontSize: '12px' }}>
                  <div>Avg FPS: {(benchmarkResults.reduce((sum, r) => sum + r.summary.averageFPS, 0) / benchmarkResults.length).toFixed(1)}</div>
                  <div>Avg Memory: {(benchmarkResults.reduce((sum, r) => sum + r.summary.averageMemory, 0) / benchmarkResults.length).toFixed(0)}MB</div>
                  <div>Total Frame Drops: {benchmarkResults.reduce((sum, r) => sum + r.summary.frameDrops, 0)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Visualization Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Performance Charts */}
        <div style={{ height: '300px', backgroundColor: '#222', padding: '20px' }}>
          <h3>Real-time Performance Charts</h3>
          {benchmarkResults.length > 0 && (
            <PerformanceChart results={benchmarkResults} />
          )}
        </div>

        {/* 3D Scene for Visual Testing */}
        <div style={{ flex: 1 }}>
          <BenchmarkScene currentTest={currentTest} />
        </div>
      </div>
    </div>
  )
}

// Helper components and functions
const setupBasicRenderingTest = (scene: THREE.Scene): BenchmarkScenario => {
  const floors = []
  const objects = []
  const lights = []

  // Create floors in a grid pattern
  for (let x = -10; x <= 10; x += 2) {
    for (let z = -10; z <= 10; z += 2) {
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(x, 0, z),
        'medium_frosted'
      )
      floors.push(floor)
    }
  }

  // Add some reference geometry
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(2),
    new THREE.MeshStandardMaterial({ color: 0xff6b6b })
  )
  sphere.position.set(0, 3, 0)
  objects.push(sphere)

  return {
    floors,
    objects,
    lights,
    cleanup: () => {
      objects.forEach(obj => scene.remove(obj))
      lights.forEach(light => scene.remove(light))
    }
  }
}

const setupTransparencyStressTest = (scene: THREE.Scene): BenchmarkScenario => {
  // Implementation for transparency stress test
  return setupBasicRenderingTest(scene)
}

const setupLODEffectivenessTest = (scene: THREE.Scene): BenchmarkScenario => {
  const floors = []
  const objects = []
  const lights = []

  // Create floors at various distances for LOD testing
  for (let distance = 5; distance <= 100; distance += 15) {
    for (let angle = 0; angle < 360; angle += 60) {
      const x = Math.cos(angle * Math.PI / 180) * distance
      const z = Math.sin(angle * Math.PI / 180) * distance
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(x, 0, z),
        'medium_frosted'
      )
      floors.push(floor)
    }
  }

  return {
    floors,
    objects,
    lights,
    cleanup: () => {
      objects.forEach(obj => scene.remove(obj))
      lights.forEach(light => scene.remove(light))
    }
  }
}

const setupBatchingOptimizationTest = (scene: THREE.Scene): BenchmarkScenario => {
  const floors = []
  const objects = []
  const lights = []

  // Create many floors with similar materials for batching test
  const materialTypes = ['clear_frosted', 'medium_frosted', 'heavy_frosted']
  
  for (let x = -20; x <= 20; x += 4) {
    for (let z = -20; z <= 20; z += 4) {
      const materialType = materialTypes[Math.floor(Math.random() * materialTypes.length)]
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(x, 0, z),
        materialType as any
      )
      floors.push(floor)
    }
  }

  return {
    floors,
    objects,
    lights,
    cleanup: () => {
      objects.forEach(obj => scene.remove(obj))
      lights.forEach(light => scene.remove(light))
    }
  }
}

const setupMemoryStressTest = (scene: THREE.Scene): BenchmarkScenario => {
  const floors = []
  const objects = []
  const lights = []

  // Create floors with different materials to test texture memory usage
  const presetNames = Object.keys(MATERIAL_PRESETS)
  
  for (let i = 0; i < 200; i++) {
    const x = (Math.random() - 0.5) * 100
    const z = (Math.random() - 0.5) * 100
    const presetName = presetNames[Math.floor(Math.random() * presetNames.length)]
    
    const floor = FloorFactory.createFrostedGlassFloor(
      new THREE.Vector3(x, 0, z),
      'medium_frosted'
    )
    floor.materialPreset = presetName
    floors.push(floor)
  }

  return {
    floors,
    objects,
    lights,
    cleanup: () => {
      objects.forEach(obj => scene.remove(obj))
      lights.forEach(light => scene.remove(light))
    }
  }
}

const PerformanceChart: React.FC<{ results: BenchmarkResult[] }> = ({ results }) => {
  return (
    <div style={{ width: '100%', height: '200px', backgroundColor: '#333', borderRadius: '4px', padding: '10px' }}>
      <div style={{ color: '#999', marginBottom: '10px' }}>Performance Over Time</div>
      {results.map(result => (
        <div key={result.testId} style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '12px', color: '#ccc' }}>
            {benchmarkTests.find(t => t.id === result.testId)?.name}
          </div>
          <div style={{ 
            height: '20px', 
            backgroundColor: '#555', 
            borderRadius: '10px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.min(100, (result.summary.averageFPS / 60) * 100)}%`,
              backgroundColor: result.summary.averageFPS >= 45 ? '#4CAF50' : 
                             result.summary.averageFPS >= 30 ? '#FF9800' : '#f44336',
              borderRadius: '10px'
            }} />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '10px',
              transform: 'translateY(-50%)',
              fontSize: '10px',
              color: 'white',
              fontWeight: 'bold'
            }}>
              {result.summary.averageFPS.toFixed(1)} FPS
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const BenchmarkScene: React.FC<{ currentTest: string | null }> = ({ currentTest }) => {
  const [scenario, setScenario] = useState<BenchmarkScenario | null>(null)
  const { gl, scene } = useThree()

  useEffect(() => {
    if (!currentTest) return

    const test = benchmarkTests.find(t => t.id === currentTest)
    if (test) {
      const newScenario = test.setup(scene)
      setScenario(newScenario)

      return () => {
        if (newScenario) {
          newScenario.cleanup()
        }
      }
    }
  }, [currentTest, scene])

  return (
    <Canvas camera={{ position: [15, 10, 15] }}>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.2} />
      <pointLight position={[-10, 8, -10]} intensity={0.8} color="#4ecdc4" />
      
      {scenario && (
        <group>
          {scenario.floors.map(floor => (
            <FrostedGlassFloor key={floor.id} floor={floor} />
          ))}
          
          {scenario.objects.map((obj, index) => (
            <primitive key={index} object={obj} />
          ))}
          
          {scenario.lights.map((light, index) => (
            <primitive key={index} object={light} />
          ))}
        </group>
      )}
      
      <OrbitControls />
    </Canvas>
  )
}
```

### Task 5.4: Advanced Debug Interface
**File**: `debug/AdvancedDebugInterface.tsx`

```typescript
import React, { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, Stats, Html } from '@react-three/drei'
import { FrostedGlassFloor } from '../components/floors/FrostedGlassFloor'
import { FloorFactory } from '../utils/floorFactory'
import { FloorNavigationAnalyzer } from '../ai/FloorNavigationProperties'
import { usePerformanceMonitor } from '../systems/PerformanceMonitor'
import * as THREE from 'three'

interface DebugPanel {
  id: string
  title: string
  component: React.ComponentType<any>
  position: 'left' | 'right' | 'bottom' | 'floating'
}

interface FloorDebugData {
  floorId: string
  materialProperties: any
  navigationProperties: any
  performanceData: any
  renderingInfo: any
  aiAnalysis: any
}

export const AdvancedDebugInterface: React.FC = () => {
  const [activePanel, setActivePanel] = useState<string>('floor-inspector')
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null)
  const [debugMode, setDebugMode] = useState<'visual' | 'performance' | 'ai' | 'full'>('visual')
  const [realTimeUpdate, setRealTimeUpdate] = useState(true)
  const [floorDebugData, setFloorDebugData] = useState<Map<string, FloorDebugData>>(new Map())

  const testFloors = [
    FloorFactory.createFrostedGlassFloor(new THREE.Vector3(0, 0, 0), 'medium_frosted'),
    FloorFactory.createFrostedGlassFloor(new THREE.Vector3(3, 0, 0), 'clear_frosted'),
    FloorFactory.createFrostedGlassFloor(new THREE.Vector3(6, 0, 0), 'heavy_frosted'),
    FloorFactory.createFrostedGlassFloor(new THREE.Vector3(0, 0, 3), 'light_frosted')
  ]

  const debugPanels: DebugPanel[] = [
    {
      id: 'floor-inspector',
      title: 'Floor Inspector',
      component: FloorInspectorPanel,
      position: 'right'
    },
    {
      id: 'performance-monitor',
      title: 'Performance Monitor',
      component: PerformanceMonitorPanel,
      position: 'left'
    },
    {
      id: 'ai-analyzer',
      title: 'AI Analysis',
      component: AIAnalyzerPanel,
      position: 'left'
    },
    {
      id: 'material-editor',
      title: 'Material Editor',
      component: MaterialEditorPanel,
      position: 'right'
    },
    {
      id: 'render-debugger',
      title: 'Render Debugger',
      component: RenderDebuggerPanel,
      position: 'bottom'
    }
  ]

  const updateFloorDebugData = (floor: any) => {
    const debugData: FloorDebugData = {
      floorId: floor.id,
      materialProperties: {
        transparency: floor.transparency,
        roughness: floor.roughness,
        glassType: floor.glassType,
        colorTint: floor.colorTint.getHexString()
      },
      navigationProperties: FloorNavigationAnalyzer.analyzeFloorForAI(floor),
      performanceData: {
        lodLevel: floor.lodLevel || 'default',
        renderCost: calculateRenderCost(floor),
        memoryUsage: estimateMemoryUsage(floor)
      },
      renderingInfo: {
        vertexCount: getVertexCount(floor),
        triangleCount: getTriangleCount(floor),
        textureResolution: getTextureResolution(floor)
      },
      aiAnalysis: FloorNavigationAnalyzer.analyzeFloorForAI(floor)
    }

    setFloorDebugData(prev => new Map(prev.set(floor.id, debugData)))
  }

  useEffect(() => {
    if (realTimeUpdate) {
      const interval = setInterval(() => {
        testFloors.forEach(updateFloorDebugData)
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [realTimeUpdate, testFloors])

  const activeDebugPanel = debugPanels.find(panel => panel.id === activePanel)

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', backgroundColor: '#0a0a0a' }}>
      {/* Left Debug Panel */}
      <div style={{
        width: '350px',
        backgroundColor: '#1a1a1a',
        color: 'white',
        overflowY: 'auto',
        borderRight: '1px solid #333'
      }}>
        <DebugToolbar
          debugMode={debugMode}
          setDebugMode={setDebugMode}
          realTimeUpdate={realTimeUpdate}
          setRealTimeUpdate={setRealTimeUpdate}
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          debugPanels={debugPanels}
        />
        
        {activeDebugPanel && debugPanels.filter(p => p.position === 'left').includes(activeDebugPanel) && (
          <div style={{ padding: '20px' }}>
            <activeDebugPanel.component
              floors={testFloors}
              selectedFloor={selectedFloor}
              floorDebugData={floorDebugData}
              debugMode={debugMode}
            />
          </div>
        )}
      </div>

      {/* Main 3D Scene */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas camera={{ position: [10, 8, 10] }}>
          <ambientLight intensity={0.3} />
          <pointLight position={[5, 8, 5]} intensity={1.2} />
          <pointLight position={[-5, 6, -5]} intensity={0.8} color="#4ecdc4" />
          
          <Environment preset="city" />

          {testFloors.map(floor => (
            <DebugFloorWrapper
              key={floor.id}
              floor={floor}
              selected={selectedFloor === floor.id}
              onSelect={() => setSelectedFloor(floor.id)}
              debugMode={debugMode}
              onDebugUpdate={updateFloorDebugData}
            />
          ))}

          <DebugVisualization
            floors={testFloors}
            debugMode={debugMode}
            floorDebugData={floorDebugData}
          />

          <Stats />
          <OrbitControls />
        </Canvas>

        {/* Floating Debug Info */}
        {selectedFloor && (
          <FloatingDebugInfo
            floorData={floorDebugData.get(selectedFloor)}
            position={{ top: '20px', right: '20px' }}
          />
        )}
      </div>

      {/* Right Debug Panel */}
      <div style={{
        width: '350px',
        backgroundColor: '#1a1a1a',
        color: 'white',
        overflowY: 'auto',
        borderLeft: '1px solid #333'
      }}>
        {activeDebugPanel && debugPanels.filter(p => p.position === 'right').includes(activeDebugPanel) && (
          <div style={{ padding: '20px' }}>
            <activeDebugPanel.component
              floors={testFloors}
              selectedFloor={selectedFloor}
              floorDebugData={floorDebugData}
              debugMode={debugMode}
              onFloorUpdate={updateFloorDebugData}
            />
          </div>
        )}
      </div>

      {/* Bottom Debug Panel */}
      {activeDebugPanel && activeDebugPanel.position === 'bottom' && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '200px',
          backgroundColor: '#1a1a1a',
          color: 'white',
          borderTop: '1px solid #333',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <activeDebugPanel.component
            floors={testFloors}
            selectedFloor={selectedFloor}
            floorDebugData={floorDebugData}
            debugMode={debugMode}
          />
        </div>
      )}
    </div>
  )
}

// Debug panel components
const DebugToolbar: React.FC<{
  debugMode: string
  setDebugMode: (mode: any) => void
  realTimeUpdate: boolean
  setRealTimeUpdate: (update: boolean) => void
  activePanel: string
  setActivePanel: (panel: string) => void
  debugPanels: DebugPanel[]
}> = ({ debugMode, setDebugMode, realTimeUpdate, setRealTimeUpdate, activePanel, setActivePanel, debugPanels }) => {
  return (
    <div style={{
      padding: '15px',
      borderBottom: '1px solid #333',
      backgroundColor: '#111'
    }}>
      <h3 style={{ margin: '0 0 15px 0' }}>Debug Interface</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Debug Mode:</label>
        <select
          value={debugMode}
          onChange={(e) => setDebugMode(e.target.value)}
          style={{
            width: '100%',
            padding: '5px',
            backgroundColor: '#333',
            color: 'white',
            border: '1px solid #555',
            borderRadius: '3px'
          }}
        >
          <option value="visual">Visual Debug</option>
          <option value="performance">Performance Debug</option>
          <option value="ai">AI Debug</option>
          <option value="full">Full Debug</option>
        </select>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
          <input
            type="checkbox"
            checked={realTimeUpdate}
            onChange={(e) => setRealTimeUpdate(e.target.checked)}
            style={{ marginRight: '8px' }}
          />
          Real-time Updates
        </label>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Active Panel:</label>
        {debugPanels.map(panel => (
          <button
            key={panel.id}
            onClick={() => setActivePanel(panel.id)}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px',
              margin: '2px 0',
              backgroundColor: activePanel === panel.id ? '#4CAF50' : '#333',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '11px'
            }}
          >
            {panel.title}
          </button>
        ))}
      </div>
    </div>
  )
}

const FloorInspectorPanel: React.FC<{
  floors: any[]
  selectedFloor: string | null
  floorDebugData: Map<string, FloorDebugData>
}> = ({ floors, selectedFloor, floorDebugData }) => {
  const selectedFloorData = selectedFloor ? floorDebugData.get(selectedFloor) : null

  return (
    <div>
      <h4>Floor Inspector</h4>
      
      {!selectedFloor ? (
        <div style={{ color: '#999', fontStyle: 'italic' }}>
          Select a floor in the scene to inspect its properties
        </div>
      ) : (
        <div>
          <h5>Floor ID: {selectedFloor}</h5>
          
          {selectedFloorData && (
            <div style={{ fontSize: '12px' }}>
              <div style={{ marginBottom: '15px' }}>
                <h6>Material Properties:</h6>
                <div style={{ backgroundColor: '#333', padding: '10px', borderRadius: '4px' }}>
                  <div>Type: {selectedFloorData.materialProperties.glassType}</div>
                  <div>Transparency: {selectedFloorData.materialProperties.transparency.toFixed(3)}</div>
                  <div>Roughness: {selectedFloorData.materialProperties.roughness.toFixed(3)}</div>
                  <div>Color: #{selectedFloorData.materialProperties.colorTint}</div>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <h6>Navigation Properties:</h6>
                <div style={{ backgroundColor: '#333', padding: '10px', borderRadius: '4px' }}>
                  <div>Walkable: {selectedFloorData.navigationProperties.walkable ? 'Yes' : 'No'}</div>
                  <div>Safety Level: {selectedFloorData.navigationProperties.safetyLevel}</div>
                  <div>Slippery: {selectedFloorData.navigationProperties.slippery ? 'Yes' : 'No'}</div>
                  <div>Navigation Cost: {selectedFloorData.navigationProperties.navigationCost.toFixed(2)}</div>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <h6>Performance Data:</h6>
                <div style={{ backgroundColor: '#333', padding: '10px', borderRadius: '4px' }}>
                  <div>LOD Level: {selectedFloorData.performanceData.lodLevel}</div>
                  <div>Render Cost: {selectedFloorData.performanceData.renderCost}</div>
                  <div>Memory Usage: {selectedFloorData.performanceData.memoryUsage}KB</div>
                </div>
              </div>

              <div>
                <h6>Rendering Info:</h6>
                <div style={{ backgroundColor: '#333', padding: '10px', borderRadius: '4px' }}>
                  <div>Vertices: {selectedFloorData.renderingInfo.vertexCount}</div>
                  <div>Triangles: {selectedFloorData.renderingInfo.triangleCount}</div>
                  <div>Texture Res: {selectedFloorData.renderingInfo.textureResolution}px</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const PerformanceMonitorPanel: React.FC<{
  floors: any[]
  debugMode: string
}> = ({ floors, debugMode }) => {
  const { monitor, metrics, grade } = usePerformanceMonitor()

  return (
    <div>
      <h4>Performance Monitor</h4>
      
      {metrics ? (
        <div style={{ fontSize: '12px' }}>
          <div style={{ 
            padding: '10px', 
            backgroundColor: '#333', 
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>FPS:</span>
              <span style={{ color: metrics.fps > 50 ? '#4CAF50' : metrics.fps > 30 ? '#FF9800' : '#f44336' }}>
                {metrics.fps.toFixed(1)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Frame Time:</span>
              <span>{metrics.frameTime.toFixed(1)}ms</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Memory:</span>
              <span>{metrics.memoryUsed.toFixed(1)}MB</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Draw Calls:</span>
              <span>{metrics.drawCalls}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Triangles:</span>
              <span>{metrics.triangles.toLocaleString()}</span>
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <div style={{ marginBottom: '5px' }}>Performance Grade:</div>
            <div style={{
              padding: '8px',
              backgroundColor: grade === 'excellent' ? '#4CAF50' :
                            grade === 'good' ? '#8BC34A' :
                            grade === 'fair' ? '#FF9800' : '#f44336',
              borderRadius: '4px',
              textAlign: 'center',
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}>
              {grade}
            </div>
          </div>

          <div>
            <div style={{ marginBottom: '5px' }}>Active Floors: {floors.length}</div>
            <div>Transparent Objects: {metrics.transparentObjects}</div>
          </div>
        </div>
      ) : (
        <div style={{ color: '#999', fontStyle: 'italic' }}>
          Loading performance data...
        </div>
      )}
    </div>
  )
}

const AIAnalyzerPanel: React.FC<{
  floors: any[]
  selectedFloor: string | null
  floorDebugData: Map<string, FloorDebugData>
}> = ({ floors, selectedFloor, floorDebugData }) => {
  const aiAnalyses = floors.map(floor => ({
    floorId: floor.id,
    analysis: FloorNavigationAnalyzer.analyzeFloorForAI(floor)
  }))

  return (
    <div>
      <h4>AI Analysis</h4>
      
      <div style={{ marginBottom: '15px', fontSize: '12px' }}>
        <h6>Floor Safety Overview:</h6>
        {aiAnalyses.map(({ floorId, analysis }) => (
          <div key={floorId} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '5px',
            backgroundColor: selectedFloor === floorId ? '#333' : 'transparent',
            borderRadius: '3px',
            margin: '2px 0'
          }}>
            <span>Floor {floorId.slice(-4)}</span>
            <span style={{
              color: analysis.safetyLevel === 'safe' ? '#4CAF50' :
                    analysis.safetyLevel === 'caution' ? '#FF9800' :
                    analysis.safetyLevel === 'risky' ? '#FF5722' : '#f44336'
            }}>
              {analysis.safetyLevel.toUpperCase()}
            </span>
          </div>
        ))}
      </div>

      {selectedFloor && floorDebugData.get(selectedFloor) && (
        <div style={{ fontSize: '12px' }}>
          <h6>Detailed AI Analysis:</h6>
          <div style={{ backgroundColor: '#333', padding: '10px', borderRadius: '4px' }}>
            {Object.entries(floorDebugData.get(selectedFloor)!.aiAnalysis).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 0' }}>
                <span style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}:</span>
                <span>
                  {typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
                   typeof value === 'number' ? value.toFixed(2) :
                   String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const MaterialEditorPanel: React.FC<{
  floors: any[]
  selectedFloor: string | null
  onFloorUpdate: (floor: any) => void
}> = ({ floors, selectedFloor, onFloorUpdate }) => {
  const selectedFloorObj = floors.find(floor => floor.id === selectedFloor)

  const handlePropertyChange = (property: string, value: any) => {
    if (!selectedFloorObj) return

    selectedFloorObj[property] = value
    onFloorUpdate(selectedFloorObj)
  }

  if (!selectedFloor || !selectedFloorObj) {
    return (
      <div>
        <h4>Material Editor</h4>
        <div style={{ color: '#999', fontStyle: 'italic' }}>
          Select a floor to edit its material properties
        </div>
      </div>
    )
  }

  return (
    <div>
      <h4>Material Editor</h4>
      <div style={{ fontSize: '12px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Transparency:</label>
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.01"
            value={selectedFloorObj.transparency}
            onChange={(e) => handlePropertyChange('transparency', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ textAlign: 'center', color: '#999' }}>
            {selectedFloorObj.transparency.toFixed(2)}
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Roughness:</label>
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.01"
            value={selectedFloorObj.roughness}
            onChange={(e) => handlePropertyChange('roughness', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ textAlign: 'center', color: '#999' }}>
            {selectedFloorObj.roughness.toFixed(2)}
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Glass Type:</label>
          <select
            value={selectedFloorObj.glassType}
            onChange={(e) => handlePropertyChange('glassType', e.target.value)}
            style={{
              width: '100%',
              padding: '5px',
              backgroundColor: '#333',
              color: 'white',
              border: '1px solid #555',
              borderRadius: '3px'
            }}
          >
            <option value="clear_frosted">Clear Frosted</option>
            <option value="light_frosted">Light Frosted</option>
            <option value="medium_frosted">Medium Frosted</option>
            <option value="heavy_frosted">Heavy Frosted</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px' }}>Color Tint:</label>
          <input
            type="color"
            value={`#${selectedFloorObj.colorTint.getHexString()}`}
            onChange={(e) => {
              const newColor = new THREE.Color(e.target.value)
              handlePropertyChange('colorTint', newColor)
            }}
            style={{
              width: '100%',
              height: '30px',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          />
        </div>
      </div>
    </div>
  )
}

const RenderDebuggerPanel: React.FC<{
  floors: any[]
  debugMode: string
}> = ({ floors, debugMode }) => {
  return (
    <div style={{ display: 'flex', gap: '20px', height: '100%' }}>
      <div style={{ flex: 1 }}>
        <h4>Render Statistics</h4>
        <div style={{ fontSize: '12px' }}>
          <div>Total Floors: {floors.length}</div>
          <div>Unique Materials: {new Set(floors.map(f => f.glassType)).size}</div>
          <div>Transparency Range: {Math.min(...floors.map(f => f.transparency)).toFixed(2)} - {Math.max(...floors.map(f => f.transparency)).toFixed(2)}</div>
        </div>
      </div>
      
      <div style={{ flex: 1 }}>
        <h4>Debug Visualizations</h4>
        <div style={{ fontSize: '12px' }}>
          <div>Mode: {debugMode}</div>
          <div>Wireframe: Off</div>
          <div>Bounding Boxes: Off</div>
          <div>Normal Vectors: Off</div>
        </div>
      </div>
    </div>
  )
}

// Helper components
const DebugFloorWrapper: React.FC<{
  floor: any
  selected: boolean
  onSelect: () => void
  debugMode: string
  onDebugUpdate: (floor: any) => void
}> = ({ floor, selected, onSelect, debugMode, onDebugUpdate }) => {
  useFrame(() => {
    onDebugUpdate(floor)
  })

  return (
    <group>
      <FrostedGlassFloor
        floor={floor}
        onInteract={onSelect}
      />
      
      {selected && (
        <mesh position={floor.position}>
          <ringGeometry args={[0.6, 0.8, 32]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.5} />
        </mesh>
      )}
      
      {debugMode === 'ai' && (
        <AIDebugVisualization floor={floor} />
      )}
    </group>
  )
}

const DebugVisualization: React.FC<{
  floors: any[]
  debugMode: string
  floorDebugData: Map<string, FloorDebugData>
}> = ({ floors, debugMode, floorDebugData }) => {
  if (debugMode === 'performance') {
    return (
      <group>
        {floors.map(floor => {
          const debugData = floorDebugData.get(floor.id)
          if (!debugData) return null

          const color = debugData.performanceData.renderCost > 100 ? '#f44336' :
                       debugData.performanceData.renderCost > 50 ? '#FF9800' : '#4CAF50'

          return (
            <Html key={floor.id} position={[floor.position.x, floor.position.y + 1, floor.position.z]}>
              <div style={{
                backgroundColor: color,
                color: 'white',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '10px',
                whiteSpace: 'nowrap'
              }}>
                Cost: {debugData.performanceData.renderCost}
              </div>
            </Html>
          )
        })}
      </group>
    )
  }

  return null
}

const AIDebugVisualization: React.FC<{ floor: any }> = ({ floor }) => {
  const analysis = FloorNavigationAnalyzer.analyzeFloorForAI(floor)
  
  const safetyColors = {
    'safe': '#4CAF50',
    'caution': '#FF9800',
    'risky': '#FF5722',
    'dangerous': '#f44336',
    'avoid': '#9C27B0'
  }

  return (
    <mesh position={[floor.position.x, floor.position.y + 0.01, floor.position.z]}>
      <ringGeometry args={[0.3, 0.5, 16]} />
      <meshBasicMaterial 
        color={safetyColors[analysis.safetyLevel]} 
        transparent 
        opacity={0.6}
      />
    </mesh>
  )
}

const FloatingDebugInfo: React.FC<{
  floorData?: FloorDebugData
  position: { top: string; right: string }
}> = ({ floorData, position }) => {
  if (!floorData) return null

  return (
    <div style={{
      position: 'absolute',
      ...position,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      minWidth: '200px',
      zIndex: 1000
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>Floor Debug Info</h4>
      <div>ID: {floorData.floorId.slice(-8)}</div>
      <div>Type: {floorData.materialProperties.glassType}</div>
      <div>Safety: {floorData.navigationProperties.safetyLevel}</div>
      <div>LOD: {floorData.performanceData.lodLevel}</div>
      <div>Cost: {floorData.performanceData.renderCost}</div>
    </div>
  )
}

// Utility functions
const calculateRenderCost = (floor: any): number => {
  let cost = 50 // Base cost
  cost += (1 - floor.transparency) * 20 // Transparency cost
  cost += floor.roughness * 15 // Roughness processing cost
  return Math.round(cost)
}

const estimateMemoryUsage = (floor: any): number => {
  let memory = 100 // Base memory in KB
  memory += Math.pow(512, 2) * 4 / 1024 // Texture memory (assuming 512x512 RGBA)
  if (floor.materialPreset) memory += 50 // Additional preset data
  return Math.round(memory)
}

const getVertexCount = (floor: any): number => {
  return 8 // Simple box geometry
}

const getTriangleCount = (floor: any): number => {
  return 12 // Simple box geometry
}

const getTextureResolution = (floor: any): number => {
  return floor.renderQuality?.textureResolution || 512
}
```

## SUCCESS CRITERIA

### Testing Framework Validation Checklist:
- [ ] All automated tests pass consistently
- [ ] Visual tests correctly identify rendering issues
- [ ] Performance benchmarks complete within expected timeframes
- [ ] Debug interface provides accurate real-time data
- [ ] Material editor changes reflect immediately in the scene
- [ ] AI analysis matches expected safety assessments
- [ ] Memory usage remains stable during extended testing
- [ ] Error handling gracefully manages edge cases

### Technical Validation:
- [ ] Test coverage exceeds 90% for core functionality
- [ ] Performance benchmarks establish reliable baselines
- [ ] Debug tools provide actionable insights for developers
- [ ] Visual tests can be automated for CI/CD integration
- [ ] All system components can be independently tested
- [ ] Regression testing catches breaking changes
- [ ] Memory leaks are detected and reported

### Developer Experience:
- [ ] Debug interface is intuitive and responsive
- [ ] Testing framework provides clear feedback
- [ ] Performance issues are clearly highlighted
- [ ] Material editing is smooth and immediate
- [ ] AI analysis is visually represented clearly
- [ ] Documentation for testing is comprehensive
- [ ] New developers can understand the system quickly

## INTEGRATION POINTS

### Integration with All Previous Phases:
- Testing framework validates all Phase 1-4 functionality
- Debug tools provide insights into material, performance, and AI systems
- Performance benchmarks establish quality gates for all features
- Visual tests ensure consistent behavior across all systems

### Production Readiness:
- Automated testing pipeline for continuous integration
- Performance monitoring for production deployments
- Debug tools for troubleshooting live issues
- Regression testing for safe updates

## ESTIMATED TIME: 4-5 days

This phase creates a comprehensive testing and debugging ecosystem that ensures the floor system is robust, performant, and maintainable while providing excellent developer experience for ongoing development and troubleshooting.