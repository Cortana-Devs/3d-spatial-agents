/**
 * Animation Controller Hook
 * Integrates AnimationController with React Three Fiber and simulant state management
 */

import { useRef, useEffect, useCallback, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { AnimationController, AnimationState } from './animationController'
import { AnimationManager } from './useRPMAnimations'
import type { AISimulant } from '../types'

/**
 * Animation controller hook options
 */
export interface UseAnimationControllerOptions {
  enableLogging?: boolean
  autoTransition?: boolean
  transitionDelay?: number
  enableBlending?: boolean
}

/**
 * Animation controller state
 */
export interface AnimationControllerState {
  currentState: AnimationState
  previousState: AnimationState
  isTransitioning: boolean
  transitionProgress: number
  canTransition: (state: AnimationState) => boolean
}

/**
 * Animation controller interface
 */
export interface AnimationControllerInterface {
  // State management
  state: AnimationControllerState
  
  // Control methods
  transitionTo: (state: AnimationState, options?: { force?: boolean; customDuration?: number }) => boolean
  mapActionToState: (action: string) => AnimationState
  setBlendWeight: (animationName: string, weight: number) => void
  
  // Blend animation management
  addBlendAnimation: (name: string, weight: number, options?: { timeScale?: number; fadeIn?: number }) => void
  removeBlendAnimation: (name: string, fadeOut?: number) => void
  
  // Debug and monitoring
  getDebugInfo: () => any
  getAvailableStates: () => AnimationState[]
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<UseAnimationControllerOptions> = {
  enableLogging: false,
  autoTransition: true,
  transitionDelay: 100, // ms
  enableBlending: true
}

/**
 * Hook for managing animation state controller with simulant integration
 */
export function useAnimationController(
  animationManager: AnimationManager,
  simulant: AISimulant,
  options: UseAnimationControllerOptions = {}
): AnimationControllerInterface {
  const config = { ...DEFAULT_OPTIONS, ...options }
  
  // Animation controller instance
  const controllerRef = useRef<AnimationController | null>(null)
  const lastActionRef = useRef<string>('')
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // State management
  const [controllerState, setControllerState] = useState<AnimationControllerState>({
    currentState: 'idle',
    previousState: 'idle',
    isTransitioning: false,
    transitionProgress: 0,
    canTransition: () => false
  })

  // Initialize controller when mixer and actions are available
  useEffect(() => {
    if (animationManager.mixer && animationManager.actions) {
      controllerRef.current = new AnimationController(
        animationManager.mixer,
        animationManager.actions,
        {
          enableLogging: config.enableLogging,
          initialState: 'idle'
        }
      )

      if (config.enableLogging) {
        console.log('🎮 Animation controller initialized for simulant:', simulant.id)
      }

      return () => {
        if (controllerRef.current) {
          controllerRef.current.dispose()
          controllerRef.current = null
        }
      }
    }
  }, [animationManager.mixer, animationManager.actions, simulant.id, config.enableLogging])

  // Handle simulant action changes with debouncing
  useEffect(() => {
    if (!controllerRef.current || !config.autoTransition) return

    const currentAction = simulant.lastAction
    if (currentAction === lastActionRef.current) return

    lastActionRef.current = currentAction

    // Clear existing timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current)
    }

    // Debounce transitions to avoid rapid state changes
    transitionTimeoutRef.current = setTimeout(() => {
      if (controllerRef.current) {
        const newState = controllerRef.current.mapActionToAnimationState(currentAction)
        
        if (config.enableLogging) {
          console.log(`🎯 Action "${currentAction}" mapped to state: ${newState}`)
        }
        
        controllerRef.current.transitionTo(newState)
      }
    }, config.transitionDelay)

    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [simulant.lastAction, config.autoTransition, config.transitionDelay, config.enableLogging])

  // Update controller state
  const updateControllerState = useCallback(() => {
    if (!controllerRef.current) return

    setControllerState({
      currentState: controllerRef.current.getCurrentState(),
      previousState: controllerRef.current.getPreviousState(),
      isTransitioning: controllerRef.current.isInTransition(),
      transitionProgress: controllerRef.current.getTransitionProgress(),
      canTransition: (state: AnimationState) => controllerRef.current!.canTransitionTo(state)
    })
  }, [])

  // Update controller in animation loop
  useFrame((_, delta) => {
    if (controllerRef.current) {
      controllerRef.current.update(delta)
      updateControllerState()
    }
  })

  // Control methods
  const transitionTo = useCallback((
    state: AnimationState, 
    options: { force?: boolean; customDuration?: number } = {}
  ): boolean => {
    if (!controllerRef.current) {
      if (config.enableLogging) {
        console.warn('⚠️ Animation controller not initialized')
      }
      return false
    }

    const result = controllerRef.current.transitionTo(state, options)
    updateControllerState()
    return result
  }, [config.enableLogging, updateControllerState])

  const mapActionToState = useCallback((action: string): AnimationState => {
    if (!controllerRef.current) return 'idle'
    return controllerRef.current.mapActionToAnimationState(action)
  }, [])

  const setBlendWeight = useCallback((animationName: string, weight: number): void => {
    if (controllerRef.current) {
      controllerRef.current.setBlendWeight(animationName, weight)
    }
  }, [])

  const addBlendAnimation = useCallback((
    name: string, 
    weight: number, 
    options: { timeScale?: number; fadeIn?: number } = {}
  ): void => {
    if (!controllerRef.current || !config.enableBlending) return

    controllerRef.current.setBlendAnimation(name, {
      name,
      weight,
      timeScale: options.timeScale,
      fadeInDuration: options.fadeIn
    })
  }, [config.enableBlending])

  const removeBlendAnimation = useCallback((name: string, fadeOut?: number): void => {
    if (!controllerRef.current) return

    if (fadeOut) {
      controllerRef.current.setBlendAnimation(name, {
        name,
        weight: 0,
        fadeOutDuration: fadeOut
      })
      
      setTimeout(() => {
        if (controllerRef.current) {
          controllerRef.current.removeBlendAnimation(name)
        }
      }, fadeOut * 1000)
    } else {
      controllerRef.current.removeBlendAnimation(name)
    }
  }, [])

  const getDebugInfo = useCallback(() => {
    if (!controllerRef.current) return null
    return controllerRef.current.getDebugInfo()
  }, [])

  const getAvailableStates = useCallback((): AnimationState[] => {
    return ['idle', 'walking', 'running', 'jumping', 'building', 'thinking', 'communicating', 'celebrating']
  }, [])

  return {
    state: controllerState,
    transitionTo,
    mapActionToState,
    setBlendWeight,
    addBlendAnimation,
    removeBlendAnimation,
    getDebugInfo,
    getAvailableStates
  }
}

// Export types
export type { AnimationState } from './animationController'