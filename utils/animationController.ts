/**
 * Animation State Controller and Mapping System
 * Manages animation state transitions, priority-based animation selection,
 * and smooth blending between animation states for RPM simulants
 */

import { AnimationAction, AnimationMixer } from 'three'
import type { AISimulant } from '../types'

/**
 * Animation states that simulants can be in
 */
export type AnimationState = 
  | 'idle' 
  | 'walking' 
  | 'running' 
  | 'jumping' 
  | 'building' 
  | 'thinking' 
  | 'communicating' 
  | 'celebrating'

/**
 * Transition configuration for state changes
 */
export interface TransitionConfig {
  duration: number
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
  interrupt: boolean
  priority: number
}

/**
 * Animation mapping with priority system
 */
export interface AnimationMapping {
  primary: string[]
  fallback: string[]
  priority: number
  looping: boolean
  timeScale: number
  blendWeight: number
}

/**
 * Animation blend configuration
 */
export interface BlendAnimation {
  name: string
  weight: number
  timeScale?: number
  fadeInDuration?: number
  fadeOutDuration?: number
}

/**
 * State machine transition rules
 */
export interface StateTransition {
  from: AnimationState
  to: AnimationState
  condition?: (simulant: AISimulant) => boolean
  config: TransitionConfig
}

/**
 * Enhanced action-to-animation mapping using available GLB files
 * Based on the available animation files in public/animation_GLB/
 */
export const ENHANCED_ANIMATION_MAPPING: Record<AnimationState, AnimationMapping> = {
  idle: {
    primary: ['tpose_male'],
    fallback: ['idle_female_1', 'idle_female_2', 'idle_female_3'],
    priority: 1,
    looping: true,
    timeScale: 1.0,
    blendWeight: 1.0
  },
  walking: {
    primary: ['walk_male'],
    fallback: ['crouch_walk_male'],
    priority: 3,
    looping: true,
    timeScale: 1.0,
    blendWeight: 1.0
  },
  running: {
    primary: ['run_male'],
    fallback: ['walk_male'],
    priority: 4,
    looping: true,
    timeScale: 1.2,
    blendWeight: 1.0
  },
  jumping: {
    primary: ['jump_male'],
    fallback: ['walk_male'],
    priority: 5,
    looping: false,
    timeScale: 1.0,
    blendWeight: 1.0
  },
  building: {
    primary: ['expression_male'],
    fallback: ['idle_female_3'],
    priority: 2,
    looping: true,
    timeScale: 0.8,
    blendWeight: 1.0
  },
  communicating: {
    primary: ['talk_male'],
    fallback: ['expression_male'],
    priority: 2,
    looping: true,
    timeScale: 1.0,
    blendWeight: 1.0
  },
  celebrating: {
    primary: ['dance_female'],
    fallback: ['idle_female_1'],
    priority: 2,
    looping: true,
    timeScale: 1.0,
    blendWeight: 1.0
  },
  thinking: {
    primary: ['expression_male'],
    fallback: ['idle_female_2'],
    priority: 1,
    looping: true,
    timeScale: 0.7,
    blendWeight: 1.0
  }
} as const

/**
 * Default transition configurations
 */
export const DEFAULT_TRANSITIONS: Record<string, TransitionConfig> = {
  default: {
    duration: 0.3,
    easing: 'ease-in-out',
    interrupt: true,
    priority: 1
  },
  urgent: {
    duration: 0.1,
    easing: 'ease-out',
    interrupt: true,
    priority: 5
  },
  smooth: {
    duration: 0.5,
    easing: 'ease-in-out',
    interrupt: false,
    priority: 1
  }
} as const

/**
 * State machine transition rules
 */
export const STATE_TRANSITIONS: StateTransition[] = [
  // High priority transitions (can interrupt anything)
  {
    from: 'idle',
    to: 'jumping',
    config: { ...DEFAULT_TRANSITIONS.urgent, priority: 5 }
  },
  {
    from: 'walking',
    to: 'jumping',
    config: { ...DEFAULT_TRANSITIONS.urgent, priority: 5 }
  },
  {
    from: 'running',
    to: 'jumping',
    config: { ...DEFAULT_TRANSITIONS.urgent, priority: 5 }
  },
  
  // Movement transitions
  {
    from: 'idle',
    to: 'walking',
    config: { ...DEFAULT_TRANSITIONS.default, priority: 3 }
  },
  {
    from: 'walking',
    to: 'running',
    config: { ...DEFAULT_TRANSITIONS.default, priority: 4 }
  },
  {
    from: 'running',
    to: 'walking',
    config: { ...DEFAULT_TRANSITIONS.default, priority: 3 }
  },
  {
    from: 'walking',
    to: 'idle',
    config: { ...DEFAULT_TRANSITIONS.smooth, priority: 1 }
  },
  {
    from: 'running',
    to: 'idle',
    config: { ...DEFAULT_TRANSITIONS.smooth, priority: 1 }
  },
  
  // Action transitions
  {
    from: 'idle',
    to: 'building',
    config: { ...DEFAULT_TRANSITIONS.default, priority: 2 }
  },
  {
    from: 'idle',
    to: 'communicating',
    config: { ...DEFAULT_TRANSITIONS.default, priority: 2 }
  },
  {
    from: 'idle',
    to: 'thinking',
    config: { ...DEFAULT_TRANSITIONS.smooth, priority: 1 }
  },
  {
    from: 'building',
    to: 'celebrating',
    config: { ...DEFAULT_TRANSITIONS.default, priority: 2 }
  },
  
  // Return to idle transitions
  {
    from: 'building',
    to: 'idle',
    config: { ...DEFAULT_TRANSITIONS.smooth, priority: 1 }
  },
  {
    from: 'communicating',
    to: 'idle',
    config: { ...DEFAULT_TRANSITIONS.smooth, priority: 1 }
  },
  {
    from: 'thinking',
    to: 'idle',
    config: { ...DEFAULT_TRANSITIONS.smooth, priority: 1 }
  },
  {
    from: 'celebrating',
    to: 'idle',
    config: { ...DEFAULT_TRANSITIONS.smooth, priority: 1 }
  },
  {
    from: 'jumping',
    to: 'idle',
    config: { ...DEFAULT_TRANSITIONS.default, priority: 1 }
  }
]

/**
 * Animation Controller class for managing animation state transitions
 */
export class AnimationController {
  private currentState: AnimationState = 'idle'
  private previousState: AnimationState = 'idle'
  private targetState: AnimationState | null = null
  private transitionStartTime: number = 0
  private transitionDuration: number = 0
  private isTransitioning: boolean = false
  private blendAnimations: Map<string, BlendAnimation> = new Map()
  private availableAnimations: Set<string> = new Set()
  private enableLogging: boolean = false

  constructor(
    private mixer: AnimationMixer,
    private actions: Record<string, AnimationAction | null>,
    options: {
      enableLogging?: boolean
      initialState?: AnimationState
    } = {}
  ) {
    this.enableLogging = options.enableLogging || false
    this.currentState = options.initialState || 'idle'
    
    // Build available animations set
    Object.keys(actions).forEach(name => {
      if (actions[name]) {
        this.availableAnimations.add(name)
      }
    })

    if (this.enableLogging) {
      console.log('🎮 AnimationController initialized with', this.availableAnimations.size, 'animations')
      console.log('🎮 Available animation names:', Array.from(this.availableAnimations))
    }
  }

  /**
   * Get current animation state
   */
  getCurrentState(): AnimationState {
    return this.currentState
  }

  /**
   * Get previous animation state
   */
  getPreviousState(): AnimationState {
    return this.previousState
  }

  /**
   * Check if currently transitioning between states
   */
  isInTransition(): boolean {
    return this.isTransitioning
  }

  /**
   * Get transition progress (0-1)
   */
  getTransitionProgress(): number {
    if (!this.isTransitioning) return 1

    const elapsed = Date.now() - this.transitionStartTime
    return Math.min(elapsed / this.transitionDuration, 1)
  }

  /**
   * Map simulant action to animation state
   */
  mapActionToAnimationState(action: string): AnimationState {
    const lowerAction = action.toLowerCase()

    // Priority-based action mapping
    if (lowerAction.includes('jump') || lowerAction.includes('leap')) {
      return 'jumping'
    } else if (lowerAction.includes('run') || lowerAction.includes('sprint') || lowerAction.includes('rush')) {
      return 'running'
    } else if (lowerAction.includes('walk') || lowerAction.includes('move') || lowerAction.includes('go')) {
      return 'walking'
    } else if (lowerAction.includes('build') || lowerAction.includes('place') || lowerAction.includes('construct') || lowerAction.includes('create')) {
      return 'building'
    } else if (lowerAction.includes('talk') || lowerAction.includes('say') || lowerAction.includes('communicate') || lowerAction.includes('speak')) {
      return 'communicating'
    } else if (lowerAction.includes('think') || lowerAction.includes('consider') || lowerAction.includes('analyze') || lowerAction.includes('ponder')) {
      return 'thinking'
    } else if (lowerAction.includes('celebrate') || lowerAction.includes('dance') || lowerAction.includes('cheer') || lowerAction.includes('victory')) {
      return 'celebrating'
    } else {
      return 'idle'
    }
  }

  /**
   * Get the best available animation for a state
   */
  getAnimationForState(state: AnimationState): string | null {
    const mapping = ENHANCED_ANIMATION_MAPPING[state]
    
    // Try primary animations first
    for (const animName of mapping.primary) {
      if (this.availableAnimations.has(animName)) {
        return animName
      }
    }
    
    // Fall back to fallback animations
    for (const animName of mapping.fallback) {
      if (this.availableAnimations.has(animName)) {
        return animName
      }
    }
    
    if (this.enableLogging) {
      console.warn(`⚠️ No animation found for state: ${state}`)
      console.warn(`🔍 Looking for animations:`, mapping.primary, 'or fallbacks:', mapping.fallback)
      console.warn(`🔍 Available animations:`, Array.from(this.availableAnimations))
    }
    
    return null
  }

  /**
   * Check if transition is allowed based on priority and rules
   */
  canTransitionTo(newState: AnimationState): boolean {
    if (newState === this.currentState) {
      return false // Already in this state
    }

    // Find transition rule
    const transition = STATE_TRANSITIONS.find(t => 
      t.from === this.currentState && t.to === newState
    )

    if (!transition) {
      // No specific rule, allow if not transitioning or if higher priority
      if (!this.isTransitioning) return true
      
      const currentMapping = ENHANCED_ANIMATION_MAPPING[this.currentState]
      const newMapping = ENHANCED_ANIMATION_MAPPING[newState]
      
      return newMapping.priority >= currentMapping.priority
    }

    // Check if transition can interrupt current state
    if (this.isTransitioning && !transition.config.interrupt) {
      return false
    }

    return true
  }

  /**
   * Transition to a new animation state
   */
  transitionTo(newState: AnimationState, options: {
    force?: boolean
    customDuration?: number
    customEasing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
  } = {}): boolean {
    if (!options.force && !this.canTransitionTo(newState)) {
      if (this.enableLogging) {
        console.log(`🚫 Transition blocked: ${this.currentState} -> ${newState}`)
      }
      return false
    }

    const animationName = this.getAnimationForState(newState)
    if (!animationName) {
      if (this.enableLogging) {
        console.warn(`⚠️ No animation available for state: ${newState}`)
      }
      return false
    }

    const action = this.actions[animationName]
    if (!action) {
      if (this.enableLogging) {
        console.warn(`⚠️ Animation action not found: ${animationName}`)
      }
      return false
    }

    // Get transition configuration
    const transition = STATE_TRANSITIONS.find(t => 
      t.from === this.currentState && t.to === newState
    ) || { config: DEFAULT_TRANSITIONS.default }

    const duration = options.customDuration || transition.config.duration
    const mapping = ENHANCED_ANIMATION_MAPPING[newState]

    // Stop current animation with fade out
    const currentAnimationName = this.getAnimationForState(this.currentState)
    if (currentAnimationName && this.actions[currentAnimationName]) {
      this.actions[currentAnimationName]!.fadeOut(duration)
    }

    // Configure and start new animation
    action.reset()
    action.setLoop(mapping.looping ? 2201 : 2200, mapping.looping ? Infinity : 1)
    action.timeScale = mapping.timeScale
    action.weight = mapping.blendWeight
    action.fadeIn(duration)
    action.play()

    // Update state
    this.previousState = this.currentState
    this.currentState = newState
    this.targetState = null
    this.transitionStartTime = Date.now()
    this.transitionDuration = duration * 1000 // Convert to milliseconds
    this.isTransitioning = true

    if (this.enableLogging) {
      console.log(`🎬 Transitioning: ${this.previousState} -> ${this.currentState} (${animationName})`)
    }

    // Set up transition completion
    setTimeout(() => {
      this.isTransitioning = false
      if (this.enableLogging) {
        console.log(`✅ Transition complete: ${this.currentState}`)
      }
    }, this.transitionDuration)

    return true
  }

  /**
   * Add or update a blend animation
   */
  setBlendAnimation(name: string, config: BlendAnimation): void {
    this.blendAnimations.set(name, config)
    
    const action = this.actions[name]
    if (action) {
      action.weight = config.weight
      if (config.timeScale !== undefined) {
        action.timeScale = config.timeScale
      }
      
      if (config.fadeInDuration && config.weight > 0) {
        action.fadeIn(config.fadeInDuration)
      } else if (config.fadeOutDuration && config.weight === 0) {
        action.fadeOut(config.fadeOutDuration)
      }
    }
  }

  /**
   * Remove a blend animation
   */
  removeBlendAnimation(name: string): void {
    const config = this.blendAnimations.get(name)
    if (config && config.fadeOutDuration) {
      const action = this.actions[name]
      if (action) {
        action.fadeOut(config.fadeOutDuration)
      }
    }
    
    this.blendAnimations.delete(name)
  }

  /**
   * Set blend weight for an animation
   */
  setBlendWeight(animationName: string, weight: number): void {
    const action = this.actions[animationName]
    if (action) {
      action.weight = Math.max(0, Math.min(1, weight))
      
      // Update blend animation config if it exists
      const blendConfig = this.blendAnimations.get(animationName)
      if (blendConfig) {
        blendConfig.weight = weight
      }
    }
  }

  /**
   * Get all active blend animations
   */
  getActiveBlendAnimations(): Map<string, BlendAnimation> {
    return new Map(this.blendAnimations)
  }

  /**
   * Update the controller (should be called in animation loop)
   */
  update(deltaTime: number): void {
    // Update mixer
    this.mixer.update(deltaTime)
    
    // Handle automatic state transitions (e.g., jump -> idle)
    if (!this.isTransitioning && this.currentState === 'jumping') {
      const currentAction = this.actions[this.getAnimationForState('jumping')!]
      if (currentAction && !currentAction.isRunning()) {
        this.transitionTo('idle')
      }
    }
  }

  /**
   * Get debug information
   */
  getDebugInfo(): {
    currentState: AnimationState
    previousState: AnimationState
    isTransitioning: boolean
    transitionProgress: number
    availableAnimations: string[]
    activeBlends: string[]
  } {
    return {
      currentState: this.currentState,
      previousState: this.previousState,
      isTransitioning: this.isTransitioning,
      transitionProgress: this.getTransitionProgress(),
      availableAnimations: Array.from(this.availableAnimations),
      activeBlends: Array.from(this.blendAnimations.keys())
    }
  }

  /**
   * Dispose of the controller
   */
  dispose(): void {
    this.mixer.stopAllAction()
    this.blendAnimations.clear()
    this.availableAnimations.clear()
  }
}