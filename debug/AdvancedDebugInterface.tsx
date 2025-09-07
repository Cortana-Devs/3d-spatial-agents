import React, { useState, useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, Stats, Html } from '@react-three/drei'
import { FrostedGlassFloor } from '../components/floors/FrostedGlassFloor'
import { FloorFactory } from '../utils/floorFactory'
import { FloorNavigationAnalyzer } from '../ai/FloorNavigationProperties'
import { usePerformanceMonitor } from '../systems/PerformanceMonitor'
import {
  FloorInspectorPanel,
  PerformanceMonitorPanel,
  AIAnalyzerPanel,
  MaterialEditorPanel,
  RenderDebuggerPanel
} from './DebugPanelComponents'
import * as THREE from 'three'

import { FloorDebugData } from '../types/debug'

interface DebugPanel {
  id: string
  title: string
  component: React.ComponentType<any>
  position: 'left' | 'right' | 'bottom' | 'floating'
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

// Helper components
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

// Debug panel components
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
        color={safetyColors[analysis.safetyLevel as keyof typeof safetyColors]} 
        transparent 
        opacity={0.6}
      />
    </mesh>
  )
}
