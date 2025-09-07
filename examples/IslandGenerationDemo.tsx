/**
 * Island Generation Demo Component
 *
 * Complete example showing how to integrate the island generation system
 * into the main Descendants application with UI controls and visual feedback.
 */

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stats } from '@react-three/drei';
import { Vector3 } from 'three';
import { useWorldStore } from '../store/worldStore';
import { useIslandGeneration } from '../hooks/useIslandGeneration';
import { BlockType } from '../types/blocks';
import IslandGenDevPanel from '../components/debug/IslandGenDevPanel';
import IslandDebugOverlay from '../components/debug/IslandDebugOverlay';
import IslandGenExample from '../components/debug/IslandGenExample';

// World visualization component
const WorldBlocks: React.FC = () => {
  const blocks = useWorldStore((state) => state.getAllBlocks());

  return (
    <group>
      {blocks.map((block) => (
        <mesh
          key={block.id}
          position={[block.position.x, block.position.y, block.position.z]}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={block.color}
            transparent={block.type === BlockType.FROSTED_GLASS}
            opacity={block.type === BlockType.FROSTED_GLASS ? 0.7 : 1}
          />
        </mesh>
      ))}
    </group>
  );
};

// Grid helper component
const GridHelper: React.FC<{ size?: number }> = ({ size = 100 }) => {
  return (
    <group>
      <gridHelper args={[size, size]} />
      <axesHelper args={[10]} />
    </group>
  );
};

// Camera controller
const CameraController: React.FC<{ target?: Vector3 }> = ({ target }) => {
  return (
    <OrbitControls
      target={target}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      maxPolarAngle={Math.PI * 0.75}
      minDistance={5}
      maxDistance={100}
    />
  );
};

// Status panel component
const StatusPanel: React.FC<{
  islandHook: ReturnType<typeof useIslandGeneration>;
  worldStore: any;
}> = ({ islandHook, worldStore }) => {
  const { state, config, getEstimatedBlocks } = islandHook;

  return (
    <div className="absolute top-4 left-4 bg-black bg-opacity-80 text-white p-4 rounded-lg z-30 min-w-64">
      <h3 className="text-lg font-bold mb-3">🏝️ Island Generation Demo</h3>

      {/* Current Status */}
      <div className="mb-4">
        <div className="text-sm text-gray-300 mb-1">Status</div>
        <div className={`px-2 py-1 rounded text-sm ${
          state.isGenerating ? 'bg-blue-600' :
          state.isClearing ? 'bg-red-600' :
          state.lastResult?.success ? 'bg-green-600' :
          state.progress.stage === 'Error' ? 'bg-red-600' :
          'bg-gray-600'
        }`}>
          {state.progress.stage}
        </div>

        {state.progress.value > 0 && (
          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
            <div
              className="h-2 bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${state.progress.value * 100}%` }}
            />
          </div>
        )}

        {state.progress.details && (
          <div className="text-xs text-gray-400 mt-1">{state.progress.details}</div>
        )}
      </div>

      {/* Configuration Summary */}
      <div className="mb-4 text-sm space-y-1">
        <div><strong>Seed:</strong> {config.seed.substring(0, 15)}...</div>
        <div><strong>Preset:</strong> {config.preset}</div>
        <div><strong>Size:</strong> {config.size.width}×{config.size.height}</div>
        <div><strong>Position:</strong> ({config.position.x.toFixed(0)}, {config.position.z.toFixed(0)})</div>
        <div><strong>Estimated Blocks:</strong> {getEstimatedBlocks().toLocaleString()}</div>
      </div>

      {/* World Stats */}
      <div className="mb-4 text-sm space-y-1">
        <div className="font-medium text-blue-200">World Statistics</div>
        <div>Total Blocks: {worldStore.blockCount.toLocaleString()}</div>
        <div>Memory Usage: {Math.round(worldStore.blockCount * 0.1)}KB</div>
        <div>Sync Status: <span className={
          worldStore.syncStatus === 'connected' ? 'text-green-400' :
          worldStore.syncStatus === 'syncing' ? 'text-yellow-400' : 'text-red-400'
        }>{worldStore.syncStatus}</span></div>
      </div>

      {/* Last Generation Result */}
      {state.lastResult && (
        <div className="mb-4 p-2 bg-gray-900 rounded text-xs">
          <div className="font-medium mb-1">Last Generation:</div>
          {state.lastResult.success ? (
            <div className="space-y-1">
              <div className="text-green-400">✅ Success</div>
              <div>Blocks Placed: {state.lastResult.placedBlocks.toLocaleString()}</div>
              <div>Generation Time: {state.lastResult.generationTimeMs.toFixed(1)}ms</div>
              <div>Throughput: {Math.round(state.lastResult.placedBlocks / state.lastResult.generationTimeMs * 1000)} blocks/sec</div>
            </div>
          ) : (
            <div className="text-red-400">❌ Failed: {state.lastResult.error}</div>
          )}
        </div>
      )}

      {/* Validation Warnings */}
      {state.validation && state.validation.warnings.length > 0 && (
        <div className="mb-4 p-2 bg-yellow-900 border border-yellow-600 rounded text-xs">
          <div className="font-medium text-yellow-200 mb-1">⚠️ Warnings</div>
          {state.validation.warnings.map((warning, i) => (
            <div key={i} className="text-yellow-300">{warning}</div>
          ))}
        </div>
      )}
    </div>
  );
};

// Control panel component
const ControlPanel: React.FC<{
  islandHook: ReturnType<typeof useIslandGeneration>;
  onToggleDevPanel: () => void;
  onToggleDebug: () => void;
  showDevPanel: boolean;
  showDebug: boolean;
}> = ({ islandHook, onToggleDevPanel, onToggleDebug, showDevPanel, showDebug }) => {
  const {
    generateIsland,
    clearIsland,
    setConfig,
    generateNewSeed,
    canGenerate,
    canClear,
    config,
    presets
  } = islandHook;

  const [selectedPreset, setSelectedPreset] = useState(config.preset);

  // Apply preset when changed
  const handlePresetChange = useCallback((preset: string) => {
    setSelectedPreset(preset);
    setConfig({
      preset,
      ...presets[preset] as any, // Apply preset overrides
    });
  }, [setConfig, presets]);

  // Quick generation
  const handleQuickGenerate = useCallback(async () => {
    if (canGenerate()) {
      await generateIsland();
    }
  }, [generateIsland, canGenerate]);

  // Quick clear
  const handleQuickClear = useCallback(async () => {
    if (canClear()) {
      await clearIsland();
    }
  }, [clearIsland, canClear]);

  return (
    <div className="absolute bottom-4 left-4 bg-black bg-opacity-80 text-white p-4 rounded-lg z-30 min-w-80">
      <h4 className="text-md font-bold mb-3">🎮 Controls</h4>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={handleQuickGenerate}
          disabled={!canGenerate()}
          className={`py-2 px-3 rounded text-sm font-medium ${
            !canGenerate()
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          🏝️ Generate
        </button>

        <button
          onClick={handleQuickClear}
          disabled={!canClear()}
          className={`py-2 px-3 rounded text-sm font-medium ${
            !canClear()
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          🧹 Clear
        </button>
      </div>

      {/* Preset Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Preset</label>
        <select
          value={selectedPreset}
          onChange={(e) => handlePresetChange(e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
        >
          <option value="small">Small (64×64)</option>
          <option value="medium">Medium (128×128)</option>
          <option value="large">Large (192×192)</option>
          <option value="organic">Organic Shape</option>
          <option value="geometric">Geometric Shape</option>
        </select>
      </div>

      {/* Utilities */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={generateNewSeed}
          className="py-1 px-2 bg-blue-600 hover:bg-blue-700 rounded text-xs"
        >
          🎲 New Seed
        </button>

        <button
          onClick={onToggleDebug}
          className={`py-1 px-2 rounded text-xs ${
            showDebug ? 'bg-purple-700' : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          🔍 Debug
        </button>
      </div>

      {/* Advanced Controls Toggle */}
      <button
        onClick={onToggleDevPanel}
        className="w-full py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded text-sm"
      >
        {showDevPanel ? '🔧 Hide Advanced' : '🔧 Show Advanced'}
      </button>

      {/* Keyboard Shortcuts */}
      <div className="mt-4 pt-3 border-t border-gray-700 text-xs">
        <div className="font-medium mb-1">⌨️ Shortcuts</div>
        <div className="space-y-1 text-gray-400">
          <div><kbd className="bg-gray-800 px-1 rounded">Shift+I</kbd> Generate</div>
          <div><kbd className="bg-gray-800 px-1 rounded">Shift+K</kbd> Clear</div>
        </div>
      </div>
    </div>
  );
};

// Main demo component
export const IslandGenerationDemo: React.FC = () => {
  const [cameraTarget, setCameraTarget] = useState(new Vector3(0, 0, 0));
  const [playerPosition, setPlayerPosition] = useState({ x: 0, z: 0 });
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);

  // World store
  const worldStore = useWorldStore();

  // Island generation hook with dev controls
  const islandHook = useIslandGeneration({
    enableDevControls: true,
    getPlayerPosition: () => playerPosition,
    defaultPreset: 'medium',
  });

  // Simulate player movement (in real app, this would come from actual player position)
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayerPosition(prev => ({
        x: prev.x + (Math.random() - 0.5) * 4,
        z: prev.z + (Math.random() - 0.5) * 4,
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Update camera target when player moves
  useEffect(() => {
    setCameraTarget(new Vector3(playerPosition.x, 0, playerPosition.z));
  }, [playerPosition]);

  // Handle successful generation - center camera on island
  useEffect(() => {
    if (islandHook.state.lastResult?.success) {
      setCameraTarget(new Vector3(
        islandHook.config.position.x,
        0,
        islandHook.config.position.z
      ));
    }
  }, [islandHook.state.lastResult, islandHook.config.position]);

  return (
    <div className="w-full h-screen relative bg-gray-900">
      {/* 3D Scene */}
      <Canvas
        camera={{
          position: [20, 20, 20],
          fov: 75,
          near: 0.1,
          far: 1000
        }}
        gl={{ antialias: true }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, 10, -10]} intensity={0.3} />

        {/* Camera Controls */}
        <CameraController target={cameraTarget} />

        {/* World Content */}
        <WorldBlocks />
        <GridHelper size={200} />

        {/* Performance Stats */}
        <Stats />
      </Canvas>

      {/* UI Overlays */}
      <StatusPanel
        islandHook={islandHook}
        worldStore={worldStore}
      />

      <ControlPanel
        islandHook={islandHook}
        onToggleDevPanel={() => setShowDevPanel(!showDevPanel)}
        onToggleDebug={() => setShowDebugOverlay(!showDebugOverlay)}
        showDevPanel={showDevPanel}
        showDebug={showDebugOverlay}
      />

      {/* Advanced Development Panel */}
      {showDevPanel && (
        <IslandGenDevPanel
          visible={showDevPanel}
          onToggle={() => setShowDevPanel(!showDevPanel)}
          playerPosition={playerPosition}
        />
      )}

      {/* Debug Visualization Overlay */}
      {showDebugOverlay && islandHook.state.lastResult?.debugInfo && (
        <IslandDebugOverlay
          debugInfo={islandHook.state.lastResult.debugInfo}
          width={400}
          height={400}
          visible={showDebugOverlay}
          onToggle={setShowDebugOverlay}
        />
      )}

      {/* Example Integration Panel */}
      <div className="absolute top-4 right-4 max-w-md">
        <IslandGenExample
          showDevPanel={false}
          className="bg-black bg-opacity-80 rounded-lg"
        />
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg z-30 max-w-sm">
        <h4 className="text-md font-bold mb-2">🚀 Getting Started</h4>
        <div className="text-sm space-y-2">
          <div>1. Select a preset size (small/medium/large)</div>
          <div>2. Click <strong>Generate</strong> to create an island</div>
          <div>3. Use mouse to orbit around and inspect the result</div>
          <div>4. Try different presets and seeds</div>
          <div>5. Use <strong>Advanced</strong> for detailed controls</div>
        </div>

        <div className="mt-3 pt-2 border-t border-gray-700 text-xs text-gray-400">
          <div className="mb-1">Integration Notes:</div>
          <div>• Islands are generated deterministically</div>
          <div>• Supports streaming for large islands</div>
          <div>• Includes comprehensive debug tools</div>
          <div>• Ready for production use</div>
        </div>
      </div>
    </div>
  );
};

export default IslandGenerationDemo;
