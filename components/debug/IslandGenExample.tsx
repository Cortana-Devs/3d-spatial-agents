/**
 * Island Generation Example Component
 *
 * Demonstrates how to use the island generation system in a React component.
 * Shows basic usage patterns and integration with the world store.
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useWorldStore } from '../../store/worldStore';
import { useIslandGeneration } from '../../hooks/useIslandGeneration';
import IslandGenDevPanel from './IslandGenDevPanel';

interface IslandGenExampleProps {
  className?: string;
  showDevPanel?: boolean;
}

export const IslandGenExample: React.FC<IslandGenExampleProps> = ({
  className = '',
  showDevPanel = true
}) => {
  const [playerPosition, setPlayerPosition] = useState({ x: 0, z: 0 });
  const [showPanel, setShowPanel] = useState(false);
  const worldStore = useWorldStore();

  // Use the island generation hook
  const {
    state,
    config,
    generateIsland,
    clearIsland,
    setConfig,
    generateNewSeed,
    getEstimatedBlocks,
    canGenerate,
    canClear,
  } = useIslandGeneration({
    enableDevControls: true,
    getPlayerPosition: () => playerPosition,
    defaultPreset: 'medium',
  });

  // Simulate player movement for demo purposes
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayerPosition(prev => ({
        x: prev.x + (Math.random() - 0.5) * 2,
        z: prev.z + (Math.random() - 0.5) * 2,
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Quick generation with default settings
  const handleQuickGenerate = useCallback(async () => {
    if (!canGenerate) return;

    await generateIsland({
      position: playerPosition,
      size: { width: 96, height: 96 },
    });
  }, [generateIsland, canGenerate, playerPosition]);

  // Clear current area
  const handleQuickClear = useCallback(async () => {
    if (!canClear) return;

    await clearIsland(playerPosition, { width: 96, height: 96 });
  }, [clearIsland, canClear, playerPosition]);

  return (
    <div className={`island-gen-example ${className}`}>
      {/* Main Controls */}
      <div className="bg-gray-800 text-white p-4 rounded-lg mb-4">
        <h3 className="text-lg font-bold mb-3">🏝️ Island Generation Example</h3>

        {/* Status Display */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm">Status:</span>
            <span className={`text-sm px-2 py-1 rounded ${
              state.isGenerating ? 'bg-blue-600' :
              state.isClearing ? 'bg-red-600' :
              state.lastResult?.success ? 'bg-green-600' :
              state.progress.stage === 'Error' ? 'bg-red-600' :
              'bg-gray-600'
            }`}>
              {state.progress.stage}
            </span>
          </div>

          {state.progress.value > 0 && (
            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
              <div
                className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${state.progress.value * 100}%` }}
              />
            </div>
          )}

          {state.progress.details && (
            <div className="text-xs text-gray-400">{state.progress.details}</div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={handleQuickGenerate}
            disabled={!canGenerate}
            className={`py-2 px-3 rounded text-sm font-medium ${
              !canGenerate
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            🏝️ Quick Generate
          </button>

          <button
            onClick={handleQuickClear}
            disabled={!canClear}
            className={`py-2 px-3 rounded text-sm font-medium ${
              !canClear
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            🧹 Quick Clear
          </button>
        </div>

        {/* Configuration Summary */}
        <div className="text-xs space-y-1 mb-4">
          <div>Seed: <code className="bg-gray-700 px-1 rounded">{config.seed.substring(0, 20)}...</code></div>
          <div>Size: {config.size.width}x{config.size.height}</div>
          <div>Position: ({playerPosition.x.toFixed(1)}, {playerPosition.z.toFixed(1)})</div>
          <div>Estimated Blocks: {getEstimatedBlocks().toLocaleString()}</div>
        </div>

        {/* Results */}
        {state.lastResult && (
          <div className="bg-gray-900 p-2 rounded text-xs">
            <div className="font-medium mb-1">Last Generation:</div>
            {state.lastResult.success ? (
              <div className="text-green-400">
                ✅ Success: {state.lastResult.placedBlocks} blocks in {state.lastResult.generationTimeMs.toFixed(1)}ms
              </div>
            ) : (
              <div className="text-red-400">
                ❌ Failed: {state.lastResult.error}
              </div>
            )}
          </div>
        )}

        {/* World Stats */}
        <div className="mt-4 pt-3 border-t border-gray-700 text-xs">
          <div className="font-medium mb-1">World Stats:</div>
          <div>Total Blocks: {worldStore.blockCount.toLocaleString()}</div>
          <div>World Limit: {worldStore.worldLimits.maxBlocks.toLocaleString()}</div>
        </div>

        {/* Controls Toggle */}
        {showDevPanel && (
          <div className="mt-4 pt-3 border-t border-gray-700">
            <button
              onClick={() => setShowPanel(!showPanel)}
              className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium"
            >
              {showPanel ? '🔧 Hide Advanced Controls' : '🔧 Show Advanced Controls'}
            </button>
          </div>
        )}
      </div>

      {/* Advanced Dev Panel */}
      {showDevPanel && showPanel && (
        <IslandGenDevPanel
          visible={showPanel}
          onToggle={() => setShowPanel(!showPanel)}
          playerPosition={playerPosition}
        />
      )}

      {/* Keyboard Shortcuts Help */}
      <div className="bg-blue-900 bg-opacity-50 border border-blue-600 rounded p-3 text-xs">
        <div className="font-medium text-blue-200 mb-2">⌨️ Keyboard Shortcuts</div>
        <div className="space-y-1 text-blue-300">
          <div><kbd className="bg-blue-800 px-1 rounded">Shift</kbd> + <kbd className="bg-blue-800 px-1 rounded">I</kbd> = Generate Island</div>
          <div><kbd className="bg-blue-800 px-1 rounded">Shift</kbd> + <kbd className="bg-blue-800 px-1 rounded">K</kbd> = Clear Area</div>
        </div>
      </div>

      {/* Code Example */}
      <details className="mt-4 bg-gray-900 rounded">
        <summary className="p-3 cursor-pointer text-sm font-medium text-gray-300 hover:text-white">
          📄 View Code Example
        </summary>
        <div className="p-3 border-t border-gray-700">
          <pre className="text-xs text-gray-400 overflow-x-auto">
{`// Basic usage example:
import { useIslandGeneration } from '../../hooks/useIslandGeneration';

const MyComponent = () => {
  const {
    state,
    generateIsland,
    clearIsland,
    setConfig,
    canGenerate
  } = useIslandGeneration({
    enableDevControls: true,
    getPlayerPosition: () => ({ x: 0, z: 0 }),
    defaultPreset: 'medium'
  });

  const handleGenerate = async () => {
    if (canGenerate()) {
      await generateIsland({
        seed: 'my-custom-seed',
        size: { width: 128, height: 128 },
        position: { x: 0, z: 0 }
      });
    }
  };

  return (
    <div>
      <button onClick={handleGenerate}>
        Generate Island
      </button>
      {state.isGenerating && (
        <div>Progress: {state.progress.value * 100}%</div>
      )}
    </div>
  );
};`}
          </pre>
        </div>
      </details>
    </div>
  );
};

export default IslandGenExample;
