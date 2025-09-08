import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Block as BlockType, BLOCK_DEFINITIONS } from '../../types/blocks'
import { FrostedGlassFloor as FloorType } from '../../types/floorTypes'
import { MATERIAL_PRESETS } from '../../presets/MaterialPresets'
import { devWarn } from "@/utils/devLogger";


interface FrostedGlassBlockProps {
  block?: BlockType
  floor?: FloorType
  onClick?: (item: BlockType | FloorType) => void
  onHover?: (item: BlockType | FloorType) => void
  selected?: boolean
  materialPreset?: string
  enableEffects?: boolean
  scale?: number
}

export const FrostedGlassBlock: React.FC<FrostedGlassBlockProps> = ({
  block,
  floor,
  onClick,
  onHover,
  selected = false,
  materialPreset = 'showroom_glass',
  enableEffects = true,
  scale = 1
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const particlesRef = useRef<THREE.Points>(null)

  // Determine position and properties
  const position = block ?
    [block.position.x, block.position.y, block.position.z] as [number, number, number] :
    floor ? [floor.position.x, floor.position.y, floor.position.z] as [number, number, number] :
    [0, 0, 0] as [number, number, number]

  const isFloor = !block && floor
  const item = block || floor

  // Animation for floating effect
  useFrame((state) => {
    if (meshRef.current && enableEffects) {
      const time = state.clock.elapsedTime
      meshRef.current.rotation.y += 0.005

      if (!isFloor) {
        meshRef.current.position.y = position[1] + Math.sin(time * 2) * 0.05
      }
    }

    // Animate glow effect
    if (glowRef.current && enableEffects) {
      const glowIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.2
      ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = glowIntensity * 0.1
    }

    // Animate particles
    if (particlesRef.current && enableEffects) {
      particlesRef.current.rotation.y += 0.002
      particlesRef.current.rotation.x += 0.001
    }
  })

  // Create frosted glass material with advanced properties
  const material = useMemo(() => {
    const preset = MATERIAL_PRESETS[materialPreset]
    if (!preset) {
      devWarn(`Material preset '${materialPreset}' not found, using default`)
    }

    const props = preset?.properties || MATERIAL_PRESETS.showroom_glass.properties

    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(props.tint),
      transparent: true,
      opacity: 1 - props.transparency,
      roughness: props.roughness,
      metalness: props.metalness,
      transmission: props.transmission,
      ior: props.ior,
      thickness: props.thickness,
      emissive: new THREE.Color(props.tint).multiplyScalar(0.1),
      emissiveIntensity: 0.05,
      side: THREE.DoubleSide,
      envMapIntensity: 1.0,
      clearcoat: 0.1,
      clearcoatRoughness: 0.1,
    })
  }, [materialPreset])

  // Create geometry based on type
  const geometry = useMemo(() => {
    if (isFloor) {
      return new THREE.BoxGeometry(1, 0.1, 1)
    }
    return new THREE.BoxGeometry(0.95, 0.95, 0.95)
  }, [isFloor])

  // Create frosting texture effect
  const frostingTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const context = canvas.getContext('2d')!

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, 256, 256)

    // Create frosting pattern
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 256
      const y = Math.random() * 256
      const radius = Math.random() * 3 + 1
      const opacity = Math.random() * 0.5 + 0.1

      context.fillStyle = `rgba(200, 230, 255, ${opacity})`
      context.beginPath()
      context.arc(x, y, radius, 0, Math.PI * 2)
      context.fill()
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(2, 2)
    return texture
  }, [])

  // Apply frosting texture to material
  useEffect(() => {
    if (material && frostingTexture) {
      material.normalMap = frostingTexture
      material.normalScale = new THREE.Vector2(0.3, 0.3)
      material.needsUpdate = true
    }
  }, [material, frostingTexture])

  // Create caustic pattern for advanced effects
  const causticMaterial = useMemo(() => {
    if (!enableEffects) return null

    return new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        time: { value: 0 },
        intensity: { value: 0.5 },
        color: { value: new THREE.Color('#4fc3f7') }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float intensity;
        uniform vec3 color;
        varying vec2 vUv;

        float causticPattern(vec2 uv, float t) {
          vec2 p = uv * 8.0;
          float c1 = sin(p.x * 3.0 + t * 2.0) * sin(p.y * 2.0 + t * 1.5);
          float c2 = sin((p.x + p.y) * 2.0 + t * 2.5) * sin((p.x - p.y) * 1.5 + t * 2.0);
          return (c1 + c2) * 0.5;
        }

        void main() {
          float pattern = causticPattern(vUv, time);
          pattern = pow(max(0.0, pattern), 2.0);

          vec3 finalColor = color * pattern * intensity;
          gl_FragColor = vec4(finalColor, pattern * 0.3);
        }
      `
    })
  }, [enableEffects])

  // Update caustic shader time
  useFrame((state) => {
    if (causticMaterial && causticMaterial.uniforms.time) {
      causticMaterial.uniforms.time.value = state.clock.elapsedTime
    }
  })

  // Create particle system for frosting effect
  const particles = useMemo(() => {
    if (!enableEffects) return null

    const particleCount = 200
    const positions = new Float32Array(particleCount * 3)
    const scales = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * (isFloor ? 2 : 1.8)
      positions[i * 3 + 1] = (Math.random() - 0.5) * (isFloor ? 0.2 : 1.8)
      positions[i * 3 + 2] = (Math.random() - 0.5) * (isFloor ? 2 : 1.8)
      scales[i] = Math.random() * 0.5 + 0.1
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1))

    const material = new THREE.PointsMaterial({
      color: '#e3f2fd',
      size: 0.02,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    })

    return { geometry, material }
  }, [enableEffects, isFloor])

  // Selection outline
  const outlineMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#00bcd4',
      transparent: true,
      opacity: 0.4,
      side: THREE.BackSide
    })
  }, [])

  // Glow effect material
  const glowMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#4fc3f7',
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    })
  }, [])

  return (
    <group
      position={position}
      scale={scale}
    >
      {/* Main frosted glass block/floor */}
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        onClick={() => onClick?.(item!)}
        onPointerOver={() => onHover?.(item!)}
        userData={{
          itemId: item?.id,
          itemType: block ? 'block' : 'floor',
          blockType: block?.type,
          floorType: floor?.type
        }}
        castShadow
        receiveShadow
      />

      {/* Glow effect */}
      {enableEffects && (
        <mesh
          ref={glowRef}
          geometry={geometry}
          material={glowMaterial}
          scale={1.1}
        />
      )}

      {/* Selection outline */}
      {selected && (
        <mesh
          geometry={geometry}
          material={outlineMaterial}
          scale={1.15}
        />
      )}

      {/* Caustic light pattern overlay */}
      {enableEffects && causticMaterial && (
        <mesh
          geometry={new THREE.PlaneGeometry(isFloor ? 1 : 0.95, isFloor ? 1 : 0.95)}
          material={causticMaterial}
          position={[0, isFloor ? 0.051 : 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      )}

      {/* Particle frosting effect */}
      {enableEffects && particles && (
        <points
          ref={particlesRef}
          geometry={particles.geometry}
          material={particles.material}
        />
      )}

      {/* Light source for illumination */}
      {enableEffects && (
        <pointLight
          intensity={0.2}
          color="#4fc3f7"
          distance={3}
          position={[0, isFloor ? 1 : 0.5, 0]}
        />
      )}
    </group>
  )
}

export default FrostedGlassBlock
