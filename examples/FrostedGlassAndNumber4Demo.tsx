import React, { useState, useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Stats, Sky, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { BlockFactory } from '../utils/blockFactory'
import { BlockType } from '../types/blocks'
import BlockRenderer from '../components/world/BlockRenderer'
import { useFloorSystem } from '../systems/integration/FloorSystemIntegrator'
import { FloorControlPanel } from '../components/ui/FloorControlPanel'

export const FrostedGlassAndNumber4Demo: React.FC = () => {
  const [blocks, setBlocks] = useState<any[]>([])
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null)
  const [demoMode, setDemoMode] = useState<'gallery' | 'interactive' | 'showcase'>('gallery')
  const [showUI, setShowUI] = useState(true)
  const [animationSpeed, setAnimationSpeed] = useState(1)

  const floorSystem = useFloorSystem({
    maxFloors: 50,
    enableLOD: true,
    enableBatching: true,
    enableAdvancedEffects: true,
    qualityPreset: 'high'
  })

  // Initialize demo blocks
  useEffect(() => {
    createDemoScene()
  }, [demoMode])

  const createDemoScene = () => {
    const newBlocks: any[] = []

    if (demoMode === 'gallery') {
      createGalleryScene(newBlocks)
    } else if (demoMode === 'interactive') {
      createInteractiveScene(newBlocks)
    } else {
      createShowcaseScene(newBlocks)
    }

    setBlocks(newBlocks)
  }

  const createGalleryScene = (newBlocks: any[]) => {
    // Create a gallery of different frosted glass blocks
    const glassVariations = [
      { pos: [-4, 1, 0], transparency: 0.1, color: '#E3F2FD' },
      { pos: [-2, 1, 0], transparency: 0.3, color: '#BBDEFB' },
      { pos: [0, 1, 0], transparency: 0.5, color: '#90CAF9' },
      { pos: [2, 1, 0], transparency: 0.7, color: '#64B5F6' },
      { pos: [4, 1, 0], transparency: 0.9, color: '#42A5F5' }
    ]

    glassVariations.forEach((variation, index) => {
      const block = BlockFactory.createFrostedGlassBlock(
        new THREE.Vector3(variation.pos[0], variation.pos[1], variation.pos[2]),
        'demo_user',
        variation.transparency,
        variation.color
      )
      block.id = `glass_${index}`
      newBlocks.push(block)
    })

    // Create number 4 blocks in a pattern
    const number4Positions = [
      [-3, 1, -3], [-1, 1, -3], [1, 1, -3], [3, 1, -3],
      [-3, 1, 3], [-1, 1, 3], [1, 1, 3], [3, 1, 3]
    ]

    number4Positions.forEach((pos, index) => {
      const block = BlockFactory.createNumber4Block(
        new THREE.Vector3(pos[0], pos[1], pos[2]),
        'demo_user',
        0.5 + (index * 0.1)
      )
      block.id = `number4_${index}`
      newBlocks.push(block)
    })
  }

  const createInteractiveScene = (newBlocks: any[]) => {
    // Create an interactive scene with mixed block types
    const centerPositions = [
      [0, 1, 0], [2, 1, 0], [-2, 1, 0], [0, 1, 2], [0, 1, -2]
    ]

    centerPositions.forEach((pos, index) => {
      const isNumber4 = index % 2 === 0
      let block

      if (isNumber4) {
        block = BlockFactory.createNumber4Block(
          new THREE.Vector3(pos[0], pos[1], pos[2]),
          'demo_user',
          0.8
        )
        block.id = `interactive_number4_${index}`
      } else {
        block = BlockFactory.createFrostedGlassBlock(
          new THREE.Vector3(pos[0], pos[1], pos[2]),
          'demo_user',
          0.4,
          index === 1 ? '#4fc3f7' : '#e1f5fe'
        )
        block.id = `interactive_glass_${index}`
      }

      newBlocks.push(block)
    })
  }

  const createShowcaseScene = (newBlocks: any[]) => {
    // Create a grand showcase with both block types

    // Central number 4 block
    const centerBlock = BlockFactory.createNumber4Block(
      new THREE.Vector3(0, 2, 0),
      'demo_user',
      1.0
    )
    centerBlock.id = 'showcase_center'
    newBlocks.push(centerBlock)

    // Surrounding frosted glass blocks in a spiral
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const radius = 3
      const height = 1 + Math.sin(angle * 2) * 0.5

      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius

      const block = BlockFactory.createFrostedGlassBlock(
        new THREE.Vector3(x, height, z),
        'demo_user',
        0.3 + (i * 0.05),
        `hsl(${180 + i * 15}, 70%, 80%)`
      )
      block.id = `showcase_glass_${i}`
      newBlocks.push(block)
    }

    // Additional number 4 blocks at corners
    const cornerPositions = [[-5, 1, -5], [5, 1, -5], [-5, 1, 5], [5, 1, 5]]
    cornerPositions.forEach((pos, index) => {
      const block = BlockFactory.createNumber4Block(
        new THREE.Vector3(pos[0], pos[1], pos[2]),
        'demo_user',
        0.6 + (index * 0.1)
      )
      block.id = `showcase_corner_${index}`
      newBlocks.push(block)
    })
  }

  const handleBlockClick = (block: any) => {
    setSelectedBlock(selectedBlock === block.id ? null : block.id)
    console.log('Block clicked:', block)
  }

  const handleBlockHover = (block: any) => {
    // Add hover effects here if needed
    console.log('Block hovered:', block)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0a0a0a' }}>
      {/* Control Panel */}
      {showUI && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 1000,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '20px',
          borderRadius: '12px',
          fontFamily: 'Inter, system-ui, sans-serif',
          minWidth: '280px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>
            🧊 Frosted Glass & Number 4 Demo
          </h3>

          {/* Demo Mode Selection */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
              Demo Mode:
            </label>
            {[
              { id: 'gallery', label: '🖼️ Gallery', desc: 'View different variations' },
              { id: 'interactive', label: '🎮 Interactive', desc: 'Click to interact' },
              { id: 'showcase', label: '✨ Showcase', desc: 'Grand display' }
            ].map(mode => (
              <button
                key={mode.id}
                onClick={() => setDemoMode(mode.id as any)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  margin: '4px 0',
                  backgroundColor: demoMode === mode.id ? '#667eea' : 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  textAlign: 'left'
                }}
                title={mode.desc}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Animation Speed */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
              Animation Speed: {animationSpeed.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#667eea'
              }}
            />
          </div>

          {/* Block Info */}
          <div style={{ fontSize: '11px', color: '#999' }}>
            <div>Total Blocks: {blocks.length}</div>
            <div>Selected: {selectedBlock || 'None'}</div>
            <div>Glass Blocks: {blocks.filter(b => b.type === BlockType.FROSTED_GLASS).length}</div>
            <div>Number 4 Blocks: {blocks.filter(b => b.type === BlockType.NUMBER_4).length}</div>
          </div>
        </div>
      )}

      {/* Floor System Control Panel */}
      {showUI && demoMode === 'showcase' && (
        <FloorControlPanel floorSystem={floorSystem.system} />
      )}

      {/* Main 3D Scene */}
      <Canvas camera={{ position: [8, 6, 8], fov: 60 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[5, 10, 5]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-5, 8, -5]} intensity={1.2} color="#4fc3f7" />
        <directionalLight
          position={[10, 10, 5]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        {/* Environment */}
        <Environment preset="city" />
        <Sky sunPosition={[100, 20, 100]} />

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshLambertMaterial color="#2c2c2c" />
        </mesh>

        {/* Render all blocks */}
        {blocks.map((block) => (
          <BlockRenderer
            key={block.id}
            block={block}
            onClick={handleBlockClick}
            onHover={handleBlockHover}
            selected={selectedBlock === block.id}
            animated={animationSpeed > 0}
            enableEffects={true}
            glowIntensity={animationSpeed}
            scale={1}
          />
        ))}

        {/* Animated objects for visual interest */}
        <FloatingElements animationSpeed={animationSpeed} />

        {/* Contact shadows */}
        <ContactShadows
          position={[0, -0.05, 0]}
          opacity={0.4}
          scale={20}
          blur={2}
          far={10}
        />

        <Stats />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={3}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>

      {/* Toggle UI button */}
      <button
        onClick={() => setShowUI(!showUI)}
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          zIndex: 1001,
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          cursor: 'pointer',
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {showUI ? '👁️' : '🎛️'}
      </button>
    </div>
  )
}

// Floating elements component for added visual interest
const FloatingElements: React.FC<{ animationSpeed: number }> = ({ animationSpeed }) => {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current && animationSpeed > 0) {
      groupRef.current.rotation.y += 0.005 * animationSpeed
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * animationSpeed) * 0.2
    }
  })

  return (
    <group ref={groupRef}>
      {/* Floating geometric shapes */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        const radius = 6
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              2 + Math.sin(angle * 3) * 0.5,
              Math.sin(angle) * radius
            ]}
          >
            <octahedronGeometry args={[0.3]} />
            <meshStandardMaterial
              color={`hsl(${180 + i * 45}, 60%, 70%)`}
              transparent
              opacity={0.6}
              emissive={`hsl(${180 + i * 45}, 60%, 30%)`}
              emissiveIntensity={0.2}
            />
          </mesh>
        )
      })}
    </group>
  )
}

export default FrostedGlassAndNumber4Demo
