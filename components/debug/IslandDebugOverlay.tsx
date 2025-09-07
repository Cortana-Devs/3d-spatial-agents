/**
 * Island Debug Overlay Component
 *
 * Provides visual debugging tools for island generation, including:
 * - Region boundaries and labels
 * - Seed position indicators
 * - Island mask visualization
 * - Generation statistics
 */

'use client';

import React, { useState, useMemo } from 'react';
import { IslandDebugInfo, RegionSeed, RegionRule } from '../../utils/generation/islands/types';

interface IslandDebugOverlayProps {
  debugInfo: IslandDebugInfo;
  width: number;
  height: number;
  visible?: boolean;
  onToggle?: (visible: boolean) => void;
}

interface RenderSettings {
  showMask: boolean;
  showRegions: boolean;
  showSeeds: boolean;
  showLabels: boolean;
  maskOpacity: number;
  regionOpacity: number;
}

const REGION_COLORS: Record<RegionRule, string> = {
  ALL: '#2196F3',      // Blue
  UNIQUE: '#FF9800',   // Orange
  PURE: '#FFFFFF',     // White
};

const REGION_COLORS_ALPHA: Record<RegionRule, string> = {
  ALL: 'rgba(33, 150, 243, 0.3)',
  UNIQUE: 'rgba(255, 152, 0, 0.3)',
  PURE: 'rgba(255, 255, 255, 0.3)',
};

export const IslandDebugOverlay: React.FC<IslandDebugOverlayProps> = ({
  debugInfo,
  width,
  height,
  visible = true,
  onToggle
}) => {
  const [settings, setSettings] = useState<RenderSettings>({
    showMask: true,
    showRegions: true,
    showSeeds: true,
    showLabels: true,
    maskOpacity: 0.3,
    regionOpacity: 0.4,
  });

  // Generate SVG elements for visualization
  const visualElements = useMemo(() => {
    if (!debugInfo || !visible) return null;

    const { mask, regionIdByTile, seeds } = debugInfo;
    const maskHeight = mask.length;
    const maskWidth = mask[0]?.length || 0;

    if (maskWidth === 0 || maskHeight === 0) return null;

    // Scale factors to fit the display area
    const scaleX = width / maskWidth;
    const scaleY = height / maskHeight;

    const elements = [];

    // Render island mask
    if (settings.showMask) {
      const maskRects = [];
      for (let y = 0; y < maskHeight; y++) {
        for (let x = 0; x < maskWidth; x++) {
          const maskValue = mask[y][x];
          if (maskValue > 0.1) {
            const opacity = maskValue * settings.maskOpacity;
            maskRects.push(
              <rect
                key={`mask-${x}-${y}`}
                x={x * scaleX}
                y={y * scaleY}
                width={scaleX}
                height={scaleY}
                fill="cyan"
                opacity={opacity}
              />
            );
          }
        }
      }
      elements.push(
        <g key="mask" className="island-mask">
          {maskRects}
        </g>
      );
    }

    // Render region boundaries
    if (settings.showRegions && regionIdByTile) {
      const regionRects = [];
      const seedMap = new Map(seeds.map(s => [s.id, s]));

      for (let y = 0; y < regionIdByTile.length; y++) {
        for (let x = 0; x < regionIdByTile[y].length; x++) {
          const regionId = regionIdByTile[y][x];
          if (!regionId) continue;

          const seed = seedMap.get(regionId);
          if (!seed) continue;

          const color = REGION_COLORS_ALPHA[seed.rule];
          regionRects.push(
            <rect
              key={`region-${x}-${y}`}
              x={x * scaleX}
              y={y * scaleY}
              width={scaleX}
              height={scaleY}
              fill={color}
              opacity={settings.regionOpacity}
            />
          );
        }
      }

      elements.push(
        <g key="regions" className="island-regions">
          {regionRects}
        </g>
      );
    }

    // Render seed positions
    if (settings.showSeeds) {
      const seedElements = seeds.map((seed, index) => {
        const x = seed.pos.x * scaleX;
        const y = seed.pos.y * scaleY;
        const color = REGION_COLORS[seed.rule];
        const radius = Math.min(scaleX, scaleY) * 0.8;

        return (
          <g key={`seed-${seed.id}`}>
            <circle
              cx={x}
              cy={y}
              r={radius}
              fill={color}
              stroke="black"
              strokeWidth={2}
              opacity={0.8}
            />
            {settings.showLabels && (
              <text
                x={x}
                y={y - radius - 5}
                textAnchor="middle"
                fontSize={Math.max(10, Math.min(14, radius * 0.8))}
                fill="white"
                stroke="black"
                strokeWidth={1}
                paintOrder="stroke"
                className="seed-label"
              >
                {seed.rule}
              </text>
            )}
          </g>
        );
      });

      elements.push(
        <g key="seeds" className="island-seeds">
          {seedElements}
        </g>
      );
    }

    return elements;
  }, [debugInfo, visible, settings, width, height]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!debugInfo) return null;

    const { mask, regionIdByTile, seeds } = debugInfo;
    let totalTiles = 0;
    let islandTiles = 0;
    const regionCounts: Record<RegionRule, number> = { ALL: 0, UNIQUE: 0, PURE: 0 };
    const seedMap = new Map(seeds.map(s => [s.id, s]));

    for (let y = 0; y < mask.length; y++) {
      for (let x = 0; x < mask[y].length; x++) {
        totalTiles++;
        if (mask[y][x] > 0.5) {
          islandTiles++;
          const regionId = regionIdByTile?.[y]?.[x];
          if (regionId) {
            const seed = seedMap.get(regionId);
            if (seed) {
              regionCounts[seed.rule]++;
            }
          }
        }
      }
    }

    return {
      totalTiles,
      islandTiles,
      regionCounts,
      seedCount: seeds.length,
    };
  }, [debugInfo]);

  if (!visible || !debugInfo) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 bg-black bg-opacity-80 text-white p-4 rounded-lg z-50 max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Island Debug</h3>
        {onToggle && (
          <button
            onClick={() => onToggle(false)}
            className="text-white hover:text-red-400 text-xl"
          >
            ×
          </button>
        )}
      </div>

      {/* Visualization Controls */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showMask"
            checked={settings.showMask}
            onChange={(e) => setSettings(s => ({ ...s, showMask: e.target.checked }))}
          />
          <label htmlFor="showMask" className="text-sm">Show Island Mask</label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showRegions"
            checked={settings.showRegions}
            onChange={(e) => setSettings(s => ({ ...s, showRegions: e.target.checked }))}
          />
          <label htmlFor="showRegions" className="text-sm">Show Regions</label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showSeeds"
            checked={settings.showSeeds}
            onChange={(e) => setSettings(s => ({ ...s, showSeeds: e.target.checked }))}
          />
          <label htmlFor="showSeeds" className="text-sm">Show Seeds</label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showLabels"
            checked={settings.showLabels}
            onChange={(e) => setSettings(s => ({ ...s, showLabels: e.target.checked }))}
          />
          <label htmlFor="showLabels" className="text-sm">Show Labels</label>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-300">Mask Opacity</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.maskOpacity}
            onChange={(e) => setSettings(s => ({ ...s, maskOpacity: parseFloat(e.target.value) }))}
            className="w-full"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-gray-300">Region Opacity</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.regionOpacity}
            onChange={(e) => setSettings(s => ({ ...s, regionOpacity: parseFloat(e.target.value) }))}
            className="w-full"
          />
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="mb-4">
          <h4 className="text-md font-semibold mb-2">Statistics</h4>
          <div className="text-sm space-y-1">
            <div>Island Tiles: {stats.islandTiles} / {stats.totalTiles}</div>
            <div>Seeds: {stats.seedCount}</div>
            <div className="mt-2">
              <div className="font-medium">Region Distribution:</div>
              <div className="ml-2 space-y-1">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                  All: {stats.regionCounts.ALL}
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded mr-2"></div>
                  Unique: {stats.regionCounts.UNIQUE}
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-white rounded mr-2"></div>
                  Pure: {stats.regionCounts.PURE}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visualization */}
      <div className="border border-gray-600 rounded">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block"
          style={{ maxWidth: '300px', maxHeight: '300px' }}
        >
          {visualElements}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-2 text-xs">
        <div className="font-medium mb-1">Legend:</div>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded mr-1"></div>
            All
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-orange-500 rounded mr-1"></div>
            Unique
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-white rounded mr-1"></div>
            Pure
          </div>
        </div>
      </div>
    </div>
  );
};

export default IslandDebugOverlay;
