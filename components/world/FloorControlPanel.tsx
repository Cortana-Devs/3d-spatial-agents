"use client";

import React, { useState, useCallback } from "react";
import { Vector3 } from "three";
import { BlockType, BLOCK_DEFINITIONS } from "../../types/blocks";
import { floorManager, quickFloorUtils, FloorConfiguration } from "../../utils/floorManager";
import { useWorldStore } from "../../store/worldStore";

interface FloorControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FloorControlPanel({ isOpen, onClose }: FloorControlPanelProps) {
  const [selectedPattern, setSelectedPattern] = useState<FloorConfiguration['pattern']>("solid");
  const [selectedBlockType, setSelectedBlockType] = useState<BlockType>(BlockType.STONE);
  const [floorSize, setFloorSize] = useState<number>(50);
  const [yLevel, setYLevel] = useState<number>(-0.5);
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);
  const [isPlacing, setIsPlacing] = useState<boolean>(false);

  const { gridConfig, blockCount, worldLimits } = useWorldStore();

  const handlePlaceFloor = useCallback(async (config: Partial<FloorConfiguration>) => {
    setIsPlacing(true);

    try {
      const floorConfig: FloorConfiguration = {
        blockType: selectedBlockType,
        pattern: selectedPattern,
        size: floorSize,
        centerPosition: new Vector3(0, 0, 0),
        yLevel: yLevel,
        replaceExisting: replaceExisting,
        fillHoles: true,
        ...config
      };

      const success = floorManager.placeFloor(floorConfig);

      if (success) {
        console.log("Floor placed successfully");
      } else {
        console.warn("Failed to place floor");
      }
    } catch (error) {
      console.error("Error placing floor:", error);
    } finally {
      setIsPlacing(false);
    }
  }, [selectedBlockType, selectedPattern, floorSize, yLevel, replaceExisting]);

  const handleQuickFloor = useCallback(async (type: 'stone' | 'wood' | 'glass' | 'checker' | 'clear') => {
    setIsPlacing(true);

    try {
      let success = false;

      switch (type) {
        case 'stone':
          success = quickFloorUtils.placeStoneFloor(floorSize);
          break;
        case 'wood':
          success = quickFloorUtils.placeWoodFloor(floorSize);
          break;
        case 'glass':
          success = quickFloorUtils.placeGlassFloor(floorSize);
          break;
        case 'checker':
          success = quickFloorUtils.placeCheckerFloor(floorSize);
          break;
        case 'clear':
          success = quickFloorUtils.clearFloorArea(floorSize);
          break;
      }

      if (success) {
        console.log(`Quick ${type} floor operation completed`);
      }
    } catch (error) {
      console.error("Error with quick floor operation:", error);
    } finally {
      setIsPlacing(false);
    }
  }, [floorSize]);

  const patternOptions = [
    { value: "solid", label: "Solid", icon: "⬛" },
    { value: "checkerboard", label: "Checkerboard", icon: "🏁" },
    { value: "border", label: "Border", icon: "🔲" },
    { value: "cross", label: "Cross", icon: "➕" },
    { value: "diagonal", label: "Diagonal", icon: "〰️" }
  ];

  const availableBlockTypes = [
    BlockType.STONE,
    BlockType.WOOD,
    BlockType.FROSTED_GLASS,
    BlockType.FLOOR,
    BlockType.LEAF
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl border border-white/20 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Floor Control Panel</h2>
            <p className="text-gray-400 text-sm">Create and manage floor blocks across your world</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            ⚡ Quick Floor Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              onClick={() => handleQuickFloor('stone')}
              disabled={isPlacing}
              className="flex flex-col items-center p-4 bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-8 h-8 bg-gray-500 rounded mb-2"></div>
              <span className="text-white text-sm font-medium">Stone Floor</span>
            </button>

            <button
              onClick={() => handleQuickFloor('wood')}
              disabled={isPlacing}
              className="flex flex-col items-center p-4 bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-8 h-8 bg-amber-600 rounded mb-2"></div>
              <span className="text-white text-sm font-medium">Wood Floor</span>
            </button>

            <button
              onClick={() => handleQuickFloor('glass')}
              disabled={isPlacing}
              className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-8 h-8 bg-blue-400 rounded mb-2 opacity-60"></div>
              <span className="text-white text-sm font-medium">Glass Floor</span>
            </button>

            <button
              onClick={() => handleQuickFloor('checker')}
              disabled={isPlacing}
              className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-gray-500 to-amber-600 rounded mb-2"></div>
              <span className="text-white text-sm font-medium">Checker Floor</span>
            </button>

            <button
              onClick={() => handleQuickFloor('clear')}
              disabled={isPlacing}
              className="flex flex-col items-center p-4 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-8 h-8 border-2 border-red-400 rounded mb-2"></div>
              <span className="text-white text-sm font-medium">Clear Floor</span>
            </button>
          </div>
        </div>

        {/* Advanced Configuration */}
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white flex items-center">
            🎛️ Advanced Configuration
          </h3>

          {/* Pattern Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Pattern Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {patternOptions.map((pattern) => (
                <button
                  key={pattern.value}
                  onClick={() => setSelectedPattern(pattern.value as FloorConfiguration['pattern'])}
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
                    selectedPattern === pattern.value
                      ? 'bg-blue-600/30 border-blue-400 text-blue-300'
                      : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50'
                  }`}
                >
                  <span className="text-lg">{pattern.icon}</span>
                  <span className="text-sm">{pattern.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Block Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Block Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableBlockTypes.map((blockType) => {
                const definition = BLOCK_DEFINITIONS[blockType];
                return (
                  <button
                    key={blockType}
                    onClick={() => setSelectedBlockType(blockType)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      selectedBlockType === blockType
                        ? 'bg-green-600/30 border-green-400 text-green-300'
                        : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded"
                      style={{ backgroundColor: definition.color }}
                    ></div>
                    <span className="text-sm">{definition.displayName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Floor Size (Grid Units): {floorSize}
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={floorSize}
                onChange={(e) => setFloorSize(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>10</span>
                <span>100</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Y Level: {yLevel}
              </label>
              <input
                type="range"
                min="-5"
                max="5"
                step="0.5"
                value={yLevel}
                onChange={(e) => setYLevel(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>-5</span>
                <span>5</span>
              </div>
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="flex items-center gap-3 text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm">Replace existing blocks</span>
            </label>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="text-sm text-gray-300">
              <span>Current Grid: {gridConfig.size}×{gridConfig.size}</span>
              <span className="mx-2">•</span>
              <span>Blocks: {blockCount}/{worldLimits.maxBlocks}</span>
            </div>
            <div className="text-xs text-gray-500">
              Floor will place ~{Math.pow(floorSize, 2)} blocks
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => handlePlaceFloor({})}
              disabled={isPlacing || blockCount >= worldLimits.maxBlocks}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPlacing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Placing Floor...
                </>
              ) : (
                <>
                  🏗️ Place Custom Floor
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white font-medium rounded-lg transition-all"
            >
              Close
            </button>
          </div>
        </div>

        {/* Warning */}
        {blockCount >= worldLimits.maxBlocks * 0.8 && (
          <div className="mt-4 p-3 bg-yellow-600/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-300">
              <span>⚠️</span>
              <span className="text-sm">
                Warning: Approaching block limit. Consider clearing some blocks first.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
