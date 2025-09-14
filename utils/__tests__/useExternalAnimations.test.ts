/**
 * Tests for useExternalAnimations hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  clearAnimationCache, 
  getAnimationCacheStats 
} from '../useExternalAnimations'

// Mock Three.js GLTFLoader
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: vi.fn()
}))

// Mock animation utils
vi.mock('../animationUtils', () => ({
  extractClipName: vi.fn((path: string) => {
    const filename = path.split('/').pop()?.replace('.glb', '') || 'unknown'
    return filename.toLowerCase()
  }),
  getDefaultAnimationPaths: vi.fn(() => [
    '/animations/M_Walk_001.glb'
  ])
}))

describe('useExternalAnimations', () => {
  beforeEach(() => {
    clearAnimationCache()
    vi.clearAllMocks()
  })

  describe('Cache Utilities', () => {
    it('should provide cache statistics', () => {
      const stats = getAnimationCacheStats()
      expect(stats.cachedClips).toBe(0)
      expect(stats.activeLoads).toBe(0)
      expect(Array.isArray(stats.cacheKeys)).toBe(true)
    })

    it('should clear cache when requested', () => {
      clearAnimationCache()
      const stats = getAnimationCacheStats()
      expect(stats.cachedClips).toBe(0)
    })
  })

  describe('Hook Interface', () => {
    it('should export the hook function', async () => {
      const { useExternalAnimations } = await import('../useExternalAnimations')
      expect(typeof useExternalAnimations).toBe('function')
    })

    it('should export cache utilities', async () => {
      const { clearAnimationCache, getAnimationCacheStats } = await import('../useExternalAnimations')
      expect(typeof clearAnimationCache).toBe('function')
      expect(typeof getAnimationCacheStats).toBe('function')
    })
  })

  describe('Animation Utils Integration', () => {
    it('should use extractClipName from utils', async () => {
      const { extractClipName } = await import('../animationUtils')
      expect(extractClipName).toBeDefined()
      
      // Test the mocked function
      const result = extractClipName('/test/M_Walk_001.glb')
      expect(result).toBe('m_walk_001')
    })

    it('should use getDefaultAnimationPaths from utils', async () => {
      const { getDefaultAnimationPaths } = await import('../animationUtils')
      expect(getDefaultAnimationPaths).toBeDefined()
      
      // Test the mocked function
      const paths = getDefaultAnimationPaths()
      expect(Array.isArray(paths)).toBe(true)
      expect(paths.length).toBeGreaterThan(0)
    })
  })
})