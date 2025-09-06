'use client'

import React, { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stats, Text, Box, Sphere, Plane } from '@react-three/drei'
import { Color, Vector3, Mesh, MeshStandardMaterial } from 'three'
import SkyboxManager from '../../components/skybox/SkyboxManager'
import SkyboxErrorBoundary from '../../components/skybox/SkyboxErrorBoundary'
import SkyboxControls from '../../components/skybox/SkyboxControls'
import { useSkybox } from '../../hooks/skybox/useSkybox'
import { useSkyboxTransition } from '../../hooks/skybox/useSkyboxTransition'
import { useSkyboxPerformanceMonitor } from '../../hooks/skybox/useSkybox'
import { useSkyboxStore } from '../../store/skyboxStore'
import { SkyboxPreset, DEFAULT_ATMOSPHERIC_SETTINGS, TransitionConfig } from '../../types/skybox'
import { Button } from '../../components/ui/button'
import { Slider } from '../../components/ui/slider'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'

// Advanced skybox presets with different scenarios
const advancedPresets: SkyboxPreset[] = [
  {
    id: 'dynamic-sunset',
    name: 'Dynamic Sunset',
    description: 'Animated sunset with changing colors',
    assetPath: '/skyboxes/sunset-dynamic/',
    intensity: 1.5,
    tint: new Color(1, 0.9, 0.7),
    rotationSpeed: 0.005,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.9, 0.6, 0.3),
      fogNear: 80,
      fogFar: 1200,
      timeOfDay: 0.15,
      windSpeed: 2,
      windDirection: new Vector3(1, 0, 0.5),
      cloudCoverage: 0.4
    },
    performance: {
      quality: 'high',
      memoryUsage: 96,
      loadPriority: 9
    },
    tags: ['dynamic', 'sunset', 'animated', 'atmospheric'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cyberpunk-city',
    name: 'Cyberpunk Metropolis',
    description: 'Neon-lit futuristic cityscape',
    assetPath: '/skyboxes/cyberpunk/',
    intensity: 2.0,
    tint: new Color(0.8, 1.1, 1.3),
    rotationSpeed: 0,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.2, 0.4, 0.8),
      fogNear: 120,
      fogFar: 2000,
      timeOfDay: 0.9,
      windSpeed: 0,
      cloudCoverage: 0.1
    },
    performance: {
      quality: 'high',
      memoryUsage: 128,
      loadPriority: 8
    },
    tags: ['cyberpunk', 'city', 'neon', 'futuristic'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'aurora-arctic',
    name: 'Arctic Aurora',
    description: 'Northern lights over snowy landscape',
    assetPath: '/skyboxes/aurora/',
    intensity: 0.7,
    tint: new Color(0.95, 1.0, 1.2),
    rotationSpeed: 0.002,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.85, 0.9, 1.0),
      fogNear: 200,
      fogFar: 3000,
      timeOfDay: 0.95,
      windSpeed: 1,
      windDirection: new Vector3(-1, 0, 0),
      cloudCoverage: 0.2
    },
    performance: {
      quality: 'medium',
      memoryUsage: 72,
      loadPriority: 7
    },
    tags: ['aurora', 'arctic', 'cold', 'northern-lights'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'alien-world',
    name: 'Alien Landscape',
    description: 'Exotic alien planet with multiple suns',
    assetPath: '/skyboxes/alien/',
    intensity: 1.8,
    tint: new Color(1.2, 0.8, 1.1),
    rotationSpeed: 0.008,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: false,
      timeOfDay: 0.3,
      windSpeed: 3,
      windDirection: new Vector3(0.5, 0.2, 1),
      cloudCoverage: 0.6
    },
    performance: {
      quality: 'high',
      memoryUsage: 112,
      loadPriority: 6
    },
    tags: ['alien', 'exotic', 'sci-fi', 'multiple-suns'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'underwater-depths',
    name: 'Ocean Depths',
    description: 'Deep underwater environment with caustics',
    assetPath: '/skyboxes/underwater/',
    intensity: 0.4,
    tint: new Color(0.6, 0.9, 1.2),
    rotationSpeed: 0.001,
    atmosphericSettings: {
      ...DEFAULT_ATMOSPHERIC_SETTINGS,
      fogEnabled: true,
      fogColor: new Color(0.1, 0.3, 0.5),
      fogNear: 10,
      fogFar: 100,
      timeOfDay: 0.5,
      windSpeed: 0,
      cloudCoverage: 0
    },
    performance: {
      quality: 'medium',
      memoryUsage: 56,
      loadPriority: 5
    },
    tags: ['underwater', 'ocean', 'deep', 'caustics'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

// Animated mesh component that reacts to skybox changes
function ReactiveGeometry() {
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<MeshStandardMaterial>(null)
  const { currentPreset, presets } = useSkybox()

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.5
    }

    // React to current skybox
    if (materialRef.current && currentPreset && presets[currentPreset]) {
      const preset = presets[currentPreset]
      const tintInfluence = 0.3

      materialRef.current.color.lerp(
        new Color().copy(preset.tint).multiplyScalar(tintInfluence),
        0.02
      )

      materialRef.current.emissiveIntensity = Math.sin(state.clock.elapsedTime * 2) * 0.1 + preset.intensity * 0.1
    }
  })

  return (
    <mesh ref={meshRef} position={[0, 2, 0]}>
      <icosahedronGeometry args={[1, 2]} />
      <meshStandardMaterial
        ref={materialRef}
        color="white"
        emissive="blue"
        emissiveIntensity={0.1}
        roughness={0.3}
        metalness={0.8}
      />
    </mesh>
  )
}

// Performance monitor overlay
function PerformanceOverlay() {
  const { performance, isHealthy, healthStatus, optimizationSuggestions } = useSkyboxPerformanceMonitor()
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="absolute top-4 right-4 z-20">
      <div className="bg-black/80 text-white p-3 rounded-lg backdrop-blur-sm min-w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Performance</span>
          <div className={`w-3 h-3 rounded-full ${
            healthStatus === 'healthy' ? 'bg-green-500' :
            healthStatus === 'warning' ? 'bg-yellow-500' :
            'bg-red-500'
          }`} />
        </div>

        <div className="space-y-1 text-xs">
          <div>Memory: {performance.memoryUsage.toFixed(1)} MB</div>
          <div>Load Time: {performance.loadTime.toFixed(0)} ms</div>
          <div>FPS Impact: {performance.frameImpact.toFixed(1)}</div>
          <div>Cache Hit: {(performance.cacheHitRate * 100).toFixed(0)}%</div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-6 text-xs"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </Button>

        {showDetails && optimizationSuggestions.length > 0 && (
          <div className="mt-2 p-2 bg-yellow-500/20 rounded text-xs">
            <div className="font-medium mb-1">Suggestions:</div>
            {optimizationSuggestions.map((suggestion, idx) => (
              <div key={idx}>• {suggestion}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Transition control panel
function TransitionControls() {
  const {
    transitionState,
    startTransition,
    cancelTransition,
    pauseTransition,
    resumeTransition,
    setDefaultConfig,
    getDefaultConfig,
    createSequence
  } = useSkyboxTransition({
    onTransitionStart: (from, to) => console.log(`Advanced transition: ${from} → ${to}`),
    onTransitionComplete: (to) => console.log(`Advanced transition to ${to} completed`)
  })

  const { currentPreset, presets } = useSkybox()
  const [sequenceMode, setSequenceMode] = useState(false)
  const [customDuration, setCustomDuration] = useState(1000)

  const handleQuickTransition = useCallback(async (presetId: string) => {
    if (currentPreset !== presetId) {
      await startTransition(currentPreset, presetId, {
        duration: customDuration,
        easing: 'ease-in-out',
        type: 'cross-fade'
      })
    }
  }, [currentPreset, startTransition, customDuration])

  const handleSequenceDemo = useCallback(async () => {
    const presetIds = Object.keys(presets).filter(id => id !== currentPreset)
    if (presetIds.length < 2) return

    await createSequence([
      { toPreset: presetIds[0], duration: 1500, delay: 500 },
      { toPreset: presetIds[1], duration: 2000, delay: 1000 },
      { toPreset: presetIds[2] || presetIds[0], duration: 1000, delay: 800 }
    ])
  }, [presets, currentPreset, createSequence])

  return (
    <div className="bg-white/95 dark:bg-black/95 backdrop-blur-sm rounded-lg p-4 shadow-lg min-w-[300px]">
      <h3 className="text-lg font-semibold mb-3">Transition Controls</h3>

      {transitionState.isActive && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Transitioning...</span>
            <span className="text-sm font-mono">{(transitionState.progress * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${transitionState.progress * 100}%` }}
            />
          </div>
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={pauseTransition}>Pause</Button>
            <Button size="sm" onClick={resumeTransition}>Resume</Button>
            <Button size="sm" variant="destructive" onClick={cancelTransition}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Transition Duration</Label>
          <div className="flex items-center space-x-3">
            <Slider
              value={[customDuration]}
              onValueChange={(value) => setCustomDuration(value[0])}
              max={5000}
              min={100}
              step={100}
              className="flex-1"
            />
            <span className="text-sm min-w-[60px]">{customDuration}ms</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {Object.entries(presets).slice(0, 4).map(([id, preset]) => (
            <Button
              key={id}
              variant={currentPreset === id ? "default" : "outline"}
              size="sm"
              onClick={() => handleQuickTransition(id)}
              disabled={transitionState.isActive}
              className="text-xs"
            >
              {preset.name}
            </Button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="sequence-mode" className="text-sm">
            Sequence Demo
          </Label>
          <Button
            size="sm"
            onClick={handleSequenceDemo}
            disabled={transitionState.isActive || Object.keys(presets).length < 3}
          >
            Start Sequence
          </Button>
        </div>
      </div>
    </div>
  )
}

// Dynamic environment effects
function EnvironmentEffects() {
  const { currentPreset, presets } = useSkybox()
  const [particles] = useState(() => Array.from({ length: 50 }, (_, i) => ({
    id: i,
    position: [
      (Math.random() - 0.5) * 50,
      Math.random() * 20,
      (Math.random() - 0.5) * 50
    ] as [number, number, number],
    velocity: [
      (Math.random() - 0.5) * 0.1,
      Math.random() * 0.05,
      (Math.random() - 0.5) * 0.1
    ] as [number, number, number]
  })))

  const particlesRef = useRef<Mesh[]>([])

  useFrame(() => {
    const preset = currentPreset ? presets[currentPreset] : null
    if (!preset) return

    const windEffect = preset.atmosphericSettings.windSpeed * 0.01

    particlesRef.current.forEach((particle, i) => {
      if (particle) {
        const data = particles[i]

        // Apply wind and atmospheric effects
        particle.position.x += data.velocity[0] + windEffect * preset.atmosphericSettings.windDirection.x
        particle.position.y += data.velocity[1]
        particle.position.z += data.velocity[2] + windEffect * preset.atmosphericSettings.windDirection.z

        // Reset particles that go out of bounds
        if (particle.position.y > 25) {
          particle.position.y = -5
          particle.position.x = (Math.random() - 0.5) * 50
          particle.position.z = (Math.random() - 0.5) * 50
        }

        // Tint particles based on skybox
        if (particle.material && 'color' in particle.material) {
          (particle.material as any).color.lerp(preset.tint, 0.01)
        }
      }
    })
  })

  return (
    <group>
      {particles.map((particle, i) => (
        <mesh
          key={particle.id}
          ref={el => { if (el) particlesRef.current[i] = el }}
          position={particle.position}
        >
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial
            color="white"
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Advanced skybox example with dynamic features, transitions, and performance monitoring
 */
export function AdvancedSkyboxExample() {
  const { addPreset, presets } = useSkyboxStore()
  const [activeTab, setActiveTab] = useState('scene')
  const [autoRotate, setAutoRotate] = useState(true)
  const [showEffects, setShowEffects] = useState(true)
  const [currentPresetIndex, setCurrentPresetIndex] = useState(0)

  const {
    changePreset,
    currentPreset,
    isTransitioning,
    clearCache,
    optimizeCache
  } = useSkybox({
    autoLoad: true,
    preloadAdjacent: true,
    enablePerformanceMonitoring: true,
    onError: (error) => console.error('Advanced skybox error:', error),
    onLoadComplete: (presetId) => console.log('Advanced skybox loaded:', presetId),
    onTransitionStart: (from, to) => console.log(`Advanced transition: ${from} → ${to}`)
  })

  // Initialize advanced presets
  useEffect(() => {
    advancedPresets.forEach(preset => {
      if (!presets[preset.id]) {
        addPreset(preset)
      }
    })
  }, [addPreset, presets])

  // Auto-cycle through presets
  useEffect(() => {
    const presetIds = Object.keys(presets)
    if (presetIds.length === 0) return

    const interval = setInterval(() => {
      if (!isTransitioning) {
        const nextIndex = (currentPresetIndex + 1) % presetIds.length
        setCurrentPresetIndex(nextIndex)
        changePreset(presetIds[nextIndex])
      }
    }, 10000) // Change every 10 seconds

    return () => clearInterval(interval)
  }, [presets, currentPresetIndex, isTransitioning, changePreset])

  const handleManualPresetChange = useCallback(async (presetId: string) => {
    const presetIds = Object.keys(presets)
    const index = presetIds.indexOf(presetId)
    if (index !== -1) {
      setCurrentPresetIndex(index)
      await changePreset(presetId)
    }
  }, [presets, changePreset])

  return (
    <div className="w-full h-screen relative">
      {/* 3D Scene */}
      <Canvas
        camera={{ position: [0, 5, 15], fov: 60 }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance"
        }}
      >
        <Suspense fallback={null}>
          <SkyboxErrorBoundary>
            <SkyboxManager
              currentSkybox={currentPreset}
              transitionDuration={2000}
              enableAtmosphericEffects={true}
              performanceMode="quality"
              onLoadError={(error) => {
                console.error('Advanced skybox load error:', error)
              }}
              onTransitionStart={(from, to) => {
                console.log(`Manager transition: ${from} → ${to}`)
              }}
            />
          </SkyboxErrorBoundary>

          {/* Scene Objects */}
          <ReactiveGeometry />

          {/* Ground plane */}
          <Plane
            args={[50, 50]}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -2, 0]}
          >
            <meshStandardMaterial
              color="#444444"
              roughness={0.8}
              metalness={0.2}
              transparent
              opacity={0.8}
            />
          </Plane>

          {/* Reference objects */}
          <Box position={[5, 0, 0]} args={[1, 1, 1]}>
            <meshStandardMaterial color="red" />
          </Box>

          <Sphere position={[-5, 0, 0]} args={[0.8, 32, 32]}>
            <meshStandardMaterial color="blue" />
          </Sphere>

          <Text
            position={[0, 4, 0]}
            fontSize={1}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            Advanced Skybox Demo
          </Text>

          {/* Dynamic environment effects */}
          {showEffects && <EnvironmentEffects />}

          {/* Enhanced lighting */}
          <ambientLight intensity={0.3} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[0, 10, 0]} intensity={0.5} color="white" />

          {/* Camera controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={autoRotate}
            autoRotateSpeed={0.5}
            minDistance={5}
            maxDistance={100}
            maxPolarAngle={Math.PI / 2}
          />

          {process.env.NODE_ENV === 'development' && <Stats />}
        </Suspense>
      </Canvas>

      {/* Performance Monitor */}
      <PerformanceOverlay />

      {/* Main Control Panel */}
      <div className="absolute bottom-4 left-4 z-10 max-w-md">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scene">Scene</TabsTrigger>
            <TabsTrigger value="skybox">Skybox</TabsTrigger>
            <TabsTrigger value="transitions">Transitions</TabsTrigger>
          </TabsList>

          <TabsContent value="scene" className="mt-4">
            <div className="bg-white/95 dark:bg-black/95 backdrop-blur-sm rounded-lg p-4 shadow-lg">
              <h3 className="text-lg font-semibold mb-3">Scene Controls</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-rotate">Auto Rotate Camera</Label>
                  <Switch
                    id="auto-rotate"
                    checked={autoRotate}
                    onCheckedChange={setAutoRotate}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-effects">Environment Effects</Label>
                  <Switch
                    id="show-effects"
                    checked={showEffects}
                    onCheckedChange={setShowEffects}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={optimizeCache}
                    disabled={isTransitioning}
                  >
                    Optimize
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={clearCache}
                    disabled={isTransitioning}
                  >
                    Clear Cache
                  </Button>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Current: {currentPreset ? presets[currentPreset]?.name : 'None'}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="skybox" className="mt-4">
            <div className="bg-white/95 dark:bg-black/95 backdrop-blur-sm rounded-lg p-4 shadow-lg max-h-80 overflow-y-auto">
              <SkyboxControls
                showAdvanced={true}
                onPresetChange={handleManualPresetChange}
                onError={(error) => console.error('Advanced control error:', error)}
              />
            </div>
          </TabsContent>

          <TabsContent value="transitions" className="mt-4">
            <TransitionControls />
          </TabsContent>
        </Tabs>
      </div>

      {/* Status Indicator */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-black/80 text-white px-3 py-2 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isTransitioning ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
            }`} />
            <span className="text-sm">
              {isTransitioning ? 'Transitioning...' : 'Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      <div className="absolute top-20 left-4 z-10 max-w-sm">
        <div className="bg-white/90 dark:bg-black/90 backdrop-blur-sm rounded-lg p-4 shadow-lg text-sm">
          <h3 className="font-semibold mb-2">Advanced Features:</h3>
          <ul className="space-y-1 text-gray-700 dark:text-gray-300">
            <li>• Dynamic skybox transitions</li>
            <li>• Performance monitoring</li>
            <li>• Atmospheric particle effects</li>
            <li>• Auto-cycling presets</li>
            <li>• Advanced transition controls</li>
            <li>• Memory optimization</li>
            <li>• Reactive scene objects</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default AdvancedSkyboxExample
