"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
import { useWorldStore } from "../../store/worldStore";
import { CameraMode, SelectionMode } from "../../types";
import { CAMERA_PRESETS } from "./CameraController";

// Import modular system
import {
  ModuleManager,
  AnimationModule,
  BlockPlacementModule,
  PlayerControlModule,
  SkyboxModule,
  ModulePerformanceMonitor,
  ModuleUtils,
  PERFORMANCE_PRESETS,
  type ModuleSystemProps,
} from "../modules";

// Import existing components that still work with the modular system
import VoxelCanvas from "./VoxelCanvas";
import GridSystem from "./GridSystem";
import CameraControls from "./CameraControls";

interface ModularVoxelCanvasProps {
  className?: string;
  enablePerformanceStats?: boolean;
  performancePreset?: "HIGH_PERFORMANCE" | "BALANCED" | "LOW_END" | "AUTO";
  moduleConfig?: Partial<ModuleSystemProps>;
}

// Isolated Scene Content - only renders blocks and static elements
function IsolatedSceneContent({
  cameraMode,
  performanceSettings,
}: {
  cameraMode: CameraMode;
  performanceSettings: any;
}) {
  const { blockMap, gridConfig } = useWorldStore();

  return (
    <>
      {/* Basic lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[50, 50, 50]}
        intensity={1}
        castShadow={performanceSettings.shadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />

      {/* Static block rendering using existing VoxelCanvas blocks */}
      {Array.from(blockMap.values()).map((block) => (
        <mesh
          key={block.id}
          position={[block.position.x, block.position.y, block.position.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.95, 0.95, 0.95]} />
          <meshStandardMaterial color={block.color} />
        </mesh>
      ))}

      {/* Grid system - low-frequency updates */}
      <GridSystem config={gridConfig} />
    </>
  );
}

export default function ModularVoxelCanvas({
  className = "",
  enablePerformanceStats = false,
  performancePreset = "AUTO",
  moduleConfig = {},
}: ModularVoxelCanvasProps) {
  const { blockMap, activeCamera, setCameraMode } = useWorldStore();
  const blockCount = blockMap.size;

  // Auto-detect or use specified performance preset
  const detectedPreset = useMemo(() => {
    if (performancePreset === "AUTO") {
      return ModuleUtils.detectPerformanceTier();
    }
    return performancePreset;
  }, [performancePreset]);

  const recommendedSettings = useMemo(() => {
    return ModuleUtils.getRecommendedSettings(detectedPreset);
  }, [detectedPreset]);

  // Module configuration with performance optimizations
  const moduleSettings = useMemo(
    () => ({
      enableAnimations: moduleConfig.enableAnimations !== false,
      enableBlockPlacement: moduleConfig.enableBlockPlacement !== false,
      enablePlayerControls: moduleConfig.enablePlayerControls !== false,
      enableSkybox: moduleConfig.enableSkybox !== false,
      enablePerformanceMonitoring: enablePerformanceStats,
    }),
    [moduleConfig, enablePerformanceStats],
  );

  // Camera mode handling
  const cameraMode = activeCamera as CameraMode;

  const handleCameraModeChange = useCallback(
    (mode: CameraMode) => {
      setCameraMode(mode);
    },
    [setCameraMode],
  );

  const handlePresetApply = useCallback(
    (presetName: keyof typeof CAMERA_PRESETS) => {
      void import("@/utils/devLogger").then(({ devLog }) =>
        devLog("Applying preset:", presetName),
      );
    },
    [],
  );

  const handleFocusOnBlock = useCallback(
    (blockId: string) => {
      const block = Array.from(blockMap.values()).find((b) => b.id === blockId);
      if (block) {
        const blockPosition = new Vector3(
          block.position.x,
          block.position.y,
          block.position.z,
        );
        void import("@/utils/devLogger").then(({ devLog }) =>
          devLog("Focusing on block at:", blockPosition),
        );
      }
    },
    [blockMap],
  );

  // Dynamic performance settings based on block count and preset
  const performanceSettings = useMemo(() => {
    const baseSettings = {
      shadows: true,
      antialias: true,
      dpr: [1, 2] as [number, number],
      performance: { min: 0.5, max: 1, debounce: 200 },
      enableBlockLOD: true,
      blockRenderDistance: 50,
    };

    // Adjust based on performance preset
    if (detectedPreset === "LOW_END" || blockCount > 1000) {
      return {
        ...baseSettings,
        shadows: false,
        antialias: false,
        dpr: [0.8, 1.2] as [number, number],
        performance: { min: 0.3, max: 0.7, debounce: 400 },
        blockRenderDistance: 30,
      };
    } else if (detectedPreset === "HIGH_PERFORMANCE" && blockCount < 200) {
      return {
        ...baseSettings,
        shadows: true,
        antialias: true,
        dpr: [1, 2.5] as [number, number],
        performance: { min: 0.7, max: 1, debounce: 100 },
        blockRenderDistance: 100,
      };
    }

    return baseSettings;
  }, [blockCount, detectedPreset]);

  return (
    <div className={`w-full h-full relative ${className}`}>
      <Canvas
        shadows={performanceSettings.shadows}
        camera={{
          position: [10, 10, 10],
          fov: 60,
          near: 0.1,
          far: performanceSettings.blockRenderDistance * 2,
        }}
        gl={{
          antialias: performanceSettings.antialias,
          alpha: false,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
          logarithmicDepthBuffer: blockCount > 800,
          preserveDrawingBuffer: false,
          premultipliedAlpha: false,
          failIfMajorPerformanceCaveat: false,
        }}
        dpr={performanceSettings.dpr}
        performance={performanceSettings.performance}
        frameloop="demand" // Use demand-based rendering - modules will invalidate when needed
      >
        {/* Module Manager - Handles all performance isolation */}
        <ModuleManager>
          {/* Static scene content - rendered independently */}
          <IsolatedSceneContent
            cameraMode={cameraMode}
            performanceSettings={performanceSettings}
          />

          {/* Isolated Skybox Module */}
          {moduleSettings.enableSkybox && (
            <SkyboxModule
              skyboxPath="/skyboxes/default/"
              enableDynamicSkybox={detectedPreset === "HIGH_PERFORMANCE"}
              enableTimeOfDay={false}
              updateFrequency={0.1} // Very low frequency updates
            />
          )}

          {/* Isolated Animation Module */}
          {moduleSettings.enableAnimations && (
            <AnimationModule
              maxSimulants={recommendedSettings.animations.maxSimulants}
              enableLOD={true}
              animationQuality={recommendedSettings.animations.animationQuality}
              maxAnimationsPerFrame={
                recommendedSettings.animations.maxAnimationsPerFrame
              }
            />
          )}

          {/* Isolated Block Placement Module */}
          {moduleSettings.enableBlockPlacement && (
            <BlockPlacementModule
              enableGhostPreview={true}
              maxRaycastsPerFrame={
                recommendedSettings.blockPlacement.maxRaycastsPerFrame
              }
              debounceMs={recommendedSettings.blockPlacement.debounceMs}
              enableBatching={recommendedSettings.blockPlacement.enableBatching}
            />
          )}

          {/* Isolated Player Control Module */}
          {moduleSettings.enablePlayerControls && (
            <PlayerControlModule
              enableKeyboardControls={true}
              enableMouseLook={true}
              movementSpeed={8.0}
              lookSensitivity={0.002}
              smoothing={recommendedSettings.playerControls.smoothing}
              enableCollision={true}
            />
          )}
        </ModuleManager>
      </Canvas>

      {/* UI Controls - outside of 3D context for better performance */}
      <div className="absolute top-4 left-4 z-10">
        <CameraControls
          currentMode={cameraMode}
          onModeChange={handleCameraModeChange}
          onPresetApply={handlePresetApply}
          onFocusOnBlock={handleFocusOnBlock}
        />
      </div>

      {/* Performance Statistics */}
      {enablePerformanceStats && (
        <div className="absolute top-4 right-4 z-10">
          <ModulePerformanceMonitor />
          <PerformanceStatsOverlay
            preset={detectedPreset}
            blockCount={blockCount}
            activeModules={Object.keys(moduleSettings).filter(
              (key) => moduleSettings[key as keyof typeof moduleSettings],
            )}
          />
        </div>
      )}

      {/* Performance Warning */}
      {blockCount > 500 && detectedPreset === "LOW_END" && (
        <div className="absolute bottom-4 left-4 bg-yellow-900 bg-opacity-80 text-yellow-200 px-3 py-2 rounded text-sm z-10">
          ⚠️ High block count detected. Consider reducing world size for better
          performance.
        </div>
      )}

      {/* Module Status Indicators (Development only) */}
      {process.env.NODE_ENV === "development" && (
        <ModuleStatusOverlay moduleSettings={moduleSettings} />
      )}
    </div>
  );
}

// Performance statistics overlay
function PerformanceStatsOverlay({
  preset,
  blockCount,
  activeModules,
}: {
  preset: string;
  blockCount: number;
  activeModules: string[];
}) {
  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.8)",
        color: "white",
        padding: "8px 12px",
        borderRadius: "6px",
        fontSize: "11px",
        fontFamily: "monospace",
        minWidth: "200px",
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
        Performance: {preset}
      </div>
      <div>Blocks: {blockCount}</div>
      <div>Active Modules: {activeModules.length}</div>
      <div style={{ fontSize: "9px", marginTop: "4px", opacity: 0.7 }}>
        {activeModules.join(", ")}
      </div>
    </div>
  );
}

// Module status overlay for development
function ModuleStatusOverlay({
  moduleSettings,
}: {
  moduleSettings: Record<string, boolean>;
}) {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div className="absolute bottom-4 right-4 bg-black bg-opacity-80 text-white p-2 rounded text-xs font-mono z-10">
      <div className="font-bold mb-1">Module Status:</div>
      {Object.entries(moduleSettings).map(([module, enabled]) => (
        <div key={module} className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              enabled ? "bg-green-400" : "bg-gray-500"
            }`}
          />
          <span className="text-xs">{module}</span>
        </div>
      ))}
    </div>
  );
}

// Export types for external use
export type { ModularVoxelCanvasProps };
