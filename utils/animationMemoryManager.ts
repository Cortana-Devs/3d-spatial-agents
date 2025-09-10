import { devLog } from "@/utils/devLogger";

/**
 * Animation Memory Management System
 * Handles caching, cleanup, and memory optimization for animation assets
 */

import { AnimationClip, Object3D, Material, Mesh, Texture } from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

/**
 * Asset metadata for tracking usage and cleanup
 */
export interface AssetMetadata {
  path: string
  size: number
  loadTime: number
  lastAccessed: number
  referenceCount: number
  isValid: boolean
  errors: string[]
  priority: 'high' | 'medium' | 'low'
}

/**
 * Memory usage statistics
 */
export interface MemoryStats {
  totalAssets: number
  totalSize: number
  avatarCount: number
  clipCount: number
  cacheHitRate: number
  memoryPressure: number
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  maxCacheSize: number // bytes
  maxAge: number // milliseconds
  maxAssets: number
  cleanupInterval: number // milliseconds
  memoryPressureThreshold: number // 0-1
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxCacheSize: 200 * 1024 * 1024, // 200MB
  maxAge: 10 * 60 * 1000, // 10 minutes
  maxAssets: 100,
  cleanupInterval: 60 * 1000, // 1 minute
  memoryPressureThreshold: 0.8 // 80%
}

/**
 * Animation asset cache with memory management
 */
export class AnimationMemoryManager {
  private avatarCache = new Map<string, GLTF>()
  private clipCache = new Map<string, AnimationClip>()
  private metadata = new Map<string, AssetMetadata>()
  private loadingPromises = new Map<string, Promise<any>>()
  private config: CacheConfig
  private cleanupTimer: NodeJS.Timeout | null = null
  private cacheHits = 0
  private cacheMisses = 0
  private enableLogging: boolean

  constructor(
    config: Partial<CacheConfig> = {},
    options: { enableLogging?: boolean } = {}
  ) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config }
    this.enableLogging = options.enableLogging || false

    // Start cleanup timer
    this.startCleanupTimer()

    if (this.enableLogging) {
      devLog('🗄️ AnimationMemoryManager initialized')
      devLog('📊 Cache config:', this.config)
    }
  }

  /**
   * Cache an avatar GLTF
   */
  cacheAvatar(path: string, gltf: GLTF): void {
    const size = this.estimateGLTFSize(gltf)
    const metadata: AssetMetadata = {
      path,
      size,
      loadTime: Date.now(),
      lastAccessed: Date.now(),
      referenceCount: 1,
      isValid: true,
      errors: [],
      priority: 'high'
    }

    this.avatarCache.set(path, gltf)
    this.metadata.set(path, metadata)

    if (this.enableLogging) {
      devLog(`💾 Cached avatar: ${path} (${(size / 1024 / 1024).toFixed(2)}MB)`)
    }

    this.enforceMemoryLimits()
  }

  /**
   * Cache an animation clip
   */
  cacheClip(name: string, clip: AnimationClip): void {
    const size = this.estimateClipSize(clip)
    const metadata: AssetMetadata = {
      path: name,
      size,
      loadTime: Date.now(),
      lastAccessed: Date.now(),
      referenceCount: 1,
      isValid: true,
      errors: [],
      priority: 'medium'
    }

    this.clipCache.set(name, clip)
    this.metadata.set(name, metadata)

    if (this.enableLogging) {
      devLog(`💾 Cached clip: ${name} (${(size / 1024).toFixed(2)}KB)`)
    }

    this.enforceMemoryLimits()
  }

  /**
   * Get cached avatar
   */
  getCachedAvatar(path: string): GLTF | null {
    const avatar = this.avatarCache.get(path)
    if (avatar) {
      this.updateAccessTime(path)
      this.cacheHits++
      return avatar
    }
    
    this.cacheMisses++
    return null
  }

  /**
   * Get cached animation clip
   */
  getCachedClip(name: string): AnimationClip | null {
    const clip = this.clipCache.get(name)
    if (clip) {
      this.updateAccessTime(name)
      this.cacheHits++
      return clip
    }
    
    this.cacheMisses++
    return null
  }

  /**
   * Add reference to an asset
   */
  addReference(key: string): void {
    const metadata = this.metadata.get(key)
    if (metadata) {
      metadata.referenceCount++
      metadata.lastAccessed = Date.now()
    }
  }

  /**
   * Remove reference from an asset
   */
  removeReference(key: string): void {
    const metadata = this.metadata.get(key)
    if (metadata) {
      metadata.referenceCount = Math.max(0, metadata.referenceCount - 1)
    }
  }

  /**
   * Update last accessed time
   */
  private updateAccessTime(key: string): void {
    const metadata = this.metadata.get(key)
    if (metadata) {
      metadata.lastAccessed = Date.now()
    }
  }

  /**
   * Estimate GLTF memory size
   */
  private estimateGLTFSize(gltf: GLTF): number {
    let size = 0

    // Estimate scene size
    gltf.scene.traverse((child) => {
      if (child instanceof Mesh) {
        // Geometry size
        const geometry = child.geometry
        if (geometry.attributes.position) {
          size += geometry.attributes.position.array.byteLength
        }
        if (geometry.attributes.normal) {
          size += geometry.attributes.normal.array.byteLength
        }
        if (geometry.attributes.uv) {
          size += geometry.attributes.uv.array.byteLength
        }
        if (geometry.index) {
          size += geometry.index.array.byteLength
        }

        // Material size (rough estimate)
        if (child.material) {
          size += this.estimateMaterialSize(child.material)
        }
      }
    })

    // Animation size
    if (gltf.animations) {
      gltf.animations.forEach(clip => {
        size += this.estimateClipSize(clip)
      })
    }

    return size
  }

  /**
   * Estimate animation clip memory size
   */
  private estimateClipSize(clip: AnimationClip): number {
    let size = 0

    clip.tracks.forEach(track => {
      // Times array
      size += track.times.byteLength
      // Values array
      size += track.values.byteLength
    })

    return size
  }

  /**
   * Estimate material memory size
   */
  private estimateMaterialSize(material: Material | Material[]): number {
    let size = 1024 // Base material size estimate

    const materials = Array.isArray(material) ? material : [material]
    
    materials.forEach(mat => {
      // Estimate texture sizes
      Object.values(mat).forEach(value => {
        if (value instanceof Texture) {
          // Rough texture size estimate (assuming 1024x1024 RGBA)
          size += 1024 * 1024 * 4
        }
      })
    })

    return size
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): MemoryStats {
    const totalSize = Array.from(this.metadata.values())
      .reduce((sum, meta) => sum + meta.size, 0)

    const cacheHitRate = this.cacheHits + this.cacheMisses > 0 
      ? this.cacheHits / (this.cacheHits + this.cacheMisses)
      : 0

    const memoryPressure = totalSize / this.config.maxCacheSize

    return {
      totalAssets: this.metadata.size,
      totalSize,
      avatarCount: this.avatarCache.size,
      clipCount: this.clipCache.size,
      cacheHitRate,
      memoryPressure
    }
  }

  /**
   * Check if memory pressure is high
   */
  isMemoryPressureHigh(): boolean {
    const stats = this.getMemoryStats()
    return stats.memoryPressure > this.config.memoryPressureThreshold
  }

  /**
   * Enforce memory limits by cleaning up old/unused assets
   */
  private enforceMemoryLimits(): void {
    const stats = this.getMemoryStats()
    
    if (stats.totalSize > this.config.maxCacheSize || 
        stats.totalAssets > this.config.maxAssets ||
        this.isMemoryPressureHigh()) {
      
      this.performCleanup(true) // Force cleanup
      
      if (this.enableLogging) {
        devLog('🧹 Enforced memory limits - cleanup performed')
      }
    }
  }

  /**
   * Perform cache cleanup
   */
  performCleanup(force: boolean = false): void {
    const now = Date.now()
    const assetsToRemove: string[] = []

    // Find assets to remove based on age, usage, and priority
    for (const [key, metadata] of this.metadata.entries()) {
      const age = now - metadata.lastAccessed
      const shouldRemove = force || (
        (age > this.config.maxAge && metadata.referenceCount === 0) ||
        (!metadata.isValid) ||
        (metadata.errors.length > 0)
      )

      if (shouldRemove) {
        assetsToRemove.push(key)
      }
    }

    // Sort by priority and age (remove low priority and old assets first)
    assetsToRemove.sort((a, b) => {
      const metaA = this.metadata.get(a)!
      const metaB = this.metadata.get(b)!
      
      // Priority comparison (low priority removed first)
      const priorityOrder = { low: 0, medium: 1, high: 2 }
      const priorityDiff = priorityOrder[metaA.priority] - priorityOrder[metaB.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      // Age comparison (older removed first)
      return metaA.lastAccessed - metaB.lastAccessed
    })

    // Remove assets
    let removedSize = 0
    let removedCount = 0

    for (const key of assetsToRemove) {
      const metadata = this.metadata.get(key)
      if (metadata) {
        this.removeAsset(key)
        removedSize += metadata.size
        removedCount++
        
        // Stop if we've freed enough memory
        if (!force && removedSize > this.config.maxCacheSize * 0.2) {
          break
        }
      }
    }

    if (this.enableLogging && removedCount > 0) {
      devLog(`🧹 Cleanup removed ${removedCount} assets (${(removedSize / 1024 / 1024).toFixed(2)}MB)`)
    }
  }

  /**
   * Remove a specific asset from cache
   */
  private removeAsset(key: string): void {
    // Dispose of Three.js resources
    const avatar = this.avatarCache.get(key)
    if (avatar) {
      this.disposeGLTF(avatar)
      this.avatarCache.delete(key)
    }

    const clip = this.clipCache.get(key)
    if (clip) {
      // Animation clips don't need special disposal
      this.clipCache.delete(key)
    }

    this.metadata.delete(key)
    this.loadingPromises.delete(key)
  }

  /**
   * Dispose of GLTF resources
   */
  private disposeGLTF(gltf: GLTF): void {
    gltf.scene.traverse((child) => {
      if (child instanceof Mesh) {
        // Dispose geometry
        if (child.geometry) {
          child.geometry.dispose()
        }

        // Dispose materials
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach(material => {
            // Dispose textures
            Object.values(material).forEach(value => {
              if (value instanceof Texture) {
                value.dispose()
              }
            })
            material.dispose()
          })
        }
      }
    })
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = setInterval(() => {
      this.performCleanup()
    }, this.config.cleanupInterval)
  }

  /**
   * Clear all cached assets
   */
  clearCache(): void {
    // Dispose of all GLTF resources
    for (const gltf of this.avatarCache.values()) {
      this.disposeGLTF(gltf)
    }

    this.avatarCache.clear()
    this.clipCache.clear()
    this.metadata.clear()
    this.loadingPromises.clear()
    this.cacheHits = 0
    this.cacheMisses = 0

    if (this.enableLogging) {
      devLog('🗑️ Cache cleared')
    }
  }

  /**
   * Get cache status report
   */
  getCacheReport(): {
    stats: MemoryStats
    config: CacheConfig
    oldestAsset: string | null
    newestAsset: string | null
    mostUsedAsset: string | null
  } {
    const stats = this.getMemoryStats()
    
    let oldestAsset: string | null = null
    let newestAsset: string | null = null
    let mostUsedAsset: string | null = null
    let oldestTime = Infinity
    let newestTime = 0
    let maxReferences = 0

    for (const [key, metadata] of this.metadata.entries()) {
      if (metadata.lastAccessed < oldestTime) {
        oldestTime = metadata.lastAccessed
        oldestAsset = key
      }
      if (metadata.loadTime > newestTime) {
        newestTime = metadata.loadTime
        newestAsset = key
      }
      if (metadata.referenceCount > maxReferences) {
        maxReferences = metadata.referenceCount
        mostUsedAsset = key
      }
    }

    return {
      stats,
      config: this.config,
      oldestAsset,
      newestAsset,
      mostUsedAsset
    }
  }

  /**
   * Dispose of the memory manager
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }

    this.clearCache()

    if (this.enableLogging) {
      devLog('🗑️ AnimationMemoryManager disposed')
    }
  }
}

/**
 * Global memory manager instance
 */
let globalMemoryManager: AnimationMemoryManager | null = null

/**
 * Get or create global memory manager
 */
export function getGlobalMemoryManager(
  config?: Partial<CacheConfig>,
  options?: { enableLogging?: boolean }
): AnimationMemoryManager {
  if (!globalMemoryManager) {
    globalMemoryManager = new AnimationMemoryManager(config, options)
  }
  return globalMemoryManager
}

/**
 * Dispose global memory manager
 */
export function disposeGlobalMemoryManager(): void {
  if (globalMemoryManager) {
    globalMemoryManager.dispose()
    globalMemoryManager = null
  }
}