import { devLog, devWarn } from "@/utils/devLogger";

/**
 * Enhanced animation management hook for Ready Player Me avatars
 * Extends React Three Fiber's useAnimations with external clip support,
 * state management, and cross-fade transitions
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations } from '@react-three/drei'
import { AnimationClip, AnimationMixer, AnimationAction, Object3D } from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'

/**
 * Animation playback options
 */
export interface PlayOptions {
  loop?: boolean
  crossFadeDuration?: number
  timeScale?: number
  startTime?: number
  weight?: number
  clampWhenFinished?: boolean
}

/**
 * Animation transition options
 */
export interface TransitionOptions {
  duration?: number
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out'
  interrupt?: boolean
}

/**
 * Animation state information
 */
export interface AnimationState {
  currentAnimation: string | null
  previousAnimation: string | null
  isPlaying: boolean
  isPaused: boolean
  transitionProgress: number
  playbackTime: number
  duration: number
  weight: number
}

/**
 * Animation manager interface
 */
export interface AnimationManager {
  // Core animation control
  playAnimation: (name: string, options?: PlayOptions) => void
  stopAnimation: (name: string) => void
  pauseAnimation: (name: string) => void
  resumeAnimation: (name: string) => void
  crossFadeToAnimation: (name: string, duration?: number, options?: TransitionOptions) => void
  
  // State management
  state: AnimationState
  availableAnimations: string[]
  
  // Animation actions (from R3F useAnimations)
  actions: Record<string, AnimationAction | null>
  mixer: AnimationMixer | null
  
  // Performance optimization
  setLODLevel: (level: 'high' | 'medium' | 'low') => void
  pauseAllAnimations: () => void
  resumeAllAnimations: () => void
  
  // Event callbacks
  onAnimationStart?: (name: string) => void
  onAnimationEnd?: (name: string) => void
  onAnimationLoop?: (name: string) => void
  onTransitionComplete?: (from: string, to: string) => void
}

/**
 * Hook options
 */
export interface UseRPMAnimationsOptions {
  autoPlay?: string
  crossFadeDuration?: number
  enableLOD?: boolean
  performanceMode?: 'quality' | 'balanced' | 'performance'
  enableLogging?: boolean
  onAnimationStart?: (name: string) => void
  onAnimationEnd?: (name: string) => void
  onAnimationLoop?: (name: string) => void
  onTransitionComplete?: (from: string, to: string) => void
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<Omit<UseRPMAnimationsOptions, 'autoPlay' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationLoop' | 'onTransitionComplete'>> = {
  crossFadeDuration: 0.3,
  enableLOD: true,
  performanceMode: 'balanced',
  enableLogging: false
}

/**
 * Performance presets for different LOD levels
 */
const LOD_PRESETS = {
  high: {
    updateFrequency: 60,
    enableBlending: true,
    maxActiveAnimations: 10
  },
  medium: {
    updateFrequency: 30,
    enableBlending: true,
    maxActiveAnimations: 5
  },
  low: {
    updateFrequency: 15,
    enableBlending: false,
    maxActiveAnimations: 2
  }
} as const

/**
 * Enhanced animation management hook for Ready Player Me avatars
 * 
 * @param gltf - The loaded GLTF object containing the avatar
 * @param externalClips - Map of external animation clips to integrate
 * @param options - Configuration options
 * @returns Animation manager with enhanced functionality
 */
export function useRPMAnimations(
  gltf: GLTF | any, // Allow for extended GLTF types from useGLTF
  externalClips: Map<string, AnimationClip> = new Map(),
  options: UseRPMAnimationsOptions = {}
): AnimationManager {
  const config = { ...DEFAULT_OPTIONS, ...options }
  
  // Combine built-in animations with external clips
  const allAnimations = useMemo(() => {
    const combined = [...(gltf.animations || [])]
    
    // Add external clips
    externalClips.forEach((clip, name) => {
      // Clone the clip to avoid modifying the original
      const clonedClip = clip.clone()
      clonedClip.name = name
      combined.push(clonedClip)
    })
    
    return combined
  }, [gltf.animations, externalClips])
  
  // Use React Three Fiber's useAnimations hook with combined animations
  const { actions, mixer } = useAnimations(allAnimations, gltf.scene)
  
  // Animation state
  const [state, setState] = useState<AnimationState>({
    currentAnimation: null,
    previousAnimation: null,
    isPlaying: false,
    isPaused: false,
    transitionProgress: 0,
    playbackTime: 0,
    duration: 0,
    weight: 1
  })
  
  // Internal state refs
  const currentActionRef = useRef<AnimationAction | null>(null)
  const previousActionRef = useRef<AnimationAction | null>(null)
  const transitionRef = useRef<{
    from: string
    to: string
    startTime: number
    duration: number
    onComplete?: () => void
  } | null>(null)
  const lodLevelRef = useRef<'high' | 'medium' | 'low'>('high')
  const updateFrequencyRef = useRef(60)
  const lastUpdateTimeRef = useRef(0)
  
  // Available animations list
  const availableAnimations = useMemo(() => {
    return Object.keys(actions).filter(name => actions[name] !== null)
  }, [actions])
  
  /**
   * Play an animation with options
   */
  const playAnimation = useCallback((name: string, playOptions: PlayOptions = {}) => {
    const action = actions[name]
    if (!action) {
      if (config.enableLogging) {
        devWarn(`Animation "${name}" not found`)
      }
      return
    }
    
    const {
      loop = true,
      crossFadeDuration = config.crossFadeDuration,
      timeScale = 1,
      startTime = 0,
      weight = 1,
      clampWhenFinished = false
    } = playOptions
    
    // Stop current animation if different
    if (currentActionRef.current && currentActionRef.current !== action) {
      if (crossFadeDuration > 0) {
        currentActionRef.current.fadeOut(crossFadeDuration)
      } else {
        currentActionRef.current.stop()
      }
      previousActionRef.current = currentActionRef.current
    }
    
    // Configure and start new animation
    action.reset()
    action.setLoop(loop ? 2201 : 2200, loop ? Infinity : 1) // LoopRepeat : LoopOnce
    action.timeScale = timeScale
    action.time = startTime
    action.weight = weight
    action.clampWhenFinished = clampWhenFinished
    
    if (crossFadeDuration > 0) {
      action.fadeIn(crossFadeDuration)
    }
    
    action.play()
    
    // Update refs and state
    currentActionRef.current = action
    setState(prev => ({
      ...prev,
      currentAnimation: name,
      previousAnimation: prev.currentAnimation,
      isPlaying: true,
      isPaused: false,
      duration: action.getClip().duration,
      weight
    }))
    
    // Call event callback
    if (config.onAnimationStart) {
      config.onAnimationStart(name)
    }
    
    if (config.enableLogging) {
      devLog(`🎬 Playing animation: ${name}`)
    }
  }, [actions, config])
  
  /**
   * Stop an animation
   */
  const stopAnimation = useCallback((name: string) => {
    const action = actions[name]
    if (!action) return
    
    action.stop()
    
    if (currentActionRef.current === action) {
      currentActionRef.current = null
      setState(prev => ({
        ...prev,
        currentAnimation: null,
        isPlaying: false,
        playbackTime: 0
      }))
    }
    
    if (config.enableLogging) {
      devLog(`⏹️ Stopped animation: ${name}`)
    }
  }, [actions, config])
  
  /**
   * Pause an animation
   */
  const pauseAnimation = useCallback((name: string) => {
    const action = actions[name]
    if (!action) return
    
    action.paused = true
    
    if (currentActionRef.current === action) {
      setState(prev => ({
        ...prev,
        isPaused: true
      }))
    }
    
    if (config.enableLogging) {
      devLog(`⏸️ Paused animation: ${name}`)
    }
  }, [actions, config])
  
  /**
   * Resume a paused animation
   */
  const resumeAnimation = useCallback((name: string) => {
    const action = actions[name]
    if (!action) return
    
    action.paused = false
    
    if (currentActionRef.current === action) {
      setState(prev => ({
        ...prev,
        isPaused: false
      }))
    }
    
    if (config.enableLogging) {
      devLog(`▶️ Resumed animation: ${name}`)
    }
  }, [actions, config])
  
  /**
   * Cross-fade to a new animation
   */
  const crossFadeToAnimation = useCallback((
    name: string, 
    duration: number = config.crossFadeDuration,
    transitionOptions: TransitionOptions = {}
  ) => {
    const action = actions[name]
    if (!action) {
      if (config.enableLogging) {
        devWarn(`Animation "${name}" not found for cross-fade`)
      }
      return
    }
    
    const currentName = state.currentAnimation
    if (currentName === name) {
      return // Already playing this animation
    }
    
    // Set up transition tracking
    if (currentName) {
      transitionRef.current = {
        from: currentName,
        to: name,
        startTime: Date.now(),
        duration: duration * 1000, // Convert to milliseconds
        onComplete: () => {
          if (config.onTransitionComplete) {
            config.onTransitionComplete(currentName, name)
          }
        }
      }
    }
    
    // Play the new animation with cross-fade
    playAnimation(name, {
      crossFadeDuration: duration,
      ...transitionOptions
    })
    
    if (config.enableLogging) {
      devLog(`🔄 Cross-fading from "${currentName}" to "${name}" over ${duration}s`)
    }
  }, [actions, state.currentAnimation, config, playAnimation])
  
  /**
   * Set LOD level for performance optimization
   */
  const setLODLevel = useCallback((level: 'high' | 'medium' | 'low') => {
    lodLevelRef.current = level
    const preset = LOD_PRESETS[level]
    updateFrequencyRef.current = preset.updateFrequency
    

  }, [config])
  
  /**
   * Pause all animations
   */
  const pauseAllAnimations = useCallback(() => {
    Object.values(actions).forEach(action => {
      if (action) {
        action.paused = true
      }
    })
    
    setState(prev => ({
      ...prev,
      isPaused: true
    }))
  }, [actions])
  
  /**
   * Resume all animations
   */
  const resumeAllAnimations = useCallback(() => {
    Object.values(actions).forEach(action => {
      if (action) {
        action.paused = false
      }
    })
    
    setState(prev => ({
      ...prev,
      isPaused: false
    }))
  }, [actions])
  
  // Auto-play animation on mount
  useEffect(() => {
    if (config.autoPlay && availableAnimations.includes(config.autoPlay)) {
      playAnimation(config.autoPlay)
    }
  }, [config.autoPlay, availableAnimations, playAnimation])
  
  // Handle animation events
  useEffect(() => {
    if (!mixer) return
    
    const handleFinished = (event: any) => {
      const action = event.action as AnimationAction
      const animationName = action.getClip().name
      
      if (config.onAnimationEnd) {
        config.onAnimationEnd(animationName)
      }
      
      // Update state if this was the current animation
      if (currentActionRef.current === action) {
        setState(prev => ({
          ...prev,
          isPlaying: false,
          playbackTime: 0
        }))
      }
      
      if (config.enableLogging) {
        devLog(`🏁 Animation finished: ${animationName}`)
      }
    }
    
    const handleLoop = (event: any) => {
      const action = event.action as AnimationAction
      const animationName = action.getClip().name
      
      if (config.onAnimationLoop) {
        config.onAnimationLoop(animationName)
      }
      
      if (config.enableLogging) {
        devLog(`🔄 Animation looped: ${animationName}`)
      }
    }
    
    mixer.addEventListener('finished', handleFinished)
    mixer.addEventListener('loop', handleLoop)
    
    return () => {
      mixer.removeEventListener('finished', handleFinished)
      mixer.removeEventListener('loop', handleLoop)
    }
  }, [mixer, config])
  
  // Update animation state and handle transitions
  useFrame((_, delta) => {
    const now = Date.now()
    
    // Throttle updates based on LOD level
    if (now - lastUpdateTimeRef.current < 1000 / updateFrequencyRef.current) {
      return
    }
    lastUpdateTimeRef.current = now
    
    // Update transition progress
    if (transitionRef.current) {
      const elapsed = now - transitionRef.current.startTime
      const progress = Math.min(elapsed / transitionRef.current.duration, 1)
      
      setState(prev => ({
        ...prev,
        transitionProgress: progress
      }))
      
      // Complete transition
      if (progress >= 1) {
        if (transitionRef.current.onComplete) {
          transitionRef.current.onComplete()
        }
        transitionRef.current = null
        
        setState(prev => ({
          ...prev,
          transitionProgress: 0
        }))
      }
    }
    
    // Update playback time for current animation
    if (currentActionRef.current && !currentActionRef.current.paused) {
      const action = currentActionRef.current
      setState(prev => ({
        ...prev,
        playbackTime: action.time,
        weight: action.weight
      }))
    }
  })
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mixer) {
        mixer.stopAllAction()
      }
    }
  }, [mixer])
  
  return {
    // Core animation control
    playAnimation,
    stopAnimation,
    pauseAnimation,
    resumeAnimation,
    crossFadeToAnimation,
    
    // State management
    state,
    availableAnimations,
    
    // Animation actions and mixer
    actions,
    mixer,
    
    // Performance optimization
    setLODLevel,
    pauseAllAnimations,
    resumeAllAnimations,
    
    // Event callbacks (passed through from options)
    onAnimationStart: config.onAnimationStart,
    onAnimationEnd: config.onAnimationEnd,
    onAnimationLoop: config.onAnimationLoop,
    onTransitionComplete: config.onTransitionComplete
  }
}

// Types are already exported inline above