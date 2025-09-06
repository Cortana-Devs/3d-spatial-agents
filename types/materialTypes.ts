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
