"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Vector3 } from "three";
import { useWorldStore } from "../../store/worldStore";
import { devError } from "@/utils/devLogger";
import {
  generateArchipelago,
  createDefaultArchipelagoConfig,
  type ArchipelagoConfig,
  type ArchipelagoPattern,
  type IslandType,
  type ArchipelagoResult,
} from "../../utils/generation/islands/ArchipelagoGenerator";
import {
  generateMassiveArchipelago,
  createDefaultMassiveConfig,
  type MassiveArchipelagoConfig,
  type MassiveArchipelagoResult,
  type IslandBiome,
} from "../../utils/generation/islands/MassiveArchipelagoGenerator";
import {
  ARCHIPELAGO_PRESETS,
  getPresetsByCategory,
  getPresetCategories,
  createConfigFromPreset,
  type PresetCategory,
} from "../../utils/generation/islands/ArchipelagoPresets";
import {
  getMassivePresetsByCategory,
  getMassivePresetCategories,
  createMassiveConfigFromPreset,
  type MassivePresetCategory,
  type MassiveArchipelagoPreset,
} from "../../utils/generation/islands/MassiveArchipelagoPresets";

interface ArchipelagoTestProps {
  visible?: boolean;
  onToggle?: () => void;
}

export const ArchipelagoTest: React.FC<ArchipelagoTestProps> = ({
  visible = true,
  onToggle,
}) => {
  // State
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<ArchipelagoResult | null>(null);
  const [lastMassiveResult, setLastMassiveResult] =
    useState<MassiveArchipelagoResult | null>(null);
  const [generationLog, setGenerationLog] = useState<string[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [useMassiveMode, setUseMassiveMode] = useState(false);

  // Configuration state
  const [selectedPreset, setSelectedPreset] =
    useState<string>("tropical_paradise");
  const [selectedCategory, setSelectedCategory] =
    useState<PresetCategory>("tropical");
  const [customMode, setCustomMode] = useState(false);

  // Massive mode preset state
  const [selectedMassivePreset, setSelectedMassivePreset] = useState<string>(
    "world_limit_optimized",
  );
  const [selectedMassiveCategory, setSelectedMassiveCategory] =
    useState<MassivePresetCategory>("performance");
  const [pattern, setPattern] = useState<ArchipelagoPattern>("circular");
  const [islandCount, setIslandCount] = useState(5);
  const [gridSize, setGridSize] = useState(256);
  const [minRadius, setMinRadius] = useState(25);
  const [maxRadius, setMaxRadius] = useState(45);
  const [smoothness, setSmoothness] = useState(0.8);
  const [blending, setBlending] = useState(0.9);
  const [seed, setSeed] = useState("archipelago-" + Date.now());

  // Massive mode settings
  const [massiveIslandCount, setMassiveIslandCount] = useState({
    min: 5,
    max: 8,
  });
  const [massiveRadius, setMassiveRadius] = useState({ min: 200, max: 400 });
  const [worldSize, setWorldSize] = useState(2048);

  const worldStore = useWorldStore();

  // Get presets for selected category
  const availablePresets = useMemo(
    () => getPresetsByCategory(selectedCategory),
    [selectedCategory],
  );

  // Get current preset
  const currentPreset = useMemo(
    () => ARCHIPELAGO_PRESETS[selectedPreset],
    [selectedPreset],
  );

  // Get massive presets for selected category
  const availableMassivePresets = useMemo(
    () => getMassivePresetsByCategory(selectedMassiveCategory),
    [selectedMassiveCategory],
  );

  // Get current massive preset
  const currentMassivePreset = useMemo(() => {
    const presets = getMassivePresetsByCategory(selectedMassiveCategory);
    return presets.find((p) => p.id === selectedMassivePreset);
  }, [selectedMassivePreset, selectedMassiveCategory]);

  // Pattern descriptions
  const patternDescriptions = useMemo(
    () => ({
      circular: "Circle",
      linear: "Line",
      spiral: "Spiral",
      cluster: "Cluster",
      chain: "Chain",
      random: "Random",
    }),
    [],
  );

  // Generate archipelago
  const handleGenerate = useCallback(async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setGenerationLog([]);

    const addLog = (message: string) => {
      setGenerationLog((prev) => [...prev, message]);
    };

    try {
      addLog("🚀 Starting generation...");

      // Clear existing blocks
      const clearSize = useMassiveMode ? worldSize : gridSize;
      const halfSize = clearSize / 2;
      let clearedCount = 0;

      const clearStep = useMassiveMode ? 20 : 5; // Larger steps for massive mode
      for (let x = -halfSize; x < halfSize; x += clearStep) {
        for (let z = -halfSize; z < halfSize; z += clearStep) {
          const pos = new Vector3(x, 0, z);
          if (worldStore.removeBlock(pos, "archipelago-test")) {
            clearedCount++;
          }
        }
      }
      addLog(`🧹 Cleared ${clearedCount} blocks`);

      if (useMassiveMode) {
        // Check world block limit before generation
        const currentBlockCount = worldStore.blockCount;
        const worldLimit = worldStore.worldLimits.maxBlocks;
        const availableBlocks = worldLimit - currentBlockCount;

        if (availableBlocks <= 0) {
          addLog(
            `❌ Cannot generate: World block limit reached (${currentBlockCount}/${worldLimit})`,
          );
          return;
        }

        // Warn about limited blocks
        if (availableBlocks < 10000) {
          addLog(
            `⚠️ Warning: Only ${availableBlocks} blocks available. Results will be limited.`,
          );
        }

        // Generate massive archipelago
        let massiveConfig: Partial<MassiveArchipelagoConfig>;

        if (customMode) {
          // Use custom settings
          massiveConfig = {
            seed,
            worldSize: { width: worldSize, height: worldSize },
            origin: { x: -worldSize / 2, z: -worldSize / 2 },
            islandCount: massiveIslandCount,
            islandRadius: massiveRadius,
          };
          addLog(
            `⚙️ Massive Custom: ${worldSize}x${worldSize}, ${massiveIslandCount.min}-${massiveIslandCount.max} huge islands`,
          );
        } else {
          // Use preset
          massiveConfig = createMassiveConfigFromPreset(selectedMassivePreset, {
            seed,
          });
          addLog(
            `⚙️ Massive Preset: ${currentMassivePreset?.name} (${massiveConfig.worldSize?.width}x${massiveConfig.worldSize?.height})`,
          );
        }

        const massiveResult = await generateMassiveArchipelago(massiveConfig);
        setLastMassiveResult(massiveResult);

        addLog(`🏝️ ${massiveResult.islands.length} massive islands generated`);
        addLog(
          `⏱️ Generated in ${massiveResult.generationTimeMs.toFixed(1)}ms`,
        );
        addLog(`💾 Memory: ${massiveResult.memoryUsageMB.toFixed(1)}MB`);

        // Get blocks with smart filtering based on available space
        addLog("🏗️ Applying smart block filtering...");
        const maybeGetAllBlocks = (
          massiveResult as { getAllBlocks?: (limit: number) => unknown[] }
        ).getAllBlocks;
        const massiveBlocks =
          typeof maybeGetAllBlocks === "function"
            ? maybeGetAllBlocks(availableBlocks)
            : [];

        addLog(`🎯 Filtered to ${massiveBlocks.length} priority blocks`);

        // Place blocks from massive generation
        addLog("🏗️ Placing massive terrain...");
        let placed = 0;
        let failed = 0;
        const batchSize = Math.min(100, availableBlocks / 10); // Smaller batches when limited

        for (let i = 0; i < massiveBlocks.length; i += batchSize) {
          const batch = massiveBlocks.slice(i, i + batchSize);

          for (const block of batch) {
            try {
              const success = worldStore.addBlock(
                block.position,
                block.blockType,
                "massive-archipelago",
              );
              if (success) {
                placed++;
              } else {
                failed++;
                // Stop if we hit the limit
                if (worldStore.blockCount >= worldLimit) {
                  addLog(`🛑 World block limit reached during placement`);
                  break;
                }
              }
            } catch (error) {
              failed++;
            }
          }

          // Check if we hit the limit
          if (worldStore.blockCount >= worldLimit) {
            break;
          }

          if (
            i % Math.max(500, batchSize * 5) === 0 &&
            massiveBlocks.length > batchSize * 5
          ) {
            addLog(`🏗️ ${placed} massive blocks placed...`);
            await new Promise((resolve) => setTimeout(resolve, 1));
          }
        }

        const totalGenerated =
          massiveResult.stats?.blocksGenerated || massiveBlocks.length;
        addLog(
          `✅ Massive archipelago complete! ${placed} blocks placed, ${failed} failed`,
        );
        addLog(
          `📊 Generated ${totalGenerated.toLocaleString()} total blocks, filtered to ${massiveBlocks.length}`,
        );
        addLog(
          `📊 Largest island: ${(massiveResult.stats.largestIsland / 1000).toFixed(1)}k blocks`,
        );
      } else {
        // Original archipelago generation
        let config: ArchipelagoConfig;

        if (customMode) {
          config = {
            ...createDefaultArchipelagoConfig(seed),
            pattern,
            gridSize: { width: gridSize, height: gridSize },
            origin: { x: -gridSize / 2, z: -gridSize / 2 },
            yLevel: 0,
            islandCount,
            minIslandRadius: minRadius,
            maxIslandRadius: maxRadius,
            minIslandDistance: 15,
            coastlineSmoothing: smoothness,
            islandBlending: blending,
            patternParams: {
              radius: gridSize * 0.3,
              direction: Math.PI / 4,
              spiralTightness: 0.6,
              clusterDensity: 0.7,
            },
            globalNoiseConfig: {
              baseFrequency: 0.6,
              ridgeFrequency: 1.2,
              erosionFrequency: 2.0,
              octaves: 5,
              lacunarity: 2.0,
              gain: 0.5,
              ridgeOffset: 1.0,
              erosionStrength: 0.2,
              smoothingPasses: 5,
            },
          };
        } else {
          config = createConfigFromPreset(selectedPreset, { seed });
          setGridSize(config.gridSize.width);
        }

        addLog(
          `⚙️ ${customMode ? "Custom" : "Preset"}: ${config.gridSize.width}x${config.gridSize.height}`,
        );

        // Generate archipelago
        const result = generateArchipelago(config);
        setLastResult(result);

        addLog(
          `🏝️ ${result.islands.length} islands, ${result.placements.length} blocks`,
        );
        addLog(`⏱️ Generated in ${result.stats.generationTimeMs.toFixed(1)}ms`);

        // Place blocks in world
        addLog("🏗️ Placing blocks...");
        let placed = 0;
        let failed = 0;
        const batchSize = 100;

        for (let i = 0; i < result.placements.length; i += batchSize) {
          const batch = result.placements.slice(i, i + batchSize);

          for (const placement of batch) {
            try {
              const success = worldStore.addBlock(
                placement.position,
                placement.blockType,
                "archipelago-gen",
              );

              if (success) {
                placed++;
              } else {
                failed++;
              }
            } catch (error) {
              failed++;
            }
          }

          // Update progress
          const progress = Math.min(i + batchSize, result.placements.length);
          if (progress % 500 === 0 || progress === result.placements.length) {
            addLog(
              `🏗️ ${placed} blocks (${Math.round((progress / result.placements.length) * 100)}%)`,
            );
          }

          // Yield control periodically
          if (i % 500 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }

        addLog(`✅ Complete! ${placed} blocks placed, ${failed} failed`);
        addLog(`📊 ${(result.stats.coverageArea * 100).toFixed(1)}% coverage`);

        // Log biome distribution
        const biomes = Object.entries(result.stats.biomeDistribution)
          .map(([biome, count]) => `${biome}: ${count}`)
          .join(", ");
        addLog(`🌿 ${biomes}`);
      }
    } catch (error) {
      addLog(
        `❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      devError("Archipelago generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [
    customMode,
    selectedPreset,
    pattern,
    islandCount,
    gridSize,
    minRadius,
    maxRadius,
    smoothness,
    blending,
    seed,
    useMassiveMode,
    massiveIslandCount,
    massiveRadius,
    worldSize,
    worldStore,
  ]);

  // Clear archipelago
  const handleClear = useCallback(() => {
    const clearSize = useMassiveMode ? worldSize : gridSize;
    const halfSize = clearSize / 2;
    let cleared = 0;

    const clearStep = useMassiveMode ? 10 : 2;
    for (let x = -halfSize; x < halfSize; x += clearStep) {
      for (let z = -halfSize; z < halfSize; z += clearStep) {
        const pos = new Vector3(x, 0, z);
        if (worldStore.removeBlock(pos, "archipelago-clear")) {
          cleared++;
        }
      }
    }

    setGenerationLog([
      `🧹 Cleared ${cleared} blocks from ${useMassiveMode ? "massive" : "normal"} area`,
    ]);
  }, [gridSize, worldSize, useMassiveMode, worldStore]);

  // Generate new seed
  const handleNewSeed = useCallback(() => {
    setSeed("archipelago-" + Date.now());
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed top-4 right-4 bg-black bg-opacity-95 text-white rounded-lg z-50 transition-all duration-200 ${
        isMinimized ? "w-80" : "w-96"
      } max-h-[calc(100vh-2rem)] flex flex-col`}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b border-gray-700">
        <h2 className="text-lg font-bold">🏝️ Archipelago Generator</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:text-blue-400 text-lg w-6 h-6 flex items-center justify-center"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? "□" : "−"}
          </button>
          {onToggle && (
            <button
              onClick={onToggle}
              className="text-white hover:text-red-400 text-lg w-6 h-6 flex items-center justify-center"
              title="Close"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Controls */}
          <div className="p-3 border-b border-gray-700 space-y-3 max-h-64 overflow-y-auto">
            {/* Generation Mode Toggle */}
            <div className="flex gap-1">
              <button
                onClick={() => setUseMassiveMode(false)}
                className={`flex-1 py-1 px-2 rounded text-xs ${
                  !useMassiveMode
                    ? "bg-purple-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                🏝️ Normal
              </button>
              <button
                onClick={() => setUseMassiveMode(true)}
                className={`flex-1 py-1 px-2 rounded text-xs ${
                  useMassiveMode
                    ? "bg-purple-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                🌍 Massive
              </button>
            </div>

            {!useMassiveMode && (
              <>
                {/* Mode Toggle */}
                <div className="flex gap-1">
                  <button
                    onClick={() => setCustomMode(false)}
                    className={`flex-1 py-1 px-2 rounded text-xs ${
                      !customMode
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    🎨 Presets
                  </button>
                  <button
                    onClick={() => setCustomMode(true)}
                    className={`flex-1 py-1 px-2 rounded text-xs ${
                      customMode
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    ⚙️ Custom
                  </button>
                </div>
              </>
            )}

            {useMassiveMode ? (
              <>
                {/* Massive Mode Toggle */}
                <div className="flex gap-1">
                  <button
                    onClick={() => setCustomMode(false)}
                    className={`flex-1 py-1 px-2 rounded text-xs ${
                      !customMode
                        ? "bg-purple-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    🎨 Presets
                  </button>
                  <button
                    onClick={() => setCustomMode(true)}
                    className={`flex-1 py-1 px-2 rounded text-xs ${
                      customMode
                        ? "bg-purple-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    ⚙️ Custom
                  </button>
                </div>

                {!customMode ? (
                  <>
                    {/* Massive Category */}
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Category
                      </label>
                      <select
                        value={selectedMassiveCategory}
                        onChange={(e) => {
                          const newCategory = e.target
                            .value as MassivePresetCategory;
                          setSelectedMassiveCategory(newCategory);
                          const categoryPresets =
                            getMassivePresetsByCategory(newCategory);
                          if (categoryPresets.length > 0) {
                            setSelectedMassivePreset(categoryPresets[0].id);
                          }
                        }}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs"
                      >
                        {getMassivePresetCategories().map((category) => (
                          <option key={category} value={category}>
                            {category.charAt(0).toUpperCase() +
                              category.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Massive Preset */}
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Preset
                      </label>
                      <select
                        value={selectedMassivePreset}
                        onChange={(e) =>
                          setSelectedMassivePreset(e.target.value)
                        }
                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs"
                      >
                        {availableMassivePresets.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.name}
                          </option>
                        ))}
                      </select>
                      {currentMassivePreset && (
                        <div className="mt-1 p-2 bg-gray-800 rounded text-xs">
                          <div className="text-gray-300 mb-1">
                            {currentMassivePreset.description}
                          </div>
                          <div className="text-gray-400 text-xs">
                            {currentMassivePreset.recommendedWorldSize}x
                            {currentMassivePreset.recommendedWorldSize} • ~
                            {Math.round(
                              currentMassivePreset.estimatedBlocks / 1000,
                            )}
                            k blocks
                          </div>
                          <div className="text-gray-400 text-xs">
                            Difficulty: {currentMassivePreset.difficulty} •
                            Memory: {currentMassivePreset.estimatedMemoryMB}MB
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Massive Custom Settings */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block font-medium mb-1">
                          World: {worldSize}x{worldSize}
                        </label>
                        <input
                          type="range"
                          min="1024"
                          max="4096"
                          step="256"
                          value={worldSize}
                          onChange={(e) =>
                            setWorldSize(parseInt(e.target.value))
                          }
                          className="w-full h-1"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">
                          Islands: {massiveIslandCount.min}-
                          {massiveIslandCount.max}
                        </label>
                        <input
                          type="range"
                          min="3"
                          max="15"
                          value={massiveIslandCount.max}
                          onChange={(e) => {
                            const max = parseInt(e.target.value);
                            setMassiveIslandCount({
                              min: Math.min(massiveIslandCount.min, max - 1),
                              max,
                            });
                          }}
                          className="w-full h-1"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">
                          Min Size: {massiveRadius.min}
                        </label>
                        <input
                          type="range"
                          min="100"
                          max="300"
                          step="25"
                          value={massiveRadius.min}
                          onChange={(e) => {
                            const min = parseInt(e.target.value);
                            setMassiveRadius({
                              min,
                              max: Math.max(massiveRadius.max, min + 50),
                            });
                          }}
                          className="w-full h-1"
                        />
                      </div>
                      <div>
                        <label className="block font-medium mb-1">
                          Max Size: {massiveRadius.max}
                        </label>
                        <input
                          type="range"
                          min="200"
                          max="600"
                          step="25"
                          value={massiveRadius.max}
                          onChange={(e) => {
                            const max = parseInt(e.target.value);
                            setMassiveRadius({
                              min: Math.min(massiveRadius.min, max - 50),
                              max,
                            });
                          }}
                          className="w-full h-1"
                        />
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : !customMode ? (
              <>
                {/* Category */}
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      const newCategory = e.target.value as PresetCategory;
                      setSelectedCategory(newCategory);
                      const categoryPresets = getPresetsByCategory(newCategory);
                      if (categoryPresets.length > 0) {
                        setSelectedPreset(categoryPresets[0].id);
                      }
                    }}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs"
                  >
                    {getPresetCategories().map((category) => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preset */}
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Preset
                  </label>
                  <select
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs"
                  >
                    {availablePresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                  {currentPreset && (
                    <div className="mt-1 p-2 bg-gray-800 rounded text-xs">
                      <div className="text-gray-300 mb-1">
                        {currentPreset.description}
                      </div>
                      <div className="text-gray-400 text-xs">
                        {currentPreset.recommendedGridSize}x
                        {currentPreset.recommendedGridSize} • ~
                        {Math.round(currentPreset.estimatedBlocks / 1000)}k
                        blocks
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Pattern */}
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Pattern
                  </label>
                  <select
                    value={pattern}
                    onChange={(e) =>
                      setPattern(e.target.value as ArchipelagoPattern)
                    }
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs"
                  >
                    {Object.entries(patternDescriptions).map(([key, desc]) => (
                      <option key={key} value={key}>
                        {desc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Compact sliders */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block font-medium mb-1">
                      Islands: {islandCount}
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="12"
                      value={islandCount}
                      onChange={(e) => setIslandCount(parseInt(e.target.value))}
                      className="w-full h-1"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">
                      Size: {gridSize}
                    </label>
                    <input
                      type="range"
                      min="128"
                      max="512"
                      step="32"
                      value={gridSize}
                      onChange={(e) => setGridSize(parseInt(e.target.value))}
                      className="w-full h-1"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">
                      Min R: {minRadius}
                    </label>
                    <input
                      type="range"
                      min="15"
                      max="50"
                      value={minRadius}
                      onChange={(e) => setMinRadius(parseInt(e.target.value))}
                      className="w-full h-1"
                    />
                  </div>
                  <div>
                    <label className="block font-medium mb-1">
                      Max R: {maxRadius}
                    </label>
                    <input
                      type="range"
                      min="25"
                      max="80"
                      value={maxRadius}
                      onChange={(e) => setMaxRadius(parseInt(e.target.value))}
                      className="w-full h-1"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Seed */}
            <div>
              <label className="block text-xs font-medium mb-1">Seed</label>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs"
                />
                <button
                  onClick={handleNewSeed}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                  title="Random seed"
                >
                  🎲
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-1">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`flex-1 py-2 px-3 rounded text-xs font-medium ${
                  isGenerating
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {isGenerating ? "🔄 Generating..." : "🏝️ Generate"}
              </button>

              <button
                onClick={handleClear}
                disabled={isGenerating}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-xs font-medium"
                title="Clear all blocks"
              >
                🧹
              </button>
            </div>

            {/* Quick Stats */}
            {(lastResult || lastMassiveResult) && (
              <div className="bg-gray-800 rounded p-2 text-xs">
                <div className="font-medium mb-1">Last Generation:</div>
                <div className="text-gray-300 space-y-0.5">
                  {useMassiveMode && lastMassiveResult ? (
                    <>
                      <div>
                        {lastMassiveResult.islands.length} massive islands •{" "}
                        {(lastMassiveResult.blockCount / 1000).toFixed(1)}k
                        blocks placed
                      </div>
                      <div>
                        {lastMassiveResult.generationTimeMs.toFixed(1)}ms •{" "}
                        {lastMassiveResult.memoryUsageMB.toFixed(1)}MB memory
                      </div>
                      {lastMassiveResult.stats?.blocksGenerated && (
                        <div className="text-yellow-400">
                          Generated{" "}
                          {(
                            lastMassiveResult.stats.blocksGenerated / 1000
                          ).toFixed(0)}
                          k total, filtered by priority
                        </div>
                      )}
                      <div>
                        Largest:{" "}
                        {(lastMassiveResult.stats.largestIsland / 1000).toFixed(
                          1,
                        )}
                        k blocks
                      </div>
                    </>
                  ) : lastResult ? (
                    <>
                      <div>
                        {lastResult.islands.length} islands •{" "}
                        {lastResult.stats.totalBlocks.toLocaleString()} blocks
                      </div>
                      <div>
                        {lastResult.stats.generationTimeMs.toFixed(1)}ms •{" "}
                        {(lastResult.stats.coverageArea * 100).toFixed(1)}%
                        coverage
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Log */}
          <div className="flex-1 p-3 overflow-y-auto bg-gray-900 font-mono text-xs max-h-48">
            {generationLog.length === 0 ? (
              <div className="text-gray-500">
                Ready to generate archipelago...
                <br />
                <br />
                {useMassiveMode ? (
                  <>
                    🌍 Massive Mode: 5-10 huge islands (200-500 blocks radius)
                    <br />
                    • Chunk-based generation for performance
                    <br />
                    • Minecraft-style optimization techniques
                    <br />
                    • Smart block filtering for world limits
                    <br />• Multi-scale terrain generation
                  </>
                ) : (
                  <>
                    🏝️ Normal Mode: Multiple smooth islands, biome-based blocks
                    <br />
                    • Deterministic seed-based generation
                    <br />• Advanced noise algorithms
                  </>
                )}
                <br />
                <br />
                ⚠️ World Limit: {worldStore.blockCount}/
                {worldStore.worldLimits.maxBlocks} blocks used
                <br />
                {worldStore.blockCount >=
                  worldStore.worldLimits.maxBlocks * 0.9 && (
                  <>
                    <span className="text-yellow-400">
                      Consider clearing blocks or using "World Limit Optimized"
                      preset
                    </span>
                    <br />
                  </>
                )}
                <br />
                Select mode and click Generate!
              </div>
            ) : (
              <div className="space-y-0.5">
                {generationLog.slice(-10).map((log, i) => (
                  <div
                    key={i}
                    className={`
                    ${log.startsWith("❌") ? "text-red-400" : ""}
                    ${log.startsWith("✅") ? "text-green-400" : ""}
                    ${log.startsWith("🏝️") ? "text-blue-400" : ""}
                    ${log.startsWith("⚙️") ? "text-yellow-400" : ""}
                    ${log.startsWith("🌿") ? "text-green-400" : ""}
                    ${log.startsWith("📊") ? "text-purple-400" : ""}
                  `}
                  >
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Minimized state */}
      {isMinimized && (
        <div className="p-3">
          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`flex-1 py-1 px-2 rounded text-xs ${
                isGenerating
                  ? "bg-gray-700 text-gray-400"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              {isGenerating ? "🔄" : "🏝️ Generate"}
            </button>
            <button
              onClick={handleClear}
              disabled={isGenerating}
              className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
            >
              🧹
            </button>
          </div>
          {(lastResult || lastMassiveResult) && (
            <div className="mt-2 text-xs text-gray-400">
              {useMassiveMode && lastMassiveResult ? (
                <>
                  Last: {lastMassiveResult.islands.length} massive islands,{" "}
                  {(lastMassiveResult.blockCount / 1000).toFixed(1)}k blocks
                  placed
                  {lastMassiveResult.stats?.blocksGenerated &&
                    lastMassiveResult.stats.blocksGenerated >
                      lastMassiveResult.blockCount && (
                      <div className="text-yellow-400">
                        (
                        {(
                          lastMassiveResult.stats.blocksGenerated / 1000
                        ).toFixed(0)}
                        k generated, priority filtered)
                      </div>
                    )}
                </>
              ) : lastResult ? (
                <>
                  Last: {lastResult.islands.length} islands,{" "}
                  {(lastResult.stats.totalBlocks / 1000).toFixed(1)}k blocks
                </>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
