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
