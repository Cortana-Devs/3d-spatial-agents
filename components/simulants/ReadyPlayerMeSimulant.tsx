"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Group, Vector3 } from "three";
import { useWorldStore } from "../../store/worldStore";
import { AISimulant } from "../../types";
import { useExternalAnimations } from "../../utils/useExternalAnimations";
import { useRPMAnimations } from "../../utils/useRPMAnimations";
import { useAnimationController } from "../../utils/useAnimationController";
import { getDefaultAnimationPaths } from "../../utils/animationUtils";
import { usePerformanceOptimization } from "../../utils/usePerformanceOptimization";

// Enhanced Ready Player Me simulant configuration
interface ReadyPlayerMeSimulantProps {
  simulant: AISimulant;
  modelPath?: string;
  animationPaths?: string[];
  scale?: number;
  enableGridSnap?: boolean;
  performanceMode?: 'quality' | 'balanced' | 'performance';
  onAnimationChange?: (animation: string) => void;
  onLoadComplete?: () => void;
  onLoadError?: (error: Error) => void;
}

// Ready Player Me specific optimizations
const RPM_CONFIG = {
  // Standard Ready Player Me scale for voxel world
  defaultScale: 0.8,
  // Position offset to align feet with ground
  groundOffset: 0,
  // Animation blend time for smooth transitions
  blendTime: 0.3,
  // LOD distances for performance
  lodDistances: {
    high: 15,
    medium: 30,
    low: 50,
  },
  // Performance settings by mode
  performanceSettings: {
    quality: {
      maxAnimatedSimulants: 10,
      animationUpdateRate: 60,
      crossFadeDuration: 0.3,
      enableBlending: true,
    },
    balanced: {
      maxAnimatedSimulants: 6,
      animationUpdateRate: 30,
      crossFadeDuration: 0.2,
      enableBlending: true,
    },
    performance: {
      maxAnimatedSimulants: 3,
      animationUpdateRate: 15,
      crossFadeDuration: 0.1,
      enableBlending: false,
    }
  }
} as const;

export default function ReadyPlayerMeSimulant({
  simulant,
  modelPath = "/models/player_ReadyPlayerMe.glb",
  animationPaths = getDefaultAnimationPaths(),
  scale = RPM_CONFIG.defaultScale,
  enableGridSnap = true,
  performanceMode = 'balanced',
  onAnimationChange,
  onLoadComplete,
  onLoadError,
}: ReadyPlayerMeSimulantProps) {
  const groupRef = useRef<Group>(null);
  const { gridConfig } = useWorldStore();
  const distanceRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(0);

  // Performance optimization system (reduced warning sensitivity)
  const performanceOptimization = usePerformanceOptimization([simulant], {
    enableAutoQualityAdjustment: true,
    enableMemoryManagement: true,
    enableCulling: true,
    enableLOD: true,
    initialQuality: performanceMode === 'quality' ? 'high' : performanceMode === 'performance' ? 'low' : 'medium',
    maxRenderDistance: 100,
    enableLogging: false, // Reduced logging
    onQualityChange: (quality) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎯 Quality changed for ${simulant.id}:`, quality.name);
      }
    },
    onPerformanceWarning: (warning) => {
      // Only log severe performance issues
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ Performance warning for ${simulant.id}:`, warning);
      }
    }
  });

  // Load the Ready Player Me model
  const avatarGLTF = useGLTF(modelPath);
  
  // Debug: Log animation paths being used (only once)
  useEffect(() => {
    console.log(`🗂️ Animation paths for ${simulant.id}:`, animationPaths);
  }, [simulant.id]); // Only log when simulant changes, not paths

  // Load external animation clips
  const externalAnimations = useExternalAnimations(animationPaths, {
    enableCaching: true,
    enableConcurrentLoading: true,
    enableLogging: false, // Disable to reduce console spam
    enableRetry: true,
  });

  // Enhanced animation management with external clips
  const animationManager = useRPMAnimations(
    avatarGLTF,
    externalAnimations.clips,
    {
      autoPlay: 'tpose_male',
      crossFadeDuration: RPM_CONFIG.performanceSettings[performanceMode].crossFadeDuration,
      enableLOD: true,
      performanceMode,
      enableLogging: false, // Disable to reduce console spam
      onAnimationStart: (name) => {
        console.log(`🎬 Animation started: ${name} for simulant ${simulant.id}`);
        if (onAnimationChange) {
          onAnimationChange(name);
        }
      },
    }
  );

  // Debug: Log animation loading state (only when loading completes)
  useEffect(() => {
    if (!externalAnimations.loading && externalAnimations.clips.size > 0) {
      console.log(`🎭 Animation loading completed for ${simulant.id}:`, {
        clipsLoaded: Array.from(externalAnimations.clips.keys()),
        availableAnimations: animationManager.availableAnimations,
        totalLoaded: externalAnimations.loadedCount
      });
    }
    
    if (externalAnimations.error) {
      console.error(`❌ Animation loading error for ${simulant.id}:`, externalAnimations.error);
    }
  }, [
    externalAnimations.loading,
    externalAnimations.clips.size,
    externalAnimations.error,
    animationManager.availableAnimations.length,
    simulant.id
  ]);

  // Animation state controller
  const animationController = useAnimationController(
    animationManager,
    simulant,
    {
      enableLogging: false, // Disable to reduce console spam
      autoTransition: true,
      transitionDelay: 100,
      enableBlending: RPM_CONFIG.performanceSettings[performanceMode].enableBlending,
    }
  );

  // Calculate position with optional grid snapping
  const position = useMemo(() => {
    const basePosition = new Vector3(
      simulant.position.x,
      simulant.position.y + RPM_CONFIG.groundOffset,
      simulant.position.z
    );

    if (enableGridSnap && gridConfig.snapToGrid) {
      return new Vector3(
        Math.round(basePosition.x / gridConfig.cellSize) * gridConfig.cellSize,
        basePosition.y,
        Math.round(basePosition.z / gridConfig.cellSize) * gridConfig.cellSize
      );
    }

    return basePosition;
  }, [simulant.position, enableGridSnap, gridConfig]);

  // Get LOD level from performance optimization system
  const currentLODLevel = useMemo(() => {
    const simulantPosition = new Vector3(simulant.position.x, simulant.position.y, simulant.position.z);
    return performanceOptimization.calculateLOD(simulantPosition);
  }, [performanceOptimization, simulant.position]);

  // Check if simulant should be rendered
  const isVisible = useMemo(() => {
    return performanceOptimization.isSimulantVisible(simulant.id);
  }, [performanceOptimization, simulant.id]);

  // Performance settings based on LOD and performance mode
  const performanceSettings = useMemo(() => {
    const baseSettings = RPM_CONFIG.performanceSettings[performanceMode];
    const simulantPosition = new Vector3(simulant.position.x, simulant.position.y, simulant.position.z);
    const updateFrequency = performanceOptimization.getUpdateFrequency(simulantPosition);
    
    return {
      ...baseSettings,
      animationUpdateRate: updateFrequency,
      enableBlending: currentLODLevel !== 'low' && baseSettings.enableBlending,
    };
  }, [performanceMode, currentLODLevel, performanceOptimization, simulant.position]);

  // Handle loading completion and errors
  useEffect(() => {
    if (!externalAnimations.loading && !externalAnimations.error && onLoadComplete) {
      onLoadComplete();
    }
    
    if (externalAnimations.error && onLoadError) {
      onLoadError(externalAnimations.error);
    }
  }, [externalAnimations.loading, externalAnimations.error, onLoadComplete, onLoadError]);

  // Update LOD level based on performance
  useEffect(() => {
    if (animationManager.setLODLevel) {
      animationManager.setLODLevel(currentLODLevel === 'culled' ? 'low' : currentLODLevel);
    }
  }, [currentLODLevel, animationManager]);

  // Activity indicator based on simulant status
  const activityColor = useMemo(() => {
    switch (simulant.status) {
      case "active":
        return "#00D4FF"; // Axiom blue
      case "idle":
        return "#4CAF50"; // Green
      case "disconnected":
        return "#666666"; // Gray
      default:
        return "#00D4FF";
    }
  }, [simulant.status]);

  // Performance-optimized frame updates with LOD
  useFrame((state) => {
    const now = Date.now();
    const updateInterval = 1000 / performanceSettings.animationUpdateRate;
    
    // Throttle updates based on performance settings
    if (now - lastUpdateTimeRef.current < updateInterval) {
      return;
    }
    lastUpdateTimeRef.current = now;

    if (!groupRef.current) return;

    // Calculate distance from camera for LOD
    const cameraPosition = state.camera.position;
    const simulantPosition = groupRef.current.position;
    distanceRef.current = cameraPosition.distanceTo(simulantPosition);

    // Don't render if not visible (culled or off-screen)
    if (!isVisible || currentLODLevel === 'culled') {
      groupRef.current.visible = false;
      return;
    } else {
      groupRef.current.visible = true;
    }

    // Apply render scale based on LOD
    const renderScale = performanceOptimization.getRenderScale(
      new Vector3(simulant.position.x, simulant.position.y, simulant.position.z)
    );
    const finalScale = scale * renderScale;

    // Gentle floating animation for active simulants (reduced for performance)
    if (simulant.status === "active" && currentLODLevel === 'high') {
      const time = state.clock.elapsedTime;
      groupRef.current.position.y = position.y + Math.sin(time * 2) * 0.02;
    } else {
      groupRef.current.position.y = position.y;
    }

    // Update position
    groupRef.current.position.x = position.x;
    groupRef.current.position.z = position.z;
    
    // Update scale based on LOD
    groupRef.current.scale.setScalar(finalScale);
  });

  // Handle simulant name tag positioning
  const nameTagPosition = useMemo(() => {
    return [position.x, position.y + 2.2, position.z] as [number, number, number];
  }, [position]);

  // Don't render if not visible or culled for performance
  if (!isVisible || currentLODLevel === 'culled') {
    return null;
  }

  // Adjust detail level based on LOD
  const simulantPosition = new Vector3(simulant.position.x, simulant.position.y, simulant.position.z);
  const renderScale = performanceOptimization.getRenderScale(simulantPosition);
  const lodScale = scale * renderScale;
  const showDetails = currentLODLevel !== 'low';
  const ringSegments = currentLODLevel === 'high' ? 16 : currentLODLevel === 'medium' ? 8 : 4;

  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]}>
      {/* Ready Player Me Character Model */}
      <primitive 
        object={avatarGLTF.scene} 
        scale={[lodScale, lodScale, lodScale]}
        castShadow={showDetails}
        receiveShadow={showDetails}
      />

      {/* Activity Indicator - Glowing ring around simulant */}
      {simulant.status === "active" && showDetails && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1.0, ringSegments]} />
          <meshBasicMaterial
            color={activityColor}
            transparent
            opacity={0.3}
            side={2} // DoubleSide
          />
        </mesh>
      )}

      {/* Particle effect for active actions */}
      {animationController.state.currentState === "building" && showDetails && (
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.05]} />
          <meshBasicMaterial
            color="#FFD700"
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      {/* Name Tag - only show at high LOD */}
      {currentLODLevel === 'high' && (
        <group position={nameTagPosition}>
          <mesh>
            <planeGeometry args={[1.5, 0.3]} />
            <meshBasicMaterial
              color="#000000"
              transparent
              opacity={0.7}
            />
          </mesh>
          {/* Text would be added here with troika-three-text or similar */}
        </group>
      )}

      {/* Status indicator based on simulant state */}
      {showDetails && (
        <mesh position={[0.6, 1.8, 0]}>
          <sphereGeometry args={[0.05]} />
          <meshStandardMaterial
            color={activityColor}
            emissive={activityColor}
            emissiveIntensity={simulant.status === "active" ? 0.5 : 0.2}
          />
        </mesh>
      )}

      {/* Loading indicator while animations are loading */}
      {externalAnimations.loading && currentLODLevel === 'high' && (
        <mesh position={[0, 2.5, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial
            color="#00D4FF"
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      {/* Error indicator if animations failed to load */}
      {externalAnimations.error && currentLODLevel === 'high' && (
        <mesh position={[0, 2.5, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial
            color="#FF4444"
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
    </group>
  );
}

// Cleanup function for proper resource disposal
export function disposeReadyPlayerMeSimulant() {
  // Clear GLTF cache if needed
  useGLTF.clear("/models/player_ReadyPlayerMe.glb");
}

// Preload the Ready Player Me model and default animations for better performance
useGLTF.preload("/models/player_ReadyPlayerMe.glb");

// Export types for use in other components
export type { ReadyPlayerMeSimulantProps };
export { RPM_CONFIG };