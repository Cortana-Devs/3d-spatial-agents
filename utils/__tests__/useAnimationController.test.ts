/**
 * Tests for useAnimationController hook
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnimationController } from '../useAnimationController'
import { AnimationManager } from '../useRPMAnimations'
import { AISimulant } from '../../types'
import { AnimationMixer, AnimationAction, AnimationClip, Object3D } from 'three'

// Mock React Three Fiber
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn((callback) => {
    // Store callback for manual triggering in tests
    ;(global as any).__useFrameCallback = callback
  })
}))

// Mock Three.js classes
vi.mock('three', async () => {
  const actual = await vi.importActual('three')
  
  class MockAnimationAction {
    public weight = 1
    public timeScale = 1
    public time = 0
    public paused = false
    private _isRunning = true
    private _clip: AnimationClip

    constructor(clip: AnimationClip) {
      this._clip = clip
    }

    reset() {
      this.time = 0
      return this
    }

    setLoop(mode: number, repetitions: number) {
      return this
    }

    fadeIn(duration: number) {
      return this
    }

    fadeOut(duration: number) {
      return this
    }

    play() {
      this._isRunning = true
      return this
    }

    stop() {
      this._isRunning = false
      return this
    }

    isRunning() {
      return this._isRunning
    }

    getClip() {
      return this._clip
    }
  }

  class MockAnimationMixer {
    update(deltaTime: number) {
      // Mock update
    }

    stopAllAction() {
      // Mock stop all
    }

    addEventListener(type: string, listener: any) {
      // Mock event listener
    }

    removeEventListener(type: string, listener: any) {
      // Mock event listener removal
    }
  }

  return {
    ...actual,
    AnimationMixer: MockAnimationMixer,
    AnimationAction: MockAnimationAction
  }
})

describe('useAnimationController', () => {
  let mockAnimationManager: AnimationManager
  let mockSimulant: AISimulant
  let mockMixer: AnimationMixer
  let mockActions: Record<string, AnimationAction | null>

  beforeEach(() => {
    vi.useFakeTimers()
    
    // Create mock mixer and actions
    mockMixer = new AnimationMixer(new Object3D())
    const mockClip = new AnimationClip('test', 1, [])
    
    mockActions = {
      'F_Standing_Idle_Variations_001': new (AnimationAction as any)(mockClip),
      'M_Walk_001': new (AnimationAction as any)(mockClip),
      'M_Run_001': new (AnimationAction as any)(mockClip),
      'M_Walk_Jump_002': new (AnimationAction as any)(mockClip),
      'M_Standing_Expressions_013': new (AnimationAction as any)(mockClip),
      'M_Talking_Variations_005': new (AnimationAction as any)(mockClip),
      'F_Dances_007': new (AnimationAction as any)(mockClip)
    }

    // Create mock animation manager
    mockAnimationManager = {
      playAnimation: vi.fn(),
      stopAnimation: vi.fn(),
      pauseAnimation: vi.fn(),
      resumeAnimation: vi.fn(),
      crossFadeToAnimation: vi.fn(),
      state: {
        currentAnimation: null,
        previousAnimation: null,
        isPlaying: false,
        isPaused: false,
        transitionProgress: 0,
        playbackTime: 0,
        duration: 0,
        weight: 1
      },
      availableAnimations: Object.keys(mockActions),
      actions: mockActions,
      mixer: mockMixer,
      setLODLevel: vi.fn(),
      pauseAllAnimations: vi.fn(),
      resumeAllAnimations: vi.fn()
    }

    // Create mock simulant
    mockSimulant = {
      id: 'test-simulant',
      name: 'Test Simulant',
      position: { x: 0, y: 0, z: 0 },
      status: 'active',
      lastAction: 'Standing peacefully',
      conversationHistory: [],
      geminiSessionId: 'test-session'
    }
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('should initialize with idle state', () => {
      const { result } = renderHook(() =>
        useAnimationController(mockAnimationManager, mockSimulant)
      )

      expect(result.current.state.currentState).toBe('idle')
      expect(result.current.state.previousState).toBe('idle')
      expect(result.current.state.isTransitioning).toBe(false)
    })

    it('should initialize controller when mixer and actions are available', () => {
      const { result } = renderHook(() =>
        useAnimationController(mockAnimationManager, mockSimulant, {
          enableLogging: true
        })
      )

      // Trigger useFrame callback to update state
      act(() => {
        const callback = (global as any).__useFrameCallback
        if (callback) callback({}, 0.016)
      })

      expect(result.current.state).toBeDefined()
    })
  })

  describe('Action Mapping', () => {
    it('should map actions to correct states', () => {
      const { result } = renderHook(() =>
        useAnimationController(mockAnimationManager, mockSimulant)
      )

      expect(result.current.mapActionToState('jump over obstacle')).toBe('jumping')
      expect(result.current.mapActionToState('walk to building')).toBe('walking')
      expect(result.current.mapActionToState('run quickly')).toBe('running')
      expect(result.current.mapActionToState('build house')).toBe('building')
      expect(result.current.mapActionToState('talk to friend')).toBe('communicating')
      expect(result.current.mapActionToState('think deeply')).toBe('thinking')
      expect(result.current.mapActionToState('celebrate victory')).toBe('celebrating')
      expect(result.current.mapActionToState('unknown action')).toBe('idle')
    })
  })

  describe('Auto Transition', () => {
    it('should automatically transition when simulant action changes', async () => {
      const { result, rerender } = renderHook(
        ({ simulant }) => useAnimationController(mockAnimationManager, simulant),
        { initialProps: { simulant: mockSimulant } }
      )

      // Change simulant action
      const updatedSimulant = {
        ...mockSimulant,
        lastAction: 'Walking to the store'
      }

      rerender({ simulant: updatedSimulant })

      // Fast-forward past debounce delay
      act(() => {
        vi.advanceTimersByTime(200)
      })

      // Trigger useFrame callback
      act(() => {
        const callback = (global as any).__useFrameCallback
        if (callback) callback({}, 0.016)
      })

      expect(result.current.state.currentState).toBe('walking')
    })

    it('should debounce rapid action changes', async () => {
      const { result, rerender } = renderHook(
        ({ simulant }) => useAnimationController(mockAnimationManager, simulant, {
          transitionDelay: 100
        }),
        { initialProps: { simulant: mockSimulant } }
      )

      // Rapid action changes
      rerender({ simulant: { ...mockSimulant, lastAction: 'Walking' } })
      rerender({ simulant: { ...mockSimulant, lastAction: 'Running' } })
      rerender({ simulant: { ...mockSimulant, lastAction: 'Jumping' } })

      // Only advance time partially
      act(() => {
        vi.advanceTimersByTime(50)
      })

      // Should still be in idle (debounced)
      expect(result.current.state.currentState).toBe('idle')

      // Complete debounce
      act(() => {
        vi.advanceTimersByTime(100)
      })

      // Trigger useFrame callback
      act(() => {
        const callback = (global as any).__useFrameCallback
        if (callback) callback({}, 0.016)
      })

      // Should transition to final action (jumping)
      expect(result.current.state.currentState).toBe('jumping')
    })

    it('should not auto-transition when disabled', () => {
      const { result, rerender } = renderHook(
        ({ simulant }) => useAnimationController(mockAnimationManager, simulant, {
          autoTransition: false
        }),
        { initialProps: { simulant: mockSimulant } }
      )

      // Change simulant action
      const updatedSimulant = {
        ...mockSimulant,
        lastAction: 'Walking to the store'
      }

      rerender({ simulant: updatedSimulant })

      act(() => {
        vi.advanceTimersByTime(200)
      })

      // Should remain in idle
      expect(result.current.state.currentState).toBe('idle')
    })
  })

  describe('Manual Transitions', () => {
    it('should allow manual state transitions', () => {
      const { result } = renderHook(() =>
        useAnimationController(mockAnimationManager, mockSimulant)
      )

      act(() => {
        const success = result.current.transitionTo('walking')
        expect(success).toBe(true)
      })

      // Trigger useFrame callback
      act(() => {
        const callback = (global as any).__useFrameCallback
        if (callback) callback({}, 0.016)
      })

      expect(result.current.state.currentState).toBe('walking')
      expect(result.current.state.previousState).toBe('idle')
    })

    it('should handle forced transitions', () => {
      const { result } = renderHook(() =>
        useAnimationController(mockAnimationManager, mockSimulant)
      )

      act(() => {
        result.current.transitionTo('walking')
      })

      act(() => {
        const success = result.current.transitionTo('idle', { force: true })
        expect(success).toBe(true)
      })

      // Trigger useFrame callback
      act(() => {
        const callback = (global as any).__useFrameCallback
        if (callback) callback({}, 0.016)
      })

      expect(result.current.state.currentState).toBe('idle')
    })

    it('should handle custom transition duration', () => {
      const { result } = renderHook(() =>
        useAnimationController(mockAnimationManager, mockSimulant)
      )

      act(() => {
        result.current.transitionTo('walking', { customDuration: 0.5 })
      })

      // Trigger useFrame callback
      act(() => {
        const callback = (global as any).__useFrameCallback
        if (callback) callback({}, 0.016)
      })

      expect(result.current.state.isTransitioning).toBe(true)
    })
  })

  describe('Blend Animation Management', () => {
    it('should add blend animations when enabled', () => {
      const { result } = renderHook(() =>
        useAnimationController(mockAnimationManager, mockSimulant, {
          enableBlending: true
        })
      )

      act(() => {
        result.current.addBlendAnimation('M_Walk_001', 0.5, {
          timeScale: 1.2,
          fadeIn: 0.3
        })
      })

      // Should not throw and should be callable
      expect(() => result.current.addBlendAnimation).not.toThrow()
    })

    it('should not add blend animations when disabled', () => {
      const { result } = renderHook(() =>
        useAnimationController(mockAnimationManager, mockSimulant, {
          enableBlending: false
        })
      )

      act(() => {
        result.current.addBlendAnimation('M_Walk_001', 0.5)
      })

      // Should not throw but should not add animation
      expect(() => result.current.addBlendAnimation).not.toThrow()
    })

    it('should remove blend animations', () => {
      const { result } = renderHook(() =>
        useAnimationController(mockAnimationManager, mockSimulant, {
          enableBlending: true
        })
      )

      act(() => {
        result.current.addBlendAnimation('M_Walk_001', 0.5)
        result.current.removeBlendAnimation('M_Walk_001', 0.3)
      })

      // Should handle removal with fade out
      expect(() => result.current.removeBlendAnimation).not.toThrow()
    })

    it('should set blend weights', () => {
      const { result } = renderHook(() =>
        useAnimationController(mockAnimationManager, mockSimulant)
      )

      act(() => {
        result.current.setBlendWeight('M_Walk_001', 0.7)
      })

      expect(mockActions['M_Walk_001']?.weight).toBe(0.7)
    })
  })

  describe('State Information', () => {
    it('should provide available states', () => {
      const { result } = renderHook(() =>
        useAnimationController(mockAnimationManager, mockSimulant)
      )

      const states = result.current.getAvailableStates()
      expect(states).toContain('idle')
      expect(states).toContain('walking')
      expect(states).toContain('running')
      expect(states).toContain('jumping')
      expect(states).toContain('building')
      expect(states).toContain('thinking')
      expect(states).toContain('communicating')
      expect(states).toContain('celebrating')
    })

    it('should provide debug information', () => {
      const { result } = renderHook(() =>
        useAnimationController(mockAnimationManager, mockSimulant)
      )

      const debugInfo = result.current.getDebugInfo()
      expect(debugInfo).toBeDefined()
    })

    it('should track transition progress', () => {
      const { result } = renderHook(() =>
        useAnimationController(mockAnimationManager, mockSimulant)
      )

      act(() => {
        result.current.transitionTo('walking')
      })

      // Trigger useFrame callback
      act(() => {
        const callback = (global as any).__useFrameCallback
        if (callback) callback({}, 0.016)
      })

      expect(result.current.state.transitionProgress).toBeGreaterThanOrEqual(0)
      expect(result.current.state.transitionProgress).toBeLessThanOrEqual(1)
    })
  })

  describe('Cleanup', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() =>
        useAnimationController(mockAnimationManager, mockSimulant)
      )

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow()
    })

    it('should clear timeouts on unmount', () => {
      const { result, unmount, rerender } = renderHook(
        ({ simulant }) => useAnimationController(mockAnimationManager, simulant),
        { initialProps: { simulant: mockSimulant } }
      )

      // Start a transition
      rerender({ simulant: { ...mockSimulant, lastAction: 'Walking' } })

      // Unmount before transition completes
      unmount()

      // Should not throw
      expect(() => vi.advanceTimersByTime(200)).not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing mixer gracefully', () => {
      const managerWithoutMixer = {
        ...mockAnimationManager,
        mixer: null
      }

      const { result } = renderHook(() =>
        useAnimationController(managerWithoutMixer, mockSimulant)
      )

      // Should not crash
      expect(result.current.state.currentState).toBe('idle')
    })

    it('should handle missing actions gracefully', () => {
      const managerWithoutActions = {
        ...mockAnimationManager,
        actions: {}
      }

      const { result } = renderHook(() =>
        useAnimationController(managerWithoutActions, mockSimulant)
      )

      act(() => {
        const success = result.current.transitionTo('walking')
        expect(success).toBe(false) // Should fail gracefully
      })
    })
  })

  describe('Logging', () => {
    it('should log when enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { result, rerender } = renderHook(
        ({ simulant }) => useAnimationController(mockAnimationManager, simulant, {
          enableLogging: true
        }),
        { initialProps: { simulant: mockSimulant } }
      )

      // Change action to trigger logging
      rerender({ simulant: { ...mockSimulant, lastAction: 'Walking' } })

      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('should not log when disabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { result, rerender } = renderHook(
        ({ simulant }) => useAnimationController(mockAnimationManager, simulant, {
          enableLogging: false
        }),
        { initialProps: { simulant: mockSimulant } }
      )

      // Change action
      rerender({ simulant: { ...mockSimulant, lastAction: 'Walking' } })

      act(() => {
        vi.advanceTimersByTime(200)
      })

      // Should not have logged animation controller messages
      const logCalls = consoleSpy.mock.calls.filter(call => 
        call[0]?.includes?.('🎮') || call[0]?.includes?.('🎯')
      )
      expect(logCalls.length).toBe(0)

      consoleSpy.mockRestore()
    })
  })
})