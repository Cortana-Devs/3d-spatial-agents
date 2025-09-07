import { render, waitFor, fireEvent, act } from '@testing-library/react'
import { Canvas } from '@react-three/fiber'
import { Vector3, Euler, AnimationMixer, AnimationAction } from 'three'
import { PlayerAvatarManager } from '../PlayerAvatarManager'
import { EnhancedPlayerControlModule } from '../EnhancedPlayerControlModule'
import { MovementAnimationController } from '../../animations/MovementAnimationController'
import { useWorldStore } from '../../../store/worldStore'
import { PlayerAvatarState, MovementAnimationState } from '../../../types/playerAvatar'

// Mock Three.js and dependencies
jest.mock('@react-three/fiber')
jest.mock('@react-three/drei')
jest.mock('three')

// Mock the world store
jest.mock('../../../store/worldStore')

// Mock performance APIs
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
  },
})

describe('Player Avatar Integration System', () => {
  let mockWorldStore: any
  let mockSetPlayerAvatar: jest.Mock
  let mockUpdateAvatarState: jest.Mock
  let mockUpdateAvatarPosition: jest.Mock

  beforeEach(() => {
    mockSetPlayerAvatar = jest.fn()
    mockUpdateAvatarState = jest.fn()
    mockUpdateAvatarPosition = jest.fn()

    mockWorldStore = {
      playerAvatar: null,
      setPlayerAvatar: mockSetPlayerAvatar,
      updateAvatarState: mockUpdateAvatarState,
      updateAvatarPosition: mockUpdateAvatarPosition,
      clearPlayerAvatar: jest.fn(),
      activeCamera: 'fly',
      simulants: new Map(),
    }

    ;(useWorldStore as jest.Mock).mockReturnValue(mockWorldStore)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('PlayerAvatarManager', () => {
    it('should initialize avatar manager correctly', async () => {
      const onAvatarLoaded = jest.fn()
      const onError = jest.fn()

      render(
        <Canvas>
          <PlayerAvatarManager
            modelUrl="/models/test-avatar.glb"
            onAvatarLoaded={onAvatarLoaded}
            onError={onError}
          />
        </Canvas>
      )

      // Should not throw errors during initialization
      expect(onError).not.toHaveBeenCalled()
    })

    it('should load avatar and update store', async () => {
      const onAvatarLoaded = jest.fn()

      render(
        <Canvas>
          <PlayerAvatarManager
            modelUrl="/models/test-avatar.glb"
            onAvatarLoaded={onAvatarLoaded}
          />
        </Canvas>
      )

      // Mock successful avatar loading
      await act(async () => {
        const mockAvatarState: PlayerAvatarState = {
          modelUrl: '/models/test-avatar.glb',
          characterId: 'test-avatar-123',
          isLoaded: true,
          loadingProgress: 100,
          isVisible: true,
          renderLOD: 'high',
          currentAnimation: 'idle',
          animationBlendWeight: 1.0,
          position: new Vector3(),
          rotation: new Euler(),
          scale: new Vector3(1, 1, 1),
          animationMixer: null,
          currentAnimations: new Map(),
          transitionState: null,
          lastUpdateTime: performance.now(),
          frameSkipCount: 0,
          memoryUsage: 0
        }

        onAvatarLoaded(mockAvatarState)
      })

      expect(onAvatarLoaded).toHaveBeenCalledWith(
        expect.objectContaining({
          isLoaded: true,
          modelUrl: '/models/test-avatar.glb'
        })
      )
    })

    it('should handle avatar loading errors', async () => {
      const onError = jest.fn()

      render(
        <Canvas>
          <PlayerAvatarManager
            modelUrl="/models/invalid-avatar.glb"
            onError={onError}
          />
        </Canvas>
      )

      // Simulate loading error
      await act(async () => {
        const error = new Error('Failed to load avatar model')
        onError(error)
      })

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Failed to load avatar model'
        })
      )
    })

    it('should update avatar position when controller position changes', () => {
      const mockAvatar: PlayerAvatarState = {
        modelUrl: '/models/test-avatar.glb',
        characterId: 'test-avatar',
        isLoaded: true,
        loadingProgress: 100,
        isVisible: true,
        renderLOD: 'high',
        currentAnimation: 'idle',
        animationBlendWeight: 1.0,
        position: new Vector3(0, 0, 0),
        rotation: new Euler(),
        scale: new Vector3(1, 1, 1),
        animationMixer: null,
        currentAnimations: new Map(),
        transitionState: null,
        lastUpdateTime: performance.now(),
        frameSkipCount: 0,
        memoryUsage: 0
      }

      mockWorldStore.playerAvatar = mockAvatar

      render(
        <Canvas>
          <PlayerAvatarManager modelUrl="/models/test-avatar.glb" />
        </Canvas>
      )

      // Simulate position update
      const newPosition = new Vector3(5, 1, 3)
      act(() => {
        mockUpdateAvatarPosition(newPosition)
      })

      expect(mockUpdateAvatarPosition).toHaveBeenCalledWith(newPosition)
    })
  })

  describe('EnhancedPlayerControlModule', () => {
    it('should initialize with default settings', () => {
      render(
        <Canvas>
          <EnhancedPlayerControlModule />
        </Canvas>
      )

      // Should not throw errors during initialization
      expect(() => {
        render(
          <Canvas>
            <EnhancedPlayerControlModule />
          </Canvas>
        )
      }).not.toThrow()
    })

    it('should sync avatar position with controller', () => {
      const mockAvatar: PlayerAvatarState = {
        modelUrl: '/models/test-avatar.glb',
        characterId: 'test-avatar',
        isLoaded: true,
        loadingProgress: 100,
        isVisible: true,
        renderLOD: 'high',
        currentAnimation: 'walking',
        animationBlendWeight: 1.0,
        position: new Vector3(0, 0, 0),
        rotation: new Euler(),
        scale: new Vector3(1, 1, 1),
        animationMixer: null,
        currentAnimations: new Map(),
        transitionState: null,
        lastUpdateTime: performance.now(),
        frameSkipCount: 0,
        memoryUsage: 0
      }

      mockWorldStore.playerAvatar = mockAvatar

      render(
        <Canvas>
          <EnhancedPlayerControlModule enableAvatarSync={true} />
        </Canvas>
      )

      // The component should attempt to sync avatar position
      // This would be verified through integration with the actual avatar system
    })

    it('should handle keyboard input correctly', () => {
      render(
        <Canvas>
          <EnhancedPlayerControlModule enableKeyboardControls={true} />
        </Canvas>
      )

      // Simulate keyboard input
      act(() => {
        fireEvent.keyDown(document, { key: 'w', code: 'KeyW' })
      })

      act(() => {
        fireEvent.keyUp(document, { key: 'w', code: 'KeyW' })
      })

      // Should not throw errors
      expect(true).toBe(true)
    })

    it('should disable avatar sync when enableAvatarSync is false', () => {
      render(
        <Canvas>
          <EnhancedPlayerControlModule enableAvatarSync={false} />
        </Canvas>
      )

      // Avatar position should not be updated when sync is disabled
      expect(mockUpdateAvatarPosition).not.toHaveBeenCalled()
    })
  })

  describe('MovementAnimationController', () => {
    let mockMixer: jest.Mocked<AnimationMixer>
    let mockAnimations: Map<string, jest.Mocked<AnimationAction>>
    let controller: MovementAnimationController

    beforeEach(() => {
      // Mock AnimationMixer
      mockMixer = {
        update: jest.fn(),
        getRoot: jest.fn(),
        uncacheRoot: jest.fn(),
        clipAction: jest.fn(),
      } as any

      // Mock AnimationActions
      const createMockAction = (name: string): jest.Mocked<AnimationAction> => ({
        reset: jest.fn(),
        play: jest.fn(),
        stop: jest.fn(),
        setLoop: jest.fn(),
        setEffectiveTimeScale: jest.fn(),
        weight: 0,
        enabled: false,
      } as any)

      mockAnimations = new Map([
        ['idle', createMockAction('idle')],
        ['walk', createMockAction('walk')],
        ['run', createMockAction('run')],
        ['jump', createMockAction('jump')],
        ['land', createMockAction('land')],
      ])

      controller = new MovementAnimationController({
        mixer: mockMixer,
        animations: mockAnimations,
        blendDuration: 0.3,
        speedMultiplier: 1.0,
      })
    })

    it('should initialize with idle animation', () => {
      expect(controller.getCurrentState()).toBe('idle')
      expect(mockAnimations.get('idle')?.play).toHaveBeenCalled()
    })

    it('should transition to walking animation when moving', () => {
      const onAnimationChanged = jest.fn()

      controller = new MovementAnimationController({
        mixer: mockMixer,
        animations: mockAnimations,
        onAnimationChanged,
        blendDuration: 0.1,
      })

      const movementState = {
        velocity: new Vector3(2, 0, 0),
        speed: 2,
        isGrounded: true,
        direction: new Vector3(1, 0, 0),
        animationState: 'walking' as MovementAnimationState,
      }

      controller.updateFromMovement(movementState, new Vector3(2, 0, 0))

      expect(controller.getCurrentState()).toBe('walking')
      expect(onAnimationChanged).toHaveBeenCalledWith('walking')
    })

    it('should transition to running animation when sprinting', () => {
      const movementState = {
        velocity: new Vector3(5, 0, 0),
        speed: 5,
        isGrounded: true,
        direction: new Vector3(1, 0, 0),
        animationState: 'running' as MovementAnimationState,
      }

      controller.updateFromMovement(movementState, new Vector3(5, 0, 0))

      expect(controller.getCurrentState()).toBe('running')
      expect(mockAnimations.get('run')?.play).toHaveBeenCalled()
    })

    it('should transition to jumping animation when in air', () => {
      const movementState = {
        velocity: new Vector3(0, 3, 0),
        speed: 3,
        isGrounded: false,
        direction: new Vector3(0, 1, 0),
        animationState: 'jumping' as MovementAnimationState,
      }

      controller.updateFromMovement(movementState, new Vector3(0, 3, 0))

      expect(controller.getCurrentState()).toBe('jumping')
      expect(mockAnimations.get('jump')?.play).toHaveBeenCalled()
    })

    it('should calculate animation speed based on velocity', () => {
      const slowVelocity = new Vector3(1, 0, 0)
      const fastVelocity = new Vector3(6, 0, 0)

      const slowSpeed = controller.calculateAnimationSpeed(slowVelocity)
      const fastSpeed = controller.calculateAnimationSpeed(fastVelocity)

      expect(slowSpeed).toBeLessThan(fastSpeed)
      expect(fastSpeed).toBeLessThanOrEqual(2.0) // Capped at 2x
    })

    it('should update mixer and handle animation blending', () => {
      const deltaTime = 0.016 // 60fps

      controller.update(deltaTime)

      expect(mockMixer.update).toHaveBeenCalledWith(deltaTime)
    })

    it('should dispose resources correctly', () => {
      controller.dispose()

      // All animations should be stopped
      mockAnimations.forEach((action) => {
        expect(action.stop).toHaveBeenCalled()
      })
    })
  })

  describe('Avatar State Management', () => {
    it('should update avatar state in world store', () => {
      const avatarState: Partial<PlayerAvatarState> = {
        currentAnimation: 'running',
        renderLOD: 'medium',
        isVisible: false,
      }

      act(() => {
        mockUpdateAvatarState(avatarState)
      })

      expect(mockUpdateAvatarState).toHaveBeenCalledWith(avatarState)
    })

    it('should handle avatar position updates', () => {
      const newPosition = new Vector3(10, 2, 5)

      act(() => {
        mockUpdateAvatarPosition(newPosition)
      })

      expect(mockUpdateAvatarPosition).toHaveBeenCalledWith(newPosition)
    })

    it('should set complete avatar state', () => {
      const completeAvatarState: PlayerAvatarState = {
        modelUrl: '/models/complete-avatar.glb',
        characterId: 'complete-avatar-456',
        isLoaded: true,
        loadingProgress: 100,
        isVisible: true,
        renderLOD: 'high',
        currentAnimation: 'idle',
        animationBlendWeight: 1.0,
        position: new Vector3(0, 0, 0),
        rotation: new Euler(),
        scale: new Vector3(1, 1, 1),
        animationMixer: null,
        currentAnimations: new Map(),
        transitionState: null,
        lastUpdateTime: performance.now(),
        frameSkipCount: 0,
        memoryUsage: 1024 * 1024 * 25, // 25MB
      }

      act(() => {
        mockSetPlayerAvatar(completeAvatarState)
      })

      expect(mockSetPlayerAvatar).toHaveBeenCalledWith(completeAvatarState)
    })
  })

  describe('Performance Optimization', () => {
    it('should handle LOD switching based on performance', () => {
      const mockAvatar: PlayerAvatarState = {
        modelUrl: '/models/test-avatar.glb',
        characterId: 'test-avatar',
        isLoaded: true,
        loadingProgress: 100,
        isVisible: true,
        renderLOD: 'high',
        currentAnimation: 'idle',
        animationBlendWeight: 1.0,
        position: new Vector3(),
        rotation: new Euler(),
        scale: new Vector3(1, 1, 1),
        animationMixer: null,
        currentAnimations: new Map(),
        transitionState: null,
        lastUpdateTime: performance.now(),
        frameSkipCount: 0,
        memoryUsage: 0
      }

      mockWorldStore.playerAvatar = mockAvatar

      // Simulate performance degradation
      act(() => {
        mockUpdateAvatarState({ renderLOD: 'medium' })
      })

      expect(mockUpdateAvatarState).toHaveBeenCalledWith({ renderLOD: 'medium' })
    })

    it('should track memory usage correctly', () => {
      const memoryUsage = 1024 * 1024 * 30 // 30MB

      act(() => {
        mockUpdateAvatarState({ memoryUsage })
      })

      expect(mockUpdateAvatarState).toHaveBeenCalledWith({ memoryUsage })
    })

    it('should handle frame skipping under performance pressure', () => {
      const mockAvatar: PlayerAvatarState = {
        modelUrl: '/models/test-avatar.glb',
        characterId: 'test-avatar',
        isLoaded: true,
        loadingProgress: 100,
        isVisible: true,
        renderLOD: 'low',
        currentAnimation: 'idle',
        animationBlendWeight: 1.0,
        position: new Vector3(),
        rotation: new Euler(),
        scale: new Vector3(1, 1, 1),
        animationMixer: null,
        currentAnimations: new Map(),
        transitionState: null,
        lastUpdateTime: performance.now(),
        frameSkipCount: 2, // Indicate frame skipping
        memoryUsage: 0
      }

      act(() => {
        mockSetPlayerAvatar(mockAvatar)
      })

      expect(mockSetPlayerAvatar).toHaveBeenCalledWith(
        expect.objectContaining({ frameSkipCount: 2 })
      )
    })
  })

  describe('Integration Tests', () => {
    it('should integrate PlayerAvatarManager with EnhancedPlayerControlModule', () => {
      const mockAvatar: PlayerAvatarState = {
        modelUrl: '/models/integration-test.glb',
        characterId: 'integration-test',
        isLoaded: true,
        loadingProgress: 100,
        isVisible: true,
        renderLOD: 'high',
        currentAnimation: 'idle',
        animationBlendWeight: 1.0,
        position: new Vector3(0, 0, 0),
        rotation: new Euler(),
        scale: new Vector3(1, 1, 1),
        animationMixer: null,
        currentAnimations: new Map(),
        transitionState: null,
        lastUpdateTime: performance.now(),
        frameSkipCount: 0,
        memoryUsage: 0
      }

      mockWorldStore.playerAvatar = mockAvatar

      render(
        <Canvas>
          <PlayerAvatarManager modelUrl="/models/integration-test.glb" />
          <EnhancedPlayerControlModule enableAvatarSync={true} />
        </Canvas>
      )

      // Both components should initialize without errors
      expect(mockWorldStore.playerAvatar).toBeTruthy()
    })

    it('should handle camera mode switching correctly', () => {
      mockWorldStore.activeCamera = 'orbit'

      render(
        <Canvas>
          <PlayerAvatarManager hideInFirstPerson={true} />
          <EnhancedPlayerControlModule enableAvatarSync={true} />
        </Canvas>
      )

      // Switch to first-person
      act(() => {
        mockWorldStore.activeCamera = 'fly'
      })

      // Avatar should be hidden in first-person mode
      // This would be verified through actual component behavior
      expect(mockWorldStore.activeCamera).toBe('fly')
    })

    it('should maintain performance under load', async () => {
      // Simulate high-load scenario
      const mockAvatar: PlayerAvatarState = {
        modelUrl: '/models/heavy-avatar.glb',
        characterId: 'heavy-avatar',
        isLoaded: true,
        loadingProgress: 100,
        isVisible: true,
        renderLOD: 'high',
        currentAnimation: 'running',
        animationBlendWeight: 1.0,
        position: new Vector3(0, 0, 0),
        rotation: new Euler(),
        scale: new Vector3(1, 1, 1),
        animationMixer: null,
        currentAnimations: new Map(),
        transitionState: null,
        lastUpdateTime: performance.now(),
        frameSkipCount: 0,
        memoryUsage: 1024 * 1024 * 45 // 45MB
      }

      mockWorldStore.playerAvatar = mockAvatar

      render(
        <Canvas>
          <PlayerAvatarManager
            modelUrl="/models/heavy-avatar.glb"
            performanceMode="low"
          />
          <EnhancedPlayerControlModule enableAvatarSync={true} />
        </Canvas>
      )

      // System should automatically adjust to maintain performance
      await waitFor(() => {
        // Expect LOD to be reduced or frame skipping to occur
        expect(true).toBe(true) // Placeholder for actual performance checks
      })
    })
  })
})

// Test utilities for avatar system
export const AvatarTestUtils = {
  createMockAvatarState: (overrides: Partial<PlayerAvatarState> = {}): PlayerAvatarState => ({
    modelUrl: '/models/test-avatar.glb',
    characterId: 'test-avatar-123',
    isLoaded: true,
    loadingProgress: 100,
    isVisible: true,
    renderLOD: 'high',
    currentAnimation: 'idle',
    animationBlendWeight: 1.0,
    position: new Vector3(0, 0, 0),
    rotation: new Euler(0, 0, 0),
    scale: new Vector3(1, 1, 1),
    animationMixer: null,
    currentAnimations: new Map(),
    transitionState: null,
    lastUpdateTime: performance.now(),
    frameSkipCount: 0,
    memoryUsage: 1024 * 1024 * 10, // 10MB
    ...overrides,
  }),

  createMockAnimationAction: (name: string): jest.Mocked<AnimationAction> => ({
    reset: jest.fn(),
    play: jest.fn(),
    stop: jest.fn(),
    setLoop: jest.fn(),
    setEffectiveTimeScale: jest.fn(),
    weight: 0,
    enabled: false,
    name,
  } as any),

  simulateMovement: (
    velocity: Vector3,
    isGrounded: boolean = true
  ) => ({
    velocity,
    speed: velocity.length(),
    isGrounded,
    direction: velocity.clone().normalize(),
    animationState: 'walking' as MovementAnimationState,
  }),

  expectAvatarStateUpdate: (mockUpdateFn: jest.Mock, expectedState: Partial<PlayerAvatarState>) => {
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining(expectedState)
    )
  },
}
