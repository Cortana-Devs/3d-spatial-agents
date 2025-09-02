/**
 * Tests for AnimationController class
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { AnimationMixer, AnimationAction, AnimationClip, Object3D } from 'three'
import { AnimationController, AnimationState, ENHANCED_ANIMATION_MAPPING } from '../animationController'

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
    private _actions: Map<string, MockAnimationAction> = new Map()

    update(deltaTime: number) {
      // Mock update
    }

    stopAllAction() {
      this._actions.forEach(action => action.stop())
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

describe('AnimationController', () => {
  let mixer: AnimationMixer
  let actions: Record<string, AnimationAction | null>
  let controller: AnimationController

  beforeEach(() => {
    // Create mock mixer
    mixer = new AnimationMixer(new Object3D())

    // Create mock actions for available animations
    const mockClip = new AnimationClip('test', 1, [])
    actions = {
      'F_Standing_Idle_Variations_001': new (AnimationAction as any)(mockClip),
      'F_Standing_Idle_Variations_002': new (AnimationAction as any)(mockClip),
      'M_Walk_001': new (AnimationAction as any)(mockClip),
      'M_Run_001': new (AnimationAction as any)(mockClip),
      'M_Walk_Jump_002': new (AnimationAction as any)(mockClip),
      'M_Standing_Expressions_013': new (AnimationAction as any)(mockClip),
      'M_Talking_Variations_005': new (AnimationAction as any)(mockClip),
      'F_Dances_007': new (AnimationAction as any)(mockClip),
      'Masculine_TPose': new (AnimationAction as any)(mockClip)
    }

    // Initialize controller
    controller = new AnimationController(mixer, actions, {
      enableLogging: false,
      initialState: 'idle'
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('Initialization', () => {
    it('should initialize with idle state', () => {
      expect(controller.getCurrentState()).toBe('idle')
      expect(controller.getPreviousState()).toBe('idle')
      expect(controller.isInTransition()).toBe(false)
    })

    it('should build available animations set', () => {
      const debugInfo = controller.getDebugInfo()
      expect(debugInfo.availableAnimations).toContain('F_Standing_Idle_Variations_001')
      expect(debugInfo.availableAnimations).toContain('M_Walk_001')
      expect(debugInfo.availableAnimations.length).toBe(9)
    })
  })

  describe('Action to State Mapping', () => {
    it('should map jump actions to jumping state', () => {
      expect(controller.mapActionToAnimationState('jump over obstacle')).toBe('jumping')
      expect(controller.mapActionToAnimationState('leap forward')).toBe('jumping')
    })

    it('should map movement actions to appropriate states', () => {
      expect(controller.mapActionToAnimationState('walk to the building')).toBe('walking')
      expect(controller.mapActionToAnimationState('run quickly')).toBe('running')
      expect(controller.mapActionToAnimationState('move slowly')).toBe('walking')
    })

    it('should map building actions to building state', () => {
      expect(controller.mapActionToAnimationState('build a house')).toBe('building')
      expect(controller.mapActionToAnimationState('place blocks')).toBe('building')
      expect(controller.mapActionToAnimationState('construct tower')).toBe('building')
    })

    it('should map communication actions to communicating state', () => {
      expect(controller.mapActionToAnimationState('talk to friend')).toBe('communicating')
      expect(controller.mapActionToAnimationState('say hello')).toBe('communicating')
      expect(controller.mapActionToAnimationState('communicate with team')).toBe('communicating')
    })

    it('should map thinking actions to thinking state', () => {
      expect(controller.mapActionToAnimationState('think about solution')).toBe('thinking')
      expect(controller.mapActionToAnimationState('consider options')).toBe('thinking')
      expect(controller.mapActionToAnimationState('analyze situation')).toBe('thinking')
    })

    it('should map celebration actions to celebrating state', () => {
      expect(controller.mapActionToAnimationState('celebrate victory')).toBe('celebrating')
      expect(controller.mapActionToAnimationState('dance with joy')).toBe('celebrating')
      expect(controller.mapActionToAnimationState('cheer loudly')).toBe('celebrating')
    })

    it('should default to idle for unknown actions', () => {
      expect(controller.mapActionToAnimationState('unknown action')).toBe('idle')
      expect(controller.mapActionToAnimationState('')).toBe('idle')
    })
  })

  describe('Animation Selection', () => {
    it('should select primary animation when available', () => {
      const animation = controller.getAnimationForState('idle')
      expect(animation).toBe('F_Standing_Idle_Variations_001') // First primary option
    })

    it('should fallback to secondary animation when primary not available', () => {
      // Remove primary animations
      delete actions['F_Standing_Idle_Variations_001']
      delete actions['F_Standing_Idle_Variations_002']
      delete actions['F_Standing_Idle_Variations_006']
      
      const newController = new AnimationController(mixer, actions, { enableLogging: false })
      const animation = newController.getAnimationForState('idle')
      expect(animation).toBe('Masculine_TPose') // Fallback option
    })

    it('should return null when no animations available for state', () => {
      const emptyActions: Record<string, AnimationAction | null> = {}
      const newController = new AnimationController(mixer, emptyActions, { enableLogging: false })
      const animation = newController.getAnimationForState('idle')
      expect(animation).toBeNull()
    })
  })

  describe('State Transitions', () => {
    it('should allow transition to different state', () => {
      expect(controller.canTransitionTo('walking')).toBe(true)
      expect(controller.canTransitionTo('building')).toBe(true)
    })

    it('should not allow transition to same state', () => {
      expect(controller.canTransitionTo('idle')).toBe(false)
    })

    it('should successfully transition to new state', () => {
      vi.useFakeTimers()
      
      const result = controller.transitionTo('walking')
      expect(result).toBe(true)
      expect(controller.getCurrentState()).toBe('walking')
      expect(controller.getPreviousState()).toBe('idle')
      expect(controller.isInTransition()).toBe(true)
      
      // Fast-forward time to complete transition
      vi.advanceTimersByTime(1000)
      expect(controller.isInTransition()).toBe(false)
    })

    it('should respect priority system', () => {
      vi.useFakeTimers()
      
      // Start in walking state
      controller.transitionTo('walking')
      vi.advanceTimersByTime(1000) // Complete transition
      
      // Try to transition to lower priority state (should work due to explicit transition rule)
      expect(controller.canTransitionTo('idle')).toBe(true)
      
      // Try to transition to higher priority state (should work)
      expect(controller.canTransitionTo('jumping')).toBe(true)
    })

    it('should handle forced transitions', () => {
      controller.transitionTo('walking')
      
      // Force transition even if normally not allowed
      const result = controller.transitionTo('idle', { force: true })
      expect(result).toBe(true)
      expect(controller.getCurrentState()).toBe('idle')
    })

    it('should handle custom transition duration', () => {
      vi.useFakeTimers()
      
      controller.transitionTo('walking', { customDuration: 0.5 })
      expect(controller.isInTransition()).toBe(true)
      
      // Should still be transitioning after 400ms
      vi.advanceTimersByTime(400)
      expect(controller.isInTransition()).toBe(true)
      
      // Should complete after 500ms
      vi.advanceTimersByTime(200)
      expect(controller.isInTransition()).toBe(false)
    })
  })

  describe('Blend Animation Management', () => {
    it('should add blend animation', () => {
      controller.setBlendAnimation('M_Walk_001', {
        name: 'M_Walk_001',
        weight: 0.5,
        timeScale: 1.2
      })
      
      const blendAnimations = controller.getActiveBlendAnimations()
      expect(blendAnimations.has('M_Walk_001')).toBe(true)
      expect(blendAnimations.get('M_Walk_001')?.weight).toBe(0.5)
    })

    it('should remove blend animation', () => {
      controller.setBlendAnimation('M_Walk_001', {
        name: 'M_Walk_001',
        weight: 0.5
      })
      
      controller.removeBlendAnimation('M_Walk_001')
      
      const blendAnimations = controller.getActiveBlendAnimations()
      expect(blendAnimations.has('M_Walk_001')).toBe(false)
    })

    it('should set blend weight', () => {
      controller.setBlendWeight('M_Walk_001', 0.7)
      
      const action = actions['M_Walk_001']
      expect(action?.weight).toBe(0.7)
    })

    it('should clamp blend weight between 0 and 1', () => {
      controller.setBlendWeight('M_Walk_001', 1.5)
      expect(actions['M_Walk_001']?.weight).toBe(1)
      
      controller.setBlendWeight('M_Walk_001', -0.5)
      expect(actions['M_Walk_001']?.weight).toBe(0)
    })
  })

  describe('Transition Progress', () => {
    it('should track transition progress', () => {
      vi.useFakeTimers()
      
      controller.transitionTo('walking') // Default 0.3s transition
      
      // At start
      expect(controller.getTransitionProgress()).toBe(0)
      
      // Halfway through
      vi.advanceTimersByTime(150)
      const progress = controller.getTransitionProgress()
      expect(progress).toBeGreaterThan(0.4)
      expect(progress).toBeLessThan(0.6)
      
      // At end
      vi.advanceTimersByTime(200)
      expect(controller.getTransitionProgress()).toBe(1)
    })

    it('should return 1 when not transitioning', () => {
      expect(controller.getTransitionProgress()).toBe(1)
    })
  })

  describe('Update Loop', () => {
    it('should update mixer', () => {
      const updateSpy = vi.spyOn(mixer, 'update')
      
      controller.update(0.016) // 60 FPS delta
      
      expect(updateSpy).toHaveBeenCalledWith(0.016)
    })

    it('should handle automatic jump to idle transition', () => {
      vi.useFakeTimers()
      
      // Transition to jumping
      controller.transitionTo('jumping')
      vi.advanceTimersByTime(1000) // Complete transition
      
      // Mock the jump animation as finished
      const jumpAction = actions['M_Walk_Jump_002'] as any
      jumpAction._isRunning = false
      
      // Update should trigger automatic transition to idle
      controller.update(0.016)
      
      expect(controller.getCurrentState()).toBe('idle')
    })
  })

  describe('Debug Information', () => {
    it('should provide comprehensive debug info', () => {
      controller.transitionTo('walking')
      controller.setBlendAnimation('M_Run_001', {
        name: 'M_Run_001',
        weight: 0.3
      })
      
      const debugInfo = controller.getDebugInfo()
      
      expect(debugInfo.currentState).toBe('walking')
      expect(debugInfo.previousState).toBe('idle')
      expect(debugInfo.isTransitioning).toBe(true)
      expect(debugInfo.availableAnimations).toBeInstanceOf(Array)
      expect(debugInfo.activeBlends).toContain('M_Run_001')
    })
  })

  describe('Disposal', () => {
    it('should clean up resources on dispose', () => {
      const stopAllActionSpy = vi.spyOn(mixer, 'stopAllAction')
      
      controller.setBlendAnimation('M_Walk_001', {
        name: 'M_Walk_001',
        weight: 0.5
      })
      
      controller.dispose()
      
      expect(stopAllActionSpy).toHaveBeenCalled()
      expect(controller.getActiveBlendAnimations().size).toBe(0)
    })
  })

  describe('Animation Mapping Configuration', () => {
    it('should have correct priority values', () => {
      expect(ENHANCED_ANIMATION_MAPPING.jumping.priority).toBe(5) // Highest
      expect(ENHANCED_ANIMATION_MAPPING.running.priority).toBe(4)
      expect(ENHANCED_ANIMATION_MAPPING.walking.priority).toBe(3)
      expect(ENHANCED_ANIMATION_MAPPING.building.priority).toBe(2)
      expect(ENHANCED_ANIMATION_MAPPING.idle.priority).toBe(1) // Lowest
    })

    it('should have appropriate looping settings', () => {
      expect(ENHANCED_ANIMATION_MAPPING.idle.looping).toBe(true)
      expect(ENHANCED_ANIMATION_MAPPING.walking.looping).toBe(true)
      expect(ENHANCED_ANIMATION_MAPPING.jumping.looping).toBe(false) // One-shot
    })

    it('should have reasonable time scales', () => {
      expect(ENHANCED_ANIMATION_MAPPING.running.timeScale).toBe(1.2) // Faster
      expect(ENHANCED_ANIMATION_MAPPING.thinking.timeScale).toBe(0.7) // Slower
      expect(ENHANCED_ANIMATION_MAPPING.building.timeScale).toBe(0.8) // Slightly slower
    })
  })
})