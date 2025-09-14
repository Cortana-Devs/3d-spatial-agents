"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stats } from "@react-three/drei";
import { BoxGeometry, MeshStandardMaterial, Vector3, Color, Fog } from "three";
import * as THREE from "three";

// Import our mobile optimization components
import { MobileOptimizedRenderer } from "@components/optimization/MobileOptimizedRenderer";
import {
  MobileShaderProvider,
  useMobileShaders,
} from "@components/optimization/MobileShaderManager";
import { MobilePerformanceMonitor } from "@components/optimization/MobilePerformanceMonitor";
import { MobileInstanceManager } from "@components/optimization/MobileInstanceManager";
import { useMobileOptimization } from "../hooks/optimization/useMobileOptimization";

// Voxel block types optimized for mobile
enum BlockType {
  STONE = 1,
  GRASS = 2,
  WOOD = 3,
  GLASS = 4,
}

interface VoxelBlock {
  type: BlockType;
  position: Vector3;
  color: Color;
  id: string;
}

// Mobile-optimized voxel world component
function MobileVoxelWorld() {
  const [blocks, setBlocks] = useState<Map<string, VoxelBlock>>(new Map());
  const [isPlacing, setIsPlacing] = useState(false);
  const [selectedBlockType, setSelectedBlockType] = useState(BlockType.STONE);

  // Mobile optimization hook - First call without isMobile dependency
  const optimizationResult = useMobileOptimization({
    // Override defaults for voxel world
    maxInstances: 20000,
    targetFPS: 30, // Default to 30, will adjust below
    enableAdaptiveQuality: true,
  });

  // Destructure after hook call to avoid variable-before-declaration error
  const {
    deviceProfile,
    config,
    metrics,
    isMobile,
    isLowEnd,
    supportsWebGPU,
    recommendations,
  } = optimizationResult;

  // Update targetFPS based on isMobile after it's available
  useMemo(() => {
    if (config) {
      config.targetFPS = isMobile ? 30 : 60;
    }
  }, [isMobile, config]);

  // Generate optimized geometries and materials
  const { geometry, materials } = useMemo(() => {
    // Use simpler geometry for mobile devices
    const segments = isLowEnd ? 1 : 2;
    const geo = new BoxGeometry(1, 1, 1, segments, segments, segments);

    // Mobile-optimized materials
    const mats = {
      [BlockType.STONE]: new MeshStandardMaterial({
        color: 0x888888,
        roughness: isLowEnd ? 1.0 : 0.8,
        metalness: 0.1,
      }),
      [BlockType.GRASS]: new MeshStandardMaterial({
        color: 0x4caf50,
        roughness: isLowEnd ? 1.0 : 0.9,
        metalness: 0.0,
      }),
      [BlockType.WOOD]: new MeshStandardMaterial({
        color: 0x8d6e63,
        roughness: isLowEnd ? 1.0 : 0.8,
        metalness: 0.0,
      }),
      [BlockType.GLASS]: new MeshStandardMaterial({
        color: 0x87ceeb,
        transparent: true,
        opacity: isLowEnd ? 0.6 : 0.8,
        roughness: 0.1,
        metalness: 0.0,
      }),
    };

    return { geometry: geo, materials: mats };
  }, [isLowEnd]);

  // Block placement system optimized for mobile
  const placeBlock = useCallback(
    (position: Vector3, type: BlockType) => {
      const blockId = `${position.x}_${position.y}_${position.z}`;

      // Limit total blocks for mobile performance
      const maxBlocks = isLowEnd ? 1000 : isMobile ? 5000 : 10000;
      if (blocks.size >= maxBlocks) {
        console.warn(`Maximum blocks reached (${maxBlocks})`);
        return;
      }

      const newBlock: VoxelBlock = {
        type,
        position: position.clone(),
        color: new Color().setHex((materials[type].color as any) || 0x888888),
        id: blockId,
      };

      setBlocks((prev) => new Map(prev.set(blockId, newBlock)));
    },
    [blocks.size, isLowEnd, isMobile, materials],
  );

  // Remove block
  const removeBlock = useCallback((position: Vector3) => {
    const blockId = `${position.x}_${position.y}_${position.z}`;
    setBlocks((prev) => {
      const newMap = new Map(prev);
      newMap.delete(blockId);
      return newMap;
    });
  }, []);

  // Generate initial world for demo
  useEffect(() => {
    const initialBlocks = new Map<string, VoxelBlock>();

    // Create a small demo world optimized for mobile
    const worldSize = isLowEnd ? 8 : isMobile ? 12 : 16;
    const density = isLowEnd ? 0.3 : 0.5;

    for (let x = -worldSize / 2; x < worldSize / 2; x++) {
      for (let z = -worldSize / 2; z < worldSize / 2; z++) {
        for (let y = 0; y < 3; y++) {
          if (Math.random() < density) {
            const position = new Vector3(x, y, z);
            const blockId = `${x}_${y}_${z}`;

            let type = BlockType.STONE;
            if (y === 2) type = BlockType.GRASS;
            else if (Math.random() < 0.2) type = BlockType.WOOD;
            else if (Math.random() < 0.1) type = BlockType.GLASS;

            const block: VoxelBlock = {
              type,
              position,
              color: new Color().setHex(
                (materials[type].color as any) || 0x888888,
              ),
              id: blockId,
            };

            initialBlocks.set(blockId, block);
          }
        }
      }
    }

    setBlocks(initialBlocks);
  }, [isLowEnd, isMobile, materials]);

  // Mobile-optimized lighting setup
  const lightingSetup = useMemo(() => {
    return (
      <>
        <directionalLight
          position={[10, 10, 10]}
          intensity={isLowEnd ? 0.8 : 1.2}
          castShadow={config.enableShadows}
          shadow-mapSize-width={config.shadowMapSize}
          shadow-mapSize-height={config.shadowMapSize}
          shadow-camera-near={0.1}
          shadow-camera-far={50}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        <ambientLight intensity={isLowEnd ? 0.4 : 0.3} />
      </>
    );
  }, [isLowEnd, config.enableShadows, config.shadowMapSize]);

  return (
    <>
      {/* Mobile Performance Monitor */}
      <MobilePerformanceMonitor
        showDebugInfo={true}
        targetFPS={config.targetFPS}
        enableThermalManagement={true}
        enableBatteryOptimization={isMobile}
      />

      {/* Controls UI */}
      <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-80 p-4 rounded-lg text-white">
        <h3 className="text-lg font-bold mb-2">📱 Mobile Voxel World</h3>

        <div className="mb-2">
          <div className="text-sm text-gray-300">
            Device: {deviceProfile.deviceType}
          </div>
          <div className="text-sm text-gray-300">
            Performance: {deviceProfile.performanceTier}
          </div>
          <div className="text-sm text-gray-300">
            WebGL2: {deviceProfile.supportsWebGL2 ? "✅" : "❌"}
          </div>
          <div className="text-sm text-gray-300">
            WebGPU: {supportsWebGPU ? "✅" : "❌"}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-sm font-semibold mb-1">Block Type:</div>
          <div className="grid grid-cols-2 gap-1">
            {[
              { type: BlockType.STONE, name: "Stone", color: "bg-gray-500" },
              { type: BlockType.GRASS, name: "Grass", color: "bg-green-500" },
              { type: BlockType.WOOD, name: "Wood", color: "bg-yellow-700" },
              { type: BlockType.GLASS, name: "Glass", color: "bg-blue-300" },
            ].map((block) => (
              <button
                key={block.type}
                onClick={() => setSelectedBlockType(block.type)}
                className={`px-2 py-1 text-xs rounded ${block.color} ${
                  selectedBlockType === block.type ? "ring-2 ring-white" : ""
                }`}
              >
                {block.name}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-gray-400">
          <div>
            Blocks: {blocks.size}/{isLowEnd ? "1K" : isMobile ? "5K" : "10K"}
          </div>
          <div>FPS: {metrics.fps.toFixed(1)}</div>
          <div>Quality: {(metrics.qualityLevel * 100).toFixed(0)}%</div>
          {metrics.batteryLevel && (
            <div>Battery: {(metrics.batteryLevel * 100).toFixed(0)}%</div>
          )}
        </div>

        {recommendations.length > 0 && (
          <div className="mt-2 p-2 bg-yellow-900 bg-opacity-50 rounded text-xs">
            <div className="font-semibold text-yellow-300">
              Recommendations:
            </div>
            {recommendations.slice(0, 2).map((rec, i) => (
              <div key={i} className="text-yellow-200">
                • {rec}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3D Canvas with mobile optimizations */}
      <Canvas
        camera={{
          position: [10, 10, 10],
          fov: isMobile ? 65 : 75,
        }}
        gl={{
          powerPreference: "high-performance",
          antialias: config.enableAntialiasing,
          alpha: false,
          depth: true,
          stencil: false,
          preserveDrawingBuffer: false,
        }}
        dpr={config.pixelRatio}
        performance={{
          min: isLowEnd ? 0.2 : 0.5,
          max: isLowEnd ? 0.8 : 1.0,
        }}
      >
        {/* Mobile optimization wrapper */}
        <MobileOptimizedRenderer
          enableAdaptiveQuality={config.enableAdaptiveQuality}
          enableThermalManagement={config.enableThermalThrottling}
        >
          <MobileShaderProvider
            performanceTarget={
              isLowEnd ? "battery" : isMobile ? "balanced" : "performance"
            }
          >
            {/* Lighting */}
            {lightingSetup}

            {/* Fog for mobile performance */}
            <fog attach="fog" args={["#000000", 30, isLowEnd ? 80 : 120]} />

            {/* Render blocks using mobile-optimized instance manager */}
            {Object.entries(materials).map(([typeStr, material]) => {
              const type = parseInt(typeStr) as BlockType;
              const typeBlocks = Array.from(blocks.values()).filter(
                (block) => block.type === type,
              );

              if (typeBlocks.length === 0) return null;

              return (
                <MobileInstanceManager
                  key={type}
                  geometry={geometry}
                  material={material}
                  config={{
                    maxInstances: Math.min(
                      typeBlocks.length * 2,
                      config.maxInstances,
                    ),
                    enableFrustumCulling: true,
                    enableDistanceCulling: true,
                    cullingDistance: config.cullDistance,
                    lodDistances: config.lodDistances,
                    targetFPS: config.targetFPS,
                  }}
                >
                  {typeBlocks.map((block, index) => (
                    <primitive
                      key={block.id}
                      object={(() => {
                        // This would integrate with the instance manager
                        // For now, this is a simplified representation
                        const mesh = new THREE.Mesh();
                        return mesh;
                      })()}
                    />
                  ))}
                </MobileInstanceManager>
              );
            })}

            {/* Camera controls optimized for mobile */}
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              dampingFactor={0.1}
              enableDamping={true}
              maxDistance={isLowEnd ? 50 : 100}
              minDistance={5}
              maxPolarAngle={Math.PI * 0.75}
            />

            {/* Performance stats */}
            {!isMobile && <Stats />}
          </MobileShaderProvider>
        </MobileOptimizedRenderer>
      </Canvas>
    </>
  );
}

// Main component with error boundary
export default function MobileOptimizedVoxelWorldExample() {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error("Mobile voxel world error:", error);
      setHasError(true);
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (hasError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">⚠️ WebGL Error</h2>
          <p className="mb-4">
            Your device may not support the required WebGL features.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black relative">
      <MobileVoxelWorld />

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10 bg-black bg-opacity-80 p-2 rounded text-white text-xs max-w-xs">
        <div className="font-semibold mb-1">Controls:</div>
        <div>• Drag to rotate camera</div>
        <div>• Pinch/scroll to zoom</div>
        <div>• Select block type and tap to place</div>
        <div>• System automatically optimizes for your device</div>
      </div>
    </div>
  );
}
