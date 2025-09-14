/**
 * Example usage of Enhanced ReadyPlayerMeSimulant component
 * Demonstrates external animation loading, LOD system, and performance optimization
 */

import React, { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import ReadyPlayerMeSimulant from '@components/simulants/ReadyPlayerMeSimulant'
import type { AISimulant } from '../types'

// Example simulant data
const createExampleSimulant = (id: string, position: { x: number; y: number; z: number }): AISimulant => ({
  id,
  name: `Simulant ${id}`,
  position,
  status: 'active',
  lastAction: 'Standing peacefully in the metaverse',
  conversationHistory: [],
  geminiSessionId: `session-${id}`,
})

// Custom animation paths for demonstration
const CUSTOM_ANIMATION_PATHS = [
  '/animation_GLB/F_Standing_Idle_Variations_001.glb',
  '/animation_GLB/F_Standing_Idle_Variations_002.glb',
  '/animation_GLB/M_Walk_001.glb',
  '/animation_GLB/M_Run_001.glb',
  '/animation_GLB/M_Walk_Jump_002.glb',
  '/animation_GLB/F_Dances_007.glb',
  '/animation_GLB/M_Talking_Variations_005.glb',
]

export default function EnhancedRPMSimulantExample() {
  const [simulants] = useState<AISimulant[]>([
    createExampleSimulant('1', { x: 0, y: 0, z: 0 }),
    createExampleSimulant('2', { x: 5, y: 0, z: 0 }),
    createExampleSimulant('3', { x: -5, y: 0, z: 0 }),
    createExampleSimulant('4', { x: 0, y: 0, z: 5 }),
    createExampleSimulant('5', { x: 0, y: 0, z: -5 }),
  ])

  const [performanceMode, setPerformanceMode] = useState<'quality' | 'balanced' | 'performance'>('balanced')
  const [enableAnimations, setEnableAnimations] = useState(true)
  const [lodLevel, setLodLevel] = useState<'high' | 'medium' | 'low'>('high')
  const [animationLog, setAnimationLog] = useState<string[]>([])

  // Animation event handlers
  const handleAnimationChange = useCallback((simulantId: string, animationName: string) => {
    const logEntry = `${new Date().toLocaleTimeString()}: Simulant ${simulantId} -> ${animationName}`
    setAnimationLog(prev => [logEntry, ...prev.slice(0, 9)]) // Keep last 10 entries
  }, [])

  const handleLoadComplete = useCallback((simulantId: string) => {
    console.log(`✅ Simulant ${simulantId} animations loaded successfully`)
  }, [])

  const handleLoadError = useCallback((simulantId: string, error: Error) => {
    console.error(`❌ Simulant ${simulantId} animation load error:`, error)
  }, [])

  // Simulate action changes for demonstration
  const triggerAction = useCallback((simulantId: string, action: string) => {
    // In a real app, this would update the simulant in your state management
    console.log(`🎬 Triggering action for simulant ${simulantId}: ${action}`)
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
      {/* 3D Scene */}
      <div style={{ flex: 1 }}>
        <Canvas
          camera={{ position: [10, 10, 10], fov: 60 }}
          shadows
        >
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />

          {/* Ground plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial color="#2a2a2a" />
          </mesh>

          {/* Enhanced RPM Simulants */}
          {simulants.map((simulant) => (
            <ReadyPlayerMeSimulant
              key={simulant.id}
              simulant={simulant}
              animationPaths={CUSTOM_ANIMATION_PATHS}
              performanceMode={performanceMode}
              lodLevel={lodLevel}
              enableAnimations={enableAnimations}
              enableGridSnap={false}
              scale={0.8}
              onAnimationChange={(animationName) => handleAnimationChange(simulant.id, animationName)}
              onLoadComplete={() => handleLoadComplete(simulant.id)}
              onLoadError={(error) => handleLoadError(simulant.id, error)}
            />
          ))}

          {/* Camera controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={5}
            maxDistance={50}
          />
        </Canvas>
      </div>

      {/* Control Panel */}
      <div style={{
        width: '300px',
        padding: '20px',
        backgroundColor: '#1a1a1a',
        color: 'white',
        overflowY: 'auto'
      }}>
        <h2>Enhanced RPM Simulant Demo</h2>

        {/* Performance Mode */}
        <div style={{ marginBottom: '20px' }}>
          <h3>Performance Mode</h3>
          <select
            value={performanceMode}
            onChange={(e) => setPerformanceMode(e.target.value as any)}
            style={{ width: '100%', padding: '5px', marginBottom: '10px' }}
          >
            <option value="quality">Quality (60fps, 10 simulants)</option>
            <option value="balanced">Balanced (30fps, 6 simulants)</option>
            <option value="performance">Performance (15fps, 3 simulants)</option>
          </select>
        </div>

        {/* LOD Level */}
        <div style={{ marginBottom: '20px' }}>
          <h3>LOD Level</h3>
          <select
            value={lodLevel}
            onChange={(e) => setLodLevel(e.target.value as any)}
            style={{ width: '100%', padding: '5px', marginBottom: '10px' }}
          >
            <option value="high">High (Full detail)</option>
            <option value="medium">Medium (Reduced detail)</option>
            <option value="low">Low (Minimal detail)</option>
          </select>
        </div>

        {/* Animation Toggle */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={enableAnimations}
              onChange={(e) => setEnableAnimations(e.target.checked)}
            />
            Enable Animations
          </label>
        </div>

        {/* Action Triggers */}
        <div style={{ marginBottom: '20px' }}>
          <h3>Test Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <button onClick={() => triggerAction('1', 'Walking around the world')}>
              Walk
            </button>
            <button onClick={() => triggerAction('1', 'Running with excitement')}>
              Run
            </button>
            <button onClick={() => triggerAction('1', 'Jumping with joy')}>
              Jump
            </button>
            <button onClick={() => triggerAction('1', 'Building something amazing')}>
              Build
            </button>
            <button onClick={() => triggerAction('1', 'Dancing to celebrate')}>
              Dance
            </button>
            <button onClick={() => triggerAction('1', 'Talking to friends')}>
              Talk
            </button>
            <button onClick={() => triggerAction('1', 'Standing peacefully')}>
              Idle
            </button>
          </div>
        </div>

        {/* Animation Log */}
        <div>
          <h3>Animation Log</h3>
          <div style={{
            backgroundColor: '#2a2a2a',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '12px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {animationLog.length === 0 ? (
              <div style={{ color: '#666' }}>No animation changes yet...</div>
            ) : (
              animationLog.map((entry, index) => (
                <div key={index} style={{ marginBottom: '5px' }}>
                  {entry}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Performance Info */}
        <div style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}>
          <h4>Performance Settings:</h4>
          <div>Mode: {performanceMode}</div>
          <div>LOD: {lodLevel}</div>
          <div>Animations: {enableAnimations ? 'Enabled' : 'Disabled'}</div>
          <div>Simulants: {simulants.length}</div>
        </div>
      </div>
    </div>
  )
}

// Usage instructions
export const USAGE_INSTRUCTIONS = `
Enhanced ReadyPlayerMeSimulant Usage:

1. Basic Usage:
   <ReadyPlayerMeSimulant simulant={simulantData} />

2. With Custom Animations:
   <ReadyPlayerMeSimulant 
     simulant={simulantData}
     animationPaths={['/path/to/animation1.glb', '/path/to/animation2.glb']}
   />

3. With Performance Optimization:
   <ReadyPlayerMeSimulant 
     simulant={simulantData}
     performanceMode="balanced"
     lodLevel="medium"
   />

4. With Event Callbacks:
   <ReadyPlayerMeSimulant 
     simulant={simulantData}
     onAnimationChange={(name) => console.log('Animation:', name)}
     onLoadComplete={() => console.log('Loaded!')}
     onLoadError={(error) => console.error('Error:', error)}
   />

5. Full Configuration:
   <ReadyPlayerMeSimulant 
     simulant={simulantData}
     modelPath="/models/custom-avatar.glb"
     animationPaths={customAnimationPaths}
     scale={1.2}
     enableAnimations={true}
     enableGridSnap={false}
     lodLevel="high"
     performanceMode="quality"
     onAnimationChange={handleAnimationChange}
     onLoadComplete={handleLoadComplete}
     onLoadError={handleLoadError}
   />

Features:
- External animation loading from GLB files
- Distance-based LOD system for performance
- Configurable performance modes (quality/balanced/performance)
- Animation state controller with smooth transitions
- Proper resource cleanup and disposal
- Error handling and graceful degradation
- Real-time animation switching based on simulant actions
- Memory management and asset caching
`