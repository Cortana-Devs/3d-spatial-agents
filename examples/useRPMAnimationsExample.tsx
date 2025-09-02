/**
 * Example usage of the useRPMAnimations hook
 * Demonstrates how to integrate external animation clips with Ready Player Me avatars
 */

import React, { useEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { Group } from 'three'
import { useRPMAnimations } from '../utils/useRPMAnimations'
import { useExternalAnimations } from '../utils/useExternalAnimations'
import type { AISimulant } from '../types'

/**
 * Example component showing basic usage of useRPMAnimations
 */
function BasicAnimationExample() {
  const groupRef = useRef<Group>(null)
  
  // Load the Ready Player Me avatar
  const gltf = useGLTF('/models/player_ReadyPlayerMe.glb')
  
  // Load external animation clips
  const externalClips = useExternalAnimations([
    '/animation_GLB/M_Walk_001.glb',
    '/animation_GLB/M_Run_001.glb',
    '/animation_GLB/F_Standing_Idle_Variations_001.glb'
  ])
  
  // Create the enhanced animation manager
  const animationManager = useRPMAnimations(gltf, externalClips.clips, {
    autoPlay: 'idle_female_1',
    crossFadeDuration: 0.3,
    enableLogging: true,
    onAnimationStart: (name) => {
      console.log(`Animation started: ${name}`)
    },
    onAnimationEnd: (name) => {
      console.log(`Animation ended: ${name}`)
    }
  })
  
  // Example of programmatic animation control
  useEffect(() => {
    const interval = setInterval(() => {
      const animations = ['idle_female_1', 'walk_male', 'run_male']
      const randomAnimation = animations[Math.floor(Math.random() * animations.length)]
      animationManager.crossFadeToAnimation(randomAnimation, 0.5)
    }, 5000) // Change animation every 5 seconds
    
    return () => clearInterval(interval)
  }, [animationManager])
  
  return (
    <group ref={groupRef}>
      <primitive object={gltf.scene} />
      
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <mesh position={[0, 3, 0]}>
          <planeGeometry args={[2, 0.5]} />
          <meshBasicMaterial color="black" transparent opacity={0.7} />
          {/* In a real app, you'd use Text from troika-three-text or similar */}
        </mesh>
      )}
    </group>
  )
}

/**
 * Example component showing advanced usage with simulant integration
 */
interface AdvancedAnimationExampleProps {
  simulant: AISimulant
}

function AdvancedAnimationExample({ simulant }: AdvancedAnimationExampleProps) {
  const groupRef = useRef<Group>(null)
  
  // Load avatar and animations
  const gltf = useGLTF('/models/player_ReadyPlayerMe.glb')
  const externalClips = useExternalAnimations()
  
  // Enhanced animation manager with performance optimization
  const animationManager = useRPMAnimations(gltf, externalClips.clips, {
    crossFadeDuration: 0.3,
    enableLOD: true,
    performanceMode: 'balanced',
    onAnimationStart: (name) => {
      console.log(`${simulant.name} started animation: ${name}`)
    },
    onTransitionComplete: (from, to) => {
      console.log(`${simulant.name} transitioned from ${from} to ${to}`)
    }
  })
  
  // Map simulant actions to animations
  const getAnimationForAction = (action: string): string => {
    const lowerAction = action.toLowerCase()
    
    if (lowerAction.includes('walk') || lowerAction.includes('move')) {
      return 'walk_male'
    } else if (lowerAction.includes('run')) {
      return 'run_male'
    } else if (lowerAction.includes('jump')) {
      return 'jump_male'
    } else if (lowerAction.includes('dance')) {
      return 'dance_female'
    } else if (lowerAction.includes('talk')) {
      return 'talk_male'
    } else {
      return 'idle_female_1'
    }
  }
  
  // React to simulant action changes
  useEffect(() => {
    const targetAnimation = getAnimationForAction(simulant.lastAction)
    
    if (targetAnimation !== animationManager.state.currentAnimation) {
      animationManager.crossFadeToAnimation(targetAnimation, 0.4)
    }
  }, [simulant.lastAction, animationManager])
  
  // Performance optimization based on distance
  useEffect(() => {
    // In a real implementation, you'd calculate distance from camera
    const distanceFromCamera = 25 // Mock distance
    
    if (distanceFromCamera > 50) {
      animationManager.setLODLevel('low')
    } else if (distanceFromCamera > 25) {
      animationManager.setLODLevel('medium')
    } else {
      animationManager.setLODLevel('high')
    }
  }, [animationManager])
  
  return (
    <group ref={groupRef} position={[simulant.position.x, simulant.position.y, simulant.position.z]}>
      <primitive object={gltf.scene} />
      
      {/* Status indicator */}
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[0.1]} />
        <meshBasicMaterial 
          color={animationManager.state.isPlaying ? '#00ff00' : '#ff0000'} 
          transparent 
          opacity={0.8}
        />
      </mesh>
      
      {/* Animation state debug info */}
      {process.env.NODE_ENV === 'development' && (
        <group position={[0, 3, 0]}>
          <mesh>
            <planeGeometry args={[3, 1]} />
            <meshBasicMaterial color="black" transparent opacity={0.8} />
          </mesh>
          {/* Debug text would go here */}
        </group>
      )}
    </group>
  )
}

/**
 * Example of manual animation controls for testing
 */
function AnimationControlsExample() {
  const gltf = useGLTF('/models/player_ReadyPlayerMe.glb')
  const externalClips = useExternalAnimations()
  
  const animationManager = useRPMAnimations(gltf, externalClips.clips, {
    enableLogging: true,
    performanceMode: 'quality'
  })
  
  const handlePlayAnimation = (animationName: string) => {
    animationManager.playAnimation(animationName, {
      loop: true,
      crossFadeDuration: 0.5
    })
  }
  
  const handleCrossFade = (animationName: string) => {
    animationManager.crossFadeToAnimation(animationName, 0.8, {
      easing: 'ease-in-out'
    })
  }
  
  const handlePauseAll = () => {
    animationManager.pauseAllAnimations()
  }
  
  const handleResumeAll = () => {
    animationManager.resumeAllAnimations()
  }
  
  return (
    <group>
      <primitive object={gltf.scene} />
      
      {/* In a real React app, these would be actual UI buttons */}
      {/* This is just to show the API usage */}
      <group position={[3, 0, 0]}>
        {/* Mock button representations */}
        {animationManager.availableAnimations.map((animName, index) => (
          <mesh 
            key={animName}
            position={[0, index * 0.5, 0]}
            onClick={() => handlePlayAnimation(animName)}
          >
            <boxGeometry args={[1, 0.3, 0.1]} />
            <meshBasicMaterial 
              color={animationManager.state.currentAnimation === animName ? '#00ff00' : '#666666'} 
            />
          </mesh>
        ))}
        
        {/* Control buttons */}
        <mesh position={[1.5, 0, 0]} onClick={handlePauseAll}>
          <boxGeometry args={[0.8, 0.3, 0.1]} />
          <meshBasicMaterial color="#ff6600" />
        </mesh>
        
        <mesh position={[1.5, 0.5, 0]} onClick={handleResumeAll}>
          <boxGeometry args={[0.8, 0.3, 0.1]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      </group>
    </group>
  )
}

/**
 * Example showing performance monitoring and adaptation
 */
function PerformanceOptimizedExample() {
  const gltf = useGLTF('/models/player_ReadyPlayerMe.glb')
  const externalClips = useExternalAnimations()
  const frameRateRef = useRef<number[]>([])
  
  const animationManager = useRPMAnimations(gltf, externalClips.clips, {
    enableLOD: true,
    performanceMode: 'balanced',
    autoPlay: 'idle_female_1'
  })
  
  // Performance monitoring
  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    
    const measurePerformance = () => {
      const currentTime = performance.now()
      const deltaTime = currentTime - lastTime
      
      if (deltaTime >= 1000) { // Every second
        const fps = (frameCount * 1000) / deltaTime
        frameRateRef.current.push(fps)
        
        // Keep only last 10 measurements
        if (frameRateRef.current.length > 10) {
          frameRateRef.current.shift()
        }
        
        // Calculate average FPS
        const avgFPS = frameRateRef.current.reduce((a, b) => a + b, 0) / frameRateRef.current.length
        
        // Adapt performance based on FPS
        if (avgFPS < 30) {
          animationManager.setLODLevel('low')
          console.log('Performance: Switched to LOW quality due to low FPS:', avgFPS)
        } else if (avgFPS < 45) {
          animationManager.setLODLevel('medium')
          console.log('Performance: Switched to MEDIUM quality, FPS:', avgFPS)
        } else {
          animationManager.setLODLevel('high')
          console.log('Performance: Using HIGH quality, FPS:', avgFPS)
        }
        
        frameCount = 0
        lastTime = currentTime
      }
      
      frameCount++
      requestAnimationFrame(measurePerformance)
    }
    
    measurePerformance()
  }, [animationManager])
  
  return (
    <group>
      <primitive object={gltf.scene} />
      
      {/* Performance indicator */}
      <mesh position={[2, 2, 0]}>
        <sphereGeometry args={[0.1]} />
        <meshBasicMaterial 
          color={
            frameRateRef.current.length > 0 
              ? frameRateRef.current[frameRateRef.current.length - 1] > 45 
                ? '#00ff00' 
                : frameRateRef.current[frameRateRef.current.length - 1] > 30 
                  ? '#ffff00' 
                  : '#ff0000'
              : '#666666'
          }
        />
      </mesh>
    </group>
  )
}

/**
 * Usage examples export
 */
export {
  BasicAnimationExample,
  AdvancedAnimationExample,
  AnimationControlsExample,
  PerformanceOptimizedExample
}

/**
 * Example of how to use the hook in different scenarios:
 * 
 * 1. Basic Usage:
 * ```tsx
 * const animationManager = useRPMAnimations(gltf, externalClips.clips, {
 *   autoPlay: 'idle',
 *   crossFadeDuration: 0.3
 * })
 * ```
 * 
 * 2. With Performance Optimization:
 * ```tsx
 * const animationManager = useRPMAnimations(gltf, externalClips.clips, {
 *   enableLOD: true,
 *   performanceMode: 'balanced'
 * })
 * 
 * // Later, based on distance or performance
 * animationManager.setLODLevel('low')
 * ```
 * 
 * 3. With Event Callbacks:
 * ```tsx
 * const animationManager = useRPMAnimations(gltf, externalClips.clips, {
 *   onAnimationStart: (name) => console.log('Started:', name),
 *   onAnimationEnd: (name) => console.log('Ended:', name),
 *   onTransitionComplete: (from, to) => console.log('Transitioned:', from, '->', to)
 * })
 * ```
 * 
 * 4. Manual Animation Control:
 * ```tsx
 * // Play with options
 * animationManager.playAnimation('walk', {
 *   loop: true,
 *   timeScale: 1.2,
 *   crossFadeDuration: 0.5
 * })
 * 
 * // Cross-fade with easing
 * animationManager.crossFadeToAnimation('run', 0.8, {
 *   easing: 'ease-in-out'
 * })
 * 
 * // Pause/resume
 * animationManager.pauseAnimation('walk')
 * animationManager.resumeAnimation('walk')
 * ```
 * 
 * 5. State Monitoring:
 * ```tsx
 * const { state } = animationManager
 * 
 * console.log('Current animation:', state.currentAnimation)
 * console.log('Is playing:', state.isPlaying)
 * console.log('Transition progress:', state.transitionProgress)
 * console.log('Playback time:', state.playbackTime)
 * ```
 */