/**
 * Island Generation Development Panel
 *
 * Provides a UI for testing and configuring island generation during development.
 * Includes controls for generation parameters, presets, and real-time visualization.
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Vector3 } from 'three';
import { useWorldStore } from '../../store/worldStore';
import { BlockType } from '../../types/blocks';
import {
  generateAndPlaceIsland,
  clearIslandRegion,
  getIslandPresets,
  validateIslandPlacement,
  type IslandGenerationProgressCallback,
  type IslandIntegrationResult,
} from '../../utils/generation/islands/integration';
import {
  createDefaultIslandConfig,
  type IslandGenConfig,
} from '../../utils/generation/islands/IslandGenerator';
import IslandDebugOverlay from './IslandDebugOverlay';

interface IslandGenDevPanelProps {
  visible?: boolean;
  onToggle?: () => void;
  playerPosition?: { x: number; z: number };
}

interface GenerationProgress {
  progress: number;
  stage: string;
  details?: string;
}

interface ValidationResult {
  valid: boolean;
  warnings: string[];
  blockCount: number;
}

export const IslandGenDevPanel: React.FC<IslandGenDevPanelProps> = ({
  visible = false,
  onToggle,
  playerPosition = { x: 0, z: 0 }
}) => {
  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({ progress: 0, stage: 'Ready' });
  const [lastResult, setLastResult] = useState<IslandIntegrationResult | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);

  // Configuration state
  const [config, setConfig] = useState(() => createDefaultIslandConfig('dev-seed', 'dev-island'));
  const [selectedPreset, setSelectedPreset] = useState<string>('medium');
  const [customSeed, setCustomSeed] = useState('dev-seed-' + Date.now());
  const [islandSize, setIslandSize] = useState({ width: 128, height: 128 });

  // World store
  const worldStore = useWorldStore();
  const worldStoreRef = useRef(worldStore);
  worldStoreRef.current = worldStore;

  // Presets
  const presets = getIslandPresets();

  // Update config when preset changes
  useEffect(() => {
    if (selectedPreset && presets[selectedPreset]) {
      setConfig(prev => ({
        ...prev,
        ...presets[selectedPreset],
        seed: customSeed,
        islandId: `dev-${selectedPreset}-${Date.now()}`,
      }));
    }
  }, [selectedPreset, customSeed, presets]);

  // Update grid config when size or position changes
  useEffect(() => {
    setConfig(prev => ({
      ...prev,
      grid: {
        ...prev.grid,
        size: islandSize,
        origin: {
          x: playerPosition.x - Math.floor(islandSize.width / 2),
          z: playerPosition.z - Math.floor(islandSize.height / 2)
        }
      }
    }));
  }, [islandSize, playerPosition]);

  // Validate placement when configuration changes
  useEffect(() => {
    const worldStoreInterface = {
      addBlock: (pos: Vector3, type: BlockType, userId: string) => worldStoreRef.current.addBlock(pos, type, userId),
      removeBlock: (pos: Vector3, userId: string) => worldStoreRef.current.removeBlock(pos, userId),
      clearWorld: () => worldStoreRef.current.clearWorld(),
      getBlock: (pos: Vector3) => worldStoreRef.current.getBlock(pos),
      getAllBlocks: () => worldStoreRef.current.getAllBlocks(),
    };

    const result = validateIslandPlacement(
      playerPosition,
      islandSize,
      worldStoreInterface
    );
    setValidation(result);
  }, [playerPosition, islandSize]);

  // Progress callback
  const onProgress: IslandGenerationProgressCallback = useCallback((progress, stage, details) => {
    setProgress({ progress, stage, details });
  }, []);

  // Generate island
  const handleGenerate = useCallback(async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setProgress({ progress: 0, stage: 'Starting' });

    try {
      const worldStoreInterface = {
        addBlock: (pos: Vector3, type: BlockType, userId: string) => worldStoreRef.current.addBlock(pos, type, userId),
        removeBlock: (pos: Vector3, userId: string) => worldStoreRef.current.removeBlock(pos, userId),
        clearWorld: () => worldStoreRef.current.clearWorld(),
        getBlock: (pos: Vector3) => worldStoreRef.current.getBlock(pos),
        getAllBlocks: () => worldStoreRef.current.getAllBlocks(),
      };

      const result = await generateAndPlaceIsland(
        {
          worldSeed: customSeed,
          islandId: config.islandId,
          playerPosition,
          size: islandSize,
          onProgress,
          debug: true,
        },
        worldStoreInterface
      );

      setLastResult(result);

      if (result.success) {
        setProgress({ progress: 1, stage: 'Complete', details: `Generated ${result.placedBlocks} blocks` });
      } else {
        setProgress({ progress: 0, stage: 'Error', details: result.error });
      }
    } catch (error) {
      setProgress({
        progress: 0,
        stage: 'Error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, config, customSeed, playerPosition, islandSize, onProgress]);

  // Clear island
  const handleClear = useCallback(async () => {
    if (isClearing) return;

    setIsClearing(true);
    setProgress({ progress: 0, stage: 'Clearing' });

    try {
      const worldStoreInterface = {
        addBlock: (pos: Vector3, type: BlockType, userId: string) => worldStoreRef.current.addBlock(pos, type, userId),
        removeBlock: (pos: Vector3, userId: string) => worldStoreRef.current.removeBlock(pos, userId),
        clearWorld: () => worldStoreRef.current.clearWorld(),
        getBlock: (pos: Vector3) => worldStoreRef.current.getBlock(pos),
        getAllBlocks: () => worldStoreRef.current.getAllBlocks(),
      };

      const clearedBlocks = await clearIslandRegion(
        playerPosition,
        islandSize,
        worldStoreInterface,
        (progress) => setProgress({ progress, stage: 'Clearing', details: `${Math.round(progress * 100)}%` })
      );

      setProgress({ progress: 1, stage: 'Cleared', details: `Removed ${clearedBlocks} blocks` });
    } catch (error) {
      setProgress({
        progress: 0,
        stage: 'Error',
        details: error instanceof Error ? error.message : 'Clear failed'
      });
    } finally {
      setIsClearing(false);
    }
  }, [isClearing, playerPosition, islandSize]);

  // Apply preset
  const handlePresetChange = useCallback((preset: string) => {
    setSelectedPreset(preset);
  }, []);

  // Generate new seed
  const handleNewSeed = useCallback(() => {
    setCustomSeed('dev-seed-' + Date.now());
  }, []);

  if (!visible) return null;

  return (
    <>
      <div className="fixed top-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg z-40 w-80 max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">🏝️ Island Generator</h2>
          {onToggle && (
            <button
              onClick={onToggle}
              className="text-white hover:text-red-400 text-xl"
            >
              ×
            </button>
          )}
        </div>

        {/* Status */}
        <div className="mb-4 p-2 bg-gray-800 rounded">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">{progress.stage}</span>
            <span className="text-xs">{Math.round(progress.progress * 100)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                progress.stage === 'Error' ? 'bg-red-500' :
                progress.stage === 'Complete' || progress.stage === 'Cleared' ? 'bg-green-500' :
                'bg-blue-500'
              }`}
              style={{ width: `${progress.progress * 100}%` }}
            />
          </div>
          {progress.details && (
            <div className="text-xs text-gray-400 mt-1">{progress.details}</div>
          )}
        </div>

        {/* Validation Warnings */}
        {validation && validation.warnings.length > 0 && (
          <div className="mb-4 p-2 bg-yellow-900 border border-yellow-600 rounded">
            <div className="text-sm font-medium text-yellow-200 mb-1">⚠️ Warnings</div>
            {validation.warnings.map((warning, i) => (
              <div key={i} className="text-xs text-yellow-300">{warning}</div>
            ))}
          </div>
        )}

        {/* Configuration */}
        <div className="space-y-4">
          {/* Preset Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">Preset</label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
            >
              <option value="small">Small (64x64)</option>
              <option value="medium">Medium (128x128)</option>
              <option value="large">Large (192x192)</option>
              <option value="organic">Organic Shape</option>
              <option value="geometric">Geometric Shape</option>
            </select>
          </div>

          {/* Seed */}
          <div>
            <label className="block text-sm font-medium mb-1">Seed</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customSeed}
                onChange={(e) => setCustomSeed(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                placeholder="Enter seed..."
              />
              <button
                onClick={handleNewSeed}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                title="Generate new seed"
              >
                🎲
              </button>
            </div>
          </div>

          {/* Size */}
          <div>
            <label className="block text-sm font-medium mb-1">Size</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={islandSize.width}
                onChange={(e) => setIslandSize(prev => ({ ...prev, width: parseInt(e.target.value) || 64 }))}
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                min="32"
                max="256"
                step="16"
              />
              <input
                type="number"
                value={islandSize.height}
                onChange={(e) => setIslandSize(prev => ({ ...prev, height: parseInt(e.target.value) || 64 }))}
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                min="32"
                max="256"
                step="16"
              />
            </div>
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium mb-1">Position (Center)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={playerPosition.x}
                readOnly
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
              />
              <input
                type="number"
                value={playerPosition.z}
                readOnly
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">Updates with player position</div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 space-y-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isClearing}
            className={`w-full py-2 px-4 rounded font-medium ${
              isGenerating || isClearing
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isGenerating ? 'Generating...' : '🏝️ Generate Island'}
          </button>

          <button
            onClick={handleClear}
            disabled={isGenerating || isClearing}
            className={`w-full py-2 px-4 rounded font-medium ${
              isGenerating || isClearing
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {isClearing ? 'Clearing...' : '🧹 Clear Area'}
          </button>

          <button
            onClick={() => setShowDebugOverlay(!showDebugOverlay)}
            disabled={!lastResult?.debugInfo}
            className={`w-full py-2 px-4 rounded font-medium ${
              !lastResult?.debugInfo
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : showDebugOverlay
                ? 'bg-purple-700 text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            {showDebugOverlay ? '🔍 Hide Debug' : '🔍 Show Debug'}
          </button>
        </div>

        {/* Last Result */}
        {lastResult && (
          <div className="mt-4 p-2 bg-gray-800 rounded">
            <div className="text-sm font-medium mb-1">Last Generation</div>
            <div className="text-xs space-y-1">
              <div className={`${lastResult.success ? 'text-green-400' : 'text-red-400'}`}>
                Status: {lastResult.success ? 'Success' : 'Failed'}
              </div>
              {lastResult.success && (
                <>
                  <div>Blocks: {lastResult.placedBlocks}/{lastResult.totalBlocks}</div>
                  <div>Time: {lastResult.generationTimeMs.toFixed(1)}ms</div>
                </>
              )}
              {!lastResult.success && lastResult.error && (
                <div className="text-red-300">Error: {lastResult.error}</div>
              )}
            </div>
          </div>
        )}

        {/* Quick Tips */}
        <div className="mt-4 p-2 bg-blue-900 bg-opacity-50 border border-blue-600 rounded">
          <div className="text-xs text-blue-200">
            <div className="font-medium mb-1">💡 Quick Tips</div>
            <div>• Shift+I: Generate island</div>
            <div>• Shift+K: Clear area</div>
            <div>• Try different presets for variety</div>
            <div>• Use debug overlay to see regions</div>
          </div>
        </div>
      </div>

      {/* Debug Overlay */}
      {showDebugOverlay && lastResult?.debugInfo && (
        <IslandDebugOverlay
          debugInfo={lastResult.debugInfo}
          width={300}
          height={300}
          visible={showDebugOverlay}
          onToggle={setShowDebugOverlay}
        />
      )}
    </>
  );
};

export default IslandGenDevPanel;
