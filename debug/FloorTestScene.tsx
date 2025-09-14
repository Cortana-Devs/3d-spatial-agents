import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { FrostedGlassFloor } from '@components/floors/FrostedGlassFloor'
import { FloorFactory } from '../utils/floorFactory'
import { GlassType } from '../types/floorTypes'
import * as THREE from 'three'

export const FloorTestScene: React.FC = () => {
  const [selectedGlassType, setSelectedGlassType] = useState<GlassType>('medium_frosted')
  
  const testFloors = [
    FloorFactory.createFrostedGlassFloor(new THREE.Vector3(-2, 0, 0), 'clear_frosted'),
    FloorFactory.createFrostedGlassFloor(new THREE.Vector3(0, 0, 0), 'light_frosted'),
    FloorFactory.createFrostedGlassFloor(new THREE.Vector3(2, 0, 0), 'medium_frosted'),
    FloorFactory.createFrostedGlassFloor(new THREE.Vector3(4, 0, 0), 'heavy_frosted'),
  ]

  return (
    <>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 100 }}>
        <h3>Floor Test Scene - Phase 1</h3>
        <div>
          {(['clear_frosted', 'light_frosted', 'medium_frosted', 'heavy_frosted'] as GlassType[]).map(type => (
            <button
              key={type}
              onClick={() => setSelectedGlassType(type)}
              style={{
                margin: '2px',
                backgroundColor: selectedGlassType === type ? '#4CAF50' : '#f0f0f0'
              }}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <Canvas camera={{ position: [5, 5, 5] }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} />
        <Environment preset="city" />

        {testFloors.map(floor => (
          <FrostedGlassFloor
            key={floor.id}
            floor={floor}
            onInteract={(floor) => console.log('Floor clicked:', floor.glassType)}
          />
        ))}

        {/* Reference objects for transparency comparison */}
        <mesh position={[0, -1, 0]}>
          <boxGeometry args={[10, 0.1, 10]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>

        <mesh position={[0, 2, 0]}>
          <sphereGeometry args={[0.5]} />
          <meshStandardMaterial color="#FF6B6B" />
        </mesh>

        <OrbitControls />
      </Canvas>
    </>
  )
}
