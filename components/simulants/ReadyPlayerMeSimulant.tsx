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
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
// import { usePerformanceOptimization } from "../../utils/usePerformanceOptimization";

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
  animationPaths,
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

  // Performance optimization system completely removed to fix animation loading
  // const performanceOptimization = usePerformanceOptimization([simulant], { ... });

  // Use constant animation paths to prevent unnecessary re-renders
  const memoizedAnimationPaths = useMemo(() => {
    return animationPaths || getDefaultAnimationPaths();
  }, [animationPaths]);

  // Load the Ready Player Me model
  const avatarGLTF = useGLTF(modelPath);

  // Create a per-instance clone of the avatar to avoid re-parenting conflicts between simulants
  const avatarRoot = useMemo(() => {
    return SkeletonUtils.clone(avatarGLTF.scene) as Group;
  }, [avatarGLTF.scene]);
  
  // Debug: Log animation paths being used (only once)
  useEffect(() => {
    console.log(`🗂️ Animation paths for ${simulant.id}:`, memoizedAnimationPaths);
  }, [simulant.id]); // Only log when simulant changes, not paths

  // Memoize animation loading options to prevent unnecessary re-renders
  const animationOptions = useMemo(() => ({
    enableCaching: true,
    enableConcurrentLoading: true,
    enableLogging: true, // Enable to debug animation loading
    enableRetry: true,
  }), []);

  // Load external animation clips
  const externalAnimations = useExternalAnimations(memoizedAnimationPaths, animationOptions);

  // Memoize external clips to prevent unnecessary re-renders
  const memoizedExternalClips = useMemo(() => {
    return externalAnimations.clips;
  }, [externalAnimations.clips.size]); // Only depend on size, not the entire Map

  // Enhanced animation management with external clips
  // Pass a GLTF-like object with the cloned scene so each simulant animates its own instance
  const animationManager = useRPMAnimations(
    { scene: avatarRoot, animations: avatarGLTF.animations } as any,
    memoizedExternalClips,
    {
      autoPlay: 'tpose_male',
      crossFadeDuration: RPM_CONFIG.performanceSettings[performanceMode].crossFadeDuration,
      enableLOD: true,
      performanceMode,
      enableLogging: true, // Enable to debug animation management
      onAnimationStart: (name) => {
        console.log(`🎬 Animation started: ${name} for simulant ${simulant.id}`);
        if (onAnimationChange) {
          onAnimationChange(name);
        }
      },
    }
  );

  // Debug: Log animation loading state
  useEffect(() => {
    console.log(`🔍 External animations state for ${simulant.id}:`, {
      loading: externalAnimations.loading,
      clipsSize: externalAnimations.clips.size,
      loadedCount: externalAnimations.loadedCount,
      totalCount: externalAnimations.totalCount,
      error: externalAnimations.error,
      clipsKeys: Array.from(externalAnimations.clips.keys())
    });
    
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
    externalAnimations.loadedCount,
    externalAnimations.totalCount,
    externalAnimations.error,
    animationManager.availableAnimations.length,
    simulant.id
  ]);

  // Animation state controller
  const animationController = useAnimationController(
    animationManager,
    simulant,
    {
      enableLogging: true, // Enable to debug animation controller
      autoTransition: true,
      transitionDelay: 100,
      enableBlending: RPM_CONFIG.performanceSettings[performanceMode].enableBlending,
      enableIdleCycling: true, // Enable idle animation cycling
      idleCycleInterval: 8000, // Cycle every 8 seconds
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
  }, [simulant.position.x, simulant.position.y, simulant.position.z, enableGridSnap, gridConfig.snapToGrid, gridConfig.cellSize]);

  // Basic visibility management
  const isVisible = true; // Always visible for now

  // Determine current LOD level based on distance
  const currentLODLevel = 'high';

  // Compute activity color based on simulant status
  const performanceSettings = RPM_CONFIG.performanceSettings[performanceMode];
  const activityColor = useMemo(() => {
    switch (simulant.status) {
      case "active":
        return "#00FF88"; // Bright green
      case "idle":
        return "#FFFF00"; // Yellow
      case "disconnected":
        return "#666666"; // Gray
      default:
        return "#00D4FF";
    }
  }, [simulant.status]);

  // Simplified frame updates (performance optimization disabled)
  useFrame((state) => {
    const now = Date.now();
    const updateInterval = 1000 / performanceSettings.animationUpdateRate;
    
    // Throttle updates based on performance settings
    if (now - lastUpdateTimeRef.current < updateInterval) {
      return;
    }
    lastUpdateTimeRef.current = now;

    if (!groupRef.current) return;

    // Simple visibility check
    if (!isVisible) {
      groupRef.current.visible = false;
      return;
    } else {
      groupRef.current.visible = true;
    }

    // Gentle floating animation for active simulants
    if (simulant.status === "active") {
      const time = state.clock.elapsedTime;
      groupRef.current.position.y = position.y + Math.sin(time * 2) * 0.02;
    } else {
      groupRef.current.position.y = position.y;
    }

    // Update position
    groupRef.current.position.x = position.x;
    groupRef.current.position.z = position.z;
    
    // Update scale
    groupRef.current.scale.setScalar(scale);
  });

  // Handle simulant name tag positioning
  const nameTagPosition = useMemo(() => {
    return [position.x, position.y + 2.2, position.z] as [number, number, number];
  }, [position]);

  // Simple render check (performance optimization disabled)
  if (!isVisible) {
    return null;
  }

  // Simplified detail settings
  const lodScale = scale; // No LOD scaling for now
  const showDetails = true; // Always show details
  const ringSegments = 16; // High quality rings

  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]}>
      {/* Ready Player Me Character Model */}
      <primitive 
        object={avatarRoot} 
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

export function disposeReadyPlayerMeSimulant() {
  // Placeholder for any manual dispose helpers, if necessary
}

useGLTF.preload("/models/player_ReadyPlayerMe.glb");

export type { ReadyPlayerMeSimulantProps };
export { RPM_CONFIG };