/**
 * Animation Controller System Example
 * Demonstrates how to use the enhanced animation state controller and mapping system
 */

import { useGLTF } from '@react-three/drei'
import { useRPMAnimations } from '../utils/useRPMAnimations'
import { useAnimationController } from '../utils/useAnimationController'
import { useExternalAnimations } from '../utils/useExternalAnimations'
import { AnimationController, ENHANCED_ANIMATION_MAPPING } from '../utils/animationController'
import type { AISimulant } from '../types'

// Example: Basic Animation Controller Usage
export function BasicAnimationControllerExample() {
  // Mock simulant data
  const simulant: AISimulant = {
    id: 'example-simulant',
    name: 'Example Simulant',
    position: { x: 0, y: 0, z: 0 },
    status: 'active',
    lastAction: 'Standing peacefully',
    conversationHistory: [],
    geminiSessionId: 'example-session'
  }

  // Load avatar and external animations
  const avatarGLTF = useGLTF('/models/player-ready-player-me.glb')
  const externalClips = useExternalAnimations([
    '/animations/F_Standing_Idle_Variations_001.glb',
    '/animations/M_Walk_001.glb',
    '/animations/M_Run_001.glb',
    '/animations/M_Walk_Jump_002.glb',
    '/animations/M_Standing_Expressions_013.glb',
    '/animations/M_Talking_Variations_005.glb',
    '/animations/F_Dances_007.glb'
  ])

  // Initialize animation manager
  const animationManager = useRPMAnimations(avatarGLTF, externalClips, {
    autoPlay: 'idle',
    crossFadeDuration: 0.3,
    enableLOD: true,
    performanceMode: 'balanced',
    enableLogging: true
  })

  // Initialize animation controller
  const animationController = useAnimationController(animationManager, simulant, {
    enableLogging: true,
    autoTransition: true,
    transitionDelay: 100,
    enableBlending: true
  })

  // Example usage in component
  const handleActionChange = (newAction: string) => {
    // The controller will automatically map the action to an animation state
    // and transition smoothly based on priority and transition rules
    console.log(`Action changed to: ${newAction}`)
    console.log(`Mapped to state: ${animationController.mapActionToState(newAction)}`)
  }

  const handleManualTransition = (state: 'idle' | 'walking' | 'running' | 'jumping' | 'building' | 'thinking' | 'communicating' | 'celebrating') => {
    const success = animationController.transitionTo(state)
    console.log(`Manual transition to ${state}: ${success ? 'success' : 'failed'}`)
  }

  const handleBlendAnimation = () => {
    // Add a blend animation for more complex behaviors
    animationController.addBlendAnimation('M_Walk_001', 0.3, {
      timeScale: 0.8,
      fadeIn: 0.5
    })
  }

  return {
    // Animation controller interface
    controller: animationController,
    
    // Current state information
    currentState: animationController.state.currentState,
    isTransitioning: animationController.state.isTransitioning,
    transitionProgress: animationController.state.transitionProgress,
    
    // Control methods
    handleActionChange,
    handleManualTransition,
    handleBlendAnimation,
    
    // Debug information
    debugInfo: animationController.getDebugInfo(),
    availableStates: animationController.getAvailableStates()
  }
}

// Example: Advanced Animation Controller with Custom Logic
export function AdvancedAnimationControllerExample() {
  const simulant: AISimulant = {
    id: 'advanced-simulant',
    name: 'Advanced Simulant',
    position: { x: 5, y: 0, z: 5 },
    status: 'active',
    lastAction: 'Analyzing the world structure',
    conversationHistory: [],
    geminiSessionId: 'advanced-session'
  }

  const avatarGLTF = useGLTF('/models/player-ready-player-me.glb')
  const externalClips = useExternalAnimations([
    '/animations/F_Standing_Idle_Variations_001.glb',
    '/animations/F_Standing_Idle_Variations_002.glb',
    '/animations/F_Standing_Idle_Variations_006.glb',
    '/animations/M_Walk_001.glb',
    '/animations/M_Run_001.glb',
    '/animations/M_Walk_Jump_002.glb',
    '/animations/M_Crouch_Walk_003.glb',
    '/animations/M_Standing_Expressions_013.glb',
    '/animations/M_Talking_Variations_005.glb',
    '/animations/M_Walk_Backwards_001.glb',
    '/animations/F_Dances_007.glb',
    '/animations/Masculine_TPose.glb'
  ])

  const animationManager = useRPMAnimations(avatarGLTF, externalClips, {
    crossFadeDuration: 0.2,
    enableLOD: true,
    performanceMode: 'quality',
    enableLogging: false
  })

  const animationController = useAnimationController(animationManager, simulant, {
    enableLogging: false,
    autoTransition: true,
    transitionDelay: 50, // Faster response
    enableBlending: true
  })

  // Advanced usage examples
  const createComplexBehavior = () => {
    // Example: Building behavior with multiple animation layers
    animationController.transitionTo('building')
    
    // Add subtle idle movements while building
    setTimeout(() => {
      animationController.addBlendAnimation('F_Standing_Idle_Variations_002', 0.2, {
        timeScale: 0.5,
        fadeIn: 1.0
      })
    }, 1000)
    
    // Transition to celebration after building
    setTimeout(() => {
      animationController.removeBlendAnimation('F_Standing_Idle_Variations_002', 0.5)
      animationController.transitionTo('celebrating')
    }, 5000)
  }

  const createEmotionalResponse = (emotion: 'happy' | 'focused' | 'excited') => {
    switch (emotion) {
      case 'happy':
        animationController.transitionTo('celebrating')
        break
      case 'focused':
        animationController.transitionTo('thinking')
        // Slow down the animation for deep focus
        animationController.setBlendWeight('M_Standing_Expressions_013', 0.7)
        break
      case 'excited':
        animationController.transitionTo('jumping')
        // Speed up for excitement
        setTimeout(() => {
          animationController.transitionTo('celebrating', { customDuration: 0.1 })
        }, 1000)
        break
    }
  }

  const createContextualAnimation = (context: 'near_blocks' | 'near_simulant' | 'alone') => {
    switch (context) {
      case 'near_blocks':
        // Show interest in building
        animationController.transitionTo('building')
        break
      case 'near_simulant':
        // Initiate communication
        animationController.transitionTo('communicating')
        break
      case 'alone':
        // Default to thinking or idle
        const shouldThink = Math.random() > 0.5
        animationController.transitionTo(shouldThink ? 'thinking' : 'idle')
        break
    }
  }

  return {
    controller: animationController,
    
    // Advanced control methods
    createComplexBehavior,
    createEmotionalResponse,
    createContextualAnimation,
    
    // State monitoring
    getCurrentBehavior: () => ({
      state: animationController.state.currentState,
      isTransitioning: animationController.state.isTransitioning,
      progress: animationController.state.transitionProgress,
      canTransition: animationController.state.canTransition
    }),
    
    // Performance monitoring
    getPerformanceInfo: () => {
      const debugInfo = animationController.getDebugInfo()
      return {
        activeAnimations: debugInfo?.availableAnimations?.length || 0,
        activeBlends: debugInfo?.activeBlends?.length || 0,
        currentState: debugInfo?.currentState,
        isTransitioning: debugInfo?.isTransitioning
      }
    }
  }
}

// Example: Animation Mapping Customization
export function CustomAnimationMappingExample() {
  // Example of how to extend or customize the animation mapping
  const customMapping = {
    ...ENHANCED_ANIMATION_MAPPING,
    
    // Add custom state
    'working': {
      primary: ['M_Standing_Expressions_013', 'F_Standing_Idle_Variations_006'],
      fallback: ['F_Standing_Idle_Variations_001'],
      priority: 2,
      looping: true,
      timeScale: 0.6, // Slower, more focused
      blendWeight: 1.0
    },
    
    // Override existing state
    'celebrating': {
      ...ENHANCED_ANIMATION_MAPPING.celebrating,
      timeScale: 1.3, // More energetic celebration
      priority: 3 // Higher priority than default
    }
  }

  // Example of custom action-to-state mapping logic
  const customActionMapping = (action: string) => {
    const lowerAction = action.toLowerCase()
    
    // Custom mappings
    if (lowerAction.includes('work') || lowerAction.includes('focus') || lowerAction.includes('concentrate')) {
      return 'working' as any
    }
    
    // Enhanced celebration detection
    if (lowerAction.includes('success') || lowerAction.includes('complete') || lowerAction.includes('finish') || lowerAction.includes('done')) {
      return 'celebrating'
    }
    
    // Fall back to default mapping
    const controller = new AnimationController({} as any, {}, {})
    return controller.mapActionToAnimationState(action)
  }

  return {
    customMapping,
    customActionMapping,
    
    // Usage example
    applyCustomMapping: (controller: any) => {
      // This would be implemented in a custom controller class
      // that extends the base AnimationController
      console.log('Custom mapping applied:', customMapping)
    }
  }
}

// Example: Performance Optimization Strategies
export function PerformanceOptimizedExample() {
  const simulant: AISimulant = {
    id: 'performance-simulant',
    name: 'Performance Simulant',
    position: { x: 10, y: 0, z: 10 },
    status: 'active',
    lastAction: 'Optimizing performance',
    conversationHistory: [],
    geminiSessionId: 'performance-session'
  }

  // Load only essential animations for performance
  const essentialAnimations = [
    '/animations/F_Standing_Idle_Variations_001.glb', // Idle
    '/animations/M_Walk_001.glb', // Walk
    '/animations/M_Run_001.glb', // Run
    '/animations/Masculine_TPose.glb' // Fallback
  ]

  const avatarGLTF = useGLTF('/models/player-ready-player-me.glb')
  const externalClips = useExternalAnimations(essentialAnimations)

  const animationManager = useRPMAnimations(avatarGLTF, externalClips, {
    crossFadeDuration: 0.2, // Faster transitions
    enableLOD: true,
    performanceMode: 'performance', // Prioritize performance
    enableLogging: false // Disable logging for performance
  })

  const animationController = useAnimationController(animationManager, simulant, {
    enableLogging: false,
    autoTransition: true,
    transitionDelay: 200, // Longer delay to reduce transitions
    enableBlending: false // Disable blending for performance
  })

  // Performance monitoring
  const performanceMonitor = {
    startTime: Date.now(),
    transitionCount: 0,
    
    trackTransition: () => {
      performanceMonitor.transitionCount++
    },
    
    getStats: () => ({
      uptime: Date.now() - performanceMonitor.startTime,
      transitionsPerMinute: (performanceMonitor.transitionCount / ((Date.now() - performanceMonitor.startTime) / 60000)),
      currentState: animationController.state.currentState,
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
    })
  }

  // LOD-based animation quality
  const adjustQualityBasedOnDistance = (distance: number) => {
    if (distance > 50) {
      // Very far - minimal animations
      animationManager.setLODLevel('low')
      animationController.transitionTo('idle') // Force idle for distant simulants
    } else if (distance > 20) {
      // Medium distance - reduced quality
      animationManager.setLODLevel('medium')
    } else {
      // Close - full quality
      animationManager.setLODLevel('high')
    }
  }

  return {
    controller: animationController,
    performanceMonitor,
    adjustQualityBasedOnDistance,
    
    // Performance utilities
    pauseAnimations: () => animationManager.pauseAllAnimations(),
    resumeAnimations: () => animationManager.resumeAllAnimations(),
    
    // Memory management
    cleanup: () => {
      animationManager.pauseAllAnimations()
      // Additional cleanup would go here
    }
  }
}

// Export all examples
export {
  BasicAnimationControllerExample,
  AdvancedAnimationControllerExample,
  CustomAnimationMappingExample,
  PerformanceOptimizedExample
}