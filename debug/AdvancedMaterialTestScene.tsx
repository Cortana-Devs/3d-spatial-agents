import React, { useState, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei'
import { FrostedGlassFloor } from '../components/floors/FrostedGlassFloor'
import { FloorFactory } from '../utils/floorFactory'
import { MATERIAL_PRESETS } from '../presets/MaterialPresets'
import { CausticLight, useCausticSystem } from '../effects/CausticSystem'
import * as THREE from 'three'

export const AdvancedMaterialTestScene: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState('showroom_glass')
  const [showCaustics, setShowCaustics] = useState(true)
  const [lightIntensity, setLightIntensity] = useState(1.0)
  
  const { generateCausticLights } = useCausticSystem()
  
  const testFloors = useMemo(() => {
    const presets = Object.keys(MATERIAL_PRESETS)
    return presets.map((presetName, index) => {
      const floor = FloorFactory.createFrostedGlassFloor(
        new THREE.Vector3(index * 2.5 - 3.75, 0, 0),
        'medium_frosted'
      )
      floor.materialPreset = presetName
      return floor
    })
  }, [])

  const lightSources = useMemo(() => [
    new THREE.Vector3(0, 5, 0),
    new THREE.Vector3(-3, 3, -3),
    new THREE.Vector3(3, 3, -3)
  ], [])

  const causticLights = useMemo(() => {
    if (!showCaustics) return []
    return generateCausticLights(testFloors, lightSources)
  }, [testFloors, lightSources, showCaustics, generateCausticLights])

  return (
    <>
      <div style={{ 
        position: 'absolute', 
        top: 10, 
        left: 10, 
        zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '300px'
      }}>
        <h3>Advanced Materials - Phase 2</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label>Material Preset:</label>
          <select 
            value={selectedPreset} 
            onChange={(e) => setSelectedPreset(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: '5px' }}
          >
            {Object.keys(MATERIAL_PRESETS).map(preset => (
              <option key={preset} value={preset}>
                {MATERIAL_PRESETS[preset].name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>
            <input 
              type="checkbox" 
              checked={showCaustics} 
              onChange={(e) => setShowCaustics(e.target.checked)}
            />
            Show Caustic Lights
          </label>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Light Intensity: {lightIntensity.toFixed(1)}</label>
          <input 
            type="range" 
            min="0" 
            max="2" 
            step="0.1" 
            value={lightIntensity}
            onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
            style={{ display: 'block', width: '100%' }}
          />
        </div>

        <div style={{ fontSize: '0.8em', opacity: 0.8 }}>
          <p><strong>Current:</strong> {MATERIAL_PRESETS[selectedPreset]?.description}</p>
          <p><strong>Features:</strong></p>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Procedural frosting textures</li>
            <li>Real-time light reflections</li>
            <li>Caustic light patterns</li>
            <li>Dynamic material properties</li>
          </ul>
        </div>
      </div>

      <Canvas camera={{ position: [8, 6, 8] }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 5, 0]} intensity={lightIntensity} />
        <pointLight position={[-3, 3, -3]} intensity={lightIntensity * 0.8} color="#ff6b6b" />
        <pointLight position={[3, 3, -3]} intensity={lightIntensity * 0.8} color="#4ecdc4" />
        
        <Environment preset="city" />

        {testFloors.map(floor => (
          <FrostedGlassFloor
            key={floor.id}
            floor={floor}
            materialPreset={selectedPreset}
            onInteract={(floor) => console.log('Floor clicked:', floor.materialPreset)}
          />
        ))}

        {causticLights}

        {/* Reference objects */}
        <mesh position={[0, -1, 0]}>
          <boxGeometry args={[12, 0.1, 8]} />
          <meshStandardMaterial color="#2c3e50" />
        </mesh>

        <mesh position={[0, 3, -2]}>
          <torusGeometry args={[1, 0.3, 16, 100]} />
          <meshStandardMaterial color="#e74c3c" metalness={0.8} roughness={0.2} />
        </mesh>

        <mesh position={[-2, 1.5, -1]}>
          <sphereGeometry args={[0.8]} />
          <meshStandardMaterial color="#3498db" />
        </mesh>

        <mesh position={[2, 1.2, -1]}>
          <coneGeometry args={[0.6, 1.5, 8]} />
          <meshStandardMaterial color="#2ecc71" />
        </mesh>

        <ContactShadows 
          position={[0, -0.99, 0]} 
          opacity={0.4} 
          scale={10} 
          blur={2} 
        />

        <OrbitControls />
      </Canvas>
    </>
  )
}
