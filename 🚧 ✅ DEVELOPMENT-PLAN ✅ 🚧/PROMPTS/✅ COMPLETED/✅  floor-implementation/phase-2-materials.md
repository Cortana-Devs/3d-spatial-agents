# Phase 2: Advanced Material System and Visual Effects

## OBJECTIVE
Build upon the foundation from Phase 1 to create a sophisticated material system with advanced frosting effects, light reflection, caustics, and dynamic material properties. Focus on visual quality and realistic glass behavior while maintaining performance.

## DELIVERABLES
- Advanced frosted glass material system with procedural effects
- Light reflection and refraction system
- Dynamic material property adjustment
- Caustic light pattern generation
- Enhanced visual feedback and debugging tools

## IMPLEMENTATION TASKS

### Task 2.1: Advanced Glass Material System
**File**: `materials/FrostedGlassMaterial.tsx`

Create a sophisticated material system with procedural frosting effects:

```typescript
import * as THREE from 'three'
import { FLOOR_CONSTANTS } from '../config/floorConstants'
import { GlassProperties, FrostingEffect } from '../types/materialTypes'

export class FrostedGlassMaterial {
  private static textureCache = new Map<string, THREE.Texture>()
  private static normalCache = new Map<string, THREE.Texture>()

  static createAdvancedMaterial(properties: GlassProperties): THREE.MeshPhysicalMaterial {
    const material = new THREE.MeshPhysicalMaterial({
      transparent: true,
      opacity: properties.transparency,
      roughness: properties.roughness,
      metalness: 0.02,
      transmission: properties.transmission,
      ior: properties.ior,
      thickness: properties.thickness,
      color: properties.tint,
      side: THREE.DoubleSide,
      
      // Advanced properties
      clearcoat: 0.3,
      clearcoatRoughness: 0.1,
      sheen: 0.2,
      sheenRoughness: 0.8,
      sheenColor: new THREE.Color(0.9, 0.9, 1.0),
      
      // Enable advanced features
      envMapIntensity: 1.0,
      reflectivity: properties.reflectivity || 0.9
    })

    // Apply frosting effect
    if (properties.frostingIntensity > 0) {
      this.applyFrostingEffect(material, properties.frostingIntensity)
    }

    return material
  }

  static applyFrostingEffect(
    material: THREE.MeshPhysicalMaterial, 
    intensity: number,
    seed: number = Math.random()
  ): void {
    const frostTexture = this.generateFrostTexture(intensity, seed)
    const frostNormal = this.generateFrostNormalMap(intensity, seed)
    
    material.map = frostTexture
    material.normalMap = frostNormal
    material.normalScale = new THREE.Vector2(intensity * 2, intensity * 2)
    
    // Adjust roughness based on frosting
    material.roughness = Math.min(0.9, material.roughness + intensity * 0.3)
  }

  private static generateFrostTexture(intensity: number, seed: number): THREE.Texture {
    const cacheKey = `frost_${intensity}_${Math.floor(seed * 1000)}`
    
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!
    }

    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    
    // Create noise-based frosting pattern
    const imageData = ctx.createImageData(size, size)
    const noise = this.generatePerlinNoise(size, size, seed)
    
    for (let i = 0; i < imageData.data.length; i += 4) {
      const pixelIndex = i / 4
      const x = pixelIndex % size
      const y = Math.floor(pixelIndex / size)
      
      const noiseValue = noise[y * size + x]
      const frostValue = Math.pow(noiseValue, 1 + intensity) * 255
      
      imageData.data[i] = frostValue     // R
      imageData.data[i + 1] = frostValue // G
      imageData.data[i + 2] = frostValue // B
      imageData.data[i + 3] = Math.min(255, frostValue + 128) // A
    }
    
    ctx.putImageData(imageData, 0, 0)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)
    
    this.textureCache.set(cacheKey, texture)
    return texture
  }

  private static generateFrostNormalMap(intensity: number, seed: number): THREE.Texture {
    const cacheKey = `frost_normal_${intensity}_${Math.floor(seed * 1000)}`
    
    if (this.normalCache.has(cacheKey)) {
      return this.normalCache.get(cacheKey)!
    }

    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    
    const imageData = ctx.createImageData(size, size)
    const heightMap = this.generatePerlinNoise(size, size, seed)
    
    // Generate normal map from height data
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4
        
        // Sample neighboring heights
        const hL = heightMap[y * size + Math.max(0, x - 1)]
        const hR = heightMap[y * size + Math.min(size - 1, x + 1)]
        const hD = heightMap[Math.max(0, y - 1) * size + x]
        const hU = heightMap[Math.min(size - 1, y + 1) * size + x]
        
        // Calculate normal
        const nx = (hL - hR) * intensity * 0.5
        const ny = (hD - hU) * intensity * 0.5
        const nz = 1.0
        
        // Normalize and convert to 0-255 range
        const length = Math.sqrt(nx * nx + ny * ny + nz * nz)
        imageData.data[i] = ((nx / length) * 0.5 + 0.5) * 255     // R
        imageData.data[i + 1] = ((ny / length) * 0.5 + 0.5) * 255 // G  
        imageData.data[i + 2] = ((nz / length) * 0.5 + 0.5) * 255 // B
        imageData.data[i + 3] = 255 // A
      }
    }
    
    ctx.putImageData(imageData, 0, 0)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(4, 4)
    
    this.normalCache.set(cacheKey, texture)
    return texture
  }

  private static generatePerlinNoise(width: number, height: number, seed: number): Float32Array {
    // Simplified Perlin noise implementation
    const noise = new Float32Array(width * height)
    const random = this.seededRandom(seed)
    
    for (let octave = 0; octave < 4; octave++) {
      const frequency = Math.pow(2, octave) / 32
      const amplitude = Math.pow(0.5, octave)
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const sampleX = x * frequency
          const sampleY = y * frequency
          
          const noiseValue = this.interpolatedNoise(sampleX, sampleY, random) * amplitude
          noise[y * width + x] += noiseValue
        }
      }
    }
    
    // Normalize to 0-1 range
    let min = Infinity, max = -Infinity
    for (let i = 0; i < noise.length; i++) {
      min = Math.min(min, noise[i])
      max = Math.max(max, noise[i])
    }
    
    const range = max - min
    for (let i = 0; i < noise.length; i++) {
      noise[i] = (noise[i] - min) / range
    }
    
    return noise
  }

  private static seededRandom(seed: number) {
    return function() {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
  }

  private static interpolatedNoise(x: number, y: number, random: () => number): number {
    const intX = Math.floor(x)
    const intY = Math.floor(y)
    const fracX = x - intX
    const fracY = y - intY
    
    const a = this.smoothNoise(intX, intY, random)
    const b = this.smoothNoise(intX + 1, intY, random)
    const c = this.smoothNoise(intX, intY + 1, random)
    const d = this.smoothNoise(intX + 1, intY + 1, random)
    
    const i1 = this.interpolate(a, b, fracX)
    const i2 = this.interpolate(c, d, fracX)
    
    return this.interpolate(i1, i2, fracY)
  }

  private static smoothNoise(x: number, y: number, random: () => number): number {
    const corners = (this.noise(x - 1, y - 1, random) + this.noise(x + 1, y - 1, random) +
                    this.noise(x - 1, y + 1, random) + this.noise(x + 1, y + 1, random)) / 16
    const sides = (this.noise(x - 1, y, random) + this.noise(x + 1, y, random) +
                  this.noise(x, y - 1, random) + this.noise(x, y + 1, random)) / 8
    const center = this.noise(x, y, random) / 4
    
    return corners + sides + center
  }

  private static noise(x: number, y: number, random: () => number): number {
    let n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
    return (n - Math.floor(n)) * 2 - 1
  }

  private static interpolate(a: number, b: number, x: number): number {
    const ft = x * Math.PI
    const f = (1 - Math.cos(ft)) * 0.5
    return a * (1 - f) + b * f
  }

  static updateMaterialProperties(
    material: THREE.MeshPhysicalMaterial,
    properties: Partial<GlassProperties>
  ): void {
    if (properties.transparency !== undefined) {
      material.opacity = properties.transparency
    }
    if (properties.roughness !== undefined) {
      material.roughness = properties.roughness
    }
    if (properties.transmission !== undefined) {
      material.transmission = properties.transmission
    }
    if (properties.tint !== undefined) {
      material.color = properties.tint
    }
    
    material.needsUpdate = true
  }
}
```

### Task 2.2: Enhanced Type Definitions
**File**: `types/materialTypes.ts`

```typescript
import * as THREE from 'three'

export interface GlassProperties {
  transparency: number
  roughness: number
  metalness: number
  ior: number
  transmission: number
  thickness: number
  tint: THREE.Color
  reflectivity: number
  frostingIntensity: number
  causticStrength: number
}

export interface FrostingEffect {
  intensity: number
  scale: number
  seed: number
  pattern: 'perlin' | 'simplex' | 'cellular'
  normalStrength: number
}

export interface LightReflectionSystem {
  environmentMapping: boolean
  realtimeReflections: boolean
  reflectionResolution: 256 | 512 | 1024
  updateFrequency: number
  maxReflectionDistance: number
}

export interface CausticProperties {
  enabled: boolean
  intensity: number
  scale: number
  speed: number
  color: THREE.Color
  pattern: THREE.Texture | null
}

export interface MaterialPreset {
  name: string
  description: string
  properties: GlassProperties
  frosting: FrostingEffect
  caustics: CausticProperties
}
```

### Task 2.3: Light Reflection System
**File**: `systems/LightReflectionSystem.tsx`

```typescript
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useMemo, useCallback } from 'react'

export class LightReflectionManager {
  private reflectionProbes: Map<string, THREE.CubeCamera> = new Map()
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private maxProbes: number = 8

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
    this.renderer = renderer
    this.scene = scene
  }

  createReflectionProbe(
    position: THREE.Vector3,
    resolution: number = 256
  ): THREE.CubeCamera {
    const renderTarget = new THREE.WebGLCubeRenderTarget(resolution)
    renderTarget.texture.type = THREE.HalfFloatType
    
    const cubeCamera = new THREE.CubeCamera(0.1, 100, renderTarget)
    cubeCamera.position.copy(position)
    
    return cubeCamera
  }

  updateReflectionProbe(
    cubeCamera: THREE.CubeCamera,
    excludeObjects: THREE.Object3D[] = []
  ): void {
    // Temporarily hide excluded objects
    const originalVisible = excludeObjects.map(obj => obj.visible)
    excludeObjects.forEach(obj => obj.visible = false)
    
    // Update the cube camera
    cubeCamera.update(this.renderer, this.scene)
    
    // Restore visibility
    excludeObjects.forEach((obj, i) => obj.visible = originalVisible[i])
  }

  getEnvironmentMap(floorPosition: THREE.Vector3): THREE.Texture | null {
    // Find or create the nearest reflection probe
    const probeKey = `${Math.floor(floorPosition.x / 5)}_${Math.floor(floorPosition.z / 5)}`
    
    if (!this.reflectionProbes.has(probeKey)) {
      if (this.reflectionProbes.size >= this.maxProbes) {
        return null // Max probes reached
      }
      
      const probe = this.createReflectionProbe(floorPosition)
      this.reflectionProbes.set(probeKey, probe)
      this.scene.add(probe)
    }
    
    const probe = this.reflectionProbes.get(probeKey)!
    return probe.renderTarget.texture
  }

  cleanup(): void {
    this.reflectionProbes.forEach(probe => {
      probe.renderTarget.dispose()
      this.scene.remove(probe)
    })
    this.reflectionProbes.clear()
  }
}

export const useReflectionSystem = () => {
  const { gl, scene } = useThree()
  const reflectionManager = useMemo(() => 
    new LightReflectionManager(gl, scene), [gl, scene]
  )

  const updateReflections = useCallback((floors: THREE.Mesh[]) => {
    floors.forEach(floor => {
      const envMap = reflectionManager.getEnvironmentMap(floor.position)
      if (envMap && floor.material instanceof THREE.MeshPhysicalMaterial) {
        floor.material.envMap = envMap
        floor.material.needsUpdate = true
      }
    })
  }, [reflectionManager])

  return { reflectionManager, updateReflections }
}
```

### Task 2.4: Caustic Light System
**File**: `effects/CausticSystem.tsx`

```typescript
import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const causticVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  
  void main() {
    vUv = uv;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const causticFragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;
  uniform float uScale;
  uniform vec3 uLightPosition;
  
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  
  float causticPattern(vec2 uv, float time) {
    vec2 p = uv * uScale;
    
    float c1 = sin(p.x * 4.0 + time * 2.0) * sin(p.y * 3.0 + time * 1.5);
    float c2 = sin((p.x + p.y) * 3.0 + time * 3.0) * sin((p.x - p.y) * 2.0 + time * 2.5);
    float c3 = sin(length(p - 0.5) * 8.0 + time * 4.0);
    
    return (c1 + c2 + c3) * 0.33;
  }
  
  void main() {
    float caustic = causticPattern(vUv, uTime);
    caustic = pow(max(0.0, caustic), 2.0);
    
    // Fade based on distance from light
    float lightDistance = length(vWorldPosition - uLightPosition);
    float attenuation = 1.0 / (1.0 + lightDistance * 0.1);
    
    vec3 color = uColor * caustic * uIntensity * attenuation;
    gl_FragColor = vec4(color, caustic * 0.5);
  }
`

interface CausticLightProps {
  position: THREE.Vector3
  intensity: number
  color: THREE.Color
  scale: number
  lightPosition: THREE.Vector3
}

export const CausticLight: React.FC<CausticLightProps> = ({
  position,
  intensity,
  color,
  scale,
  lightPosition
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: causticVertexShader,
      fragmentShader: causticFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: intensity },
        uColor: { value: color },
        uScale: { value: scale },
        uLightPosition: { value: lightPosition }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
  }, [intensity, color, scale, lightPosition])

  useFrame((state) => {
    if (material) {
      material.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  return (
    <mesh ref={meshRef} position={position} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}

export const useCausticSystem = () => {
  const generateCausticLights = useCallback((floors: any[], lightSources: THREE.Vector3[]) => {
    const causticLights: JSX.Element[] = []
    
    floors.forEach((floor, floorIndex) => {
      lightSources.forEach((lightPos, lightIndex) => {
        // Calculate caustic position (below the floor)
        const causticPos = floor.position.clone()
        causticPos.y -= 0.2
        
        causticLights.push(
          <CausticLight
            key={`caustic-${floorIndex}-${lightIndex}`}
            position={causticPos}
            intensity={0.5}
            color={new THREE.Color(0.8, 0.9, 1.0)}
            scale={4.0}
            lightPosition={lightPos}
          />
        )
      })
    })
    
    return causticLights
  }, [])

  return { generateCausticLights }
}
```

### Task 2.5: Material Preset System
**File**: `presets/MaterialPresets.ts`

```typescript
import * as THREE from 'three'
import { MaterialPreset } from '../types/materialTypes'

export const MATERIAL_PRESETS: Record<string, MaterialPreset> = {
  showroom_glass: {
    name: 'Showroom Glass',
    description: 'High-end clear glass with perfect reflections',
    properties: {
      transparency: 0.9,
      roughness: 0.1,
      metalness: 0.0,
      ior: 1.52,
      transmission: 0.95,
      thickness: 0.15,
      tint: new THREE.Color(0xffffff),
      reflectivity: 1.0,
      frostingIntensity: 0.0,
      causticStrength: 0.8
    },
    frosting: {
      intensity: 0.0,
      scale: 1.0,
      seed: 0,
      pattern: 'perlin',
      normalStrength: 0.0
    },
    caustics: {
      enabled: true,
      intensity: 0.8,
      scale: 4.0,
      speed: 1.0,
      color: new THREE.Color(0.9, 0.95, 1.0),
      pattern: null
    }
  },

  bathroom_frosted: {
    name: 'Bathroom Frosted',
    description: 'Privacy glass with medium frosting',
    properties: {
      transparency: 0.3,
      roughness: 0.7,
      metalness: 0.0,
      ior: 1.52,
      transmission: 0.8,
      thickness: 0.12,
      tint: new THREE.Color(0xf8f8ff),
      reflectivity: 0.6,
      frostingIntensity: 0.8,
      causticStrength: 0.3
    },
    frosting: {
      intensity: 0.8,
      scale: 2.0,
      seed: 12345,
      pattern: 'perlin',
      normalStrength: 1.5
    },
    caustics: {
      enabled: true,
      intensity: 0.3,
      scale: 6.0,
      speed: 0.5,
      color: new THREE.Color(0.95, 0.95, 1.0),
      pattern: null
    }
  },

  colored_tinted: {
    name: 'Ocean Tinted',
    description: 'Beautiful blue-green tinted glass',
    properties: {
      transparency: 0.7,
      roughness: 0.3,
      metalness: 0.0,
      ior: 1.52,
      transmission: 0.85,
      thickness: 0.1,
      tint: new THREE.Color(0.7, 0.9, 1.0),
      reflectivity: 0.8,
      frostingIntensity: 0.2,
      causticStrength: 0.6
    },
    frosting: {
      intensity: 0.2,
      scale: 3.0,
      seed: 54321,
      pattern: 'perlin',
      normalStrength: 0.5
    },
    caustics: {
      enabled: true,
      intensity: 0.6,
      scale: 5.0,
      speed: 1.2,
      color: new THREE.Color(0.6, 0.8, 1.0),
      pattern: null
    }
  },

  smart_reactive: {
    name: 'Smart Reactive',
    description: 'Interactive glass that responds to proximity',
    properties: {
      transparency: 0.5,
      roughness: 0.4,
      metalness: 0.0,
      ior: 1.52,
      transmission: 0.9,
      thickness: 0.08,
      tint: new THREE.Color(1.0, 1.0, 1.0),
      reflectivity: 0.9,
      frostingIntensity: 0.4,
      causticStrength: 0.7
    },
    frosting: {
      intensity: 0.4,
      scale: 1.5,
      seed: 98765,
      pattern: 'cellular',
      normalStrength: 1.0
    },
    caustics: {
      enabled: true,
      intensity: 0.7,
      scale: 3.0,
      speed: 2.0,
      color: new THREE.Color(1.0, 0.9, 0.8),
      pattern: null
    }
  }
}

export class MaterialPresetManager {
  static applyPreset(preset: MaterialPreset): any {
    return {
      ...preset.properties,
      frostingEffect: preset.frosting,
      causticProperties: preset.caustics
    }
  }

  static interpolatePresets(
    presetA: MaterialPreset,
    presetB: MaterialPreset,
    factor: number
  ): MaterialPreset {
    const interpolateColor = (colorA: THREE.Color, colorB: THREE.Color, t: number) => {
      return new THREE.Color().lerpColors(colorA, colorB, t)
    }

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    return {
      name: `${presetA.name} → ${presetB.name}`,
      description: `Interpolated between ${presetA.name} and ${presetB.name}`,
      properties: {
        transparency: lerp(presetA.properties.transparency, presetB.properties.transparency, factor),
        roughness: lerp(presetA.properties.roughness, presetB.properties.roughness, factor),
        metalness: lerp(presetA.properties.metalness, presetB.properties.metalness, factor),
        ior: lerp(presetA.properties.ior, presetB.properties.ior, factor),
        transmission: lerp(presetA.properties.transmission, presetB.properties.transmission, factor),
        thickness: lerp(presetA.properties.thickness, presetB.properties.thickness, factor),
        tint: interpolateColor(presetA.properties.tint, presetB.properties.tint, factor),
        reflectivity: lerp(presetA.properties.reflectivity, presetB.properties.reflectivity, factor),
        frostingIntensity: lerp(presetA.properties.frostingIntensity, presetB.properties.frostingIntensity, factor),
        causticStrength: lerp(presetA.properties.causticStrength, presetB.properties.causticStrength, factor)
      },
      frosting: {
        intensity: lerp(presetA.frosting.intensity, presetB.frosting.intensity, factor),
        scale: lerp(presetA.frosting.scale, presetB.frosting.scale, factor),
        seed: Math.round(lerp(presetA.frosting.seed, presetB.frosting.seed, factor)),
        pattern: factor < 0.5 ? presetA.frosting.pattern : presetB.frosting.pattern,
        normalStrength: lerp(presetA.frosting.normalStrength, presetB.frosting.normalStrength, factor)
      },
      caustics: {
        enabled: presetA.caustics.enabled || presetB.caustics.enabled,
        intensity: lerp(presetA.caustics.intensity, presetB.caustics.intensity, factor),
        scale: lerp(presetA.caustics.scale, presetB.caustics.scale, factor),
        speed: lerp(presetA.caustics.speed, presetB.caustics.speed, factor),
        color: interpolateColor(presetA.caustics.color, presetB.caustics.color, factor),
        pattern: factor < 0.5 ? presetA.caustics.pattern : presetB.caustics.pattern
      }
    }
  }
}
```

## TESTING REQUIREMENTS

### Task 2.6: Advanced Material Testing
**File**: `__tests__/AdvancedMaterials.test.ts`

```typescript
import { FrostedGlassMaterial } from '../materials/FrostedGlassMaterial'
import { MATERIAL_PRESETS, MaterialPresetManager } from '../presets/MaterialPresets'
import * as THREE from 'three'

describe('Advanced Material System', () => {
  test('creates advanced material with all properties', () => {
    const properties = {
      transparency: 0.5,
      roughness: 0.6,
      metalness: 0.02,
      ior: 1.52,
      transmission: 0.9,
      thickness: 0.1,
      tint: new THREE.Color(0xffffff),
      reflectivity: 0.8,
      frostingIntensity: 0.7,
      causticStrength: 0.5
    }

    const material = FrostedGlassMaterial.createAdvancedMaterial(properties)
    
    expect(material).toBeInstanceOf(THREE.MeshPhysicalMaterial)
    expect(material.transparent).toBe(true)
    expect(material.transmission).toBe(0.9)
    expect(material.ior).toBe(1.52)
  })

  test('applies frosting effect correctly', () => {
    const material = new THREE.MeshPhysicalMaterial()
    FrostedGlassMaterial.applyFrostingEffect(material, 0.8)
    
    expect(material.map).not.toBeNull()
    expect(material.normalMap).not.toBeNull()
    expect(material.normalScale.x).toBeCloseTo(1.6)
  })

  test('material presets apply correctly', () => {
    const preset = MATERIAL_PRESETS.showroom_glass
    const appliedProperties = MaterialPresetManager.applyPreset(preset)
    
    expect(appliedProperties.transparency).toBe(0.9)
    expect(appliedProperties.roughness).toBe(0.1)
    expect(appliedProperties.reflectivity).toBe(1.0)
  })

  test('preset interpolation works', () => {
    const presetA = MATERIAL_PRESETS.showroom_glass
    const presetB = MATERIAL_PRESETS.bathroom_frosted
    const interpolated = MaterialPresetManager.interpolatePresets(presetA, presetB, 0.5)
    
    expect(interpolated.properties.transparency).toBeCloseTo(0.6) // (0.9 + 0.3) / 2
    expect(interpolated.properties.roughness).toBeCloseTo(0.4) // (0.1 + 0.7) / 2
  })
})
```

## VISUAL VALIDATION

### Task 2.7: Enhanced Test Scene
**File**: `debug/AdvancedMaterialTestScene.tsx`

```typescript
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
```

## SUCCESS CRITERIA

### Visual Validation Checklist:
- [ ] Material presets show distinct visual differences
- [ ] Frosting effects are realistic and varied
- [ ] Light reflections appear correct and update dynamically
- [ ] Caustic light patterns are visible and animated
- [ ] Color tinting works properly for all presets
- [ ] Transparency and roughness values produce expected results
- [ ] Environment reflections are visible on glass surfaces
- [ ] Performance remains stable with all effects enabled

### Technical Validation:
- [ ] Procedural texture generation works without errors
- [ ] Material property updates happen smoothly
- [ ] Reflection system integrates properly
- [ ] Caustic shader renders correctly
- [ ] Material presets apply correctly
- [ ] Preset interpolation produces smooth transitions
- [ ] Memory usage is reasonable with texture caching

### Performance Targets:
- [ ] Scene maintains 60 FPS with 4 advanced glass floors
- [ ] Texture generation completes within 100ms
- [ ] Reflection updates don't cause frame drops
- [ ] Caustic animations are smooth
- [ ] Material property changes are immediate

## NEXT PHASE PREPARATION

For Phase 3 (Performance Optimization):
1. Document performance observations from advanced materials
2. Identify potential bottlenecks in reflection system
3. Note texture memory usage patterns
4. Prepare metrics for LOD system development

## ESTIMATED TIME: 4-5 days

This phase significantly enhances the visual quality and realism of the floor system while maintaining good performance through careful optimization and caching strategies.