'use client'

import React, { useRef, useCallback, useState, useEffect } from 'react'
import { AnimationAction, AnimationMixer, Vector3 } from 'three'
import {
  MovementAnimationState,
  MovementState,
  MovementAnimationController as IMovementAnimationController,
  AnimationTransition,
  EasingFunction
} from '../../types/playerAvatar'

interface MovementAnimationControllerProps {
  mixer: AnimationMixer
  animations: Map<string, AnimationAction>
  onAnimationChanged?: (animation: MovementAnimationState) => void
  blendDuration?: number
  speedMultiplier?: number
}

interface AnimationStateConfig {
  name: string
  action: AnimationAction
  priority: number
  blendWeight: number
  targetWeight: number
  fadeSpeed: number
  speedScale: number
  isActive: boolean
}

/**
 * MovementAnimationController - Manages movement-based animations for player avatars
 * Handles smooth transitions between idle, walk, run, jump, and land states
 */
export class MovementAnimationController implements IMovementAnimationController {
  // Animation Actions
  idle: AnimationAction
  walk: AnimationAction
  run: AnimationAction
  jump: AnimationAction
  land: AnimationAction

  // State Management
  currentState: MovementAnimationState = 'idle'
  previousState: MovementAnimationState = 'idle'
  transitionStartTime: number = 0
  transitionDuration: number = 0.3

  // Animation Management
  private mixer: AnimationMixer
  private animationStates = new Map<MovementAnimationState, AnimationStateConfig>()
  private activeTransitions = new Map<string, AnimationTransition>()

  // Configuration
  private blendDuration: number
  private speedMultiplier: number
  private onAnimationChanged?: (animation: MovementAnimationState) => void

  // Performance tracking
  private lastUpdateTime: number = 0
  private frameSkipCounter: number = 0
  private maxFrameSkips: number = 3

  constructor({
    mixer,
    animations,
    onAnimationChanged,
    blendDuration = 0.3,
    speedMultiplier = 1.0
  }: MovementAnimationControllerProps) {
    this.mixer = mixer
    this.blendDuration = blendDuration
    this.speedMultiplier = speedMultiplier
    this.onAnimationChanged = onAnimationChanged

    // Initialize animation actions
    this.idle = this.getAnimationAction(animations, ['idle', 'Idle', 'idle_pose'])
    this.walk = this.getAnimationAction(animations, ['walk', 'Walk', 'walking'])
    this.run = this.getAnimationAction(animations, ['run', 'Run', 'running'])
    this.jump = this.getAnimationAction(animations, ['jump', 'Jump', 'jumping'])
    this.land = this.getAnimationAction(animations, ['land', 'Land', 'landing'])

    this.setupAnimationStates()
    this.initializeController()
  }

  /**
   * Transition to a new animation state with blending
   */
  transitionToState(newState: MovementAnimationState, duration?: number): void {
    if (newState === this.currentState) return

    const transitionDuration = duration || this.blendDuration
    const currentTime = performance.now()

    // Store previous state
    this.previousState = this.currentState
    this.currentState = newState
    this.transitionStartTime = currentTime
    this.transitionDuration = transitionDuration

    // Get animation configurations
    const fromConfig = this.animationStates.get(this.previousState)
    const toConfig = this.animationStates.get(newState)

    if (!fromConfig || !toConfig) {
      console.warn(`Invalid animation state transition: ${this.previousState} -> ${newState}`)
      return
    }

    // Setup transition
    const transitionKey = `${this.previousState}_to_${newState}`
    const transition: AnimationTransition = {
      from: this.previousState,
      to: newState,
      duration: transitionDuration,
      startTime: currentTime,
      easing: this.getEasingForTransition(this.previousState, newState)
    }

    this.activeTransitions.set(transitionKey, transition)

    // Start new animation
    toConfig.action.reset()
    toConfig.action.play()
    toConfig.action.weight = 0
    toConfig.isActive = true
    toConfig.targetWeight = 1

    // Fade out current animation
    if (fromConfig.isActive) {
      fromConfig.targetWeight = 0
      fromConfig.fadeSpeed = 1 / transitionDuration
    }

    // Set fade speed for new animation
    toConfig.fadeSpeed = 1 / transitionDuration

    // Callback
    this.onAnimationChanged?.(newState)

    console.log(`🎭 Animation transition: ${this.previousState} -> ${newState} (${transitionDuration}s)`)
  }

  /**
   * Update animations based on movement state
   */
  updateFromMovement(movementState: MovementState, velocity: Vector3): void {
    const speed = velocity.length()
    const isMoving = speed > 0.1
    const isFast = speed > 4.0
    const isGrounded = movementState.isGrounded

    let targetState: MovementAnimationState = 'idle'

    // Determine target animation state
    if (!isGrounded) {
      if (velocity.y > 0.5) {
        targetState = 'jumping'
      } else if (velocity.y < -1.0) {
        targetState = 'falling'
      }
    } else if (isMoving) {
      if (isFast) {
        targetState = 'running'
      } else {
        targetState = 'walking'
      }
    } else if (this.currentState === 'falling') {
      targetState = 'landing'
    }

    // Transition if state changed
    if (targetState !== this.currentState) {
      this.transitionToState(targetState)
    }

    // Update animation speed based on movement
    this.updateAnimationSpeeds(speed)
  }

  /**
   * Calculate animation speed multiplier based on velocity
   */
  calculateAnimationSpeed(velocity: Vector3): number {
    const speed = velocity.length()

    // Base speed scaling
    if (speed < 0.1) return 1.0 // Idle
    if (speed < 2.0) return Math.max(0.5, speed / 2.0) // Walking
    if (speed < 6.0) return Math.max(1.0, speed / 4.0) // Running

    return Math.min(2.0, speed / 6.0) // Cap at 2x speed
  }

  /**
   * Update animation system (called from render loop)
   */
  update(deltaTime: number): void {
    const currentTime = performance.now()

    // Skip frame if needed for performance
    if (this.shouldSkipFrame(currentTime)) {
      this.frameSkipCounter++
      return
    }

    this.frameSkipCounter = 0

    // Update animation mixer
    if (this.mixer) {
      this.mixer.update(deltaTime)
    }

    // Update animation blending
    this.updateAnimationBlending(deltaTime)

    // Process active transitions
    this.processTransitions(currentTime)

    // Cleanup finished animations
    this.cleanupAnimations()

    this.lastUpdateTime = currentTime
  }

  /**
   * Get current animation state
   */
  getCurrentState(): MovementAnimationState {
    return this.currentState
  }

  /**
   * Get animation action by name with fallbacks
   */
  private getAnimationAction(
    animations: Map<string, AnimationAction>,
    possibleNames: string[]
  ): AnimationAction {
    for (const name of possibleNames) {
      const action = animations.get(name)
      if (action) return action
    }

    console.warn(`No animation found for names: ${possibleNames.join(', ')}`)
    // Return first available animation as fallback
    return animations.values().next().value || new AnimationAction(this.mixer, null, null)
  }

  /**
   * Setup initial animation state configurations
   */
  private setupAnimationStates(): void {
    const states: Array<{
      state: MovementAnimationState
      action: AnimationAction
      priority: number
      speedScale: number
    }> = [
      { state: 'idle', action: this.idle, priority: 1, speedScale: 1.0 },
      { state: 'walking', action: this.walk, priority: 2, speedScale: 1.0 },
      { state: 'running', action: this.run, priority: 3, speedScale: 1.0 },
      { state: 'jumping', action: this.jump, priority: 4, speedScale: 1.2 },
      { state: 'falling', action: this.jump, priority: 4, speedScale: 0.8 }, // Reuse jump
      { state: 'landing', action: this.land, priority: 5, speedScale: 1.0 }
    ]

    states.forEach(({ state, action, priority, speedScale }) => {
      const config: AnimationStateConfig = {
        name: state,
        action,
        priority,
        blendWeight: 0,
        targetWeight: state === 'idle' ? 1 : 0,
        fadeSpeed: 1 / this.blendDuration,
        speedScale,
        isActive: state === 'idle'
      }

      this.animationStates.set(state, config)

      // Configure action
      action.weight = config.blendWeight
      action.enabled = config.isActive
      if (state === 'idle') {
        action.play()
      }
    })
  }

  /**
   * Initialize the controller
   */
  private initializeController(): void {
    // Start with idle animation
    const idleConfig = this.animationStates.get('idle')
    if (idleConfig) {
      idleConfig.action.play()
      idleConfig.isActive = true
      idleConfig.blendWeight = 1
      idleConfig.action.weight = 1
    }

    console.log('🎮 Movement Animation Controller initialized')
  }

  /**
   * Update animation blending weights
   */
  private updateAnimationBlending(deltaTime: number): void {
    this.animationStates.forEach((config, state) => {
      if (!config.isActive && config.blendWeight < 0.01) return

      // Smooth weight transitions
      const weightDiff = config.targetWeight - config.blendWeight
      if (Math.abs(weightDiff) > 0.01) {
        config.blendWeight += weightDiff * config.fadeSpeed * deltaTime
        config.blendWeight = Math.max(0, Math.min(1, config.blendWeight))

        // Update Three.js action weight
        config.action.weight = config.blendWeight

        // Enable/disable action based on weight
        if (config.blendWeight > 0.01) {
          config.action.enabled = true
          config.isActive = true
        } else {
          config.action.enabled = false
          config.isActive = false
        }
      }
    })
  }

  /**
   * Process active transitions
   */
  private processTransitions(currentTime: number): void {
    const completedTransitions: string[] = []

    this.activeTransitions.forEach((transition, key) => {
      const elapsed = currentTime - transition.startTime
      const progress = Math.min(elapsed / (transition.duration * 1000), 1)

      if (progress >= 1) {
        // Transition complete
        completedTransitions.push(key)

        // Finalize weights
        const toConfig = this.animationStates.get(transition.to)
        const fromConfig = this.animationStates.get(transition.from)

        if (toConfig) {
          toConfig.blendWeight = toConfig.targetWeight
          toConfig.action.weight = toConfig.blendWeight
        }

        if (fromConfig && fromConfig.targetWeight === 0) {
          fromConfig.action.stop()
          fromConfig.isActive = false
          fromConfig.blendWeight = 0
        }
      }
    })

    // Clean up completed transitions
    completedTransitions.forEach(key => {
      this.activeTransitions.delete(key)
    })
  }

  /**
   * Update animation playback speeds
   */
  private updateAnimationSpeeds(movementSpeed: number): void {
    const speedMultiplier = this.calculateAnimationSpeed(new Vector3(movementSpeed, 0, 0))

    this.animationStates.forEach((config) => {
      if (config.isActive) {
        const finalSpeed = speedMultiplier * config.speedScale * this.speedMultiplier
        config.action.setEffectiveTimeScale(finalSpeed)
      }
    })
  }

  /**
   * Get appropriate easing function for transition
   */
  private getEasingForTransition(
    from: MovementAnimationState,
    to: MovementAnimationState
  ): EasingFunction {
    // Quick transitions for responsiveness
    if (from === 'idle' || to === 'idle') return 'easeOut'
    if (from === 'walking' && to === 'running') return 'easeIn'
    if (from === 'running' && to === 'walking') return 'easeOut'
    if (to === 'jumping' || to === 'falling') return 'easeIn'
    if (to === 'landing') return 'bounce'

    return 'easeInOut'
  }

  /**
   * Check if frame should be skipped for performance
   */
  private shouldSkipFrame(currentTime: number): boolean {
    if (this.frameSkipCounter >= this.maxFrameSkips) return false

    const deltaTime = currentTime - this.lastUpdateTime
    return deltaTime < 8 // Skip if less than 8ms since last update
  }

  /**
   * Cleanup unused animations
   */
  private cleanupAnimations(): void {
    this.animationStates.forEach((config, state) => {
      if (!config.isActive && config.blendWeight < 0.001) {
        config.action.stop()
      }
    })
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.activeTransitions.clear()

    this.animationStates.forEach((config) => {
      config.action.stop()
    })

    this.animationStates.clear()
    console.log('🗑️ Movement Animation Controller disposed')
  }
}

/**
 * React Hook for Movement Animation Controller
 */
export function useMovementAnimationController(
  mixer: AnimationMixer | null,
  animations: Map<string, AnimationAction>,
  options: {
    onAnimationChanged?: (animation: MovementAnimationState) => void
    blendDuration?: number
    speedMultiplier?: number
  } = {}
) {
  const controllerRef = useRef<MovementAnimationController>()
  const [currentState, setCurrentState] = useState<MovementAnimationState>('idle')

  // Initialize controller
  useEffect(() => {
    if (mixer && animations.size > 0) {
      controllerRef.current = new MovementAnimationController({
        mixer,
        animations,
        onAnimationChanged: (state) => {
          setCurrentState(state)
          options.onAnimationChanged?.(state)
        },
        blendDuration: options.blendDuration,
        speedMultiplier: options.speedMultiplier
      })

      console.log('✅ Movement Animation Controller created')

      return () => {
        if (controllerRef.current) {
          controllerRef.current.dispose()
          controllerRef.current = undefined
        }
      }
    }
  }, [mixer, animations, options.onAnimationChanged, options.blendDuration, options.speedMultiplier])

  const transitionToState = useCallback((state: MovementAnimationState, duration?: number) => {
    controllerRef.current?.transitionToState(state, duration)
  }, [])

  const updateFromMovement = useCallback((movementState: MovementState, velocity: Vector3) => {
    controllerRef.current?.updateFromMovement(movementState, velocity)
  }, [])

  const update = useCallback((deltaTime: number) => {
    controllerRef.current?.update(deltaTime)
  }, [])

  return {
    controller: controllerRef.current,
    currentState,
    transitionToState,
    updateFromMovement,
    update
  }
}

export default MovementAnimationController
