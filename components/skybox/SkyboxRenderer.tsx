'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { SkyboxRendererProps } from '../../types/skybox'

/**
 * SkyboxRenderer component following React Three Fiber component patterns
 * Handles the actual rendering of skybox textures to the scene
 */
export function SkyboxRenderer({
  texture,
  intensity = 1,
  rotation = 0,
  tint,
  backgroundBlurriness = 0,
  environmentIntensity = 1
}: SkyboxRendererProps) {
  const { scene } = useThree()
  const previousTexture = useRef<THREE.CubeTexture | null>(null)
  const rotationRef = useRef(0)

  // Apply skybox to scene background following Three.js best practices
  useEffect(() => {
    if (texture) {
      // Store previous texture for cleanup
      const prevTexture = scene.background as THREE.CubeTexture | null

      // Apply new skybox texture
      scene.background = texture
      scene.environment = texture // For PBR materials

      // Set background intensity (Three.js r150+)
      if ('backgroundIntensity' in scene) {
        (scene as any).backgroundIntensity = intensity
      }

      // Set background blurriness if supported
      if ('backgroundBlurriness' in scene) {
        (scene as any).backgroundBlurriness = backgroundBlurriness
      }

      // Set environment intensity
      if ('environmentIntensity' in scene) {
        (scene as any).environmentIntensity = environmentIntensity
      }

      // Apply tint if specified
      if (tint) {
        // Store original color space
        const originalColorSpace = texture.colorSpace

        // Create a material to handle tinting
        // Note: This is a simplified approach. In production, you might want to use a custom shader
        texture.userData.originalColorSpace = originalColorSpace
        texture.userData.tint = tint
      }

      // Track current texture
      previousTexture.current = texture

      console.debug('Skybox texture applied to scene', {
        intensity,
        backgroundBlurriness,
        environmentIntensity,
        hasTint: !!tint
      })
    }

    return () => {
      // Cleanup: restore previous state if this texture is still active
      if (scene.background === texture) {
        scene.background = null
        scene.environment = null

        if ('backgroundIntensity' in scene) {
          (scene as any).backgroundIntensity = 1
        }
        if ('backgroundBlurriness' in scene) {
          (scene as any).backgroundBlurriness = 0
        }
        if ('environmentIntensity' in scene) {
          (scene as any).environmentIntensity = 1
        }
      }
    }
  }, [texture, scene, intensity, backgroundBlurriness, environmentIntensity, tint])

  // Handle rotation animation
  useFrame((state, delta) => {
    if (rotation && scene.background && scene.background === texture) {
      rotationRef.current += rotation * delta

      // Apply rotation to scene background
      // Note: This is a simplified rotation. For more complex rotations,
      // you might want to use a custom shader or matrix transformations
      if (scene.background instanceof THREE.CubeTexture) {
        // Rotation for cube textures is complex and typically handled in shaders
        // For now, we'll store the rotation value for potential shader use
        scene.background.userData.rotation = rotationRef.current
      }
    }
  })

  // Memoize debug information
  const debugInfo = useMemo(() => ({
    hasTexture: !!texture,
    textureId: texture?.userData?.presetId || 'unknown',
    intensity,
    rotation,
    backgroundBlurriness,
    environmentIntensity,
    hasTint: !!tint
  }), [texture, intensity, rotation, backgroundBlurriness, environmentIntensity, tint])

  // Development-only debug logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('SkyboxRenderer updated:', debugInfo)
    }
  }, [debugInfo])

  // This component doesn't render any JSX - it only affects the Three.js scene
  return null
}

// Default props for better type safety
SkyboxRenderer.defaultProps = {
  intensity: 1,
  rotation: 0,
  backgroundBlurriness: 0,
  environmentIntensity: 1
} as const

export default SkyboxRenderer
