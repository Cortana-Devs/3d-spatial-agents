"use client";

import React, { useEffect, useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Stats } from "@react-three/drei";
import { Vector3 } from "three";
import { useWorldStore } from "../store/worldStore";
import PlayerAvatarManager from "../components/modules/PlayerAvatarManager";
import EnhancedPlayerControlModule from "../components/modules/EnhancedPlayerControlModule";
import IsolatedAnimationManager from "../components/animations/IsolatedAnimationManager";
import { ModuleManager } from "../components/modules/ModuleManager";
import RestoreBlocksButton from "../components/debug/RestoreBlocksButton";

/**
 * PlayerAvatarExample - Comprehensive demonstration of the Player Avatar Integration System
 *
 * This example showcases:
 * - Player avatar loading and management
 * - Avatar-controller synchronization
 * - Movement-based animation transitions
 * - Performance optimization features
 * - First-person/third-person switching
 * - Debug visualizations
 */
export function PlayerAvatarExample() {
  const {
    playerAvatar,
    activeCamera,
    setCameraMode,
    setPlayerAvatar,
    clearPlayerAvatar,
    blockMap,
  } = useWorldStore();

  const [isLoading, setIsLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState(
    "/models/default-avatar.glb",
  );
  const [showDebugInfo, setShowDebugInfo] = useState(true);
  const [performanceMode, setPerformanceMode] = useState<
    "high" | "medium" | "low"
  >("high");
  const [avatarVisible, setAvatarVisible] = useState(true);

  // Sample avatar models for demonstration
  const availableModels = [
    { name: "Default Avatar", url: "/models/default-avatar.glb" },
    { name: "Business Person", url: "/models/business-avatar.glb" },
    { name: "Casual Character", url: "/models/casual-avatar.glb" },
    { name: "Sci-Fi Character", url: "/models/scifi-avatar.glb" },
  ];

  // Avatar loading handler
  const handleLoadAvatar = async (modelUrl: string) => {
    try {
      setIsLoading(true);
      setCurrentModel(modelUrl);

      // Avatar will be loaded by PlayerAvatarManager
      console.log(`🔄 Loading avatar: ${modelUrl}`);
    } catch (error) {
      console.error("Failed to load avatar:", error);
      alert(
        `Failed to load avatar: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Camera mode switching
  const handleCameraModeChange = (mode: "fly" | "orbit") => {
    setCameraMode(mode);
    console.log(`📷 Camera mode changed to: ${mode}`);
  };

  // Performance mode adjustment
  const handlePerformanceModeChange = (mode: "high" | "medium" | "low") => {
    setPerformanceMode(mode);

    // Automatically adjust avatar LOD based on performance mode
    if (playerAvatar) {
      let lodLevel: "high" | "medium" | "low";
      switch (mode) {
        case "high":
          lodLevel = "high";
          break;
        case "medium":
          lodLevel = "medium";
          break;
        case "low":
          lodLevel = "low";
          break;
      }

      // This would be handled by the avatar manager
      console.log(`⚡ Performance mode: ${mode}, LOD: ${lodLevel}`);
    }
  };

  return (
    <div className="w-full h-screen relative bg-gradient-to-b from-indigo-900 via-purple-900 to-pink-900">
      {/* Control Panel */}
      <div className="absolute top-4 right-4 z-10 bg-black/80 backdrop-blur-md rounded-lg p-4 text-white min-w-80">
        <h2 className="text-lg font-bold text-blue-400 mb-4">
          🎮 Player Avatar Demo
        </h2>

        {/* Avatar Model Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Avatar Model:
          </label>
          <select
            value={currentModel}
            onChange={(e) => handleLoadAvatar(e.target.value)}
            disabled={isLoading}
            className="w-full p-2 rounded bg-gray-800 border border-gray-600 text-white"
          >
            {availableModels.map((model) => (
              <option key={model.url} value={model.url}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        {/* Camera Mode */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Camera Mode:</label>
          <div className="flex gap-2">
            <button
              onClick={() => handleCameraModeChange("fly")}
              className={`px-3 py-1 rounded text-sm ${
                activeCamera === "fly"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300"
              }`}
            >
              First Person
            </button>
            <button
              onClick={() => handleCameraModeChange("orbit")}
              className={`px-3 py-1 rounded text-sm ${
                activeCamera === "orbit"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300"
              }`}
            >
              Third Person
            </button>
          </div>
        </div>

        {/* Performance Mode */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Performance Mode:
          </label>
          <div className="flex gap-2">
            {(["high", "medium", "low"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => handlePerformanceModeChange(mode)}
                className={`px-3 py-1 rounded text-sm capitalize ${
                  performanceMode === mode
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 text-gray-300"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Avatar Controls */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Avatar Controls:
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setAvatarVisible(!avatarVisible)}
              className={`px-3 py-1 rounded text-sm ${
                avatarVisible
                  ? "bg-green-600 text-white"
                  : "bg-red-600 text-white"
              }`}
            >
              {avatarVisible ? "Hide" : "Show"}
            </button>
            <button
              onClick={() => clearPlayerAvatar()}
              className="px-3 py-1 rounded text-sm bg-red-700 text-white hover:bg-red-600"
            >
              Unload
            </button>
          </div>
        </div>

        {/* Debug Toggle */}
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showDebugInfo}
              onChange={(e) => setShowDebugInfo(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Show Debug Info</span>
          </label>
        </div>

        {/* Avatar Status */}
        <div className="border-t border-gray-600 pt-4">
          <h3 className="text-sm font-medium text-blue-400 mb-2">
            Avatar Status:
          </h3>
          <div className="text-xs space-y-1">
            <div>
              Status:{" "}
              {isLoading
                ? "🔄 Loading..."
                : playerAvatar?.isLoaded
                  ? "✅ Loaded"
                  : "❌ Not Loaded"}
            </div>
            <div>Model: {currentModel.split("/").pop()}</div>
            <div>Animation: {playerAvatar?.currentAnimation || "None"}</div>
            <div>LOD: {playerAvatar?.renderLOD || "N/A"}</div>
            <div>Visible: {playerAvatar?.isVisible ? "Yes" : "No"}</div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 z-10 bg-black/80 backdrop-blur-md rounded-lg p-4 text-white max-w-md">
        <h3 className="text-lg font-bold text-green-400 mb-2">🕹️ Controls</h3>
        <div className="text-sm space-y-1">
          <div>
            <strong>Movement:</strong> WASD or Arrow Keys
          </div>
          <div>
            <strong>Look:</strong> Mouse (click to lock cursor)
          </div>
          <div>
            <strong>Sprint:</strong> Hold Shift
          </div>
          <div>
            <strong>Fly Mode:</strong> Space/C for up/down
          </div>
          <div>
            <strong>Crouch:</strong> Z key
          </div>
          <div>
            <strong>Exit Cursor Lock:</strong> Escape
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-20 bg-black/50 flex items-center justify-center">
          <div className="bg-white/90 rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-800">Loading Avatar...</p>
          </div>
        </div>
      )}

      {/* 3D Scene */}
      <Canvas
        shadows
        camera={{
          position: [10, 10, 10],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, 10, -10]} intensity={0.5} />

        {/* Environment */}
        <Environment preset="sunset" />

        {/* Ground Grid */}
        <Grid
          args={[100, 100]}
          position={[0, 0, 0]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#666"
          sectionSize={10}
          sectionThickness={1}
          sectionColor="#999"
          fadeDistance={50}
          fadeStrength={0.5}
          infiniteGrid
        />

        {/* Ground Plane */}
        <mesh position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshLambertMaterial color="#2a2a2a" />
        </mesh>

        {/* Sample World Objects */}
        <SampleWorldObjects />

        {/* World Store Blocks - Actual blocks from the store */}
        <group name="world-store-blocks">
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
        </group>

        {/* Module Manager - Provides performance isolation */}
        <ModuleManager>
          {/* Animation Manager - Handles all animations */}
          <IsolatedAnimationManager />

          {/* Player Avatar Manager - Core avatar system */}
          <PlayerAvatarManager
            modelUrl={currentModel}
            enableAnimations={true}
            performanceMode={performanceMode}
            hideInFirstPerson={activeCamera === "fly"}
            onAvatarLoaded={(avatar) => {
              console.log("✅ Avatar loaded in example:", avatar.characterId);
              setIsLoading(false);
            }}
            onAnimationChanged={(animation) => {
              console.log(`🎭 Animation changed: ${animation}`);
            }}
            onError={(error) => {
              console.error("❌ Avatar error:", error);
              setIsLoading(false);
            }}
          />

          {/* Enhanced Player Controls with Avatar Integration */}
          <EnhancedPlayerControlModule
            enableKeyboardControls={true}
            enableMouseLook={true}
            movementSpeed={6.0}
            lookSensitivity={0.002}
            smoothing={0.15}
            enableCollision={true}
            enableAvatarSync={true}
            avatarOffsetDistance={2.5}
            avatarHeightOffset={-0.5}
          />
        </ModuleManager>

        {/* Camera Controls for Third Person */}
        {activeCamera === "orbit" && (
          <OrbitControls
            target={playerAvatar?.position || [0, 1, 0]}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={20}
            minPolarAngle={0}
            maxPolarAngle={Math.PI * 0.8}
          />
        )}

        {/* Performance Stats */}
        {showDebugInfo && <Stats />}
      </Canvas>

      {/* Restore Blocks Button - Show if blocks are missing */}
      {blockMap.size === 0 && <RestoreBlocksButton />}

      {/* Performance Monitor */}
      {showDebugInfo && <PerformanceMonitor />}
    </div>
  );
}

/**
 * Sample world objects to demonstrate avatar interaction
 */
function SampleWorldObjects() {
  return (
    <group name="sample-world">
      {/* Simple building */}
      <group position={[5, 0, 5]}>
        <mesh position={[0, 1, 0]} castShadow>
          <boxGeometry args={[3, 2, 3]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        <mesh position={[0, 3, 0]} castShadow>
          <coneGeometry args={[2, 1.5, 4]} />
          <meshStandardMaterial color="#654321" />
        </mesh>
      </group>

      {/* Trees */}
      {[-8, 0, 8].map((x, i) => (
        <group key={i} position={[x, 0, -8]}>
          <mesh position={[0, 1, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 2]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, 3, 0]} castShadow>
            <sphereGeometry args={[1.5]} />
            <meshStandardMaterial color="#228B22" />
          </mesh>
        </group>
      ))}

      {/* Platforms for testing jumping */}
      <mesh position={[10, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 0.2, 2]} />
        <meshStandardMaterial color="#666" />
      </mesh>
      <mesh position={[10, 2.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.2, 1.5]} />
        <meshStandardMaterial color="#777" />
      </mesh>

      {/* Ramps */}
      <mesh
        position={[-5, 0.5, 0]}
        rotation={[0, 0, -0.2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[5, 0.2, 2]} />
        <meshStandardMaterial color="#555" />
      </mesh>
    </group>
  );
}

/**
 * Performance monitoring component
 */
function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    avatarMemory: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      // Get performance metrics from global APIs
      const avatarAPI = (window as any).__playerAvatarAPI;
      const animationAPI = (window as any).__animationAPI;

      const avatarMetrics = avatarAPI?.getPerformanceMetrics?.() || {};
      const animationMetrics = animationAPI?.getMetrics?.() || {};

      setMetrics({
        fps: avatarMetrics.averageFPS || 0,
        frameTime: avatarMetrics.renderTime || 0,
        memoryUsage: animationMetrics.memoryUsage || 0,
        avatarMemory: avatarMetrics.memoryUsage || 0,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur-md rounded-lg p-3 text-white text-xs">
      <div className="font-bold text-yellow-400 mb-2">⚡ Performance</div>
      <div>FPS: {metrics.fps.toFixed(0)}</div>
      <div>Frame: {metrics.frameTime.toFixed(2)}ms</div>
      <div>Memory: {Math.round(metrics.memoryUsage)}MB</div>
      <div>Avatar: {Math.round(metrics.avatarMemory / 1024 / 1024)}MB</div>
    </div>
  );
}

/**
 * Usage Examples and Integration Tests
 */
export const PlayerAvatarUsageExamples = {
  // Basic avatar loading
  loadAvatar: async () => {
    const avatarAPI = (window as any).__playerAvatarAPI;
    if (avatarAPI) {
      const avatar = await avatarAPI.loadAvatar("/models/test-avatar.glb");
      console.log("Avatar loaded:", avatar);
    }
  },

  // Animation control
  playAnimation: (animationName: string) => {
    const avatarAPI = (window as any).__playerAvatarAPI;
    if (avatarAPI) {
      avatarAPI.playAnimation(animationName, true);
    }
  },

  // Performance optimization
  optimizePerformance: () => {
    const avatarAPI = (window as any).__playerAvatarAPI;
    if (avatarAPI) {
      avatarAPI.optimizeForPerformance();
    }
  },

  // LOD control
  setLOD: (level: "high" | "medium" | "low") => {
    const avatarAPI = (window as any).__playerAvatarAPI;
    if (avatarAPI) {
      avatarAPI.setLOD(level);
    }
  },
};

export default PlayerAvatarExample;
