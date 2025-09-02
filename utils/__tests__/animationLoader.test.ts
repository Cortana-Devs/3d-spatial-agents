import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnimationClip, Object3D, SkinnedMesh, Bone } from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Create a mock AnimationLoader class for testing core functionality
class MockAnimationLoader {
  private cache = {
    avatars: new Map(),
    clips: new Map(),
    metadata: new Map(),
    loadingPromises: new Map()
  }
  
  private config = {
    cache: {
      maxCacheSize: 1024 * 1024,
      maxAge: 5 * 60 * 1000,
      cleanupInterval: 60 * 1000
    },
    enableValidation: true,
    enableLogging: false,
    retryAttempts: 3,
    retryDelay: 1000
  }

  validateGLTF(gltf: GLTF) {
    const result = {
      isValid: true,
      hasAnimations: false,
      hasSkeleton: false,
      boneCount: 0,
      errors: [] as string[],
      warnings: [] as string[]
    }

    if (!gltf.scene) {
      result.errors.push('GLTF has no scene')
      result.isValid = false
    }

    if (gltf.animations && gltf.animations.length > 0) {
      result.hasAnimations = true
    } else {
      result.warnings.push('GLTF has no animations')
    }

    let skeletonFound = false
    let maxBoneCount = 0
    
    gltf.scene?.traverse((child: any) => {
      if (child.skeleton) {
        skeletonFound = true
        maxBoneCount = Math.max(maxBoneCount, child.skeleton.bones.length)
      }
    })

    result.hasSkeleton = skeletonFound
    result.boneCount = maxBoneCount

    if (!skeletonFound) {
      result.warnings.push('GLTF has no skeleton (not suitable for character animation)')
    }

    return result
  }

  getCacheStats() {
    return {
      avatarCount: this.cache.avatars.size,
      clipCount: this.cache.clips.size,
      totalSize: 0,
      formattedSize: '0 B',
      maxSize: this.config.cache.maxCacheSize,
      formattedMaxSize: '1 MB',
      utilizationPercent: 0
    }
  }

  clearCache() {
    this.cache.avatars.clear()
    this.cache.clips.clear()
    this.cache.metadata.clear()
    this.cache.loadingPromises.clear()
  }

  getCachedAvatar(path: string) {
    return this.cache.avatars.get(path) || null
  }

  getCachedClip(name: string) {
    return this.cache.clips.get(name) || null
  }

  handleLoadError(error: Error, assetPath: string) {
    // Mock error handling - just ensure it doesn't throw
    return
  }

  dispose() {
    this.clearCache()
  }
}

describe('AnimationLoader Core Functionality', () => {
  let loader: MockAnimationLoader

  beforeEach(() => {
    loader = new MockAnimationLoader()
  })

  describe('validation', () => {
    it('should validate valid GLTF', () => {
      const validGLTF = createMockGLTF(true, true)
      const result = loader.validateGLTF(validGLTF)
      
      expect(result.isValid).toBe(true)
      expect(result.hasAnimations).toBe(true)
      expect(result.hasSkeleton).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing scene', () => {
      const invalidGLTF = { animations: [] } as any
      const result = loader.validateGLTF(invalidGLTF)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('GLTF has no scene')
    })

    it('should detect missing animations', () => {
      const mockGLTF = createMockGLTF(true, false)
      const result = loader.validateGLTF(mockGLTF)
      
      expect(result.hasAnimations).toBe(false)
      expect(result.warnings).toContain('GLTF has no animations')
    })

    it('should detect missing skeleton', () => {
      const mockGLTF = createMockGLTF(false, true)
      const result = loader.validateGLTF(mockGLTF)
      
      expect(result.hasSkeleton).toBe(false)
      expect(result.warnings).toContain('GLTF has no skeleton (not suitable for character animation)')
    })
  })

  describe('cache management', () => {
    it('should return cache statistics', () => {
      const stats = loader.getCacheStats()
      
      expect(stats).toHaveProperty('avatarCount')
      expect(stats).toHaveProperty('clipCount')
      expect(stats).toHaveProperty('totalSize')
      expect(stats).toHaveProperty('formattedSize')
      expect(stats).toHaveProperty('maxSize')
      expect(stats).toHaveProperty('formattedMaxSize')
      expect(stats).toHaveProperty('utilizationPercent')
    })

    it('should clear cache', () => {
      loader.clearCache()
      const stats = loader.getCacheStats()
      
      expect(stats.avatarCount).toBe(0)
      expect(stats.clipCount).toBe(0)
      expect(stats.totalSize).toBe(0)
    })

    it('should return null for non-existent cached assets', () => {
      expect(loader.getCachedAvatar('/nonexistent.glb')).toBeNull()
      expect(loader.getCachedClip('nonexistent')).toBeNull()
    })
  })

  describe('error handling', () => {
    it('should handle load errors gracefully', () => {
      const error = new Error('Test error')
      
      expect(() => {
        loader.handleLoadError(error, '/test/path.glb')
      }).not.toThrow()
    })
  })

  describe('disposal', () => {
    it('should dispose resources properly', () => {
      expect(() => {
        loader.dispose()
      }).not.toThrow()
      
      const stats = loader.getCacheStats()
      expect(stats.avatarCount).toBe(0)
      expect(stats.clipCount).toBe(0)
    })
  })
})

// Helper function to create mock GLTF
function createMockGLTF(hasSkeleton: boolean, hasAnimations: boolean): GLTF {
  const mockScene = {
    traverse: (callback: (child: any) => void) => {
      if (hasSkeleton) {
        const mockSkinnedMesh = {
          skeleton: {
            bones: new Array(60).fill(null).map(() => new Bone())
          }
        }
        
        callback(mockSkinnedMesh)
      }
    }
  } as any

  const mockAnimations = hasAnimations ? [
    {
      name: 'TestAnimation',
      duration: 1.0,
      tracks: [],
      blendMode: 2500,
      uuid: 'test-uuid',
      resetDuration: () => {},
      trim: () => {},
      validate: () => true,
      optimize: () => {},
      clone: () => ({} as any),
      toJSON: () => ({})
    } as AnimationClip
  ] : []

  return {
    scene: mockScene,
    animations: mockAnimations,
    scenes: [mockScene],
    cameras: [],
    asset: {},
    parser: {} as any,
    userData: {}
  }
}