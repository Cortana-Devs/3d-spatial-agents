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
