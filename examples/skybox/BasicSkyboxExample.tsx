'use client'

import React, { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'
import { Color, Vector3 } from 'three'
import SkyboxManager from '@components/skybox/SkyboxManager'
import SkyboxErrorBoundary from '@components/skybox/SkyboxErrorBoundary'
import SkyboxControls from '@components/skybox/SkyboxControls'
import { useSkyboxStore } from '../../store/skyboxStore'
import { SkyboxPreset, DEFAULT_ATMOSPHERIC_SETTINGS } from '../../types/skybox'

// Example skybox presets
const examplePresets: SkyboxPreset[] = [
  {
    id: 'sunset-sky',
    name: 'Sunset Sky',
    description: 'Beautiful sunset with warm colors',
    assetPath: '/skyboxes/sunset/',
    intensity: 1.2,
    tint: new Color(1, 0.95, 0.8),
    rotationSpeed: 0,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.95, 0.7, 0.4),
      fogNear: 100,
      fogFar: 1000,
      timeOfDay: 0.2
    },
    performance: {
      quality: 'high',
      memoryUsage: 64,
      loadPriority: 8
    },
    tags: ['sunset', 'warm', 'evening'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'space-nebula',
    name: 'Space Nebula',
    description: 'Deep space with colorful nebula',
    assetPath: '/skyboxes/nebula/',
    intensity: 0.8,
    tint: new Color(0.9, 0.9, 1.2),
    rotationSpeed: 0.01,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: false,
      timeOfDay: 0.0,
      cloudCoverage: 0.3
    },
    performance: {
      quality: 'medium',
      memoryUsage: 48,
      loadPriority: 6
    },
    tags: ['space', 'nebula', 'sci-fi'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cloudy-day',
    name: 'Cloudy Day',
    description: 'Overcast sky with soft lighting',
    assetPath: '/skyboxes/cloudy/',
    intensity: 1.0,
    tint: new Color(1, 1, 1),
    rotationSpeed: 0,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.8, 0.85, 0.9),
      fogNear: 50,
      fogFar: 800,
      timeOfDay: 0.5,
      cloudCoverage: 0.8
    },
    performance: {
      quality: 'medium',
      memoryUsage: 32,
      loadPriority: 7
    },
    tags: ['cloudy', 'overcast', 'soft'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

/**
 * Basic skybox example demonstrating simple usage
 */
export function BasicSkyboxExample() {
  const { addPreset, presets } = useSkyboxStore()

  // Initialize example presets
  useEffect(() => {
    // Only add presets if they don't already exist
    examplePresets.forEach(preset => {
      if (!presets[preset.id]) {
        addPreset(preset)
      }
    })
  }, [addPreset, presets])

  const handleLoadError = (error: Error) => {
    console.error('Skybox load error:', error)
    // In a real application, you might want to show a toast notification
  }

  const handleLoadComplete = () => {
    console.log('Skybox loaded successfully')
  }

  return (
    <div className="w-full h-screen relative">
      {/* 3D Scene */}
      <Canvas
        camera={{ position: [0, 0, 10], fov: 75 }}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          {/* Skybox Error Boundary */}
          <SkyboxErrorBoundary
            onError={(error, errorInfo) => {
              console.error('Skybox error boundary triggered:', error, errorInfo)
            }}
          >
            {/* Main Skybox Manager */}
            <SkyboxManager
              currentSkybox="sunset-sky"
              transitionDuration={1000}
              enableAtmosphericEffects={true}
              performanceMode="balanced"
              onLoadComplete={handleLoadComplete}
              onLoadError={handleLoadError}
              onTransitionStart={(from, to) => {
                console.log(`Transitioning from ${from || 'none'} to ${to}`)
              }}
              onTransitionComplete={(preset) => {
                console.log(`Transition to ${preset} completed`)
              }}
            />
          </SkyboxErrorBoundary>

          {/* Scene objects for reference */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[2, 2, 2]} />
            <meshStandardMaterial color="orange" />
          </mesh>

          <mesh position={[4, 0, 0]}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial color="blue" />
          </mesh>

          <mesh position={[-4, 0, 0]}>
            <cylinderGeometry args={[1, 1, 2, 32]} />
            <meshStandardMaterial color="green" />
          </mesh>

          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />

          {/* Camera Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={50}
          />

          {/* Performance Stats (development only) */}
          {process.env.NODE_ENV === 'development' && <Stats />}
        </Suspense>
      </Canvas>

      {/* UI Controls */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-white/90 dark:bg-black/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Skybox Example</h2>

          {/* Skybox Controls */}
          <SkyboxControls
            showAdvanced={true}
            onPresetChange={(presetId) => {
              console.log('Preset changed to:', presetId)
            }}
            onError={(error) => {
              console.error('Control error:', error)
            }}
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 z-10 max-w-sm">
        <div className="bg-white/90 dark:bg-black/90 backdrop-blur-sm rounded-lg p-4 shadow-lg text-sm">
          <h3 className="font-semibold mb-2">Instructions:</h3>
          <ul className="space-y-1 text-gray-700 dark:text-gray-300">
            <li>• Click "Skybox Controls" to change environments</li>
            <li>• Use mouse to orbit around the scene</li>
            <li>• Scroll to zoom in/out</li>
            <li>• Try different performance modes in settings</li>
            <li>• Watch transition animations between presets</li>
          </ul>
        </div>
      </div>

      {/* Loading Indicator */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="bg-black/50 text-white px-4 py-2 rounded-lg backdrop-blur-sm opacity-0 transition-opacity duration-300" id="loading-indicator">
          Loading skybox...
        </div>
      </div>
    </div>
  )
}

export default BasicSkyboxExample
