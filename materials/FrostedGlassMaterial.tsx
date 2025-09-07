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
