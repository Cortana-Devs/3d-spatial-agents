"use client";

import React, { useRef, useCallback, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useModuleSystem } from "./ModuleManager";
import type { ModuleState } from "./ModuleManager";
import { useWorldStore } from "../../store/worldStore";
import SimpleAnimatedAvatar from "../simulants/SimpleAnimatedAvatar";
import { AISimulant } from "../../types";

interface AnimationModuleProps {
  maxSimulants?: number;
  enableLOD?: boolean;
  animationQuality?: "high" | "medium" | "low";
  maxAnimationsPerFrame?: number;
}

interface AnimationLODConfig {
  maxDistance: number;
  updateFrequency: number; // Hz
  animationQuality: number; // 0-1
  enableBoneAnimations: boolean;
}

const LOD_CONFIGS: Record<string, AnimationLODConfig> = {
  high: {
    maxDistance: 15,
    updateFrequency: 60,
    animationQuality: 1.0,
    enableBoneAnimations: true,
  },
  medium: {
    maxDistance: 30,
    updateFrequency: 30,
    animationQuality: 0.7,
    enableBoneAnimations: true,
  },
  low: {
    maxDistance: 50,
    updateFrequency: 15,
    animationQuality: 0.5,
    enableBoneAnimations: false,
  },
  culled: {
    maxDistance: Infinity,
    updateFrequency: 0,
    animationQuality: 0,
    enableBoneAnimations: false,
  },
};

type SimulantAnimationState = {
  lastUpdate: number;
  lodLevel: keyof typeof LOD_CONFIGS;
  isPlaying: boolean;
  animationIndex: number;
};

export function AnimationModule({
  maxSimulants = 20,
  enableLOD = true,
  animationQuality = "medium",
  maxAnimationsPerFrame = 5,
}: AnimationModuleProps) {
  const { simulants } = useWorldStore();

  // Animation-specific state (isolated from other modules)
  const [animationStates, setAnimationStates] = useState<
    Map<
      string,
      {
        lastUpdate: number;
        lodLevel: keyof typeof LOD_CONFIGS;
        isPlaying: boolean;
        animationIndex: number;
      }
    >
  >(new Map());

  const animationQueueRef = useRef<string[]>([]);
  const cameraPositionRef = useRef({ x: 0, y: 0, z: 0 });
  const frameCountRef = useRef(0);

  // Register this module with performance isolation
  const { requestFrame, setEnabled, getStats } = useModuleSystem({
    id: "animation-system",
    priority: 7, // High priority for smooth animations
    maxFrameTime: 8, // 8ms max per frame for animations
    targetFPS: 30, // Animations can run at 30fps
    canSkipFrames: true, // Can skip frames under load
  });

  // Get active simulants with performance limits
  const activeSimulants = useMemo(() => {
    const simulantArray = Array.from(simulants.values());

    // Limit total simulants for performance
    const limited = simulantArray
      .filter((simulant) => simulant.status === "active")
      .slice(0, maxSimulants);

    // Sort by distance from camera for LOD
    return limited.sort((a, b) => {
      const distA = Math.sqrt(
        Math.pow(a.position.x - cameraPositionRef.current.x, 2) +
          Math.pow(a.position.z - cameraPositionRef.current.z, 2),
      );
      const distB = Math.sqrt(
        Math.pow(b.position.x - cameraPositionRef.current.x, 2) +
          Math.pow(b.position.z - cameraPositionRef.current.z, 2),
      );
      return distA - distB;
    });
  }, [simulants, maxSimulants]);

  // Calculate LOD levels for simulants
  const simulantsWithLOD = useMemo(() => {
    if (!enableLOD) {
      return activeSimulants.map((simulant) => ({
        simulant,
        lodLevel: animationQuality as keyof typeof LOD_CONFIGS,
        distance: 0,
      }));
    }

    return activeSimulants.map((simulant) => {
      const distance = Math.sqrt(
        Math.pow(simulant.position.x - cameraPositionRef.current.x, 2) +
          Math.pow(simulant.position.z - cameraPositionRef.current.z, 2),
      );

      let lodLevel: keyof typeof LOD_CONFIGS = "culled";

      if (distance <= LOD_CONFIGS.high.maxDistance) {
        lodLevel = "high";
      } else if (distance <= LOD_CONFIGS.medium.maxDistance) {
        lodLevel = "medium";
      } else if (distance <= LOD_CONFIGS.low.maxDistance) {
        lodLevel = "low";
      }

      return { simulant, lodLevel, distance };
    });
  }, [activeSimulants, enableLOD, animationQuality]);

  // Update camera position for LOD calculations (runs in module's isolated frame)
  const updateCameraPosition = useCallback((camera: THREE.Camera) => {
    if (camera) {
      cameraPositionRef.current = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      };
    }
  }, []);

  // Isolated animation update loop
  const animationUpdateLoop = useCallback(
    (deltaTime: number) => {
      frameCountRef.current++;
      const currentTime = performance.now();

      // Build animation queue prioritizing close/important simulants
      animationQueueRef.current = simulantsWithLOD
        .filter(({ lodLevel }) => lodLevel !== "culled")
        .sort((a, b) => {
          // Prioritize by LOD level and update frequency needs
          const aConfig = LOD_CONFIGS[a.lodLevel];
          const bConfig = LOD_CONFIGS[b.lodLevel];
          const aState = animationStates.get(a.simulant.id);
          const bState = animationStates.get(b.simulant.id);

          const aTimeSinceUpdate = aState
            ? currentTime - aState.lastUpdate
            : Infinity;
          const bTimeSinceUpdate = bState
            ? currentTime - bState.lastUpdate
            : Infinity;

          const aInterval = 1000 / aConfig.updateFrequency;
          const bInterval = 1000 / bConfig.updateFrequency;

          const aNeedsUpdate = aTimeSinceUpdate >= aInterval;
          const bNeedsUpdate = bTimeSinceUpdate >= bInterval;

          if (aNeedsUpdate && !bNeedsUpdate) return -1;
          if (!aNeedsUpdate && bNeedsUpdate) return 1;

          // Both need update or both don't - prioritize by distance
          return a.distance - b.distance;
        })
        .slice(0, maxAnimationsPerFrame)
        .map(({ simulant }) => simulant.id);

      // Update animation states for processed simulants
      setAnimationStates((prev) => {
        const newStates = new Map(prev);

        simulantsWithLOD.forEach(({ simulant, lodLevel }) => {
          const config = LOD_CONFIGS[lodLevel];
          const currentState = newStates.get(simulant.id);
          const timeSinceUpdate = currentState
            ? currentTime - currentState.lastUpdate
            : Infinity;
          const updateInterval = 1000 / config.updateFrequency;

          if (
            animationQueueRef.current.includes(simulant.id) ||
            !currentState
          ) {
            newStates.set(simulant.id, {
              lastUpdate: currentTime,
              lodLevel,
              isPlaying: config.updateFrequency > 0,
              animationIndex:
                (currentState?.animationIndex || 0) +
                deltaTime * 0.001 * config.animationQuality,
            });
          }
        });

        return newStates;
      });
    },
    [simulantsWithLOD, animationStates, maxAnimationsPerFrame],
  );

  // Register animation update loop with module system
  React.useEffect(() => {
    requestFrame(animationUpdateLoop);
  }, [requestFrame, animationUpdateLoop]);

  // Update camera position from the main render loop (but throttled)
  useFrame(({ camera }) => {
    // Only update camera position every few frames to avoid performance impact
    if (frameCountRef.current % 5 === 0) {
      updateCameraPosition(camera);
    }
  });

  // Performance monitoring
  const stats = getStats();
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development" && stats) {
      if (stats.averageFrameTime > 10) {
        console.warn(
          "[AnimationModule] Performance warning - consider reducing maxAnimationsPerFrame or simulant count",
        );
      }
    }
  }, [stats]);

  // Enable/disable based on simulant count
  React.useEffect(() => {
    const shouldEnable = activeSimulants.length > 0;
    setEnabled(shouldEnable);
  }, [activeSimulants.length, setEnabled]);

  return (
    <group name="animation-module">
      {/* Render simulants with their calculated LOD states */}
      {simulantsWithLOD.map(({ simulant, lodLevel, distance }) => {
        const animationState = animationStates.get(simulant.id);
        const config = LOD_CONFIGS[lodLevel];

        // Don't render culled simulants
        if (lodLevel === "culled") return null;

        return (
          <AnimatedSimulantRenderer
            key={`anim-${simulant.id}`}
            simulant={simulant}
            lodLevel={lodLevel}
            config={config}
            animationState={animationState}
            distance={distance}
          />
        );
      })}

      {/* Debug visualization in development */}
      {process.env.NODE_ENV === "development" && (
        <AnimationDebugOverlay
          simulantsCount={activeSimulants.length}
          animationQueue={animationQueueRef.current}
          stats={stats}
        />
      )}
    </group>
  );
}

// Individual animated simulant with LOD-aware rendering
function AnimatedSimulantRenderer({
  simulant,
  lodLevel,
  config,
  animationState,
  distance,
}: {
  simulant: AISimulant;
  lodLevel: keyof typeof LOD_CONFIGS;
  config: AnimationLODConfig;
  animationState?: SimulantAnimationState;
  distance: number;
}) {
  const meshRef = useRef<THREE.Group>(null);

  // Scale down simulants that are far away
  const scale = useMemo(() => {
    const baseScale = 0.8;
    const lodScale = Math.max(0.3, 1 - distance / 100);
    return baseScale * lodScale;
  }, [distance]);

  return (
    <group
      ref={meshRef}
      position={[simulant.position.x, simulant.position.y, simulant.position.z]}
    >
      <SimpleAnimatedAvatar
        simulant={simulant}
        scale={scale}
        // Pass LOD configuration to avatar
        enableBoneAnimations={config.enableBoneAnimations}
        animationQuality={config.animationQuality}
        updateFrequency={config.updateFrequency}
      />

      {/* LOD debug indicator */}
      {process.env.NODE_ENV === "development" && (
        <mesh position={[0, 2.5, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshBasicMaterial
            color={
              lodLevel === "high"
                ? "#00ff00"
                : lodLevel === "medium"
                  ? "#ffff00"
                  : lodLevel === "low"
                    ? "#ff8800"
                    : "#ff0000"
            }
          />
        </mesh>
      )}
    </group>
  );
}

// Debug overlay component
function AnimationDebugOverlay({
  simulantsCount,
  animationQueue,
  stats,
}: {
  simulantsCount: number;
  animationQueue: string[];
  stats: ModuleState | null;
}) {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <group name="animation-debug">
      {/* Visual indicator of animation system status */}
      <mesh position={[-5, 3, 0]}>
        <sphereGeometry args={[0.2]} />
        <meshBasicMaterial color={stats?.isRunning ? "#00ff00" : "#ff0000"} />
      </mesh>
    </group>
  );
}

export default AnimationModule;
