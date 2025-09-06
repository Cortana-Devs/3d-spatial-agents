import { act, renderHook } from '@testing-library/react'
import { Color, Vector3 } from 'three'
import { useSkyboxStore } from '../skyboxStore'
import { SkyboxPreset, DEFAULT_ATMOSPHERIC_SETTINGS } from '../../types/skybox'

// Mock the skybox utilities
jest.mock('../../utils/skybox/TextureLoader', () => ({
  skyboxTextureLoader: {
    loadCubeTexture: jest.fn().mockResolvedValue({
      userData: { presetId: 'test' },
      dispose: jest.fn()
    }),
    clearCache: jest.fn(),
    getCacheStats: jest.fn().mockReturnValue({
      size: 0,
      memoryUsage: 0,
      hitRate: 0
    }),
    optimizeCache: jest.fn()
  }
}))

jest.mock('../../utils/skybox/TransitionManager', () => ({
  skyboxTransitionManager: {
    transitionTo: jest.fn().mockResolvedValue(undefined),
    cancelTransition: jest.fn()
  }
}))

jest.mock('../../utils/skybox/PerformanceMonitor', () => ({
  skyboxPerformanceMonitor: {
    recordLoadTime: jest.fn(),
    startMonitoring: jest.fn(),
    stopMonitoring: jest.fn(),
    updateMemoryUsage: jest.fn()
  }
}))

// Test preset
const testPreset: SkyboxPreset = {
  id: 'test-preset',
  name: 'Test Preset',
  description: 'A test skybox preset',
  assetPath: '/test/path/',
  intensity: 1.0,
  tint: new Color(1, 1, 1),
  rotationSpeed: 0,
  atmosphericSettings: {
    ...DEFAULT_ATMOSPHERIC_SETTINGS,
    fogEnabled: false,
    timeOfDay: 0.5
  },
  performance: {
    quality: 'medium',
    memoryUsage: 50,
    loadPriority: 5
  },
  tags: ['test'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

describe('SkyboxStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useSkyboxStore())
    act(() => {
      result.current.reset()
    })
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useSkyboxStore())

      expect(result.current.currentPreset).toBeNull()
      expect(result.current.previousPreset).toBeNull()
      expect(result.current.isTransitioning).toBe(false)
      expect(result.current.transitionProgress).toBe(0)
      expect(result.current.presets).toEqual({})
      expect(result.current.error).toBeNull()
      expect(result.current.textureCache).toBeInstanceOf(Map)
      expect(result.current.cacheMetadata).toBeInstanceOf(Map)
    })

    it('should have correct default config', () => {
      const { result } = renderHook(() => useSkyboxStore())

      expect(result.current.config.currentSkybox).toBeNull()
      expect(result.current.config.transitionDuration).toBe(1000)
      expect(result.current.config.enableAtmosphericEffects).toBe(true)
      expect(result.current.config.performanceMode).toBe('balanced')
      expect(result.current.config.maxCacheSize).toBe(128)
    })
  })

  describe('Preset Management', () => {
    it('should add preset correctly', () => {
      const { result } = renderHook(() => useSkyboxStore())

      act(() => {
        result.current.addPreset(testPreset)
      })

      expect(result.current.presets[testPreset.id]).toEqual(testPreset)
      expect(result.current.error).toBeNull()
    })

    it('should update preset correctly', () => {
      const { result } = renderHook(() => useSkyboxStore())

      act(() => {
        result.current.addPreset(testPreset)
      })

      const updates = { intensity: 2.0, name: 'Updated Test Preset' }

      act(() => {
        result.current.updatePreset(testPreset.id, updates)
      })

      expect(result.current.presets[testPreset.id].intensity).toBe(2.0)
      expect(result.current.presets[testPreset.id].name).toBe('Updated Test Preset')
      expect(result.current.presets[testPreset.id].updatedAt).toBeDefined()
    })

    it('should remove preset correctly', () => {
      const { result } = renderHook(() => useSkyboxStore())

      act(() => {
        result.current.addPreset(testPreset)
      })

      expect(result.current.presets[testPreset.id]).toBeDefined()

      act(() => {
        result.current.removePreset(testPreset.id)
      })

      expect(result.current.presets[testPreset.id]).toBeUndefined()
    })

    it('should duplicate preset correctly', () => {
      const { result } = renderHook(() => useSkyboxStore())

      act(() => {
        result.current.addPreset(testPreset)
      })

      const newName = 'Duplicated Test Preset'

      act(() => {
        result.current.duplicatePreset(testPreset.id, newName)
      })

      const duplicatedPreset = Object.values(result.current.presets).find(
        preset => preset.name === newName
      )

      expect(duplicatedPreset).toBeDefined()
      expect(duplicatedPreset?.name).toBe(newName)
      expect(duplicatedPreset?.id).not.toBe(testPreset.id)
      expect(duplicatedPreset?.assetPath).toBe(testPreset.assetPath)
    })

    it('should handle removing current preset', () => {
      const { result } = renderHook(() => useSkyboxStore())

      act(() => {
        result.current.addPreset(testPreset)
      })

      // Simulate setting as current preset
      act(() => {
        result.current.setCurrentPreset(testPreset.id)
      })

      act(() => {
        result.current.removePreset(testPreset.id)
      })

      expect(result.current.currentPreset).toBeNull()
      expect(result.current.presets[testPreset.id]).toBeUndefined()
    })
  })

  describe('Configuration Management', () => {
    it('should update config correctly', () => {
      const { result } = renderHook(() => useSkyboxStore())

      const newConfig = {
        transitionDuration: 2000,
        enableAtmosphericEffects: false
      }

      act(() => {
        result.current.updateConfig(newConfig)
      })

      expect(result.current.config.transitionDuration).toBe(2000)
      expect(result.current.config.enableAtmosphericEffects).toBe(false)
      expect(result.current.config.performanceMode).toBe('balanced') // Should remain unchanged
    })

    it('should set performance mode correctly', () => {
      const { result } = renderHook(() => useSkyboxStore())

      act(() => {
        result.current.setPerformanceMode('performance')
      })

      expect(result.current.config.performanceMode).toBe('performance')
      expect(result.current.config.compressionEnabled).toBe(true)
      expect(result.current.config.maxCacheSize).toBe(64)

      act(() => {
        result.current.setPerformanceMode('quality')
      })

      expect(result.current.config.performanceMode).toBe('quality')
      expect(result.current.config.compressionEnabled).toBe(false)
      expect(result.current.config.maxCacheSize).toBe(256)
    })
  })

  describe('Error Handling', () => {
    it('should set and clear errors correctly', () => {
      const { result } = renderHook(() => useSkyboxStore())

      const errorMessage = 'Test error message'

      act(() => {
        result.current.setError(errorMessage)
      })

      expect(result.current.error).toBe(errorMessage)

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })

    it('should handle invalid preset ID', async () => {
      const { result } = renderHook(() => useSkyboxStore())

      await act(async () => {
        try {
          await result.current.setCurrentPreset('invalid-preset')
        } catch (error) {
          // Expected to fail
        }
      })

      expect(result.current.error).toContain('Preset not found')
    })
  })

  describe('Performance Metrics', () => {
    it('should update performance metrics', () => {
      const { result } = renderHook(() => useSkyboxStore())

      const newMetrics = {
        memoryUsage: 100,
        loadTime: 1500,
        frameImpact: -5
      }

      act(() => {
        result.current.updatePerformanceMetrics(newMetrics)
      })

      expect(result.current.performance.memoryUsage).toBe(100)
      expect(result.current.performance.loadTime).toBe(1500)
      expect(result.current.performance.frameImpact).toBe(-5)
    })
  })

  describe('Cache Management', () => {
    it('should clear cache correctly', () => {
      const { result } = renderHook(() => useSkyboxStore())

      // Add a mock texture to cache
      const mockTexture = { dispose: jest.fn() }
      act(() => {
        result.current.textureCache.set('test', mockTexture as any)
        result.current.cacheMetadata.set('test', {
          lastAccessed: Date.now(),
          accessCount: 1,
          memorySize: 50
        })
      })

      expect(result.current.textureCache.size).toBe(1)
      expect(result.current.cacheMetadata.size).toBe(1)

      act(() => {
        result.current.clearCache()
      })

      expect(result.current.textureCache.size).toBe(0)
      expect(result.current.cacheMetadata.size).toBe(0)
      expect(result.current.performance.memoryUsage).toBe(0)
      expect(mockTexture.dispose).toHaveBeenCalled()
    })
  })

  describe('Import/Export', () => {
    it('should export presets correctly', () => {
      const { result } = renderHook(() => useSkyboxStore())

      act(() => {
        result.current.addPreset(testPreset)
      })

      const exportedJson = result.current.exportPresets()
      const exportedData = JSON.parse(exportedJson)

      expect(exportedData.version).toBe('1.0')
      expect(exportedData.presets).toHaveLength(1)
      expect(exportedData.presets[0].id).toBe(testPreset.id)
      expect(exportedData.presets[0].tint).toEqual({
        r: testPreset.tint.r,
        g: testPreset.tint.g,
        b: testPreset.tint.b
      })
    })

    it('should import presets correctly', () => {
      const { result } = renderHook(() => useSkyboxStore())

      const importData = {
        version: '1.0',
        presets: [{
          ...testPreset,
          tint: { r: 1, g: 0.5, b: 0.8 },
          atmosphericSettings: {
            ...testPreset.atmosphericSettings,
            fogColor: { r: 0.5, g: 0.5, b: 0.5 },
            windDirection: { x: 1, y: 0, z: 0 }
          }
        }]
      }

      act(() => {
        result.current.importPresets(JSON.stringify(importData))
      })

      expect(result.current.presets[testPreset.id]).toBeDefined()
      expect(result.current.presets[testPreset.id].tint).toBeInstanceOf(Color)
      expect(result.current.presets[testPreset.id].tint.r).toBe(1)
      expect(result.current.presets[testPreset.id].tint.g).toBe(0.5)
      expect(result.current.presets[testPreset.id].tint.b).toBe(0.8)
      expect(result.current.error).toBeNull()
    })

    it('should handle invalid import data', () => {
      const { result } = renderHook(() => useSkyboxStore())

      act(() => {
        result.current.importPresets('invalid json')
      })

      expect(result.current.error).toBeDefined()

      act(() => {
        result.current.importPresets('{}') // Valid JSON but no presets
      })

      expect(result.current.error).toContain('Invalid preset data format')
    })
  })

  describe('Reset Functionality', () => {
    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useSkyboxStore())

      // Modify state
      act(() => {
        result.current.addPreset(testPreset)
        result.current.setError('Test error')
        result.current.updateConfig({ transitionDuration: 3000 })
      })

      // Verify state was modified
      expect(result.current.presets[testPreset.id]).toBeDefined()
      expect(result.current.error).toBe('Test error')
      expect(result.current.config.transitionDuration).toBe(3000)

      // Reset
      act(() => {
        result.current.reset()
      })

      // Verify reset to initial state
      expect(result.current.presets).toEqual({})
      expect(result.current.error).toBeNull()
      expect(result.current.currentPreset).toBeNull()
      expect(result.current.textureCache.size).toBe(0)
    })
  })

  describe('Fallback Preset', () => {
    it('should set fallback preset correctly', () => {
      const { result } = renderHook(() => useSkyboxStore())

      act(() => {
        result.current.setFallbackPreset(testPreset.id)
      })

      expect(result.current.fallbackPreset).toBe(testPreset.id)

      act(() => {
        result.current.removePreset(testPreset.id)
      })

      expect(result.current.fallbackPreset).toBeNull()
    })
  })

  describe('Selector Hooks', () => {
    it('should have working selector hooks', () => {
      const { useSkyboxCurrentPreset, useSkyboxIsTransitioning, useSkyboxError } = require('../skyboxStore')

      const { result: currentResult } = renderHook(() => useSkyboxCurrentPreset())
      const { result: transitionResult } = renderHook(() => useSkyboxIsTransitioning())
      const { result: errorResult } = renderHook(() => useSkyboxError())

      expect(currentResult.current).toBeNull()
      expect(transitionResult.current).toBe(false)
      expect(errorResult.current).toBeNull()
    })
  })

  describe('Async Operations', () => {
    it('should handle preset loading with proper state updates', async () => {
      const { result } = renderHook(() => useSkyboxStore())

      act(() => {
        result.current.addPreset(testPreset)
      })

      await act(async () => {
        await result.current.setCurrentPreset(testPreset.id)
      })

      expect(result.current.currentPreset).toBe(testPreset.id)
      expect(result.current.error).toBeNull()
    })

    it('should handle concurrent preset changes correctly', async () => {
      const { result } = renderHook(() => useSkyboxStore())

      const preset2: SkyboxPreset = {
        ...testPreset,
        id: 'test-preset-2',
        name: 'Test Preset 2'
      }

      act(() => {
        result.current.addPreset(testPreset)
        result.current.addPreset(preset2)
      })

      // Start concurrent operations
      const promise1 = act(async () => {
        await result.current.setCurrentPreset(testPreset.id)
      })

      const promise2 = act(async () => {
        await result.current.setCurrentPreset(preset2.id)
      })

      await Promise.all([promise1, promise2])

      // The last operation should win
      expect(result.current.currentPreset).toBe(preset2.id)
    })
  })
})
